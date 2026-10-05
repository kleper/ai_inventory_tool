from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from app.routers import inventory, admin, groups, auth, admin_stats, media, api_keys, public_api, analytics, public, mcp
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

tags_metadata = [
    {
        "name": "developer-api",
        "description": "API Key authenticated REST endpoints for external developer integrations, programmatic automation, and LLM agents.",
    },
    {
        "name": "mcp",
        "description": "Native Model Context Protocol (MCP) server endpoints over HTTP (JSON-RPC 2.0 and Server-Sent Events). Supports dual authentication (API Key or Bearer JWT) with strict per-user inventory isolation.",
    },
    {
        "name": "inventory",
        "description": "Core inventory item operations, camera uploads, AI visual analysis, and background matching.",
    },
    {
        "name": "groups",
        "description": "Inventory collections/folders, collaborative permissions (Owner, Editor, Viewer), and GeoJSON mapping.",
    },
    {
        "name": "auth",
        "description": "User registration, authentication sessions, invitation acceptance, and password lifecycle.",
    },
    {
        "name": "api-keys",
        "description": "Developer API credential issuance, management, and revocation.",
    },
    {
        "name": "public-share",
        "description": "Token-based unauthenticated read-only share links for items and galleries.",
    },
    {
        "name": "analytics",
        "description": "Financial portfolio valuation, currency conversion, and AI token consumption metrics.",
    },
    {
        "name": "media",
        "description": "Static media storage, thumbnail generation, and map asset delivery.",
    },
    {
        "name": "admin",
        "description": "Administrative management, invitation generation, user directory, and platform controls.",
    },
]

app = FastAPI(
    title="SmartInventory API",
    version="1.0.0",
    summary="AI-Powered Inventory & Asset Management Platform",
    description="""
# SmartInventory Platform API

SmartInventory is a full-stack, enterprise-grade inventory management system combining a Wireframe Brutalist UI design with automated AI visual recognition and multi-currency portfolio valuation.

### Key Capabilities:
- **Developer REST API**: Fully authenticated CRUD operations on inventories and items via `X-API-KEY`.
- **Model Context Protocol (MCP)**: Native `/mcp` HTTP endpoint supporting JSON-RPC and SSE transports for direct LLM agent control.
- **Strict Per-User Scoping**: Multi-tenant access controls enforcing Owner, Editor, and Viewer permission boundaries.
- **Specialized Modes**: Tailored recognition modes for `GENERAL`, `NATURE` (botanical/medicinal metadata), and `PLACES` (storefront and architectural metadata).
- **Dual Authentication**: Session Bearer JWTs for the web application and `sk_live_...` API keys for external agents.
""",
    openapi_tags=tags_metadata,
    contact={
        "name": "SmartInventory Engineering",
        "email": "support@smartinventory.com",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        summary=app.summary,
        description=app.description,
        routes=app.routes,
        tags=app.openapi_tags,
    )
    if "components" not in openapi_schema:
        openapi_schema["components"] = {}
    
    openapi_schema["components"]["securitySchemes"] = {
        "ApiKeyAuth": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-KEY",
            "description": "API Key authentication for Developer API and MCP. Format: `sk_live_...`"
        },
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Session JWT Bearer token for authenticated frontend requests."
        }
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

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
app.include_router(public.router, prefix="/api/v1/public", tags=["public-share"])
app.include_router(admin.router)
app.include_router(admin_stats.router)
app.include_router(media.router)
app.include_router(api_keys.router)
app.include_router(public_api.router)
app.include_router(analytics.router)
app.include_router(mcp.router)

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
                with Session(database.engine) as session:
                    # Look for items stuck in "analyzing" or "error" that need to be re-processed
                    # Since we want to retry if the LLM couldn't process them
                    stuck_items = session.exec(
                        select(Item).where(Item.status.in_(["analyzing", "error"]))
                    ).all()

                    if stuck_items:
                        print(f"Cron Job: Found {len(stuck_items)} stuck items. Re-queuing for analysis.")
                        for item in stuck_items:
                            # Re-queue the background task for each stuck item
                            asyncio.create_task(analyze_item_background(item.id))
            except Exception as e:
                print(f"Background loop error: {e}")
            
            # Run every hour (3600 seconds)
            await asyncio.sleep(3600)

    # Start the background task loop
    asyncio.create_task(retry_stuck_items())


@app.get("/")
def read_root():
    return {"message": "SmartInventory API is running"}
