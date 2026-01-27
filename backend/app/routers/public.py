from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from app.database import get_session
from app.models import Item, InventoryGroup
from fastapi.responses import FileResponse, Response
import os

router = APIRouter()
MEDIA_ROOT = "/app/media"
GALLERY_KEY = "gallery_images"


def _get_public_item(token: str, session: Session) -> Item:
    item = session.exec(select(Item).where(Item.public_token == token)).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found or link invalid")

    if not item.is_public:
        raise HTTPException(status_code=404, detail="Link has been revoked")

    return item


def _get_public_gallery_filenames(item: Item) -> set[str]:
    meta = item.meta_data or {}
    gallery = meta.get(GALLERY_KEY)
    filenames: list[str] = []
    if item.image_url:
        filenames.append(item.image_url)
    if isinstance(gallery, list):
        filenames.extend([img for img in gallery if isinstance(img, str) and img])
    return {os.path.basename(name) for name in filenames if name}


def _transparent_pixel() -> Response:
    import base64

    params = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    return Response(content=base64.b64decode(params), media_type="image/png")


@router.get("/share/{token}", response_model=dict)
def get_public_item(token: str, session: Session = Depends(get_session)):
    """
    Get item details by public token.
    No auth required.
    """
    item = _get_public_item(token, session)
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
        "currency": item.group.currency if item.group else "USD",  # Fallback
    }


@router.get("/share/{token}/image")
def get_public_item_image(token: str, session: Session = Depends(get_session)):
    """
    Get item image by public token.
    No auth required.
    """
    item = _get_public_item(token, session)

    if not item.image_url:
        raise HTTPException(status_code=404, detail="No image for this item")

    # Security check: prevent path traversal
    filename = os.path.basename(item.image_url)
    file_path = os.path.join(MEDIA_ROOT, filename)

    if not os.path.exists(file_path):
        # Fallback to thumbnail if original missing? Or just 404.
        raise HTTPException(status_code=404, detail="Image file missing from disk")

    return FileResponse(file_path)


@router.get("/share/{token}/gallery/{filename}/thumbnail")
def get_public_gallery_thumbnail(
    token: str, filename: str, session: Session = Depends(get_session)
):
    item = _get_public_item(token, session)
    allowed = _get_public_gallery_filenames(item)
    safe_name = os.path.basename(filename)
    if safe_name not in allowed:
        raise HTTPException(status_code=404, detail="Image not found")

    base, ext = os.path.splitext(safe_name)
    thumb_filename = f"{base}_thumb{ext}"
    thumb_path = os.path.join(MEDIA_ROOT, thumb_filename)

    if os.path.exists(thumb_path):
        return FileResponse(
            thumb_path, headers={"Cache-Control": "public, max-age=31536000"}
        )

    original_path = os.path.join(MEDIA_ROOT, safe_name)
    if os.path.exists(original_path):
        return FileResponse(
            original_path, headers={"Cache-Control": "public, max-age=31536000"}
        )

    return _transparent_pixel()


@router.get("/share/{token}/gallery/{filename}")
def get_public_gallery_image(
    token: str, filename: str, session: Session = Depends(get_session)
):
    item = _get_public_item(token, session)
    allowed = _get_public_gallery_filenames(item)
    safe_name = os.path.basename(filename)
    if safe_name not in allowed:
        raise HTTPException(status_code=404, detail="Image not found")

    file_path = os.path.join(MEDIA_ROOT, safe_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image file missing from disk")

    return FileResponse(file_path)
