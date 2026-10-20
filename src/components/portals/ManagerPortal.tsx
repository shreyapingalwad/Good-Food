import React, { useState, useEffect } from 'react';
import { storageService } from '../../services/storageService';
import { PredictionFeatures } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { apiClient, ApiError, ManagerOverviewResponse, ForecastResponse } from '../../services/apiClient';
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
  TrendingDown, 
  TrendingUp, 
  FileCheck, 
  Cpu, 
  Layers, 
  ArrowUpRight, 
  Info,
  Loader2
} from 'lucide-react';

export const ManagerPortal: React.FC = () => {
  const { user, isAuthenticated, switchDevRole } = useAuth();
  const [safetyBuffer, setSafetyBuffer] = useState<number>(5.0);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isOverrideOpen, setIsOverrideOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Live Backend Overview Data
  const [overviewData, setOverviewData] = useState<ManagerOverviewResponse | null>(null);
  const [forecastResult, setForecastResult] = useState<ForecastResponse | null>(null);

  // Prediction model inputs
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

  // Fetch overview and run prediction
  const fetchManagerData = async () => {
    setIsLoading(true);
    try {
      if (isAuthenticated && (user?.role === 'manager' || user?.role === 'admin')) {
        const [overviewRes, forecastRes] = await Promise.allSettled([
          apiClient.manager.getOverview(),
          apiClient.manager.predictForecast({
            expected_attendance: features.expectedAttendance,
            day_of_week: features.dayOfWeek,
            is_holiday: features.isHoliday,
            is_exam_period: features.isExamPeriod,
            weather_temp: features.weatherTemp,
            is_rainy: features.isRainy,
            menu_item_popularity: features.menuItemPopularity,
            safety_buffer_percent: safetyBuffer
          })
        ]);

        if (overviewRes.status === 'fulfilled') {
          setOverviewData(overviewRes.value);
          if (overviewRes.value.current_safety_buffer_percent !== undefined) {
            setSafetyBuffer(overviewRes.value.current_safety_buffer_percent);
          }
        }

        if (forecastRes.status === 'fulfilled') {
          setForecastResult(forecastRes.value);
        }
      }
    } catch (err) {
      console.warn('Error fetching manager data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchManagerData();
  }, [isAuthenticated, user]);

  // Recalculate prediction when safety buffer changes
  const runPrediction = async (buffer: number) => {
    try {
      if (isAuthenticated && (user?.role === 'manager' || user?.role === 'admin')) {
        const res = await apiClient.manager.predictForecast({
          expected_attendance: features.expectedAttendance,
          day_of_week: features.dayOfWeek,
          is_holiday: features.isHoliday,
          is_exam_period: features.isExamPeriod,
          weather_temp: features.weatherTemp,
          is_rainy: features.isRainy,
          menu_item_popularity: features.menuItemPopularity,
          safety_buffer_percent: buffer
        });
        setForecastResult(res);
      }
    } catch (err) {
      console.warn('Failed to calculate forecast:', err);
    }
  };

  const handleApplyBufferOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) return;

    setIsSubmitting(true);
    try {
      if (isAuthenticated && (user?.role === 'manager' || user?.role === 'admin')) {
        await apiClient.manager.overrideSafetyBuffer({
          safety_buffer_percent: safetyBuffer,
          justification: overrideReason.trim()
        });
        await runPrediction(safetyBuffer);
        setIsOverrideOpen(false);
        setOverrideReason('');
        setNotification(`Safety buffer updated to ${safetyBuffer}%. Logged in backend audit ledger.`);
      } else {
        storageService.addAudit({
          actorName: user?.full_name || 'Dr. Anita Roy (Executive Mess Manager)',
          actorRole: 'manager',
          action: 'BUFFER_OVERRIDE_RECORDED',
          details: `Manager adjusted safety buffer to ${safetyBuffer}%. Justification: "${overrideReason}"`,
          severity: 'warning'
        });
        setIsOverrideOpen(false);
        setOverrideReason('');
        setNotification(`Preview mode: Safety buffer updated to ${safetyBuffer}%. Sign in as Manager to record server audit.`);
      }
      setTimeout(() => setNotification(null), 4500);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update safety buffer.';
      setNotification(msg);
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    storageService.exportReportCsv();
    setNotification('Sustainability audit report CSV generated and downloaded.');
    setTimeout(() => setNotification(null), 4000);
  };

  // Fallback prediction calculation if offline/preview
  const fallbackPrediction = storageService.calculatePrediction({
    ...features,
    safetyBufferPercent: safetyBuffer
  });

  const baselineKg = forecastResult ? forecastResult.historical_baseline_kg : fallbackPrediction.baselineKg;
  const mlPredictedKg = forecastResult ? forecastResult.ml_predicted_kg : fallbackPrediction.mlPredictedKg;
  const recommendedPreparationKg = forecastResult ? forecastResult.recommended_preparation_kg : fallbackPrediction.recommendedPreparationKg;
  const confidenceScore = forecastResult?.confidence_score ?? 0.94;
  const maeVal = forecastResult ? forecastResult.mae_kg : 4.2;

  // Weekly Waste Trends Data
  const weeklyTrends = [
    { day: 'Mon', preparedKg: 590, consumedKg: 554, surplusKg: 36, rate: '6.1%' },
    { day: 'Tue', preparedKg: 580, consumedKg: 552, surplusKg: 28, rate: '4.8%' },
    { day: 'Wed', preparedKg: 610, consumedKg: 585, surplusKg: 25, rate: '4.1%' },
    { day: 'Thu', preparedKg: 595, consumedKg: 570, surplusKg: 25, rate: '4.2%' },
    { day: 'Fri', preparedKg: 630, consumedKg: 598, surplusKg: 32, rate: '5.1%' },
    { day: 'Sat', preparedKg: 510, consumedKg: 490, surplusKg: 20, rate: '3.9%' },
    { day: 'Sun', preparedKg: 480, consumedKg: 462, surplusKg: 18, rate: '3.8%' }
  ];

  // Dish-Level Waste Metrics
  const dishWasteRows = [
    { name: 'Dal Tadka & Steamed Basmati Rice', preparedKg: 140, consumedKg: 128, plateWasteKg: 4.5, surplusKg: 7.5, status: 'Normal' },
    { name: 'Paneer Butter Masala', preparedKg: 110, consumedKg: 106, plateWasteKg: 2.1, surplusKg: 1.9, status: 'Optimal' },
    { name: 'Tandoori Roti & Raita', preparedKg: 95, consumedKg: 87, plateWasteKg: 5.2, surplusKg: 2.8, status: 'Monitor' },
    { name: 'Organic Green Sprout Salad', preparedKg: 45, consumedKg: 38, plateWasteKg: 4.8, surplusKg: 2.2, status: 'Review' },
    { name: 'Gulab Jamun with Cardamom Syrup', preparedKg: 55, consumedKg: 54, plateWasteKg: 0.8, surplusKg: 0.2, status: 'Optimal' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Toast Alert */}
      {notification && (
        <div className="p-4 rounded-2xl bg-[#123B2A] border border-[#D8F078]/40 text-[#D8F078] text-xs font-semibold flex items-center justify-between shadow-glow-lime animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#D8F078]" />
            <span>{notification}</span>
          </div>
        </div>
      )}

      {/* Role Banner if not logged in as Manager */}
      {(!isAuthenticated || (user?.role !== 'manager' && user?.role !== 'admin')) && (
        <div className="p-4 rounded-2xl bg-[#1C221E] border border-[#28312B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#A9B7A0]">
            <Info className="w-4 h-4 text-[#D8F078] shrink-0" />
            <span>
              {isAuthenticated
                ? `Logged in as ${user?.role} (${user?.username}). Connect with a Manager profile to record safety buffer overrides.`
                : 'Browsing manager console in live preview mode. Sign in to connect with live ML forecasting.'}
            </span>
          </div>
          <button
            onClick={() => switchDevRole('manager')}
            className="px-3.5 py-1.5 rounded-xl bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30 font-semibold text-[11px] hover:bg-[#123B2A]/80 transition-all shrink-0"
          >
            Authenticate as dr_anita_roy
          </button>
        </div>
      )}

      {/* Top Operations Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 sm:p-8 rounded-3xl border border-[#28312B] shadow-card-dark">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#123B2A] border border-[#D8F078]/25 text-xs font-mono text-[#D8F078] mb-1.5">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Campus Operational Analytics Workspace</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#F7F5EF]">
            Mess Executive Decision Lab
          </h2>
          <p className="text-xs text-[#A9B7A0] mt-0.5">
            Review machine learning forecasts, tune safety buffer thresholds, and export compliance audit reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsOverrideOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1C221E] hover:bg-[#28312B] text-[#D8F078] border border-[#28312B] hover:border-[#D8F078]/40 flex items-center gap-2 transition-all"
          >
            <Sliders className="w-4 h-4" />
            <span>Override Buffer ({safetyBuffer}%)</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] shadow-glow-lime flex items-center gap-2 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export Audit CSV</span>
          </button>
        </div>
      </div>

      {/* Forecast Comparison Suite: Tier 1 vs Tier 2 ML */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tier 1 Baseline Card */}
        <div className="glass-panel p-6 rounded-3xl border border-[#28312B] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#28312B]">
            <span className="text-xs font-mono text-[#A9B7A0] uppercase">Tier 1: Formula Baseline</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1C221E] text-[#A9B7A0] border border-[#28312B]">
              Deterministic
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold font-editorial text-[#F7F5EF]">
              {baselineKg.toFixed(1)} kg
            </div>
            <p className="text-xs text-[#A9B7A0] mt-1">Expected attendance × 0.42 kg/intake</p>
          </div>
          <div className="p-3 rounded-xl bg-[#151916] text-[11px] font-mono text-[#A9B7A0] space-y-1">
            <div>Diners: 1,450 students</div>
            <div>Variance: ±8.5% historical range</div>
          </div>
        </div>

        {/* Tier 2 Random Forest ML Card */}
        <div className="glass-panel p-6 rounded-3xl border border-[#28312B] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#28312B]">
            <span className="text-xs font-mono text-[#D8F078] uppercase font-bold flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>Tier 2: ML Engine</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/25">
              Confidence {(confidenceScore * 100).toFixed(0)}%
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold font-editorial text-[#D8F078]">
              {mlPredictedKg.toFixed(1)} kg
            </div>
            <p className="text-xs text-[#A9B7A0] mt-1">Features: Tuesday, Sunny, Rating 8.5/10</p>
          </div>
          <div className="p-3 rounded-xl bg-[#151916] text-[11px] font-mono text-[#A9B7A0] space-y-1">
            <div>Validated MAE: ±{maeVal.toFixed(1)} kg</div>
            <div>Model: Empirical + Feature Adjustments</div>
          </div>
        </div>

        {/* Final Production Target with Safety Buffer */}
        <div className="glass-panel-elevated p-6 rounded-3xl border border-[#D8F078]/40 space-y-4 shadow-glow-forest">
          <div className="flex items-center justify-between pb-3 border-b border-[#28312B]">
            <span className="text-xs font-mono text-[#D8F078] uppercase font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Final Recommended Batch</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30">
              +{safetyBuffer}% Buffer
            </span>
          </div>
          <div>
            <div className="text-4xl font-bold font-editorial text-[#F7F5EF]">
              {recommendedPreparationKg.toFixed(1)} kg
            </div>
            <p className="text-xs text-[#D8F078] font-mono mt-1">
              Safety margin: +{(recommendedPreparationKg - baselineKg).toFixed(1)} kg
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#123B2A]/40 text-[11px] text-[#A9B7A0] flex items-center justify-between">
            <span>Avoided Waste vs Static:</span>
            <span className="text-xs font-mono font-bold text-[#D8F078]">-38.2 kg</span>
          </div>
        </div>

      </div>

      {/* Operational Waste Mitigation & Prepared vs Consumed Trends */}
      <div className="glass-panel p-8 rounded-3xl border border-[#28312B] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#28312B]">
          <div>
            <h3 className="text-lg font-bold text-[#F7F5EF] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#D8F078]" />
              <span>Weekly Shift Production & Waste Trends</span>
            </h3>
            <p className="text-xs text-[#A9B7A0]">
              Audited comparison of actual prepared kilograms vs. diner consumption across shifts.
            </p>
          </div>
          <div className="text-xs font-mono text-[#A9B7A0]">
            Average Waste Ratio: <strong className="text-[#D8F078]">4.5%</strong> (Campus Baseline: 18%)
          </div>
        </div>

        {/* Visual Chart Bars */}
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-3 pt-2">
          {weeklyTrends.map((w, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-[#151916] border border-[#28312B] flex flex-col justify-between space-y-3">
              <div className="text-xs font-mono font-bold text-[#D8F078] uppercase">{w.day}</div>
              
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-[#F7F5EF]">{w.consumedKg} kg</div>
                <div className="text-[10px] font-mono text-[#A9B7A0]">of {w.preparedKg} kg</div>
              </div>

              {/* Progress Visual Bar */}
              <div className="w-full h-2 bg-[#28312B] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#123B2A] to-[#D8F078] rounded-full"
                  style={{ width: `${(w.consumedKg / w.preparedKg) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-[#A9B7A0] pt-1 border-t border-[#28312B]">
                <span>Surplus:</span>
                <span className="text-[#D8F078] font-bold">{w.surplusKg} kg</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dish-Level Waste Diagnostics Table */}
      <div className="glass-panel p-8 rounded-3xl border border-[#28312B] space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#28312B]">
          <div>
            <h3 className="text-lg font-bold text-[#F7F5EF]">Dish-Level Preparation & Waste Breakdown</h3>
            <p className="text-xs text-[#A9B7A0]">Identifies specific menu recipes contributing to plate discard vs. kitchen surplus.</p>
          </div>
          <span className="text-xs font-mono text-[#A9B7A0]">Shift: Today's Lunch</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#28312B] text-[#A9B7A0] font-mono uppercase text-[10px]">
              <tr>
                <th className="pb-3 font-semibold">Dish Item</th>
                <th className="pb-3 font-semibold">Prepared</th>
                <th className="pb-3 font-semibold">Consumed</th>
                <th className="pb-3 font-semibold">Plate Waste</th>
                <th className="pb-3 font-semibold">Edible Surplus</th>
                <th className="pb-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#28312B]/60 font-mono">
              {dishWasteRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#151916]/40 transition-colors">
                  <td className="py-3.5 font-sans font-bold text-[#F7F5EF]">{row.name}</td>
                  <td className="py-3.5 text-[#A9B7A0]">{row.preparedKg} kg</td>
                  <td className="py-3.5 text-[#F7F5EF] font-semibold">{row.consumedKg} kg</td>
                  <td className="py-3.5 text-red-300">{row.plateWasteKg} kg</td>
                  <td className="py-3.5 text-[#D8F078]">{row.surplusKg} kg</td>
                  <td className="py-3.5 text-right">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] ${
                      row.status === 'Optimal'
                        ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30'
                        : row.status === 'Normal'
                        ? 'bg-[#1C221E] text-[#A9B7A0] border border-[#28312B]'
                        : 'bg-amber-950/70 text-amber-300 border border-amber-500/30'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Buffer Override Slide-Over Modal */}
      {isOverrideOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-override-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOverrideOpen(false);
          }}
        >
          <div className="glass-panel-elevated w-full max-w-md rounded-3xl p-6 sm:p-8 border border-[#D8F078]/30 space-y-6 shadow-2xl">
            
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#D8F078] uppercase font-bold">Manager Override</span>
                <h3 id="modal-override-title" className="text-xl font-editorial font-bold text-[#F7F5EF] mt-0.5">
                  Adjust Safety Buffer
                </h3>
                <p className="text-xs text-[#A9B7A0]">Modifies AI batch cooking target. Requires mandatory audit justification.</p>
              </div>
              <button
                onClick={() => setIsOverrideOpen(false)}
                aria-label="Close buffer override modal"
                className="p-1.5 rounded-xl bg-[#1C221E] text-[#A9B7A0] hover:text-[#F7F5EF] focus-visible:ring-2 focus-visible:ring-[#D8F078] focus-visible:outline-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyBufferOverride} className="space-y-5">
              
              {/* Buffer Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#A9B7A0]">Buffer Percentage:</span>
                  <span className="text-lg font-mono font-bold text-[#D8F078]">{safetyBuffer}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  value={safetyBuffer}
                  onChange={(e) => setSafetyBuffer(Number(e.target.value))}
                  className="w-full accent-[#D8F078] bg-[#1C221E] h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#A9B7A0]">
                  <span>0% (Lean)</span>
                  <span>10% (Balanced)</span>
                  <span>20% (Conservative)</span>
                </div>
              </div>

              {/* Live Target Impact */}
              <div className="p-4 rounded-2xl bg-[#151916] border border-[#28312B] flex items-center justify-between text-xs font-mono">
                <span className="text-[#A9B7A0]">Updated Batch Target:</span>
                <span className="text-[#D8F078] font-bold">
                  {(baselineKg * (1 + safetyBuffer / 100)).toFixed(1)} kg
                </span>
              </div>

              {/* Mandatory Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#A9B7A0]">
                  Mandatory Justification for Audit Record:
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Host block athletic tournament tonight expecting +12% diner intake."
                  rows={3}
                  className="w-full p-3.5 rounded-2xl bg-[#151916] border border-[#28312B] focus:border-[#D8F078] text-xs text-[#F7F5EF] focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOverrideOpen(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold bg-[#1C221E] text-[#A9B7A0] hover:text-[#F7F5EF] border border-[#28312B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] shadow-glow-lime flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                  <span>{isSubmitting ? 'Saving...' : 'Log & Apply Override'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
