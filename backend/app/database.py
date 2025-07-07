import os
from sqlalchemy import create_engine, inspect, text
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
    """
    Initializes the database.
    - Creates the database directory if it doesn't exist.
    - Creates all tables based on the models if they don't exist.
    - MODIFIED: Performs a simple, non-destructive migration to add any missing
      columns to existing tables, ensuring the schema matches the models.
    """
    # import all modules here that might define models so that
    # they will be registered properly on the metadata. Otherwise
    # you will have to import them first before calling init_db()
    from . import db_models
    
    # This logic now correctly handles the database path.
    # It gets the path part of the sqlite URL, e.g., 'database/almere_app.db'
    db_path = DATABASE_URL.split("///")[-1]
    db_dir = os.path.dirname(db_path)
    
    # Ensure the directory for the database exists within the container.
    # In Docker, the volume mount should handle this, but this is a robust fallback.
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir)
        print(f"Created database directory: {db_dir}")

    # This creates tables if they don't exist but won't alter existing ones.
    Base.metadata.create_all(bind=engine)
    print("Database tables checked/created.")

    # --- Automatic Column Addition (Simple Migration) ---
    try:
        inspector = inspect(engine)
        
        # Get all column names from the actual 'generations' table in the DB
        table_columns = inspector.get_columns('generations')
        existing_column_names = {c['name'] for c in table_columns}
        
        # Get all column names from the 'Generation' model definition in the code
        model_columns = [c.name for c in db_models.Generation.__table__.columns]

        # Use a database connection to run ALTER TABLE for any missing columns
        with engine.connect() as connection:
            for column_name in model_columns:
                if column_name not in existing_column_names:
                    print(f"Schema mismatch: Adding missing column '{column_name}' to 'generations' table.")
                    # For SQLite, VARCHAR is a safe generic type for the new string columns.
                    alter_command = f'ALTER TABLE generations ADD COLUMN {column_name} VARCHAR'
                    connection.execute(text(alter_command))
                    print(f"Successfully added column: {column_name}")
            # Commit the transaction to save the changes
            connection.commit()
            
        print("Automatic schema check complete.")

    except Exception as e:
        # This can fail if the 'generations' table doesn't exist at all yet.
        # This is expected on the very first run, as `create_all` has just created it
        # with all the correct columns, so no migration is needed.
        print(f"Could not perform migration check (this is normal on first run): {e}")

    print("Database initialized.")