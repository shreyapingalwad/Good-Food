import React, { useState } from 'react';
import { Calendar, Cpu, ChefHat, Scale, HeartHandshake, CheckCircle2, ArrowRight } from 'lucide-react';

export const WorkflowSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  const workflowSteps = [
    {
      step: '01',
      id: 'PLAN',
      title: 'Plan & Opt-In',
      tagline: 'Student Attendance & Menu Scheduling',
      icon: Calendar,
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
      description: 'Weekly nutritious menus are published with portion weights and allergen indicators. Students confirm or opt-out of meals before the service cutoff, establishing an audited baseline headcount.',
      details: [
        'Cutoff rule: 2 hours prior to meal service',
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
      imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80',
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
      imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
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
      imageUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=800&q=80',
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
      imageUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80',
      description: 'Edible kitchen surplus is broadcast to verified local NGO partners. The first responder claims the batch atomically, and collection is validated at Gate 3 using a 4-digit security PIN within 90 minutes.',
      details: [
        'Atomic single-claim locking prevents duplicate trips',
        'Mandatory 90-120 minute food safety countdown',
        'Digital handover audit receipt for donors and shelters'
      ],
      metric: '38,400+ Meals Delivered'
    }
  ];

  const current = workflowSteps[activeStep];

  return (
    <section id="workflow" className="relative py-28 bg-[#123B2A]/15 border-t border-[#28312B] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1C221E] border border-[#D8F078]/25 text-xs text-[#D8F078] font-mono">
            <span>End-to-End Operational Architecture</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-editorial font-bold text-[#F7F5EF] tracking-tight">
            The Five-Stage Closed-Loop <br />
            <span className="text-gradient-lime italic font-normal">Sustainability Pipeline</span>
          </h2>

          <p className="text-sm sm:text-base text-[#A9B7A0] leading-relaxed">
            Every meal follows an audited trajectory from initial headcount to safe community redistribution. Click any stage to inspect the operational protocols.
          </p>
        </div>

        {/* Pipeline Navigation Steps */}
        <div className="relative mb-12">
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-0.5 bg-[#28312B] -translate-y-1/2 z-0" />
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 relative z-10">
            {workflowSteps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeStep === idx;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(idx)}
                  className={`p-4 rounded-2xl text-left transition-all duration-200 border relative group overflow-hidden ${
                    isActive
                      ? 'bg-[#1C221E] border-[#D8F078] shadow-glow-lime'
                      : 'glass-panel border-[#28312B] hover:border-[#A9B7A0]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <span className={`text-xs font-mono font-bold ${isActive ? 'text-[#D8F078]' : 'text-[#A9B7A0]'}`}>
                      {step.step}
                    </span>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform ${
                      isActive ? 'bg-[#123B2A] text-[#D8F078] scale-110 shadow-sm' : 'bg-[#151916] text-[#A9B7A0]'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="text-xs uppercase tracking-wider font-mono text-[#A9B7A0] mb-0.5 relative z-10">
                    {step.id}
                  </div>
                  <div className={`text-sm font-bold truncate relative z-10 ${isActive ? 'text-[#F7F5EF]' : 'text-[#A9B7A0]'}`}>
                    {step.title}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Inspection Card of Selected Step with Photography */}
        <div className="glass-panel-elevated rounded-3xl border border-[#D8F078]/25 overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch">
            
            {/* Left Content */}
            <div className="lg:col-span-7 p-8 sm:p-10 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30">
                    STAGE {current.step} — {current.id}
                  </span>
                  <span className="text-xs font-semibold text-[#A9B7A0]">
                    {current.tagline}
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-editorial font-bold text-[#F7F5EF]">
                  {current.title}
                </h3>

                <p className="text-sm sm:text-base text-[#A9B7A0] leading-relaxed">
                  {current.description}
                </p>

                {/* Protocol Checklist */}
                <div className="pt-2 space-y-2.5">
                  {current.details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex items-center gap-2.5 text-xs sm:text-sm text-[#F7F5EF]">
                      <CheckCircle2 className="w-4 h-4 text-[#D8F078] shrink-0" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Navigation Control */}
              <div className="pt-6 border-t border-[#28312B] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#A9B7A0] block">Target Standard</span>
                  <span className="text-lg font-bold font-editorial text-[#D8F078]">{current.metric}</span>
                </div>

                <button
                  onClick={() => setActiveStep((activeStep + 1) % workflowSteps.length)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] flex items-center gap-2 transition-all shadow-glow-lime"
                >
                  <span>Next Stage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right Photography Frame */}
            <div className="lg:col-span-5 relative min-h-[300px] lg:min-h-full">
              <img 
                src={current.imageUrl} 
                alt={current.title}
                className="w-full h-full object-cover filter brightness-90 contrast-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#151916] via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#1C221E] lg:via-transparent lg:to-transparent opacity-80" />
              
              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-[#151916]/80 backdrop-blur-md border border-[#D8F078]/20 flex items-center justify-between text-xs text-[#F7F5EF]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D8F078]" />
                  <span className="font-mono text-[11px] text-[#A9B7A0]">Live Facility Verification</span>
                </div>
                <span className="font-mono text-[#D8F078] font-bold">Passed Check</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
