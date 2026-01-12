from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.dependencies.auth import get_current_user
from app.database import get_session
from app.models import User
from app.services.analytics_service import analytics_service

router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["analytics"],
    responses={404: {"description": "Not found"}},
)

@router.get("/overview")
async def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get aggregated analytics for the current user (USD Normalized).
    """
    try:
        data = await analytics_service.get_overview(current_user.id, session)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
