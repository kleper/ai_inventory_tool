from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies.auth import get_current_user
from app.models import User, ApiKey
from pydantic import BaseModel
from typing import List, Optional
import secrets
from passlib.context import CryptContext
from datetime import datetime

router = APIRouter(prefix="/api/v1/api-keys", tags=["api-keys"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class ApiKeyCreate(BaseModel):
    label: str

class ApiKeyResponse(BaseModel):
    id: int
    prefix: str
    label: str
    created_at: datetime
    last_used_at: Optional[datetime]

class ApiKeySecret(ApiKeyResponse):
    secret_key: str # ONLY shown once

@router.get("", response_model=List[ApiKeyResponse])
async def list_keys(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    return session.exec(select(ApiKey).where(ApiKey.user_id == current_user.id)).all()

@router.post("", response_model=ApiKeySecret)
async def create_key(
    data: ApiKeyCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Generate key
    # Format: sk_live_ + 32 chars random
    random_part = secrets.token_urlsafe(32)
    key = f"sk_live_{random_part}"
    
    # Store first 16 chars as prefix for efficient lookup
    prefix = key[:16] 
    
    key_hash = pwd_context.hash(key)
    
    new_key = ApiKey(
        user_id=current_user.id,
        key_hash=key_hash,
        prefix=prefix,
        label=data.label,
        scopes='["read"]'
    )
    session.add(new_key)
    session.commit()
    session.refresh(new_key)
    
    # Return response with the SECRET key (only time it is visible)
    return ApiKeySecret(
        **new_key.model_dump(),
        secret_key=key
    )

@router.delete("/{key_id}")
async def revoke_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    key = session.get(ApiKey, key_id)
    if not key or key.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Key not found")
    
    session.delete(key)
    session.commit()
    return {"message": "Key revoked"}
