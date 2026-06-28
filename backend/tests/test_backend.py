import os
import sys

# Add backend directory to system path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import init_db, SessionLocal, ResearchReport
from schemas import ResearchRequest, SourceInfo
from pdf_export import generate_report_pdf

def test_sqlite_db():
    print("Testing SQLite DB initialization & operations...")
    init_db()
    db = SessionLocal()
    try:
        # Create mock record
        report = ResearchReport(
            topic="Quantum Computing",
            executive_summary="Executive summary test text.",
            key_findings=["Finding 1", "Finding 2"],
            detailed_analysis="Analysis test text.",
            conclusion="Conclusion test text.",
            sources=[{"url": "http://test.com", "title": "Test Source", "credibility": 8, "relevance": 9}],
            related_topics=["Physics"],
            word_count=50,
            source_count=1
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        print(f"Successfully saved test report with ID {report.id}.")
        
        # Query it
        queried = db.query(ResearchReport).filter(ResearchReport.id == report.id).first()
        assert queried.topic == "Quantum Computing"
        
        # Clean up
        db.delete(report)
        db.commit()
        print("Database test passed.")
    except Exception as e:
        print(f"Database test failed: {e}")
        sys.exit(1)
    finally:
        db.close()

def test_pdf_generation():
    print("Testing ReportLab PDF Generation...")
    report_data = {
        "id": 999,
        "topic": "Quantum Teleportation & Cryptography",
        "created_at": "June 23, 2026",
        "word_count": 450,
        "executive_summary": "This is a mock executive summary for testing PDF generation. It contains clean ASCII characters.",
        "key_findings": [
            "Entanglement distribution is key to quantum secure links.",
            "Satellite QKD enables global scale key agreements."
        ],
        "detailed_analysis": "Detailed description about EPR pairs, Bell states, and Alice/Bob key validations.",
        "conclusion": "Quantum cryptography will redefine digital privacy standards.",
        "sources": [
            {"url": "https://nature.com/articles/qrypt", "title": "Nature Quantum Cryptography Study", "credibility": 10, "relevance": 10},
            {"url": "https://arxiv.org/abs/2401", "title": "arXiv QKD Review Paper", "credibility": 9, "relevance": 8}
        ],
        "related_topics": ["Quantum Computing", "Post-Quantum Cryptography"]
    }
    try:
        pdf_path = generate_report_pdf(report_data)
        assert os.path.exists(pdf_path)
        print(f"Successfully generated PDF at {pdf_path}.")
        os.remove(pdf_path)
        print("PDF test passed.")
    except Exception as e:
        print(f"PDF generation test failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_sqlite_db()
    test_pdf_generation()
    print("All backend tests completed successfully!")
