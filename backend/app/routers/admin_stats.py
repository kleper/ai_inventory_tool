from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func
from app.database import get_session
from app.models import AIUsageLog
from app.dependencies.auth import require_admin
from datetime import datetime, timedelta
from typing import List, Optional

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

@router.get("/stats/usage")
async def get_usage_stats(
    days: int = 7,
    session: Session = Depends(get_session),
    admin: dict = Depends(require_admin)
):
    # Calculate start date
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Aggregate usage by date
    # Note: SQLite/Postgres date truncation might differ. Using python grouping for simplicity or SQL 'date()' function if Postgres.
    # Assuming Postgres:
    # We want: date, tokens (prompt+completion), cost
    
    # Let's fetch raw logs and aggregate in python for flexibility across DBs (since we used SQLite initially but switched to Postgres?)
    # The summary says "PostgreSQL, NextAuth". So we can use Postgres SQL.
    
    statement = select(
        func.date_trunc('day', AIUsageLog.created_at).label('date'),
        func.sum(AIUsageLog.prompt_tokens).label('prompt_tokens'),
        func.sum(AIUsageLog.completion_tokens).label('completion_tokens'),
        func.sum(AIUsageLog.cost).label('total_cost')
    ).where(AIUsageLog.created_at >= start_date).group_by(func.date_trunc('day', AIUsageLog.created_at)).order_by('date')
    
    results = session.exec(statement).all()
    
    # Format for chart
    chart_data = []
    for row in results:
        chart_data.append({
            "date": row.date.strftime("%Y-%m-%d"),
            "tokens": row.prompt_tokens + row.completion_tokens,
            "cost": row.total_cost
        })
        
    # User Cost Distribution
    user_dist_stmt = select(
        AIUsageLog.user_id,
        func.sum(AIUsageLog.cost).label('total_cost')
    ).group_by(AIUsageLog.user_id)
    
    user_results = session.exec(user_dist_stmt).all()
    
    return {
        "daily_usage": chart_data,
        "user_distribution": [{"user_id": r.user_id, "cost": r.total_cost} for r in user_results]
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
