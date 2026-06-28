from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime
from config import DATABASE_URL

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class ResearchReport(Base):
    __tablename__ = "research_reports"

    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    word_count = Column(Integer, default=0)
    source_count = Column(Integer, default=0)
    
    # Report structured components stored as Text and JSON
    executive_summary = Column(Text, nullable=False)
    key_findings = Column(JSON, nullable=False)  # list of strings
    detailed_analysis = Column(Text, nullable=False)
    conclusion = Column(Text, nullable=False)
    sources = Column(JSON, nullable=False)  # list of dicts (url, title, credibility, relevance)
    related_topics = Column(JSON, nullable=False)  # list of strings

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
