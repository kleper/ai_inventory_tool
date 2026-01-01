from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect, Request
from typing import Optional, List
from datetime import datetime
from sqlmodel import Session, select, SQLModel
from app.core.limiter import limiter

from app.services.llm_service import get_llm_service, LLMService, ItemExtracted
from app.dependencies.auth import get_current_user, get_inventory_scope
from app.models import User, Item, Invoice, InventoryGroup, SharedAccess
from app.services.matching_service import run_matching_background_task
from app.services.websocket_manager import manager
from app.database import get_session
from app.services.price_service import search_approximate_price
from app.services.currency_service import currency_service

import logging

router = APIRouter(prefix="/api/v1/inventory", tags=["inventory"])
logger = logging.getLogger(__name__)

# --- Helper ---
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
    access = session.exec(select(SharedAccess).where(
        SharedAccess.group_id == group_id, 
        SharedAccess.user_id == user.id
    )).first()
    
    if access and access.role == "EDITOR":
        return True
        
    raise HTTPException(status_code=403, detail="You do not have permission to edit this group (Read-only view)")

# --- Endpoints ---

@router.post("/process-object", response_model=Item)
@limiter.limit("10/minute")
async def process_object(
    request: Request,
    group_id: Optional[int] = None,
    file: UploadFile = File(...),
    llm_service: LLMService = Depends(get_llm_service),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Permission Check
    if group_id:
        validate_group_write_access(session, current_user, group_id)

    try:
        contents = await file.read()
        
        from app.services.image_service import save_image
        
        group_context = None
        if group_id:
            group = session.get(InventoryGroup, group_id)
            if group:
                 group_context = {"name": group.name, "description": group.description, "currency": group.currency}
        
        # Save file (original + thumb)
        filename = save_image(contents, "/app/media")
        
        item_data = await llm_service.analyze_object(contents, user_id=current_user.id, group_context=group_context)

        # Currency Conversion Logic
        target_currency = group.currency if (group_id and group) else "USD"
        if item_data.estimated_price and item_data.estimated_price > 0:
            if item_data.currency_code and item_data.currency_code != target_currency:
                logger.info(f"Converting price {item_data.estimated_price} {item_data.currency_code} to {target_currency}")
                converted_price, success = await currency_service.convert(
                    item_data.estimated_price, 
                    item_data.currency_code, 
                    target_currency
                )
                if success:
                    item_data.estimated_price = converted_price
                else:
                    logger.warning(f"Currency conversion failed. Keeping original price {item_data.estimated_price} {item_data.currency_code}")
                    # Could append warning to description if desired:
                    # item_data.description += f" [Warning: Price in {item_data.currency_code}]"
            else:
                # If currency code is missing but we have a price, assume USD or trust LLM?
                # Prompt defaults to USD if unknown, so we are safe.
                pass
        
        # If LLM didn't find a price, try web search
        if not item_data.estimated_price or item_data.estimated_price == 0:
            print(f"No price from LLM for {item_data.name}, searching web...")
            try:
                web_price = search_approximate_price(item_data.name)
                if web_price:
                     print(f"Found web price: {web_price}")
                     item_data.estimated_price = web_price
            except Exception as e:
                print(f"Web search failed: {e}")
        
        new_item = Item(
            name=item_data.name,
            description=item_data.description,
            category=item_data.category,
            price=item_data.estimated_price,
            user_id=current_user.id,
            group_id=group_id,
            image_url=filename,
            status="pending_price" if not item_data.estimated_price else "completed"
        )
        session.add(new_item)
        session.commit()
        session.refresh(new_item)
        return new_item
    except HTTPException as he:
        raise he
    except ValueError as e:
        print(f"ValueError processing object: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing object: {str(e)}")

@router.post("/process-invoice")
@limiter.limit("10/minute")
async def process_invoice(
    request: Request,
    group_id: Optional[int] = None,
    file: UploadFile = File(...),
    target_item_name: Optional[str] = None,
    llm_service: LLMService = Depends(get_llm_service)
):
    try:
        contents = await file.read()
        price = await llm_service.analyze_invoice(contents, target_item_name)
        return {"price": price, "matched_item": target_item_name}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing invoice: {str(e)}")


@router.post("/items", response_model=Item)
async def create_item(
    item_data: Item, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Validate Group Access
    if item_data.group_id:
        validate_group_write_access(session, current_user, item_data.group_id)

    item_data.id = None
    item_data.user_id = current_user.id
    item_data.created_at = datetime.utcnow()
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
    current_user: User = Depends(get_current_user)
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
            or_(
                Item.user_id == current_user.id,
                Item.group_id.in_(allowed_groups)
            )
        )
        
    results = session.exec(statement).all()
    return results

@router.get("/items/{item_id}", response_model=Item)
async def get_item(
    item_id: int,
    session: Session = Depends(get_session),
    allowed_groups: List[int] = Depends(get_inventory_scope),
    current_user: User = Depends(get_current_user)
):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Access Control
    if item.user_id != current_user.id:
        if item.group_id and item.group_id not in allowed_groups:
             raise HTTPException(status_code=403, detail="Access denied")
             
    return item

@router.put("/items/{item_id}/image", response_model=Item)
async def update_item_image(
    item_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
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

# Update Schema
class ItemUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    status: Optional[str] = None

@router.put("/items/{item_id}", response_model=Item)
async def update_item(
    item_id: int,
    item_update: ItemUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    allowed_groups: List[int] = Depends(get_inventory_scope)
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
             pass # Invalid price format, ignore status auto-update
            
    session.add(path_item)
    session.commit()
    session.refresh(path_item)
    return path_item

@router.delete("/items/{item_id}")
async def delete_item(
    item_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    allowed_groups: List[int] = Depends(get_inventory_scope)
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
    user_id: int = 1, # Default/Mock user ID for now
    session: Session = Depends(get_session)
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
            run_matching_background_task, 
            user_id, 
            new_invoice.id, 
            contents
        )
        
        return {
            "message": "Invoice processing started",
            "invoice_id": new_invoice.id,
            "status": "processing"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting invoice matching: {str(e)}")
