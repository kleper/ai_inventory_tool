from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database import get_session
from app.dependencies.auth import require_admin
from app.models import User, Invitation
from typing import List
import secrets
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/v1/admin", tags=["admin"], dependencies=[Depends(require_admin)])

@router.get("/users", response_model=List[User])
async def list_users(session: Session = Depends(get_session)):
    users = session.exec(select(User)).all()
    return users

@router.post("/invitations", response_model=Invitation)
async def create_invitation(email: str, created_by_id: int, session: Session = Depends(get_session)):
    # Generate token
    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(days=7)
    
    invite = Invitation(
        email=email,
        token=token,
        created_by=created_by_id,
        expires_at=expires,
        status="PENDING"
    )
    session.add(invite)
    session.commit()
    session.refresh(invite)
    return invite
