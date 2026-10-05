from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies.auth import get_current_user
from app.models import User, ApiKey
from pydantic import BaseModel, Field
from typing import List, Optional
import secrets
import json
from passlib.context import CryptContext
from datetime import datetime

router = APIRouter(prefix="/api/v1/api-keys", tags=["api-keys"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class ApiKeyCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=100, description="Human readable label for this API key", example="Claude Desktop MCP Key")
    scopes: Optional[List[str]] = Field(
        default_factory=lambda: ["read", "write"],
        description="Allowed permission scopes",
        example=["read", "write"]
    )


class ApiKeyResponse(BaseModel):
    id: int = Field(..., description="Unique key ID", example=1)
    prefix: str = Field(..., description="Public prefix identifying the key", example="sk_live_aBcDeFgH")
    label: str = Field(..., description="User assigned label", example="Claude Desktop MCP Key")
    scopes: str = Field('["read", "write"]', description="Permitted access scopes")
    created_at: datetime = Field(..., description="Creation timestamp")
    last_used_at: Optional[datetime] = Field(None, description="Last usage timestamp")


class ApiKeySecret(ApiKeyResponse):
    secret_key: str = Field(..., description="The full raw secret key. ONLY displayed once upon creation.", example="sk_live_aBcDeFgH1234567890...")


class KeyRevokeResponse(BaseModel):
    message: str = Field("Key revoked successfully")
    id: int = Field(...)


@router.get(
    "",
    response_model=List[ApiKeyResponse],
    summary="List API keys",
    description="Retrieve all active API keys created by the current user (without secrets)."
)
async def list_keys(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    return session.exec(select(ApiKey).where(ApiKey.user_id == current_user.id)).all()


@router.post(
    "",
    response_model=ApiKeySecret,
    status_code=status.HTTP_201_CREATED,
    summary="Create API key",
    description="Generate a new API key with 'read' and 'write' scopes for external tools and MCP integration."
)
async def create_key(
    data: ApiKeyCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    random_part = secrets.token_urlsafe(32)
    key = f"sk_live_{random_part}"
    prefix = key[:16]
    key_hash = pwd_context.hash(key)

    scopes_list = data.scopes if data.scopes else ["read", "write"]
    scopes_str = json.dumps(scopes_list)

    new_key = ApiKey(
        user_id=current_user.id,
        key_hash=key_hash,
        prefix=prefix,
        label=data.label,
        scopes=scopes_str
    )
    session.add(new_key)
    session.commit()
    session.refresh(new_key)

    return ApiKeySecret(
        **new_key.model_dump(),
        secret_key=key
    )


@router.delete(
    "/{key_id}",
    response_model=KeyRevokeResponse,
    summary="Revoke API key",
    description="Permanently delete and invalidate an API key."
)
async def revoke_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    key = session.get(ApiKey, key_id)
    if not key or key.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")

    session.delete(key)
    session.commit()
    return KeyRevokeResponse(message="Key revoked successfully", id=key_id)
