import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, DollarSign, Flame, Trash2, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';

export const ProblemSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'legacy' | 'messaver'>('messaver');

  return (
    <section id="problem" className="relative py-28 bg-[#151916] overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#123B2A]/30 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1C221E] border border-[#D8F078]/25 text-xs text-[#D8F078] font-mono">
            <AlertTriangle className="w-3.5 h-3.5 text-[#D8F078]" />
            <span>The Institutional Dining Dilemma</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-editorial font-bold text-[#F7F5EF] tracking-tight">
            Why 40% of Prepared Mess Food <br />
            <span className="text-gradient-lime italic font-normal">Ends Up in Landfills</span>
          </h2>

          <p className="text-sm sm:text-base text-[#A9B7A0] leading-relaxed">
            Conventional university and workplace dining facilities rely on static rule-of-thumb preparation rules. Unpredicted attendance surges create shortages, while weekend drops result in massive unserved pans discarded at midnight.
          </p>

          {/* Interactive Toggle */}
          <div className="pt-4 flex justify-center">
            <div className="inline-flex p-1.5 rounded-2xl bg-[#1C221E] border border-[#28312B]">
              <button
                onClick={() => setActiveTab('legacy')}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'legacy'
                    ? 'bg-[#28312B] text-[#F7F5EF] shadow-md'
                    : 'text-[#A9B7A0] hover:text-[#F7F5EF]'
                }`}
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Conventional Dining Mess</span>
              </button>

              <button
                onClick={() => setActiveTab('messaver')}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'messaver'
                    ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30 shadow-glow-lime'
                    : 'text-[#A9B7A0] hover:text-[#F7F5EF]'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#D8F078]" />
                <span>MessSaver Closed-Loop</span>
              </button>
            </div>
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Legacy Card */}
          <div className={`p-8 rounded-3xl transition-all duration-300 border ${
            activeTab === 'legacy' 
              ? 'bg-[#1C221E] border-red-500/40 shadow-2xl scale-[1.01]' 
              : 'glass-panel border-[#28312B] opacity-75'
          }`}>
            <div className="flex items-center justify-between pb-6 border-b border-[#28312B] mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F7F5EF]">Conventional Status Quo</h3>
                  <p className="text-xs text-[#A9B7A0]">Static guesswork & blind batching</p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                High Risk
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#151916]/60 border border-[#28312B]">
                <Flame className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[#F7F5EF]">35% - 40% Overproduction Gap</div>
                  <p className="text-xs text-[#A9B7A0] mt-0.5">Kitchens overcook to prevent "running out" complaints, producing dozens of unused gastronorm pans daily.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#151916]/60 border border-[#28312B]">
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[#F7F5EF]">Contaminated Disposal</div>
                  <p className="text-xs text-[#A9B7A0] mt-0.5">Edible unserved kitchen trays are dumped into black garbage sacks alongside uneaten plate scraps, making redistribution impossible.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#151916]/60 border border-[#28312B]">
                <DollarSign className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[#F7F5EF]">Unbudgeted Food Loss</div>
                  <p className="text-xs text-[#A9B7A0] mt-0.5">An average campus kitchen bleeds $45,000 to $70,000 annually in discarded raw ingredients and waste disposal fees.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#28312B] flex items-center justify-between text-xs text-[#A9B7A0]">
              <span>Result: Discarded into landfill</span>
              <span className="font-mono text-red-400 font-bold">~420 kg discarded weekly</span>
            </div>
          </div>

          {/* MessSaver Solution Card */}
          <div className={`p-8 rounded-3xl transition-all duration-300 border ${
            activeTab === 'messaver' 
              ? 'bg-[#1C221E] border-[#D8F078]/40 shadow-glow-forest scale-[1.01]' 
              : 'glass-panel border-[#28312B] opacity-75'
          }`}>
            <div className="flex items-center justify-between pb-6 border-b border-[#28312B] mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#123B2A] border border-[#D8F078]/30 flex items-center justify-center text-[#D8F078]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F7F5EF]">MessSaver Intelligent Platform</h3>
                  <p className="text-xs text-[#D8F078]">Continuous feedback loop & safety chain</p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/25">
                Zero Avoidable Waste
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#123B2A]/40 border border-[#D8F078]/20">
                <Sparkles className="w-5 h-5 text-[#D8F078] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[#F7F5EF]">Real-time Student Opt-in Signal</div>
                  <p className="text-xs text-[#A9B7A0] mt-0.5">Students log meal attendance before the service cutoff, reducing head-count uncertainty from ±30% down to &lt; 2%.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#123B2A]/40 border border-[#D8F078]/20">
                <CheckCircle2 className="w-5 h-5 text-[#D8F078] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[#F7F5EF]">Strict Edible vs Plate Waste Separation</div>
                  <p className="text-xs text-[#A9B7A0] mt-0.5">Kitchen surplus is packed hot at 65°C+ into sealed containers; plate leftovers go to local vermicompost bio-digestion.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#123B2A]/40 border border-[#D8F078]/20">
                <ArrowRight className="w-5 h-5 text-[#D8F078] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[#F7F5EF]">90-Minute Fast NGO Handover</div>
                  <p className="text-xs text-[#A9B7A0] mt-0.5">Verified local shelter partners receive automated dispatch notifications, claiming and picking up safe food with 4-digit PIN verification.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#28312B] flex items-center justify-between text-xs text-[#A9B7A0]">
              <span>Result: 100% Edible Surplus Diverted</span>
              <span className="font-mono text-[#D8F078] font-bold">110 meals saved per shift</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
