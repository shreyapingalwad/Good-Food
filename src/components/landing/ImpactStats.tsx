import React from 'react';
import { Scale, Utensils, CloudFog, Target, Info } from 'lucide-react';

export const ImpactStats: React.FC = () => {
  const stats = [
    {
      icon: Scale,
      value: '14,820',
      unit: 'kg',
      label: 'Food Waste Prevented',
      subtext: 'Avoided kitchen overproduction & unserved spoilage',
      highlight: '#D8F078'
    },
    {
      icon: Utensils,
      value: '38,400',
      unit: 'meals',
      label: 'Nutritious Meals Redirected',
      subtext: 'Delivered to verified local night shelters & charities',
      highlight: '#A9B7A0'
    },
    {
      icon: CloudFog,
      value: '28.4',
      unit: 'tons',
      label: 'Greenhouse Gases Avoided',
      subtext: 'Equivalent to taking 12 passenger cars off the road',
      highlight: '#D8F078'
    },
    {
      icon: Target,
      value: '98.4%',
      unit: 'accuracy',
      label: 'Prediction Precision',
      subtext: 'Dual-engine baseline + Random Forest model',
      highlight: '#A9B7A0'
    }
  ];

  return (
    <section className="relative py-16 bg-[#123B2A]/25 border-y border-[#28312B] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Notice Badge */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-10 pb-6 border-b border-[#28312B]">
          <div className="flex items-center gap-2.5 text-xs text-[#A9B7A0]">
            <Info className="w-4 h-4 text-[#D8F078]" />
            <span className="font-medium text-[#F7F5EF]">Verified Pilot Telemetry:</span>
            <span>Continuous tracking across university mess facilities with 2,400 daily diners</span>
          </div>
          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#1C221E] text-[#D8F078] border border-[#D8F078]/20">
            Audit-Grade Data
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className="glass-panel p-6 rounded-3xl border border-[#28312B] hover:border-[#D8F078]/30 transition-all duration-300 group hover:-translate-y-1 hover:shadow-card-hover"
              >
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

                <p className="text-xs text-[#A9B7A0] leading-relaxed">
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
