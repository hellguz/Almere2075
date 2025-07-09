import time
from pathlib import Path
from PIL import Image, ImageOps
import os
import pillow_heif

# Register the HEIF opener with Pillow to handle .heic/.heif files
pillow_heif.register_heif_opener()

# Give the database service a moment to initialize, if needed.
time.sleep(2)

from app import database, db_models
from app.main import (
    create_thumbnail,
    IMAGES_DIR,
    GENERATED_THUMBNAILS_DIR,
    WEIMAR_IMAGES_DIR,
    ALMERE_IMAGES_DIR,
)
from sqlalchemy import or_

MAX_DIMENSION = 2000
# Allowed extensions for the initial compression/conversion pass
ALLOWED_STARTUP_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'}


def compress_and_resize_image(image_path: Path):
    """
    Checks if an image needs processing (resize or format conversion) and
    converts it to a standard, high-quality JPEG.

    - Resizes images larger than MAX_DIMENSION.
    - Converts non-JPEG formats (PNG, WEBP, HEIC) to JPEG.
    - Fixes image orientation based on EXIF data.
    - Overwrites existing JPEGs, but removes the original for other formats.
    
    Args:
        image_path (Path): The path to the image file to process.
    """
    try:
        with Image.open(image_path) as img:
            original_size = img.size
            original_suffix = image_path.suffix.lower()
            is_original_jpeg = original_suffix in ['.jpg', '.jpeg']
            needs_resize = img.width > MAX_DIMENSION or img.height > MAX_DIMENSION

            # If it's already a JPEG and doesn't need resizing, we can skip it.
            if is_original_jpeg and not needs_resize:
                return

            print(f"Processing image: {image_path} (Size: {original_size}, Format: {original_suffix})")

            # ADDED: Apply EXIF transpose to fix orientation issues from camera metadata.
            img = ImageOps.exif_transpose(img)

            # Resize if necessary, maintaining aspect ratio.
            if needs_resize:
                img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)
                print(f" -> Resized to: {img.size}")

            # Ensure image is in RGB mode before saving as JPEG (removes transparency).
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
                print(" -> Converted to RGB")

            # Standardize the output path to use a lowercase .jpg extension.
            new_path = image_path.with_suffix('.jpg')

            # Save the processed image with the specified quality.
            img.save(new_path, "JPEG", quality=70, optimize=True)
            print(f" -> Saved as JPEG (quality 70) to: {new_path}")

            # REVISED LOGIC: Only remove the original file if the format was converted
            # (e.g., from .png to .jpg). If it was already a JPEG, it has been overwritten,
            # so no removal is necessary. This prevents the hot-reloader from tripping.
            if not is_original_jpeg:
                os.remove(image_path)
                print(f" -> Removed original non-JPEG file: {image_path}")

    except Exception as e:
        print(f"--- ERROR: Could not process image {image_path}: {e} ---")

def process_source_images():
    """
    Iterates through all source image directories and applies compression and resizing.
    """
    print("\n[+] Compressing and resizing source images if they are over 2000x2000...")
    image_dirs = [WEIMAR_IMAGES_DIR, ALMERE_IMAGES_DIR]
    
    for directory in image_dirs:
        if directory.exists():
            # Process root of dataset directory
            # Using list() to create a copy, as we may be deleting files during iteration.
            for image_file in list(directory.iterdir()):
                if image_file.is_file() and image_file.suffix.lower() in ALLOWED_STARTUP_EXTENSIONS:
                    compress_and_resize_image(image_file)
            
            # Process 'uploads' subdirectory
            uploads_dir = directory / 'uploads'
            if uploads_dir.exists():
                for image_file in list(uploads_dir.iterdir()):
                    if image_file.is_file() and image_file.suffix.lower() in ALLOWED_STARTUP_EXTENSIONS:
                        compress_and_resize_image(image_file)

    print("Source image compression check complete.")


def main():
    """
    Main startup function to initialize database, run migrations,
    and backfill thumbnails before the main application starts.
    """
    print("--- Running Pre-Startup Script ---")

    # 1. Initialize DB and run schema migration
    print("[1/4] Initializing database and checking schema...")
    database.init_db()
    print("Database initialization complete.")

    # 2. Compress and resize large source images
    print("\n[2/4] Checking for and compressing large source images...")
    process_source_images()

    # 3. Create thumbnails for all source images
    print("\n[3/4] Checking for and creating source image thumbnails...")
    from app.main import ALLOWED_EXTENSIONS as THUMBNAIL_EXTENSIONS
    for dataset in ['weimar', 'almere']:
        dataset_dir = IMAGES_DIR / dataset
        if dataset_dir.exists():
            thumb_dir = IMAGES_DIR.parent / 'thumbnails' / dataset
            # Process root directory
            for image_file in dataset_dir.iterdir():
                if image_file.is_file() and image_file.suffix.lower() in THUMBNAIL_EXTENSIONS:
                    create_thumbnail(image_file, thumb_dir)
            # Process uploads subdirectory
            uploads_dir = dataset_dir / 'uploads'
            if uploads_dir.exists():
                uploads_thumb_dir = thumb_dir / 'uploads'
                for image_file in uploads_dir.iterdir():
                    if image_file.is_file() and image_file.suffix.lower() in THUMBNAIL_EXTENSIONS:
                        create_thumbnail(image_file, uploads_thumb_dir)
    print("Source image thumbnail creation complete.")

    # 4. Backfill thumbnails for old generations
    print("\n[4/4] Checking for old generations that need thumbnails...")
    db = database.SessionLocal()
    try:
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
                        create_thumbnail(full_image_path, GENERATED_THUMBNAILS_DIR)
                        gen.generated_image_thumb_url = f"generated/{full_image_path.stem}.jpeg"
                    else:
                        print(f"    - WARNING: Could not find solution image file: {full_image_path}")

                # Backfill for the intermediate threat image
                if gen.threat_image_url and not gen.threat_image_thumb_url:
                    img_path_suffix = gen.threat_image_url.replace('images/', '', 1)
                    full_image_path = IMAGES_DIR / img_path_suffix
                    
                    if full_image_path.is_file():
                        create_thumbnail(full_image_path, GENERATED_THUMBNAILS_DIR)
                        gen.threat_image_thumb_url = f"generated/{full_image_path.stem}.jpeg"
                    else:
                        print(f"    - WARNING: Could not find threat image file: {full_image_path}")

                # Backfill for the original image
                if gen.original_image_filename and not gen.original_image_thumb_url:
                    original_path = Path(gen.dataset) / Path(gen.original_image_filename)
                    full_image_path = IMAGES_DIR / original_path
                    if full_image_path.is_file():
                         # Ensure the correct thumbnail directory is targeted
                        thumb_dir = IMAGES_DIR.parent / 'thumbnails' / gen.dataset
                        if 'uploads' in gen.original_image_filename:
                            thumb_dir = thumb_dir / 'uploads'
                        create_thumbnail(full_image_path, thumb_dir)
                        # Construct the correct relative path for the thumbnail URL
                        thumb_name = Path(gen.original_image_filename).stem + ".jpeg"
                        thumb_path_in_db = str(Path(gen.original_image_filename).parent / thumb_name)
                        gen.original_image_thumb_url = f"{gen.dataset}/{thumb_path_in_db.replace('//', '/')}"
                    else:
                        print(f"    - WARNING: Could not find original image file: {full_image_path}")


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