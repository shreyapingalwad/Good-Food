import React from 'react';
import { Scale, Utensils, CloudFog, Target, Info } from 'lucide-react';

export const ImpactStats: React.FC = () => {
  const stats = [
    {
      icon: Scale,
      value: '14,820',
      unit: 'kg',
      label: 'Food Waste Diverted',
      subtext: 'Avoided overproduction & unserved tray disposal in 90-day pilot cycle',
      highlight: '#D8F078'
    },
    {
      icon: Utensils,
      value: '38,400',
      unit: 'meals',
      label: 'Nutritious Meals Redirected',
      subtext: 'Delivered to verified local night shelters & charities under cold-chain audit',
      highlight: '#A9B7A0'
    },
    {
      icon: CloudFog,
      value: '28.4',
      unit: 'tons CO₂e',
      label: 'Calculated GHG Avoidance',
      subtext: 'Calculated at ~1.9 kg CO₂e per kg food diverted from anaerobic landfill decomposition (FAO/EPA)',
      highlight: '#D8F078'
    },
    {
      icon: Target,
      value: '±4.2',
      unit: 'kg MAE',
      label: 'Validated Error Margin',
      subtext: 'Mean Absolute Error across 30-day chronological test split (Dual-Engine ML)',
      highlight: '#A9B7A0'
    }
  ];

  return (
    <section className="relative py-16 bg-[#123B2A]/20 border-y border-[#28312B] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Notice Badge */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-10 pb-6 border-b border-[#28312B]">
          <div className="flex items-center gap-2.5 text-xs text-[#A9B7A0]">
            <Info className="w-4 h-4 text-[#D8F078] shrink-0" />
            <span className="font-medium text-[#F7F5EF]">Demonstration Pilot Telemetry:</span>
            <span>Simulated university dining metrics based on 2,400 daily diner capacity and verified audit formulas.</span>
          </div>
          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#1C221E] text-[#D8F078] border border-[#D8F078]/25">
            Model Evaluation Dataset
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className="glass-panel p-6 rounded-3xl border border-[#28312B] hover:border-[#D8F078]/30 transition-all duration-300 group hover:-translate-y-1 hover:shadow-card-hover flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#1C221E] border border-[#28312B] flex items-center justify-center mb-5 group-hover:scale-110 group-hover:border-[#D8F078]/40 transition-all">
                    <Icon className="w-5 h-5 text-[#D8F078]" />
                  </div>
                  
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl sm:text-4xl font-editorial font-bold text-[#F7F5EF]">
                      {item.value}
                    </span>
                    <span className="text-xs font-mono uppercase tracking-wider text-[#D8F078] font-semibold">
                      {item.unit}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-[#F7F5EF] mb-1">
                    {item.label}
                  </h4>
                </div>

                <p className="text-xs text-[#A9B7A0] leading-relaxed mt-2 pt-2 border-t border-[#28312B]/50">
                  {item.subtext}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
