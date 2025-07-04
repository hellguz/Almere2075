from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any
from datetime import datetime
from .db_models import JobStatus

# --- Request Models ---

class GeneratePromptRequest(BaseModel):
    imageBase64: str
    tags: Optional[List[str]] = None

class TransformImageRequest(BaseModel):
    imageBase64: str
    prompt: str
    tags: List[str]
    original_filename: str
    # ADDED: To know which image set this transformation belongs to.
    dataset: str

class SetCreatorNameRequest(BaseModel):
    name: str

# --- Response Models ---

class Tag(BaseModel):
    id: str
    name: str
    description: str

class GenerationInfo(BaseModel):
    id: str
    status: JobStatus
    # ADDED: To filter galleries and construct correct image paths
    dataset: str
    original_image_filename: str
    generated_image_url: Optional[str] = None
    prompt_text: Optional[str] = None
    tags_used: Optional[List[str]] = None
    creator_name: Optional[str] = None
    votes: int
    is_visible: bool
    created_at: datetime

    # MODIFIED: Updated from 'orm_mode' to 'from_attributes' for Pydantic v2 compatibility.
    model_config = ConfigDict(from_attributes=True)


class JobStatusResponse(BaseModel):
    status: JobStatus
    result: Optional[str] = None # The generated image URL
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

