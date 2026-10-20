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
  Truck
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
    showNotification(`Surplus offer #${result.donation?.id} created & broadcast to NGO network with PIN #${result.donation?.pickupPin}!`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Toast Alert */}
      {notification && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-2xl ${
          notification.type === 'success'
            ? 'bg-[#123B2A] border-[#D8F078]/40 text-[#D8F078] shadow-glow-lime'
            : 'bg-red-950/80 border-red-500/40 text-red-200'
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

      {/* Culinary Workbench Hero Banner with Commercial Kitchen Photography */}
      <div className="relative rounded-3xl overflow-hidden border border-[#28312B] shadow-2xl">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80" 
            alt="Commercial kitchen" 
            className="w-full h-full object-cover filter brightness-40 contrast-125 opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#151916] via-[#1C221E]/90 to-transparent" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-[#A9B7A0]">
              <span>Active Headcount</span>
              <Users className="w-4 h-4 text-[#D8F078]" />
            </div>
            <div className="text-3xl font-bold font-editorial text-[#F7F5EF]">1,450 Diners</div>
            <p className="text-[11px] text-[#D8F078] font-mono">Confirmed student opt-ins</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-[#A9B7A0]">
              <span>AI Target Batch</span>
              <Scale className="w-4 h-4 text-[#D8F078]" />
            </div>
            <div className="text-3xl font-bold font-editorial text-[#D8F078]">580.0 kg</div>
            <p className="text-[11px] text-[#A9B7A0]">5 Lunch items (Safety buffer: 5%)</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-[#A9B7A0]">
              <span>Safe Surplus Offers</span>
              <Truck className="w-4 h-4 text-[#D8F078]" />
            </div>
            <div className="text-3xl font-bold font-editorial text-[#F7F5EF]">{donations.filter(d => d.status === 'AVAILABLE').length} Available</div>
            <p className="text-[11px] text-[#A9B7A0]">Broadcast to NGO network</p>
          </div>

          <div className="flex items-center justify-center">
            <button
              onClick={() => setIsSurplusModalOpen(true)}
              className="w-full py-4 px-5 rounded-2xl text-xs font-bold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] transition-all flex items-center justify-center gap-2.5 shadow-glow-lime active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Raise Surplus Alert</span>
            </button>
          </div>

        </div>
      </div>

      {/* Production & Weighing Logging Form */}
      <div className="glass-panel-elevated p-6 sm:p-8 rounded-3xl border border-[#28312B] space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#28312B]">
          <div>
            <h2 className="text-lg font-bold text-[#F7F5EF] flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-[#D8F078]" />
              <span>Record Shift Batch Metrics & Segregated Waste</span>
            </h2>
            <p className="text-xs text-[#A9B7A0]">Log prepared vs. consumed kilograms. Strictly separate edible unserved surplus from compost plate scrapings.</p>
          </div>
          <span className="text-xs font-mono text-[#D8F078] bg-[#123B2A] px-3 py-1 rounded-full border border-[#D8F078]/20">
            Digital Scale Connected
          </span>
        </div>

        <form onSubmit={handleSaveKitchenLog} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#A9B7A0]">Target Meal</label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className="w-full bg-[#151916] border border-[#28312B] rounded-xl p-2.5 text-xs text-[#F7F5EF] focus:outline-none focus:border-[#D8F078]/50"
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
              className="w-full bg-[#151916] border border-[#28312B] rounded-xl p-2.5 text-xs text-[#F7F5EF] focus:outline-none focus:border-[#D8F078]/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#A9B7A0]">Actual Prepared (kg)</label>
            <input
              type="number"
              step="0.5"
              value={actualPreparedKg}
              onChange={(e) => setActualPreparedKg(Number(e.target.value))}
              className="w-full bg-[#151916] border border-[#28312B] rounded-xl p-2.5 text-xs text-[#F7F5EF] focus:outline-none focus:border-[#D8F078]/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#A9B7A0]">Total Consumed (kg)</label>
            <input
              type="number"
              step="0.5"
              value={consumedKg}
              onChange={(e) => setConsumedKg(Number(e.target.value))}
              className="w-full bg-[#151916] border border-[#28312B] rounded-xl p-2.5 text-xs text-[#F7F5EF] focus:outline-none focus:border-[#D8F078]/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#D8F078] font-bold">
              Unserved Edible Surplus (kg)
            </label>
            <input
              type="number"
              step="0.5"
              value={kitchenSurplusKg}
              onChange={(e) => setKitchenSurplusKg(Number(e.target.value))}
              className="w-full bg-[#123B2A]/40 border border-[#D8F078]/40 rounded-xl p-2.5 text-xs text-[#D8F078] font-bold font-mono focus:outline-none"
            />
            <span className="text-[10px] text-[#A9B7A0] block">Safe for NGO redistribution</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-red-400 font-bold">
              Plate Scraps / Waste (kg)
            </label>
            <input
              type="number"
              step="0.5"
              value={plateWasteKg}
              onChange={(e) => setPlateWasteKg(Number(e.target.value))}
              className="w-full bg-red-950/20 border border-red-500/30 rounded-xl p-2.5 text-xs text-red-400 font-mono focus:outline-none"
            />
            <span className="text-[10px] text-[#A9B7A0] block">Sent exclusively to bio-compost</span>
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Log Shift Batch Metrics</span>
            </button>
          </div>

        </form>
      </div>

      {/* Active Surplus Offers & Handover Status with Photography */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#28312B] space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#28312B]">
          <h3 className="text-base font-bold text-[#F7F5EF] flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#D8F078]" />
            <span>Active Surplus Batches & Handover Tracking</span>
          </h3>
          <span className="text-xs font-mono text-[#A9B7A0]">
            Total {donations.length} records
          </span>
        </div>

        <div className="space-y-4">
          {donations.map((d) => (
            <div 
              key={d.id}
              className="p-5 rounded-2xl bg-[#151916] border border-[#28312B] hover:border-[#D8F078]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                {d.imageUrl && (
                  <img 
                    src={d.imageUrl} 
                    alt={d.foodTitle} 
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#28312B]"
                  />
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-[#D8F078]">#{d.id}</span>
                    <span className="text-sm font-bold text-[#F7F5EF]">{d.foodTitle}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      d.status === 'AVAILABLE' 
                        ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/25' 
                        : d.status === 'CLAIMED'
                          ? 'bg-amber-950/40 text-amber-300 border border-amber-500/30'
                          : 'bg-[#1C221E] text-[#A9B7A0]'
                    }`}>
                      {d.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#A9B7A0] flex flex-wrap items-center gap-3">
                    <span>Quantity: <strong className="text-[#F7F5EF] font-mono">{d.totalQuantityKg} kg</strong> (~{d.servingsCount} portions)</span>
                    <span>•</span>
                    <span>Core Temp: <strong className="text-[#D8F078] font-mono">{d.temperatureAtPackaging}°C</strong></span>
                    <span>•</span>
                    <span>Pickup Location: <strong>{d.pickupLocation}</strong></span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs font-mono text-[#A9B7A0]">Security Pickup PIN:</div>
                <div className="text-base font-mono font-bold text-[#D8F078] tracking-widest">
                  {d.pickupPin}
                </div>
                {d.claimedByNgoName && (
                  <div className="text-[11px] text-[#A9B7A0] mt-0.5">
                    Claimed by: {d.claimedByNgoName}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Create Surplus Offer */}
      {isSurplusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#1C221E] border border-[#28312B] rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#28312B]">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#D8F078]" />
                <h3 className="text-base font-bold text-[#F7F5EF]">Dispatch Edible Surplus to NGO Network</h3>
              </div>
              <button 
                onClick={() => setIsSurplusModalOpen(false)}
                className="text-[#A9B7A0] hover:text-[#F7F5EF]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSurplusOffer} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-[#A9B7A0] block mb-1">Surplus Description</label>
                <input
                  type="text"
                  value={surplusTitle}
                  onChange={(e) => setSurplusTitle(e.target.value)}
                  className="w-full bg-[#151916] border border-[#28312B] rounded-xl p-2.5 text-xs text-[#F7F5EF] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-[#A9B7A0] block mb-1">Net Weight (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={surplusQuantityKg}
                    onChange={(e) => setSurplusQuantityKg(Number(e.target.value))}
                    className="w-full bg-[#151916] border border-[#28312B] rounded-xl p-2.5 text-xs text-[#F7F5EF] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-[#A9B7A0] block mb-1">
                    Thermal Probe (°C)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={surplusTemp}
                    onChange={(e) => setSurplusTemp(Number(e.target.value))}
                    className="w-full bg-[#151916] border border-[#28312B] rounded-xl p-2.5 text-xs text-[#F7F5EF] focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-[#D8F078]">Must be &gt;= 60°C or &lt;= 8°C</span>
                </div>
              </div>

              {/* Strict Food Safety Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-[#28312B]">
                <label className="flex items-center gap-2.5 text-xs text-[#F7F5EF] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPackedClean}
                    onChange={(e) => setIsPackedClean(e.target.checked)}
                    className="rounded bg-[#151916] border-[#28312B] text-[#D8F078] focus:ring-0"
                    required
                  />
                  <span>Food is in sterile food-grade containers and handled with sanitized gloves.</span>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-red-300 cursor-pointer p-2.5 rounded-xl bg-red-950/20 border border-red-500/20">
                  <input
                    type="checkbox"
                    checked={isPlateScraps}
                    onChange={(e) => setIsPlateScraps(e.target.checked)}
                    className="rounded bg-[#151916] border-red-500/40 text-red-500 focus:ring-0 mt-0.5"
                  />
                  <div>
                    <span className="font-bold block">Contains uneaten student plate scraps?</span>
                    <span className="text-[10px] text-red-400">Warning: Checking this will permanently block this batch from donation!</span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsSurplusModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A9B7A0] hover:bg-[#28312B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D]"
                >
                  Broadcast Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
