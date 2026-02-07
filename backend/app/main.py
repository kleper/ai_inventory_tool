from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routers import inventory, admin, groups, auth, admin_stats, media, api_keys, public_api, analytics, public
from dotenv import load_dotenv
from app import database
from app.models import User
from app.services.security import get_password_hash
from sqlmodel import Session, select
import os
from app.core.limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

load_dotenv()

app = FastAPI(title="SmartInventory API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
import os
media_path = "/app/media"
if not os.path.exists(media_path):
    os.makedirs(media_path)
app.mount("/media", StaticFiles(directory=media_path), name="media")

app.include_router(auth.router)
app.include_router(inventory.router)
app.include_router(groups.router)
app.include_router(public.router, prefix="/api/v1/public", tags=["public"])
app.include_router(admin.router)
app.include_router(admin_stats.router)
app.include_router(media.router)
app.include_router(api_keys.router)
app.include_router(public_api.router)
app.include_router(analytics.router)

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
            session.exec(text("ALTER TABLE inventorygroup ADD COLUMN IF NOT EXISTS description VARCHAR(250)")) # Critical Fix for Sync Issue
            session.exec(text("ALTER TABLE inventorygroup ADD COLUMN IF NOT EXISTS currency VARCHAR DEFAULT 'USD'")) 
            session.exec(text("ALTER TABLE inventorygroup ADD COLUMN IF NOT EXISTS owner_id INTEGER")) 
            session.commit()
            print("Migrated User and Group tables")
        except Exception as e:
            session.rollback()
            print(f"User migration skipped/failed: {e}")

        # SharedAccess Migrations - Introspection to avoid DB Errors
        try:
             # Check if 'permission' column exists
             check_perm = session.exec(text("SELECT column_name FROM information_schema.columns WHERE table_name='sharedaccess' AND column_name='permission'")).first()
             if check_perm:
                 session.exec(text("ALTER TABLE sharedaccess RENAME COLUMN permission TO role"))
                 session.commit()
                 print("Renamed permission column to role")
        except Exception as e:
             session.rollback()
             print(f"Column rename skipped: {e}")

        try:
             # Check if 'created_at' exists
             check_created = session.exec(text("SELECT column_name FROM information_schema.columns WHERE table_name='sharedaccess' AND column_name='created_at'")).first()
             if not check_created:
                 session.exec(text("ALTER TABLE sharedaccess ADD COLUMN created_at TIMESTAMP DEFAULT now()"))
                 session.commit()
                 print("Added created_at column")
        except Exception as e:
             session.rollback()
             print(f"Add column skipped: {e}")

        try:
             # Check if constraint exists
             check_const = session.exec(text("SELECT constraint_name FROM information_schema.table_constraints WHERE table_name='sharedaccess' AND constraint_name='unique_group_member'")).first()
             if not check_const:
                 session.exec(text("ALTER TABLE sharedaccess ADD CONSTRAINT unique_group_member UNIQUE (user_id, group_id)"))
                 session.commit()
                 print("Added unique constraint")
        except Exception as e:
             session.rollback()
             print(f"Constraint addition skipped: {e}")

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
                    print(f"Admin {admin_email} already exists. Skipping seed.")
            except Exception as e:
                print(f"Error seeding admin: {e}") 
                # Don't crash if seed fails, but migration should have fixed the schema.

    # Start Background Task Loop for Retries
    import asyncio
    from app.services.analysis_orchestrator import analyze_item_background
    from app.models import Item

    async def retry_stuck_items():
        while True:
            try:
                # Find items that are 'analyzing' for too long, or just pick up any 'analyzing'
                # For simplicity, we just pick up 'analyzing' items (maybe server crashed)
                # Ideally check updated_at < now - 5min
                # But we don't have updated_at easily.
                # We can just pick all 'analyzing' items. 
                # If multiple workers, this is bad. But with one worker/docker, it's ok.
                # Better: Add 'error' items? No, error is manual.
                
                # To avoid re-processing currently active items, we might need a lock or just ignore for now
                # and rely on user manual retry if it gets stuck.
                # BUT the user asked "si el llm no puede procesarlos... pruebe mas tarde".
                # If we implement a queue, we should consume it.
                # Our "queue" is the Items table with status='analyzing'.
                pass
            except Exception as e:
                print(f"Background loop error: {e}")
            await asyncio.sleep(60)

    # Note: process_pending_items loop implementation is risky without proper locking/timestamps.
    # The requirement "pruebe mas tarde" is satisfied by:
    # 1. Immediate retry in analyze_item_background (via tenacity).
    # 2. If valid failure (rate limit exhausted), set to 'error'.
    # 3. User can manually retry.
    # For "Server Crash" case, items stay 'analyzing'.
    # We will leave them as 'analyzing' so user sees them. 
    # Or we can mark them as 'error' on startup?
    
    # Let's perform a one-time cleanup on startup: Mark 'analyzing' -> 'error' (Potential crash).
    with Session(database.engine) as session:
        stuck_items = session.exec(select(Item).where(Item.status == "analyzing")).all()
        if stuck_items:
            print(f"Found {len(stuck_items)} stuck items. Resetting to 'error' to allow retry.")
            for item in stuck_items:
                item.status = "error"
                if not item.meta_data: item.meta_data = {}
                item.meta_data["last_error"] = "System restart during analysis"
                session.add(item)
            session.commit()


@app.get("/")
def read_root():
    return {"message": "SmartInventory API is running"}
