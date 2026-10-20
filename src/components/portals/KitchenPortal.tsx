import React, { useState, useEffect } from 'react';
import { OptimizedImage } from '../common/OptimizedImage';
import { storageService } from '../../services/storageService';
import { KitchenLog, SurplusDonation, MealType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { apiClient, ApiError, SurplusDonationItem } from '../../services/apiClient';
import { 
  ChefHat, 
  Users, 
  Scale, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Flame,
  Truck,
  Thermometer,
  ShieldAlert,
  Clock,
  Sparkles,
  Info,
  Loader2,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

export const KitchenPortal: React.FC = () => {
  const { user, isAuthenticated, switchDevRole } = useAuth();
  const [logs, setLogs] = useState<KitchenLog[]>(storageService.getKitchenLogs());
  const [donations, setDonations] = useState<SurplusDonation[]>(storageService.getDonations());
  const [isLoadingDonations, setIsLoadingDonations] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Quick Log State
  const [mealType, setMealType] = useState<MealType>('Lunch');
  const [dishName, setDishName] = useState<string>('Dal Tadka & Steamed Basmati Rice');
  const [actualPreparedKg, setActualPreparedKg] = useState<number>(120);
  const [consumedKg, setConsumedKg] = useState<number>(108);
  const [kitchenSurplusKg, setKitchenSurplusKg] = useState<number>(12);
  const [plateWasteKg, setPlateWasteKg] = useState<number>(4.5);

  // Dispatch Surplus Modal
  const [isSurplusModalOpen, setIsSurplusModalOpen] = useState<boolean>(false);
  const [surplusTitle, setSurplusTitle] = useState<string>('Dal Tadka & Steamed Basmati Rice (Unserved Gastronorm)');
  const [surplusQuantityKg, setSurplusQuantityKg] = useState<number>(12.0);
  const [surplusTemp, setSurplusTemp] = useState<number>(68.0);
  const [isPlateScraps, setIsPlateScraps] = useState<boolean>(false);
  const [isPackedClean, setIsPackedClean] = useState<boolean>(true);

  // Newly created PIN notification
  const [latestCreatedPin, setLatestCreatedPin] = useState<{ id: string; pin: string } | null>(null);

  // Handover PIN Verification State (Kitchen verifying NGO driver)
  const [verifyingDonationId, setVerifyingDonationId] = useState<string | null>(null);
  const [driverPin, setDriverPin] = useState<string>('');
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  // Status Message
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch real facility donations from backend
  const loadFacilityDonations = async () => {
    if (!isAuthenticated || user?.role !== 'kitchen') return;
    setIsLoadingDonations(true);
    try {
      const res = await apiClient.surplus.getMyFacility();
      if (res && res.items) {
        // Map backend donation items to UI format
        const mapped: SurplusDonation[] = res.items.map((item: SurplusDonationItem) => ({
          id: item.id,
          foodTitle: item.food_title,
          dishes: item.dishes,
          totalQuantityKg: item.total_quantity_kg,
          servingsCount: item.servings_count,
          mealType: (item.meal_type.charAt(0).toUpperCase() + item.meal_type.slice(1).toLowerCase()) as MealType,
          preparedAt: item.prepared_at,
          temperatureAtPackaging: item.temperature_at_packaging,
          isHygienicallyPacked: item.is_hygienically_packed,
          isPlateLeftover: false as const,
          expiryDeadline: item.expiry_deadline,
          status: item.status as 'AVAILABLE' | 'CLAIMED' | 'COMPLETED' | 'EXPIRED',
          pickupPin: '••••',
          kitchenFacility: item.kitchen_facility,
          pickupLocation: item.pickup_location,
          beneficiaryTarget: item.beneficiary_target,
          claimedByNgoId: item.claimed_by_ngo_id,
          claimedByNgoName: item.claimed_by_ngo_name,
          claimedAt: item.claimed_at,
          completedAt: item.completed_at,
          createdAt: item.created_at,
          imageUrl: item.image_url || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'
        }));
        setDonations(mapped);
      }
    } catch (err) {
      console.warn('Could not load backend facility donations:', err);
    } finally {
      setIsLoadingDonations(false);
    }
  };

  useEffect(() => {
    loadFacilityDonations();
  }, [isAuthenticated, user]);

  const handleSaveKitchenLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const mealTypeUpper = mealType.toUpperCase() as 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER';
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      if (isAuthenticated && user?.role === 'kitchen') {
        await apiClient.kitchen.createLog({
          date: todayStr,
          meal_type: mealTypeUpper,
          dish_name: dishName,
          headcount_actual: 1450,
          portions_prepared: Math.round(Number(actualPreparedKg) * 2.5),
          portions_consumed: Math.round(Number(consumedKg) * 2.5),
          portions_leftover: Math.round((Number(kitchenSurplusKg) + Number(plateWasteKg)) * 2.5),
          leftover_handling: kitchenSurplusKg > 0 ? 'SURPLUS_OFFERED' : 'COMPOSTED',
          notes: `Plate waste: ${plateWasteKg}kg, Unserved surplus: ${kitchenSurplusKg}kg`
        });
        showNotification(`Logged shift metrics for "${dishName}" to backend kitchen database.`);
      } else {
        const newLog = storageService.addKitchenLog({
          date: todayStr,
          mealType,
          dishName,
          expectedAttendance: 1450,
          recommendedKg: 118,
          actualPreparedKg: Number(actualPreparedKg),
          consumedKg: Number(consumedKg),
          kitchenSurplusKg: Number(kitchenSurplusKg),
          plateWasteKg: Number(plateWasteKg),
          recordedBy: user?.full_name || 'Chef Rajesh Kumar',
          imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'
        });
        setLogs([newLog, ...logs]);
        showNotification(`Recorded ${mealType} production log for "${dishName}". Sign in as Chef to sync backend.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to record kitchen log on backend.';
      showNotification(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSurplusOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPlateScraps) {
      showNotification('Food safety violation: Plate scrapings are prohibited from human donation.', 'error');
      return;
    }

    if (surplusTemp > 8.0 && surplusTemp < 60.0) {
      showNotification(`Food safety violation: Temp ${surplusTemp}°C is in the bacterial danger zone (8°C - 60°C).`, 'error');
      return;
    }

    setIsSubmitting(true);
    const mealTypeUpper = mealType.toUpperCase() as 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER';
    const expiryIso = new Date(Date.now() + 105 * 60 * 1000).toISOString();

    try {
      if (isAuthenticated && user?.role === 'kitchen') {
        const res = await apiClient.surplus.createDonation({
          food_title: surplusTitle,
          dishes: [{ name: surplusTitle, quantityKg: surplusQuantityKg }],
          total_quantity_kg: surplusQuantityKg,
          servings_count: Math.round(surplusQuantityKg / 0.40),
          meal_type: mealTypeUpper,
          prepared_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temperature_at_packaging: surplusTemp,
          is_hygienically_packed: isPackedClean,
          is_plate_leftover: false,
          expiry_deadline: expiryIso,
          pickup_location: 'Kitchen Dispatch Gate 3',
          beneficiary_target: 'Verified Local Shelter Partners',
          image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'
        });

        setIsSurplusModalOpen(false);
        setLatestCreatedPin({ id: res.id, pin: res.pickup_pin || '••••' });
        showNotification(`Surplus offer #${res.id} created & broadcast to NGO network! One-time Security PIN: #${res.pickup_pin}`);
        await loadFacilityDonations();
      } else {
        const result = storageService.createDonation({
          foodTitle: surplusTitle,
          dishes: [{ name: surplusTitle, quantityKg: surplusQuantityKg }],
          totalQuantityKg: surplusQuantityKg,
          servingsCount: Math.round(surplusQuantityKg / 0.40),
          mealType,
          preparedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temperatureAtPackaging: surplusTemp,
          isHygienicallyPacked: isPackedClean,
          isPlateLeftover: false,
          expiryDeadline: expiryIso,
          kitchenFacility: 'Grand Central Mess - Block B',
          pickupLocation: 'Kitchen Dispatch Gate 3',
          beneficiaryTarget: 'Verified Local Shelter Partners',
          imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'
        });

        if (!result.success) {
          showNotification(result.error || 'Failed to dispatch surplus offer.', 'error');
          return;
        }

        setDonations(storageService.getDonations());
        setIsSurplusModalOpen(false);
        showNotification(`Preview: Surplus offer #${result.donation?.id} created with Security PIN #${result.donation?.pickupPin}!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create surplus donation.';
      showNotification(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyDriverHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingDonationId || !driverPin) return;

    setIsVerifyingPin(true);
    try {
      if (isAuthenticated && user?.role === 'kitchen') {
        const res = await apiClient.surplus.verifyPickup(verifyingDonationId, driverPin);
        setVerifyingDonationId(null);
        setDriverPin('');
        showNotification(res.message || `Handover verified for offer #${verifyingDonationId}!`);
        await loadFacilityDonations();
      } else {
        const result = storageService.verifyHandover(verifyingDonationId, driverPin);
        if (result.success) {
          setVerifyingDonationId(null);
          setDriverPin('');
          setDonations(storageService.getDonations());
          showNotification(result.message);
        } else {
          showNotification(result.message, 'error');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Invalid pickup PIN or verification failed.';
      showNotification(msg, 'error');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Toast Alert Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-2xl animate-in fade-in ${
          notification.type === 'success'
            ? 'bg-[#123B2A] border-[#D8F078]/40 text-[#D8F078] shadow-glow-lime'
            : 'bg-red-950/90 border-red-500/40 text-red-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#D8F078]" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Role Banner if not logged in as kitchen */}
      {(!isAuthenticated || user?.role !== 'kitchen') && (
        <div className="p-4 rounded-2xl bg-[#1C221E] border border-[#28312B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#A9B7A0]">
            <Info className="w-4 h-4 text-[#D8F078] shrink-0" />
            <span>
              {isAuthenticated
                ? `Logged in as ${user?.role} (${user?.username}). Connect with a Kitchen profile to record production logs and dispatch verified surplus.`
                : 'Browsing portal in live preview mode. Sign in to connect with live kitchen database.'}
            </span>
          </div>
          <button
            onClick={() => switchDevRole('kitchen')}
            className="px-3.5 py-1.5 rounded-xl bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30 font-semibold text-[11px] hover:bg-[#123B2A]/80 transition-all shrink-0"
          >
            Authenticate as chef_rajesh
          </button>
        </div>
      )}

      {/* Security PIN Handover Notice Card */}
      {latestCreatedPin && (
        <div className="p-6 rounded-3xl bg-[#123B2A] border-2 border-[#D8F078] text-[#F7F5EF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-glow-lime animate-in fade-in">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-[#D8F078] uppercase font-bold tracking-wider">
              Cryptographic Gate Verification PIN Generated
            </span>
            <div className="text-base font-bold">
              Offer #{latestCreatedPin.id} Dispatched to NGO Network
            </div>
            <p className="text-xs text-[#A9B7A0]">
              Give this 4-digit PIN to the verified NGO driver at Gate 3 upon container inspection.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#151916] border border-[#D8F078]/50 text-center shrink-0">
            <span className="text-[10px] font-mono text-[#A9B7A0] block">ONE-TIME PICKUP PIN:</span>
            <span className="text-3xl font-mono font-bold text-[#D8F078] tracking-widest">
              {latestCreatedPin.pin}
            </span>
          </div>
        </div>
      )}

      {/* Culinary Station Header Banner with Commercial Kitchen Photography */}
      <div className="relative rounded-3xl overflow-hidden border border-[#28312B] min-h-[170px] flex items-center shadow-card-dark">
        <div className="absolute inset-0 z-0">
          <OptimizedImage 
            src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1600&q=80" 
            alt="Stainless steel commercial kitchen workbench"
            width={1600}
            height={300}
            className="w-full h-full object-cover filter brightness-[0.38] contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#151916] via-[#151916]/85 to-transparent" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#123B2A] border border-[#D8F078]/30 text-xs font-mono text-[#D8F078] mb-2">
              <ChefHat className="w-3.5 h-3.5" />
              <span>Shift: Lunch Service (11:30 AM - 02:30 PM)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#F7F5EF]">
              {user?.facility_id || 'Grand Central Mess — Block B Kitchen'}
            </h2>
            <p className="text-xs text-[#A9B7A0] mt-0.5">
              Head Chef: {user?.full_name || 'Rajesh Kumar'} • Connected Digital Scales: 3 Units Active
            </p>
          </div>

          <button
            onClick={() => setIsSurplusModalOpen(true)}
            className="px-5 py-3 rounded-2xl text-xs font-bold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] shadow-glow-lime flex items-center gap-2 self-start sm:self-auto transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Raise Surplus Alert</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Operations Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Active Opt-in Headcount */}
        <div className="glass-panel p-6 rounded-3xl border border-[#28312B] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono text-[#A9B7A0] uppercase tracking-wider">Active Headcount</span>
            <div className="text-3xl font-bold font-editorial text-[#F7F5EF]">1,450 Diners</div>
            <p className="text-xs text-[#A9B7A0]">Confirmed via student opt-ins</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#1C221E] border border-[#28312B] flex items-center justify-center text-[#D8F078]">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* AI Target Batch Recommendation */}
        <div className="glass-panel p-6 rounded-3xl border border-[#28312B] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono text-[#A9B7A0] uppercase tracking-wider">AI Target Batch</span>
            <div className="text-3xl font-bold font-editorial text-[#D8F078]">580.0 kg</div>
            <p className="text-xs text-[#A9B7A0]">Across 5 lunch items (buffer: 5%)</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#123B2A] border border-[#D8F078]/30 flex items-center justify-center text-[#D8F078] shadow-glow-lime">
            <Scale className="w-6 h-6" />
          </div>
        </div>

        {/* Safe Surplus Available */}
        <div className="glass-panel p-6 rounded-3xl border border-[#28312B] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono text-[#A9B7A0] uppercase tracking-wider">Safe Surplus Offers</span>
            <div className="text-3xl font-bold font-editorial text-[#F7F5EF]">
              {donations.filter(d => d.status === 'AVAILABLE').length} Available
            </div>
            <p className="text-xs text-[#A9B7A0]">Broadcast to verified NGO network</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#1C221E] border border-[#28312B] flex items-center justify-center text-[#D8F078]">
            <Truck className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Production Metrics & Waste Segregation Form */}
      <div className="glass-panel p-8 rounded-3xl border border-[#28312B] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#28312B]">
          <div>
            <h3 className="text-lg font-bold text-[#F7F5EF] flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-[#D8F078]" />
              <span>Record Shift Batch Metrics & Segregated Waste</span>
            </h3>
            <p className="text-xs text-[#A9B7A0]">
              Log prepared vs. consumed kilograms. Strictly separate edible unserved surplus from compost plate scrapings.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#123B2A] border border-[#D8F078]/25 text-xs font-mono text-[#D8F078]">
            <span className="w-2 h-2 rounded-full bg-[#D8F078] animate-ping" />
            <span>Digital Scale Connected</span>
          </div>
        </div>

        <form onSubmit={handleSaveKitchenLog} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#A9B7A0]">Target Meal</label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value as MealType)}
                className="w-full p-3.5 rounded-2xl bg-[#151916] border border-[#28312B] text-xs text-[#F7F5EF] focus:border-[#D8F078] focus:outline-none"
              >
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Snacks">Snacks</option>
                <option value="Dinner">Dinner</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#A9B7A0]">Dish Description</label>
              <input
                type="text"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-[#151916] border border-[#28312B] text-xs text-[#F7F5EF] focus:border-[#D8F078] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#A9B7A0]">Actual Prepared (kg)</label>
              <input
                type="number"
                step="0.5"
                value={actualPreparedKg}
                onChange={(e) => setActualPreparedKg(Number(e.target.value))}
                className="w-full p-3.5 rounded-2xl bg-[#151916] border border-[#28312B] text-xs text-[#F7F5EF] focus:border-[#D8F078] focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#A9B7A0]">Total Consumed (kg)</label>
              <input
                type="number"
                step="0.5"
                value={consumedKg}
                onChange={(e) => setConsumedKg(Number(e.target.value))}
                className="w-full p-3.5 rounded-2xl bg-[#151916] border border-[#28312B] text-xs text-[#F7F5EF] focus:border-[#D8F078] focus:outline-none font-mono"
              />
            </div>

          </div>

          {/* Strict Segregation Callout Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            <div className="p-4 rounded-2xl bg-[#123B2A]/30 border border-[#D8F078]/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#D8F078]">Unserved Edible Surplus (kg)</span>
                <span className="text-[10px] font-mono text-[#D8F078] bg-[#123B2A] px-2 py-0.5 rounded-full border border-[#D8F078]/25">
                  Safe for NGO Redistribution
                </span>
              </div>
              <input
                type="number"
                step="0.5"
                value={kitchenSurplusKg}
                onChange={(e) => setKitchenSurplusKg(Number(e.target.value))}
                className="w-full p-3 rounded-xl bg-[#151916] border border-[#D8F078]/40 text-sm font-mono font-bold text-[#D8F078] focus:outline-none"
              />
              <p className="text-[11px] text-[#A9B7A0]">Remaining in kitchen hotel pans; strictly untouched by diners.</p>
            </div>

            <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/25 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-300">Plate Scraps / Waste (kg)</span>
                <span className="text-[10px] font-mono text-red-400 bg-red-950 px-2 py-0.5 rounded-full border border-red-500/25">
                  Sent to Bio-Compost Only
                </span>
              </div>
              <input
                type="number"
                step="0.5"
                value={plateWasteKg}
                onChange={(e) => setPlateWasteKg(Number(e.target.value))}
                className="w-full p-3 rounded-xl bg-[#151916] border border-red-500/30 text-sm font-mono font-bold text-red-300 focus:outline-none"
              />
              <p className="text-[11px] text-[#A9B7A0]">Uneaten customer portions scraped from plates; legally prohibited from human donation.</p>
            </div>

          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-xs font-bold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] shadow-glow-lime flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{isSubmitting ? 'Recording Metrics...' : 'Log Shift Batch Metrics'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Active Surplus Batches & Handover Tracking */}
      <div className="glass-panel p-8 rounded-3xl border border-[#28312B] space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#28312B]">
          <div>
            <h3 className="text-lg font-bold text-[#F7F5EF] flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#D8F078]" />
              <span>Active Surplus Batches & Handover Tracking</span>
            </h3>
            <p className="text-xs text-[#A9B7A0]">Surplus offers currently available or claimed by local shelter partners.</p>
          </div>
          <div className="flex items-center gap-3">
            {isLoadingDonations && <Loader2 className="w-4 h-4 text-[#D8F078] animate-spin" />}
            <span className="text-xs font-mono text-[#A9B7A0]">Total {donations.length} records</span>
          </div>
        </div>

        <div className="space-y-4">
          {donations.map((d) => (
            <div 
              key={d.id}
              className="p-5 rounded-2xl bg-[#151916] border border-[#28312B] hover:border-[#D8F078]/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                {d.imageUrl && (
                  <OptimizedImage 
                    src={d.imageUrl} 
                    alt={d.foodTitle}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#28312B]"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#D8F078]">#{d.id}</span>
                    <span className="text-sm font-bold text-[#F7F5EF]">{d.foodTitle}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      d.status === 'AVAILABLE'
                        ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/25'
                        : d.status === 'CLAIMED'
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        : d.status === 'COMPLETED'
                        ? 'bg-[#123B2A]/60 text-[#D8F078] border border-[#D8F078]/25'
                        : 'bg-[#28312B] text-[#A9B7A0]'
                    }`}>
                      {d.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#A9B7A0] mt-1 flex flex-wrap items-center gap-3 font-mono">
                    <span>Quantity: <strong>{d.totalQuantityKg} kg</strong> (~{d.servingsCount} portions)</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[#D8F078]">
                      <Thermometer className="w-3.5 h-3.5" />
                      Core Temp: {d.temperatureAtPackaging}°C
                    </span>
                    <span>•</span>
                    <span>Pickup Location: {d.pickupLocation}</span>
                  </div>
                  {d.claimedByNgoName && (
                    <div className="text-xs font-mono text-amber-300 mt-1 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Claimed by: <strong>{d.claimedByNgoName}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Handover & Action Buttons */}
              <div className="flex items-center gap-4 shrink-0">
                {d.status === 'CLAIMED' ? (
                  <button
                    onClick={() => {
                      setVerifyingDonationId(d.id);
                      setDriverPin('');
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] shadow-glow-lime flex items-center gap-2 transition-all active:scale-95"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Verify Driver PIN</span>
                  </button>
                ) : d.status === 'COMPLETED' ? (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-[#D8F078] px-3 py-1.5 rounded-xl bg-[#123B2A]/40 border border-[#D8F078]/20">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Handed Over & Verified</span>
                  </div>
                ) : (
                  <span className="text-xs font-mono text-[#A9B7A0] px-3 py-1.5 rounded-xl bg-[#1C221E] border border-[#28312B]">
                    Awaiting NGO Claim
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dispatch Surplus Modal */}
      {isSurplusModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="surplus-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSurplusModalOpen(false);
          }}
        >
          <div className="glass-panel-elevated w-full max-w-lg rounded-3xl p-6 sm:p-8 border border-[#D8F078]/30 space-y-6 shadow-2xl">
            
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#D8F078] uppercase font-bold">Cold-Chain Protocol</span>
                <h3 id="surplus-modal-title" className="text-xl font-editorial font-bold text-[#F7F5EF] mt-0.5">
                  Raise Verified Surplus Offer
                </h3>
                <p className="text-xs text-[#A9B7A0]">Broadcasts edible unserved trays to authorized NGO partners with a pickup PIN.</p>
              </div>
              <button
                onClick={() => setIsSurplusModalOpen(false)}
                aria-label="Close surplus offer modal"
                className="p-1.5 rounded-xl bg-[#1C221E] text-[#A9B7A0] hover:text-[#F7F5EF] focus-visible:ring-2 focus-visible:ring-[#D8F078] focus-visible:outline-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSurplusOffer} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-mono text-[#A9B7A0]">Food Batch Description</label>
                <input
                  type="text"
                  value={surplusTitle}
                  onChange={(e) => setSurplusTitle(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#151916] border border-[#28312B] text-xs text-[#F7F5EF] focus:border-[#D8F078] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-[#A9B7A0]">Quantity (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={surplusQuantityKg}
                    onChange={(e) => setSurplusQuantityKg(Number(e.target.value))}
                    className="w-full p-3 rounded-xl bg-[#151916] border border-[#28312B] text-xs text-[#F7F5EF] focus:border-[#D8F078] focus:outline-none font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-[#A9B7A0]">Core Probe Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={surplusTemp}
                    onChange={(e) => setSurplusTemp(Number(e.target.value))}
                    className="w-full p-3 rounded-xl bg-[#151916] border border-[#28312B] text-xs text-[#F7F5EF] focus:border-[#D8F078] focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>

              {/* Safety Compliance Checklist */}
              <div className="p-4 rounded-2xl bg-[#151916] border border-[#28312B] space-y-3">
                <div className="text-[11px] font-mono font-bold text-[#D8F078] uppercase">
                  Safety Mandates Verification:
                </div>
                
                <label className="flex items-center gap-2.5 text-xs text-[#F7F5EF] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPackedClean}
                    onChange={(e) => setIsPackedClean(e.target.checked)}
                    className="w-4 h-4 rounded text-[#D8F078] bg-[#1C221E] border-[#28312B]"
                  />
                  <span>Sealed in food-grade, sanitized gastronorm containers</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-red-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPlateScraps}
                    onChange={(e) => setIsPlateScraps(e.target.checked)}
                    className="w-4 h-4 rounded text-red-500 bg-[#1C221E] border-[#28312B]"
                  />
                  <span>Flag as plate scrapings (blocks donation creation)</span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsSurplusModalOpen(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold bg-[#1C221E] text-[#A9B7A0] hover:text-[#F7F5EF] border border-[#28312B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] shadow-glow-lime flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{isSubmitting ? 'Broadcasting...' : 'Dispatch Offer'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Driver PIN Handover Modal (Kitchen verifying NGO driver) */}
      {verifyingDonationId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="driver-pin-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setVerifyingDonationId(null);
          }}
        >
          <div className="glass-panel-elevated w-full max-w-md rounded-3xl p-6 sm:p-8 border border-[#D8F078]/30 space-y-6 shadow-2xl">
            
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#D8F078] uppercase font-bold">Gate 3 Dispatch Bay</span>
                <h3 id="driver-pin-modal-title" className="text-xl font-editorial font-bold text-[#F7F5EF] mt-0.5">
                  Verify Driver Pickup PIN
                </h3>
                <p className="text-xs text-[#A9B7A0]">
                  Enter the 4-digit security PIN provided by the NGO driver for Offer #{verifyingDonationId}.
                </p>
              </div>
              <button
                onClick={() => setVerifyingDonationId(null)}
                aria-label="Close driver PIN dialog"
                className="p-1.5 rounded-xl bg-[#1C221E] text-[#A9B7A0] hover:text-[#F7F5EF]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVerifyDriverHandover} className="space-y-5">
              <div className="space-y-2 text-center py-2">
                <label className="text-xs font-mono text-[#A9B7A0] block">
                  Driver's 4-Digit Pickup PIN:
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={driverPin}
                  onChange={(e) => setDriverPin(e.target.value)}
                  placeholder="• • • •"
                  className="w-40 mx-auto text-center p-3.5 rounded-2xl bg-[#151916] border border-[#D8F078]/50 text-2xl font-mono font-bold text-[#D8F078] tracking-widest focus:outline-none focus:border-[#D8F078] shadow-inner"
                  required
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#151916] border border-[#28312B] text-[11px] text-[#A9B7A0] space-y-1">
                <div className="font-bold text-[#F7F5EF] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D8F078]" />
                  <span>Server Cryptographic Handshake</span>
                </div>
                <p>Verifies collector credentials against bcrypt pepper hash in backend database.</p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyingDonationId(null)}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold bg-[#1C221E] text-[#A9B7A0] hover:text-[#F7F5EF] border border-[#28312B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingPin}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] shadow-glow-lime flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isVerifyingPin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{isVerifyingPin ? 'Verifying...' : 'Verify & Handover'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
