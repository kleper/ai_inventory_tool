from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database import get_session
from app.models import User, InventoryGroup, SharedAccess
from app.dependencies.auth import get_current_user
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/groups", tags=["groups"])

class GroupCreate(BaseModel):
    name: str

class ShareRequest(BaseModel):
    email: str
    permission: str = "VIEWER" # VIEWER, EDITOR

@router.post("", response_model=InventoryGroup)
async def create_group(
    group: GroupCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    new_group = InventoryGroup(name=group.name, owner_id=current_user.id)
    session.add(new_group)
    session.commit()
    session.refresh(new_group)
    return new_group

@router.get("", response_model=List[InventoryGroup])
async def list_groups(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Return owned groups + shared groups
    # 1. Owned
    owned = session.exec(select(InventoryGroup).where(InventoryGroup.owner_id == current_user.id)).all()
    # 2. Shared
    shared_access = session.exec(select(SharedAccess).where(SharedAccess.user_id == current_user.id)).all()
    shared_group_ids = [sa.group_id for sa in shared_access]
    
    if shared_group_ids:
        shared_groups = session.exec(select(InventoryGroup).where(InventoryGroup.id.in_(shared_group_ids))).all()
        return list(owned) + list(shared_groups)
    
    return owned

@router.post("/{group_id}/share")
async def share_group(
    group_id: int,
    share_data: ShareRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Verify ownership or EDITOR permission
    group = session.get(InventoryGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if group.owner_id != current_user.id:
        # Check if editor
        # For simplicity in this phase, only owner can share
        raise HTTPException(status_code=403, detail="Only owner can share group")

    # Find target user
    target_user = session.exec(select(User).where(User.email == share_data.email)).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found (User must be registered)")
        
    # Check if already shared
    existing = session.exec(select(SharedAccess).where(
        SharedAccess.group_id == group_id, 
        SharedAccess.user_id == target_user.id
    )).first()
    
    if existing:
        existing.permission = share_data.permission
        session.add(existing)
    else:
        new_share = SharedAccess(
            user_id=target_user.id,
            group_id=group_id,
            permission=share_data.permission
        )
        session.add(new_share)
        
    session.commit()
    return {"message": f"Group shared with {target_user.email}"}
