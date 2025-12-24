from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from app.services.email import EmailService
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
async def create_invitation(
    email: str, 
    created_by_id: int, 
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    # Check if user already exists
    existing_user = session.exec(select(User).where(User.email == email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    # Check for pending invitation
    existing_invite = session.exec(select(Invitation).where(Invitation.email == email, Invitation.status == "PENDING")).first()
    if existing_invite:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation already sent to this email"
        )

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
    
    # Send email in background
    background_tasks.add_task(EmailService.send_invitation_email, email, token)
    
    return invite
