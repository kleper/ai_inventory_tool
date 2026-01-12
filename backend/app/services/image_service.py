from PIL import Image
import os
import uuid
import io

IMAGE_QUALITY = 95
THUMB_MAX_SIZE = (800, 800)

def save_image(image_data: bytes, dest_folder: str) -> str:
    """
    Saves original image and generates a thumbnail.
    Returns the filename (uuid + ext).
    """
    # Generate filename
    filename = f"{uuid.uuid4()}.jpg"
    filepath = os.path.join(dest_folder, filename)
    
    # Save Original
    with open(filepath, "wb") as f:
        f.write(image_data)
        
    # Generate Thumbnail
    try:
        with Image.open(io.BytesIO(image_data)) as img:
            # Convert to RGB if necessary (e.g. RGBA -> RGB)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
                
            img.thumbnail(THUMB_MAX_SIZE, Image.LANCZOS)
            
            thumb_filename = f"{os.path.splitext(filename)[0]}_thumb.jpg"
            thumb_path = os.path.join(dest_folder, thumb_filename)
            
            img.save(thumb_path, "JPEG", quality=IMAGE_QUALITY, optimize=True)
            
    except Exception as e:
        print(f"Error generating thumbnail for {filename}: {e}")
        # We don't fail the whole process if thumbnail fails, just log it.
        
    return filename
