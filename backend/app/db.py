"""
Database dependency for RevenueOS.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database connection — resolve path relative to this file so it works
# regardless of which directory uvicorn / pytest is launched from.
_HERE = os.path.dirname(os.path.abspath(__file__))
_DB_PATH = os.path.join(_HERE, "..", "revenueos.db")  # backend/revenueos.db
_DEFAULT_URL = f"sqlite:///{os.path.normpath(_DB_PATH)}"
DATABASE_URL = os.getenv("DATABASE_URL", _DEFAULT_URL)
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    Dependency to get DB session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()