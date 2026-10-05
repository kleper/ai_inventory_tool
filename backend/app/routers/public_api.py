from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from app.dependencies.api_key_auth import get_user_from_api_key
from sqlmodel import Session, select, func, or_
from app.database import get_session
from app.models import User, InventoryGroup, Item, SharedAccess
from typing import List, Optional, Any, Dict, Generic, TypeVar
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import math
from app.core.limiter import limiter
from sqlalchemy.orm.attributes import flag_modified

router = APIRouter(prefix="/api/v1/public", tags=["developer-api"])

T = TypeVar("T")


# --- Response Schemas ---

class PaginationMeta(BaseModel):
    total: int = Field(..., description="Total items matching query", example=42)
    page: int = Field(..., description="Current page number (1-indexed)", example=1)
    limit: int = Field(..., description="Max items per page", example=20)
    pages: int = Field(..., description="Total number of pages", example=3)


class Envelope(BaseModel, Generic[T]):
    data: T = Field(..., description="Payload data")
    meta: Optional[PaginationMeta] = Field(None, description="Pagination metadata when applicable")


class PublicGroup(BaseModel):
    id: int = Field(..., description="Unique inventory folder ID", example=1)
    name: str = Field(..., description="Inventory folder name", example="Electronics & Hardware")
    description: Optional[str] = Field(None, description="Inventory folder description", example="Hardware assets and test devices")
    currency: str = Field("USD", description="Currency ISO code (USD, COP, EUR)", example="USD")
    language: str = Field("ES", description="Language preference (ES, EN)", example="EN")
    settings: Dict[str, Any] = Field(default_factory=dict, description="Inventory group settings, e.g. specialized mode (GENERAL, NATURE, PLACES)")
    item_count: int = Field(0, description="Total number of items in this folder", example=15)
    owner_id: int = Field(..., description="User ID of the inventory owner", example=3)
    is_shared: bool = Field(False, description="True if shared with the user rather than directly owned")
    my_role: str = Field("OWNER", description="User role in this folder (OWNER, EDITOR, VIEWER)", example="OWNER")


class PublicGroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Inventory folder name", example="Laboratory Equipment")
    description: Optional[str] = Field(None, max_length=250, description="Brief description of the folder", example="Sensors and analytical devices")
    currency: Optional[str] = Field("USD", description="Currency (USD, COP, EUR)", example="USD")
    language: Optional[str] = Field("ES", description="Language (ES, EN)", example="EN")
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Custom settings and mode configuration", example={"type": "GENERAL"})


class PublicGroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Updated name", example="Advanced Lab Equipment")
    description: Optional[str] = Field(None, max_length=250, description="Updated description")
    currency: Optional[str] = Field(None, description="Updated currency (USD, COP, EUR)")
    language: Optional[str] = Field(None, description="Updated language (ES, EN)")
    settings: Optional[Dict[str, Any]] = Field(None, description="Settings dict to merge into existing settings")


class PublicItem(BaseModel):
    id: int = Field(..., description="Unique item ID", example=101)
    name: str = Field(..., description="Item name", example="Digital Multimeter Pro")
    description: Optional[str] = Field(None, description="Item description", example="Precision digital multimeter with auto-ranging")
    quantity: int = Field(1, ge=0, description="Stock quantity", example=3)
    price: Optional[float] = Field(None, ge=0, description="Unit price", example=89.99)
    image_url: Optional[str] = Field(None, description="Primary item image filename or URL")
    category: Optional[str] = Field(None, description="Categorization tag", example="Tools")
    status: str = Field("completed", description="Item status: pending_price, completed, analyzing, needs_review, error", example="completed")
    group_id: Optional[int] = Field(None, description="Associated inventory folder ID", example=1)
    meta_data: Dict[str, Any] = Field(default_factory=dict, description="Metadata dictionary (coordinates, custom fields, technical specs)")
    created_at: Optional[datetime] = Field(None, description="Record creation timestamp")


class PublicItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Item name", example="Oscilloscope 100MHz")
    description: Optional[str] = Field(None, description="Item description", example="Dual-channel digital oscilloscope")
    category: Optional[str] = Field(None, description="Item category", example="Test Equipment")
    price: Optional[float] = Field(None, ge=0, description="Unit price", example=429.00)
    quantity: int = Field(1, ge=0, description="Quantity in inventory", example=1)
    status: Optional[str] = Field("completed", description="Item status", example="completed")
    meta_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional structured metadata", example={"brand": "Rigol", "serial_number": "DS1054Z-9912"})


class PublicItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Updated item name")
    description: Optional[str] = Field(None, description="Updated description")
    category: Optional[str] = Field(None, description="Updated category")
    price: Optional[float] = Field(None, ge=0, description="Updated price")
    quantity: Optional[int] = Field(None, ge=0, description="Updated quantity")
    status: Optional[str] = Field(None, description="Updated status")
    group_id: Optional[int] = Field(None, description="Move item to another group")
    meta_data: Optional[Dict[str, Any]] = Field(None, description="Metadata updates to merge into existing metadata dictionary")


class PublicItemBulkCreate(BaseModel):
    items: List[PublicItemCreate] = Field(..., min_items=1, max_items=100, description="List of items to create in batch")


class PublicItemBulkResponse(BaseModel):
    created: int = Field(..., description="Number of items created", example=3)
    items: List[PublicItem] = Field(..., description="List of newly created items")


class MessageResponse(BaseModel):
    message: str = Field(..., example="Item deleted successfully")
    id: Optional[int] = Field(None, example=101)


class ErrorResponse(BaseModel):
    detail: str = Field(..., example="Item not found")


# --- Access Control Helpers ---

def _get_user_accessible_group_ids(session: Session, user_id: int) -> tuple[List[int], Dict[int, str]]:
    """Returns (accessible_group_ids, role_map) for a user."""
    owned = session.exec(select(InventoryGroup.id).where(InventoryGroup.owner_id == user_id)).all()
    shared = session.exec(select(SharedAccess).where(SharedAccess.user_id == user_id)).all()
    
    role_map = {g_id: "OWNER" for g_id in owned}
    for sa in shared:
        if sa.group_id not in role_map:
            role_map[sa.group_id] = sa.role

    return list(role_map.keys()), role_map


def _validate_group_access(session: Session, user: User, group_id: int, write: bool = False) -> tuple[InventoryGroup, str]:
    group = session.get(InventoryGroup, group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory group not found")

    if group.owner_id == user.id:
        return group, "OWNER"

    access = session.exec(
        select(SharedAccess).where(SharedAccess.group_id == group_id, SharedAccess.user_id == user.id)
    ).first()

    if not access:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory group not found")

    if write and access.role != "EDITOR":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Write access denied: read-only access to this inventory"
        )

    return group, access.role


# --- Endpoints: Inventories (Groups) ---

@router.get(
    "/inventories",
    response_model=Envelope[List[PublicGroup]],
    summary="List inventory folders",
    description="Retrieve a paginated list of inventory folders accessible to the authenticated API key user (owned + shared).",
    responses={
        401: {"model": ErrorResponse, "description": "Invalid or missing API Key"}
    }
)
@limiter.limit("100/minute")
async def list_inventories(
    request: Request,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_user_from_api_key),
    session: Session = Depends(get_session)
):
    accessible_ids, role_map = _get_user_accessible_group_ids(session, current_user.id)
    if not accessible_ids:
        return Envelope(
            data=[],
            meta=PaginationMeta(total=0, page=page, limit=limit, pages=0)
        )

    total = session.exec(select(func.count()).where(InventoryGroup.id.in_(accessible_ids))).one()
    offset = (page - 1) * limit
    groups = session.exec(
        select(InventoryGroup).where(InventoryGroup.id.in_(accessible_ids)).offset(offset).limit(limit)
    ).all()

    # Pre-fetch item counts for returned groups
    group_ids = [g.id for g in groups]
    counts = session.exec(
        select(Item.group_id, func.count(Item.id))
        .where(Item.group_id.in_(group_ids))
        .group_by(Item.group_id)
    ).all()
    count_map = {gid: c for gid, c in counts}

    data = [
        PublicGroup(
            id=g.id,
            name=g.name,
            description=g.description,
            currency=g.currency,
            language=g.language,
            settings=g.settings or {},
            item_count=count_map.get(g.id, 0),
            owner_id=g.owner_id,
            is_shared=(g.owner_id != current_user.id),
            my_role=role_map.get(g.id, "VIEWER")
        )
        for g in groups
    ]

    return Envelope(
        data=data,
        meta=PaginationMeta(
            total=total,
            page=page,
            limit=limit,
            pages=math.ceil(total / limit) if limit > 0 else 0
        )
    )


@router.post(
    "/inventories",
    response_model=PublicGroup,
    status_code=status.HTTP_201_CREATED,
    summary="Create inventory folder",
    description="Create a new inventory folder owned by the authenticated API key user.",
    responses={
        201: {"model": PublicGroup, "description": "Inventory folder successfully created"},
        401: {"model": ErrorResponse, "description": "Unauthorized"}
    }
)
@limiter.limit("30/minute")
async def create_inventory(
    request: Request,
    group_data: PublicGroupCreate,
    current_user: User = Depends(get_user_from_api_key),
    session: Session = Depends(get_session)
):
    new_group = InventoryGroup(
        name=group_data.name,
        description=group_data.description,
        currency=group_data.currency or "USD",
        language=group_data.language or "ES",
        settings=group_data.settings or {},
        owner_id=current_user.id
    )
    session.add(new_group)
    session.commit()
    session.refresh(new_group)

    return PublicGroup(
        id=new_group.id,
        name=new_group.name,
        description=new_group.description,
        currency=new_group.currency,
        language=new_group.language,
        settings=new_group.settings or {},
        item_count=0,
        owner_id=new_group.owner_id,
        is_shared=False,
        my_role="OWNER"
    )


@router.get(
    "/inventories/{group_id}",
    response_model=PublicGroup,
    summary="Get inventory folder details",
    description="Retrieve details and item count for a specific inventory folder.",
    responses={
        404: {"model": ErrorResponse, "description": "Group not found or access denied"}
    }
)
@limiter.limit("100/minute")
async def get_inventory(
    request: Request,
    group_id: int,
    current_user: User = Depends(get_user_from_api_key),
    session: Session = Depends(get_session)
):
    group, role = _validate_group_access(session, current_user, group_id, write=False)
    count = session.exec(select(func.count(Item.id)).where(Item.group_id == group_id)).one()

    return PublicGroup(
        id=group.id,
        name=group.name,
        description=group.description,
        currency=group.currency,
        language=group.language,
        settings=group.settings or {},
        item_count=count,
        owner_id=group.owner_id,
        is_shared=(group.owner_id != current_user.id),
        my_role=role
    )


@router.put(
    "/inventories/{group_id}",
    response_model=PublicGroup,
    summary="Update inventory folder",
    description="Update metadata and settings of an inventory folder (requires Owner or EDITOR role).",
    responses={
        403: {"model": ErrorResponse, "description": "Permission denied"},
        404: {"model": ErrorResponse, "description": "Group not found"}
    }
)
@limiter.limit("30/minute")
async def update_inventory(
    request: Request,
    group_id: int,
    update_data: PublicGroupUpdate,
    current_user: User = Depends(get_user_from_api_key),
    session: Session = Depends(get_session)
):
    group, role = _validate_group_access(session, current_user, group_id, write=True)

    if update_data.name is not None:
        group.name = update_data.name
    if update_data.description is not None:
        group.description = update_data.description
    if update_data.currency is not None:
        group.currency = update_data.currency
    if update_data.language is not None:
        group.language = update_data.language
    if update_data.settings is not None:
        merged_settings = dict(group.settings or {})
        merged_settings.update(update_data.settings)
        group.settings = merged_settings
        flag_modified(group, "settings")

    session.add(group)
    session.commit()
    session.refresh(group)

    count = session.exec(select(func.count(Item.id)).where(Item.group_id == group_id)).one()

    return PublicGroup(
        id=group.id,
        name=group.name,
        description=group.description,
        currency=group.currency,
        language=group.language,
        settings=group.settings or {},
        item_count=count,
        owner_id=group.owner_id,
        is_shared=(group.owner_id != current_user.id),
        my_role=role
    )


@router.delete(
    "/inventories/{group_id}",
    response_model=MessageResponse,
    summary="Delete inventory folder",
    description="Delete an inventory folder and its items. Only the owner can delete the folder.",
    responses={
        403: {"model": ErrorResponse, "description": "Only the folder owner can delete it"},
        404: {"model": ErrorResponse, "description": "Group not found"}
    }
)
@limiter.limit("20/minute")
async def delete_inventory(
    request: Request,
    group_id: int,
    current_user: User = Depends(get_user_from_api_key),
    session: Session = Depends(get_session)
):
    group, role = _validate_group_access(session, current_user, group_id, write=True)
    if role != "OWNER":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the folder owner can delete this inventory folder")

    # Cascade delete items
    items = session.exec(select(Item).where(Item.group_id == group_id)).all()
    for item in items:
        session.delete(item)

    # Delete shared access rows
    shares = session.exec(select(SharedAccess).where(SharedAccess.group_id == group_id)).all()
    for share in shares:
        session.delete(share)

    session.delete(group)
    session.commit()

    return MessageResponse(message="Inventory folder deleted successfully", id=group_id)


# --- Endpoints: Items ---

@router.get(
    "/inventories/{group_id}/items",
    response_model=Envelope[List[PublicItem]],
    summary="List items in an inventory folder",
    description="Retrieve a paginated list of items in a specific inventory folder.",
    responses={
        404: {"model": ErrorResponse, "description": "Group not found or access denied"}
    }
)
@limiter.limit("100/minute")
async def list_group_items(
    request: Request,
    group_id: int,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    category: Optional[str] = Query(None, description="Filter by category"),
    current_user: User = Depends(get_user_from_api_key),
    session: Session = Depends(get_session)
):
    _validate_group_access(session, current_user, group_id, write=False)

    query_filters = [Item.group_id == group_id]
    if category:
        query_filters.append(Item.category == category)

    total = session.exec(select(func.count()).where(*query_filters)).one()
    offset = (page - 1) * limit
    items = session.exec(select(Item).where(*query_filters).offset(offset).limit(limit)).all()

    data = [
        PublicItem(
            id=i.id,
            name=i.name,
            description=i.description,
            quantity=i.quantity,
            price=i.price,
            image_url=i.image_url,
            category=i.category,
            status=i.status,
            group_id=i.group_id,
            meta_data=i.meta_data or {},
            created_at=i.created_at
        )
        for i in items
    ]

    return Envelope(
        data=data,
        meta=PaginationMeta(
            total=total,
            page=page,
            limit=limit,
            pages=math.ceil(total / limit) if limit > 0 else 0
        )
    )


@router.post(
    "/inventories/{group_id}/items",
    response_model=PublicItem,
    status_code=status.HTTP_201_CREATED,
    summary="Create item in inventory folder",
    description="Create a new item directly into an inventory folder (requires Owner or EDITOR role).",
    responses={
        201: {"model": PublicItem, "description": "Item created successfully"},
        403: {"model": ErrorResponse, "description": "Write access denied"},
        404: {"model": ErrorResponse, "description": "Group not found"}
    }
)
@limiter.limit("60/minute")
async def create_item(
    request: Request,
    group_id: int,
    item_in: PublicItemCreate,
    current_user: User = Depends(get_user_from_api_key),
    session: Session = Depends(get_session)
):
    _validate_group_access(session, current_user, group_id, write=True)

    new_item = Item(
        name=item_in.name,
        description=item_in.description,
        category=item_in.category or "Uncategorized",
        price=item_in.price,
        quantity=item_in.quantity,
        status=item_in.status or "completed",
        meta_data=item_in.meta_data or {},
        group_id=group_id,
        user_id=current_user.id,
        created_at=datetime.now(timezone.utc)
    )
    session.add(new_item)
    session.commit()
    session.refresh(new_item)

    return PublicItem(
        id=new_item.id,
        name=new_item.name,
        description=new_item.description,
        quantity=new_item.quantity,
        price=new_item.price,
        image_url=new_item.image_url,
        category=new_item.category,
        status=new_item.status,
        group_id=new_item.group_id,
        meta_data=new_item.meta_data or {},
        created_at=new_item.created_at
    )


@router.post(
    "/inventories/{group_id}/items/bulk",
    response_model=PublicItemBulkResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bulk create items in inventory folder",
    description="Add multiple items into an inventory folder in a single atomic transaction.",
    responses={
        201: {"model": PublicItemBulkResponse, "description": "Items created successfully"},
        403: {"model": ErrorResponse, "description": "Write access denied"},
        404: {"model": ErrorResponse, "description": "Group not found"}
    }
)
@limiter.limit("20/minute")
async def bulk_create_items(
    request: Request,
    group_id: int,
    bulk_in: PublicItemBulkCreate,
    current_user: User = Depends(get_user_from_api_key),
    session: Session = Depends(get_session)
):
    _validate_group_access(session, current_user, group_id, write=True)

    created_items = []
    now = datetime.now(timezone.utc)

    for item_in in bulk_in.items:
        new_item = Item(
            name=item_in.name,
            description=item_in.description,
            category=item_in.category or "Uncategorized",
            price=item_in.price,
            quantity=item_in.quantity,
            status=item_in.status or "completed",
            meta_data=item_in.meta_data or {},
            group_id=group_id,
            user_id=current_user.id,
            created_at=now
        )
        session.add(new_item)
        created_items.append(new_item)

    session.commit()
    for item in created_items:
        session.refresh(item)

    return PublicItemBulkResponse(
        created=len(created_items),
        items=[
            PublicItem(
                id=i.id,
                name=i.name,
                description=i.description,
                quantity=i.quantity,
                price=i.price,
                image_url=i.image_url,
                category=i.category,
                status=i.status,
                group_id=i.group_id,
                meta_data=i.meta_data or {},
                created_at=i.created_at
            )
            for i in created_items
        ]
    )


@router.get(
    "/items/search",
    response_model=Envelope[List[PublicItem]],
    summary="Search items across inventories",
    description="Search and filter items across all inventory folders accessible to the user.",
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized"}
    }
)
@limiter.limit("60/minute")
async def search_items(
    request: Request,
    q: Optional[str] = Query(None, description="Search term for item name or description"),
    category: Optional[str] = Query(None, description="Filter by exact category"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price filter"),
    group_id: Optional[int] = Query(None, description="Limit search to a specific inventory folder"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_user_from_api_key),
    session: Session = Depends(get_session)
):
    accessible_ids, _ = _get_user_accessible_group_ids(session, current_user.id)

    # Base access conditions: user owned items or items in accessible groups
    access_condition = or_(
        Item.user_id == current_user.id,
        Item.group_id.in_(accessible_ids) if accessible_ids else False
    )

    filters = [access_condition]

    if group_id is not None:
        if group_id not in accessible_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to requested inventory folder")
        filters.append(Item.group_id == group_id)

    if q:
        search_pattern = f"%{q.strip()}%"
        filters.append(or_(Item.name.ilike(search_pattern), Item.description.ilike(search_pattern)))

    if category:
        filters.append(Item.category.ilike(category.strip()))

    if status_filter:
        filters.append(Item.status == status_filter.strip())

    if min_price is not None:
        filters.append(Item.price >= min_price)

    if max_price is not None:
        filters.append(Item.price <= max_price)

    total = session.exec(select(func.count()).where(*filters)).one()
    offset = (page - 1) * limit
    items = session.exec(select(Item).where(*filters).offset(offset).limit(limit)).all()

    data = [
        PublicItem(
            id=i.id,
            name=i.name,
            description=i.description,
            quantity=i.quantity,
            price=i.price,
            image_url=i.image_url,
            category=i.category,
            status=i.status,
            group_id=i.group_id,
            meta_data=i.meta_data or {},
            created_at=i.created_at
        )
        for i in items
    ]

    return Envelope(
        data=data,
        meta=PaginationMeta(
            total=total,
            page=page,
            limit=limit,
            pages=math.ceil(total / limit) if limit > 0 else 0
        )
    )


@router.get(
    "/items/{item_id}",
    response_model=PublicItem,
    summary="Get item details",
    description="Retrieve full details and metadata for a specific item.",
    responses={
        404: {"model": ErrorResponse, "description": "Item not found or access denied"}
    }
)
@limiter.limit("100/minute")
async def get_item_detail(
    request: Request,
    item_id: int,
    current_user: User = Depends(get_user_from_api_key),
    session: Session = Depends(get_session)
):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    if item.user_id == current_user.id:
        pass
    elif item.group_id:
        _validate_group_access(session, current_user, item.group_id, write=False)
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    return PublicItem(
        id=item.id,
        name=item.name,
        description=item.description,
        quantity=item.quantity,
        price=item.price,
        image_url=item.image_url,
        category=item.category,
        status=item.status,
        group_id=item.group_id,
        meta_data=item.meta_data or {},
        created_at=item.created_at
    )


@router.put(
    "/items/{item_id}",
    response_model=PublicItem,
    summary="Update item",
    description="Update an item's fields and safely merge new metadata without clobbering existing keys.",
    responses={
        403: {"model": ErrorResponse, "description": "Write access denied"},
        404: {"model": ErrorResponse, "description": "Item not found"}
    }
)
@limiter.limit("60/minute")
async def update_item(
    request: Request,
    item_id: int,
    item_update: PublicItemUpdate,
    current_user: User = Depends(get_user_from_api_key),
    session: Session = Depends(get_session)
):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # Access check
    if item.user_id == current_user.id:
        pass
    elif item.group_id:
        _validate_group_access(session, current_user, item.group_id, write=True)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # If moving to another group, verify write access on destination group
    if item_update.group_id is not None and item_update.group_id != item.group_id:
        _validate_group_access(session, current_user, item_update.group_id, write=True)
        item.group_id = item_update.group_id

    if item_update.name is not None:
        item.name = item_update.name
    if item_update.description is not None:
        item.description = item_update.description
    if item_update.category is not None:
        item.category = item_update.category
    if item_update.price is not None:
        item.price = item_update.price
    if item_update.quantity is not None:
        item.quantity = item_update.quantity
    if item_update.status is not None:
        item.status = item_update.status

    # Merge metadata non-destructively
    if item_update.meta_data is not None:
        merged_meta = dict(item.meta_data or {})
        merged_meta.update(item_update.meta_data)
        item.meta_data = merged_meta
        flag_modified(item, "meta_data")

    session.add(item)
    session.commit()
    session.refresh(item)

    return PublicItem(
        id=item.id,
        name=item.name,
        description=item.description,
        quantity=item.quantity,
        price=item.price,
        image_url=item.image_url,
        category=item.category,
        status=item.status,
        group_id=item.group_id,
        meta_data=item.meta_data or {},
        created_at=item.created_at
    )


@router.delete(
    "/items/{item_id}",
    response_model=MessageResponse,
    summary="Delete item",
    description="Delete an item from inventory (requires item owner or folder EDITOR role).",
    responses={
        403: {"model": ErrorResponse, "description": "Permission denied"},
        404: {"model": ErrorResponse, "description": "Item not found"}
    }
)
@limiter.limit("30/minute")
async def delete_item(
    request: Request,
    item_id: int,
    current_user: User = Depends(get_user_from_api_key),
    session: Session = Depends(get_session)
):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    if item.user_id == current_user.id:
        pass
    elif item.group_id:
        _validate_group_access(session, current_user, item.group_id, write=True)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    session.delete(item)
    session.commit()

    return MessageResponse(message="Item deleted successfully", id=item_id)

