from fastapi import Security, HTTPException, Depends, status
from fastapi.security.api_key import APIKeyHeader
from sqlmodel import Session, select
from app.database import get_session
from app.models import ApiKey, User
from passlib.context import CryptContext
from datetime import datetime

api_key_header = APIKeyHeader(name="X-API-KEY", auto_error=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def get_user_from_api_key(
    api_key_str: str = Security(api_key_header),
    session: Session = Depends(get_session)
) -> User:
    if not api_key_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-KEY header"
        )
    
    # Prefix lookup optimization
    # Key format: sk_live_PREFIX...
    # We store first 16 chars as prefix (sk_live_ + 8 chars)
    
    if len(api_key_str) < 16:
         raise HTTPException(status_code=401, detail="Invalid API Key format")
         
    prefix = api_key_str[:16]
    
    candidates = session.exec(select(ApiKey).where(ApiKey.prefix == prefix)).all()
    
    for candidate in candidates:
        if pwd_context.verify(api_key_str, candidate.key_hash):
            # Update usage stats
            # Ideally this is done in background to avoid write-lock contention on high velocity APIs
            # For now, simple update is fine.
            candidate.last_used_at = datetime.utcnow()
            session.add(candidate)
            session.commit()
            
            if not candidate.user:
                 raise HTTPException(status_code=401, detail="Orphaned API Key")
                 
            return candidate.user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API Key"
    )
