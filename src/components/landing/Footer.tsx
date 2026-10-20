import React from 'react';
import { Leaf, Heart, ShieldCheck, ExternalLink } from 'lucide-react';
import { UserRole } from '../../types';

interface FooterProps {
  onSelectRole: (role: UserRole) => void;
  onOpenAssetManifest: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectRole, onOpenAssetManifest }) => {
  return (
    <footer className="bg-[#0B2419]/60 border-t border-[#28312B] pt-16 pb-12 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#28312B]">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#123B2A] border border-[#D8F078]/30 flex items-center justify-center text-[#D8F078]">
                <Leaf className="w-5 h-5" />
              </div>
              <span className="font-editorial text-2xl font-bold text-[#F7F5EF]">MessSaver</span>
            </div>

            <p className="text-xs font-mono text-[#D8F078]">
              Mess Food Waste Prediction & Redistribution System
            </p>

            <p className="text-xs text-[#A9B7A0] max-w-sm leading-relaxed">
              Predict Better. Waste Less. Feed More. Connecting high-volume university dining halls with verified local shelter networks to end avoidable food waste.
            </p>

            <div className="pt-2 flex items-center gap-3 text-xs text-[#A9B7A0]">
              <span className="flex h-2 w-2 rounded-full bg-[#D8F078]" />
              <span>Campus Network Pilot V2.4</span>
            </div>
          </div>

          {/* Quick Portals Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#F7F5EF] font-bold">
              Application Portals
            </h4>
            <ul className="space-y-2 text-xs text-[#A9B7A0]">
              <li>
                <button onClick={() => onSelectRole('student')} className="hover:text-[#D8F078] transition-colors">
                  Student Meal Opt-in
                </button>
              </li>
              <li>
                <button onClick={() => onSelectRole('kitchen')} className="hover:text-[#D8F078] transition-colors">
                  Kitchen Production & Batching
                </button>
              </li>
              <li>
                <button onClick={() => onSelectRole('manager')} className="hover:text-[#D8F078] transition-colors">
                  Manager Buffers & Analytics
                </button>
              </li>
              <li>
                <button onClick={() => onSelectRole('ngo')} className="hover:text-[#D8F078] transition-colors">
                  NGO Surplus Claim Board
                </button>
              </li>
              <li>
                <button onClick={() => onSelectRole('admin')} className="hover:text-[#D8F078] transition-colors">
                  System Governance & Audits
                </button>
              </li>
            </ul>
          </div>

          {/* Architecture Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#F7F5EF] font-bold">
              Engineering
            </h4>
            <ul className="space-y-2 text-xs text-[#A9B7A0]">
              <li><a href="#simulator" className="hover:text-[#D8F078] transition-colors">Demand Simulator</a></li>
              <li><a href="#workflow" className="hover:text-[#D8F078] transition-colors">5-Stage Workflow</a></li>
              <li><a href="#technology" className="hover:text-[#D8F078] transition-colors">Random Forest Model</a></li>
              <li><a href="#redistribution" className="hover:text-[#D8F078] transition-colors">Food Safety Protocol</a></li>
              <li>
                <button onClick={onOpenAssetManifest} className="text-[#D8F078] hover:underline flex items-center gap-1">
                  <span>Asset Manifest</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </li>
            </ul>
          </div>

          {/* Environmental Pledge */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#F7F5EF] font-bold">
              Sustainability
            </h4>
            <div className="p-4 rounded-2xl bg-[#151916] border border-[#28312B] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#D8F078]">
                <ShieldCheck className="w-4 h-4" />
                <span>UN SDG Goal 12.3</span>
              </div>
              <p className="text-[11px] text-[#A9B7A0] leading-snug">
                Halving per capita food waste by 2030 through predictive prevention and dignified redistribution.
              </p>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A9B7A0]">
          <div>
            &copy; {new Date().getFullYear()} MessSaver Platform. Engineered for campus sustainability.
          </div>
          <div className="flex items-center gap-2">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-[#D8F078] fill-current" />
            <span>for zero avoidable food waste.</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
