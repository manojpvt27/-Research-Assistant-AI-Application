import os
import logging
from config import CHROMA_DB_DIR

logger = logging.getLogger(__name__)

# Global flags and references for Vector Memory
use_vector_db = False
chroma_client = None
collection = None

try:
    import chromadb
    from chromadb.utils import embedding_functions
    
    # Initialize Chroma client
    chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
    
    # We will initialize SentenceTransformerEmbeddingFunction.
    # Note: SentenceTransformerEmbeddingFunction downloads sentence-transformers.
    # We use all-MiniLM-L6-v2 as requested.
    embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )
    
    # Always use get_or_create_collection to avoid restart errors
    collection = chroma_client.get_or_create_collection(
        name="research_memory",
        embedding_function=embedding_fn
    )
    use_vector_db = True
    logger.info("ChromaDB Vector DB Memory successfully initialized.")
    
except Exception as e:
    logger.warning(
        f"ChromaDB/SentenceTransformers initialization skipped or failed: {e}. "
        "Engaging robust SQLite database-backed keyword matching memory fallback."
    )
    use_vector_db = False


def store_research_memory(report_id: int, topic: str, summary: str):
    """
    Store a new research report's topic and summary in memory.
    Saves in ChromaDB if enabled; SQLite fallback saves automatically during standard DB insert.
    """
    if use_vector_db and collection:
        try:
            logger.info(f"Storing research memory in ChromaDB for report ID {report_id}")
            collection.add(
                ids=[str(report_id)],
                documents=[f"Topic: {topic}\nSummary: {summary}"],
                metadatas=[{"topic": topic, "report_id": report_id}]
            )
        except Exception as e:
            logger.error(f"Error saving to ChromaDB memory: {e}")
    else:
        logger.info(f"Using SQLite database record storage for memory (report ID {report_id})")


def get_related_research(topic: str, limit: int = 3) -> list:
    """
    Retrieve up to `limit` related past research documents.
    Uses ChromaDB similarity search, or SQLite token matching fallback.
    """
    if use_vector_db and collection:
        try:
            logger.info(f"Querying ChromaDB memory for topic: '{topic}'")
            results = collection.query(
                query_texts=[topic],
                n_results=limit
            )
            
            related = []
            if results and 'documents' in results and results['documents']:
                docs = results['documents'][0]
                metas = results['metadatas'][0] if 'metadatas' in results else []
                ids = results['ids'][0] if 'ids' in results else []
                
                for doc, meta, r_id in zip(docs, metas, ids):
                    related.append({
                        "id": r_id,
                        "document": doc,
                        "metadata": meta
                    })
            return related
        except Exception as e:
            logger.error(f"Error querying ChromaDB: {e}. Falling back to SQLite query.")
            # If ChromaDB fails during run, fall back
            return get_related_research_sqlite(topic, limit)
    else:
        return get_related_research_sqlite(topic, limit)


def get_related_research_sqlite(topic: str, limit: int = 3) -> list:
    """
    Fallback keyword overlap matching using the SQLAlchemy SQLite database.
    Calculates intersection score between search terms and past report topics.
    """
    logger.info(f"Querying SQLite database for related reports to: '{topic}'")
    try:
        from database import SessionLocal, ResearchReport
        db = SessionLocal()
        reports = db.query(ResearchReport).all()
        if not reports:
            return []
            
        query_words = set(topic.lower().split())
        scored_reports = []
        
        for r in reports:
            # Word overlap calculation
            topic_words = set(r.topic.lower().split())
            intersection = query_words.intersection(topic_words)
            score = len(intersection)
            
            # Boost score if the query topic is a substring of the report topic
            if topic.lower() in r.topic.lower():
                score += 2.0
                
            scored_reports.append((score, r))
            
        # Sort by match score descending
        scored_reports.sort(key=lambda x: x[0], reverse=True)
        
        results = []
        for score, r in scored_reports[:limit]:
            # Include records that have some minimal overlap or if database is small
            results.append({
                "id": str(r.id),
                "document": f"Topic: {r.topic}\nSummary: {r.executive_summary}",
                "metadata": {"topic": r.topic, "report_id": r.id}
            })
            
        logger.info(f"Found {len(results)} related reports using SQLite keyword matching.")
        return results
        
    except Exception as ex:
        logger.error(f"SQLite similarity fallback lookup failed: {ex}")
        return []
