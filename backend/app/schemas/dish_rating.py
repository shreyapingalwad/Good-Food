"""
Pydantic schemas for meal and dish ratings.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class RatingSubmitRequest(BaseModel):
    """
    Client request to submit a dish rating.
    Student identity is derived strictly from the server-side session.
    """
    dish_id: str = Field(
        ...,
        min_length=1,
        max_length=64,
        description="Menu item identifier (e.g. 'm1', 'm2')",
    )
    dish_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Human-readable dish name",
    )
    rating: int = Field(
        ...,
        ge=1,
        le=5,
        description="Rating from 1 to 5 stars",
    )
    comment: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Optional feedback comment",
    )


class DishRatingBase(BaseModel):
    dish_id: str = Field(..., max_length=64)
    dish_name: str = Field(..., max_length=255)
    rating: int = Field(..., ge=1, le=5, description="Star rating between 1 and 5")
    comment: Optional[str] = None
    student_id: Optional[str] = Field(default=None, max_length=64)


class DishRatingCreate(DishRatingBase):
    pass


class RatingResponse(BaseModel):
    """
    Representation of an individual dish rating record.
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    dish_id: str
    dish_name: str
    rating: int
    comment: Optional[str] = None
    student_id: str
    created_at: datetime


class DishRatingRead(RatingResponse):
    pass


class RatingHistoryResponse(BaseModel):
    """
    List of ratings submitted by the authenticated student.
    """
    items: list[RatingResponse]
    total: int


class RatingDistribution(BaseModel):
    """Star breakdown counts."""
    one_star: int = 0
    two_star: int = 0
    three_star: int = 0
    four_star: int = 0
    five_star: int = 0


class AnonymousComment(BaseModel):
    """Anonymous feedback comment for staff review without student identification."""
    rating: int
    comment: str
    created_at: datetime


class DishRatingSummary(BaseModel):
    """Aggregated ratings for an individual dish."""
    dish_id: str
    dish_name: str
    avg_rating: float
    total_ratings: int
    distribution: RatingDistribution
    recent_comments: list[AnonymousComment] = Field(default_factory=list)


class RatingsSummaryResponse(BaseModel):
    """
    Aggregated rating statistics for staff review.
    """
    summaries: list[DishRatingSummary]
    total_dishes_rated: int
    total_feedback_count: int
