from sqlmodel import Session, select
from app.database import engine
from app.models import Item
import sys
import json

def check_item(item_id):
    with Session(engine) as session:
        item = session.get(Item, item_id)
        if not item:
            print(f"Item {item_id} not found")
            return
        
        print(f"--- Raw DB Object ---")
        print(f"Item {item_id}: {item.name}")
        print(f"Meta Data (Raw): {item.meta_data}")
        
        print(f"\n--- Pydantic Serialization (API Response Simulation) ---")
        # Simulate what FastAPI does: model_dump(mode='json')
        try:
            serialized = item.model_dump(mode='json')
            print(json.dumps(serialized, indent=2, default=str))
            
            if 'meta_data' in serialized and 'map_image' in serialized['meta_data']:
                print("\n[SUCCESS] 'map_image' IS in the serialized output.")
            else:
                print("\n[FAILURE] 'map_image' is MISSING from serialized output.")
        except Exception as e:
            print(f"Serialization Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        check_item(int(sys.argv[1]))
    else:
        print("Usage: python check_db.py <item_id>")
