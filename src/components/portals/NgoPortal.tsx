import React, { useState } from 'react';
import { storageService, SEED_NGOS } from '../../services/storageService';
import { SurplusDonation, NgoPartner } from '../../types';
import { 
  HeartHandshake, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  KeyRound, 
  Truck, 
  ArrowRight,
  Flame,
  Award
} from 'lucide-react';

export const NgoPortal: React.FC = () => {
  const [donations, setDonations] = useState<SurplusDonation[]>(storageService.getDonations());
  const [selectedNgo] = useState<NgoPartner>(SEED_NGOS[0]);
  const [claimStatus, setClaimStatus] = useState<{ message: string; isError: boolean } | null>(null);

  // Handover PIN state
  const [handoverDonationId, setHandoverDonationId] = useState<string | null>(null);
  const [enteredPin, setEnteredPin] = useState<string>('');

  const refreshDonations = () => {
    setDonations(storageService.getDonations());
  };

  const handleClaim = (donationId: string) => {
    const result = storageService.claimDonation(donationId, selectedNgo);
    refreshDonations();

    setClaimStatus({
      message: result.message,
      isError: !result.success
    });
    setTimeout(() => setClaimStatus(null), 5000);
  };

  const handleVerifyPinHandover = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverDonationId || !enteredPin) return;

    const result = storageService.verifyHandover(handoverDonationId, enteredPin);
    refreshDonations();

    if (result.success) {
      setHandoverDonationId(null);
      setEnteredPin('');
      setClaimStatus({ message: result.message, isError: false });
    } else {
      setClaimStatus({ message: result.message, isError: true });
    }
    setTimeout(() => setClaimStatus(null), 5000);
  };

  const availableDonations = donations.filter(d => d.status === 'AVAILABLE');
  const claimedByMe = donations.filter(d => d.claimedByNgoId === selectedNgo.id && d.status === 'CLAIMED');

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {claimStatus && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-2xl ${
          claimStatus.isError
            ? 'bg-red-950/90 border-red-500/40 text-red-200'
            : 'bg-[#123B2A] border-[#D8F078]/40 text-[#D8F078] shadow-glow-lime'
        }`}>
          <div className="flex items-center gap-2">
            {claimStatus.isError ? (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#D8F078]" />
            )}
            <span>{claimStatus.message}</span>
          </div>
        </div>
      )}

      {/* NGO Identity & Telemetry Ribbon with Distribution Photography */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="glass-panel p-5 rounded-2xl border border-[#28312B] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#A9B7A0]">Active Partner Profile</span>
            <ShieldCheck className="w-4 h-4 text-[#D8F078]" />
          </div>
          <div className="text-sm font-bold text-[#F7F5EF]">{selectedNgo.name}</div>
          <div className="text-[11px] text-[#A9B7A0] flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-[#D8F078]" />
            <span>{selectedNgo.vehicleType}</span>
          </div>
          <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/25">
            {selectedNgo.verificationBadge}
          </span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-[#28312B] flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-[#A9B7A0] uppercase">Completed Pickups</div>
            <div className="text-2xl font-bold font-editorial text-[#D8F078] mt-0.5">
              {selectedNgo.totalPickupsCompleted}
            </div>
            <p className="text-[11px] text-[#A9B7A0]">Verified at Gate 3 with PIN</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#1C221E] border border-[#28312B] flex items-center justify-center text-[#D8F078]">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-[#28312B] flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-[#A9B7A0] uppercase">Shelter Meals Delivered</div>
            <div className="text-2xl font-bold font-editorial text-[#F7F5EF] mt-0.5">
              {selectedNgo.mealsDistributed.toLocaleString()}
            </div>
            <p className="text-[11px] text-[#A9B7A0]">Dignified hot meals served</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#123B2A] border border-[#D8F078]/30 flex items-center justify-center text-[#D8F078]">
            <HeartHandshake className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Section 1: Active Claim In-Progress (Need to present PIN at kitchen) */}
      {claimedByMe.length > 0 && (
        <div className="glass-panel-elevated p-6 sm:p-8 rounded-3xl border border-[#D8F078]/40 space-y-4 shadow-card-dark">
          <div className="flex items-center justify-between pb-3 border-b border-[#28312B]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D8F078] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D8F078]"></span>
              </span>
              <h3 className="text-base font-bold text-[#F7F5EF]">Active Pickup Reserved — Driver Action Required</h3>
            </div>
            <span className="text-xs font-mono text-[#D8F078]">90-Minute Window Active</span>
          </div>

          {claimedByMe.map((d) => (
            <div key={d.id} className="p-5 rounded-2xl bg-[#151916] border border-[#28312B] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {d.imageUrl && (
                  <img 
                    src={d.imageUrl} 
                    alt={d.foodTitle} 
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#28312B]"
                  />
                )}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#D8F078] font-bold">#{d.id}</span>
                    <span className="text-base font-bold text-[#F7F5EF]">{d.foodTitle}</span>
                  </div>
                  <div className="text-xs text-[#A9B7A0] flex flex-wrap items-center gap-3">
                    <span>Net: <strong className="text-[#F7F5EF] font-mono">{d.totalQuantityKg} kg</strong> (~{d.servingsCount} portions)</span>
                    <span>•</span>
                    <span>Holding Temp: <strong className="text-[#D8F078] font-mono">{d.temperatureAtPackaging}°C</strong></span>
                    <span>•</span>
                    <span>Location: <strong className="text-[#F7F5EF]">{d.pickupLocation}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="p-3 rounded-xl bg-[#1C221E] border border-[#28312B] text-center">
                  <span className="text-[10px] font-mono text-[#A9B7A0] block">Your Pickup PIN:</span>
                  <span className="text-xl font-mono font-bold text-[#D8F078] tracking-widest">{d.pickupPin}</span>
                </div>

                <button
                  onClick={() => setHandoverDonationId(d.id)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] flex items-center gap-1.5 transition-all shadow-glow-lime active:scale-95"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Verify Handover</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Section 2: Live Available Surplus Broadcast Board with Food Previews */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#28312B] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#28312B]">
          <div>
            <h2 className="text-lg font-bold text-[#F7F5EF] flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#D8F078]" />
              <span>Available Edible Surplus Batches</span>
            </h2>
            <p className="text-xs text-[#A9B7A0]">Fresh unserved trays certified under food safety parameters. Atomic single-partner claim locks batch.</p>
          </div>
          <span className="text-xs font-mono text-[#D8F078] bg-[#123B2A] px-3 py-1 rounded-full border border-[#D8F078]/25 self-start sm:self-auto">
            {availableDonations.length} Active Offers
          </span>
        </div>

        {availableDonations.length === 0 ? (
          <div className="text-center py-12 text-[#A9B7A0] space-y-2">
            <CheckCircle2 className="w-10 h-10 text-[#687B4B] mx-auto" />
            <p className="text-sm font-semibold text-[#F7F5EF]">All Current Surplus Batches Successfully Reserved</p>
            <p className="text-xs">New unserved batches are broadcast immediately following meal shift conclusions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {availableDonations.map((d) => (
              <div 
                key={d.id}
                className="glass-panel rounded-3xl border border-[#28312B] hover:border-[#D8F078]/40 transition-all duration-300 flex flex-col justify-between overflow-hidden group shadow-lg"
              >
                {/* Dish Photo Header */}
                <div className="h-44 w-full relative overflow-hidden">
                  <img 
                    src={d.imageUrl || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'} 
                    alt={d.foodTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1C221E] via-transparent to-transparent opacity-85" />
                  
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#151916]/80 backdrop-blur-md text-[#D8F078] border border-[#D8F078]/30">
                      #{d.id}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#123B2A] text-[#F7F5EF]">
                      {d.mealType}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                    <span className="font-mono text-[#D8F078] font-bold">~{d.servingsCount} Hot Meals</span>
                    <span className="font-mono text-amber-300 text-[11px] bg-[#151916]/80 px-2 py-0.5 rounded-full">Core: {d.temperatureAtPackaging}°C</span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-base font-bold text-[#F7F5EF] group-hover:text-[#D8F078] transition-colors">
                      {d.foodTitle}
                    </h4>
                    <p className="text-xs text-[#A9B7A0] mt-1">
                      {d.kitchenFacility} — {d.pickupLocation}
                    </p>
                    <p className="text-[11px] text-[#D8F078] mt-1 font-mono">
                      Target: {d.beneficiaryTarget}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#28312B] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-[#A9B7A0] block">Surplus Weight:</span>
                      <strong className="text-base font-bold font-editorial text-[#F7F5EF]">{d.totalQuantityKg} kg</strong>
                    </div>

                    <button
                      onClick={() => handleClaim(d.id)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] flex items-center gap-2 transition-all shadow-glow-lime active:scale-95"
                    >
                      <span>Claim Donation</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Modal: Enter PIN for Handover Completion */}
      {handoverDonationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#1C221E] border border-[#28312B] rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#28312B]">
              <h3 className="text-base font-bold text-[#F7F5EF]">Kitchen Handover Verification</h3>
              <button onClick={() => setHandoverDonationId(null)} className="text-[#A9B7A0] hover:text-[#F7F5EF]">✕</button>
            </div>

            <form onSubmit={handleVerifyPinHandover} className="space-y-4">
              <p className="text-xs text-[#A9B7A0]">
                Enter the 4-digit security PIN provided in your claim token to confirm transfer from kitchen staff to your vehicle.
              </p>

              <div>
                <label className="text-xs font-mono text-[#A9B7A0] block mb-1">Enter 4-Digit Pickup PIN</label>
                <input
                  type="text"
                  maxLength={4}
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="e.g. 4829"
                  className="w-full bg-[#151916] border border-[#28312B] rounded-xl p-3 text-center text-xl font-mono font-bold tracking-widest text-[#D8F078] focus:outline-none focus:border-[#D8F078]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setHandoverDonationId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A9B7A0] hover:bg-[#28312B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D]"
                >
                  Confirm Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
