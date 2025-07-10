import os
import base64
import io
import time
import random
import mimetypes
import uuid
import requests
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from contextlib import asynccontextmanager
from pathlib import Path
from PIL import Image, ImageOps
import openai
import replicate
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict

from . import db_models, models, database
from .ai_prompts import AVAILABLE_TAGS, AVAILABLE_THREAT_TAGS, create_system_prompt, create_threat_system_prompt

# --- Globals & In-Memory Stores ---
# Used for rate-limiting votes.
vote_timestamps = {}

# Load environment variables
load_dotenv()

# --- Configuration ---
THUMBNAIL_SIZE = (600, 600)
IMAGES_DIR = Path("/app/images")
WEIMAR_IMAGES_DIR = IMAGES_DIR / "weimar"
ALMERE_IMAGES_DIR = IMAGES_DIR / "almere"
GENERATED_IMAGES_DIR = IMAGES_DIR / "generated"
THUMBNAILS_DIR = Path("/app/thumbnails")
WEIMAR_THUMBNAILS_DIR = THUMBNAILS_DIR / "weimar"
ALMERE_THUMBNAILS_DIR = THUMBNAILS_DIR / "almere"
GENERATED_THUMBNAILS_DIR = THUMBNAILS_DIR / "generated"
DATABASE_DIR = Path("/app/database")
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
VOTE_RATE_LIMIT_SECONDS = 60 # 1 minute
GAMIFICATION_TARGET_SCORE = 100
# Set deadline to July 13, 2025, 23:59:59 UTC
GAMIFICATION_DEADLINE = datetime(2025, 7, 13, 23, 59, 59, tzinfo=timezone.utc)
# ADDED: Directory to move hidden source images to
HIDDEN_DIR = IMAGES_DIR / "hidden"
# ADDED: Directory for hidden thumbnails
HIDDEN_THUMBNAILS_DIR = THUMBNAILS_DIR / "hidden"


# --- Ensure static directories exist ---
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
WEIMAR_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
ALMERE_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
GENERATED_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)
WEIMAR_THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)
ALMERE_THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)
GENERATED_THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_DIR.mkdir(parents=True, exist_ok=True)
# Also create the 'uploads' subdirectories
(WEIMAR_IMAGES_DIR / 'uploads').mkdir(parents=True, exist_ok=True)
(ALMERE_IMAGES_DIR / 'uploads').mkdir(parents=True, exist_ok=True)
# ADDED: Ensure the hidden directories exist
HIDDEN_DIR.mkdir(parents=True, exist_ok=True)
HIDDEN_THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)


# API Clients
openai.api_key = os.getenv("OPENAI_API_KEY")
replicate_client = replicate.Client(api_token=os.getenv("REPLICATE_API_KEY"))

# --- Database Dependency ---
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Helper Functions ---

def resolve_image_to_data_url(image_string: str) -> str:
    """
    Accepts a string that is either a Data URL or a relative server path.
    Returns a guaranteed Data URL, which is required by external AI services.
    Raises FileNotFoundError if a relative path does not point to a valid file.
    """
    if image_string.startswith('data:'):
        # Input is already a Data URL, return it as is.
        return image_string
    
    path_part = image_string
    if path_part.startswith('/api/images/'):
        path_part = path_part.replace('/api/images/', '', 1)
    elif path_part.startswith('images/'):
        path_part = path_part.replace('images/', '', 1)

    file_path = IMAGES_DIR / Path(path_part)

    if not file_path.is_file():
        raise FileNotFoundError(f"Image file not found: {file_path}. Original string was: '{image_string}'")

    with open(file_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    
    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type:
        mime_type = "image/jpeg"
    
    return f"data:{mime_type};base64,{encoded_string}"

def create_thumbnail(image_path: Path, thumbnail_dir: Path):
    """
    Creates a thumbnail for a given image, correctly handling EXIF orientation,
    and saves it to the specified directory.
    Args:
        image_path (Path): The path to the source image.
        thumbnail_dir (Path): The directory where the thumbnail should be saved.
    """
    try:
        thumbnail_dir.mkdir(parents=True, exist_ok=True)
        thumbnail_path = thumbnail_dir / f"{image_path.stem}.jpeg"
        if thumbnail_path.exists(): return
        with Image.open(image_path) as img:
            img = ImageOps.exif_transpose(img)
            
            img.thumbnail(THUMBNAIL_SIZE)
            if img.mode in ("RGBA", "P"): img = img.convert("RGB")
            img.save(thumbnail_path, "JPEG", quality=90)
 
    except Exception as e:
        print(f"Error creating thumbnail for {image_path.name}: {e}")

def run_full_threat_generation_pipeline(job_id: str, image_string_from_request: str, threat_tags: List[str], db: Session):
    """
    A long-running background task that orchestrates the entire threat generation.
    1. Generates a creative prompt using OpenAI.
    2. Updates the DB with the prompt.
    3. Generates the 'threat' image using Replicate.
    4. Downloads the generated image, saves it, creates a thumbnail, and updates the DB.
    """
    generation = db.query(db_models.Generation).filter(db_models.Generation.id == job_id).first()
    if not generation:
        print(f"[{job_id}] ERROR: Generation record not found in DB.")
        return

    generation.status = db_models.JobStatus.PROCESSING
    db.commit()

    try:
        # --- 1. Generate Threat Prompt (formerly in the main endpoint) ---
        print(f"[{job_id}] Generating threat prompt for tags: {threat_tags}...")
        threat_system_prompt = create_threat_system_prompt(threat_tags)
        image_data_url = resolve_image_to_data_url(image_string_from_request)
        
        response = openai.chat.completions.create(
            model="gpt-4.1-mini-2025-04-14",
            messages=[
                {"role": "system", "content": threat_system_prompt},
                {"role": "user", "content": [{"type": "text", "text": "Generate a prompt for this image."}, {"type": "image_url", "image_url": {"url": image_data_url}}]},
            ],
            max_tokens=500,
        )
        prompt = response.choices[0].message.content.strip()
        print(f"[{job_id}] Threat prompt generated successfully.")
        
        generation.threat_prompt_text = prompt
        db.commit()

        # --- 2. Generate Threat Image ---
        model_name = "black-forest-labs/flux-kontext-pro"
        input_data = {"prompt": prompt, "input_image": image_data_url, "output_format": "png"}
        
        print(f"[{job_id}] Starting Replicate prediction for THREAT...")
        prediction = replicate_client.predictions.create(model=model_name, input=input_data)
        prediction.wait()

        if prediction.status != "succeeded":
            raise ValueError(f"Prediction failed. Status: {prediction.status}. Error: {prediction.error}")
        
        replicate_url = prediction.output
        if not replicate_url or not isinstance(replicate_url, str):
            raise ValueError(f"Model returned invalid output: {prediction.output}")

        print(f"[{job_id}] Threat prediction successful. Downloading image...")
        
        response = requests.get(replicate_url, stream=True, timeout=30)
        response.raise_for_status()
        
        local_filename = f"{uuid.uuid4()}.png"
        save_path = GENERATED_IMAGES_DIR / local_filename
        
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
       
        create_thumbnail(save_path, GENERATED_THUMBNAILS_DIR)
        
        print(f"[{job_id}] Threat image saved to {save_path}")
        generation.threat_image_url = f"images/generated/{local_filename}"
        generation.threat_image_thumb_url = f"generated/{save_path.stem}.jpeg"
        generation.status = db_models.JobStatus.THREAT_COMPLETED
        db.commit()

    except Exception as e:
        print(f"[{job_id}] --- DETAILED THREAT TASK ERROR ---: {e}")
        generation.status = db_models.JobStatus.FAILED
        db.commit()
    finally:
        db.close()

def run_solution_generation_task(job_id: str, image_string_from_request: str, prompt: str, db: Session):
    """
    A long-running task to generate the final 'solution' image.
    It downloads the generated image, saves it, creates a thumbnail, and updates the DB.
    """
    print(f"[{job_id}] Starting SOLUTION generation task.")
    generation = db.query(db_models.Generation).filter(db_models.Generation.id == job_id).first()
    if not generation:
        print(f"[{job_id}] ERROR: Generation record not found in DB for solution task.")
        return

    generation.status = db_models.JobStatus.PROCESSING
    db.commit()

    try:
        # MODIFIED: The input image is now the ORIGINAL image, passed from the endpoint.
        image_data_url = resolve_image_to_data_url(image_string_from_request)
        print(f"[{job_id}] Resolved original image to data URL for Replicate.")
        model_name = "black-forest-labs/flux-kontext-pro"
        input_data = {"prompt": prompt, "input_image": image_data_url, "output_format": "png"}
        
        print(f"[{job_id}] Starting Replicate prediction for SOLUTION...")
        prediction = replicate_client.predictions.create(model=model_name, input=input_data)
        prediction.wait()

        if prediction.status != "succeeded":
            raise ValueError(f"Prediction failed. Status: {prediction.status}. Error: {prediction.error}")
        
        replicate_url = prediction.output
        if not replicate_url or not isinstance(replicate_url, str):
            raise ValueError(f"Model returned invalid output: {prediction.output}")

        print(f"[{job_id}] Solution prediction successful. Downloading image...")
        
        response = requests.get(replicate_url, stream=True, timeout=30)
        response.raise_for_status()
        
        local_filename = f"{uuid.uuid4()}.png"
        save_path = GENERATED_IMAGES_DIR / local_filename
        
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
       
        create_thumbnail(save_path, GENERATED_THUMBNAILS_DIR)
        
        print(f"[{job_id}] Solution image saved to {save_path}")
        generation.generated_image_url = f"images/generated/{local_filename}"
        generation.generated_image_thumb_url = f"generated/{save_path.stem}.jpeg"
        generation.status = db_models.JobStatus.COMPLETED
        db.commit()
        print(f"[{job_id}] SOLUTION task finished successfully.")

    except Exception as e:
        print(f"[{job_id}] --- DETAILED SOLUTION TASK ERROR ---: {e}")
        generation.status = db_models.JobStatus.FAILED
        db.commit()
    finally:
        db.close()

# --- FastAPI App & Endpoints ---
app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.mount("/api/images", StaticFiles(directory=IMAGES_DIR), name="images")
app.mount("/api/thumbnails", StaticFiles(directory=THUMBNAILS_DIR), name="thumbnails")

@app.get("/upload-mobile", response_class=HTMLResponse)
async def get_mobile_upload_page():
    """
    Serves the simple HTML page for visitors to upload photos from their phones.
    """
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Almere 2075 - Photo Upload</title>
        <style>
            :root {
                --bg: #000; --text: #f0f0f0; --primary: #0A84FF; --border: #333;
                --error: #FF453A; --success: #32D74B;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background-color: var(--bg); color: var(--text);
                display: flex; flex-direction: column; align-items: center;
                justify-content: center; min-height: 100vh; margin: 0; padding: 20px;
                box-sizing: border-box; text-align: center;
            }
            .container {
                width: 100%; max-width: 400px;
                background-color: #1c1c1e; padding: 30px;
                border-radius: 16px; border: 1px solid var(--border);
            }
            h1 { margin-top: 0; font-size: 24px; }
            p { color: #a1a1a6; line-height: 1.5; }
            #image-preview {
                width: 100%; aspect-ratio: 1/1; border-radius: 8px;
                background-color: #000; margin-bottom: 20px;
                background-size: contain; background-position: center;
                background-repeat: no-repeat; border: 1px dashed var(--border);
                display: flex; align-items: center; justify-content: center; color: #555;
                cursor: pointer;
            }
            .button {
                width: 100%; padding: 15px; font-size: 16px; font-weight: 600;
                border-radius: 12px; border: none; cursor: pointer;
                transition: background-color 0.2s;
            }
            #upload-button { background-color: var(--primary); color: white; }
            #upload-button:disabled { background-color: #555; cursor: not-allowed; }
            #file-label {
                display: block; background-color: #333; color: var(--text);
                margin-bottom: 20px;
            }
            input[type="file"] { display: none; }
            #status-message {
                margin-top: 20px; font-weight: 500; min-height: 24px;
            }
            .status-error { color: var(--error); }
            .status-success { color: var(--success); }
            .spinner {
                border: 4px solid rgba(255, 255, 255, 0.2);
                border-left-color: var(--primary);
                border-radius: 50%; width: 24px; height: 24px;
                animation: spin 1s linear infinite;
                margin: 20px auto 0; display: none;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Almere 2075</h1>
            <p>Upload a photo from your phone. It will appear in the main exhibition gallery shortly.</p>
            
            <div id="image-preview"><span>Tap to select image</span></div>
            
            <label for="file-input" id="file-label" class="button">CHOOSE FILE</label>
            <input type="file" id="file-input" accept="image/*">
            
            <button id="upload-button" class="button" disabled>UPLOAD TO GALLERY</button>
            
            <div id="status-message"></div>
            <div id="spinner" class="spinner"></div>
        </div>

        <script>
            const fileInput = document.getElementById('file-input');
            const uploadButton = document.getElementById('upload-button');
            const imagePreview = document.getElementById('image-preview');
            const fileLabel = document.getElementById('file-label');
            const statusMessage = document.getElementById('status-message');
            const spinner = document.getElementById('spinner');
            let imageBase64 = null;
            const MAX_DIMENSION = 1500;

            const urlParams = new URLSearchParams(window.location.search);
            const dataset = urlParams.get('dataset') || 'almere';

            imagePreview.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        let { width, height } = img;
                        if (width > height) {
                            if (width > MAX_DIMENSION) {
                                height *= MAX_DIMENSION / width;
                                width = MAX_DIMENSION;
                            }
                        } else {
                            if (height > MAX_DIMENSION) {
                                width *= MAX_DIMENSION / height;
                                height = MAX_DIMENSION;
                            }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        imageBase64 = canvas.toDataURL('image/jpeg', 0.9);
                        imagePreview.style.backgroundImage = `url(${imageBase64})`;
                        imagePreview.textContent = '';
                        uploadButton.disabled = false;
                        fileLabel.textContent = file.name;
                        statusMessage.textContent = '';
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            });

            uploadButton.addEventListener('click', async () => {
                if (!imageBase64) return;

                uploadButton.disabled = true;
                spinner.style.display = 'block';
                statusMessage.textContent = 'Uploading...';
                statusMessage.className = '';

                try {
                    const response = await fetch('/api/mobile-upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageBase64, dataset })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.detail || 'Upload failed');
                    }

                    const result = await response.json();
                    statusMessage.textContent = 'Success! Your photo will appear in the gallery soon.';
                    statusMessage.className = 'status-success';
                    
                    setTimeout(() => {
                        window.close();
                    }, 3000);

                } catch (error) {
                    statusMessage.textContent = `Error: ${error.message}`;
                    statusMessage.className = 'status-error';
                    uploadButton.disabled = false;
                } finally {
                    spinner.style.display = 'none';
                }
            });
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.post("/api/mobile-upload", status_code=201)
async def mobile_upload(request: models.MobileUploadRequest):
    """
    Handles a public image upload from the mobile page.
    Saves the image to the correct 'uploads' directory and creates a thumbnail,
    making it available in the main gallery.
    """
    if not request.dataset or not request.imageBase64:
        raise HTTPException(status_code=400, detail="Dataset and image data are required.")

    try:
        header, encoded = request.imageBase64.split(",", 1)
        
        missing_padding = len(encoded) % 4
        if missing_padding:
            encoded += '=' * (4 - missing_padding)

        image_data = base64.b64decode(encoded)
        
        with Image.open(io.BytesIO(image_data)) as img:
            img = ImageOps.exif_transpose(img)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            
            # Standardize image size and format
            img.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
            
            new_filename = f"{uuid.uuid4()}.jpg"
            save_dir = IMAGES_DIR / request.dataset / 'uploads'
            save_path = save_dir / new_filename
            
            img.save(save_path, "JPEG", quality=85, optimize=True)

        # Create thumbnail for the newly uploaded image
        thumb_dir = (WEIMAR_THUMBNAILS_DIR if request.dataset == 'weimar' else ALMERE_THUMBNAILS_DIR) / 'uploads'
        create_thumbnail(save_path, thumb_dir)
        
        print(f"Successfully uploaded image {new_filename} to dataset {request.dataset}")
        return {"message": "Upload successful!", "filename": new_filename}

    except Exception as e:
        print(f"Error in mobile-upload: {e}")
        raise HTTPException(status_code=500, detail="Could not process and save uploaded image.")

@app.post("/api/gallery/hide-image", status_code=200)
async def hide_source_image(request: models.HideImageRequest):
    """
    Moves a specified source image and its thumbnail to a hidden directory
    to remove it from the public gallery for privacy reasons.
    This version uses a robust copy-and-delete method to avoid cross-volume errors.
    """
    try:
        if ".." in request.filename:
            raise HTTPException(status_code=400, detail="Invalid filename.")
        
        source_path = IMAGES_DIR / request.dataset / request.filename
        if not source_path.is_file():
            raise HTTPException(status_code=404, detail=f"Source image not found at {source_path}")

        # --- Move main image file ---
        dest_path = HIDDEN_DIR / f"{request.dataset}_{source_path.name}"
        with open(source_path, 'rb') as f_src:
            with open(dest_path, 'wb') as f_dst:
                f_dst.write(f_src.read())
        os.remove(source_path)
        print(f"Moved source image to hidden: {dest_path}")

        # --- Move thumbnail file ---
        thumb_name = f"{source_path.stem}.jpeg"
        thumb_prefix = Path(request.filename).parent
        thumb_source_path = THUMBNAILS_DIR / request.dataset / thumb_prefix / thumb_name

        if thumb_source_path.is_file():
            thumb_dest_path = HIDDEN_THUMBNAILS_DIR / f"{request.dataset}_{thumb_name}"
            with open(thumb_source_path, 'rb') as f_src:
                with open(thumb_dest_path, 'wb') as f_dst:
                    f_dst.write(f_src.read())
            os.remove(thumb_source_path)
            print(f"Moved thumbnail to hidden: {thumb_dest_path}")
        else:
            print(f"Warning: Thumbnail not found for {request.filename} at {thumb_source_path}")

        return {"message": f"Image {request.filename} has been hidden."}

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"--- ERROR hiding image {request.filename}: {e} ---")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while hiding the image.")


@app.get("/api/gallery")
async def get_gallery_index(dataset: str = Query('weimar', enum=['weimar', 'almere'])):
    """
    Gets the list of available images for a specific dataset, filtering out hidden ones.
    This now correctly processes subdirectories for uploaded images.
    """
    base_dirs = {
        'weimar': WEIMAR_IMAGES_DIR,
        'almere': ALMERE_IMAGES_DIR
    }
    thumb_dirs = {
        'weimar': WEIMAR_THUMBNAILS_DIR,
        'almere': ALMERE_THUMBNAILS_DIR
    }
    
    dataset_dir = base_dirs.get(dataset)
    thumb_dir = thumb_dirs.get(dataset)

    if not dataset_dir or not dataset_dir.exists():
        return []

    gallery_data = []

    def process_directory(directory: Path, thumb_directory: Path, prefix: str = ""):
        if not directory.exists():
            return
        
        image_files = sorted(
            [f for f in directory.iterdir() if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS],
            key=lambda f: f.stat().st_mtime,
            reverse=True
        )
        
        for f in image_files:
            thumbnail_filename = f"{f.stem}.jpeg"
            if (thumb_directory / thumbnail_filename).exists():
                gallery_data.append({
                    "filename": f"{dataset}/{prefix}{f.name}",
                    "thumbnail": f"{dataset}/{prefix}{thumbnail_filename}"
                })

    # Process uploads first, then the base directory
    process_directory(dataset_dir / 'uploads', thumb_dir / 'uploads', "uploads/")
    process_directory(dataset_dir, thumb_dir)
    
    return gallery_data

@app.get("/api/tags", response_model=list[models.Tag])
def get_tags():
    """Gets the list of available 'solution' tags."""
    return AVAILABLE_TAGS

@app.get("/api/tags/threats", response_model=list[models.Tag])
def get_threat_tags():
    """Gets the list of available 'threat' tags."""
    return AVAILABLE_THREAT_TAGS

@app.post("/api/generate-prompt", response_model=models.PromptGenerationResponse)
async def generate_prompt(request: models.GeneratePromptRequest):
    """Generates a prompt for a given image and tags (threat or solution)."""
    if not openai.api_key: raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    
    selected_tags_ids = request.tags
    
    if request.type == 'threat':
        if not selected_tags_ids:
            selected_tags_ids = [random.choice(AVAILABLE_THREAT_TAGS)['id']]
        system_prompt = create_threat_system_prompt(selected_tags_ids)
    else: # solution
        if not selected_tags_ids:
            num_tags = random.randint(1, 3)
            selected_tags_ids = [tag['id'] for tag in random.sample(AVAILABLE_TAGS, k=num_tags)]
        system_prompt = create_system_prompt(selected_tags_ids)

    try:
        image_data_url = resolve_image_to_data_url(request.imageBase64)
        
        response = openai.chat.completions.create(
            model="gpt-4.1-mini-2025-04-14", # Don't change this model!
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": [{"type": "text", "text": "Generate a prompt for this image."}, {"type": "image_url", "image_url": {"url": image_data_url}}]},
            ],
            max_tokens=500,
        )
        generated_prompt = response.choices[0].message.content.strip()
        
        return {"prompt": generated_prompt, "tags_used": selected_tags_ids}
    except Exception as e:
        print(f"!!! UNHANDLED EXCEPTION IN generate_prompt: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate prompt: {e}")

@app.post("/api/generations", response_model=models.JobCreationResponse)
async def create_generation_and_threat(
    request: models.CreateGenerationRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    """
    Endpoint to start a new generation process for a public image.
    This handles images selected from the gallery or uploaded via the public button.
    """
    if not os.getenv("REPLICATE_API_KEY"): raise HTTPException(status_code=500, detail="Replicate API key not configured.")
    if not os.getenv("OPENAI_API_KEY"): raise HTTPException(status_code=500, detail="OpenAI API key not configured.")

    image_str = request.imageBase64
    final_image_filename_for_db = request.original_filename
    original_thumb_url_for_db = f"{request.dataset}/{Path(final_image_filename_for_db).stem}.jpeg"

    # This block handles public uploads from the main screen's "UPLOAD FROM THIS DEVICE" button
    if image_str.startswith('data:'):
        try:
            header, encoded = image_str.split(",", 1)
            mime_type = header.split(":")[1].split(";")[0]
            
            missing_padding = len(encoded) % 4
            if missing_padding:
                encoded += '=' * (4 - missing_padding)

            image_data = base64.b64decode(encoded)
            
            extension = mimetypes.guess_extension(mime_type) or '.jpg'
            new_filename = f"{uuid.uuid4()}{extension}"
            
            save_dir = IMAGES_DIR / request.dataset / 'uploads'
            save_path = save_dir / new_filename
        
            with open(save_path, "wb") as f: f.write(image_data)
            
            thumb_dir = (WEIMAR_THUMBNAILS_DIR if request.dataset == 'weimar' else ALMERE_THUMBNAILS_DIR) / 'uploads'
            create_thumbnail(save_path, thumb_dir)
            
            final_image_filename_for_db = f"uploads/{new_filename}"
            original_thumb_url_for_db = f"{request.dataset}/uploads/{save_path.stem}.jpeg"
        except Exception as e:
            print(f"Error decoding or saving uploaded image: {e}")
            raise HTTPException(status_code=500, detail="Could not process and save uploaded image.")

    # Create the initial record in the database
    new_generation = db_models.Generation(
        dataset=request.dataset,
        original_image_filename=final_image_filename_for_db,
        original_image_thumb_url=original_thumb_url_for_db,
        threat_tags_used=[tag['name'] for tag in AVAILABLE_THREAT_TAGS if tag['id'] in request.threat_tags],
        status=db_models.JobStatus.PENDING
    )
    db.add(new_generation)
    db.commit()
    db.refresh(new_generation)
    
    job_id = new_generation.id

    # Schedule the entire threat generation process to run in the background
    db_for_task = database.SessionLocal()
    background_tasks.add_task(
        run_full_threat_generation_pipeline, 
        job_id, 
        request.imageBase64, 
        request.threat_tags,
        db_for_task
    )
    
    return {"job_id": job_id}

@app.put("/api/generations/{job_id}/solution", response_model=models.JobCreationResponse)
async def create_solution_image(
    job_id: str, request: models.GenerateSolutionRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    """
    Endpoint to generate the solution image for an existing generation process.
    This now includes robust error handling to prevent non-JSON responses.
    """
    generation = db.query(db_models.Generation).filter(db_models.Generation.id == job_id).first()
    if not generation:
        raise HTTPException(status_code=404, detail="Generation job not found.")
    
    if generation.status == db_models.JobStatus.PROCESSING:
        return {"job_id": job_id}
    
    if generation.status != db_models.JobStatus.THREAT_COMPLETED:
        raise HTTPException(status_code=400, detail=f"Generation job is not in the correct state ('{db_models.JobStatus.THREAT_COMPLETED.value}') to generate a solution.")

    try:
        print(f"Proceeding to generate solution prompt for job {job_id}.")
        
        solution_system_prompt = create_system_prompt(request.solution_tags)
        
        original_image_path = f"{generation.dataset}/{generation.original_image_filename}"
        image_data_url = resolve_image_to_data_url(original_image_path)

        response = openai.chat.completions.create(
            model="gpt-4.1-mini-2025-04-14",
            messages=[
                {"role": "system", "content": solution_system_prompt},
                {"role": "user", "content": [{"type": "text", "text": "Generate a prompt for this image."}, {"type": "image_url", "image_url": {"url": image_data_url}}]},
            ],
            max_tokens=500,
        )
        solution_prompt = response.choices[0].message.content.strip()

        print(f"Generated solution prompt for job {job_id}: {solution_prompt[:100]}...")
        generation.prompt_text = solution_prompt
        generation.tags_used = [tag['name'] for tag in AVAILABLE_TAGS if tag['id'] in request.solution_tags]
        db.commit()

        db_for_task = database.SessionLocal()
        background_tasks.add_task(run_solution_generation_task, job_id, original_image_path, solution_prompt, db_for_task)
        
        print(f"Successfully launched solution generation task for job {job_id}.")
        return {"job_id": job_id}

    except Exception as e:
        print(f"--- ERROR in create_solution_image for job {job_id}: {e}")
        # Mark the job as failed in the DB so the UI can react
        generation.status = db_models.JobStatus.FAILED
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to generate solution prompt: {str(e)}")


@app.get("/api/job-status/{job_id}", response_model=models.JobStatusResponse)
async def get_job_status(job_id: str, db: Session = Depends(get_db)):
    
    job = db.query(db_models.Generation).filter(db_models.Generation.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job_data = models.GenerationInfo.from_orm(job)
    response = {"status": job.status, "generation_data": job_data}

    if job.status == db_models.JobStatus.FAILED:
        response["error"] = "AI transformation failed. See server logs for details."
        
    return response

@app.get("/api/public-gallery", response_model=list[models.GenerationInfo])
def get_public_gallery(dataset: str = Query('weimar', enum=['weimar', 'almere']), db: Session = Depends(get_db)):
    """
    Gets completed and visible generations, filtered by the selected dataset.
    """
    generations = db.query(db_models.Generation)\
        .filter(
            db_models.Generation.is_visible == True, 
            db_models.Generation.status == db_models.JobStatus.COMPLETED,
            db_models.Generation.dataset == dataset
        )\
        .order_by(db_models.Generation.votes.desc(), db_models.Generation.created_at.desc())\
        .all()
    return generations

@app.post("/api/generations/{job_id}/vote")
def vote_for_generation(job_id: str, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host
    current_time = time.time()

    last_vote_time = vote_timestamps.get(client_ip, 0)
    if (current_time - last_vote_time) < VOTE_RATE_LIMIT_SECONDS:
        raise HTTPException(status_code=429, detail="You can only vote once per minute.")

    generation = db.query(db_models.Generation).filter(db_models.Generation.id == job_id).first()
    if not generation:
        raise HTTPException(status_code=404, detail="Generation not found.")
    
    generation.votes = (generation.votes or 0) + 1
    db.commit()
    
    vote_timestamps[client_ip] = current_time
    return {"message": "Vote successful", "new_vote_count": generation.votes}

@app.post("/api/generations/{job_id}/hide")
def hide_generation(job_id: str, db: Session = Depends(get_db)):
    generation = db.query(db_models.Generation).filter(db_models.Generation.id == job_id).first()
    if not generation:
        raise HTTPException(status_code=404, detail="Generation not found.")
    
    generation.is_visible = False
    db.commit()
    return {"message": "Generation hidden from public gallery."}

@app.post("/api/generations/{job_id}/set-name")
def set_creator_name(job_id: str, request: models.SetCreatorNameRequest, db: Session = Depends(get_db)):
    generation = db.query(db_models.Generation).filter(db_models.Generation.id == job_id).first()
    if not generation:
        raise HTTPException(status_code=404, detail="Generation not found.")
    
    generation.creator_name = request.name
    db.commit()
    return {"message": "Creator name updated."}

@app.get("/api/gamification-stats", response_model=models.GamificationStatsResponse)
def get_gamification_stats(db: Session = Depends(get_db)):
    total_votes = db.query(func.sum(db_models.Generation.votes)).filter(db_models.Generation.is_visible == True).scalar()
    
    return {
        "happiness_score": total_votes or 0,
        "target_score": GAMIFICATION_TARGET_SCORE,
        "deadline_iso": GAMIFICATION_DEADLINE.isoformat()
    }

@app.get("/api/random-generation", response_model=models.GenerationInfo)
def get_random_generation(dataset: str = Query('almere', enum=['weimar', 'almere']), db: Session = Depends(get_db)):
    """
    Gets a single, random, completed, and visible generation from the database
    for the specified dataset, ensuring it has a generated image. This is used for the projection slideshow.
    """
    random_generation = db.query(db_models.Generation)\
        .filter(
            db_models.Generation.is_visible == True,
            db_models.Generation.status == db_models.JobStatus.COMPLETED,
            db_models.Generation.generated_image_url.isnot(None),
            db_models.Generation.dataset == dataset
        )\
        .order_by(func.random())\
        .first()

    if not random_generation:
        raise HTTPException(
            status_code=404,
            detail=f"No completed and visible generations with an image found for dataset '{dataset}'."
        )

    return random_generation
