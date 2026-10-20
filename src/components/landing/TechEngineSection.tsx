import React, { useEffect, useRef } from 'react';
import { Cpu, Terminal, CheckCircle2, AlertCircle, Layers, BarChart } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const TechEngineSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const modelsGridRef = useRef<HTMLDivElement>(null);
  const weightsGridRef = useRef<HTMLDivElement>(null);

  const featureWeights = [
    { name: 'Confirmed Student Opt-In Signal', weight: '68%', numeric: 68, desc: 'Actual students registered before cutoff time' },
    { name: 'Day of Week & Academic Rhythm', weight: '14%', numeric: 14, desc: 'Friday evening surge vs. Sunday lunch drops' },
    { name: 'Historical Dish Affinity Score', weight: '10%', numeric: 10, desc: 'Individual dish ratings & portion consumption' },
    { name: 'Exam Schedules & Weather Radar', weight: '8%', numeric: 8, desc: 'Local campus events, rainfall, and exam week dining' }
  ];

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      if (modelsGridRef.current) {
        gsap.from(modelsGridRef.current.children, {
          y: 35,
          opacity: 0,
          duration: 0.8,
          stagger: 0.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: modelsGridRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        });
      }

      if (weightsGridRef.current) {
        gsap.from(weightsGridRef.current.children, {
          y: 25,
          opacity: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: weightsGridRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="technology" ref={sectionRef} className="relative py-28 bg-[#123B2A]/15 border-t border-[#28312B] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1C221E] border border-[#D8F078]/25 text-xs text-[#D8F078] font-mono">
            <Cpu className="w-3.5 h-3.5 text-[#D8F078]" />
            <span>Algorithmic Transparency & Model Architecture</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-editorial font-bold text-[#F7F5EF] tracking-tight">
            Dual-Engine Precision: <br />
            <span className="text-gradient-lime italic font-normal">Baseline Formula & Random Forest ML</span>
          </h2>

          <p className="text-sm sm:text-base text-[#A9B7A0] leading-relaxed">
            We reject "black-box" generative claims. MessSaver employs an open, verifiable two-tier architecture: A transparent operational baseline and an ensemble Random Forest regressor with chronological validation.
          </p>
        </div>

        {/* Two Models Comparison Grid */}
        <div ref={modelsGridRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          {/* Baseline Formula Card */}
          <div className="glass-panel p-8 rounded-3xl border border-[#28312B] space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-[#28312B]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1C221E] border border-[#28312B] flex items-center justify-center text-[#D8F078]">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F7F5EF]">Tier 1: Operational Baseline</h3>
                  <p className="text-xs text-[#A9B7A0]">Deterministic, zero cold-start latency</p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/20">
                Formula
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#151916] border border-[#28312B] font-mono text-xs text-[#D8F078] leading-relaxed">
              Recommended Quantity (kg) = <br />
              &nbsp;&nbsp;Expected Attendance × <br />
              &nbsp;&nbsp;Historical Per-Person Intake (kg) × <br />
              &nbsp;&nbsp;(1 + Configured Safety Buffer %)
            </div>

            <div className="space-y-2 text-xs text-[#A9B7A0]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D8F078] shrink-0" />
                <span>Auditable by kitchen managers without data science background</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D8F078] shrink-0" />
                <span>Immediate deployment with zero training data required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D8F078] shrink-0" />
                <span>Configurable safety buffer (0% - 20%) prevents under-portioning</span>
              </div>
            </div>
          </div>

          {/* Random Forest ML Model Card */}
          <div className="glass-panel p-8 rounded-3xl border border-[#D8F078]/25 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-[#28312B]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#123B2A] border border-[#D8F078]/30 flex items-center justify-center text-[#D8F078]">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F7F5EF]">Tier 2: Random Forest Regressor</h3>
                  <p className="text-xs text-[#D8F078]">Non-linear historical correlation</p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30">
                scikit-learn
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#151916] border border-[#28312B]">
                <span className="text-[10px] text-[#A9B7A0] block">MAE (Mean Error):</span>
                <span className="text-base font-bold text-[#D8F078]">±4.2 kg</span>
              </div>
              <div className="p-3 rounded-xl bg-[#151916] border border-[#28312B]">
                <span className="text-[10px] text-[#A9B7A0] block">Validation Method:</span>
                <span className="text-base font-bold text-[#F7F5EF]">Chronological</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#A9B7A0]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D8F078] shrink-0" />
                <span>Chronological back-testing prevents lookahead bias</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D8F078] shrink-0" />
                <span>Features: Day, Holiday, Exam Week, Weather Temp, Dish Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D8F078] shrink-0" />
                <span>Automatic fallback to baseline if sample size &lt; 30 days</span>
              </div>
            </div>
          </div>

        </div>

        {/* Feature Importance Hierarchy */}
        <div className="glass-panel-elevated p-8 rounded-3xl border border-[#28312B] space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#28312B]">
            <div>
              <h4 className="text-base font-bold text-[#F7F5EF]">Model Feature Importance Breakdown</h4>
              <p className="text-xs text-[#A9B7A0]">How the model weights factors when computing meal batch recommendations</p>
            </div>
            <BarChart className="w-5 h-5 text-[#D8F078]" />
          </div>

          <div ref={weightsGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {featureWeights.map((f, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-[#151916] border border-[#28312B] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#A9B7A0]">Weight</span>
                  <span className="text-sm font-mono font-bold text-[#D8F078]">{f.weight}</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full h-1.5 bg-[#28312B] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#123B2A] to-[#D8F078] rounded-full transition-all duration-1000"
                    style={{ width: `${f.numeric}%` }}
                  />
                </div>
                <div className="text-xs font-bold text-[#F7F5EF] leading-snug">{f.name}</div>
                <p className="text-[11px] text-[#A9B7A0] leading-normal">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center gap-2 text-xs text-[#687B4B] font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#D8F078]" />
            <span>Honesty & Ethical AI Pledge: We report verified Mean Absolute Errors (MAE). No hypothetical 100% predictions.</span>
          </div>
        </div>

      </div>
    </section>
  );
};
