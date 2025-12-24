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

@app.on_event("startup")
def on_startup():
    database.init_db()
    
    # Seed Initial Admin
    admin_email = os.getenv("INITIAL_ADMIN_EMAIL")
    admin_password = os.getenv("INITIAL_ADMIN_PASSWORD")
    
    if admin_email and admin_password:
        with Session(database.engine) as session:
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
                # Force update password to match .env (Fix for login issues if DB persisted old password)
                print(f"Admin {admin_email} exists. Updating password to match .env")
                hashed_pw = get_password_hash(admin_password)
                existing_user.password_hash = hashed_pw
                session.add(existing_user)
                session.commit()

# Mock Auth Middleware (Disabled for now as we want real auth, or keep if needed for dev? Keeping it commented out or non-blocking)
@app.middleware("http")
async def mock_auth_middleware(request: Request, call_next):
    # response = await call_next(request)
    return await call_next(request)


app.include_router(inventory.router)
app.include_router(admin.router)
app.include_router(groups.router)
app.include_router(auth.router)
from app.routers import admin_stats
app.include_router(admin_stats.router)

@app.get("/")
def read_root():
    return {"message": "SmartInventory API is running"}
