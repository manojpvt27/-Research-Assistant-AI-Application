import time
import logging
import urllib.parse
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

def search_ddg_html(topic: str, max_results: int = 10) -> list:
    """
    Fallback pure-Python search using html.duckduckgo.com directly.
    Excludes JavaScript requirements and compilation dependencies.
    """
    logger.info(f"Using pure-Python DuckDuckGo HTML search fallback for: '{topic}'")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(topic)}"
    
    try:
        # DDG HTML search doesn't require Javascript.
        with httpx.Client(headers=headers, follow_redirects=True, timeout=10.0) as client:
            response = client.get(url)
            if response.status_code != 200:
                logger.warning(f"DDG HTML search returned status {response.status_code}")
                return []
                
            soup = BeautifulSoup(response.text, "html.parser")
            urls = []
            
            # Links are inside <a class="result__url" href="...">
            for a in soup.find_all("a", class_="result__url"):
                href = a.get("href")
                if not href:
                    continue
                    
                # Clean DDG redirect URL if present
                if "/l/?uddg=" in href:
                    parsed = urllib.parse.urlparse(href)
                    queries = urllib.parse.parse_qs(parsed.query)
                    if "uddg" in queries:
                        href = queries["uddg"][0]
                elif href.startswith("//"):
                    href = "https:" + href
                    
                if href.startswith("http") and "duckduckgo.com" not in href:
                    urls.append(href)
                    if len(urls) >= max_results:
                        break
                        
            logger.info(f"HTML fallback search found {len(urls)} URLs.")
            return urls
    except Exception as e:
        logger.error(f"DDG HTML search fallback failed: {e}")
        return []

def search_web_ddg(topic: str, max_results: int = 10) -> list:
    """
    Search DuckDuckGo for the given topic and return top URLs.
    Tries duckduckgo-search package first; falls back to pure HTML scraper on import/network failure.
    """
    try:
        from duckduckgo_search import DDGS
        logger.info("Attempting library search with duckduckgo-search package.")
        
        retries = 2
        for attempt in range(retries):
            try:
                time.sleep(1.0)
                with DDGS() as ddgs:
                    results = list(ddgs.text(topic, max_results=max_results))
                urls = [r["href"] for r in results if r.get("href")]
                if urls:
                    logger.info(f"duckduckgo-search retrieved {len(urls)} results on attempt {attempt + 1}.")
                    return urls
            except Exception as e:
                logger.warning(f"duckduckgo-search failed on attempt {attempt + 1}: {e}")
                if attempt == retries - 1:
                    break
        
        # If library failed, fall back to HTML scraper
        return search_ddg_html(topic, max_results)
        
    except ImportError:
        # If library is not installed, fall back to HTML scraper directly
        logger.info("duckduckgo-search package not available. Redirecting to HTML fallback search.")
        return search_ddg_html(topic, max_results)
