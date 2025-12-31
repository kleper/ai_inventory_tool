from duckduckgo_search import DDGS
import re

def search_approximate_price(query: str) -> float | None:
    """
    Searches for an approximate price for the given item query using DuckDuckGo.
    Returns the estimated price as a float, or None if no reliable price is found.
    """
    try:
        with DDGS() as ddgs:
            # Search for the item with "price" keyword
            results = list(ddgs.text(f"{query} price", max_results=5))
            
            prices = []
            for r in results:
                # Look for price patterns like $10.99, $ 10, etc. in the snippet
                snippet = r.get("body", "")
                # Regex to find prices: starts with $, optional space, then digits, optional dot and cents
                matches = re.findall(r'\$\s?(\d+(?:\.\d{2})?)', snippet)
                
                for match in matches:
                    try:
                        price = float(match)
                        prices.append(price)
                    except ValueError:
                        continue
            
            if not prices:
                return None
            
            # Simple heuristic: return the median price to avoid outliers
            prices.sort()
            mid = len(prices) // 2
            return prices[mid]

    except Exception as e:
        print(f"Error searching price for {query}: {e}")
        return None
