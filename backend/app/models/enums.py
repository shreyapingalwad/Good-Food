import enum


class UserRole(str, enum.Enum):
    STUDENT = "student"
    KITCHEN = "kitchen"
    MANAGER = "manager"
    NGO = "ngo"
    ADMIN = "admin"


class MealType(str, enum.Enum):
    BREAKFAST = "Breakfast"
    LUNCH = "Lunch"
    SNACKS = "Snacks"
    DINNER = "Dinner"


class DonationStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    CLAIMED = "CLAIMED"
    PICKED_UP = "PICKED_UP"
    COMPLETED = "COMPLETED"
    EXPIRED = "EXPIRED"


class AuditSeverity(str, enum.Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ALERT = "alert"
