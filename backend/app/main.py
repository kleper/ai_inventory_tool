from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.routers import inventory
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="SmartInventory API")

# Mock Auth Middleware
@app.middleware("http")
async def mock_auth_middleware(request: Request, call_next):
    # For demo purposes, we allow all requests. 
    # In a real app, we would check for Authorization header.
    # token = request.headers.get("Authorization")
    # if not token:
    #     return JSONResponse(status_code=401, content={"detail": "Missing authentication"})
    
    response = await call_next(request)
    return response

app.include_router(inventory.router)

@app.get("/")
def read_root():
    return {"message": "SmartInventory API is running"}
