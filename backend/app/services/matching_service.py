from typing import List, Dict, Any
from sqlmodel import Session, select
from app.models import Item, Invoice
from app.services.llm_service import LLMService, InvoiceItem, MatchingResult
import os

class MatchingService:
    def __init__(self, llm_service: LLMService, db_session: Session):
        self.llm = llm_service
        self.db = db_session

    async def process_and_match(self, user_id: int, invoice_bytes: bytes) -> Dict[str, Any]:
        # 1. El LLM extrae todo lo que ve en la factura
        items_in_invoice: List[InvoiceItem] = await self.llm.extract_invoice_data(invoice_bytes)
        
        if not items_in_invoice:
            return {"updated_count": 0, "matches": [], "message": "No items found in invoice"}

        # 2. Obtenemos ítems del usuario sin precio (Pending)
        # Assuming user_id is handled, for now we might filter just by status if we don't have user context explicitly passed everywhere yet
        # But let's assume we pass user_id
        statement = select(Item).where(Item.user_id == user_id).where(Item.status == "pending_price")
        # If user_id is optional in Item model or we want to be safe:
        # statement = select(Item).where(Item.status == "pending_price")
        # Using the prompt's logic:
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
            # Security check: ensure item belongs to user if we query by ID directly
            item = self.db.get(Item, match.inventory_item_id)
            if item and item.user_id == user_id:
                item.price = match.matched_price
                item.status = "completed"
                # Optionally link invoice_id if we created an Invoice record beforehand
                # here we just update price as per requirement
                self.db.add(item)
                updated_count += 1
                match_details.append(match.dict())
        
        self.db.commit()
        return {
            "updated_count": updated_count,
            "matches": match_details
        }

# Dependency helper
from fastapi import Depends
from app.database import get_session
from app.services.llm_service import get_llm_service

def get_matching_service(
    session: Session = Depends(get_session),
    llm_service: LLMService = Depends(get_llm_service)
) -> MatchingService:
    return MatchingService(llm_service, session)
