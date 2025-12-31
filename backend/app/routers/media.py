from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from sqlmodel import Session
from app.database import get_session
from app.models import User, Item, InventoryGroup
from app.dependencies.auth import get_current_user, get_inventory_scope
from typing import List
import os

router = APIRouter(prefix="/api/v1/media", tags=["media"])

MEDIA_ROOT = "/app/media"

@router.get("/items/{item_id}/image")
async def get_item_image(
    item_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    allowed_groups: List[int] = Depends(get_inventory_scope)
):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    # Permission Check
    has_access = False
    if item.user_id == current_user.id:
        has_access = True
    elif item.group_id and item.group_id in allowed_groups:
        has_access = True
        
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    if not item.image_url:
        raise HTTPException(status_code=404, detail="No image for this item")

    # Security check: prevent path traversal
    # item.image_url should be just a filename like "uuid.jpg"
    filename = os.path.basename(item.image_url)
    file_path = os.path.join(MEDIA_ROOT, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image file missing from disk")
        
    return FileResponse(file_path)

@router.get("/items/{item_id}/thumbnail")
async def get_item_thumbnail(
    item_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    allowed_groups: List[int] = Depends(get_inventory_scope)
):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    # Permission Check
    has_access = False
    if item.user_id == current_user.id:
        has_access = True
    elif item.group_id and item.group_id in allowed_groups:
        has_access = True
        
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    if not item.image_url:
        raise HTTPException(status_code=404, detail="No image for this item")

    # Construct thumbnail path
    base, ext = os.path.splitext(item.image_url)
    thumb_filename = f"{base}_thumb{ext}"
    thumb_path = os.path.join(MEDIA_ROOT, thumb_filename)
    
    # If thumb doesn't exist, fallback to original? Or just return original?
    # Returning original as fallback is safer for legacy items.
    if not os.path.exists(thumb_path):
        original_path = os.path.join(MEDIA_ROOT, item.image_url)
        if os.path.exists(original_path):
             # Log warning or silently serve original
             return FileResponse(original_path, headers={"Cache-Control": "public, max-age=31536000"})
        else:
             raise HTTPException(status_code=404, detail="Image not found")
        
    return FileResponse(thumb_path, headers={"Cache-Control": "public, max-age=31536000"})

@router.get("/items/{item_id}/original")
async def get_item_original(
    item_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    allowed_groups: List[int] = Depends(get_inventory_scope)
):
    # Reuse valid logic, simplified for brevity, in real app better to extract common perm check
    return await get_item_image(item_id, session, current_user, allowed_groups)

@router.get("/items/{item_id}/download")
async def download_item_image(
    item_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    allowed_groups: List[int] = Depends(get_inventory_scope)
):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    has_access = (item.user_id == current_user.id) or \
                 (item.group_id and item.group_id in allowed_groups)

    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
        
    if not item.image_url:
        raise HTTPException(status_code=404, detail="No image")
        
    file_path = os.path.join(MEDIA_ROOT, os.path.basename(item.image_url))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(
        file_path, 
        media_type='application/octet-stream', 
        filename=f"{item.name.replace(' ', '_')}.jpg"
    )
