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
                
                # Improved Parsing Helper
                def parse_price_string(amount_text: str) -> float | None:
                    try:
                        # Clean whitespace
                        clean = amount_text.strip()
                        if not clean: return None
                        
                        # Case 1: 1,234.56 (US/UK) -> Remove comma
                        if ',' in clean and '.' in clean:
                            if clean.find(',') < clean.find('.'):
                                return float(clean.replace(',', ''))
                            else:
                                # Case 2: 1.234,56 (EU/LatAm) -> Remove dot, replace comma with dot
                                return float(clean.replace('.', '').replace(',', '.'))
                        
                        # Case 3: 1,234 or 1234 (US) -> If comma is there
                        elif ',' in clean:
                            return float(clean.replace(',', '.')) # Assume it's a decimal comma if only comma exists? Ambiguous.
                            # Actually, 10,000 usually means 10k. 10,99 usually means 10.99.
                            # Heuristic: If 3 digits after comma, likely thousands separator.
                            parts = clean.split(',')
                            if len(parts[-1]) == 3:
                                return float(clean.replace(',', ''))
                            else:
                                return float(clean.replace(',', '.'))
                        
                        # Case 4: 1.234 (EU) -> If dot is there
                        elif '.' in clean:
                             # Ambiguous. 10.999 vs 10.99.
                             # Heuristic: If 3 digits after dot, likely thousands separator?
                             parts = clean.split('.')
                             if len(parts[-1]) == 3:
                                  return float(clean.replace('.', ''))
                             else:
                                  return float(clean)
                        
                        return float(clean)
                    except: return None

                # Regex 1: Symbol prefix ($10, €10, £10, $ 10.000)
                # Matches symbols followed by digits, dots, commas
                matches_symbol = re.findall(r'([$€£¥])\s?([\d.,]+)', snippet)
                for symbol, amount_str in matches_symbol:
                    amount = parse_price_string(amount_str)
                    if amount:
                        currency = "USD"
                        if symbol == '€': currency = "EUR"
                        elif symbol == '£': currency = "GBP"
                        elif symbol == '¥': currency = "JPY"
                        prices.append((amount, currency))

                # Regex 2: Suffix code (10 USD, 10.000 COP)
                matches_code = re.findall(r'([\d.,]+)\s?(USD|EUR|GBP|COP|MXN|CAD|AUD|BRL)', snippet, re.IGNORECASE)
                for amount_str, code in matches_code:
                    amount = parse_price_string(amount_str)
                    if amount:
                        prices.append((amount, code.upper()))
            
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
