from sqlmodel import Session, select
from app.models import AIUsageLog, User
from app.database import engine
from datetime import datetime
from fastapi import HTTPException

# Pricing (example values)
PRICING = {
    "gpt-4o": {"input": 0.000005, "output": 0.000015},
    "default": {"input": 0.000005, "output": 0.000015}
}

class MonitoringService:
    def log_usage(
        self, 
        user_id: int, 
        task_type: str, 
        model_name: str, 
        prompt_tokens: int, 
        completion_tokens: int, 
        status: str,
        input_image_url: str = None,
        output_json: str = None
    ):
        rates = PRICING.get(model_name, PRICING["default"])
        cost = (prompt_tokens * rates["input"]) + (completion_tokens * rates["output"])
        
        log_entry = AIUsageLog(
            user_id=user_id,
            task_type=task_type,
            model_name=model_name,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            cost=cost,
            status=status,
            input_image_url=input_image_url,
            output_json=output_json
        )
        
        with Session(engine) as session:
            session.add(log_entry)
            session.commit()
            
    def check_quota(self, user_id: int, estimated_tokens: int = 0):
        with Session(engine) as session:
            user = session.get(User, user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Simple check against monthly limit
            # Ideally we would sum up usage for the current month, 
            # but for this MVP let's assume 'monthly_token_limit' is a credit balance 
            # OR we just check a static limit against total usage? 
            # The prompt says: "if user exceeds limit".
            # Let's count total usage for current month.
            
            # Start of current month
            now = datetime.utcnow()
            start_of_month = datetime(now.year, now.month, 1)
            
            statement = select(AIUsageLog).where(
                AIUsageLog.user_id == user_id, 
                AIUsageLog.created_at >= start_of_month
            )
            logs = session.exec(statement).all()
            
            total_used = sum(log.prompt_tokens + log.completion_tokens for log in logs)
            
            if total_used + estimated_tokens > user.monthly_token_limit:
                 raise HTTPException(status_code=403, detail="Monthly AI Token Quota Exceeded")

# Singleton
monitoring_service = MonitoringService()
