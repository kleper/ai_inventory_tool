from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    Depends,
    BackgroundTasks,
    WebSocket,
    WebSocketDisconnect,
    Request,
)
from typing import Optional, List
from datetime import datetime, timezone
from sqlmodel import Session, select, SQLModel
from app.core.limiter import limiter
import uuid
from sqlalchemy.orm.attributes import flag_modified

from app.services.llm_service import get_llm_service, LLMService, ItemExtracted
from app.dependencies.auth import get_current_user, get_inventory_scope
from app.models import User, Item, Invoice, InventoryGroup, SharedAccess
from app.services.matching_service import run_matching_background_task
from app.services.websocket_manager import manager
from app.database import get_session
from app.services.price_service import search_approximate_price
from app.services.currency_service import currency_service
from app.services.analysis_orchestrator import analyze_item_background

import logging

router = APIRouter(prefix="/api/v1/inventory", tags=["inventory"])
logger = logging.getLogger(__name__)
MAX_ITEM_IMAGES = 5
GALLERY_KEY = "gallery_images"


# --- Helper ---
def ensure_item_map_background(item_id: int):
    """
    Background task to generate map image if missing.
    """
    # Create new session using database.engine
    from app.database import engine
    with Session(engine) as session:
        item = session.get(Item, item_id)
        if not item or not item.meta_data:
            return
        
        coords = item.meta_data.get("coordinates")
        if not coords:
            return

        # Check if map already exists
        if item.meta_data.get("map_image"):
            print(f"Map already exists for item {item_id}: {item.meta_data.get('map_image')}")
            return
        
        print(f"Generating map for item {item_id}...")
        
        # Generate Map
        try:
            from app.services.mapbox_service import MapboxService
            map_path = MapboxService.generate_static_map(
                lat=coords["lat"], 
                lng=coords["lng"], 
                item_id=item_id
            )
            if map_path:
                print(f"Map generated at {map_path}. Updating DB...")
                # Update Item
                # Must copy and update to trigger JSON change detection if needed
                meta = dict(item.meta_data)
                meta["map_image"] = map_path
                item.meta_data = meta
                flag_modified(item, "meta_data")
                
                session.add(item)
                session.commit()
                # session.refresh(item) # Optional
                print(f"Auto-generated map for item {item_id} and updated DB.")
            else:
                print(f"MapboxService returned None for item {item_id}")
        except Exception as e:
            print(f"Background map generation failed for item {item_id}: {e}")
            import traceback
            traceback.print_exc()

def validate_group_write_access(session: Session, user: User, group_id: int):
    # 1. Check if group exists
    group = session.get(InventoryGroup, group_id)
    if not group:
        # If group doesn't exist, we can't write to it.
        raise HTTPException(status_code=404, detail="Group not found")

    # 2. Owner?
    if group.owner_id == user.id:
        return True

    # 3. Editor?
    access = session.exec(
        select(SharedAccess).where(
            SharedAccess.group_id == group_id, SharedAccess.user_id == user.id
        )
    ).first()

    if access and access.role == "EDITOR":
        return True

    raise HTTPException(
        status_code=403,
        detail="You do not have permission to edit this group (Read-only view)",
    )


# --- Endpoints ---


@router.post("/process-object", response_model=Item)
@limiter.limit("10/minute")
async def process_object(
    request: Request,
    background_tasks: BackgroundTasks,
    group_id: Optional[int] = None,
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Permission Check
    if group_id:
        validate_group_write_access(session, current_user, group_id)

    try:
        contents = await file.read()
        
        from app.services.image_service import save_image

        # Save file (original + thumb)
        filename = save_image(contents, "/app/media")

        # Prepare Meta Data
        meta = {}
        if latitude is not None and longitude is not None:
            meta["coordinates"] = {"lat": latitude, "lng": longitude}

        # Create Item immediately with "analyzing" status
        new_item = Item(
            name="Processing...",
            description="Analysis in progress...",
            category="Uncategorized",
            price=None,
            user_id=current_user.id,
            group_id=group_id,
            image_url=filename,
            status="analyzing",
            meta_data=meta,
        )
        session.add(new_item)
        session.commit()
        session.refresh(new_item)

        # Dispatch Background Task
        background_tasks.add_task(analyze_item_background, new_item.id)
        
        return new_item

    except HTTPException as he:
        raise he
    except ValueError as e:
        print(f"ValueError processing object: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Error processing object: {str(e)}"
        )


@router.post("/process-invoice")
@limiter.limit("10/minute")
async def process_invoice(
    request: Request,
    group_id: Optional[int] = None,
    file: UploadFile = File(...),
    target_item_name: Optional[str] = None,
    llm_service: LLMService = Depends(get_llm_service),
):
    try:
        contents = await file.read()
        price = await llm_service.analyze_invoice(contents, target_item_name)
        return {"price": price, "matched_item": target_item_name}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing invoice: {str(e)}"
        )


@router.post("/items", response_model=Item)
async def create_item(
    item_data: Item,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Validate Group Access
    if item_data.group_id:
        validate_group_write_access(session, current_user, item_data.group_id)

    item_data.id = None
    item_data.user_id = current_user.id
    item_data.created_at = datetime.now(timezone.utc)
    if item_data.status == "pending_price" and item_data.price is not None:
        item_data.status = "completed"

    session.add(item_data)
    session.commit()
    session.refresh(item_data)
    return item_data


@router.get("/items", response_model=list[Item])
async def get_items(
    group_id: Optional[int] = None,
    session: Session = Depends(get_session),
    allowed_groups: List[int] = Depends(get_inventory_scope),
    current_user: User = Depends(get_current_user),
):
    # If explicit group, verify access (Read access via scope is fine)
    if group_id:
        if group_id not in allowed_groups:
            raise HTTPException(status_code=403, detail="Access to this group denied")
        statement = select(Item).where(Item.group_id == group_id)
    else:
        # List all accessible items
        # 1. Direct ownership
        # 2. In allowed groups
        # Combine?
        # Actually `get_inventory_scope` covers groups.
        # But we also want un-grouped items owned by user.
        # select(Item).where( or(Item.user_id == me, Item.group_id.in(allowed)) )
        from sqlmodel import or_

        statement = select(Item).where(
            or_(Item.user_id == current_user.id, Item.group_id.in_(allowed_groups))
        )

    results = session.exec(statement).all()
    return results


@router.get("/items/{item_id}", response_model=Item)
async def get_item(
    item_id: int,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    allowed_groups: List[int] = Depends(get_inventory_scope),
    current_user: User = Depends(get_current_user),
):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Access Control
    if item.user_id != current_user.id:
        if item.group_id and item.group_id not in allowed_groups:
            raise HTTPException(status_code=403, detail="Access denied")

    # Lazy Map Generation
    if item.meta_data and item.meta_data.get("coordinates") and not item.meta_data.get("map_image"):
        background_tasks.add_task(ensure_item_map_background, item.id)

    print(f"Returning item {item_id} meta_data: {item.meta_data}")
    return item


@router.put("/items/{item_id}/image", response_model=Item)
async def update_item_image(
    item_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Permission Check
    can_edit = False
    if item.user_id == current_user.id:
        can_edit = True
    elif item.group_id:
        try:
            validate_group_write_access(session, current_user, item.group_id)
            can_edit = True
        except HTTPException:
            can_edit = False

    if not can_edit:
        raise HTTPException(status_code=403, detail="Access denied")

    # Process File
    try:
        from app.services.image_service import save_image

        contents = await file.read()
        # Save new file (original + thumb)
        new_filename = save_image(contents, "/app/media")

        # Optional: Delete old file if it exists and looks like a UUID (security precaution)
        # For simplicity, we skip deletion or assume cron job cleans up,
        # or we check if it is a local file.
        if item.image_url and not item.image_url.startswith("http"):
            old_path = f"/app/media/{item.image_url}"
            if os.path.exists(old_path) and item.image_url != new_filename:
                try:
                    os.remove(old_path)
                except Exception as e:
                    print(f"Failed to remove old image: {e}")

        # Update Item
        item.image_url = new_filename
        session.add(item)
        session.commit()
        session.refresh(item)
        return item

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating image: {str(e)}")


@router.post("/items/{item_id}/images", response_model=dict)
async def add_item_image(
    item_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    can_edit = False
    if item.user_id == current_user.id:
        can_edit = True
    elif item.group_id:
        try:
            validate_group_write_access(session, current_user, item.group_id)
            can_edit = True
        except HTTPException:
            can_edit = False

    if not can_edit:
        raise HTTPException(status_code=403, detail="Access denied")

    meta = dict(item.meta_data or {})
    gallery_images = meta.get(GALLERY_KEY)
    if not isinstance(gallery_images, list):
        gallery_images = []
    gallery_images = list(gallery_images)

    total_images = (1 if item.image_url else 0) + len(gallery_images)
    if total_images >= MAX_ITEM_IMAGES:
        raise HTTPException(status_code=400, detail="Image limit reached (max 5).")

    try:
        from app.services.image_service import save_image

        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty upload payload")
        new_filename = save_image(contents, "/app/media")

        if not item.image_url:
            item.image_url = new_filename
        else:
            gallery_images.append(new_filename)
            meta[GALLERY_KEY] = gallery_images
            item.meta_data = dict(meta)
            flag_modified(item, "meta_data")

        session.add(item)
        session.commit()
        session.refresh(item)
        return {"image_url": item.image_url, "gallery_images": gallery_images}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding image: {str(e)}")


# Update Schema
class ItemUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    status: Optional[str] = None
    meta_data: Optional[dict] = None


@router.put("/items/{item_id}", response_model=Item)
async def update_item(
    item_id: int,
    item_update: ItemUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    allowed_groups: List[int] = Depends(get_inventory_scope),
):
    path_item = session.get(Item, item_id)
    if not path_item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Check permission
    # If I am owner of item, I can edit (unless legacy/weird case).
    # If item is in group, I must have WRITE access to that group.

    can_edit = False

    if path_item.user_id == current_user.id:
        can_edit = True
    elif path_item.group_id:
        # Check group perms
        try:
            validate_group_write_access(session, current_user, path_item.group_id)
            can_edit = True
        except HTTPException:
            can_edit = False

    if not can_edit:
        raise HTTPException(status_code=403, detail="Access denied to edit this item")

    # Update fields
    item_data = item_update.model_dump(exclude_unset=True)
    for key, value in item_data.items():
        if key not in ["id", "user_id", "created_at"]:
            setattr(path_item, key, value)

    # Check if we should update status from pending_price -> completed
    if path_item.status == "pending_price" and path_item.price is not None:
        try:
            price_val = float(path_item.price)
            if price_val > 0:
                path_item.status = "completed"
                # Ensure it is stored as float if it was a string
                path_item.price = price_val
        except ValueError:
            pass  # Invalid price format, ignore status auto-update

    session.add(path_item)
    session.commit()
    session.refresh(path_item)
    return path_item


@router.delete("/items/{item_id}")
async def delete_item(
    item_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    allowed_groups: List[int] = Depends(get_inventory_scope),
):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    can_delete = False

    if item.user_id == current_user.id:
        can_delete = True
    elif item.group_id:
        try:
            validate_group_write_access(session, current_user, item.group_id)
            can_delete = True
        except HTTPException:
            can_delete = False

    if not can_delete:
        raise HTTPException(status_code=403, detail="Access denied to delete this item")

    session.delete(item)
    session.commit()
    return {"message": "Item deleted"}


@router.websocket("/ws/{user_id}")
async def websocket_endpoint_standard(websocket: WebSocket, user_id: int):
    await manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)


@router.post("/match-invoice", status_code=202)
async def match_invoice(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: int = 1,  # Default/Mock user ID for now
    session: Session = Depends(get_session),
):
    try:
        contents = await file.read()

        # Create persistent Invoice record with 'processing' status
        new_invoice = Invoice(status="processing", user_id=user_id)
        session.add(new_invoice)
        session.commit()
        session.refresh(new_invoice)

        # Dispatch background task
        background_tasks.add_task(
            run_matching_background_task, user_id, new_invoice.id, contents
        )

        return {
            "message": "Invoice processing started",
            "invoice_id": new_invoice.id,
            "status": "processing",
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error starting invoice matching: {str(e)}"
        )


@router.post("/items/{item_id}/price-search", response_model=Item)
@limiter.limit("10/minute")
async def search_item_price(
    request: Request,
    item_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    llm_service: LLMService = Depends(get_llm_service),
):
    # 1. Fetch Item
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # 2. Permission Check
    # (Simplified: Owner or Editor of group)
    has_write_access = False
    if item.user_id == current_user.id:
        has_write_access = True
    elif item.group_id:
        access = session.exec(
            select(SharedAccess).where(
                SharedAccess.group_id == item.group_id,
                SharedAccess.user_id == current_user.id,
            )
        ).first()
        if access and access.role in [
            "EDITOR",
            "admin",
        ]:  # "admin" just in case legacy role
            has_write_access = True

    if not has_write_access:
        raise HTTPException(status_code=403, detail="Permission denied")

    # 3. Determine Goal Currency
    target_currency = "USD"
    if item.group_id:
        group = session.get(InventoryGroup, item.group_id)
        if group and group.currency:
            target_currency = group.currency

    # 4. Search Price (Web Search or LLM?)
    # The prompt implies "Search Price with AI".
    # Since we don't have the image bytes readily available (stored on disk),
    # we can use the 'search_approximate_price' (web search) which is cheaper and faster for existing items.
    # OR we could re-analyze image if we load it.
    # Let's support Web Search first as it's more robust for "Find price of 'iPhone 15'".

    # Try Web Search First
    # Try Web Search First
    print(f"Searching price for: {item.name}")
    found_result = search_approximate_price(item.name)

    if not found_result:
        raise HTTPException(
            status_code=404, detail="Could not find a price for this item."
        )

    found_price, found_currency = found_result
    print(f"Found price: {found_price} {found_currency}")

    # 5. Currency Conversion
    final_price = found_price
    if target_currency != found_currency:
        print(
            f"Converting web price {found_price} {found_currency} to {target_currency}"
        )
        converted, success = await currency_service.convert(
            found_price, found_currency, target_currency
        )
        if success:
            final_price = converted

    # 6. Update & Save
    item.price = final_price
    # Check if we should update status
    if item.status == "pending_price":
        item.status = "completed"

    session.add(item)
    session.commit()
    session.refresh(item)

    return item


@router.post("/items/{item_id}/analyze", response_model=Item)
async def analyze_item_manual(
    item_id: int,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Permission Check
    can_edit = False
    if item.user_id == current_user.id:
        can_edit = True
    elif item.group_id:
        try:
            validate_group_write_access(session, current_user, item.group_id)
            can_edit = True
        except HTTPException:
            can_edit = False
            
    if not can_edit:
        raise HTTPException(status_code=403, detail="Access denied")

    # Reset status and trigger analysis
    item.status = "analyzing"
    # Optional: Reset error in metadata? 
    # if item.meta_data: item.meta_data.pop("last_error", None)
    
    session.add(item)
    session.commit()
    session.refresh(item)
    
    background_tasks.add_task(analyze_item_background, item.id)
    return item


@router.post("/items/{item_id}/share", response_model=dict)
async def generate_public_link(
    item_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a public share link for an item.
    Only Owner or Editor can do this.
    """
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Permission Check
    has_access = False
    if item.user_id == current_user.id:
        has_access = True
    elif item.group_id:
        # Check explicit write access
        try:
            validate_group_write_access(session, current_user, item.group_id)
            has_access = True
        except HTTPException:
            pass

    if not has_access:
        raise HTTPException(
            status_code=403, detail="Permission denied to share this item"
        )

    # Generate Token if not exists
    if not item.public_token:
        item.public_token = str(uuid.uuid4())

    item.is_public = True
    session.add(item)
    session.commit()
    session.refresh(item)

    return {"token": item.public_token, "is_public": True}


@router.delete("/items/{item_id}/share", response_model=dict)
async def revoke_public_link(
    item_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Revoke public access.
    """
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Permission Check (Same as generate)
    has_access = False
    if item.user_id == current_user.id:
        has_access = True
    elif item.group_id:
        try:
            validate_group_write_access(session, current_user, item.group_id)
            has_access = True
        except HTTPException:
            pass

    if not has_access:
        raise HTTPException(
            status_code=403, detail="Permission denied to modify share settings"
        )

    item.is_public = False
    item.public_token = (
        None  # Optional: Clear token or keep it but invalid? Clearing is safer.
    )
    session.add(item)
    session.commit()

    return {"message": "Public link revoked", "is_public": False}
