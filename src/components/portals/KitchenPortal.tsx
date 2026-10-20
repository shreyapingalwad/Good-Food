import React, { useState } from 'react';
import { storageService } from '../../services/storageService';
import { KitchenLog, SurplusDonation, MealType } from '../../types';
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
  Sparkles
} from 'lucide-react';

export const KitchenPortal: React.FC = () => {
  const [logs, setLogs] = useState<KitchenLog[]>(storageService.getKitchenLogs());
  const [donations, setDonations] = useState<SurplusDonation[]>(storageService.getDonations());
  
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

  // Status Message
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveKitchenLog = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog = storageService.addKitchenLog({
      date: new Date().toISOString().split('T')[0],
      mealType,
      dishName,
      expectedAttendance: 1450,
      recommendedKg: 118,
      actualPreparedKg: Number(actualPreparedKg),
      consumedKg: Number(consumedKg),
      kitchenSurplusKg: Number(kitchenSurplusKg),
      plateWasteKg: Number(plateWasteKg),
      recordedBy: 'Chef Rajesh Kumar',
      imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'
    });

    setLogs([newLog, ...logs]);
    showNotification(`Recorded ${mealType} production log for "${dishName}".`);
  };

  const handleCreateSurplusOffer = (e: React.FormEvent) => {
    e.preventDefault();

    const result = storageService.createDonation({
      foodTitle: surplusTitle,
      dishes: [{ name: surplusTitle, quantityKg: surplusQuantityKg }],
      totalQuantityKg: surplusQuantityKg,
      servingsCount: Math.round(surplusQuantityKg / 0.40),
      mealType,
      preparedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      temperatureAtPackaging: surplusTemp,
      isHygienicallyPacked: isPackedClean,
      isPlateLeftover: isPlateScraps as false,
      expiryDeadline: new Date(Date.now() + 105 * 60 * 1000).toISOString(),
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
    showNotification(`Surplus offer #${result.donation?.id} created & broadcast to NGO network with Security PIN #${result.donation?.pickupPin}!`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Toast Alert Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-2xl ${
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

      {/* Culinary Station Header Banner with Commercial Kitchen Photography */}
      <div className="relative rounded-3xl overflow-hidden border border-[#28312B] min-h-[170px] flex items-center shadow-card-dark">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1600&q=80" 
            alt="Stainless steel commercial kitchen workbench"
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
              Grand Central Mess — Block B Kitchen
            </h2>
            <p className="text-xs text-[#A9B7A0] mt-0.5">
              Head Chef: Rajesh Kumar • Connected Digital Scales: 3 Units Active
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
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-xs font-bold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] shadow-glow-lime flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Log Shift Batch Metrics</span>
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
          <span className="text-xs font-mono text-[#A9B7A0]">Total {donations.length} records</span>
        </div>

        <div className="space-y-4">
          {donations.map((d) => (
            <div 
              key={d.id}
              className="p-5 rounded-2xl bg-[#151916] border border-[#28312B] hover:border-[#D8F078]/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                {d.imageUrl && (
                  <img 
                    src={d.imageUrl} 
                    alt={d.foodTitle}
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
                </div>
              </div>

              {/* Security PIN Display */}
              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-[#A9B7A0] block">Security Pickup PIN:</span>
                <span className="text-xl font-mono font-bold text-[#D8F078] tracking-widest">
                  {d.pickupPin}
                </span>
                {d.claimedByNgoName && (
                  <p className="text-[11px] text-[#A9B7A0] mt-0.5">Claimed by: {d.claimedByNgoName}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dispatch Surplus Modal */}
      {isSurplusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel-elevated w-full max-w-lg rounded-3xl p-6 sm:p-8 border border-[#D8F078]/30 space-y-6 shadow-2xl">
            
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#D8F078] uppercase font-bold">Cold-Chain Protocol</span>
                <h3 className="text-xl font-editorial font-bold text-[#F7F5EF] mt-0.5">
                  Raise Verified Surplus Offer
                </h3>
                <p className="text-xs text-[#A9B7A0]">Broadcasts edible unserved trays to authorized NGO partners with a pickup PIN.</p>
              </div>
              <button
                onClick={() => setIsSurplusModalOpen(false)}
                className="p-1.5 rounded-xl bg-[#1C221E] text-[#A9B7A0] hover:text-[#F7F5EF]"
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
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] shadow-glow-lime flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Offer</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
