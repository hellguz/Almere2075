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
from contextlib import asynccontextmanager
from pathlib import Path
from PIL import Image
import openai
import replicate
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import func

from . import db_models, models, database
from .ai_prompts import AVAILABLE_TAGS, create_system_prompt

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
DATABASE_DIR = Path("/app/database")
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
VOTE_RATE_LIMIT_SECONDS = 60 # 1 minute
GAMIFICATION_TARGET_SCORE = 1000
# Set deadline to July 13, 2025, 23:59:59 UTC
GAMIFICATION_DEADLINE = datetime(2025, 7, 13, 23, 59, 59, tzinfo=timezone.utc)

# --- Ensure static directories exist ---
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
WEIMAR_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
ALMERE_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
GENERATED_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)
WEIMAR_THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)
ALMERE_THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_DIR.mkdir(parents=True, exist_ok=True)
# Also create the 'uploads' subdirectories
(WEIMAR_IMAGES_DIR / 'uploads').mkdir(parents=True, exist_ok=True)
(ALMERE_IMAGES_DIR / 'uploads').mkdir(parents=True, exist_ok=True)


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
    
    relative_path = image_string.replace('/api/images/', '', 1)
    file_path = IMAGES_DIR / Path(relative_path)

    if not file_path.is_file():
        raise FileNotFoundError(f"Image file not found: {file_path}")

    with open(file_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    
    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type:
        mime_type = "image/jpeg"
    
    return f"data:{mime_type};base64,{encoded_string}"

def create_thumbnail(image_path: Path, dataset: str):
    """
    Creates a thumbnail for a given image and saves it to the correct dataset directory.
    
    Args:
        image_path: The path to the source image.
        dataset: The dataset ('weimar' or 'almere') the image belongs to.
    """
    try:
        dataset_thumb_dir = WEIMAR_THUMBNAILS_DIR if dataset == 'weimar' else ALMERE_THUMBNAILS_DIR
        thumbnail_path = dataset_thumb_dir / f"{image_path.stem}.jpeg"
        if thumbnail_path.exists(): return
        with Image.open(image_path) as img:
            img.thumbnail(THUMBNAIL_SIZE)
            if img.mode in ("RGBA", "P"): img = img.convert("RGB")
            img.save(thumbnail_path, "JPEG")
    except Exception as e:
        print(f"Error creating thumbnail for {image_path.name}: {e}")

def run_ai_transformation_task(job_id: str, image_string_from_request: str, prompt: str, db: Session):
    """
    This is the actual long-running task, now updating the database.
    It now downloads the generated image and saves it locally.
    """
    generation = db.query(db_models.Generation).filter(db_models.Generation.id == job_id).first()
    if not generation:
        print(f"[{job_id}] ERROR: Generation record not found in DB.")
        return

    generation.status = db_models.JobStatus.PROCESSING
    db.commit()

    try:
        image_data_url = resolve_image_to_data_url(image_string_from_request)
        
        model_name = "black-forest-labs/flux-kontext-pro"
        input_data = {"prompt": prompt, "input_image": image_data_url, "output_format": "png"}
        
        print(f"[{job_id}] Starting Replicate prediction...")
        prediction = replicate_client.predictions.create(model=model_name, input=input_data)
        prediction.wait()

        if prediction.status != "succeeded":
            raise ValueError(f"Prediction failed. Status: {prediction.status}. Error: {prediction.error}")
        
        if not prediction.output or not isinstance(prediction.output, str):
            raise ValueError(f"Model returned invalid output: {prediction.output}")

        print(f"[{job_id}] Prediction successful. Downloading image...")
        
        replicate_url = prediction.output
        try:
            response = requests.get(replicate_url, stream=True, timeout=30)
            response.raise_for_status()
            
            file_extension = Path(replicate_url).suffix or '.png'
            local_filename = f"{uuid.uuid4()}{file_extension}"
            save_path = GENERATED_IMAGES_DIR / local_filename
            
            with open(save_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            print(f"[{job_id}] Image saved to {save_path}")
            generation.generated_image_url = f"images/generated/{local_filename}"
            generation.status = db_models.JobStatus.COMPLETED
            db.commit()

        except requests.exceptions.RequestException as e:
            raise IOError(f"Failed to download image from Replicate: {e}") from e

    except Exception as e:
        print(f"[{job_id}] --- DETAILED AI TASK ERROR ---")
        print(f"[{job_id}] Error Type: {type(e).__name__}")
        print(f"[{job_id}] Error Details: {e}")
        print(f"[{job_id}] --------------------------------")
        generation.status = db_models.JobStatus.FAILED
        db.commit()
    finally:
        db.close()


# --- FastAPI App & Endpoints ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Application starting up...")
    database.init_db()
    for dataset in ['weimar', 'almere']:
        image_dir = IMAGES_DIR / dataset
        if image_dir.exists():
            for image_file in image_dir.iterdir():
                if image_file.is_file() and image_file.suffix.lower() in ALLOWED_EXTENSIONS:
                    create_thumbnail(image_file, dataset)
    yield
    print("Application shutting down.")

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.mount("/api/images", StaticFiles(directory=IMAGES_DIR), name="images")
app.mount("/api/thumbnails", StaticFiles(directory=THUMBNAILS_DIR), name="thumbnails")

@app.get("/api/gallery")
async def get_gallery_index(dataset: str = Query('weimar', enum=['weimar', 'almere'])):
    """
    Gets the list of available images for a specific dataset, filtering out hidden ones.
    """
    dataset_dir = WEIMAR_IMAGES_DIR if dataset == 'weimar' else ALMERE_IMAGES_DIR
    thumb_dir = WEIMAR_THUMBNAILS_DIR if dataset == 'weimar' else ALMERE_THUMBNAILS_DIR

    if not dataset_dir.exists(): return []
    gallery_data = []
    image_files = sorted([f for f in dataset_dir.iterdir() if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS])
    for f in image_files:
        thumbnail_filename = f"{f.stem}.jpeg"
        if (thumb_dir / thumbnail_filename).exists():
            gallery_data.append({"filename": f"{dataset}/{f.name}", "thumbnail": f"{dataset}/{thumbnail_filename}"})
    return gallery_data

@app.get("/api/tags", response_model=list[models.Tag])
def get_tags():
    return AVAILABLE_TAGS

@app.post("/api/generate-prompt", response_model=models.PromptGenerationResponse)
async def generate_prompt(request: models.GeneratePromptRequest):
    if not openai.api_key: raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    
    selected_tags_ids = request.tags
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

@app.post("/api/transform-image", response_model=models.JobCreationResponse)
async def transform_image(request: models.TransformImageRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if not os.getenv("REPLICATE_API_KEY"): raise HTTPException(status_code=500, detail="Replicate API key not configured.")
    
    image_str = request.imageBase64
    final_image_filename_for_db = request.original_filename

    if image_str.startswith('data:'):
        try:
            header, encoded = image_str.split(",", 1)
            # FIXED: This line was accidentally deleted, causing the error. It's now restored.
            mime_type = header.split(":")[1].split(";")[0]
            
            # Add padding to the base64 string if it's missing.
            missing_padding = len(encoded) % 4
            if missing_padding:
                encoded += '=' * (4 - missing_padding)

            image_data = base64.b64decode(encoded)
            
            extension = mimetypes.guess_extension(mime_type) or '.jpg'
            new_filename = f"{uuid.uuid4()}{extension}"
            save_dir = IMAGES_DIR / request.dataset / 'uploads'
            save_path = save_dir / new_filename
            
            with open(save_path, "wb") as f:
                f.write(image_data)
            
            create_thumbnail(save_path, request.dataset)
            
            # Store the path relative to the dataset folder
            final_image_filename_for_db = f"uploads/{new_filename}"
        except Exception as e:
            print(f"Error decoding or saving uploaded image: {e}")
            raise HTTPException(status_code=500, detail="Could not process and save uploaded image.")
    
    new_generation = db_models.Generation(
        dataset=request.dataset,
        original_image_filename=final_image_filename_for_db,
        prompt_text=request.prompt,
        tags_used=[tag_info['name'] for tag_info in AVAILABLE_TAGS if tag_info['id'] in request.tags],
        status=db_models.JobStatus.PENDING
    )
    db.add(new_generation)
    db.commit()
    db.refresh(new_generation)
    
    job_id = new_generation.id
    db_for_task = database.SessionLocal()
    background_tasks.add_task(run_ai_transformation_task, job_id, request.imageBase64, request.prompt, db_for_task)
    
    return {"job_id": job_id}

@app.get("/api/job-status/{job_id}", response_model=models.JobStatusResponse)
async def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(db_models.Generation).filter(db_models.Generation.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    response = {"status": job.status, "result": None, "error": None, "generation_data": None}
    if job.status == db_models.JobStatus.COMPLETED:
        job_data = models.GenerationInfo.from_orm(job)
        response["result"] = job.generated_image_url
        response["generation_data"] = job_data
    elif job.status == db_models.JobStatus.FAILED:
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