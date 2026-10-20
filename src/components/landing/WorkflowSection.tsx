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
      description: 'Edible kitchen surplus is broadcast to verified local NGO partners. The first responder claims the batch atomically, and collection is validated at Gate 3 using a 4-digit security PIN within 90 minutes.',
      details: [
        'Atomic single-claim locking prevents duplicate trips',
        'Mandatory 90-120 minute food safety countdown',
        'Digital handover audit receipt for donors and shelters'
      ],
      metric: '38,400+ Meals Delivered'
    }
  ];

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
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-0.5 bg-[#28312B] -translate-y-1/2 z-0" />
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 relative z-10">
            {workflowSteps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeStep === idx;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(idx)}
                  className={`p-4 rounded-2xl text-left transition-all duration-200 border relative group ${
                    isActive
                      ? 'bg-[#1C221E] border-[#D8F078] shadow-glow-lime'
                      : 'glass-panel border-[#28312B] hover:border-[#A9B7A0]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-mono font-bold ${isActive ? 'text-[#D8F078]' : 'text-[#A9B7A0]'}`}>
                      {step.step}
                    </span>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform ${
                      isActive ? 'bg-[#123B2A] text-[#D8F078] scale-110' : 'bg-[#151916] text-[#A9B7A0]'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="text-xs uppercase tracking-wider font-mono text-[#A9B7A0] mb-0.5">
                    {step.id}
                  </div>
                  <div className={`text-sm font-bold truncate ${isActive ? 'text-[#F7F5EF]' : 'text-[#A9B7A0]'}`}>
                    {step.title}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Inspection Card of Selected Step */}
        <div className="glass-panel-elevated p-8 sm:p-10 rounded-3xl border border-[#D8F078]/25 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-8 space-y-5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30">
                  STAGE {workflowSteps[activeStep].step} — {workflowSteps[activeStep].id}
                </span>
                <span className="text-xs font-semibold text-[#A9B7A0]">
                  {workflowSteps[activeStep].tagline}
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-editorial font-bold text-[#F7F5EF]">
                {workflowSteps[activeStep].title}
              </h3>

              <p className="text-sm sm:text-base text-[#A9B7A0] leading-relaxed">
                {workflowSteps[activeStep].description}
              </p>

              {/* Protocol Checklist */}
              <div className="pt-2 space-y-2.5">
                {workflowSteps[activeStep].details.map((detail, dIdx) => (
                  <div key={dIdx} className="flex items-center gap-2.5 text-xs sm:text-sm text-[#F7F5EF]">
                    <CheckCircle2 className="w-4 h-4 text-[#D8F078] shrink-0" />
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Metric Callout */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center p-8 rounded-2xl bg-[#151916] border border-[#28312B] text-center space-y-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#A9B7A0]">
                Key Performance Indicator
              </span>
              <div className="text-2xl sm:text-3xl font-editorial font-bold text-[#D8F078]">
                {workflowSteps[activeStep].metric}
              </div>
              <p className="text-xs text-[#A9B7A0]">
                Validated continuously in production telemetry
              </p>

              <button
                onClick={() => setActiveStep((activeStep + 1) % workflowSteps.length)}
                className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold text-[#F7F5EF] bg-[#1C221E] hover:bg-[#28312B] border border-[#28312B] flex items-center gap-2 transition-all"
              >
                <span>Next Stage</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D8F078]" />
              </button>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
