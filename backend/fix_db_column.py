from app.database import engine
from sqlalchemy import text

def fix():
    print("Attempting to add missing 'description' column to inventorygroup...")
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE inventorygroup ADD COLUMN IF NOT EXISTS description VARCHAR(250)"))
            conn.commit()
            print("Successfully added 'description' column (or it already existed).")
        except Exception as e:
            print(f"Error executing ALTER TABLE: {e}")

if __name__ == "__main__":
    fix()
