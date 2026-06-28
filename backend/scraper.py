import asyncio
import httpx
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)

async def scrape_url(client: httpx.AsyncClient, url: str) -> dict:
    """
    Scrapes a single URL and extracts clean headings and paragraphs.
    Silently fails on errors or non-200 statuses and returns an empty text dict.
    """
    try:
        logger.info(f"Scraping URL: {url}")
        response = await client.get(url, timeout=10.0, follow_redirects=True)
        
        if response.status_code != 200:
            logger.warning(f"Failed to fetch {url}: Status {response.status_code}")
            return {"url": url, "title": "", "text": ""}
        
        html = response.text
        soup = BeautifulSoup(html, "html.parser")
        
        # Get Title
        title = ""
        if soup.title and soup.title.string:
            title = soup.title.string.strip()
        if not title:
            h1 = soup.find("h1")
            if h1:
                title = h1.get_text().strip()
        if not title:
            title = url
            
        # Clean Boilerplate
        for element in soup(["script", "style", "nav", "footer", "aside", "header", "form", "iframe"]):
            element.decompose()
            
        # Remove elements with banner/popup/nav/cookie attributes
        ignore_keywords = ["cookie", "banner", "nav", "footer", "menu", "sidebar", "ad-", "adsense", "social", "share", "popup"]
        
        def is_boilerplate(tag):
            for attribute in ["class", "id"]:
                if attribute in tag.attrs:
                    vals = tag.attrs[attribute]
                    val_str = " ".join(vals) if isinstance(vals, list) else str(vals)
                    if any(keyword in val_str.lower() for keyword in ignore_keywords):
                        return True
            return False

        for tag in soup.find_all(is_boilerplate):
            tag.decompose()

        # Extract headings and paragraph content
        tags = soup.find_all(["h1", "h2", "h3", "p"])
        text_nodes = []
        for tag in tags:
            clean_text = tag.get_text(separator=" ", strip=True)
            if clean_text:
                text_nodes.append(clean_text)
                
        full_text = "\n\n".join(text_nodes)
        
        # Limit extracted text to 1200 words to reduce Claude token load
        words = full_text.split()
        if len(words) > 1200:
            full_text = " ".join(words[:1200])
            
        return {
            "url": url,
            "title": title,
            "text": full_text
        }
    except Exception as e:
        logger.warning(f"Silent ignore scraper error for {url}: {e}")
        return {"url": url, "title": "", "text": ""}

async def scrape_urls_concurrently(urls: list) -> list:
    """
    Scrape a list of URLs concurrently using asyncio.gather.
    """
    if not urls:
        return []
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
        tasks = [scrape_url(client, url) for url in urls]
        results = await asyncio.gather(*tasks)
        
    # Return only scraped sources that produced text content
    scraped_sources = [r for r in results if r["text"].strip()]
    logger.info(f"Concurrently scraped {len(urls)} sites, resulting in {len(scraped_sources)} populated pages.")
    return scraped_sources
