from app.database import engine
from sqlalchemy import text

def fix_schema():
    print("Attempting to add 'quantity' column to 'item' table...")
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE item ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;"))
            conn.commit()
            print("Successfully added 'quantity' column.")
        except Exception as e:
            print(f"Error updating schema: {e}")

if __name__ == "__main__":
    fix_schema()
