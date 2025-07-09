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
from PIL import Image, ImageOps
import openai
import replicate
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

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
    
    # FIXED: Refactored the path resolution to be more robust.
    # It now correctly handles various path formats (e.g., /api/images/..., images/...)
    # without risk of duplicating path segments.
    path_part = image_string
    if path_part.startswith('/api/images/'):
        path_part = path_part.replace('/api/images/', '', 1)
    elif path_part.startswith('images/'):
        path_part = path_part.replace('images/', '', 1)

    file_path = IMAGES_DIR / Path(path_part)

    if not file_path.is_file():
        # ADDED: Enhanced error logging to show the problematic input string.
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
            # FIXED: Apply EXIF orientation data to fix rotation issues on portrait images.
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
        
        # Update the generation with the prompt text
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
    # ADDED: Logging
    print(f"[{job_id}] Starting SOLUTION generation task.")
    generation = db.query(db_models.Generation).filter(db_models.Generation.id == job_id).first()
    if not generation:
        print(f"[{job_id}] ERROR: Generation record not found in DB for solution task.")
        return

    generation.status = db_models.JobStatus.PROCESSING
    db.commit()

    try:
        # The input image is now the THREAT image
        image_data_url = resolve_image_to_data_url(image_string_from_request)
        print(f"[{job_id}] Resolved threat image to data URL for Replicate.")
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
# MODIFIED: The lifespan manager is now empty as all startup logic has been moved
# to the dedicated startup.py script.
app = FastAPI()

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
        # For threats, we can pick one randomly if none is provided.
        if not selected_tags_ids:
            selected_tags_ids = [random.choice(AVAILABLE_THREAT_TAGS)['id']]
        system_prompt = create_threat_system_prompt(selected_tags_ids)
    else: # solution
        # For solutions, we can pick multiple.
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
    Endpoint to start a new generation process.
    1. Creates the initial database record with a 'pending' status.
    2. Starts a background task to generate the threat prompt and then the threat image.
    This avoids server timeouts by offloading the slow AI calls.
    """
    if not os.getenv("REPLICATE_API_KEY"): raise HTTPException(status_code=500, detail="Replicate API key not configured.")
    if not os.getenv("OPENAI_API_KEY"): raise HTTPException(status_code=500, detail="OpenAI API key not configured.")

    image_str = request.imageBase64
    final_image_filename_for_db = request.original_filename
    original_thumb_url_for_db = f"{request.dataset}/{Path(final_image_filename_for_db).stem}.jpeg"

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
    This is now idempotent to handle rapid duplicate requests from the frontend.
    """
    print(f"Received request to generate solution for job ID: {job_id}")
    print(f"Solution tags received: {request.solution_tags}")

    generation = db.query(db_models.Generation).filter(db_models.Generation.id == job_id).first()
    if not generation:
        print(f"ERROR: Job ID {job_id} not found.")
        raise HTTPException(status_code=404, detail="Generation job not found.")
    
    print(f"Found generation record with status: {generation.status}")

    # FIXED: Make this endpoint idempotent. If the job is already processing the solution
    # (due to a double-click), don't throw an error. Just acknowledge the request.
    if generation.status == db_models.JobStatus.PROCESSING:
        print(f"Job {job_id} is already processing a solution. Acknowledging duplicate request.")
        return {"job_id": job_id}
    
    if generation.status != db_models.JobStatus.THREAT_COMPLETED:
        print(f"ERROR: Job {job_id} is in wrong state: {generation.status}. Required: {db_models.JobStatus.THREAT_COMPLETED.value}")
        raise HTTPException(status_code=400, detail=f"Generation job is not in the correct state ('{db_models.JobStatus.THREAT_COMPLETED.value}') to generate a solution.")
    
    if not generation.threat_image_url:
        print(f"ERROR: Job {job_id} has no threat_image_url.")
        raise HTTPException(status_code=400, detail="Threat image URL is missing for this generation.")
    
    print(f"Proceeding to generate solution prompt for job {job_id}.")
    
    solution_system_prompt = create_system_prompt(request.solution_tags)
    threat_image_url_path = generation.threat_image_url
    image_data_url = resolve_image_to_data_url(threat_image_url_path)

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
    background_tasks.add_task(run_solution_generation_task, job_id, threat_image_url_path, solution_prompt, db_for_task)
    
    print(f"Successfully launched solution generation task for job {job_id}.")
    return {"job_id": job_id}


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
