from app.database import engine
from sqlalchemy import text

def check_schema():
    print("Checking for 'quantity' column in 'item' table...")
    with engine.connect() as conn:
        try:
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='item' AND column_name='quantity';"))
            row = result.fetchone()
            if row:
                print("VERIFICATION SUCCESS: 'quantity' column FOUND.")
            else:
                print("VERIFICATION FAILURE: 'quantity' column NOT FOUND.")
        except Exception as e:
            print(f"Error checking schema: {e}")

if __name__ == "__main__":
    check_schema()
