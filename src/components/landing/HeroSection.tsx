import React from 'react';
import { HeroFoodScene } from '../3d/HeroFoodScene';
import { ArrowRight, Play, Sparkles, ShieldCheck, HeartHandshake, TrendingDown } from 'lucide-react';
import { UserRole } from '../../types';

interface HeroSectionProps {
  onExplore: (role: UserRole) => void;
  onSeeHowItWorks: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onExplore, onSeeHowItWorks }) => {
  return (
    <section className="relative min-h-[92vh] pt-28 pb-16 flex items-center justify-center overflow-hidden bg-mesh-pattern">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#123B2A]/40 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-7 text-left space-y-6">
            
            {/* Live Status Pill */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#1C221E] border border-[#D8F078]/25 text-xs text-[#F7F5EF] shadow-lg">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D8F078] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D8F078]"></span>
              </span>
              <span className="font-mono text-[#D8F078] font-bold">Campus 1 Live Network</span>
              <span className="text-[#28312B]">|</span>
              <span className="text-[#A9B7A0] hidden sm:inline">1,850 students active today</span>
            </div>

            {/* Main Editorial Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-editorial font-bold text-[#F7F5EF] leading-[1.08] tracking-tight">
              Good Food <br />
              <span className="italic font-normal text-gradient-lime">
                Deserves a Better Future.
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="text-base sm:text-lg text-[#A9B7A0] max-w-xl font-normal leading-relaxed">
              Predict meal demand, prevent avoidable waste, and connect surplus food with communities that need it. An AI-engineered institutional dining ecosystem.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={() => onExplore('student')}
                className="group px-7 py-3.5 rounded-2xl font-semibold text-sm text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] transition-all duration-200 shadow-glow-lime flex items-center gap-2.5 active:scale-95"
              >
                <span>Explore the Platform</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={onSeeHowItWorks}
                className="group px-6 py-3.5 rounded-2xl font-semibold text-sm text-[#F7F5EF] bg-[#1C221E] hover:bg-[#28312B] border border-[#28312B] hover:border-[#A9B7A0]/40 transition-all duration-200 flex items-center gap-2.5"
              >
                <div className="w-6 h-6 rounded-full bg-[#123B2A] flex items-center justify-center text-[#D8F078] group-hover:scale-110 transition-transform">
                  <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                </div>
                <span>See How It Works</span>
              </button>
            </div>

            {/* Trust and Key Capabilities Badges */}
            <div className="pt-8 border-t border-[#28312B]/80 grid grid-cols-3 gap-4 max-w-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#D8F078] font-mono">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>-38%</span>
                </div>
                <p className="text-xs text-[#A9B7A0] leading-tight">Avoidable waste reduction</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#D8F078] font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>100%</span>
                </div>
                <p className="text-xs text-[#A9B7A0] leading-tight">Food safety verification</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#D8F078] font-mono">
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>90 min</span>
                </div>
                <p className="text-xs text-[#A9B7A0] leading-tight">Rapid NGO dispatch window</p>
              </div>
            </div>

          </div>

          {/* Right Column: Interactive 3D Food Hero Scene */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="w-full relative">
              {/* 3D Scene */}
              <HeroFoodScene />

              {/* Floating Stat Card Over 3D */}
              <div className="absolute top-4 right-2 sm:right-6 glass-panel-elevated p-3.5 rounded-2xl max-w-[210px] pointer-events-none border border-[#D8F078]/20 hidden sm:block animate-float-slow">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#D8F078]" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#D8F078]">Smart Headcount</span>
                </div>
                <div className="text-xl font-bold font-editorial text-[#F7F5EF]">1,420 Opt-ins</div>
                <p className="text-[11px] text-[#A9B7A0] mt-0.5 leading-snug">
                  Lunch target: 284 kg (-18kg vs static estimate)
                </p>
              </div>

              {/* Floating Environmental Pill */}
              <div className="absolute bottom-6 right-8 glass-panel px-4 py-2.5 rounded-2xl text-xs text-[#F7F5EF] border border-[#687B4B]/30 hidden sm:flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-[#D8F078]" />
                <span className="font-mono text-[11px] text-[#A9B7A0]">Methane avoidance active</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
