import React, { useState, useEffect } from 'react';
import { OptimizedImage } from '../common/OptimizedImage';
import { storageService, SEED_NGOS } from '../../services/storageService';
import { SurplusDonation, NgoPartner } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { apiClient, ApiError, SurplusDonationItem } from '../../services/apiClient';
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
  Sparkles,
  Info,
  Loader2
} from 'lucide-react';

export const NgoPortal: React.FC = () => {
  const { user, isAuthenticated, switchDevRole } = useAuth();
  const [donations, setDonations] = useState<SurplusDonation[]>(storageService.getDonations());
  const [claimedDonations, setClaimedDonations] = useState<SurplusDonation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClaiming, setIsClaiming] = useState<string | null>(null);
  const [claimStatus, setClaimStatus] = useState<{ message: string; isError: boolean } | null>(null);

  const selectedNgo: NgoPartner = SEED_NGOS[0];

  const refreshDonations = async () => {
    setIsLoading(true);
    try {
      if (isAuthenticated && user?.role === 'ngo') {
        const [availRes, claimedRes] = await Promise.allSettled([
          apiClient.surplus.getAvailable(),
          apiClient.surplus.getClaimedMe()
        ]);

        if (availRes.status === 'fulfilled' && availRes.value.items) {
          const mappedAvail: SurplusDonation[] = availRes.value.items.map((item: SurplusDonationItem) => ({
            id: item.id,
            foodTitle: item.food_title,
            dishes: item.dishes,
            totalQuantityKg: item.total_quantity_kg,
            servingsCount: item.servings_count,
            mealType: 'Lunch',
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
            imageUrl: item.image_url || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'
          }));
          setDonations(mappedAvail);
        }

        if (claimedRes.status === 'fulfilled' && claimedRes.value.items) {
          const mappedClaimed: SurplusDonation[] = claimedRes.value.items.map((item: SurplusDonationItem) => ({
            id: item.id,
            foodTitle: item.food_title,
            dishes: item.dishes,
            totalQuantityKg: item.total_quantity_kg,
            servingsCount: item.servings_count,
            mealType: 'Lunch',
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
            imageUrl: item.image_url || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'
          }));
          setClaimedDonations(mappedClaimed);
        }
      } else {
        setDonations(storageService.getDonations());
        setClaimedDonations([]);
      }
    } catch (err) {
      console.warn('Error refreshing NGO donations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshDonations();
  }, [isAuthenticated, user]);

  const handleClaim = async (donationId: string) => {
    setIsClaiming(donationId);
    try {
      if (isAuthenticated && user?.role === 'ngo') {
        const claimed = await apiClient.surplus.claimDonation(donationId);
        await refreshDonations();
        setClaimStatus({
          message: `Successfully claimed offer #${donationId} (${claimed.food_title})! Dispatch vehicle to ${claimed.pickup_location}.`,
          isError: false
        });
      } else {
        const result = storageService.claimDonation(donationId, selectedNgo);
        setDonations(storageService.getDonations());
        setClaimStatus({
          message: `${result.message} (Preview mode — sign in as NGO partner for server claim lock)`,
          isError: !result.success
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to claim surplus offer.';
      setClaimStatus({
        message: msg,
        isError: true
      });
    } finally {
      setIsClaiming(null);
      setTimeout(() => setClaimStatus(null), 6000);
    }
  };

  const availableDonations = donations.filter(d => d.status === 'AVAILABLE');
  const myClaimedActive = claimedDonations.length > 0 
    ? claimedDonations.filter(d => d.status === 'CLAIMED')
    : donations.filter(d => d.claimedByNgoId === selectedNgo.id && d.status === 'CLAIMED');

  const myCompleted = claimedDonations.length > 0
    ? claimedDonations.filter(d => d.status === 'COMPLETED')
    : donations.filter(d => d.claimedByNgoId === selectedNgo.id && d.status === 'COMPLETED');

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Toast Notification Alert */}
      {claimStatus && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-2xl animate-in fade-in ${
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

      {/* Role Banner if not logged in as NGO */}
      {(!isAuthenticated || user?.role !== 'ngo') && (
        <div className="p-4 rounded-2xl bg-[#1C221E] border border-[#28312B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#A9B7A0]">
            <Info className="w-4 h-4 text-[#D8F078] shrink-0" />
            <span>
              {isAuthenticated
                ? `Logged in as ${user?.role} (${user?.username}). Connect with an NGO Partner profile to perform verified atomic claims.`
                : 'Browsing NGO portal in live preview mode. Sign in to connect with live surplus redistribution bay.'}
            </span>
          </div>
          <button
            onClick={() => switchDevRole('ngo')}
            className="px-3.5 py-1.5 rounded-xl bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30 font-semibold text-[11px] hover:bg-[#123B2A]/80 transition-all shrink-0"
          >
            Authenticate as rha_arunav
          </button>
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
              {user?.full_name ? `${user.full_name} (${user.ngo_id || 'Robin Hood Army'})` : selectedNgo.name}
            </div>
            <div className="text-xs text-[#A9B7A0] flex items-center gap-1.5 mt-0.5">
              <Truck className="w-3.5 h-3.5 text-[#D8F078]" />
              <span>{selectedNgo.vehicleType}</span>
            </div>
            <span className="inline-block mt-1.5 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/25 font-bold">
              {isAuthenticated && user?.role === 'ngo' ? 'VERIFIED REDISTRIBUTION PARTNER' : selectedNgo.verificationBadge}
            </span>
          </div>
        </div>

        {/* Total Deliveries */}
        <div className="glass-panel p-6 rounded-3xl border border-[#28312B] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono text-[#A9B7A0] uppercase tracking-wider">Completed Pickups</span>
            <div className="text-3xl font-bold font-editorial text-[#F7F5EF]">
              {selectedNgo.totalPickupsCompleted + myCompleted.length}
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
              {(selectedNgo.mealsDistributed + myCompleted.reduce((acc, c) => acc + c.servingsCount, 0)).toLocaleString()}
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
          <div className="flex items-center gap-3">
            {isLoading && <Loader2 className="w-4 h-4 text-[#D8F078] animate-spin" />}
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/25 font-bold">
              Atomic Single-Claim Protected
            </span>
          </div>
        </div>

        {availableDonations.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#151916] border border-[#28312B] space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#D8F078] mx-auto" />
            <h4 className="text-base font-bold text-[#F7F5EF]">All Surplus Currently Reserved</h4>
            <p className="text-xs text-[#A9B7A0] max-w-md mx-auto">
              There are no unclaimed food batches currently waiting at kitchen dispatch bays. Check back following meal services.
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
                  <OptimizedImage 
                    src={d.imageUrl || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'} 
                    alt={d.foodTitle}
                    width={600}
                    height={300}
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
                          {d.pickupLocation || 'Gate 3 Bay'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-amber-300 pt-1">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Facility: {d.kitchenFacility}</span>
                    </div>
                  </div>

                  {/* Claim Action CTA */}
                  <div className="pt-3 border-t border-[#28312B] flex items-center justify-between">
                    <span className="text-xs text-[#A9B7A0]">One-click atomic lock</span>
                    <button
                      disabled={isClaiming === d.id}
                      onClick={() => handleClaim(d.id)}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] shadow-glow-lime flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isClaiming === d.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <HeartHandshake className="w-4 h-4" />
                      )}
                      <span>{isClaiming === d.id ? 'Claiming...' : 'Claim Donation Batch'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Claimed by Us: Collection & PIN Verification Bay */}
      {myClaimedActive.length > 0 && (
        <div className="glass-panel p-8 rounded-3xl border border-[#D8F078]/30 space-y-6 shadow-glow-forest">
          <div className="flex items-center justify-between pb-4 border-b border-[#28312B]">
            <div>
              <h3 className="text-lg font-bold text-[#F7F5EF] flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#D8F078]" />
                <span>Reserved for Pickup ({myClaimedActive.length})</span>
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
            {myClaimedActive.map((d) => (
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
                    {d.totalQuantityKg} kg (~{d.servingsCount} portions) • Facility: {d.kitchenFacility} • Location: {d.pickupLocation}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-[#1C221E] border border-[#28312B] text-xs font-mono text-[#D8F078] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#D8F078]" />
                    <span>Provide PIN to Kitchen Dispatcher at Gate 3</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
