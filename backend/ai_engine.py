import json
import logging
import asyncio
from functools import partial
from anthropic import Anthropic
from config import ANTHROPIC_API_KEY

logger = logging.getLogger(__name__)

# Maximum total words across ALL sources to send to Claude.
# Keeps input tokens manageable for fast responses (~8k tokens input).
MAX_TOTAL_INPUT_WORDS = 6000
# Per-source cap (further trimmed if total exceeds MAX_TOTAL_INPUT_WORDS)
MAX_WORDS_PER_SOURCE = 1200


def _truncate_sources(scraped_sources: list) -> list:
    """
    Trim each source text and cap total combined words so that Claude
    gets a focused, manageable input instead of 16k+ words.
    """
    trimmed = []
    total_words = 0

    for source in scraped_sources:
        text = source.get("text", "")
        words = text.split()

        # Per-source cap
        if len(words) > MAX_WORDS_PER_SOURCE:
            words = words[:MAX_WORDS_PER_SOURCE]

        # Global budget check
        if total_words + len(words) > MAX_TOTAL_INPUT_WORDS:
            remaining = MAX_TOTAL_INPUT_WORDS - total_words
            if remaining <= 50:
                break  # No meaningful space left
            words = words[:remaining]

        total_words += len(words)
        trimmed.append({
            "url": source["url"],
            "title": source["title"],
            "text": " ".join(words)
        })

    logger.info(f"Trimmed {len(scraped_sources)} sources to {len(trimmed)} sources, {total_words} total words for Claude input.")
    return trimmed


def _build_prompt(topic: str, scraped_sources: list, memory_context: str) -> tuple[str, str]:
    """
    Build the system and user prompts.
    """
    # Format scraped source content
    source_texts = []
    for idx, source in enumerate(scraped_sources):
        source_texts.append(
            f"Source #{idx + 1}\n"
            f"URL: {source['url']}\n"
            f"Title: {source['title']}\n"
            f"Content:\n{source['text']}\n"
            f"---"
        )
    all_scraped_text = "\n\n".join(source_texts)

    system_prompt = (
        "You are an expert research analyst. You receive raw scraped web content from multiple sources. "
        "Your job is to ignore ads/navigation/boilerplate, extract only useful factual information, "
        "synthesize everything into a structured report, be objective, note conflicting info, "
        "and rate each source on credibility (1-10) and relevance (1-10). "
        "Always respond in valid JSON only. Do not include any explanations or markdown formatting around the JSON. "
        "Be concise but thorough. Keep the total response under 2000 words."
    )

    user_prompt = f"""Research Topic: {topic}

Scraped Source Content:
{all_scraped_text if all_scraped_text else "No content scraped from search results."}

Related Past Research (from memory):
{memory_context if memory_context else "No related past research found."}

Generate a JSON report with this exact structure:
{{
  "executive_summary": "2-3 paragraph overview",
  "key_findings": ["finding1", "finding2", "finding3", "finding4", "finding5"],
  "detailed_analysis": "3-5 paragraphs deep dive",
  "conclusion": "1-2 paragraph conclusion",
  "sources": [{{"url": "...", "credibility": 8, "relevance": 9, "title": "..."}}],
  "related_topics": ["topic1", "topic2", "topic3"],
  "word_count": 800
}}"""

    return system_prompt, user_prompt


def _call_claude_sync(system_prompt: str, user_prompt: str, topic: str) -> dict:
    """
    Synchronous Claude API call. This runs inside asyncio.to_thread()
    so it doesn't block the event loop.
    """
    logger.info(f"Calling Claude API for topic: '{topic}'")

    client = Anthropic(
        api_key=ANTHROPIC_API_KEY,
        timeout=120.0,  # Hard 120-second timeout
    )

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=3000,
        temperature=0.2,
        system=system_prompt,
        messages=[
            {"role": "user", "content": user_prompt}
        ]
    )

    response_text = response.content[0].text.strip()
    logger.info(f"Received Claude response: {len(response_text)} chars")

    # Clean response: strip markdown fences (```json or ```) if present
    if response_text.startswith("```"):
        lines = response_text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        response_text = "\n".join(lines).strip()

    # Parse JSON
    report_data = json.loads(response_text)

    # Validate critical keys exist
    required_keys = ["executive_summary", "key_findings", "detailed_analysis",
                     "conclusion", "sources", "related_topics", "word_count"]
    for key in required_keys:
        if key not in report_data:
            if key in ("key_findings", "related_topics", "sources"):
                report_data[key] = []
            elif key == "word_count":
                report_data[key] = len(response_text.split())
            else:
                report_data[key] = ""

    return report_data


async def generate_research_report(topic: str, scraped_sources: list, memory_context: str) -> dict:
    """
    Async wrapper: trims inputs, builds prompt, runs Claude call in a
    background thread so the event loop stays responsive for SSE flushing.
    """
    if not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY == "your_key_here":
        error_msg = "Anthropic API Key is not configured. Please set ANTHROPIC_API_KEY in the .env file."
        logger.error(error_msg)
        raise ValueError(error_msg)

    # 1. Trim sources to stay within token budget
    trimmed_sources = _truncate_sources(scraped_sources)

    # 2. Build prompts
    system_prompt, user_prompt = _build_prompt(topic, trimmed_sources, memory_context)

    # 3. Run the blocking Anthropic SDK call in a thread so we don't
    #    freeze the SSE generator / event loop.
    try:
        report_data = await asyncio.to_thread(
            _call_claude_sync, system_prompt, user_prompt, topic
        )
    except json.JSONDecodeError as je:
        logger.error(f"JSON Decode Error parsing Claude's response: {je}")
        raise ValueError("Failed to parse AI response as valid JSON.")
    except Exception as e:
        logger.error(f"Error calling Anthropic API: {e}")
        raise e

    # 4. Match source titles from scraped data
    for src in report_data.get("sources", []):
        if "title" not in src or not src["title"]:
            matching = next((item for item in scraped_sources if item["url"] == src.get("url")), None)
            src["title"] = matching["title"] if matching else src.get("url", "External Source")

    return report_data
