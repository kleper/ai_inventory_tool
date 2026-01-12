from sqlmodel import Session, create_engine, text
from app.core.config import settings

# Create engine
engine = create_engine(settings.DATABASE_URL)

def migrate():
    print("Starting migration: Adding language column to inventorygroup table...")
    with Session(engine) as session:
        try:
            # Check if column exists
            check_sql = text("SELECT column_name FROM information_schema.columns WHERE table_name='inventorygroup' AND column_name='language';")
            result = session.exec(check_sql).first()
            
            if not result:
                print("Column 'language' not found. Adding it...")
                # Add column
                session.exec(text("ALTER TABLE inventorygroup ADD COLUMN language VARCHAR DEFAULT 'ES';"))
                session.commit()
                print("Successfully added 'language' column with default 'ES'.")
            else:
                print("Column 'language' already exists. Skipping.")
                
        except Exception as e:
            print(f"Migration failed: {e}")
            session.rollback()

if __name__ == "__main__":
    migrate()
