from typing import Dict, Any, List
from sqlmodel import Session, select
from app.models import User, Item, InventoryGroup
from app.services.currency_service import currency_service
import logging

logger = logging.getLogger(__name__)

class AnalyticsService:
    async def get_overview(self, user_id: int, session: Session) -> Dict[str, Any]:
        """
        Aggregates user inventory data and normalizes to USD.
        """
        # 1. Fetch all Inventory Groups for the user (Owned)
        # We might also want to include Shared groups if required, but prompt says "User Inventory Tool"
        # usually implies what they own or have access to. 
        # For "Net Worth", typically it's what you own. Let's stick to owned groups for now 
        # or ask? Prompt says "todos los inventarios del usuario". 
        # Based on models, specific ownership:
        groups = session.exec(select(InventoryGroup).where(InventoryGroup.owner_id == user_id)).all()
        
        # Also items might be directly assigned to user (legacy)
        direct_items = session.exec(select(Item).where(Item.user_id == user_id)).all()

        total_inventories = len(groups)
        total_items = 0
        net_worth_usd = 0.0
        categories_map = {}

        # 2. Iterate Groups
        for group in groups:
            items = session.exec(select(Item).where(Item.group_id == group.id)).all()
            total_items += len(items)
            
            group_currency = group.currency if group.currency else "USD"
            
            # Fetch rates once per group currency if needed? 
            # Actually convert() handles caching.
            
            for item in items:
                subtotal, category = self._process_item(item)
                
                # Normalize to USD
                usd_value, success = await currency_service.convert(subtotal, group_currency, "USD")
                if success:
                    net_worth_usd += usd_value
                else:
                    # Fallback or log? If fails, maybe just add 0 or original if USD?
                    logger.warning(f"Failed to convert {subtotal} {group_currency} to USD")
                
                # Category stats
                if category:
                    categories_map[category] = categories_map.get(category, 0) + 1

        # 3. Iterate Direct Items (Legacy) - Assuming USD for direct items or default?
        # Model doesn't have currency on User or Item directly. 
        # Let's assume Legacy items are USD or ignore? 
        # Safest is to assume USD for legacy direct items.
        for item in direct_items:
            total_items += 1
            subtotal, category = self._process_item(item)
            net_worth_usd += subtotal # Assume USD
            
            if category:
                categories_map[category] = categories_map.get(category, 0) + 1

        # Format categories
        categories_distribution = [
            {"name": k, "count": v} for k, v in categories_map.items()
        ]
        # Sort by count desc
        categories_distribution.sort(key=lambda x: x["count"], reverse=True)

        return {
            "total_inventories": total_inventories,
            "total_items": total_items,
            "net_worth_usd": round(net_worth_usd, 2),
            "categories_distribution": categories_distribution
        }

    def _process_item(self, item: Item) -> tuple[float, str]:
        qty = item.quantity if item.quantity else 0
        price = item.price if item.price else 0.0
        subtotal = qty * price
        
        category = item.category if item.category else "Uncategorized"
        return subtotal, category

analytics_service = AnalyticsService()
