from sqlalchemy import CheckConstraint, Column, DateTime, Integer, String, Text, func
from app.models.base import Base


class DishRating(Base):
    """
    Dish Rating model.
    Captures student feedback on specific menu items (1 to 5 stars).
    Constrained to valid rating range [1, 5].
    """
    __tablename__ = "dish_ratings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dish_id = Column(String(64), nullable=False, index=True)
    dish_name = Column(String(255), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    student_id = Column(String(64), nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_dish_rating_1_to_5"),
    )

    def __repr__(self) -> str:
        return f"<DishRating {self.dish_name} ({self.rating}/5) by {self.student_id}>"
