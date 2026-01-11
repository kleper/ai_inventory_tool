from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database import get_session
from app.models import User, InventoryGroup, SharedAccess, InventoryGroupBase, Item # Item is needed since I use it in item_count
from app.dependencies.auth import get_current_user
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy import func

router = APIRouter(prefix="/api/v1/groups", tags=["groups"])

# --- Models ---

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    currency: str = "USD"
    settings: Optional[dict] = {}

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    currency: Optional[str] = None
    settings: Optional[dict] = None

class ShareRequest(BaseModel):
    email: str
    role: str = "VIEWER" # VIEWER, EDITOR

class MemberResponse(BaseModel):
    user_id: int
    email: str
    role: str
    image: Optional[str] = None

class GroupWithCount(InventoryGroupBase):
    id: int
    item_count: int = 0
    is_shared: bool = False
    my_role: str = "OWNER"

# --- Group Management ---

@router.post("", response_model=InventoryGroup)
async def create_group(
    group: GroupCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    new_group = InventoryGroup(
        name=group.name, 
        description=group.description, 
        currency=group.currency,
        settings=group.settings or {},
        owner_id=current_user.id
    )
    session.add(new_group)
    session.commit()
    session.refresh(new_group)
    return new_group

@router.get("", response_model=List[GroupWithCount])
async def list_groups(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # 1. Owned
    owned = session.exec(select(InventoryGroup).where(InventoryGroup.owner_id == current_user.id)).all()
    
    # 2. Shared
    shared_access = session.exec(select(SharedAccess).where(SharedAccess.user_id == current_user.id)).all()
    shared_map = {sa.group_id: sa.role for sa in shared_access}
    shared_group_ids = list(shared_map.keys())
    
    shared_groups = []
    if shared_group_ids:
        shared_groups = session.exec(select(InventoryGroup).where(InventoryGroup.id.in_(shared_group_ids))).all()
    
    all_groups_list = list(owned) + list(shared_groups)
    group_ids = [g.id for g in all_groups_list]
    
    # Count Items
    count_map = {}
    if group_ids:
        counts = session.exec(
            select(Item.group_id, func.count(Item.id))
            .where(Item.group_id.in_(group_ids))
            .group_by(Item.group_id)
        ).all()
        count_map = {g_id: count for g_id, count in counts}

    results = []
    for g in owned:
        results.append(GroupWithCount(
            **g.model_dump(), 
            item_count=count_map.get(g.id, 0),
            is_shared=False,
            my_role="OWNER"
        ))
    for g in shared_groups:
        results.append(GroupWithCount(
            **g.model_dump(), 
            item_count=count_map.get(g.id, 0),
            is_shared=True,
            my_role=shared_map.get(g.id, "VIEWER")
        ))
        
    return results

@router.get("/{group_id}", response_model=GroupWithCount)
async def get_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    group = session.get(InventoryGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Determine Role
    my_role = "VIEWER"
    is_shared = False
    
    if group.owner_id == current_user.id:
        my_role = "OWNER"
        is_shared = False
    else:
        # Check share
        access = session.exec(select(SharedAccess).where(
             SharedAccess.group_id == group_id, 
             SharedAccess.user_id == current_user.id
        )).first()
        
        if not access:
             raise HTTPException(status_code=403, detail="Access denied")
        
        my_role = access.role
        is_shared = True

    # Item count (simplified)
    # count = ... (skip for detail view unless needed, or just 0)
    
    return GroupWithCount(
        **group.model_dump(),
        item_count=0, # Just placeholder or query if needed
        is_shared=is_shared,
    )

@router.put("/{group_id}", response_model=InventoryGroup)
async def update_group(
    group_id: int,
    group_update: GroupUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    group = session.get(InventoryGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if group.owner_id != current_user.id:
        # Check if EDITOR
        access = session.exec(select(SharedAccess).where(
             SharedAccess.group_id == group_id, 
             SharedAccess.user_id == current_user.id
        )).first()
        if not access or access.role != "EDITOR":
             raise HTTPException(status_code=403, detail="Only owner or editor can update group")

    if group_update.name is not None:
        group.name = group_update.name
    if group_update.description is not None:
        group.description = group_update.description
    if group_update.currency is not None:
        group.currency = group_update.currency
    if group_update.settings is not None:
        group.settings = group_update.settings
        
    session.add(group)
    session.commit()
    session.refresh(group)
    return group

# --- Share Management ---

@router.post("/{group_id}/share")
async def share_group(
    group_id: int,
    share_data: ShareRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Verify ownership
    group = session.get(InventoryGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can share group")

    target_user = session.exec(select(User).where(User.email == share_data.email)).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User with this email not found")
        
    if target_user.id == current_user.id:
         raise HTTPException(status_code=400, detail="Cannot share with yourself")

    # Upsert Share
    existing = session.exec(select(SharedAccess).where(
        SharedAccess.group_id == group_id, 
        SharedAccess.user_id == target_user.id
    )).first()
    
    if existing:
        existing.role = share_data.role
        session.add(existing)
    else:
        new_share = SharedAccess(
            user_id=target_user.id,
            group_id=group_id,
            role=share_data.role
        )
        session.add(new_share)
        
    session.commit()
    return {"message": f"Group shared with {target_user.email}"}

@router.get("/{group_id}/share", response_model=List[MemberResponse])
async def list_members(
    group_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    group = session.get(InventoryGroup, group_id)
    if not group:
         raise HTTPException(status_code=404, detail="Group not found")
         
    # Check access (Must be Owner or Member)
    is_owner = group.owner_id == current_user.id
    if not is_owner:
         access = session.exec(select(SharedAccess).where(
             SharedAccess.group_id == group_id, 
             SharedAccess.user_id == current_user.id
         )).first()
         if not access:
             raise HTTPException(status_code=403, detail="Access denied")

    # Get members
    shares = session.exec(select(SharedAccess).where(SharedAccess.group_id == group_id)).all()
    
    members = []
    # Fetch user details manual or joined
    # Manual loop is fine for small scale
    for s in shares:
        u = session.get(User, s.user_id)
        if u:
            members.append(MemberResponse(
                user_id=u.id,
                email=u.email,
                role=s.role,
                image=u.image
            ))
            
    return members

@router.delete("/{group_id}/share/{user_id}")
async def remove_member(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    group = session.get(InventoryGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if group.owner_id != current_user.id:
         raise HTTPException(status_code=403, detail="Only owner can remove members")
         
    share = session.exec(select(SharedAccess).where(
        SharedAccess.group_id == group_id, 
        SharedAccess.user_id == user_id
    )).first()
    
    if not share:
        raise HTTPException(status_code=404, detail="Member not found")
        
    session.delete(share)
    session.commit()
    return {"message": "Member removed"}
