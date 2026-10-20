from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class DishRatingBase(BaseModel):
    dish_id: str = Field(..., max_length=64)
    dish_name: str = Field(..., max_length=255)
    rating: int = Field(..., ge=1, le=5, description="Star rating between 1 and 5")
    comment: Optional[str] = None
    student_id: str = Field(..., max_length=64)


class DishRatingCreate(DishRatingBase):
    pass


class DishRatingRead(DishRatingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
