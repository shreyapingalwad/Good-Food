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
  Award,
  Clock,
  MapPin,
  Thermometer,
  Lock,
  Sparkles
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
  const completedByMe = donations.filter(d => d.claimedByNgoId === selectedNgo.id && d.status === 'COMPLETED');

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Toast Notification Alert */}
      {claimStatus && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-2xl ${
          claimStatus.isError
            ? 'bg-red-950/90 border-red-500/40 text-red-200'
            : 'bg-[#123B2A] border-[#D8F078]/40 text-[#D8F078] shadow-glow-lime'
        }`}>
          <div className="flex items-center gap-2.5">
            {claimStatus.isError ? (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#D8F078]" />
            )}
            <span>{claimStatus.message}</span>
          </div>
        </div>
      )}

      {/* NGO Identity & Telemetry Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Organization Profile Card */}
        <div className="glass-panel p-6 rounded-3xl border border-[#28312B] flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#123B2A] border border-[#D8F078]/30 flex items-center justify-center text-[#D8F078] shadow-glow-lime shrink-0">
            <HeartHandshake className="w-7 h-7" />
          </div>
          <div>
            <div className="text-base font-bold text-[#F7F5EF] leading-tight">
              {selectedNgo.name}
            </div>
            <div className="text-xs text-[#A9B7A0] flex items-center gap-1.5 mt-0.5">
              <Truck className="w-3.5 h-3.5 text-[#D8F078]" />
              <span>{selectedNgo.vehicleType}</span>
            </div>
            <span className="inline-block mt-1.5 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/25 font-bold">
              {selectedNgo.verificationBadge}
            </span>
          </div>
        </div>

        {/* Total Deliveries */}
        <div className="glass-panel p-6 rounded-3xl border border-[#28312B] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono text-[#A9B7A0] uppercase tracking-wider">Completed Pickups</span>
            <div className="text-3xl font-bold font-editorial text-[#F7F5EF]">
              {selectedNgo.totalPickupsCompleted + completedByMe.length}
            </div>
            <p className="text-xs text-[#A9B7A0]">Audited cold-chain handovers</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#1C221E] border border-[#28312B] flex items-center justify-center text-[#D8F078]">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* Meals Nourished */}
        <div className="glass-panel p-6 rounded-3xl border border-[#28312B] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono text-[#A9B7A0] uppercase tracking-wider">Community Meals Fed</span>
            <div className="text-3xl font-bold font-editorial text-[#D8F078]">
              {(selectedNgo.mealsDistributed + completedByMe.reduce((acc, c) => acc + c.servingsCount, 0)).toLocaleString()}
            </div>
            <p className="text-xs text-[#A9B7A0]">Distributed to partner shelters</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#123B2A] border border-[#D8F078]/30 flex items-center justify-center text-[#D8F078] shadow-glow-lime">
            <Award className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Available Surplus Discovery Feed */}
      <div className="glass-panel p-8 rounded-3xl border border-[#28312B] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#28312B]">
          <div>
            <h3 className="text-lg font-bold text-[#F7F5EF] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D8F078]" />
              <span>Available Surplus Broadcasts ({availableDonations.length})</span>
            </h3>
            <p className="text-xs text-[#A9B7A0]">
              Sanitary, unserved kitchen trays available for immediate shelter collection under 90-minute safety limits.
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/25 font-bold">
            Atomic Single-Claim Protected
          </span>
        </div>

        {availableDonations.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#151916] border border-[#28312B] space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#D8F078] mx-auto" />
            <h4 className="text-base font-bold text-[#F7F5EF]">All Surplus Successfully Claimed</h4>
            <p className="text-xs text-[#A9B7A0] max-w-md mx-auto">
              There are no unclaimed food batches currently waiting at kitchen dispatch bays.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {availableDonations.map((d) => (
              <div 
                key={d.id}
                className="rounded-3xl bg-[#151916] border border-[#28312B] hover:border-[#D8F078]/40 transition-all overflow-hidden flex flex-col justify-between shadow-card-dark group"
              >
                {/* Food Image Banner */}
                <div className="relative h-44 w-full overflow-hidden bg-[#1C221E]">
                  <img 
                    src={d.imageUrl || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'} 
                    alt={d.foodTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151916] via-transparent to-transparent opacity-80" />
                  
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#123B2A]/90 text-[#D8F078] border border-[#D8F078]/30 font-bold">
                      #{d.id} • AVAILABLE
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 text-xs font-mono text-[#F7F5EF] bg-[#123B2A]/90 px-2.5 py-0.5 rounded-lg border border-[#D8F078]/20">
                    Quantity: {d.totalQuantityKg} kg (~{d.servingsCount} servings)
                  </div>
                </div>

                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h4 className="text-base font-bold text-[#F7F5EF] leading-snug">
                      {d.foodTitle}
                    </h4>

                    {/* Operational Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-1">
                      <div className="p-2.5 rounded-xl bg-[#1C221E] border border-[#28312B]">
                        <span className="text-[10px] text-[#A9B7A0] block">Packaging Temp:</span>
                        <span className="text-xs font-bold text-[#D8F078] flex items-center gap-1 mt-0.5">
                          <Thermometer className="w-3.5 h-3.5" />
                          {d.temperatureAtPackaging}°C Verified
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#1C221E] border border-[#28312B]">
                        <span className="text-[10px] text-[#A9B7A0] block">Dispatch Bay:</span>
                        <span className="text-xs font-bold text-[#F7F5EF] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-[#D8F078]" />
                          Gate 3 Bay
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-amber-300 pt-1">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Safety Window: 90 Minutes from Packing</span>
                    </div>
                  </div>

                  {/* Claim Action CTA */}
                  <div className="pt-3 border-t border-[#28312B] flex items-center justify-between">
                    <span className="text-xs text-[#A9B7A0]">One-click atomic lock</span>
                    <button
                      onClick={() => handleClaim(d.id)}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] shadow-glow-lime flex items-center gap-2 transition-all active:scale-95"
                    >
                      <HeartHandshake className="w-4 h-4" />
                      <span>Claim Donation Batch</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Claimed by Us: Collection & PIN Verification Bay */}
      {claimedByMe.length > 0 && (
        <div className="glass-panel p-8 rounded-3xl border border-[#D8F078]/30 space-y-6 shadow-glow-forest">
          <div className="flex items-center justify-between pb-4 border-b border-[#28312B]">
            <div>
              <h3 className="text-lg font-bold text-[#F7F5EF] flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#D8F078]" />
                <span>Reserved for Pickup ({claimedByMe.length})</span>
              </h3>
              <p className="text-xs text-[#A9B7A0]">
                Dispatched driver must present the 4-digit security PIN at Gate 3 to confirm physical custody handover.
              </p>
            </div>
            <span className="text-xs font-mono text-amber-300 animate-pulse font-bold">
              Pickup En-Route
            </span>
          </div>

          <div className="space-y-4">
            {claimedByMe.map((d) => (
              <div 
                key={d.id}
                className="p-6 rounded-2xl bg-[#151916] border border-[#D8F078]/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#D8F078]">#{d.id}</span>
                    <span className="text-base font-bold text-[#F7F5EF]">{d.foodTitle}</span>
                  </div>
                  <div className="text-xs text-[#A9B7A0] mt-1 font-mono">
                    {d.totalQuantityKg} kg (~{d.servingsCount} portions) • Location: {d.pickupLocation}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setHandoverDonationId(d.id)}
                    className="px-6 py-3 rounded-xl text-xs font-bold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] shadow-glow-lime flex items-center gap-2 transition-all active:scale-95"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Verify Physical Handover</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PIN Handover Verification Modal */}
      {handoverDonationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel-elevated w-full max-w-md rounded-3xl p-6 sm:p-8 border border-[#D8F078]/30 space-y-6 shadow-2xl">
            
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#D8F078] uppercase font-bold">Gate 3 Verification</span>
                <h3 className="text-xl font-editorial font-bold text-[#F7F5EF] mt-0.5">
                  Confirm Custody Handover
                </h3>
                <p className="text-xs text-[#A9B7A0]">
                  Enter the 4-digit security PIN provided by kitchen dispatch staff upon container inspection.
                </p>
              </div>
              <button
                onClick={() => setHandoverDonationId(null)}
                className="p-1.5 rounded-xl bg-[#1C221E] text-[#A9B7A0] hover:text-[#F7F5EF]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVerifyPinHandover} className="space-y-5">
              
              <div className="space-y-2 text-center py-2">
                <label className="text-xs font-mono text-[#A9B7A0] block">
                  Enter 4-Digit Security Pickup PIN:
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="• • • •"
                  className="w-40 mx-auto text-center p-3.5 rounded-2xl bg-[#151916] border border-[#D8F078]/50 text-2xl font-mono font-bold text-[#D8F078] tracking-widest focus:outline-none focus:border-[#D8F078] shadow-inner"
                  required
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#151916] border border-[#28312B] text-[11px] text-[#A9B7A0] space-y-1">
                <div className="font-bold text-[#F7F5EF] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D8F078]" />
                  <span>Dual Physical Confirmation</span>
                </div>
                <p>Ensures that food packages were handed over at compliant holding temperatures and received by the authorized NGO driver.</p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setHandoverDonationId(null)}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold bg-[#1C221E] text-[#A9B7A0] hover:text-[#F7F5EF] border border-[#28312B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] shadow-glow-lime flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify & Accept</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
