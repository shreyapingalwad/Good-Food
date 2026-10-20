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
  Check
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const [ngos, setNgos] = useState<NgoPartner[]>(storageService.getNgos());
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(storageService.getAuditLogs());
  const [activeTab, setActiveTab] = useState<'ngos' | 'rules' | 'audit'>('audit');
  
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
    setNotification('Updated NGO verification status and recorded in audit log.');
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

      {/* Top Governance Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-[#28312B]">
        <div>
          <h2 className="text-lg font-bold text-[#F7F5EF] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#D8F078]" />
            <span>Campus Compliance & Governance Administration</span>
          </h2>
          <p className="text-xs text-[#A9B7A0]">Enforce access permissions, authenticate NGO partners, and inspect immutable audit logs.</p>
        </div>

        <div className="flex items-center gap-2 bg-[#1C221E] p-1.5 rounded-2xl border border-[#28312B] self-start sm:self-auto">
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

      {/* Tab 1: Immutable Audit Trail */}
      {activeTab === 'audit' && (
        <div className="glass-panel-elevated p-6 sm:p-8 rounded-3xl border border-[#28312B] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#28312B]">
            <div>
              <h3 className="text-base font-bold text-[#F7F5EF]">Immutable System Activity Ledger</h3>
              <p className="text-xs text-[#A9B7A0]">Chronological log of all student opt-ins, kitchen batch recordings, buffer overrides, and NGO handovers.</p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#A9B7A0] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search audit actions..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full bg-[#151916] border border-[#28312B] rounded-xl pl-9 pr-3 py-2 text-xs text-[#F7F5EF] focus:outline-none focus:border-[#D8F078]/40"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div 
                key={log.id}
                className="p-4 rounded-2xl bg-[#151916] border border-[#28312B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[#D8F078] font-bold">{log.timestamp}</span>
                    <span className="text-[#28312B]">•</span>
                    <span className="font-bold text-[#F7F5EF]">{log.actorName}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1C221E] text-[#A9B7A0] uppercase">
                      {log.actorRole}
                    </span>
                  </div>
                  <p className="text-[#A9B7A0] leading-relaxed">{log.details}</p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full uppercase font-bold ${
                    log.severity === 'success' 
                      ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30'
                      : log.severity === 'warning'
                        ? 'bg-amber-950/40 text-amber-300 border border-amber-500/30'
                        : 'bg-[#1C221E] text-[#A9B7A0] border border-[#28312B]'
                  }`}>
                    {log.action}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: NGO Verification Board */}
      {activeTab === 'ngos' && (
        <div className="glass-panel-elevated p-6 sm:p-8 rounded-3xl border border-[#28312B] space-y-6">
          <div className="pb-4 border-b border-[#28312B]">
            <h3 className="text-base font-bold text-[#F7F5EF]">Authorized NGO Distribution Partners</h3>
            <p className="text-xs text-[#A9B7A0]">Review health authority compliance, cold-chain logistics gear, and toggle network verification status.</p>
          </div>

          <div className="space-y-4">
            {ngos.map((ngo) => (
              <div 
                key={ngo.id}
                className="p-5 rounded-2xl bg-[#151916] border border-[#28312B] flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <h4 className="text-base font-bold text-[#F7F5EF]">{ngo.name}</h4>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      ngo.verified ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30' : 'bg-red-950/40 text-red-400 border border-red-500/30'
                    }`}>
                      {ngo.verified ? 'VERIFIED' : 'PENDING'}
                    </span>
                  </div>
                  <div className="text-xs text-[#A9B7A0] flex flex-wrap items-center gap-3">
                    <span>Reg: <strong className="text-[#F7F5EF] font-mono">{ngo.registrationNumber}</strong></span>
                    <span>•</span>
                    <span>Rep: <strong>{ngo.contactPerson} ({ngo.phone})</strong></span>
                    <span>•</span>
                    <span>Fleet: <strong>{ngo.vehicleType}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right text-xs">
                    <span className="text-[#A9B7A0] block">Deliveries:</span>
                    <strong className="text-[#D8F078] font-mono">{ngo.totalPickupsCompleted}</strong>
                  </div>

                  <button
                    onClick={() => handleToggleVerify(ngo.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      ngo.verified
                        ? 'bg-red-950/30 hover:bg-red-950/60 text-red-300 border border-red-500/30'
                        : 'bg-[#123B2A] hover:bg-[#1B523B] text-[#D8F078] border border-[#D8F078]/40 shadow-glow-lime'
                    }`}
                  >
                    {ngo.verified ? (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Revoke Verification</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Authorize Partner</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: System Safety & Cutoff Rules */}
      {activeTab === 'rules' && (
        <div className="glass-panel-elevated p-6 sm:p-8 rounded-3xl border border-[#28312B] max-w-2xl space-y-6">
          <div className="pb-4 border-b border-[#28312B]">
            <h3 className="text-base font-bold text-[#F7F5EF]">Configure Campus System Constraints</h3>
            <p className="text-xs text-[#A9B7A0]">System wide rules enforced automatically in backend and user interface validation.</p>
          </div>

          <form onSubmit={handleSaveRules} className="space-y-5">
            
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#A9B7A0] uppercase block">
                Student Opt-in Cutoff Window (Hours Prior to Meal)
              </label>
              <input
                type="number"
                step="0.5"
                value={cutoffHours}
                onChange={(e) => setCutoffHours(Number(e.target.value))}
                className="w-full bg-[#151916] border border-[#28312B] rounded-xl p-3 text-xs text-[#F7F5EF] focus:outline-none focus:border-[#D8F078]/40"
              />
              <span className="text-[10px] text-[#A9B7A0]">Locks student meal attendance toggles 2.0 hours before dining hall doors open.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#A9B7A0] uppercase block">
                Minimum Food Hot-Holding Temp (°C)
              </label>
              <input
                type="number"
                value={maxHoldingTemp}
                onChange={(e) => setMaxHoldingTemp(Number(e.target.value))}
                className="w-full bg-[#151916] border border-[#28312B] rounded-xl p-3 text-xs text-[#F7F5EF] focus:outline-none focus:border-[#D8F078]/40"
              />
              <span className="text-[10px] text-[#A9B7A0]">Surplus food beneath this threshold cannot be dispatched for human redistribution.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#A9B7A0] uppercase block">
                Maximum NGO Pickup Countdown Window (Minutes)
              </label>
              <input
                type="number"
                value={holdingWindowMins}
                onChange={(e) => setHoldingWindowMins(Number(e.target.value))}
                className="w-full bg-[#151916] border border-[#28312B] rounded-xl p-3 text-xs text-[#F7F5EF] focus:outline-none focus:border-[#D8F078]/40"
              />
              <span className="text-[10px] text-[#A9B7A0]">Uncollected donations automatically expire to prevent consumption of degraded batches.</span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-6 py-3 rounded-xl text-xs font-semibold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] transition-colors shadow-glow-lime"
              >
                Enforce Rules & Update Configuration
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
};
