"""
Pydantic schemas for Manager Operational Summaries, Waste Segregation,
and Safety Buffer Overrides.
"""
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


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
