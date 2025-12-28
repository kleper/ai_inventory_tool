from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from app.database import get_session
from app.models import User, InventoryGroup, SharedAccess
from app.services.security import decode_access_token
from typing import List, Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)

async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    x_user_id: Optional[str] = Header(default=None), 
    session: Session = Depends(get_session)
) -> User:
    user_id = None
    
    # 1. Try JWT
    if token:
        # print(f"Auth Token received: {token[:10]}...") # Verify token arrives
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("sub")
        else:
            print("Auth: Token present but decode failed (see security logs)")
    else:
        print("Auth: No token provided in header")
    
    # 2. Fallback to Header (Legacy/Dev) if no valid token
    if not user_id and x_user_id:
        try:
            print(f"Auth: Using X-User-ID header: {x_user_id}")
            user_id = int(x_user_id)
        except ValueError:
            pass
            
    if not user_id:
         print("Auth: Failed to resolve user_id -> 401")
         raise HTTPException(status_code=401, detail="Not authenticated")
            
    user = session.get(User, user_id)
    if not user:
         print(f"Auth: User {user_id} not found in DB -> 401")
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
