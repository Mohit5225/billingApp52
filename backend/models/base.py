from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class BaseSchema(BaseModel):
    """Base class for all schemas with common configuration."""
    model_config = ConfigDict(from_attributes=True)

class TimestampSchema(BaseSchema):
    """Mix-in for schemas that include created and updated timestamps."""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
