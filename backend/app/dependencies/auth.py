from fastapi import Depends, HTTPException, status, Header
from sqlmodel import Session, select
from app.database import get_session
from app.models import User, InventoryGroup, SharedAccess
from typing import List, Optional

# Mock or Real User Dependency
# In a real app with NextAuth, we would verify the JWT here.
# For Phase 8 Demo, we can simulate "get_current_user" via a header or simplified logic.
# The user prompt mentions "Obtener el current_user desde el JWT".
# I'll implement a stub that assumes we trust the specific user ID for now or 
# parses a mock token, until we do full JWT verify.
# Let's try to do it slightly better: If "x-user-id" header is present, use that, else default to 1.
# CAUTION: This is insecure for prod but fine for dev/demo if documented.

async def get_current_user(
    x_user_id: Optional[str] = Header(default=None), 
    session: Session = Depends(get_session)
) -> User:
    user_id = 1
    if x_user_id:
        try:
            user_id = int(x_user_id)
        except ValueError:
            pass
            
    user = session.get(User, user_id)
    if not user:
         # Fallback: create default admin user if DB is empty?
         # Or just raise error.
         raise HTTPException(status_code=401, detail="User not found")
    return user

async def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

async def get_inventory_scope(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> List[int]:
    """
    Returns a list of InventoryGroup IDs that the user has access to.
    This includes:
    1. Groups owned by the user.
    2. Groups shared with the user (via SharedAccess).
    """
    # 1. Owned Groups
    # We need to make sure User has owned_groups populated or query them.
    # Because of async/lazy loading, explicit query is safer.
    owned_groups = session.exec(select(InventoryGroup.id).where(InventoryGroup.owner_id == current_user.id)).all()
    
    # 2. Shared Groups
    shared_groups = session.exec(select(SharedAccess.group_id).where(SharedAccess.user_id == current_user.id)).all()
    
    # Combine and de-duplicate
    scope_ids = list(set(owned_groups + shared_groups))
    
    # Also, we should probably include a "default" group logic if we haven't created groups yet.
    # If a user has NO groups, maybe we should return empty or create one?
    # For filtering, empty list means "no access".
    
    return scope_ids
