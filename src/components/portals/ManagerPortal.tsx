import React, { useState } from 'react';
import { storageService } from '../../services/storageService';
import { PredictionFeatures, PredictionResult } from '../../types';
import { 
  LayoutDashboard, 
  Sliders, 
  Download, 
  FileSpreadsheet, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  BarChart3,
  TrendingUp,
  FileCheck
} from 'lucide-react';

export const ManagerPortal: React.FC = () => {
  const [safetyBuffer, setSafetyBuffer] = useState<number>(5.0);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isOverrideOpen, setIsOverrideOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Prediction model run
  const [features, setFeatures] = useState<PredictionFeatures>({
    expectedAttendance: 1450,
    dayOfWeek: 2, // Tuesday
    isHoliday: false,
    isExamPeriod: false,
    weatherTemp: 24,
    isRainy: false,
    menuItemPopularity: 8.5,
    safetyBufferPercent: 5.0
  });

  const prediction = storageService.calculatePrediction({
    ...features,
    safetyBufferPercent: safetyBuffer
  });

  const handleApplyBufferOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) return;

    storageService.addAudit({
      actorName: 'Dr. Anita Roy (Executive Mess Manager)',
      actorRole: 'manager',
      action: 'BUFFER_OVERRIDE_RECORDED',
      details: `Manager adjusted safety buffer to ${safetyBuffer}%. Justification: "${overrideReason}"`,
      severity: 'warning'
    });

    setIsOverrideOpen(false);
    setOverrideReason('');
    setNotification(`Safety buffer updated to ${safetyBuffer}%. Logged in compliance audit.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleExportCsv = () => {
    storageService.exportReportCsv();
    setNotification('Sustainability audit report CSV generated and downloaded.');
    setTimeout(() => setNotification(null), 4000);
  };

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

      {/* Top Controls: Buffer Management & Export Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-[#28312B]">
        <div>
          <h2 className="text-lg font-bold text-[#F7F5EF] flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-[#D8F078]" />
            <span>Mess Operational Oversight & Governance</span>
          </h2>
          <p className="text-xs text-[#A9B7A0]">Review ML predictions, tune production safety buffers, and download audit-grade reports.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOverrideOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1C221E] hover:bg-[#28312B] text-[#D8F078] border border-[#28312B] flex items-center gap-2 transition-colors"
          >
            <Sliders className="w-4 h-4" />
            <span>Override Buffer ({safetyBuffer}%)</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] flex items-center gap-2 transition-all shadow-glow-lime active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export Audit CSV</span>
          </button>
        </div>
      </div>

      {/* Prediction Engine Review Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Model Comparison Card */}
        <div className="lg:col-span-7 glass-panel-elevated p-8 rounded-3xl border border-[#28312B] space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#28312B]">
            <div>
              <h3 className="text-base font-bold text-[#F7F5EF]">Next Service Forecast Breakdown</h3>
              <p className="text-xs text-[#A9B7A0]">Headcount: 1,450 confirmed opt-ins | Service: Lunch</p>
            </div>
            <span className="text-xs font-mono text-[#D8F078] bg-[#123B2A] px-2.5 py-1 rounded-full border border-[#D8F078]/25">
              Confidence: {prediction.confidenceScore}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="p-4 rounded-2xl bg-[#151916] border border-[#28312B] space-y-1">
              <span className="text-[11px] font-mono text-[#A9B7A0] block">Tier 1: Baseline Formula</span>
              <div className="text-2xl font-bold font-editorial text-[#F7F5EF]">{prediction.baselineKg} kg</div>
              <p className="text-[10px] text-[#A9B7A0]">Diners × historical mean</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#151916] border border-[#28312B] space-y-1">
              <span className="text-[11px] font-mono text-[#D8F078] block">Tier 2: Random Forest</span>
              <div className="text-2xl font-bold font-editorial text-[#D8F078]">{prediction.mlPredictedKg} kg</div>
              <p className="text-[10px] text-[#A9B7A0]">Multi-variable regressor</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#123B2A]/40 border border-[#D8F078]/30 space-y-1">
              <span className="text-[11px] font-mono text-[#D8F078] font-bold block">Final Recommendation</span>
              <div className="text-2xl font-bold font-editorial text-[#F7F5EF]">{prediction.recommendedPreparationKg} kg</div>
              <p className="text-[10px] text-[#D8F078]">Ensemble batch target</p>
            </div>

          </div>

          {/* Validation Metrics */}
          <div className="p-4 rounded-2xl bg-[#151916] border border-[#28312B] space-y-2">
            <div className="text-xs font-bold text-[#F7F5EF] flex items-center justify-between">
              <span>Chronological Model Evaluation Metrics</span>
              <span className="font-mono text-[11px] text-[#D8F078]">Test Split: 30 Days</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-1">
              <div>
                <span className="text-[#A9B7A0]">Mean Absolute Error (MAE): </span>
                <strong className="text-[#D8F078]">±{prediction.maeKg} kg</strong>
              </div>
              <div>
                <span className="text-[#A9B7A0]">Root Mean Square Error: </span>
                <strong className="text-[#F7F5EF]">{prediction.rmseKg} kg</strong>
              </div>
            </div>
          </div>

          {/* Top Impact Factors */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#A9B7A0]">Feature Attribution Ranking</h4>
            <div className="space-y-2">
              {prediction.topFactors.map((f, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#151916] border border-[#28312B] flex items-center justify-between text-xs">
                  <span className="text-[#F7F5EF]">{f.factor}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[#D8F078] font-bold">{f.impact}</span>
                    <div className="w-16 h-1.5 bg-[#28312B] rounded-full overflow-hidden hidden sm:block">
                      <div className="h-full bg-[#D8F078]" style={{ width: `${f.percentage}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Waste Analytics & NGO Coordination Status */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="glass-panel p-6 rounded-3xl border border-[#28312B] space-y-4">
            <h3 className="text-base font-bold text-[#F7F5EF] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#D8F078]" />
              <span>Shift Waste Mitigation Summary</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#151916] border border-[#28312B]">
                <span className="text-[#A9B7A0]">Avoidable Food Loss:</span>
                <span className="font-mono text-[#D8F078] font-bold">12.0 kg (-78% vs baseline)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#151916] border border-[#28312B]">
                <span className="text-[#A9B7A0]">Plate Waste Compost Redirect:</span>
                <span className="font-mono text-red-400 font-bold">4.5 kg (Bio-methanation)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#151916] border border-[#28312B]">
                <span className="text-[#A9B7A0]">Financial Value Saved:</span>
                <span className="font-mono text-[#D8F078] font-bold">₹1,140 / shift</span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-[#28312B] space-y-4">
            <h3 className="text-base font-bold text-[#F7F5EF] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#D8F078]" />
              <span>Surplus Approval & NGO Status</span>
            </h3>

            <div className="p-4 rounded-2xl bg-[#151916] border border-[#28312B] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F7F5EF]">Surplus Batch #DON-8841</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#123B2A] text-[#D8F078]">
                  Safety Approved
                </span>
              </div>
              <p className="text-[#A9B7A0]">
                45.0 kg unserved Basmati Rice & Paneer Curry verified at 68.5°C. Picked up by Robin Hood Army.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Modal: Override Safety Buffer */}
      {isOverrideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#1C221E] border border-[#28312B] rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#28312B]">
              <h3 className="text-base font-bold text-[#F7F5EF]">Configure Production Safety Buffer</h3>
              <button onClick={() => setIsOverrideOpen(false)} className="text-[#A9B7A0] hover:text-[#F7F5EF]">✕</button>
            </div>

            <form onSubmit={handleApplyBufferOverride} className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-[#A9B7A0] mb-2">
                  <span>Safety Buffer Percentage:</span>
                  <span className="text-sm font-bold text-[#D8F078]">+{safetyBuffer}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={0.5}
                  value={safetyBuffer}
                  onChange={(e) => setSafetyBuffer(Number(e.target.value))}
                  className="w-full h-2 bg-[#28312B] rounded-lg appearance-none cursor-pointer accent-[#D8F078]"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-[#A9B7A0] block mb-1.5">
                  Mandatory Audit Justification:
                </label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Higher attendance expected due to regional sports meet in hostel grounds..."
                  className="w-full bg-[#151916] border border-[#28312B] rounded-xl p-3 text-xs text-[#F7F5EF] focus:outline-none"
                  required
                />
                <span className="text-[10px] text-[#A9B7A0]">This justification is permanently stored in the audit trail.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOverrideOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A9B7A0] hover:bg-[#28312B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D]"
                >
                  Save Buffer & Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
