from sqlmodel import Session, create_engine, text
import os

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/inventory_db")

# Adjust for local execution if needed (e.g. localhost)
# If running from host machine, use localhost mapped port?
# Since we are in agent env, we might be inside a container or on host.
# Assuming standard connection string works if we use `localhost` if `db` fails, 
# but usually `db` is for inter-container.
# For this script to run from `run_command` (Exec), it runs in the agent container? 
# Or I should run it inside backend container. 
# I will try running via `python3` directly. If it fails to connect to `db`, I might need `localhost`.

if "db" in DATABASE_URL:
    # Try localhost modification for script running on host/agent
    # Assuming port 5432 is exposed.
    pass 
    # Actually, the user environment says:
    # The user has 1 active workspaces...
    # I am not sure if I can access the postgres container from here via `db`.
    # But `verify_db.py` worked previously. Let's assume env is set or defaults work.
    
# Fallback for script execution environment
if not os.getenv("DATABASE_URL"):
     DATABASE_URL = "postgresql://user:password@localhost:5432/inventory_db"

engine = create_engine(DATABASE_URL)

def migrate():
    with Session(engine) as session:
        print("Starting migration...")
        try:
            # 1. Add force_password_change
            print("Adding force_password_change column...")
            session.exec(text("ALTER TABLE user ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE"))
            
            # 2. Add auth_provider
            print("Adding auth_provider column...")
            session.exec(text("ALTER TABLE user ADD COLUMN IF NOT EXISTS auth_provider VARCHAR DEFAULT 'EMAIL'"))

            session.commit()
            print("Migration successful.")
        except Exception as e:
            print(f"Migration failed: {e}")
            session.rollback()

if __name__ == "__main__":
    migrate()
