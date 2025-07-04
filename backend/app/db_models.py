import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import enum

from .database import Base

class JobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class Generation(Base):
    __tablename__ = "generations"

    # Use a string-based UUID for compatibility with SQLite
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    status = Column(SQLAlchemyEnum(JobStatus), default=JobStatus.PENDING, nullable=False)
    # ADDED: To distinguish between weimar and almere datasets
    dataset = Column(String, nullable=False, default='weimar', server_default='weimar')
    original_image_filename = Column(String, nullable=False)
    generated_image_url = Column(String, nullable=True)
    prompt_text = Column(String, nullable=True)
    tags_used = Column(JSON, nullable=True)
    creator_name = Column(String, nullable=True)
    votes = Column(Integer, default=0, nullable=False)
    is_visible = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

