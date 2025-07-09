import time
from pathlib import Path

# Give the database service a moment to initialize, if needed.
time.sleep(2)

from app import database, db_models
from app.main import (
    create_thumbnail,
    IMAGES_DIR,
    GENERATED_THUMBNAILS_DIR,
    ALLOWED_EXTENSIONS,
)
from sqlalchemy import or_

def main():
    """
    Main startup function to initialize database, run migrations,
    and backfill thumbnails before the main application starts.
    """
    print("--- Running Pre-Startup Script ---")

    # 1. Initialize DB and run schema migration
    print("[1/3] Initializing database and checking schema...")
    database.init_db()
    print("Database initialization complete.")

    # 2. Create thumbnails for all source images
    print("\n[2/3] Checking for and creating source image thumbnails...")
    # This part handles predefined dataset images, not user uploads.
    # It iterates through dataset-specific folders.
    for dataset in ['weimar', 'almere']:
        dataset_dir = IMAGES_DIR / dataset
        if dataset_dir.exists():
            thumb_dir = IMAGES_DIR.parent / 'thumbnails' / dataset
            # Process root directory
            for image_file in dataset_dir.iterdir():
                if image_file.is_file() and image_file.suffix.lower() in ALLOWED_EXTENSIONS:
                    create_thumbnail(image_file, thumb_dir)
            # Process uploads subdirectory
            uploads_dir = dataset_dir / 'uploads'
            if uploads_dir.exists():
                uploads_thumb_dir = thumb_dir / 'uploads'
                for image_file in uploads_dir.iterdir():
                    if image_file.is_file() and image_file.suffix.lower() in ALLOWED_EXTENSIONS:
                        create_thumbnail(image_file, uploads_thumb_dir)
    print("Source image thumbnail creation complete.")

    # 3. Backfill thumbnails for old generations
    print("\n[3/3] Checking for old generations that need thumbnails...")
    db = database.SessionLocal()
    try:
        # FIXED: Made the query more specific to prevent crashes from old/invalid enum values in the DB.
        # It now only fetches records that are completed (or have a threat image) but are missing a thumbnail URL.
        # This is more robust and efficient.
        generations_to_update = db.query(db_models.Generation).filter(
            or_(
                db_models.Generation.status == db_models.JobStatus.COMPLETED,
                db_models.Generation.status == db_models.JobStatus.THREAT_COMPLETED
            ),
            or_(
                db_models.Generation.generated_image_url.isnot(None) & (db_models.Generation.generated_image_thumb_url == None),
                db_models.Generation.threat_image_url.isnot(None) & (db_models.Generation.threat_image_thumb_url == None),
                db_models.Generation.original_image_filename.isnot(None) & (db_models.Generation.original_image_thumb_url == None)
            )
        ).all()

        if generations_to_update:
            print(f"Found {len(generations_to_update)} generation(s) needing thumbnails. Backfilling...")
            for gen in generations_to_update:
                print(f"  - Processing Generation ID: {gen.id} (Status: {gen.status})")
                
                # Backfill for the final solution image
                if gen.generated_image_url and not gen.generated_image_thumb_url:
                    img_path_suffix = gen.generated_image_url.replace('images/', '', 1)
                    full_image_path = IMAGES_DIR / img_path_suffix
                    
                    if full_image_path.is_file():
                        print(f"    - Found solution image at: {full_image_path}")
                        create_thumbnail(full_image_path, GENERATED_THUMBNAILS_DIR)
                        gen.generated_image_thumb_url = f"generated/{full_image_path.stem}.jpeg"
                        print(f"    - Set generated_image_thumb_url to: {gen.generated_image_thumb_url}")
                    else:
                        print(f"    - WARNING: Could not find solution image file: {full_image_path}")

                # Backfill for the intermediate threat image
                if gen.threat_image_url and not gen.threat_image_thumb_url:
                    img_path_suffix = gen.threat_image_url.replace('images/', '', 1)
                    full_image_path = IMAGES_DIR / img_path_suffix
                    
                    if full_image_path.is_file():
                        print(f"    - Found threat image at: {full_image_path}")
                        create_thumbnail(full_image_path, GENERATED_THUMBNAILS_DIR)
                        gen.threat_image_thumb_url = f"generated/{full_image_path.stem}.jpeg"
                        print(f"    - Set threat_image_thumb_url to: {gen.threat_image_thumb_url}")
                    else:
                        print(f"    - WARNING: Could not find threat image file: {full_image_path}")

                # Backfill for the original image
                if gen.original_image_filename and not gen.original_image_thumb_url:
                    original_path = Path(gen.original_image_filename)
                    thumb_path_stem = original_path.with_suffix('.jpeg').name
                    gen.original_image_thumb_url = f"{gen.dataset}/{thumb_path_stem}"
                    print(f"    - Set original_image_thumb_url to: {gen.original_image_thumb_url}")

            db.commit()
            print("Thumbnail backfill process completed successfully.")
        else:
            print("No old generations needed thumbnail backfilling.")

    except Exception as e:
        print(f"An error occurred during the thumbnail backfill process: {e}")
        db.rollback()
    finally:
        db.close()
    
    print("\n--- Pre-Startup Script Finished ---")

if __name__ == "__main__":
    main()
