export type UserRole = 'student' | 'kitchen' | 'manager' | 'ngo' | 'admin';

export type MealType = 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';

export interface MenuItem {
  id: string;
  name: string;
  category: 'Main' | 'Curry' | 'Rice/Bread' | 'Dessert' | 'Salad';
  portionGrams: number;
  allergens: string[];
  isVegetarian: boolean;
  sustainabilityScore: number; // 1-10
  avgRating: number;
  totalRatings: number;
  imageUrl?: string;
  description?: string;
}

export interface DayMenu {
  date: string;
  mealType: MealType;
  items: MenuItem[];
  cutoffTime: string; // ISO string or relative time
  isCutoffPassed: boolean;
}

export interface StudentAttendance {
  studentId: string;
  studentName: string;
  date: string;
  mealType: MealType;
  attending: boolean;
  updatedAt: string;
}

export interface DishRating {
  dishId: string;
  dishName: string;
  rating: number; // 1-5
  comment?: string;
  studentId: string;
  timestamp: string;
}

export interface KitchenLog {
  id: string;
  date: string;
  mealType: MealType;
  dishName: string;
  expectedAttendance: number;
  recommendedKg: number;
  actualPreparedKg: number;
  consumedKg: number;
  kitchenSurplusKg: number; // Unserved, edible, food-safe
  plateWasteKg: number; // Customer leftovers, strictly non-edible/compost only
  notes?: string;
  recordedBy: string;
  timestamp: string;
  imageUrl?: string;
}

export type DonationStatus = 'AVAILABLE' | 'CLAIMED' | 'PICKED_UP' | 'COMPLETED' | 'EXPIRED';

export interface SurplusDonation {
  id: string;
  foodTitle: string;
  dishes: { name: string; quantityKg: number }[];
  totalQuantityKg: number;
  servingsCount: number;
  mealType: MealType;
  preparedAt: string;
  temperatureAtPackaging: number; // Celsius (e.g., 68°C hot holding)
  isHygienicallyPacked: boolean;
  isPlateLeftover: false; // Strict guarantee: NEVER true for donations
  expiryDeadline: string; // ISO string: 90 to 120 mins from log
  status: DonationStatus;
  claimedByNgoId?: string;
  claimedByNgoName?: string;
  claimedAt?: string;
  pickupPin: string; // 4-digit handover confirmation pin
  completedAt?: string;
  kitchenFacility: string;
  pickupLocation: string;
  beneficiaryTarget: string;
  imageUrl?: string;
}

export interface NgoPartner {
  id: string;
  name: string;
  registrationNumber: string;
  contactPerson: string;
  phone: string;
  vehicleType: string;
  verified: boolean;
  verificationBadge: string;
  totalPickupsCompleted: number;
  mealsDistributed: number;
  logoUrl?: string;
}

export interface PredictionFeatures {
  expectedAttendance: number;
  dayOfWeek: number; // 0-6
  isHoliday: boolean;
  isExamPeriod: boolean;
  weatherTemp: number;
  isRainy: boolean;
  menuItemPopularity: number; // 1-10
  safetyBufferPercent: number; // 0-20%
}

export interface PredictionResult {
  baselineKg: number;
  mlPredictedKg: number;
  recommendedPreparationKg: number;
  confidenceScore: number; // e.g. 96.4%
  maeKg: number; // Mean Absolute Error
  rmseKg: number;
  topFactors: { factor: string; impact: string; percentage: number }[];
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  details: string;
  severity: 'info' | 'success' | 'warning' | 'alert';
}
