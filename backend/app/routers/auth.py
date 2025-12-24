from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.models import User, Invitation
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

class ValidateRequest(BaseModel):
    email: str
    token: Optional[str] = None

@router.post("/validate-registration")
async def validate_registration(
    data: ValidateRequest,
    session: Session = Depends(get_session)
):
    # This endpoint checks if a user is allowed to register
    # 1. User already exists -> OK
    existing_user = session.exec(select(User).where(User.email == data.email)).first()
    if existing_user:
        return {"valid": True, "message": "User exists"}
        
    # 2. Check for invitation
    statement = select(Invitation).where(
        Invitation.email == data.email, 
        Invitation.status == "PENDING"
    )
    invite = session.exec(statement).first()
    
    if not invite:
        raise HTTPException(status_code=403, detail="No valid invitation found. Please ask an admin for access.")
        
    # Check expiry
    if invite.expires_at < datetime.utcnow():
        invite.status = "EXPIRED"
        session.add(invite)
        session.commit()
        raise HTTPException(status_code=403, detail="Invitation expired")

    # If all good
    return {"valid": True, "message": "Invitation valid"}
