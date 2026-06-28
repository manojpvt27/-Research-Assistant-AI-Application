import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from the .env file in the research-assistant root directory
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./research.db")
CHROMA_DB_DIR = os.getenv("CHROMA_DB_DIR", "./chroma_db")
EXPORTS_DIR = os.getenv("EXPORTS_DIR", "./exports")

# Ensure critical directories exist
os.makedirs(os.path.dirname(DATABASE_URL.replace("sqlite:///", "")), exist_ok=True)
os.makedirs(CHROMA_DB_DIR, exist_ok=True)
os.makedirs(EXPORTS_DIR, exist_ok=True)
