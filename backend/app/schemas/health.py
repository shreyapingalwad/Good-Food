from typing import Optional
from pydantic import BaseModel, Field


class LivenessResponse(BaseModel):
    status: str = Field(..., example="ok")
    app: str = Field(..., example="MessSaver Backend API")
    version: str = Field(default="1.0.0")


class ReadinessResponse(BaseModel):
    status: str = Field(..., example="ready")
    database: str = Field(..., example="connected")
    environment: str = Field(default="development")
    message: Optional[str] = None
