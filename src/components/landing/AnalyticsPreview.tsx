import React, { useState } from 'react';
import { BarChart3, TrendingDown, PieChart, Award, Calendar, CheckCircle2, ChevronRight } from 'lucide-react';

export const AnalyticsPreview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'trends' | 'dishes' | 'ngos'>('trends');

  // Daily waste data
  const weeklyTrends = [
    { day: 'Mon', conventionalKg: 85, messaverKg: 14, savedKg: 71 },
    { day: 'Tue', conventionalKg: 92, messaverKg: 16, savedKg: 76 },
    { day: 'Wed', conventionalKg: 88, messaverKg: 12, savedKg: 76 },
    { day: 'Thu', conventionalKg: 95, messaverKg: 18, savedKg: 77 },
    { day: 'Fri', conventionalKg: 110, messaverKg: 22, savedKg: 88 },
    { day: 'Sat', conventionalKg: 78, messaverKg: 10, savedKg: 68 },
    { day: 'Sun', conventionalKg: 70, messaverKg: 9, savedKg: 61 }
  ];

  // Dish breakdown
  const dishes = [
    { name: 'Basmati Steamed Rice', prepKg: 120, eatenKg: 114, leftoverKg: 6, rating: 4.8 },
    { name: 'Paneer Butter Masala', prepKg: 90, eatenKg: 87, leftoverKg: 3, rating: 4.9 },
    { name: 'Yellow Dal Tadka', prepKg: 80, eatenKg: 78, leftoverKg: 2, rating: 4.6 },
    { name: 'Subz Biryani (Dinner)', prepKg: 140, eatenKg: 136, leftoverKg: 4, rating: 4.7 },
    { name: 'Sprout & Beet Salad', prepKg: 45, eatenKg: 43, leftoverKg: 2, rating: 4.3 }
  ];

  // NGO partners
  const ngos = [
    { name: 'Robin Hood Army - South Campus', deliveries: 142, meals: 18450, badge: 'Tier 1 Partner' },
    { name: 'Annapurna Seva Trust', deliveries: 88, meals: 11200, badge: 'Rapid Response' },
    { name: 'Food For All Youth Shelter', deliveries: 64, meals: 8750, badge: 'Cold-Chain Certified' }
  ];

  return (
    <section id="impact" className="relative py-28 bg-[#151916] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1C221E] border border-[#D8F078]/25 text-xs text-[#D8F078] font-mono">
              <BarChart3 className="w-3.5 h-3.5 text-[#D8F078]" />
              <span>Campus Operational Intelligence</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-editorial font-bold text-[#F7F5EF] tracking-tight">
              Real-time Telemetry & <br />
              <span className="text-gradient-lime italic font-normal">Audit-Ready Analytics</span>
            </h2>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 bg-[#1C221E] p-1.5 rounded-2xl border border-[#28312B] self-start md:self-auto">
            <button
              onClick={() => setActiveTab('trends')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'trends'
                  ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30 shadow-sm'
                  : 'text-[#A9B7A0] hover:text-[#F7F5EF]'
              }`}
            >
              7-Day Trends
            </button>
            <button
              onClick={() => setActiveTab('dishes')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'dishes'
                  ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30 shadow-sm'
                  : 'text-[#A9B7A0] hover:text-[#F7F5EF]'
              }`}
            >
              Dish Yield
            </button>
            <button
              onClick={() => setActiveTab('ngos')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'ngos'
                  ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30 shadow-sm'
                  : 'text-[#A9B7A0] hover:text-[#F7F5EF]'
              }`}
            >
              NGO Leaderboard
            </button>
          </div>
        </div>

        {/* Tab 1: 7-Day Trends View */}
        {activeTab === 'trends' && (
          <div className="glass-panel-elevated p-8 rounded-3xl border border-[#28312B] space-y-8 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#28312B]">
              <div>
                <h3 className="text-lg font-bold text-[#F7F5EF]">Daily Kitchen Food Loss Comparison (kg)</h3>
                <p className="text-xs text-[#A9B7A0]">Comparing baseline unmanaged kitchen loss vs. MessSaver AI batching</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-red-500/40 border border-red-500" />
                  <span className="text-[#A9B7A0]">Conventional Mess Waste</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#D8F078]" />
                  <span className="text-[#F7F5EF] font-bold">MessSaver Residual</span>
                </div>
              </div>
            </div>

            {/* Custom Interactive SVG Bar Chart */}
            <div className="grid grid-cols-7 gap-3 sm:gap-6 items-end h-64 pt-6 pb-2 px-2 border-b border-[#28312B]">
              {weeklyTrends.map((t) => {
                const maxVal = 120;
                const convHeight = (t.conventionalKg / maxVal) * 100;
                const saveHeight = (t.messaverKg / maxVal) * 100;
                return (
                  <div key={t.day} className="flex flex-col items-center h-full justify-end group">
                    <div className="w-full max-w-[42px] flex items-end justify-center gap-1.5 h-full">
                      {/* Conventional Bar */}
                      <div 
                        className="w-1/2 bg-red-500/30 border border-red-500/40 rounded-t-md transition-all group-hover:bg-red-500/50 relative"
                        style={{ height: `${convHeight}%` }}
                      >
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {t.conventionalKg}k
                        </span>
                      </div>
                      {/* MessSaver Bar */}
                      <div 
                        className="w-1/2 bg-[#D8F078] rounded-t-md transition-all group-hover:bg-[#E4F88D] shadow-glow-lime relative"
                        style={{ height: `${saveHeight}%` }}
                      >
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-[#D8F078] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          {t.messaverKg}k
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#A9B7A0] mt-3 group-hover:text-[#F7F5EF] transition-colors">
                      {t.day}
                    </span>
                    <span className="text-[10px] font-mono text-[#D8F078] mt-0.5">
                      -{t.savedKg}kg
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-2xl bg-[#151916] border border-[#28312B]">
                <span className="text-xs font-mono text-[#A9B7A0]">Weekly Waste Prevented:</span>
                <div className="text-2xl font-bold font-editorial text-[#D8F078] mt-1">517.0 kg</div>
                <p className="text-[11px] text-[#A9B7A0] mt-0.5">82.3% decrease in kitchen scraps</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#151916] border border-[#28312B]">
                <span className="text-xs font-mono text-[#A9B7A0]">Ingredient Cost Protected:</span>
                <div className="text-2xl font-bold font-editorial text-[#F7F5EF] mt-1">₹49,115</div>
                <p className="text-[11px] text-[#A9B7A0] mt-0.5">Protected from municipal disposal</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#151916] border border-[#28312B]">
                <span className="text-xs font-mono text-[#A9B7A0]">Forecast Standard Error:</span>
                <div className="text-2xl font-bold font-editorial text-[#D8F078] mt-1">±3.8%</div>
                <p className="text-[11px] text-[#A9B7A0] mt-0.5">Validated against verified diner turnouts</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Dishes Breakdown View */}
        {activeTab === 'dishes' && (
          <div className="glass-panel-elevated p-8 rounded-3xl border border-[#28312B] space-y-6 animate-in fade-in duration-200">
            <div className="pb-4 border-b border-[#28312B]">
              <h3 className="text-lg font-bold text-[#F7F5EF]">Dish-by-Dish Consumption Efficiency</h3>
              <p className="text-xs text-[#A9B7A0]">Target preparation yield vs. plate scrapings recorded on digital smart scales</p>
            </div>

            <div className="space-y-4">
              {dishes.map((d, idx) => {
                const efficiencyPercent = Math.round((d.eatenKg / d.prepKg) * 100);
                return (
                  <div key={idx} className="p-4 rounded-2xl bg-[#151916] border border-[#28312B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#F7F5EF]">{d.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1C221E] text-[#D8F078] border border-[#D8F078]/20">
                          ★ {d.rating}
                        </span>
                      </div>
                      <div className="text-xs text-[#A9B7A0]">
                        Prepared: <span className="text-[#F7F5EF] font-mono">{d.prepKg} kg</span> | Consumed: <span className="text-[#D8F078] font-mono">{d.eatenKg} kg</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-32 sm:w-48 space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-[#A9B7A0]">Yield:</span>
                          <span className="text-[#D8F078] font-bold">{efficiencyPercent}%</span>
                        </div>
                        <div className="h-2 w-full bg-[#28312B] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#D8F078] rounded-full"
                            style={{ width: `${efficiencyPercent}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-mono text-[#A9B7A0] shrink-0">
                        {d.leftoverKg}kg unserved
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: NGOs Leaderboard View */}
        {activeTab === 'ngos' && (
          <div className="glass-panel-elevated p-8 rounded-3xl border border-[#28312B] space-y-6 animate-in fade-in duration-200">
            <div className="pb-4 border-b border-[#28312B]">
              <h3 className="text-lg font-bold text-[#F7F5EF]">Verified NGO Partner Impact Network</h3>
              <p className="text-xs text-[#A9B7A0]">Audited cold-chain distribution partners with verified food-safety handling</p>
            </div>

            <div className="space-y-4">
              {ngos.map((ngo, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-[#151916] border border-[#28312B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#123B2A] border border-[#D8F078]/30 flex items-center justify-center text-[#D8F078] font-bold text-sm">
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F7F5EF]">{ngo.name}</h4>
                      <span className="text-[11px] font-mono text-[#D8F078]">{ngo.badge}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs font-mono text-[#A9B7A0]">Pickups:</div>
                      <div className="text-sm font-bold font-mono text-[#F7F5EF]">{ngo.deliveries}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono text-[#A9B7A0]">Meals Delivered:</div>
                      <div className="text-base font-bold font-editorial text-[#D8F078]">{ngo.meals.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
