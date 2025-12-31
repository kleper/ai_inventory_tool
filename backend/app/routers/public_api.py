from fastapi import APIRouter, Depends, HTTPException, Query
from app.dependencies.api_key_auth import get_user_from_api_key
from sqlmodel import Session, select, func
from app.database import get_session
from app.models import User, InventoryGroup, Item
from typing import List, Optional, Any
from pydantic import BaseModel
import math
from app.core.limiter import limiter
from fastapi import Request

router = APIRouter(prefix="/api/v1/public", tags=["public"])

class PaginationMeta(BaseModel):
    total: int
    page: int
    limit: int
    pages: int

class Envelope(BaseModel):
    data: Any
    meta: PaginationMeta

# Schemas
class PublicGroup(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    item_count: int

class PublicItem(BaseModel):
    id: int
    name: str
    quantity: int
    price: Optional[float]
    image_url: Optional[str]
    category: Optional[str]

@router.get("/inventories", response_model=Envelope)
@limiter.limit("100/minute")
async def list_inventories(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_user_from_api_key),
    session: Session = Depends(get_session)
):
    offset = (page - 1) * limit
    
    # Filter by owner_id for strict ownership access via public API
    # Only return groups owned by the API Key user
    query_filters = [InventoryGroup.owner_id == current_user.id]
    
    # Count total
    total = session.exec(select(func.count()).where(*query_filters)).one()
    
    # Get groups
    groups = session.exec(select(InventoryGroup).where(*query_filters).offset(offset).limit(limit)).all()
    
    data = []
    for g in groups:
        # Count items per group
        count = session.exec(select(func.count()).where(Item.group_id == g.id)).one()
        data.append(PublicGroup(
            id=g.id,
            name=g.name,
            description=g.description,
            item_count=count
        ))
    
    return Envelope(
        data=data,
        meta=PaginationMeta(
            total=total,
            page=page,
            limit=limit,
            pages=math.ceil(total / limit) if limit > 0 else 0
        )
    )

@router.get("/inventories/{group_id}/items", response_model=Envelope)
@limiter.limit("100/minute")
async def list_group_items(
    request: Request,
    group_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_user_from_api_key),
    session: Session = Depends(get_session)
):
    # Verify group ownership
    group = session.get(InventoryGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if group.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Group not found") 
        
    offset = (page - 1) * limit
    
    query_filters = [Item.group_id == group_id]
    
    total = session.exec(select(func.count()).where(*query_filters)).one()
    items = session.exec(select(Item).where(*query_filters).offset(offset).limit(limit)).all()
    
    data = [PublicItem(
        id=i.id,
        name=i.name,
        quantity=i.quantity,
        price=i.price,
        image_url=i.image_url,
        category=i.category
    ) for i in items]
    
    return Envelope(
        data=data,
        meta=PaginationMeta(
            total=total,
            page=page,
            limit=limit,
            pages=math.ceil(total / limit) if limit > 0 else 0
        )
    )

@router.get("/items/{item_id}", response_model=PublicItem)
@limiter.limit("100/minute")
async def get_item_detail(
    request: Request,
    item_id: int,
    current_user: User = Depends(get_user_from_api_key),
    session: Session = Depends(get_session)
):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    # Check access: Must be owner or owner of group
    if item.user_id == current_user.id:
        pass
    elif item.group_id:
         group = session.get(InventoryGroup, item.group_id)
         if not group or group.owner_id != current_user.id:
             raise HTTPException(status_code=404, detail="Item not found")
    else:
         raise HTTPException(status_code=404, detail="Item not found")

    return PublicItem(
        id=item.id,
        name=item.name,
        quantity=item.quantity,
        price=item.price,
        image_url=item.image_url,
        category=item.category
    )
