from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func
from app.database import get_session
from app.models import AIUsageLog
from app.dependencies.auth import require_admin
from datetime import datetime, timedelta, timezone
from typing import List, Optional

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

@router.get("/stats/usage")
async def get_usage_stats(
    days: int = 7,
    session: Session = Depends(get_session),
    admin: dict = Depends(require_admin)
):
    # Calculate start date using timezone-aware UTC datetime (required by SQLModel)
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Aggregate usage by date (Postgres date_trunc)
    date_group = func.date_trunc('day', AIUsageLog.created_at)
    statement = select(
        date_group.label('date'),
        func.sum(AIUsageLog.prompt_tokens).label('prompt_tokens'),
        func.sum(AIUsageLog.completion_tokens).label('completion_tokens'),
        func.sum(AIUsageLog.cost).label('total_cost')
    ).where(AIUsageLog.created_at >= start_date).group_by(date_group).order_by(date_group)
    
    results = session.exec(statement).all()
    
    # Format for chart
    chart_data = []
    for row in results:
        raw_date = row.date
        if isinstance(raw_date, datetime):
            date_str = raw_date.strftime("%Y-%m-%d")
        elif hasattr(raw_date, "strftime"):
            date_str = raw_date.strftime("%Y-%m-%d")
        else:
            date_str = str(raw_date)[:10] if raw_date is not None else ""

        prompt_tok = int(row.prompt_tokens or 0)
        comp_tok = int(row.completion_tokens or 0)
        total_cost = float(row.total_cost or 0.0)

        chart_data.append({
            "date": date_str,
            "tokens": prompt_tok + comp_tok,
            "cost": total_cost
        })
        
    # User Cost Distribution
    user_dist_stmt = select(
        AIUsageLog.user_id,
        func.sum(AIUsageLog.cost).label('total_cost')
    ).group_by(AIUsageLog.user_id)
    
    user_results = session.exec(user_dist_stmt).all()
    
    return {
        "daily_usage": chart_data,
        "user_distribution": [
            {
                "user_id": r.user_id if r.user_id is not None else 0,
                "cost": float(r.total_cost or 0.0)
            }
            for r in user_results
        ]
    }

@router.get("/audit")
async def get_audit_logs(
    limit: int = 20,
    offset: int = 0,
    session: Session = Depends(get_session),
    admin: dict = Depends(require_admin)
):
    statement = select(AIUsageLog).order_by(AIUsageLog.created_at.desc()).offset(offset).limit(limit)
    logs = session.exec(statement).all()
    return logs
