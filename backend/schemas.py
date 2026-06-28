from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class ResearchRequest(BaseModel):
    topic: str

class SourceInfo(BaseModel):
    url: str
    title: str
    credibility: int
    relevance: int

class ResearchReportBase(BaseModel):
    topic: str
    executive_summary: str
    key_findings: List[str]
    detailed_analysis: str
    conclusion: str
    sources: List[SourceInfo]
    related_topics: List[str]
    word_count: int

class ResearchReportResponse(ResearchReportBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class RelatedMemoryResponse(BaseModel):
    id: str
    topic: str
    summary: str
    score: Optional[float] = None
