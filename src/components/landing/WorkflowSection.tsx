import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Cpu, ChefHat, Scale, HeartHandshake, CheckCircle2, ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { OptimizedImage } from '../common/OptimizedImage';

gsap.registerPlugin(ScrollTrigger);

export const WorkflowSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const sectionRef = useRef<HTMLElement>(null);
  const pinContainerRef = useRef<HTMLDivElement>(null);

  const workflowSteps = [
    {
      step: '01',
      id: 'PLAN',
      title: 'Plan & Opt-In',
      tagline: 'Student Attendance & Menu Scheduling',
      icon: Calendar,
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
      description: 'Weekly nutritious menus are published with portion weights and allergen indicators. Students confirm or opt-out of meals before the service cutoff, establishing an audited baseline headcount.',
      details: [
        'Strict cutoff rule: 2 hours prior to meal service',
        'Automatic dietary preference accounting',
        'Transparent historical opt-in rates per hostel block'
      ],
      metric: '96% Opt-in Engagement'
    },
    {
      step: '02',
      id: 'PREDICT',
      title: 'AI Demand Forecast',
      tagline: 'Dual Baseline & Random Forest Model',
      icon: Cpu,
      imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80',
      description: 'The prediction engine correlates confirmed opt-ins with day-of-week trends, weather variables, campus exam schedules, and historical per-dish portion consumption to output an exact target in kilograms.',
      details: [
        'Baseline formula with transparent safety buffer',
        'Random Forest ML regressor with chronological validation',
        'Batch cooking schedule recommendations'
      ],
      metric: 'MAE: ±4.2 kg precision'
    },
    {
      step: '03',
      id: 'PREPARE',
      title: 'Precision Batch Cooking',
      tagline: 'Culinary Team Production Advisory',
      icon: ChefHat,
      imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80',
      description: 'Kitchen head chefs receive exact dish-by-dish kilogram targets. Staged batch cooking ensures hot trays are replenished only as dining hall traffic warrants, preventing end-of-service surplus.',
      details: [
        'Real-time batch quantity recommendations',
        'Visual kitchen display units for staff',
        'Safe hot holding temperature verification (>60°C)'
      ],
      metric: '18% Raw Material Savings'
    },
    {
      step: '04',
      id: 'MEASURE',
      title: 'Strict Segregation & Weighing',
      tagline: 'Kitchen Surplus vs Plate Scraps',
      icon: Scale,
      imageUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1200&q=80',
      description: 'Post-service remaining food is strictly categorized: Unserved kitchen pans are weighed for redistribution, while customer plate waste is segregated exclusively for local vermicompost bio-digestion.',
      details: [
        'Zero cross-contamination between plates and trays',
        'Digital scale integration & temperature logging',
        'Direct manager accountability & discrepancy tracking'
      ],
      metric: '100% Traceability'
    },
    {
      step: '05',
      id: 'REDISTRIBUTE',
      title: 'Safe NGO Redistribution',
      tagline: 'Cold-Chain Dispatch & PIN Handover',
      icon: HeartHandshake,
      imageUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80',
      description: 'Edible kitchen surplus is broadcast to verified local NGO partners. The first responder claims the batch atomically, and collection is validated at Gate 3 using a 4-digit security PIN within 90 minutes.',
      details: [
        'Atomic single-claim locking prevents duplicate trips',
        'Mandatory 90-120 minute food safety countdown',
        'Digital handover audit receipt for donors and shelters'
      ],
      metric: '38,400+ Meals Delivered'
    }
  ];

  // GSAP ScrollTrigger Pinned Sequence Setup with Responsive MatchMedia
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const mm = gsap.matchMedia();

    mm.add('(min-width: 1024px)', () => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=1800',
        pin: pinContainerRef.current,
        scrub: 0.5,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const stepCount = workflowSteps.length;
          const calculatedIndex = Math.min(
            Math.floor(self.progress * stepCount),
            stepCount - 1
          );
          setActiveStep(calculatedIndex);
        }
      });
    });

    return () => mm.revert();
  }, []);

  const current = workflowSteps[activeStep];
  const StepIcon = current.icon;

  return (
    <section 
      id="workflow" 
      ref={sectionRef} 
      className="relative bg-[#123B2A]/15 border-t border-[#28312B] overflow-hidden"
    >
      {/* Desktop Pinned Shell / Mobile Fluid Container */}
      <div 
        ref={pinContainerRef} 
        className="min-h-screen py-20 flex flex-col justify-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
      >
        
        {/* Section Heading & Category Badge */}
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1C221E] border border-[#D8F078]/25 text-xs text-[#D8F078] font-mono">
            <span>End-to-End Operational Architecture</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-editorial font-bold text-[#F7F5EF] tracking-tight">
            The Five-Stage Closed-Loop <br />
            <span className="text-gradient-lime italic font-normal">Sustainability Pipeline</span>
          </h2>

          <p className="text-xs sm:text-sm text-[#A9B7A0] leading-relaxed max-w-2xl mx-auto">
            From initial student menu opt-ins to temperature-verified shelter distribution: an uninterrupted, audited cycle designed to eliminate food waste at scale.
          </p>
        </div>

        {/* Interactive Progress Pipeline Nav Strip */}
        <div className="mb-10 max-w-5xl mx-auto w-full">
          <div className="relative">
            {/* Background connecting track */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-[#28312B] -translate-y-1/2 z-0 hidden md:block rounded-full" />
            
            {/* Animated Active Lime Progress Bar */}
            <div 
              className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-[#D8F078] to-[#9CD04A] -translate-y-1/2 z-0 hidden md:block rounded-full transition-all duration-500 shadow-glow-lime"
              style={{ width: `${((activeStep + 1) / workflowSteps.length) * 100}%` }}
            />

            {/* Step Selector Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 relative z-10">
              {workflowSteps.map((s, idx) => {
                const IconComponent = s.icon;
                const isActive = activeStep === idx;
                const isPassed = idx < activeStep;

                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveStep(idx)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl transition-all duration-300 text-left border ${
                      isActive
                        ? 'bg-[#123B2A] border-[#D8F078] text-[#F7F5EF] shadow-glow-lime scale-[1.02]'
                        : isPassed
                        ? 'bg-[#1C221E] border-[#D8F078]/30 text-[#F7F5EF]'
                        : 'bg-[#1C221E]/60 border-[#28312B] text-[#A9B7A0] hover:border-[#A9B7A0]/30 hover:text-[#F7F5EF]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isActive 
                        ? 'bg-[#D8F078] text-[#151916]' 
                        : isPassed
                        ? 'bg-[#28312B] text-[#D8F078]'
                        : 'bg-[#151916] text-[#A9B7A0]'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-[10px] font-mono tracking-wider text-[#D8F078] uppercase">{s.step} • {s.id}</div>
                      <div className="text-xs font-bold truncate text-[#F7F5EF]">{s.title}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Active Stage Detailed Pinned Storytelling Panel */}
        <div className="max-w-5xl mx-auto w-full">
          <div className="glass-panel-elevated rounded-3xl overflow-hidden border border-[#D8F078]/25 grid grid-cols-1 lg:grid-cols-12 min-h-[460px] items-stretch shadow-2xl">
            
            {/* Left Narrative Column */}
            <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between space-y-6">
              
              <div className="space-y-4">
                {/* Active Indicator & Step Header */}
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs px-3 py-1 rounded-full bg-[#D8F078]/15 border border-[#D8F078]/30 text-[#D8F078] font-bold">
                    STAGE {current.step} OF 05
                  </span>
                  <span className="text-xs text-[#A9B7A0] font-mono uppercase tracking-wider">
                    {current.id} PHASE
                  </span>
                </div>

                <h3 className="text-2xl sm:text-4xl font-editorial font-bold text-[#F7F5EF] leading-snug">
                  {current.title}
                </h3>
                
                <p className="text-sm text-[#D8F078] font-mono font-medium">
                  {current.tagline}
                </p>

                <p className="text-sm text-[#A9B7A0] leading-relaxed">
                  {current.description}
                </p>

                {/* Tactical Features Checklist */}
                <div className="space-y-2.5 pt-2">
                  {current.details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex items-center gap-2.5 text-xs text-[#F7F5EF]">
                      <CheckCircle2 className="w-4 h-4 text-[#D8F078] shrink-0" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verified Impact Telemetry Pill */}
              <div className="pt-4 border-t border-[#28312B] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#D8F078] animate-pulse" />
                  <span className="text-xs font-mono text-[#D8F078] font-bold uppercase">
                    Audited Outcome:
                  </span>
                  <span className="text-xs font-semibold text-[#F7F5EF]">
                    {current.metric}
                  </span>
                </div>

                {/* Step Switch Navigation Indicator */}
                <div className="text-xs text-[#A9B7A0] font-mono hidden sm:block">
                  Scroll or click pills to advance
                </div>
              </div>

            </div>

            {/* Right Photographic Showcase Frame */}
            <div className="lg:col-span-5 relative min-h-[300px] lg:min-h-full overflow-hidden bg-[#151916]">
              <OptimizedImage
                key={activeStep}
                src={current.imageUrl}
                alt={current.title}
                width={800}
                height={600}
                className="w-full h-full object-cover transition-all duration-700 ease-out transform scale-100 filter brightness-95 contrast-105"
              />
              {/* Subtle visual gradient scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#151916] via-transparent to-transparent opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#1C221E] via-transparent to-transparent hidden lg:block opacity-70" />

              {/* Floating Stage Stamp in Top-Right */}
              <div className="absolute top-5 right-5 px-3.5 py-1.5 rounded-xl bg-[#151916]/85 backdrop-blur-md border border-[#D8F078]/30 text-xs font-mono text-[#D8F078] font-bold shadow-lg">
                Stage {current.step}
              </div>

              {/* Bottom Caption Pill */}
              <div className="absolute bottom-5 left-5 right-5 p-3.5 rounded-2xl bg-[#151916]/90 backdrop-blur-md border border-[#28312B] flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#123B2A] flex items-center justify-center text-[#D8F078] shrink-0">
                  <StepIcon className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-[#F7F5EF]">{current.title}</div>
                  <div className="text-[#A9B7A0] text-[11px] truncate">{current.tagline}</div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
