from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any
from datetime import datetime
from .db_models import JobStatus

# --- Request Models ---

class GeneratePromptRequest(BaseModel):
    imageBase64: str
    tags: Optional[List[str]] = None
    type: str = 'solution'

class CreateGenerationRequest(BaseModel):
    imageBase64: str
    threat_tags: List[str]
    original_filename: str
    dataset: str

class GenerateSolutionRequest(BaseModel):
    solution_tags: List[str]

class SetCreatorNameRequest(BaseModel):
    name: str

# ADDED: Model for the public mobile upload endpoint
class MobileUploadRequest(BaseModel):
    imageBase64: str
    dataset: str

# ADDED: Model for the new endpoint to hide a source image
class HideImageRequest(BaseModel):
    filename: str
    dataset: str

# --- Response Models ---

class Tag(BaseModel):
    id: str
    name: str
    description: str

class GenerationInfo(BaseModel):
    id: str
    status: JobStatus
    dataset: str
    original_image_filename: str
    original_image_thumb_url: Optional[str] = None
    threat_image_url: Optional[str] = None
    threat_image_thumb_url: Optional[str] = None
    threat_prompt_text: Optional[str] = None
    threat_tags_used: Optional[List[str]] = None
    generated_image_url: Optional[str] = None
    generated_image_thumb_url: Optional[str] = None
    prompt_text: Optional[str] = None
    tags_used: Optional[List[str]] = None
    creator_name: Optional[str] = None
    votes: int
    is_visible: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class JobStatusResponse(BaseModel):
    status: JobStatus
    error: Optional[str] = None
    generation_data: Optional[GenerationInfo] = None

class JobCreationResponse(BaseModel):
    job_id: str

class PromptGenerationResponse(BaseModel):
    prompt: str
    tags_used: List[str]

class GamificationStatsResponse(BaseModel):
    happiness_score: int
    target_score: int
    deadline_iso: str
