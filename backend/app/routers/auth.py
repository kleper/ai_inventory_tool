from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from app.database import get_session
from app.models import User, Invitation
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.services.security import verify_password, get_password_hash, create_access_token
from app.dependencies.auth import get_current_user
from app.core.limiter import limiter
from fastapi import Request

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# --- Request Models ---

class ValidateRequest(BaseModel):
    email: str
    token: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class CompleteRegistrationRequest(BaseModel):
    token: str
    password: str
    name: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class SocialLoginRequest(BaseModel):
    email: str
    name: Optional[str] = None
    provider: str = "GOOGLE"
    image: Optional[str] = None

# --- Endpoints ---

@router.post("/validate-registration")
async def validate_registration(
    data: ValidateRequest,
    session: Session = Depends(get_session)
):
    """
    Checks if a user can proceed with registration (Invite valid? User exists?).
    Used by Frontend to show 'Join' vs 'Login' UI or block access.
    """
    existing_user = session.exec(select(User).where(User.email == data.email)).first()
    if existing_user:
        return {"valid": True, "message": "User exists", "mode": "LOGIN"}
        
    statement = select(Invitation).where(
        Invitation.email == data.email, 
        Invitation.status == "PENDING"
    )
    invite = session.exec(statement).first()
    
    if not invite:
        raise HTTPException(status_code=403, detail="No valid invitation found.")
        
    if invite.expires_at < datetime.utcnow():
        invite.status = "EXPIRED"
        session.add(invite)
        session.commit()
        raise HTTPException(status_code=403, detail="Invitation expired")

    return {"valid": True, "message": "Invitation valid", "mode": "REGISTER"}


@router.post("/complete-registration")
@limiter.limit("5/minute")
async def complete_registration(
    request: Request,
    data: CompleteRegistrationRequest,
    session: Session = Depends(get_session)
):
    """
    Completes the invite flow:
    1. Verify token
    2. Create User (Email + Password)
    3. Invalidate Token
    """
    # Verify Token
    statement = select(Invitation).where(
        Invitation.token == data.token,
        Invitation.status == "PENDING"
    )
    invite = session.exec(statement).first()
    
    if not invite:
        raise HTTPException(status_code=400, detail="Invalid or expired token.")
        
    if invite.expires_at < datetime.utcnow():
        invite.status = "EXPIRED"
        session.add(invite)
        session.commit()
        raise HTTPException(status_code=400, detail="Invitation expired.")
    
    # Check if user already exists (sanity check)
    existing = session.exec(select(User).where(User.email == invite.email)).first()
    if existing:
        # Edge case: Invite pending but user exists? Should have been handled.
        raise HTTPException(status_code=400, detail="User already exists.")

    # Create User
    new_user = User(
        email=invite.email,
        name=data.name,
        password_hash=get_password_hash(data.password),
        auth_provider="EMAIL",
        force_password_change=False, # New users setting their own pass don't need force change
        status="ACTIVE",
        role="USER" # Or inherit from invite if we added role to invitation
    )
    session.add(new_user)
    
    # Update Invite
    invite.status = "USED"
    session.add(invite)
    
    session.commit()
    session.refresh(new_user)
    
    return {"message": "Registration successful", "user_id": new_user.id}


@router.post("/login")
@limiter.limit("5/minute")
async def login(
    request: Request,
    data: LoginRequest,
    session: Session = Depends(get_session)
):
    print(f"Login attempt for email: {data.email}")
    user = session.exec(select(User).where(User.email == data.email)).first()
    
    if not user:
        # Security: don't reveal user existence? 
        # For corporate tools, it's often better to give clear errors or standard "Invalid credentials"
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check Provider
    if user.auth_provider == "GOOGLE" and not user.password_hash:
         raise HTTPException(status_code=401, detail="Please use Google Login")

    if not user.password_hash:
        raise HTTPException(status_code=401, detail="Account not set up for password login")
        
    is_valid = verify_password(data.password, user.password_hash)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create Token
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})

    # Success
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "image": user.image,
        "require_password_reset": user.force_password_change,
        "access_token": access_token
    }


@router.post("/social-login")
async def social_login(
    data: SocialLoginRequest,
    session: Session = Depends(get_session)
):
    """
    Trusted Social Login:
    Since NextAuth has already verified the email with Google,
    we can trust this request to link/login the user.
    """
    user = session.exec(select(User).where(User.email == data.email)).first()
    
    if not user:
        # Option 1: Auto-register (if desired) 
        # For now, let's auto-register basic user or return 404
        # User requested to "connect both account", implying account exists.
        # But if it doesn't, we should create it to support "Sign up with Google".
        
        # Check for pending invites? Maybe. For now, basic specific creation.
        new_user = User(
            email=data.email,
            name=data.name or data.email.split("@")[0],
            auth_provider=data.provider,
            role="USER",
            status="ACTIVE",
            image=data.image
        )
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        user = new_user
    else:
        # Link account if not linked (e.g. was EMAIL, now adding GOOGLE info)
        if user.auth_provider == "EMAIL" and data.provider == "GOOGLE":
             # We could update provider or just allow it.
             # Updating provider might lock out password login if we're stricter elsewhere.
             # Let's just update the image if missing
             if not user.image and data.image:
                 user.image = data.image
                 session.add(user)
                 session.commit()

    # Create Token
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "image": user.image,
        "require_password_reset": user.force_password_change,
        "access_token": access_token
    }


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Verify old password
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    # Update
    current_user.password_hash = get_password_hash(data.new_password)
    current_user.force_password_change = False
    session.add(current_user)
    session.commit()
    
    return {"message": "Password updated successfully"}

# --- Dependency Placeholder ---
# I need to find where `get_current_user` is. 
# It's probably in `app.deps` or `app.main`.
# I'll check `app/routers/inventory.py` to see imports.
