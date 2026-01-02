from duckduckgo_search import DDGS
import re

from typing import Tuple

def search_approximate_price(query: str) -> Tuple[float, str] | None:
    """
    Searches for an approximate price for the given item query using DuckDuckGo.
    Returns (price, currency_code), or None if no reliable price is found.
    """
    try:
        with DDGS() as ddgs:
            # Search for the item with "price" keyword. Try English keyword first as it yields more structured results usually.
            # But query is mixed.
            results = list(ddgs.text(f"{query} price", max_results=8))
            
            prices = [] # List of (amount, currency)
            
            # Common patterns
            # $10.99
            # 10.99 USD
            # €10.99
            # 10.99 EUR
            
            for r in results:
                snippet = r.get("body", "") + " " + r.get("title", "")
                
                # Regex 1: Symbol prefix ($10, €10, £10)
                # Group 1: Symbol, Group 2: Amount
                matches_symbol = re.findall(r'([$€£¥])\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)', snippet)
                for symbol, amount_str in matches_symbol:
                    try:
                        amount = float(amount_str.replace(',', ''))
                        currency = "USD"
                        if symbol == '€': currency = "EUR"
                        elif symbol == '£': currency = "GBP"
                        elif symbol == '¥': currency = "JPY"
                        prices.append((amount, currency))
                    except ValueError: pass

                # Regex 2: Suffix code (10 USD, 10 EUR)
                # Group 1: Amount, Group 2: Code
                matches_code = re.findall(r'(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s?(USD|EUR|GBP|COP|MXN|CAD)', snippet, re.IGNORECASE)
                for amount_str, code in matches_code:
                    try:
                        amount = float(amount_str.replace(',', ''))
                        prices.append((amount, code.upper()))
                    except ValueError: pass
            
            if not prices:
                # Fallback: Try searching specifically for "precio" if query appears Spanish-like
                # Or just return None
                return None
            
            # Heuristic: Filter outlier prices (too small or too huge?)
            # Valid prices usually > 0
            valid_prices = [p for p in prices if p[0] > 0]
            if not valid_prices: return None

            # Sort by price
            valid_prices.sort(key=lambda x: x[0])
            
            # Return median
            mid = len(valid_prices) // 2
            return valid_prices[mid] # Returns (amount, currency)

    except Exception as e:
        print(f"Error searching price for {query}: {e}")
        return None
