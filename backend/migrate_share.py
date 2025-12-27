from sqlmodel import Session, create_engine, text
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://user:password@db:5432/smartinventory")
engine = create_engine(DATABASE_URL)

def migrate():
    with Session(engine) as session:
        print("Starting SharedAccess migration...")
        try:
            # 1. Rename permission -> role
            print("Renaming permission to role...")
            try:
                session.exec(text("ALTER TABLE sharedaccess RENAME COLUMN permission TO role"))
            except Exception as e:
                print(f"Rename failed (maybe already done?): {e}")

            # 2. Add created_at
            print("Adding created_at...")
            try:
                 session.exec(text("ALTER TABLE sharedaccess ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now()"))
            except Exception as e:
                print(f"Add created_at failed: {e}")

            # 3. Add Unique Constraint
            print("Adding unique constraint...")
            try:
                session.exec(text("ALTER TABLE sharedaccess ADD CONSTRAINT unique_group_member UNIQUE (user_id, group_id)"))
            except Exception as e:
                 print(f"Constraint failed (maybe exists): {e}")

            session.commit()
            print("Migration successful.")
        except Exception as e:
            print(f"Migration failed: {e}")
            session.rollback()

if __name__ == "__main__":
    migrate()
