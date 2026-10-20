import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, DollarSign, Flame, Trash2, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { OptimizedImage } from '../common/OptimizedImage';

gsap.registerPlugin(ScrollTrigger);

export const ProblemSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'legacy' | 'messaver'>('messaver');
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      if (cardsRef.current) {
        gsap.from(cardsRef.current.children, {
          y: 45,
          opacity: 0,
          duration: 0.8,
          stagger: 0.18,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: cardsRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="problem" ref={sectionRef} className="relative py-28 bg-[#151916] overflow-hidden">
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

        {/* Photographic Comparison Grid */}
        <div ref={cardsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Legacy Card with Landfill Imagery Backdrop */}
          <div className={`relative rounded-3xl overflow-hidden transition-all duration-300 border flex flex-col justify-between ${
            activeTab === 'legacy' 
              ? 'border-red-500/50 shadow-2xl scale-[1.01]' 
              : 'border-[#28312B] opacity-80'
          }`}>
            {/* Background Photography with Gradient Overlay */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              <OptimizedImage 
                src="https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=1000&q=80" 
                alt="Landfill food waste crisis"
                width={1000}
                height={667}
                className="w-full h-full object-cover filter grayscale contrast-125 opacity-25 transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#151916] via-[#1C221E]/95 to-[#1C221E]/90" />
            </div>

            <div className="relative z-10 p-8 space-y-6">
              <div className="flex items-center justify-between pb-6 border-b border-[#28312B]">
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
                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#151916]/80 border border-red-500/20 backdrop-blur-md">
                  <Flame className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#F7F5EF]">35% - 40% Overproduction Gap</div>
                    <p className="text-xs text-[#A9B7A0] mt-0.5">Kitchens overcook to prevent "running out" complaints, producing dozens of unused gastronorm pans daily.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#151916]/80 border border-red-500/20 backdrop-blur-md">
                  <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#F7F5EF]">Contaminated Disposal</div>
                    <p className="text-xs text-[#A9B7A0] mt-0.5">Edible unserved kitchen trays are dumped into black garbage sacks alongside uneaten plate scraps, making redistribution impossible.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#151916]/80 border border-red-500/20 backdrop-blur-md">
                  <DollarSign className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#F7F5EF]">Unbudgeted Food Loss</div>
                    <p className="text-xs text-[#A9B7A0] mt-0.5">An average campus kitchen bleeds ₹45,000 to ₹70,000 monthly in discarded raw ingredients and waste disposal fees.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 p-6 mx-8 mb-6 rounded-2xl bg-[#151916]/90 border border-red-500/30 flex items-center justify-between text-xs text-[#A9B7A0]">
              <span>Result: Discarded into landfill</span>
              <span className="font-mono text-red-400 font-bold">~420 kg discarded weekly</span>
            </div>
          </div>

          {/* MessSaver Solution Card with Fresh Farm Harvest Imagery */}
          <div className={`relative rounded-3xl overflow-hidden transition-all duration-300 border flex flex-col justify-between ${
            activeTab === 'messaver' 
              ? 'border-[#D8F078]/50 shadow-glow-forest scale-[1.01]' 
              : 'border-[#28312B] opacity-80'
          }`}>
            {/* Background Photography with Gradient Overlay */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              <OptimizedImage 
                src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=80" 
                alt="Fresh organic produce harvest"
                width={1000}
                height={667}
                className="w-full h-full object-cover filter brightness-90 contrast-110 opacity-35 transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#151916] via-[#123B2A]/90 to-[#123B2A]/80" />
            </div>

            <div className="relative z-10 p-8 space-y-6">
              <div className="flex items-center justify-between pb-6 border-b border-[#28312B]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D8F078]/15 border border-[#D8F078]/30 flex items-center justify-center text-[#D8F078]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#F7F5EF]">MessSaver Intelligence</h3>
                    <p className="text-xs text-[#D8F078] font-mono">Predictive Closed-Loop</p>
                  </div>
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#D8F078]/15 text-[#D8F078] border border-[#D8F078]/30 font-bold">
                  High Yield
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#151916]/85 border border-[#D8F078]/25 backdrop-blur-md">
                  <CheckCircle2 className="w-5 h-5 text-[#D8F078] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#F7F5EF]">Audited Opt-In Headcounts</div>
                    <p className="text-xs text-[#A9B7A0] mt-0.5">Students confirm attendance 2 hours prior; Random Forest model correlates weather & exam schedules to compute batch sizes.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#151916]/85 border border-[#D8F078]/25 backdrop-blur-md">
                  <CheckCircle2 className="w-5 h-5 text-[#D8F078] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#F7F5EF]">Strict Kitchen Segregation</div>
                    <p className="text-xs text-[#A9B7A0] mt-0.5">Unserved hotel pans never mix with plate scraps. Edible surplus is preserved in sanitary conditions for community distribution.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#151916]/85 border border-[#D8F078]/25 backdrop-blur-md">
                  <CheckCircle2 className="w-5 h-5 text-[#D8F078] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#F7F5EF]">Automated NGO Dispatch</div>
                    <p className="text-xs text-[#A9B7A0] mt-0.5">Surplus alerts broadcast instantly to verified shelters with 90-minute holding windows and PIN-verified pickup handovers.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 p-6 mx-8 mb-6 rounded-2xl bg-[#151916]/90 border border-[#D8F078]/30 flex items-center justify-between text-xs text-[#A9B7A0]">
              <span>Result: Preserved & redistributed</span>
              <span className="font-mono text-[#D8F078] font-bold">0% avoidable waste to landfill</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
