import time
from pathlib import Path

# Give the database service a moment to initialize, if needed.
time.sleep(2)

from app import database, db_models
from app.main import (
    create_thumbnail,
    IMAGES_DIR,
    WEIMAR_IMAGES_DIR,
    ALMERE_IMAGES_DIR,
    GENERATED_THUMBNAILS_DIR,
    WEIMAR_THUMBNAILS_DIR,
    ALMERE_THUMBNAILS_DIR,
    ALLOWED_EXTENSIONS,
)

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
    for dataset in ['weimar', 'almere']:
        dataset_dir = IMAGES_DIR / dataset
        if dataset_dir.exists():
            thumb_dir = WEIMAR_THUMBNAILS_DIR if dataset == 'weimar' else ALMERE_THUMBNAILS_DIR
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
        # MODIFIED: Removed the status filter to ensure all generations without
        # a thumbnail URL are processed, regardless of their status. This is more robust.
        generations_to_update = db.query(db_models.Generation).all()

        if generations_to_update:
            print(f"Found {len(generations_to_update)} generation(s) needing thumbnails. Backfilling...")
            for gen in generations_to_update:
                print(f"  - Processing Generation ID: {gen.id}")
                
                if gen.generated_image_url:
                    img_path_suffix = gen.generated_image_url.replace('images/', '', 1)
                    full_image_path = IMAGES_DIR / img_path_suffix
                    
                    if full_image_path.is_file():
                        print(f"    - Found generated image at: {full_image_path}")
                        create_thumbnail(full_image_path, GENERATED_THUMBNAILS_DIR)
                        gen.generated_image_thumb_url = f"generated/{full_image_path.stem}.jpeg"
                        print(f"    - Set generated_image_thumb_url to: {gen.generated_image_thumb_url}")
                    else:
                        print(f"    - WARNING: Could not find generated image file: {full_image_path}")

                if gen.original_image_filename:
                    original_path = Path(gen.original_image_filename)
                    thumb_path_stem = original_path.with_suffix('.jpeg')
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