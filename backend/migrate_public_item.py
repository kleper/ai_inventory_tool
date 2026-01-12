from sqlmodel import Session, create_engine, text
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://user:password@db:5432/smartinventory")
engine = create_engine(DATABASE_URL)

def migrate():
    with Session(engine) as session:
        print("Starting Public Item migration...")
        try:
            # 1. Add is_public
            print("Adding is_public...")
            try:
                session.exec(text("ALTER TABLE item ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE"))
            except Exception as e:
                print(f"Add is_public failed: {e}")

            # 2. Add public_token
            print("Adding public_token...")
            try:
                session.exec(text("ALTER TABLE item ADD COLUMN IF NOT EXISTS public_token VARCHAR UNIQUE"))
            except Exception as e:
                print(f"Add public_token failed: {e}")

            # 3. Add Index on public_token
            print("Adding index on public_token...")
            try:
                # Check if index exists usually requires more complex query, but CREATE INDEX IF NOT EXISTS is safe in PG
                session.exec(text("CREATE INDEX IF NOT EXISTS ix_item_public_token ON item (public_token)"))
            except Exception as e:
                print(f"Index creation failed: {e}")

            session.commit()
            print("Migration successful.")
        except Exception as e:
            print(f"Migration failed: {e}")
            session.rollback()

if __name__ == "__main__":
    migrate()
