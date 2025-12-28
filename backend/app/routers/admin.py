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

from pydantic import BaseModel, EmailStr

class InvitationRequest(BaseModel):
    email: EmailStr

@router.post("/invitations", response_model=Invitation)
async def create_invitation(
    request: InvitationRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    email = request.email
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
        created_by=current_user.id,
        expires_at=expires,
        status="PENDING"
    )
    session.add(invite)
    session.commit()
    session.refresh(invite)
    
    # Send email in background
    background_tasks.add_task(EmailService.send_invitation_email, email, token)
    
    return invite

@router.get("/invitations", response_model=List[Invitation])
async def list_pending_invitations(session: Session = Depends(get_session)):
    invitations = session.exec(select(Invitation).where(Invitation.status == "PENDING")).all()
    return invitations

@router.delete("/invitations/{invitation_id}")
async def revoke_invitation(
    invitation_id: int,
    session: Session = Depends(get_session)
):
    invite = session.get(Invitation, invitation_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")
        
    session.delete(invite)
    session.commit()
    return {"message": "Invitation revoked"}

@router.post("/invitations/{invitation_id}/resend")
async def resend_invitation(
    invitation_id: int,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    invite = session.get(Invitation, invitation_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")
        
    if invite.status != "PENDING":
        raise HTTPException(status_code=400, detail="Only pending invitations can be resent")
        
    # Optional: Rotate token for security or keep same? 
    # Keeping same is easier for user if they find old email, 
    # but rotating is more secure if lost. 
    # Let's keep same for simplicity unless expired.
    
    if invite.expires_at < datetime.utcnow():
        # If expired, un-expire and extend
        invite.expires_at = datetime.utcnow() + timedelta(days=7)
        invite.status = "PENDING"
        session.add(invite)
        session.commit()
        session.refresh(invite)

    background_tasks.add_task(EmailService.send_invitation_email, invite.email, invite.token)
    return {"message": "Invitation resent"}
