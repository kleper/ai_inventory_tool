from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routers import inventory, admin, groups, auth, admin_stats
from dotenv import load_dotenv
from app import database
from app.models import User
from app.services.security import get_password_hash
from sqlmodel import Session, select
import os

load_dotenv()

app = FastAPI(title="SmartInventory API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(inventory.router)
app.include_router(groups.router)
app.include_router(admin.router)
app.include_router(admin_stats.router)

@app.on_event("startup")
def on_startup():
    database.init_db()
    
    # Run Migrations Directly First
    from sqlalchemy import text
    with Session(database.engine) as session:
        print("Running Auto-Migrations...")
        # User Table Migrations
        try:
            session.exec(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS auth_provider VARCHAR DEFAULT 'EMAIL'"))
            session.exec(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE"))
            session.commit()
            print("Migrated User table")
        except Exception as e:
            session.rollback()
            print(f"User migration skipped/failed: {e}")

        # SharedAccess Migrations
        try:
             # Rename if permission exists and role doesn't? Or naive rename
             session.exec(text("ALTER TABLE sharedaccess RENAME COLUMN permission TO role"))
             session.commit()
        except Exception:
             session.rollback() # Column might already be role

        try:
             session.exec(text("ALTER TABLE sharedaccess ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now()"))
             session.commit()
        except Exception:
             session.rollback()

        try:
             session.exec(text("ALTER TABLE sharedaccess ADD CONSTRAINT unique_group_member UNIQUE (user_id, group_id)"))
             session.commit()
        except Exception:
             session.rollback()

    # Ensure Media Dir
    import os
    media_path = "/app/media"
    if not os.path.exists(media_path):
        os.makedirs(media_path)

    # Seed Initial Admin (Now safe to query)
    admin_email = os.getenv("INITIAL_ADMIN_EMAIL")
    admin_password = os.getenv("INITIAL_ADMIN_PASSWORD")
    
    if admin_email and admin_password:
        with Session(database.engine) as session:
            try:
                existing_user = session.exec(select(User).where(User.email == admin_email)).first()
                if not existing_user:
                    print(f"Seeding initial admin: {admin_email}")
                    hashed_pw = get_password_hash(admin_password)
                    admin_user = User(
                        email=admin_email,
                        password_hash=hashed_pw,
                        role="ADMIN",
                        status="ACTIVE",
                        name="System Admin"
                    )
                    session.add(admin_user)
                    session.commit()
                else:
                    print(f"Admin {admin_email} exists. Updating password.")
                    hashed_pw = get_password_hash(admin_password)
                    existing_user.password_hash = hashed_pw
                    session.add(existing_user)
                    session.commit()
            except Exception as e:
                print(f"Error seeding admin: {e}") 
                # Don't crash if seed fails, but migration should have fixed the schema.


@app.get("/")
def read_root():
    return {"message": "SmartInventory API is running"}
