import React, { useState, useEffect } from 'react';
import { Leaf, Menu, X, ArrowRight, ShieldCheck, Sparkles, ChevronDown } from 'lucide-react';
import { UserRole } from '../../types';

interface NavbarProps {
  onSelectRole: (role: UserRole) => void;
  activeView: 'landing' | 'portal';
  currentRole: UserRole;
  onNavigateHome: () => void;
  onOpenAssetManifest: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSelectRole,
  activeView,
  currentRole,
  onNavigateHome,
  onOpenAssetManifest
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const rolesList: { id: UserRole; label: string; desc: string; icon: string }[] = [
    { id: 'student', label: 'Student Portal', desc: 'Opt-in meals, rate dishes, view personal impact', icon: '🎓' },
    { id: 'kitchen', label: 'Kitchen Portal', desc: 'Batch prep advisory, log surplus & plate waste', icon: '👨‍🍳' },
    { id: 'manager', label: 'Manager Portal', desc: 'Buffer overrides, waste audits, CSV exports', icon: '📊' },
    { id: 'ngo', label: 'NGO Portal', desc: 'Browse & claim available food batches with PIN', icon: '🤝' },
    { id: 'admin', label: 'Admin Portal', desc: 'System governance, verify NGOs, audit trail', icon: '⚙️' }
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || activeView === 'portal'
          ? 'bg-[#151916]/95 backdrop-blur-xl border-b border-[#28312B] py-3 shadow-2xl'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Brand Logo */}
          <button 
            onClick={onNavigateHome}
            className="flex items-center gap-3 text-left group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-[#123B2A] border border-[#D8F078]/40 flex items-center justify-center text-[#D8F078] shadow-glow-lime group-hover:scale-105 transition-transform duration-300">
              <Leaf className="w-5 h-5 text-[#D8F078]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-editorial text-2xl font-bold tracking-tight text-[#F7F5EF] group-hover:text-[#D8F078] transition-colors">
                  MessSaver
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/25 hidden sm:inline-block">
                  AI-V2
                </span>
              </div>
              <p className="text-[11px] text-[#A9B7A0] hidden md:block">
                Predict Better. Waste Less. Feed More.
              </p>
            </div>
          </button>

          {/* Center Navigation Links (When on Landing Page) */}
          {activeView === 'landing' ? (
            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#A9B7A0]">
              <a href="#problem" className="hover:text-[#F7F5EF] transition-colors">
                The Problem
              </a>
              <a href="#technology" className="hover:text-[#F7F5EF] transition-colors">
                Prediction Engine
              </a>
              <a href="#simulator" className="hover:text-[#F7F5EF] transition-colors flex items-center gap-1.5 text-[#F7F5EF]">
                <Sparkles className="w-3.5 h-3.5 text-[#D8F078]" />
                Demand Simulator
              </a>
              <a href="#workflow" className="hover:text-[#F7F5EF] transition-colors">
                5-Stage Workflow
              </a>
              <a href="#redistribution" className="hover:text-[#F7F5EF] transition-colors">
                Food Safety
              </a>
              <a href="#impact" className="hover:text-[#F7F5EF] transition-colors">
                Impact Telemetry
              </a>
              <button 
                onClick={onOpenAssetManifest}
                className="text-xs text-[#A9B7A0] hover:text-[#D8F078] underline underline-offset-4 transition-colors ml-1"
              >
                Asset Manifest
              </button>
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs font-mono text-[#A9B7A0]">Campus Network:</span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/30">
                Grand Central Mess — Active Shift
              </span>
            </div>
          )}

          {/* Right Action: Launch App / Switch Portals */}
          <div className="flex items-center gap-3">
            {activeView === 'landing' ? (
              <>
                {/* Role dropdown launcher */}
                <div className="relative">
                  <button
                    onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#F7F5EF] bg-[#1C221E] border border-[#28312B] hover:border-[#D8F078]/40 hover:bg-[#1C221E]/80 transition-all duration-200"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#D8F078]" />
                    <span className="hidden sm:inline">Role:</span>
                    <span className="capitalize text-[#D8F078] font-bold">{currentRole}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${roleDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {roleDropdownOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#1C221E] border border-[#28312B] p-2 shadow-2xl z-50 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
                      onMouseLeave={() => setRoleDropdownOpen(false)}
                    >
                      <div className="px-3 py-2 text-[11px] font-mono uppercase text-[#A9B7A0] border-b border-[#28312B]">
                        Select Live Application Role:
                      </div>
                      <div className="mt-1 space-y-1">
                        {rolesList.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => {
                              onSelectRole(r.id);
                              setRoleDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 flex items-start gap-3 ${
                              currentRole === r.id
                                ? 'bg-[#123B2A] text-[#F7F5EF] border border-[#D8F078]/30'
                                : 'hover:bg-[#28312B]/60 text-[#A9B7A0] hover:text-[#F7F5EF]'
                            }`}
                          >
                            <span className="text-xl">{r.icon}</span>
                            <div>
                              <div className="text-xs font-bold flex items-center gap-1.5">
                                {r.label}
                                {currentRole === r.id && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#D8F078]" />
                                )}
                              </div>
                              <div className="text-[11px] text-[#A9B7A0] leading-snug line-clamp-1 mt-0.5">
                                {r.desc}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onSelectRole('student')}
                  className="relative group overflow-hidden px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] transition-all duration-200 shadow-glow-lime flex items-center gap-2 active:scale-95"
                >
                  <span>Launch App</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </>
            ) : (
              <button
                onClick={onNavigateHome}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#F7F5EF] bg-[#1C221E] hover:bg-[#28312B] border border-[#28312B] hover:border-[#D8F078]/40 transition-all flex items-center gap-2"
              >
                <span>← Back to Overview</span>
              </button>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-[#A9B7A0] hover:text-[#F7F5EF] bg-[#1C221E] border border-[#28312B]"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#151916]/98 border-b border-[#28312B] px-6 py-6 space-y-4 backdrop-blur-2xl">
          <div className="space-y-3 font-medium text-sm text-[#A9B7A0]">
            <a 
              href="#problem" 
              onClick={() => setMobileMenuOpen(false)}
              className="block hover:text-[#F7F5EF]"
            >
              The Problem & Opportunity
            </a>
            <a 
              href="#technology" 
              onClick={() => setMobileMenuOpen(false)}
              className="block hover:text-[#F7F5EF]"
            >
              Dual-Engine Prediction
            </a>
            <a 
              href="#simulator" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-[#D8F078] font-semibold"
            >
              ✨ Demand Simulator
            </a>
            <a 
              href="#workflow" 
              onClick={() => setMobileMenuOpen(false)}
              className="block hover:text-[#F7F5EF]"
            >
              5-Stage Workflow Pipeline
            </a>
            <a 
              href="#redistribution" 
              onClick={() => setMobileMenuOpen(false)}
              className="block hover:text-[#F7F5EF]"
            >
              Food Safety & NGO Network
            </a>
            <a 
              href="#impact" 
              onClick={() => setMobileMenuOpen(false)}
              className="block hover:text-[#F7F5EF]"
            >
              Live Impact & Telemetry
            </a>
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAssetManifest();
              }}
              className="block text-xs text-[#D8F078] underline"
            >
              View Asset Manifest & Licensing
            </button>
          </div>

          <div className="pt-4 border-t border-[#28312B]">
            <div className="text-xs font-mono text-[#A9B7A0] mb-2 uppercase">Switch Application Portal:</div>
            <div className="grid grid-cols-2 gap-2">
              {rolesList.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    onSelectRole(r.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium text-left flex items-center gap-2 ${
                    currentRole === r.id ? 'bg-[#123B2A] text-[#D8F078]' : 'bg-[#1C221E] text-[#A9B7A0]'
                  }`}
                >
                  <span>{r.icon}</span>
                  <span className="truncate">{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
