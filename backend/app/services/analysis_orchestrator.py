import asyncio
import logging
from sqlmodel import Session, select
from app.models import Item, InventoryGroup
from app.services.llm_service import get_llm_service, LLMService
from app.services.currency_service import currency_service
from app.database import engine
import random

logger = logging.getLogger(__name__)

async def analyze_item_background(item_id: int):
    """
    Background task to analyze an item image using LLM.
    Handles rate limits and retries internally or via re-scheduling.
    """
    logger.info(f"Starting background analysis for item {item_id}")
    
    with Session(engine) as session:
        item = session.get(Item, item_id)
        if not item:
            logger.error(f"Item {item_id} not found in background task")
            return

        # Update status to analyzing if not already
        if item.status != "analyzing":
           item.status = "analyzing"
           session.add(item)
           session.commit()
           session.refresh(item)

        try:
            # 1. Load Image
            # Assuming image_url is the filename in /app/media
            file_path = f"/app/media/{item.image_url}"
            with open(file_path, "rb") as f:
                image_bytes = f.read()

            # 2. Prepare Context
            group_context = None
            if item.group_id:
                group = session.get(InventoryGroup, item.group_id)
                if group:
                    group_context = {
                        "name": group.name,
                        "description": group.description,
                        "currency": group.currency,
                        "settings": group.settings,
                        "language": group.language
                    }

            # 3. Call LLM Service
            llm_service = get_llm_service()
            item_data = await llm_service.analyze_object(
                image_bytes, 
                user_id=item.user_id, 
                group_context=group_context
            )

            # 4. Process Results (Currency Conversion, etc.)
            target_currency = group_context.get("currency", "USD") if group_context else "USD"
            
            if item_data.estimated_price and item_data.estimated_price > 0:
                if item_data.currency_code and item_data.currency_code != target_currency:
                    logger.info(
                        f"Converting price {item_data.estimated_price} {item_data.currency_code} to {target_currency}"
                    )
                    converted_price, success = await currency_service.convert(
                        item_data.estimated_price, item_data.currency_code, target_currency
                    )
                    if success:
                        item_data.estimated_price = converted_price

            # 5. Update Item
            item.name = item_data.name
            item.description = item_data.description
            item.category = item_data.category
            item.price = item_data.estimated_price
            
            # Merge Metadata
            current_meta = dict(item.meta_data or {})
            new_meta = item_data.meta_data or {}
            current_meta.update(new_meta)
            item.meta_data = current_meta

            # Determine final status
            is_price_req = True
            if group_context and group_context.get("settings"):
                 if group_context["settings"].get("is_price_enabled") is False:
                     is_price_req = False
            
            if not is_price_req:
                item.status = "completed"
            else:
                item.status = "completed" if item.price else "pending_price"
            
            session.add(item)
            session.commit()
            logger.info(f"Item {item_id} analysis completed. Status: {item.status}")

        except Exception as e:
            logger.error(f"Error analyzing item {item_id}: {e}")
            # Mark as error so user can retry
            item.status = "error"
            # create meta_data dict if None
            if item.meta_data is None:
                item.meta_data = {}
            # Store error message in metadata for debugging/UI
            item.meta_data["last_error"] = str(e)
            session.add(item)
            session.commit()

