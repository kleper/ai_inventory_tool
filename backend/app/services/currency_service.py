import httpx
import logging
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Cache structure: { base_currency: (timestamp, rates_dict) }
_rates_cache: Dict[str, Tuple[datetime, Dict[str, float]]] = {}
CACHE_TTL = timedelta(hours=1)

class CurrencyService:
    def __init__(self, base_url: str = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies"):
        self.base_url = base_url

    async def get_rates(self, base_currency: str) -> Optional[Dict[str, float]]:
        base_currency = base_currency.lower()
        
        # Check cache
        if base_currency in _rates_cache:
            timestamp, rates = _rates_cache[base_currency]
            if datetime.now() - timestamp < CACHE_TTL:
                return rates
            
        # Fetch from API
        url = f"{self.base_url}/{base_currency}.json"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                
                # The API returns structure: { "date": "...", "base": { "target": rate, ... } }
                # e.g., usd.json -> { "date": ..., "usd": { "eur": 0.9, ... } }
                rates = data.get(base_currency)
                
                if rates:
                    _rates_cache[base_currency] = (datetime.now(), rates)
                    return rates
                else:
                    logger.error(f"Currency data format error for {base_currency}")
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to fetch currency rates for {base_currency}: {e}")
            return None

    async def convert(self, amount: float, from_currency: str, to_currency: str) -> Tuple[float, bool]:
        """
        Converts amount from one currency to another.
        Returns (amount, success_flag).
        If conversion fails, returns (original_amount, False).
        """
        if not amount:
            return 0.0, True
            
        from_code = from_currency.lower()
        to_code = to_currency.lower()
        
        if from_code == to_code:
            return amount, True
            
        rates = await self.get_rates(from_code)
        if not rates:
            logger.warning(f"Conversion failed: Could not fetch rates for {from_code}")
            return amount, False
            
        rate = rates.get(to_code)
        if rate is None:
            logger.warning(f"Conversion failed: Rate for {to_code} not found in {from_code} rates")
            return amount, False
            
        converted_amount = amount * rate
        
        # Rounding logic
        if to_code == 'cop':
            return round(converted_amount), True
        else:
            return round(converted_amount, 2), True

# Singleton
currency_service = CurrencyService()
