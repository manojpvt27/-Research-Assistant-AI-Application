import json
import logging
import asyncio
import os
from contextlib import asynccontextmanager
from typing import List, Optional

import httpx
from fastapi import FastAPI, Depends, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session

from config import DATABASE_URL, EXPORTS_DIR
from database import init_db, get_db, ResearchReport
from schemas import ResearchRequest, ResearchReportResponse, SourceInfo, RelatedMemoryResponse
from search import search_web_ddg
from scraper import scrape_url
from ai_engine import generate_research_report
from memory import store_research_memory, get_related_research, get_related_research_sqlite
from pdf_export import generate_report_pdf

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite tables
    logger.info("Initializing database...")
    init_db()
    yield
    logger.info("Server shutting down...")

app = FastAPI(
    title="AI-Powered Personal Research Assistant API",
    description="Backend API facilitating real-time web search, async scraping, Claude synthesis, and memory store.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Rules
# Frontend runs on port 5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def run_research_pipeline(topic: str, db: Session):
    """
    Generator that executes the research pipeline and yields SSE chunks to stream progress.
    """
    try:
        # Step 1: Searching web
        logger.info(f"Pipeline started for topic: '{topic}'")
        yield f"data: {json.dumps({'event': 'step', 'step': 1, 'message': 'Searching the web for sources...'})}\n\n"
        
        urls = search_web_ddg(topic, max_results=8)
        if not urls:
            logger.warning(f"No search results returned for: '{topic}'")
            yield f"data: {json.dumps({'event': 'step', 'step': 1, 'message': 'No web search results. Querying internal memory only.'})}\n\n"
            
        # Step 2: Scraping sources concurrently, streaming each completed result
        yield f"data: {json.dumps({'event': 'step', 'step': 2, 'message': f'Found {len(urls)} sources. Scraping content concurrently...'})}\n\n"
        
        scraped_sources = []
        if urls:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
                tasks = [scrape_url(client, url) for url in urls]
                # as_completed allows streaming each page as soon as it returns
                for future in asyncio.as_completed(tasks):
                    try:
                        source = await future
                        if source and source["text"].strip():
                            scraped_sources.append(source)
                            word_count = len(source["text"].split())
                            logger.info(f"Scraped source: {source['url']} ({word_count} words)")
                            yield f"data: {json.dumps({'event': 'source_scraped', 'url': source['url'], 'title': source['title'], 'word_count': word_count})}\n\n"
                    except Exception as exc:
                        logger.error(f"Error yielding concurrent scrape task: {exc}")
                        
        if not scraped_sources:
            logger.warning("No scrapeable content found among the search links.")
            
        # Step 3: Claude synthesis & retrieving vector memory context
        yield f"data: {json.dumps({'event': 'step', 'step': 3, 'message': 'Scraping complete. Retrieving memory context & synthesizing report...'})}\n\n"
        
        # Load related topics from history memory
        memory_items = get_related_research(topic, limit=3)
        memory_context = ""
        if memory_items:
            memory_context_parts = []
            for item in memory_items:
                memory_context_parts.append(
                    f"Past Topic: {item['metadata'].get('topic')}\n"
                    f"Past Summary: {item['document']}\n"
                )
            memory_context = "\n---\n".join(memory_context_parts)
            logger.info("Found related past research context, injecting into Claude prompt.")
        else:
            logger.info("No related past research found in memory.")

        # Synthesize report with Anthropic Claude API
        try:
            report_data = await generate_research_report(topic, scraped_sources, memory_context)
        except Exception as ai_err:
            logger.error(f"Claude API Synthesis failed: {ai_err}")
            yield f"data: {json.dumps({'event': 'error', 'message': f'Claude API synthesis error: {str(ai_err)}'})}\n\n"
            return
            
        # Step 4: Done! Store in SQLite Database & ChromaDB memory
        yield f"data: {json.dumps({'event': 'step', 'step': 4, 'message': 'Synthesis complete. Saving report to databases...'})}\n\n"
        
        # Save to SQLite db
        db_report = ResearchReport(
            topic=topic,
            executive_summary=report_data["executive_summary"],
            key_findings=report_data["key_findings"],
            detailed_analysis=report_data["detailed_analysis"],
            conclusion=report_data["conclusion"],
            sources=report_data["sources"],
            related_topics=report_data["related_topics"],
            word_count=report_data["word_count"],
            source_count=len(report_data["sources"])
        )
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        logger.info(f"Saved research report to database with ID: {db_report.id}")
        
        # Store in vector database memory
        store_research_memory(
            report_id=db_report.id,
            topic=topic,
            summary=db_report.executive_summary
        )
        
        # Format final completion payload matching schema
        completed_report = {
            "id": db_report.id,
            "topic": db_report.topic,
            "created_at": db_report.created_at.isoformat(),
            "word_count": db_report.word_count,
            "source_count": db_report.source_count,
            "executive_summary": db_report.executive_summary,
            "key_findings": db_report.key_findings,
            "detailed_analysis": db_report.detailed_analysis,
            "conclusion": db_report.conclusion,
            "sources": db_report.sources,
            "related_topics": db_report.related_topics
        }
        
        yield f"data: {json.dumps({'event': 'complete', 'report': completed_report})}\n\n"
        
    except Exception as e:
        logger.error(f"Critical error in research pipeline generator: {e}")
        yield f"data: {json.dumps({'event': 'error', 'message': f'Server Error: {str(e)}'})}\n\n"


# 1. Run Pipeline Endpoint
@app.post("/api/research")
async def create_research(req: ResearchRequest, db: Session = Depends(get_db)):
    """
    Kicks off research pipeline. Yields streaming logs (Searching -> Scraping -> Claude -> Done)
    supporting real-time progress updating on frontend.
    """
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="Research topic cannot be empty.")
    
    return StreamingResponse(
        run_research_pipeline(req.topic.strip(), db),
        media_type="text/event-stream"
    )


# 2. Paginated History Endpoint
@app.get("/api/history", response_model=List[ResearchReportResponse])
def get_research_history(
    page: int = Query(1, ge=1), 
    limit: int = Query(10, ge=1), 
    db: Session = Depends(get_db)
):
    """
    Retrieve past research reports sorted by created date descending.
    """
    offset = (page - 1) * limit
    reports = db.query(ResearchReport).order_index = ResearchReport.created_at.desc()
    # Apply ordering by date descending
    reports = db.query(ResearchReport).order_by(ResearchReport.created_at.desc()).offset(offset).limit(limit).all()
    return reports


# 3. Get Report by ID
@app.get("/api/report/{report_id}", response_model=ResearchReportResponse)
def get_report(report_id: int, db: Session = Depends(get_db)):
    """
    Fetch a single research report.
    """
    report = db.query(ResearchReport).filter(ResearchReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Research report not found.")
    return report


# 4. Delete Report
@app.delete("/api/report/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    """
    Delete a report.
    """
    report = db.query(ResearchReport).filter(ResearchReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Research report not found.")
    
    db.delete(report)
    db.commit()
    logger.info(f"Successfully deleted report {report_id} from SQLite.")
    return {"message": f"Successfully deleted report {report_id}."}


from pydantic import BaseModel

# 5. Export PDF
class ExportRequest(BaseModel):
    report_id: int


@app.post("/api/export/pdf")
def export_pdf(req: ExportRequest, db: Session = Depends(get_db)):
    """
    Generate and stream report PDF.
    """
    report = db.query(ResearchReport).filter(ResearchReport.id == req.report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
        
    try:
        # Convert DB object to dictionary
        report_data = {
            "id": report.id,
            "topic": report.topic,
            "created_at": report.created_at,
            "word_count": report.word_count,
            "executive_summary": report.executive_summary,
            "key_findings": report.key_findings,
            "detailed_analysis": report.detailed_analysis,
            "conclusion": report.conclusion,
            "sources": report.sources,
            "related_topics": report.related_topics
        }
        pdf_path = generate_report_pdf(report_data)
        
        # Stream file response
        return FileResponse(
            path=pdf_path,
            filename=f"Research_Report_{report.id}.pdf",
            media_type="application/pdf"
        )
    except Exception as e:
        logger.error(f"Error generating PDF file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


# 6. Export Markdown
@app.post("/api/export/markdown")
def export_markdown(req: ExportRequest, db: Session = Depends(get_db)):
    """
    Compile and download report in Markdown (.md) format.
    """
    report = db.query(ResearchReport).filter(ResearchReport.id == req.report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
        
    try:
        findings_bullets = "\n".join([f"- {f}" for f in report.key_findings])
        
        sources_md = []
        for idx, src in enumerate(report.sources):
            sources_md.append(
                f"{idx + 1}. **{src.get('title', 'Source')}**\n"
                f"   - URL: {src.get('url')}\n"
                f"   - Credibility Rating: {src.get('credibility', 'N/A')}/10\n"
                f"   - Relevance Rating: {src.get('relevance', 'N/A')}/10"
            )
        sources_list_md = "\n\n".join(sources_md)
        
        md_content = f"""# Research Report: {report.topic}

**Generated on:** {report.created_at.strftime('%B %d, %Y at %I:%M %p')}
**Word Count:** {report.word_count} words
**Sources Screened:** {report.source_count} sites

---

## Executive Summary
{report.executive_summary}

---

## Key Findings
{findings_bullets}

---

## Detailed Analysis
{report.detailed_analysis}

---

## Conclusion
{report.conclusion}

---

## Sources & Credibility Ratings
{sources_list_md}
"""
        # Return as downloadable attachment response
        return Response(
            content=md_content,
            media_type="text/markdown",
            headers={
                "Content-Disposition": f"attachment; filename=Research_Report_{report.id}.md"
            }
        )
    except Exception as e:
        logger.error(f"Error exporting markdown: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to export markdown: {str(e)}")


# 7. Get Memory Related Search
@app.get("/api/memory/related", response_model=List[RelatedMemoryResponse])
def get_related_memories(topic: str = Query(...), limit: int = Query(3, ge=1)):
    """
    Look up related topics and executive summaries from vector database.
    """
    related = get_related_research(topic, limit=limit)
    formatted = []
    for item in related:
        # Parse the structured document
        # Chroma format: Topic: {topic}\nSummary: {summary}
        doc_text = item["document"]
        parsed_topic = item["metadata"].get("topic", "Related Past Topic")
        
        # Extract summary from document string
        parsed_summary = doc_text
        if "Summary:" in doc_text:
            parts = doc_text.split("Summary:", 1)
            parsed_summary = parts[1].strip()
            
        formatted.append({
            "id": str(item["id"]),
            "topic": parsed_topic,
            "summary": parsed_summary
        })
    return formatted


# 8. Keyword search past history
@app.get("/api/search/topics", response_model=List[ResearchReportResponse])
def search_history_topics(keyword: str = Query(...), db: Session = Depends(get_db)):
    """
    Search database history for keywords matches in topic title or executive summary.
    """
    if not keyword.strip():
        return []
    
    # Query database using LIKE match
    search_pattern = f"%{keyword}%"
    results = db.query(ResearchReport).filter(
        (ResearchReport.topic.like(search_pattern)) | 
        (ResearchReport.executive_summary.like(search_pattern))
    ).order_by(ResearchReport.created_at.desc()).all()
    
    return results


# 9. Health Check
@app.get("/api/health")
def health_check():
    """
    Basic health check.
    """
    return {
        "status": "healthy",
        "api_version": "1.0.0",
        "storage": "SQLite + ChromaDB fallback"
    }
