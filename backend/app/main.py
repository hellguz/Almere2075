import os
import base64
import io
import uuid
import time
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
from PIL import Image
import openai
import replicate
from dotenv import load_dotenv

from .models import GeneratePromptRequest, TransformImageRequest
from .ai_prompts import system_prompt_for_flux

# --- In-Memory Job Store ---
job_store = {}


# Load environment variables
load_dotenv()

# --- Configuration ---
THUMBNAIL_SIZE = (400, 400)
IMAGES_DIR = Path("/app/images")
THUMBNAILS_DIR = Path("/app/thumbnails")
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.webm'}

# --- FIX: Ensure static directories exist before app tries to mount them ---
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)

# API Clients
openai.api_key = os.getenv("OPENAI_API_KEY")
replicate_client = replicate.Client(api_token=os.getenv("REPLICATE_API_KEY"))

# --- Helper Functions ---
def create_thumbnail(image_path: Path):
    try:
        if image_path.suffix.lower() == '.webm': return
        # Directory creation is now done at startup, but this check is harmless
        if not THUMBNAILS_DIR.exists(): THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)
        thumbnail_path = THUMBNAILS_DIR / f"{image_path.stem}.jpeg"
        if thumbnail_path.exists(): return
        with Image.open(image_path) as img:
            img.thumbnail(THUMBNAIL_SIZE)
            if img.mode in ("RGBA", "P"): img = img.convert("RGB")
            img.save(thumbnail_path, "JPEG")
    except Exception as e:
        print(f"Error creating thumbnail for {image_path.name}: {e}")

def run_ai_transformation_task(job_id: str, image_b64: str, prompt: str):
    """
    This is the actual long-running task. It will be run in the background.
    """
    job_store[job_id] = {"status": "processing", "result": None, "error": None}
    try:
        model_name = "black-forest-labs/flux-kontext-pro"
        input_data = {"prompt": prompt, "input_image": image_b64, "output_format": "png"}
        
        print(f"[{job_id}] Starting Replicate prediction...")
        prediction = replicate_client.predictions.create(
            model=model_name,
            input=input_data
        )
        prediction.wait()

        if prediction.status != "succeeded":
            raise ValueError(f"Prediction failed. Status: {prediction.status}. Error: {prediction.error}")
        
        if not prediction.output or not isinstance(prediction.output, str):
            raise ValueError(f"Model returned invalid output: {prediction.output}")

        print(f"[{job_id}] Prediction successful.")
        job_store[job_id]["status"] = "completed"
        job_store[job_id]["result"] = prediction.output

    except Exception as e:
        print(f"[{job_id}] --- DETAILED REPLICATE ERROR ---")
        print(f"[{job_id}] Error Type: {type(e).__name__}")
        print(f"[{job_id}] Error Details: {e}")
        print(f"[{job_id}] --------------------------------")
        job_store[job_id]["status"] = "failed"
        job_store[job_id]["error"] = str(e)


# --- FastAPI App & Endpoints ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Application starting up...")
    # Thumbnail generation on startup remains useful
    if IMAGES_DIR.exists():
        for image_file in IMAGES_DIR.iterdir():
            if image_file.is_file() and image_file.suffix.lower() in ALLOWED_EXTENSIONS:
                create_thumbnail(image_file)
    yield
    print("Application shutting down.")

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# These mounts will now work because the directories are guaranteed to exist
app.mount("/api/images", StaticFiles(directory=IMAGES_DIR), name="images")
app.mount("/api/thumbnails", StaticFiles(directory=THUMBNAILS_DIR), name="thumbnails")

@app.get("/api/gallery")
async def get_gallery_index():
    if not IMAGES_DIR.exists(): return []
    gallery_data = []
    image_files = sorted([f for f in IMAGES_DIR.iterdir() if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS])
    for f in image_files:
        thumbnail_name = None
        if f.suffix.lower() != '.webm':
            thumbnail_filename = f"{f.stem}.jpeg"
            if (THUMBNAILS_DIR / thumbnail_filename).exists():
                thumbnail_name = thumbnail_filename
        gallery_data.append({"filename": f.name, "thumbnail": thumbnail_name})
    return gallery_data

@app.post("/api/generate-prompt")
async def generate_prompt(request: GeneratePromptRequest):
    if not openai.api_key: raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    try:
        header, encoded = request.imageBase64.split(",", 1)
        data = base64.b64decode(encoded)
        image = Image.open(io.BytesIO(data))
        output_buffer = io.BytesIO()
        image.save(output_buffer, format="PNG")
        standardized_data_url = f"data:image/png;base64,{base64.b64encode(output_buffer.getvalue()).decode('utf-8')}"

        response = openai.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": system_prompt_for_flux},
                {"role": "user", "content": [{"type": "text", "text": "Generate a prompt for this image."}, {"type": "image_url", "image_url": {"url": standardized_data_url}}]},
            ],
            max_tokens=500,
        )
        return {"prompt": response.choices[0].message.content.strip()}
    except Exception as e:
        # CORRECTED: Added detailed print statement to expose the true error in the logs.
        print(f"!!! UNHANDLED EXCEPTION IN generate_prompt: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate prompt: {e}")

@app.post("/api/transform-image")
async def transform_image(request: TransformImageRequest, background_tasks: BackgroundTasks):
    if not os.getenv("REPLICATE_API_KEY"): raise HTTPException(status_code=500, detail="Replicate API key not configured.")
    
    job_id = str(uuid.uuid4())
    background_tasks.add_task(run_ai_transformation_task, job_id, request.imageBase64, request.prompt)
    
    return {"job_id": job_id}

@app.get("/api/job-status/{job_id}")
async def get_job_status(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

