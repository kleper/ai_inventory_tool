from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from app.database import get_session
from app.models import Item, InventoryGroup

router = APIRouter()

@router.get("/share/{token}", response_model=dict)
def get_public_item(token: str, session: Session = Depends(get_session)):
    """
    Get item details by public token.
    No auth required.
    """
    item = session.exec(select(Item).where(Item.public_token == token)).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found or link invalid")
        
    if not item.is_public:
        raise HTTPException(status_code=404, detail="Link has been revoked")
        
    # Construct public response (hide sensitive fields if any, but Item model is mostly public info)
    # We might want to include Group name or User name?
    
    # Fetch group manually if relation not loaded
    # item.group might be lazy loaded
    
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description,
        "category": item.category,
        "price": item.price,
        "image_url": item.image_url,
        "status": item.status,
        "created_at": item.created_at,
        "meta_data": item.meta_data,
        "currency": item.group.currency if item.group else "USD", # Fallback
    }

from fastapi.responses import FileResponse
import os

MEDIA_ROOT = "/app/media"

@router.get("/share/{token}/image")
def get_public_item_image(token: str, session: Session = Depends(get_session)):
    """
    Get item image by public token.
    No auth required.
    """
    item = session.exec(select(Item).where(Item.public_token == token)).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found or link invalid")
        
    if not item.is_public:
        raise HTTPException(status_code=404, detail="Link has been revoked")

    if not item.image_url:
        raise HTTPException(status_code=404, detail="No image for this item")

    # Security check: prevent path traversal
    filename = os.path.basename(item.image_url)
    file_path = os.path.join(MEDIA_ROOT, filename)
    
    if not os.path.exists(file_path):
        # Fallback to thumbnail if original missing? Or just 404.
        raise HTTPException(status_code=404, detail="Image file missing from disk")
        
    return FileResponse(file_path)
