"""
Pydantic schemas for Manager Operational Summaries, Waste Segregation,
and Safety Buffer Overrides.
"""
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

from app.models.enums import MealType


class ManagerOverviewResponse(BaseModel):
    facility_id: str
    date_range_start: str
    date_range_end: str
    # Attendance & Headcount
    total_expected_attendance: int
    total_opted_in: int
    total_opted_out: int
    attendance_rate_percent: float
    # Kitchen Production & Waste Segregation
    total_prepared_kg: float
    total_consumed_kg: float
    total_kitchen_surplus_kg: float
    total_plate_waste_kg: float
    total_food_waste_kg: float
    food_waste_percentage: float
    # Surplus Redistribution
    total_donations_created: int
    total_donations_completed: int
    total_donated_kg: float
    total_meals_redirected: int
    redistribution_diversion_rate_percent: float
    # Student Quality Feedback
    average_dish_rating: Optional[float] = None
    total_ratings_count: int


class WasteTrendItem(BaseModel):
    date: str
    prepared_kg: float
    consumed_kg: float
    surplus_kg: float
    plate_waste_kg: float
    waste_rate_percent: float


class MealTypeWasteBreakdown(BaseModel):
    meal_type: str
    prepared_kg: float
    consumed_kg: float
    surplus_kg: float
    plate_waste_kg: float


class FoodWasteSummaryResponse(BaseModel):
    facility_id: str
    date_range_start: str
    date_range_end: str
    total_prepared_kg: float
    total_consumed_kg: float
    total_kitchen_surplus_kg: float
    total_plate_waste_kg: float
    total_waste_kg: float
    waste_rate_percent: float
    daily_trends: List[WasteTrendItem]
    meal_breakdown: List[MealTypeWasteBreakdown]


class NgoRedistributionStat(BaseModel):
    ngo_id: str
    ngo_name: str
    pickups_completed: int
    total_kg_received: float
    total_meals_received: int


class DonationSummaryResponse(BaseModel):
    facility_id: str
    date_range_start: str
    date_range_end: str
    total_donations: int
    available_count: int
    claimed_count: int
    completed_count: int
    expired_count: int
    total_redistributed_kg: float
    total_meals_redistributed: int
    ngo_breakdown: List[NgoRedistributionStat]


class ForecastInputsResponse(BaseModel):
    facility_id: str
    as_of_date: str
    historical_observed_period_days: int
    average_diners_per_meal: Dict[str, float]
    average_consumption_kg_per_person: float
    current_safety_buffer_percent: float
    average_dish_popularity_rating: float
    is_historical_data: bool = True
    disclaimer: str = (
        "Observed historical parameters from persisted institutional dining logs. "
        "Predictive ML model execution is performed separately."
    )


class SafetyBufferOverrideRequest(BaseModel):
    safety_buffer_percent: float = Field(
        ...,
        ge=0.0,
        le=20.0,
        description="Safety buffer percentage between 0.0% and 20.0%",
    )
    justification: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Mandatory operational justification for buffer override audit ledger",
    )


class SafetyBufferConfigResponse(BaseModel):
    facility_id: Optional[str] = None
    current_percent: float
    min_percent: float = 0.0
    max_percent: float = 20.0
    last_updated_at: Optional[datetime] = None
    last_updated_by: Optional[str] = None
    last_justification: Optional[str] = None


class FeatureContribution(BaseModel):
    factor: str
    impact: str
    percentage: float


class ForecastRequest(BaseModel):
    facility_id: Optional[str] = None
    date: Optional[str] = Field(default=None, description="Target forecast date YYYY-MM-DD")
    meal_type: MealType = Field(default=MealType.LUNCH, description="Target meal slot")
    expected_attendance: Optional[int] = Field(default=None, ge=0, le=10000, description="Headcount or advance opt-ins")
    day_of_week: Optional[int] = Field(default=None, ge=0, le=6, description="0=Monday, 6=Sunday")
    is_holiday: bool = Field(default=False)
    is_exam_period: bool = Field(default=False)
    weather_temp: float = Field(default=24.0, ge=-20.0, le=55.0)
    is_rainy: bool = Field(default=False)
    menu_item_popularity: float = Field(default=8.5, ge=1.0, le=10.0)
    safety_buffer_percent: Optional[float] = Field(default=None, ge=0.0, le=20.0)


class ForecastResponse(BaseModel):
    facility_id: str
    meal_type: str
    date: str
    expected_attendance: int
    historical_baseline_kg: float
    ml_predicted_kg: float
    recommended_preparation_kg: float
    safety_buffer_percent: float
    safety_buffer_kg: float
    confidence_score: float
    mae_kg: float
    rmse_kg: float
    feature_contributions: List[FeatureContribution]
    is_historical_data: bool = True
    disclaimer: str = (
        "Dual-engine prediction calculated from persisted institutional dining logs, "
        "feature weights, and dynamic safety buffer cushion."
    )
    generated_at: str

