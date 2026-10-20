import React, { useState } from 'react';
import { storageService } from '../../services/storageService';
import { NgoPartner, AuditLogItem } from '../../types';
import { 
  ShieldCheck, 
  Users, 
  Building2, 
  Sliders, 
  ScrollText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Search,
  Filter,
  Check,
  Lock,
  Clock,
  Thermometer,
  ShieldAlert,
  Save,
  CheckCircle
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const [ngos, setNgos] = useState<NgoPartner[]>(storageService.getNgos());
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(storageService.getAuditLogs());
  const [activeTab, setActiveTab] = useState<'audit' | 'ngos' | 'rules'>('audit');
  
  // Search & Filter
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);

  // System Config State
  const [cutoffHours, setCutoffHours] = useState<number>(2.0);
  const [maxHoldingTemp, setMaxHoldingTemp] = useState<number>(60);
  const [holdingWindowMins, setHoldingWindowMins] = useState<number>(120);

  const handleToggleVerify = (ngoId: string) => {
    storageService.toggleNgoVerification(ngoId);
    setNgos(storageService.getNgos());
    setAuditLogs(storageService.getAuditLogs());
    setNotification('Updated NGO verification credential and appended compliance record.');
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSaveRules = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.addAudit({
      actorName: 'System Administrator (Superuser)',
      actorRole: 'admin',
      action: 'UPDATE_SYSTEM_RULES',
      details: `Enforced rules: Cutoff ${cutoffHours}h prior, Min holding temp ${maxHoldingTemp}°C, Expiry window ${holdingWindowMins} mins.`,
      severity: 'info'
    });
    setAuditLogs(storageService.getAuditLogs());
    setNotification('System food-safety and cutoff rules successfully updated.');
    setTimeout(() => setNotification(null), 3500);
  };

  const filteredLogs = auditLogs.filter(log => 
    log.actorName.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.details.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Toast Alert */}
      {notification && (
        <div className="p-4 rounded-2xl bg-[#123B2A] border border-[#D8F078]/40 text-[#D8F078] text-xs font-semibold flex items-center justify-between shadow-glow-lime">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#D8F078]" />
            <span>{notification}</span>
          </div>
        </div>
      )}

      {/* Governance & Administrative Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 sm:p-8 rounded-3xl border border-[#28312B] shadow-card-dark">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#123B2A] border border-[#D8F078]/25 text-xs font-mono text-[#D8F078] mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>System Governance & Audit Authority</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#F7F5EF]">
            Institutional Compliance Console
          </h2>
          <p className="text-xs text-[#A9B7A0] mt-0.5">
            Authenticate NGO partner credentials, enforce food-safety holding rules, and inspect the immutable activity ledger.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-[#1C221E] p-1.5 rounded-2xl border border-[#28312B] self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'audit'
                ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30 shadow-sm'
                : 'text-[#A9B7A0] hover:text-[#F7F5EF]'
            }`}
          >
            Audit Trail ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('ngos')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'ngos'
                ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30 shadow-sm'
                : 'text-[#A9B7A0] hover:text-[#F7F5EF]'
            }`}
          >
            Verify NGOs ({ngos.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'rules'
                ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30 shadow-sm'
                : 'text-[#A9B7A0] hover:text-[#F7F5EF]'
            }`}
          >
            System Rules
          </button>
        </div>
      </div>

      {/* Tab 1: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="glass-panel p-8 rounded-3xl border border-[#28312B] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#28312B]">
            <div>
              <h3 className="text-lg font-bold text-[#F7F5EF] flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-[#D8F078]" />
                <span>Immutable System Audit Trail</span>
              </h3>
              <p className="text-xs text-[#A9B7A0]">
                Cryptographically sequenced log of student opt-ins, surplus dispatches, buffer overrides, and physical PIN handovers.
              </p>
            </div>

            {/* Search Filter Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#A9B7A0] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search audit events, actors..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#151916] border border-[#28312B] focus:border-[#D8F078] text-xs text-[#F7F5EF] focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#A9B7A0] font-mono">
                No audit entries matching search query.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div 
                  key={log.id}
                  className="p-4 rounded-2xl bg-[#151916] border border-[#28312B] hover:border-[#D8F078]/25 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#D8F078] font-bold">#{log.id}</span>
                      <span className="font-bold text-[#F7F5EF]">{log.action}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        log.severity === 'warning'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          : log.severity === 'success'
                          ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30'
                          : 'bg-[#1C221E] text-[#A9B7A0] border border-[#28312B]'
                      }`}>
                        {log.severity}
                      </span>
                    </div>
                    <p className="text-[#A9B7A0] leading-relaxed">{log.details}</p>
                  </div>

                  <div className="text-right shrink-0 font-mono text-[11px] text-[#A9B7A0]">
                    <div className="text-[#F7F5EF] font-semibold">{log.actorName}</div>
                    <div>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: NGO Partner Verification */}
      {activeTab === 'ngos' && (
        <div className="glass-panel p-8 rounded-3xl border border-[#28312B] space-y-6">
          <div className="pb-4 border-b border-[#28312B]">
            <h3 className="text-lg font-bold text-[#F7F5EF] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#D8F078]" />
              <span>Registered NGO Shelter Network</span>
            </h3>
            <p className="text-xs text-[#A9B7A0]">
              Audit compliance certificates, vehicle transport capabilities, and authenticate organizations permitted to claim edible surplus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {ngos.map((ngo) => (
              <div 
                key={ngo.id}
                className="p-6 rounded-2xl bg-[#151916] border border-[#28312B] flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#D8F078]">#{ngo.id}</span>
                    <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full ${
                      ngo.verified
                        ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30 font-bold'
                        : 'bg-red-950 text-red-300 border border-red-500/30'
                    }`}>
                      {ngo.verified ? 'VERIFIED PARTNER' : 'PENDING AUDIT'}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-[#F7F5EF]">{ngo.name}</h4>

                  <div className="text-xs font-mono text-[#A9B7A0] space-y-1 pt-1">
                    <div>Registration: <strong className="text-[#F7F5EF]">{ngo.registrationNumber}</strong></div>
                    <div>Transport Fleet: <strong className="text-[#F7F5EF]">{ngo.vehicleType}</strong></div>
                    <div>Liaison Officer: <strong className="text-[#F7F5EF]">{ngo.contactPerson} ({ngo.phone})</strong></div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#28312B] flex items-center justify-between">
                  <span className="text-xs text-[#A9B7A0]">Access Authority:</span>
                  <button
                    onClick={() => handleToggleVerify(ngo.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      ngo.verified
                        ? 'bg-[#1C221E] text-red-400 hover:bg-red-950/40 border border-[#28312B]'
                        : 'bg-[#123B2A] text-[#D8F078] hover:bg-[#123B2A]/80 border border-[#D8F078]/40 shadow-sm'
                    }`}
                  >
                    {ngo.verified ? 'Revoke Verification' : 'Grant Verified Credential'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: System Rules Configuration */}
      {activeTab === 'rules' && (
        <div className="glass-panel p-8 rounded-3xl border border-[#28312B] space-y-6">
          <div className="pb-4 border-b border-[#28312B]">
            <h3 className="text-lg font-bold text-[#F7F5EF] flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#D8F078]" />
              <span>Campus Food-Safety & Cutoff Parameters</span>
            </h3>
            <p className="text-xs text-[#A9B7A0]">
              Global configuration enforced across student opt-in windows, kitchen batch calculations, and NGO holding deadlines.
            </p>
          </div>

          <form onSubmit={handleSaveRules} className="space-y-6 max-w-2xl">
            
            {/* Cutoff Window */}
            <div className="p-5 rounded-2xl bg-[#151916] border border-[#28312B] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#F7F5EF] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#D8F078]" />
                  <span>Student Meal Attendance Cutoff (Hours Prior)</span>
                </label>
                <span className="text-sm font-mono font-bold text-[#D8F078]">{cutoffHours} Hours</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="4.0"
                step="0.5"
                value={cutoffHours}
                onChange={(e) => setCutoffHours(Number(e.target.value))}
                className="w-full accent-[#D8F078] bg-[#1C221E] h-2 rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-[#A9B7A0]">
                Meals are locked for attendance updates 2 hours prior to service so kitchen staff have sufficient cooking lead time.
              </p>
            </div>

            {/* Holding Temp */}
            <div className="p-5 rounded-2xl bg-[#151916] border border-[#28312B] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#F7F5EF] flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-[#D8F078]" />
                  <span>Minimum Hot Holding Temperature (°C)</span>
                </label>
                <span className="text-sm font-mono font-bold text-[#D8F078]">{maxHoldingTemp}°C</span>
              </div>
              <input
                type="range"
                min="55"
                max="75"
                step="1"
                value={maxHoldingTemp}
                onChange={(e) => setMaxHoldingTemp(Number(e.target.value))}
                className="w-full accent-[#D8F078] bg-[#1C221E] h-2 rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-[#A9B7A0]">
                Food below 60°C is automatically blocked from redistribution dispatch to ensure compliance with municipal food safety mandates.
              </p>
            </div>

            {/* Expiry Window */}
            <div className="p-5 rounded-2xl bg-[#151916] border border-[#28312B] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#F7F5EF] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#D8F078]" />
                  <span>Maximum Safe Holding Window (Minutes)</span>
                </label>
                <span className="text-sm font-mono font-bold text-[#D8F078]">{holdingWindowMins} Minutes</span>
              </div>
              <input
                type="range"
                min="60"
                max="180"
                step="15"
                value={holdingWindowMins}
                onChange={(e) => setHoldingWindowMins(Number(e.target.value))}
                className="w-full accent-[#D8F078] bg-[#1C221E] h-2 rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-[#A9B7A0]">
                Surplus batches uncollected after 120 minutes are expired automatically to prevent bacterial danger zone accumulation.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-8 py-3 rounded-xl text-xs font-bold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] shadow-glow-lime flex items-center gap-2 transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Save System Rules</span>
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
};
