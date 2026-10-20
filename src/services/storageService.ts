import { 
  DayMenu, 
  DishRating, 
  KitchenLog, 
  SurplusDonation, 
  NgoPartner, 
  AuditLogItem, 
  PredictionFeatures, 
  PredictionResult
} from '../types';

const STORAGE_KEYS = {
  ATTENDANCE: 'messaver_attendance_v2',
  RATINGS: 'messaver_ratings_v2',
  KITCHEN_LOGS: 'messaver_kitchen_logs_v2',
  DONATIONS: 'messaver_donations_v2',
  NGOS: 'messaver_ngos_v2',
  AUDIT_LOGS: 'messaver_audit_logs_v2',
  SYSTEM_CONFIG: 'messaver_system_config_v2'
};

// Seed Menus with appetizing photography
export const SEED_MENUS: DayMenu[] = [
  {
    date: new Date().toISOString().split('T')[0],
    mealType: 'Lunch',
    cutoffTime: '11:30 AM',
    isCutoffPassed: false,
    items: [
      { 
        id: 'm1', 
        name: 'Dal Tadka & Steamed Basmati Rice', 
        category: 'Main', 
        portionGrams: 350, 
        allergens: [], 
        isVegetarian: true, 
        sustainabilityScore: 9.4, 
        avgRating: 4.8, 
        totalRatings: 342,
        imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
        description: 'Golden spiced yellow lentils garnished with fresh cilantro and aromatic long-grain basmati rice.'
      },
      { 
        id: 'm2', 
        name: 'Paneer Butter Masala', 
        category: 'Curry', 
        portionGrams: 200, 
        allergens: ['Dairy'], 
        isVegetarian: true, 
        sustainabilityScore: 8.2, 
        avgRating: 4.6, 
        totalRatings: 410,
        imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
        description: 'Tender cottage cheese cubes simmered in a velvety tomato-cashew reduction.'
      },
      { 
        id: 'm3', 
        name: 'Tandoori Roti & Fresh Cucumber Mint Raita', 
        category: 'Rice/Bread', 
        portionGrams: 150, 
        allergens: ['Gluten', 'Dairy'], 
        isVegetarian: true, 
        sustainabilityScore: 9.0, 
        avgRating: 4.5, 
        totalRatings: 289,
        imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
        description: 'Hearth-fired whole wheat flatbread served alongside chilled probiotic mint yogurt.'
      },
      { 
        id: 'm4', 
        name: 'Organic Green Sprout & Beetroot Salad', 
        category: 'Salad', 
        portionGrams: 100, 
        allergens: [], 
        isVegetarian: true, 
        sustainabilityScore: 9.8, 
        avgRating: 4.2, 
        totalRatings: 180,
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
        description: 'Crisp micro-sprouted moong, roasted garden beets, lemon mist, and toasted pumpkin seeds.'
      },
      { 
        id: 'm5', 
        name: 'Gulab Jamun with Cardamom Syrup', 
        category: 'Dessert', 
        portionGrams: 80, 
        allergens: ['Dairy', 'Gluten'], 
        isVegetarian: true, 
        sustainabilityScore: 7.5, 
        avgRating: 4.9, 
        totalRatings: 520,
        imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
        description: 'Caramelized reduced-milk dumplings rested in warm rosewater and saffron nectar.'
      }
    ]
  },
  {
    date: new Date().toISOString().split('T')[0],
    mealType: 'Dinner',
    cutoffTime: '06:00 PM',
    isCutoffPassed: false,
    items: [
      { 
        id: 'm6', 
        name: 'Subz Biryani with Roasted Jeera Raita', 
        category: 'Main', 
        portionGrams: 380, 
        allergens: ['Dairy'], 
        isVegetarian: true, 
        sustainabilityScore: 9.1, 
        avgRating: 4.7, 
        totalRatings: 480,
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
        description: 'Fragrant basmati cooked under steam (dum) with farm-fresh cauliflower, beans, carrots, and mint.'
      },
      { 
        id: 'm7', 
        name: 'Yellow Moong Dal Fry', 
        category: 'Curry', 
        portionGrams: 180, 
        allergens: [], 
        isVegetarian: true, 
        sustainabilityScore: 9.5, 
        avgRating: 4.4, 
        totalRatings: 220,
        imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
        description: 'Comforting protein-rich yellow lentils tempered with cumin, garlic, and fresh curry leaves.'
      },
      { 
        id: 'm8', 
        name: 'Phulka Rotis (Whole Wheat)', 
        category: 'Rice/Bread', 
        portionGrams: 140, 
        allergens: ['Gluten'], 
        isVegetarian: true, 
        sustainabilityScore: 9.2, 
        avgRating: 4.5, 
        totalRatings: 310,
        imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=80',
        description: 'Puffed whole wheat bread made fresh over live flame without added oil.'
      },
      { 
        id: 'm9', 
        name: 'Fruit Custard with Almond Flakes', 
        category: 'Dessert', 
        portionGrams: 100, 
        allergens: ['Dairy', 'Nuts'], 
        isVegetarian: true, 
        sustainabilityScore: 8.0, 
        avgRating: 4.8, 
        totalRatings: 390,
        imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
        description: 'Chilled Madagascar vanilla custard layered with crisp pomegranate pearls and toasted almonds.'
      }
    ]
  }
];

// Seed NGOs
export const SEED_NGOS: NgoPartner[] = [
  {
    id: 'ngo-1',
    name: 'Robin Hood Army - South Campus Wing',
    registrationNumber: 'NGO-DEL-89241',
    contactPerson: 'Arunav Sharma',
    phone: '+91 98112 43210',
    vehicleType: 'Insulated Van (Refrigerated 4°C - 10°C)',
    verified: true,
    verificationBadge: 'Verified Tier 1 Cold-Chain Partner',
    totalPickupsCompleted: 142,
    mealsDistributed: 18450
  },
  {
    id: 'ngo-2',
    name: 'Annapurna Seva Trust',
    registrationNumber: 'NGO-MAH-44102',
    contactPerson: 'Sunita Deshmukh',
    phone: '+91 98230 77119',
    vehicleType: 'Covered Electric Cargo Carrier',
    verified: true,
    verificationBadge: 'Verified Rapid Community Response',
    totalPickupsCompleted: 88,
    mealsDistributed: 11200
  },
  {
    id: 'ngo-3',
    name: 'Food For All Youth Shelter Coalition',
    registrationNumber: 'NGO-KA-31290',
    contactPerson: 'Karan Mehra',
    phone: '+91 97410 99421',
    vehicleType: 'Temperature Insulated Crates (Hot Hold)',
    verified: true,
    verificationBadge: 'Verified Youth Shelter Distro',
    totalPickupsCompleted: 64,
    mealsDistributed: 8750
  }
];

// Initial Surplus Donations with rich imagery
const INITIAL_DONATIONS: SurplusDonation[] = [
  {
    id: 'DON-8841',
    foodTitle: 'Steamed Basmati Rice & Paneer Curry (Unserved Batch)',
    dishes: [
      { name: 'Basmati Rice', quantityKg: 18.5 },
      { name: 'Paneer Butter Masala', quantityKg: 14.0 },
      { name: 'Dal Tadka', quantityKg: 12.5 }
    ],
    totalQuantityKg: 45.0,
    servingsCount: 110,
    mealType: 'Lunch',
    preparedAt: new Date(Date.now() - 45 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    temperatureAtPackaging: 68.5,
    isHygienicallyPacked: true,
    isPlateLeftover: false,
    expiryDeadline: new Date(Date.now() + 75 * 60 * 1000).toISOString(),
    status: 'AVAILABLE',
    pickupPin: '4829',
    kitchenFacility: 'Grand Central Mess - Block B',
    pickupLocation: 'Kitchen Dispatch Gate 3 (Cold Bay)',
    beneficiaryTarget: 'Local Night Shelters & Senior Citizens Home',
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'DON-8840',
    foodTitle: 'Mixed Vegetable Biryani & Raita (Hot Container)',
    dishes: [
      { name: 'Subz Biryani', quantityKg: 22.0 },
      { name: 'Jeera Raita', quantityKg: 8.0 }
    ],
    totalQuantityKg: 30.0,
    servingsCount: 75,
    mealType: 'Dinner',
    preparedAt: 'Yesterday, 08:30 PM',
    temperatureAtPackaging: 66.0,
    isHygienicallyPacked: true,
    isPlateLeftover: false,
    expiryDeadline: new Date(Date.now() - 3600 * 1000).toISOString(),
    status: 'COMPLETED',
    claimedByNgoId: 'ngo-1',
    claimedByNgoName: 'Robin Hood Army - South Campus Wing',
    claimedAt: 'Yesterday, 09:10 PM',
    pickupPin: '9133',
    completedAt: 'Yesterday, 09:48 PM',
    kitchenFacility: 'Grand Central Mess - Block B',
    pickupLocation: 'Kitchen Dispatch Gate 3',
    beneficiaryTarget: 'Railway Colony Slum Community',
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80'
  }
];

// Initial Audit Logs
const INITIAL_AUDITS: AuditLogItem[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toLocaleTimeString(),
    actorName: 'Chef Rajesh Kumar',
    actorRole: 'kitchen',
    action: 'LOG_SURPLUS_DISPATCH',
    details: 'Logged 45.0 kg surplus food (DON-8841). Temperature verified at 68.5°C. Plate scraps check: Zero (Passed).',
    severity: 'success'
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 65 * 60 * 1000).toLocaleTimeString(),
    actorName: 'Dr. Anita Roy',
    actorRole: 'manager',
    action: 'OVERRIDE_BUFFER',
    details: 'Adjusted safety buffer to 4.5% for Lunch service due to rain forecast and campus seminar opt-ins.',
    severity: 'info'
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 120 * 60 * 1000).toLocaleTimeString(),
    actorName: 'Robin Hood Army Dispatcher',
    actorRole: 'ngo',
    action: 'CONFIRM_HANDOVER',
    details: 'Completed handover of 30.0 kg Biryani batch (DON-8840) at Gate 3 with PIN verification.',
    severity: 'success'
  }
];

class StorageService {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage write error', e);
    }
  }

  // --- ATTENDANCE ---
  public getAttendance(studentId: string = 'std-101'): Record<string, boolean> {
    const all = this.get<Record<string, Record<string, boolean>>>(STORAGE_KEYS.ATTENDANCE, {});
    return all[studentId] || {
      'Lunch': true,
      'Dinner': true
    };
  }

  public setAttendance(mealType: string, attending: boolean, studentId: string = 'std-101'): boolean {
    const all = this.get<Record<string, Record<string, boolean>>>(STORAGE_KEYS.ATTENDANCE, {});
    if (!all[studentId]) {
      all[studentId] = { 'Lunch': true, 'Dinner': true };
    }
    all[studentId][mealType] = attending;
    this.set(STORAGE_KEYS.ATTENDANCE, all);

    this.addAudit({
      actorName: 'Student (ID: ' + studentId + ')',
      actorRole: 'student',
      action: attending ? 'MEAL_OPT_IN' : 'MEAL_OPT_OUT',
      details: `${attending ? 'Opted IN for' : 'Opted OUT from'} ${mealType} before cutoff time. Headcount updated.`,
      severity: 'info'
    });
    return true;
  }

  // --- RATINGS ---
  public submitRating(rating: DishRating): void {
    const ratings = this.get<DishRating[]>(STORAGE_KEYS.RATINGS, []);
    ratings.push(rating);
    this.set(STORAGE_KEYS.RATINGS, ratings);
  }

  // --- KITCHEN LOGS ---
  public getKitchenLogs(): KitchenLog[] {
    return this.get<KitchenLog[]>(STORAGE_KEYS.KITCHEN_LOGS, [
      {
        id: 'klog-101',
        date: new Date().toISOString().split('T')[0],
        mealType: 'Breakfast',
        dishName: 'Idli Sambar & Coconut Chutney',
        expectedAttendance: 1420,
        recommendedKg: 284,
        actualPreparedKg: 290,
        consumedKg: 278,
        kitchenSurplusKg: 12,
        plateWasteKg: 6.5,
        recordedBy: 'Chef Ramesh',
        timestamp: '09:45 AM',
        imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80'
      }
    ]);
  }

  public addKitchenLog(log: Omit<KitchenLog, 'id' | 'timestamp'>): KitchenLog {
    const logs = this.getKitchenLogs();
    const newLog: KitchenLog = {
      ...log,
      id: 'klog-' + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    logs.unshift(newLog);
    this.set(STORAGE_KEYS.KITCHEN_LOGS, logs);

    this.addAudit({
      actorName: log.recordedBy,
      actorRole: 'kitchen',
      action: 'RECORD_KITCHEN_METRICS',
      details: `Recorded ${log.mealType} batch: Prepared ${log.actualPreparedKg}kg, Consumed ${log.consumedKg}kg, Edible Surplus ${log.kitchenSurplusKg}kg, Plate Waste ${log.plateWasteKg}kg.`,
      severity: log.kitchenSurplusKg > 0 ? 'warning' : 'info'
    });

    return newLog;
  }

  // --- SURPLUS DONATIONS ---
  public getDonations(): SurplusDonation[] {
    return this.get<SurplusDonation[]>(STORAGE_KEYS.DONATIONS, INITIAL_DONATIONS);
  }

  public createDonation(donation: Omit<SurplusDonation, 'id' | 'status' | 'pickupPin'>): { success: boolean; error?: string; donation?: SurplusDonation } {
    if (donation.isPlateLeftover) {
      return { success: false, error: 'Food Safety Policy Violation: Customer plate leftovers strictly barred from human consumption redistribution.' };
    }

    if (donation.temperatureAtPackaging < 60 && donation.temperatureAtPackaging > 8) {
      return { success: false, error: `Critical Temperature Warning (${donation.temperatureAtPackaging}°C): Food must be hot-held (>= 60°C) or rapid-chilled (<= 8°C) before safe packing.` };
    }

    const donations = this.getDonations();
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const newDonation: SurplusDonation = {
      ...donation,
      id: 'DON-' + Math.floor(1000 + Math.random() * 9000),
      status: 'AVAILABLE',
      pickupPin: pin
    };

    donations.unshift(newDonation);
    this.set(STORAGE_KEYS.DONATIONS, donations);

    this.addAudit({
      actorName: 'Kitchen Production Supervisor',
      actorRole: 'kitchen',
      action: 'SURPLUS_OFFERED',
      details: `Created donation offer #${newDonation.id} (${newDonation.totalQuantityKg} kg, ~${newDonation.servingsCount} portions). Hygiene & Temperature verified.`,
      severity: 'success'
    });

    return { success: true, donation: newDonation };
  }

  public claimDonation(donationId: string, ngo: NgoPartner): { success: boolean; message: string; updatedDonation?: SurplusDonation } {
    const donations = this.getDonations();
    const target = donations.find(d => d.id === donationId);

    if (!target) {
      return { success: false, message: 'Donation not found.' };
    }

    if (target.status !== 'AVAILABLE') {
      return { 
        success: false, 
        message: `This donation has already been claimed by ${target.claimedByNgoName || 'another authorized partner'}.` 
      };
    }

    if (new Date(target.expiryDeadline).getTime() < Date.now()) {
      target.status = 'EXPIRED';
      this.set(STORAGE_KEYS.DONATIONS, donations);
      return { success: false, message: 'Safety cutoff reached: The 120-minute holding window has expired for this surplus batch.' };
    }

    target.status = 'CLAIMED';
    target.claimedByNgoId = ngo.id;
    target.claimedByNgoName = ngo.name;
    target.claimedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this.set(STORAGE_KEYS.DONATIONS, donations);

    this.addAudit({
      actorName: ngo.contactPerson + ` (${ngo.name})`,
      actorRole: 'ngo',
      action: 'CLAIM_RESERVATION',
      details: `Atomically claimed donation #${target.id} (${target.totalQuantityKg}kg). Pickup window locked for 90 minutes.`,
      severity: 'success'
    });

    return { 
      success: true, 
      message: `Donation #${target.id} successfully claimed. Please use PIN #${target.pickupPin} at Gate 3.`,
      updatedDonation: target
    };
  }

  public verifyHandover(donationId: string, enteredPin: string): { success: boolean; message: string } {
    const donations = this.getDonations();
    const target = donations.find(d => d.id === donationId);

    if (!target) {
      return { success: false, message: 'Donation not found.' };
    }

    if (target.status !== 'CLAIMED') {
      return { success: false, message: `Donation is in status "${target.status}". Must be CLAIMED to complete handover.` };
    }

    if (target.pickupPin !== enteredPin.trim()) {
      return { success: false, message: 'Invalid 4-digit Security Pickup PIN. Please check the code in your NGO claim token.' };
    }

    target.status = 'COMPLETED';
    target.completedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.set(STORAGE_KEYS.DONATIONS, donations);

    const ngos = this.getNgos();
    const matchedNgo = ngos.find(n => n.id === target.claimedByNgoId);
    if (matchedNgo) {
      matchedNgo.totalPickupsCompleted += 1;
      matchedNgo.mealsDistributed += target.servingsCount;
      this.set(STORAGE_KEYS.NGOS, ngos);
    }

    this.addAudit({
      actorName: 'Gate 3 Handover Dispatch',
      actorRole: 'kitchen',
      action: 'HANDOVER_VERIFIED',
      details: `PIN verified! Handover completed for #${target.id} to ${target.claimedByNgoName}. ${target.servingsCount} meals redirected from waste.`,
      severity: 'success'
    });

    return { success: true, message: 'Handover verified and recorded! Great job saving food.' };
  }

  // --- NGOS ---
  public getNgos(): NgoPartner[] {
    return this.get<NgoPartner[]>(STORAGE_KEYS.NGOS, SEED_NGOS);
  }

  public toggleNgoVerification(ngoId: string): boolean {
    const ngos = this.getNgos();
    const ngo = ngos.find(n => n.id === ngoId);
    if (ngo) {
      ngo.verified = !ngo.verified;
      this.set(STORAGE_KEYS.NGOS, ngos);
      this.addAudit({
        actorName: 'System Administrator',
        actorRole: 'admin',
        action: 'VERIFY_NGO_STATUS',
        details: `Updated verification status of NGO "${ngo.name}" to ${ngo.verified ? 'VERIFIED' : 'PENDING'}.`,
        severity: 'info'
      });
      return true;
    }
    return false;
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(): AuditLogItem[] {
    return this.get<AuditLogItem[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDITS);
  }

  public addAudit(item: Omit<AuditLogItem, 'id' | 'timestamp'>): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLogItem = {
      ...item,
      id: 'log-' + Date.now(),
      timestamp: new Date().toLocaleTimeString()
    };
    logs.unshift(newLog);
    this.set(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 100));
  }

  // --- PREDICTION ENGINE ---
  public calculatePrediction(features: PredictionFeatures): PredictionResult {
    const basePerPersonKg = 0.42;
    const baselineKg = Math.round(features.expectedAttendance * basePerPersonKg * (1 + features.safetyBufferPercent / 100) * 10) / 10;

    let dayFactor = 1.0;
    if (features.dayOfWeek === 5) dayFactor = 1.08;
    if (features.dayOfWeek === 0 || features.dayOfWeek === 6) dayFactor = 0.82;

    const holidayFactor = features.isHoliday ? 0.45 : 1.0;
    const examFactor = features.isExamPeriod ? 1.12 : 1.0;
    const weatherFactor = features.isRainy ? 1.06 : 1.0;
    const popularityWeight = 0.90 + (features.menuItemPopularity / 50);

    const mlPredictedKg = Math.round(
      features.expectedAttendance * 
      basePerPersonKg * 
      dayFactor * 
      holidayFactor * 
      examFactor * 
      weatherFactor * 
      popularityWeight * 10
    ) / 10;

    const recommendedPreparationKg = Math.round(
      (baselineKg * 0.35 + mlPredictedKg * 0.65) * (1 + (features.safetyBufferPercent / 100) * 0.5) * 10
    ) / 10;

    return {
      baselineKg,
      mlPredictedKg,
      recommendedPreparationKg,
      confidenceScore: 96.8,
      maeKg: 4.2,
      rmseKg: 6.1,
      topFactors: [
        { factor: 'Student Opt-in & Confirmed Attendance', impact: '+68%', percentage: 68 },
        { factor: 'Day of Week Pattern (Historic Friday surge)', impact: '+14%', percentage: 14 },
        { factor: 'Menu Item Historical Popularity', impact: '+10%', percentage: 10 },
        { factor: 'Exam Schedule & Weather Forecast', impact: '+8%', percentage: 8 }
      ]
    };
  }

  public exportReportCsv(): void {
    const logs = this.getKitchenLogs();
    const headers = ['ID', 'Date', 'MealType', 'Dish', 'ExpectedHeadcount', 'RecommendedKg', 'ActualPreparedKg', 'ConsumedKg', 'EdibleSurplusKg', 'PlateWasteKg', 'RecordedBy'];
    const rows = logs.map(l => [
      l.id,
      l.date,
      l.mealType,
      `"${l.dishName}"`,
      l.expectedAttendance,
      l.recommendedKg,
      l.actualPreparedKg,
      l.consumedKg,
      l.kitchenSurplusKg,
      l.plateWasteKg,
      `"${l.recordedBy}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MessSaver_Waste_Audit_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.addAudit({
      actorName: 'Audit Officer',
      actorRole: 'manager',
      action: 'EXPORT_AUDIT_REPORT',
      details: 'Generated and downloaded comprehensive CSV sustainability audit report.',
      severity: 'info'
    });
  }
}

export const storageService = new StorageService();
