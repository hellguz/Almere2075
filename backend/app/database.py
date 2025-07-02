import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# MODIFIED: The DATABASE_URL now points to a file inside the '/app/database' directory,
# which is mounted as a persistent volume in Docker. This ensures the database
# survives container restarts. The default is set here, but can be overridden in .env.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///database/almere_app.db")

# The connect_args is specific to SQLite and needed for FastAPI's multithreading
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def init_db():
    # import all modules here that might define models so that
    # they will be registered properly on the metadata. Otherwise
    # you will have to import them first before calling init_db()
    from . import db_models
    
    # MODIFIED: This logic now correctly handles the database path.
    # It gets the path part of the sqlite URL, e.g., 'database/almere_app.db'
    db_path = DATABASE_URL.split("///")[-1]
    db_dir = os.path.dirname(db_path)
    
    # Ensure the directory for the database exists within the container.
    # In Docker, the volume mount should handle this, but this is a robust fallback.
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir)
        print(f"Created database directory: {db_dir}")

    Base.metadata.create_all(bind=engine)
    print("Database initialized.")