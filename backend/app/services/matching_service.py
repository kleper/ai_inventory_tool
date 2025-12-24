from typing import List, Dict, Any
from sqlmodel import Session, select
from app.models import Item, Invoice
from app.services.llm_service import LLMService, InvoiceItem, MatchingResult
import os

from app.database import engine
from app.services.websocket_manager import manager

class MatchingService:
    def __init__(self, llm_service: LLMService, db_session: Session):
        self.llm = llm_service
        self.db = db_session

    async def process_and_match(self, user_id: int, invoice_bytes: bytes, invoice_id: int) -> dict:
        # 1. Fetch user's inventory items that need info (e.g. pending_price)
        statement = select(Item).where(Item.user_id == user_id)
        # We might want to match against ALL items to check for duplicates or updates, 
        # but prompt said "Objetos en Inventario". 
        # Let's pass all items to context so LLM can match.
        items = self.db.exec(statement).all()
        
        inventory_list = [{"id": item.id, "name": item.name} for item in items]
        
        # 2. Call LLM with Reasoned Extraction
        try:
            llm_response = await self.llm.extract_data_with_reasoning(invoice_bytes, inventory_list)
        except Exception as e:
            # Log error and re-raise or handle
            print(f"LLM Error: {e}")
            raise e

        matches_found = 0
        
        # 3. Process Matches based on Confidence
        for match in llm_response.matches:
            item = self.db.get(Item, match.inventory_item_id)
            if item:
                if match.confidence >= 0.8:
                    # High Confidence: Auto Update
                    item.price = match.extracted_price
                    item.status = "completed"
                    matches_found += 1
                elif match.confidence >= 0.5:
                    # Medium Confidence: Needs Review
                    item.price = match.extracted_price # Propose the price
                    item.status = "needs_review"
                    matches_found += 1
                else:
                    # Low Confidence: Ignore or Log (handled by LLM putting in unmatched usually, but safety check)
                    pass
                
                self.db.add(item)
        
        # Update Invoice Status
        invoice = self.db.get(Invoice, invoice_id)
        if invoice:
            invoice.status = "completed"
            # We could store the summary/date/vendor in Invoice model if we extended it.
            self.db.add(invoice)
            
        self.db.commit()
        
        return {
            "updated_count": matches_found,
            "invoice_summary": llm_response.invoice_summary.dict(),
            "matches": [m.dict() for m in llm_response.matches],
            "unmatched": [u.dict() for u in llm_response.unmatched_items]
        }

# Background Task Wrapper
async def run_matching_background_task(user_id: int, invoice_id: int, invoice_bytes: bytes):
    # Create a new session for the background task
    with Session(engine) as session:
        from app.services.llm_service import get_llm_service
        llm = get_llm_service() # Uses env var check logic
        service = MatchingService(llm, session)
        
        try:
            result = await service.process_and_match(user_id, invoice_bytes, invoice_id)
            # Notify User via WebSocket
            await manager.send_personal_message({
                "type": "INVOICE_PROCESSED",
                "invoice_id": str(invoice_id),
                "status": "success",
                "matches_found": result["updated_count"],
                "data": result # Keep full result in data for Modal
            }, user_id)
            
        except Exception as e:
            # Handle failure
            invoice = session.get(Invoice, invoice_id)
            if invoice:
                invoice.status = "failed"
                session.add(invoice)
                session.commit()
            
            await manager.send_personal_message({
                "type": "invoice_failed",
                "message": str(e)
            }, user_id)

# Dependency helper
from fastapi import Depends
from app.database import get_session
from app.services.llm_service import get_llm_service

def get_matching_service(
    session: Session = Depends(get_session),
    llm_service: LLMService = Depends(get_llm_service)
) -> MatchingService:
    return MatchingService(llm_service, session)
