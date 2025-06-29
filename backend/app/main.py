import os
import base64
import io
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
import aiofiles
from PIL import Image
import openai
import replicate
from dotenv import load_dotenv

from .models import GeneratePromptRequest, TransformImageRequest
from .ai_prompts import system_prompt_for_flux

# Load environment variables
load_dotenv()

# --- Configuration ---
THUMBNAIL_SIZE = (400, 400)
IMAGES_DIR = Path("/app/images")
THUMBNAILS_DIR = Path("/app/thumbnails")
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.webm'}

# API Clients
openai.api_key = os.getenv("OPENAI_API_KEY")
replicate_client = replicate.Client(api_token=os.getenv("REPLICATE_API_KEY"))

# --- Helper Functions ---
def create_thumbnail(image_path: Path):
    """Creates a JPEG thumbnail for a given image, skipping unsupported formats like webm."""
    try:
        # Pillow does not support WebM, so we skip thumbnail creation for it.
        if image_path.suffix.lower() == '.webm':
            print(f"Skipping thumbnail creation for unsupported format: {image_path.name}")
            return

        if not THUMBNAILS_DIR.exists():
            THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)
        
        # Save all thumbnails as jpeg for consistency
        thumbnail_path = THUMBNAILS_DIR / f"{image_path.stem}.jpeg"
        if thumbnail_path.exists():
            return

        with Image.open(image_path) as img:
            img.thumbnail(THUMBNAIL_SIZE)
            # Convert to RGB before saving as JPEG
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            img.save(thumbnail_path, "JPEG")
            print(f"Created thumbnail for {image_path.name}")

    except Exception as e:
        print(f"Error creating thumbnail for {image_path.name}: {e}")

# --- FastAPI Lifespan Events ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # On startup: Create thumbnails for example images
    print("Application starting up...")
    if not IMAGES_DIR.exists():
        print(f"Images directory not found: {IMAGES_DIR}")
    else:
        print(f"Scanning for images in {IMAGES_DIR}...")
        for image_file in IMAGES_DIR.iterdir():
            if image_file.is_file() and image_file.suffix.lower() in ALLOWED_EXTENSIONS:
                create_thumbnail(image_file)
    yield
    # On shutdown
    print("Application shutting down.")


# --- FastAPI App Initialization ---
app = FastAPI(lifespan=lifespan)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directories
app.mount("/api/images", StaticFiles(directory=IMAGES_DIR), name="images")
app.mount("/api/thumbnails", StaticFiles(directory=THUMBNAILS_DIR), name="thumbnails")

# --- API Endpoints ---
@app.get("/api")
async def root():
    return {"message": "Almere 2075 Backend is running"}

@app.get("/api/gallery")
async def get_gallery_index():
    """
    Fetches a structured list of gallery items, including the corresponding thumbnail filename if it exists.
    """
    if not IMAGES_DIR.exists():
        return []
    try:
        gallery_data = []
        # Sort files for a consistent order
        image_files = sorted([
            f for f in IMAGES_DIR.iterdir()
            if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS
        ])

        for f in image_files:
            thumbnail_name = None
            # Only image formats supported by Pillow will have a thumbnail.
            if f.suffix.lower() != '.webm':
                thumbnail_filename = f"{f.stem}.jpeg"
                # Check if thumbnail exists before adding it to the response
                if (THUMBNAILS_DIR / thumbnail_filename).exists():
                    thumbnail_name = thumbnail_filename
            
            gallery_data.append({"filename": f.name, "thumbnail": thumbnail_name})
            
        return gallery_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-prompt")
async def generate_prompt(request: GeneratePromptRequest):
    """
    Receives a base64 image, standardizes it to PNG, and then generates a descriptive prompt via OpenAI.
    """
    if not openai.api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    
    try:
        # --- Image Standardization Step ---
        # 1. Decode the incoming base64 data URL
        header, encoded = request.imageBase64.split(",", 1)
        data = base64.b64decode(encoded)

        # 2. Open the image with Pillow
        image = Image.open(io.BytesIO(data))

        # 3. Convert to PNG (which supports transparency) and save to an in-memory buffer
        output_buffer = io.BytesIO()
        image.save(output_buffer, format="PNG")
        output_buffer.seek(0)

        # 4. Re-encode the standardized image to a new base64 string
        new_encoded_data = base64.b64encode(output_buffer.read()).decode("utf-8")
        
        # 5. Create a new data URL with the image/png MIME type
        standardized_data_url = f"data:image/png;base64,{new_encoded_data}"
        # --- End of Standardization ---

        response = openai.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": system_prompt_for_flux},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": "Generate a prompt for this image based on the system instructions."
                        },
                        {
                            "type": "image_url",
                            # 6. Use the new, standardized data URL
                            "image_url": {"url": standardized_data_url},
                        },
                    ],
                },
            ],
            max_tokens=500,
        )
        prompt = response.choices[0].message.content.strip()
        return {"prompt": prompt}
    except Exception as e:
        print(f"Error calling OpenAI: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate prompt from AI.")

@app.post("/api/transform-image")
async def transform_image(request: TransformImageRequest):
    """Receives a base64 image and a prompt, then generates a new image via Replicate."""
    if not os.getenv("REPLICATE_API_KEY"):
         raise HTTPException(status_code=500, detail="Replicate API key not configured.")

    try:
        model_name = "black-forest-labs/flux-kontext-pro"
        input_data = {
            "prompt": request.prompt,
            "input_image": request.imageBase64,
            "output_format": "png"
        }
        
        print(f"Starting Replicate prediction with model: {model_name}")
        
        prediction = replicate_client.predictions.create(
            model=model_name,
            input=input_data
        )

        print(f"Started prediction with ID: {prediction.id}. Waiting for completion...")
        
        prediction.wait()

        if prediction.status != "succeeded":
            raise ValueError(f"Prediction failed with status: {prediction.status}. Error: {prediction.error}")
        
        print(f"Prediction succeeded. Output: {prediction.output}")

        if not prediction.output or not isinstance(prediction.output, str):
            raise ValueError(f"Model returned invalid or empty output. Expected a URL string, but got: {prediction.output}")

        image_url = prediction.output
            
        return {"transformedImageUrl": image_url}
    except Exception as e:
        print(f"--- DETAILED REPLICATE ERROR ---")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Details: {e}")
        print(f"--------------------------------")
        raise HTTPException(status_code=500, detail="Failed to transform image with AI.")