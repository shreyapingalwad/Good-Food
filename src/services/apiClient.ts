/**
 * MessSaver Centralized Enterprise API Client
 *
 * Implements strict security & production integration standards:
 * - Credentials included (`credentials: 'include'`) for secure HttpOnly session cookies.
 * - Server-bound CSRF token header (`X-CSRF-Token`) attached to all state-changing requests.
 * - Configurable base URL via Vite environment variable `VITE_API_BASE_URL`.
 * - Typed request bodies and response schemas matching FastAPI endpoints.
 * - Normalized error handling with status codes and validation breakdown.
 * - Zero storage of authentication tokens in localStorage or sessionStorage.
 */

export interface ApiUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'student' | 'kitchen' | 'manager' | 'ngo' | 'admin';
  facility_id?: string | null;
  ngo_id?: string | null;
  permissions: string[];
  csrf_token: string;
}

export interface LoginResponse {
  message: string;
  user: ApiUser;
}

export interface DishItemPayload {
  name: string;
  quantityKg: number;
}

export interface SurplusDonationPayload {
  food_title: string;
  dishes: DishItemPayload[];
  total_quantity_kg: number;
  servings_count: number;
  meal_type: string;
  prepared_at: string;
  temperature_at_packaging: number;
  is_hygienically_packed: boolean;
  is_plate_leftover: boolean;
  expiry_deadline: string;
  pickup_location: string;
  beneficiary_target: string;
  image_url?: string;
  kitchen_facility?: string;
}

export interface SurplusDonationResponse {
  id: string;
  kitchen_facility: string;
  meal_type: string;
  food_title: string;
  dishes: { name: string; quantityKg: number }[];
  total_quantity_kg: number;
  servings_count: number;
  prepared_at: string;
  temperature_at_packaging: number;
  is_hygienically_packed: boolean;
  is_plate_leftover: boolean;
  expiry_deadline: string;
  pickup_window?: string;
  pickup_location: string;
  beneficiary_target?: string;
  status: 'AVAILABLE' | 'CLAIMED' | 'PICKED_UP' | 'COMPLETED' | 'EXPIRED';
  claimed_by_ngo_id?: string | null;
  claimed_by_ngo_name?: string | null;
  claimed_at?: string | null;
  completed_at?: string | null;
  pickup_pin?: string;
  created_at: string;
  image_url?: string;
}

export type SurplusDonationItem = SurplusDonationResponse;

export interface ForecastRequestPayload {
  facility_id?: string;
  date?: string;
  meal_type?: string;
  expected_attendance?: number;
  day_of_week?: number;
  is_holiday?: boolean;
  is_exam_period?: boolean;
  weather_temp?: number;
  is_rainy?: boolean;
  menu_item_popularity?: number;
  safety_buffer_percent?: number;
}

export interface FeatureContributionItem {
  factor: string;
  impact: string;
  percentage: number;
}

export interface ForecastResponseData {
  facility_id: string;
  meal_type: string;
  date: string;
  expected_attendance: number;
  historical_baseline_kg: number;
  baseline_kg?: number; // convenience alias
  ml_predicted_kg: number;
  recommended_preparation_kg: number;
  safety_buffer_percent: number;
  safety_buffer_kg: number;
  confidence_score: number;
  mae_kg: number;
  mae?: number; // convenience alias
  rmse_kg: number;
  feature_contributions: FeatureContributionItem[];
  is_historical_data: boolean;
  generated_at: string;
}

export type ForecastResponse = ForecastResponseData;

export interface ManagerOverviewResponse {
  facility_id: string;
  date_range_start: string;
  date_range_end: string;
  total_expected_attendance: number;
  total_opted_in: number;
  total_opted_out: number;
  attendance_rate_percent: number;
  total_prepared_kg: number;
  total_consumed_kg: number;
  total_kitchen_surplus_kg: number;
  total_plate_waste_kg: number;
  total_food_waste_kg: number;
  food_waste_percentage: number;
  total_donations_created: number;
  total_donations_completed: number;
  total_donated_kg: number;
  total_meals_redirected: number;
  redistribution_diversion_rate_percent: number;
  average_dish_rating?: number | null;
  total_ratings_count: number;
  current_safety_buffer_percent?: number;
}

export interface AuditEventItem {
  id: string;
  timestamp: string;
  actor_name: string;
  actor_role: string;
  action: string;
  details: string;
  severity: string;
}

export interface NgoPartnerItem {
  id: string;
  name: string;
  registration_number: string;
  contact_person: string;
  phone: string;
  vehicle_type: string;
  verified: boolean;
  is_active: boolean;
  total_pickups_completed: number;
  meals_distributed: number;
}

export interface SystemConfigResponse {
  attendance_cutoff_hours?: number;
  min_holding_temp_celsius?: number;
  max_holding_window_minutes?: number;
  [key: string]: any;
}

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(status: number, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

class ApiClient {
  private baseUrl: string;
  private currentCsrfToken: string | null = null;

  constructor() {
    this.baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  }

  public setCsrfToken(token: string | null): void {
    this.currentCsrfToken = token;
  }

  public getCsrfToken(): string | null {
    return this.currentCsrfToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(options.headers || {});

    // Attach Content-Type for JSON payloads
    if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Attach session CSRF token for mutating state requests
    const method = (options.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      if (this.currentCsrfToken) {
        headers.set('X-CSRF-Token', this.currentCsrfToken);
      }
    }

    // Always include credentials for HttpOnly cookie session handling
    const fetchOptions: RequestInit = {
      ...options,
      headers,
      credentials: 'include',
    };

    let response: Response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (networkError: any) {
      throw new ApiError(0, 'Unable to connect to the MessSaver backend service. Please check your network connection.');
    }

    // Parse JSON or extract text
    let data: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (err) {
        data = null;
      }
    } else {
      const text = await response.text();
      data = text ? { message: text } : null;
    }

    // Update in-memory CSRF token if returned in response
    if (data && data.user && data.user.csrf_token) {
      this.setCsrfToken(data.user.csrf_token);
    } else if (data && data.csrf_token) {
      this.setCsrfToken(data.csrf_token);
    }

    if (!response.ok) {
      const errorMessage =
        (data && (data.detail || data.message)) ||
        `Request failed with HTTP status ${response.status}`;
      throw new ApiError(response.status, errorMessage, data);
    }

    return data as T;
  }

  // ── Authentication ─────────────────────────────────────────────────────────

  public auth = {
    login: async (identifier: string, password: string): Promise<LoginResponse> => {
      const res = await this.request<LoginResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      if (res && res.user && res.user.csrf_token) {
        this.setCsrfToken(res.user.csrf_token);
      }
      return res;
    },

    me: async (): Promise<ApiUser> => {
      const res = await this.request<ApiUser>('/api/v1/auth/me', {
        method: 'GET',
      });
      if (res && res.csrf_token) {
        this.setCsrfToken(res.csrf_token);
      }
      return res;
    },

    logout: async (): Promise<{ message: string }> => {
      try {
        const res = await this.request<{ message: string }>('/api/v1/auth/logout', {
          method: 'POST',
        });
        return res;
      } finally {
        this.setCsrfToken(null);
      }
    },
  };

  // ── Student Attendance & Ratings ───────────────────────────────────────────

  public attendance = {
    getHistory: async (studentIdOrLimit?: string | number, startDate?: string, endDate?: string) => {
      const params = new URLSearchParams();
      if (typeof studentIdOrLimit === 'number') {
        params.append('limit', String(studentIdOrLimit));
      } else if (typeof studentIdOrLimit === 'string') {
        params.append('student_id', studentIdOrLimit);
      }
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await this.request<any>(`/api/v1/attendance/me${qs}`);
      return (res && res.items) ? res.items : (Array.isArray(res) ? res : []);
    },

    submit: async (
      arg1: string | { date: string; meal_type: string; attending?: boolean; status?: string },
      arg2?: string,
      arg3?: boolean
    ) => {
      let payload: { date: string; meal_type: string; attending: boolean };
      if (typeof arg1 === 'object') {
        const attending = arg1.attending !== undefined ? arg1.attending : arg1.status === 'ATTENDING';
        payload = {
          date: arg1.date,
          meal_type: arg1.meal_type,
          attending,
        };
      } else {
        payload = {
          date: arg1,
          meal_type: arg2 || 'Lunch',
          attending: arg3 !== undefined ? arg3 : true,
        };
      }
      return this.request<any>('/api/v1/attendance', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };

  public ratings = {
    getSummary: async (dishId: string) => {
      return this.request<any>(`/api/v1/ratings/dish/${encodeURIComponent(dishId)}/summary`);
    },

    submit: async (
      arg1: string | { dish_id: string; dish_name?: string; rating: number; comment?: string; comments?: string; meal_type?: string },
      arg2?: string,
      arg3?: number,
      arg4?: string
    ) => {
      let payload: { dish_id: string; dish_name: string; rating: number; comment: string | null };
      if (typeof arg1 === 'object') {
        payload = {
          dish_id: arg1.dish_id,
          dish_name: arg1.dish_name || arg1.dish_id,
          rating: arg1.rating,
          comment: arg1.comment || arg1.comments || null,
        };
      } else {
        payload = {
          dish_id: arg1,
          dish_name: arg2 || arg1,
          rating: arg3 || 5,
          comment: arg4 || null,
        };
      }
      return this.request<any>('/api/v1/ratings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };

  // ── Kitchen Operations ─────────────────────────────────────────────────────

  public kitchen = {
    getLogs: async (date?: string, facilityId?: string) => {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (facilityId) params.append('facility_id', facilityId);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return this.request<any>(`/api/v1/kitchen/logs${qs}`);
    },

    createLog: async (log: any) => {
      return this.request<any>('/api/v1/kitchen/logs', {
        method: 'POST',
        body: JSON.stringify(log),
      });
    },

    getSummary: async (facilityId?: string, date?: string) => {
      const params = new URLSearchParams();
      if (facilityId) params.append('facility_id', facilityId);
      if (date) params.append('date', date);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return this.request<any>(`/api/v1/kitchen/summary${qs}`);
    },
  };

  // ── Surplus Donations & NGO Claims ─────────────────────────────────────────

  public surplus = {
    getAvailable: async (skip = 0, limit = 50) => {
      return this.request<{ items: SurplusDonationResponse[]; total: number }>(
        `/api/v1/surplus/available?skip=${skip}&limit=${limit}`
      );
    },

    getMyFacility: async (status?: string, limit = 50, offset = 0) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('limit', String(limit));
      params.append('offset', String(offset));
      return this.request<{ items: SurplusDonationResponse[]; total: number }>(
        `/api/v1/surplus/me?${params.toString()}`
      );
    },

    getClaimedMe: async (status?: string, limit = 50, offset = 0) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('limit', String(limit));
      params.append('offset', String(offset));
      return this.request<{ items: SurplusDonationResponse[]; total: number }>(
        `/api/v1/surplus/claimed/me?${params.toString()}`
      );
    },

    getDonation: async (donationId: string) => {
      return this.request<SurplusDonationResponse>(`/api/v1/surplus/${encodeURIComponent(donationId)}`);
    },

    createDonation: async (payload: SurplusDonationPayload) => {
      return this.request<{ id: string; pickup_pin: string } & SurplusDonationResponse>('/api/v1/surplus', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    claimDonation: async (donationId: string, notes?: string) => {
      return this.request<SurplusDonationResponse>(
        `/api/v1/surplus/${encodeURIComponent(donationId)}/claim`,
        {
          method: 'POST',
          body: JSON.stringify({ notes: notes || null }),
        }
      );
    },

    verifyPickup: async (donationId: string, pin: string) => {
      return this.request<{ success: boolean; message: string } & SurplusDonationResponse>(
        `/api/v1/surplus/${encodeURIComponent(donationId)}/verify-pickup`,
        {
          method: 'POST',
          body: JSON.stringify({ pin }),
        }
      );
    },
  };

  // ── Manager Operational Analytics & Buffer Overrides ───────────────────────

  public manager = {
    getOverview: async (facilityId?: string, startDate?: string, endDate?: string): Promise<ManagerOverviewResponse> => {
      const params = new URLSearchParams();
      if (facilityId) params.append('facility_id', facilityId);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return this.request<ManagerOverviewResponse>(`/api/v1/manager/overview${qs}`);
    },

    getFoodWasteSummary: async (facilityId?: string, startDate?: string, endDate?: string) => {
      const params = new URLSearchParams();
      if (facilityId) params.append('facility_id', facilityId);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return this.request<any>(`/api/v1/manager/food-waste-summary${qs}`);
    },

    getDonationSummary: async (facilityId?: string, startDate?: string, endDate?: string) => {
      const params = new URLSearchParams();
      if (facilityId) params.append('facility_id', facilityId);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return this.request<any>(`/api/v1/manager/donation-summary${qs}`);
    },

    getForecastInputs: async (facilityId?: string) => {
      const params = new URLSearchParams();
      if (facilityId) params.append('facility_id', facilityId);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return this.request<any>(`/api/v1/manager/forecast-inputs${qs}`);
    },

    getSafetyBuffer: async (facilityId?: string) => {
      const params = new URLSearchParams();
      if (facilityId) params.append('facility_id', facilityId);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return this.request<any>(`/api/v1/manager/safety-buffer${qs}`);
    },

    overrideSafetyBuffer: async (
      arg1: number | { safety_buffer_percent: number; justification: string },
      arg2?: string
    ) => {
      let payload: { safety_buffer_percent: number; justification: string };
      if (typeof arg1 === 'object') {
        payload = arg1;
      } else {
        payload = {
          safety_buffer_percent: arg1,
          justification: arg2 || 'Operational adjustment',
        };
      }
      return this.request<any>('/api/v1/manager/safety-buffer/override', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    getAuditLogs: async (startDate?: string, endDate?: string, severity?: string, limit = 50, offset = 0) => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (severity) params.append('severity', severity);
      params.append('limit', String(limit));
      params.append('offset', String(offset));
      return this.request<any>(`/api/v1/manager/audit-logs?${params.toString()}`);
    },

    predictForecast: async (payload: ForecastRequestPayload): Promise<ForecastResponseData> => {
      const body = {
        facility_id: payload.facility_id || 'Grand Central Mess - Block B',
        meal_type: payload.meal_type || 'LUNCH',
        expected_attendance: payload.expected_attendance,
        day_of_week: payload.day_of_week,
        is_holiday: payload.is_holiday || false,
        is_exam_period: payload.is_exam_period || false,
        weather_temp: payload.weather_temp !== undefined ? payload.weather_temp : 24.0,
        is_rainy: payload.is_rainy || false,
        menu_item_popularity: payload.menu_item_popularity !== undefined ? payload.menu_item_popularity : 8.5,
        safety_buffer_percent: payload.safety_buffer_percent,
        date: payload.date,
      };
      const res = await this.request<ForecastResponseData>('/api/v1/manager/forecast/predict', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      // Attach convenience aliases if not present
      if (res && res.historical_baseline_kg !== undefined && res.baseline_kg === undefined) {
        res.baseline_kg = res.historical_baseline_kg;
      }
      if (res && res.mae_kg !== undefined && res.mae === undefined) {
        res.mae = res.mae_kg;
      }
      return res;
    },
  };

  // ── Administrator Governance ───────────────────────────────────────────────

  public admin = {
    getNgos: async (verified?: boolean, isActive?: boolean, search?: string, limit = 50, offset = 0) => {
      const params = new URLSearchParams();
      if (verified !== undefined && verified !== null) params.append('verified', String(verified));
      if (isActive !== undefined && isActive !== null) params.append('is_active', String(isActive));
      if (search) params.append('search', search);
      params.append('limit', String(limit));
      params.append('offset', String(offset));
      return this.request<{ items: NgoPartnerItem[]; total: number }>(`/api/v1/admin/ngos?${params.toString()}`);
    },

    getNgo: async (ngoId: string) => {
      return this.request<any>(`/api/v1/admin/ngos/${encodeURIComponent(ngoId)}`);
    },

    verifyNgo: async (ngoId: string, verified: boolean, badge?: string, reason?: string) => {
      return this.request<any>(`/api/v1/admin/ngos/${encodeURIComponent(ngoId)}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verified, verification_badge: badge || null, reason: reason || null }),
      });
    },

    activateNgo: async (ngoId: string, isActive: boolean, reason?: string) => {
      return this.request<any>(`/api/v1/admin/ngos/${encodeURIComponent(ngoId)}/activate`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive, reason: reason || null }),
      });
    },

    getSystemConfigs: async () => {
      return this.request<any>('/api/v1/admin/system-config');
    },

    getSystemConfig: async (key?: string) => {
      if (key) {
        return this.request<any>(`/api/v1/admin/system-config/${encodeURIComponent(key)}`);
      }
      return this.request<SystemConfigResponse>('/api/v1/admin/system-config');
    },

    updateSystemConfig: async (
      arg1: string | Record<string, any>,
      arg2?: any,
      arg3?: string
    ) => {
      if (typeof arg1 === 'object') {
        // Multi-config or key-value object update
        const promises = Object.entries(arg1).map(([k, v]) =>
          this.request<any>(`/api/v1/admin/system-config/${encodeURIComponent(k)}`, {
            method: 'PUT',
            body: JSON.stringify({ value: v, reason: 'Configured from Institutional Compliance Console' }),
          })
        );
        return Promise.all(promises);
      }
      return this.request<any>(`/api/v1/admin/system-config/${encodeURIComponent(arg1)}`, {
        method: 'PUT',
        body: JSON.stringify({ value: arg2, reason: arg3 || 'Updated via Admin Console' }),
      });
    },

    getAuditLogs: async (options: {
      startDate?: string;
      endDate?: string;
      action?: string;
      severity?: string;
      actorRole?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}) => {
      const params = new URLSearchParams();
      if (options.startDate) params.append('start_date', options.startDate);
      if (options.endDate) params.append('end_date', options.endDate);
      if (options.action) params.append('action', options.action);
      if (options.severity) params.append('severity', options.severity);
      if (options.actorRole) params.append('actor_role', options.actorRole);
      if (options.search) params.append('search', options.search);
      params.append('limit', String(options.limit || 50));
      params.append('offset', String(options.offset || 0));
      return this.request<{ items: AuditEventItem[]; total: number }>(`/api/v1/admin/audit-logs?${params.toString()}`);
    },
  };
}

export const apiClient = new ApiClient();
export default apiClient;
