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

    async def process_and_match(self, user_id: int, invoice_bytes: bytes, invoice_id: int) -> Dict[str, Any]:
        # Logic is similar but we update the specific invoice record
        
        # 1. El LLM extrae todo lo que ve en la factura
        items_in_invoice: List[InvoiceItem] = await self.llm.extract_invoice_data(invoice_bytes)
        
        if not items_in_invoice:
            return {"updated_count": 0, "matches": [], "message": "No items found in invoice"}

        # 2. Obtenemos ítems del usuario sin precio (Pending)
        statement = select(Item).where(Item.user_id == user_id).where(Item.status == "pending_price")
        results = self.db.exec(statement).all()
        pending_items = list(results)

        if not pending_items:
            return {"updated_count": 0, "matches": [], "message": "No pending items in inventory to match against"}

        # 3. Prompt de razonamiento para el Matching
        matches: List[MatchingResult] = await self.llm.identify_matches(pending_items, items_in_invoice)

        # 4. Persistencia
        updated_count = 0
        match_details = []
        
        for match in matches:
            item = self.db.get(Item, match.inventory_item_id)
            if item and item.user_id == user_id:
                item.price = match.matched_price
                item.status = "completed"
                self.db.add(item)
                updated_count += 1
                match_details.append(match.dict())
        
        # Update Invoice Status
        invoice = self.db.get(Invoice, invoice_id)
        if invoice:
            invoice.status = "completed"
            self.db.add(invoice)

        self.db.commit()
        return {
            "invoice_id": invoice_id,
            "status": "completed",
            "updated_count": updated_count,
            "matches": match_details
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
                "type": "invoice_processed",
                "data": result
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
