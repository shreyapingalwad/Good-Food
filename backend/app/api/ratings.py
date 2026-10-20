"""
Meal and Dish Ratings API endpoints:
- POST /api/v1/ratings: Submit feedback and star rating (1-5) for a dish
- GET /api/v1/ratings/me: Retrieve personal ratings history for authenticated student
- GET /api/v1/ratings/summary: Aggregated rating metrics for kitchen staff, managers, and admins
"""
import logging
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth_dependencies import (
    AuthenticatedUser,
    Permission,
    RequirePermission,
    RequireRole,
    get_current_user,
    require_csrf,
)
from app.core.database import get_db
from app.models.dish_rating import DishRating
from app.models.enums import UserRole
from app.schemas.dish_rating import (
    AnonymousComment,
    DishRatingSummary,
    RatingDistribution,
    RatingHistoryResponse,
    RatingResponse,
    RatingSubmitRequest,
    RatingsSummaryResponse,
)

logger = logging.getLogger("messaver.api.ratings")

router = APIRouter(tags=["Meal Ratings"])


@router.post(
    "",
    response_model=RatingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit student rating and feedback for a menu dish",
    dependencies=[Depends(require_csrf)],
)
def submit_rating(
    req: RatingSubmitRequest,
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.OWN_RATINGS_WRITE)),
    db: Session = Depends(get_db),
) -> RatingResponse:
    """
    Submits a dish rating (1 to 5 stars) with optional feedback comment.
    - Identity is derived strictly from server-side session (anti-spoofing).
    - Validates rating range [1, 5] and non-empty dish identifiers.
    - Persists rating record in an atomic transaction.
    """
    student_id = current_user.user_id

    # Create dish rating record
    new_rating = DishRating(
        dish_id=req.dish_id.strip(),
        dish_name=req.dish_name.strip(),
        rating=req.rating,
        comment=req.comment.strip() if req.comment else None,
        student_id=student_id,
    )

    db.add(new_rating)
    db.commit()
    db.refresh(new_rating)

    logger.info(
        f"Student '{student_id}' submitted rating {req.rating} for dish '{req.dish_name}' ({req.dish_id})"
    )

    return RatingResponse.model_validate(new_rating)


@router.get(
    "/me",
    response_model=RatingHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated student's personal ratings history",
)
def get_my_ratings(
    current_user: AuthenticatedUser = Depends(RequirePermission(Permission.OWN_RATINGS_WRITE)),
    db: Session = Depends(get_db),
) -> RatingHistoryResponse:
    """
    Returns only ratings submitted by the authenticated student.
    Strictly isolated; students cannot view ratings submitted by peers.
    """
    ratings = (
        db.query(DishRating)
        .filter(DishRating.student_id == current_user.user_id)
        .order_by(DishRating.created_at.desc(), DishRating.id.desc())
        .all()
    )

    return RatingHistoryResponse(
        items=[RatingResponse.model_validate(r) for r in ratings],
        total=len(ratings),
    )


@router.get(
    "/summary",
    response_model=RatingsSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get aggregated dish rating metrics for kitchen, managers, and admins",
)
def get_ratings_summary(
    dish_id: Optional[str] = Query(None, description="Optional dish identifier filter"),
    current_user: AuthenticatedUser = Depends(
        RequireRole(UserRole.KITCHEN, UserRole.MANAGER, UserRole.ADMIN)
    ),
    db: Session = Depends(get_db),
) -> RatingsSummaryResponse:
    """
    Returns aggregated feedback metrics across dishes for culinary and operational review.
    - Accessible only by Kitchen, Manager, and Admin roles.
    - Protects student privacy: comments are aggregated anonymously without student IDs.
    """
    query = db.query(DishRating)
    if dish_id and dish_id.strip():
        query = query.filter(DishRating.dish_id == dish_id.strip())

    all_ratings = query.order_by(DishRating.created_at.desc()).all()

    # Aggregate by dish_id
    grouped_data: dict[str, dict] = defaultdict(
        lambda: {"dish_name": "", "ratings": [], "comments": []}
    )

    for r in all_ratings:
        d = grouped_data[r.dish_id]
        if not d["dish_name"]:
            d["dish_name"] = r.dish_name
        d["ratings"].append(r.rating)
        if r.comment and len(d["comments"]) < 10:
            d["comments"].append(
                AnonymousComment(
                    rating=r.rating,
                    comment=r.comment,
                    created_at=r.created_at,
                )
            )

    summaries: list[DishRatingSummary] = []
    for d_id, data in grouped_data.items():
        ratings_list = data["ratings"]
        total = len(ratings_list)
        avg = round(sum(ratings_list) / total, 2) if total > 0 else 0.0

        dist = RatingDistribution(
            one_star=ratings_list.count(1),
            two_star=ratings_list.count(2),
            three_star=ratings_list.count(3),
            four_star=ratings_list.count(4),
            five_star=ratings_list.count(5),
        )

        summaries.append(
            DishRatingSummary(
                dish_id=d_id,
                dish_name=data["dish_name"] or d_id,
                avg_rating=avg,
                total_ratings=total,
                distribution=dist,
                recent_comments=data["comments"],
            )
        )

    # Sort by total ratings descending
    summaries.sort(key=lambda s: s.total_ratings, reverse=True)

    return RatingsSummaryResponse(
        summaries=summaries,
        total_dishes_rated=len(summaries),
        total_feedback_count=len(all_ratings),
    )
