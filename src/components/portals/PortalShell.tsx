import React, { useState } from 'react';
import { UserRole } from '../../types';
import { 
  GraduationCap, 
  ChefHat, 
  LayoutDashboard, 
  HeartHandshake, 
  ShieldCheck, 
  ArrowLeft,
  Leaf,
  Menu,
  X
} from 'lucide-react';

interface PortalShellProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onReturnHome: () => void;
  children: React.ReactNode;
}

export const PortalShell: React.FC<PortalShellProps> = ({
  currentRole,
  onSelectRole,
  onReturnHome,
  children
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roleMetadata: Record<UserRole, { title: string; subtitle: string; icon: any; color: string }> = {
    student: {
      title: 'Student Dining Portal',
      subtitle: 'Campus Meal Opt-in, Daily Menus & Personal Ecological Savings',
      icon: GraduationCap,
      color: 'text-[#D8F078]'
    },
    kitchen: {
      title: 'Kitchen Culinary Operations',
      subtitle: 'Batch Prep Guidance, Shift Weighing & Safe Surplus Dispatch',
      icon: ChefHat,
      color: 'text-[#D8F078]'
    },
    manager: {
      title: 'Mess Executive Management',
      subtitle: 'Operational Analytics, Safety Buffer Overrides & Waste Tracking',
      icon: LayoutDashboard,
      color: 'text-[#D8F078]'
    },
    ngo: {
      title: 'NGO Shelter Partner Network',
      subtitle: 'Surplus Discovery, Atomic Reservations & Cold-Chain PIN Handover',
      icon: HeartHandshake,
      color: 'text-[#D8F078]'
    },
    admin: {
      title: 'System Governance & Audits',
      subtitle: 'Compliance Controls, NGO Credentialing & Immutable Activity Ledger',
      icon: ShieldCheck,
      color: 'text-[#D8F078]'
    }
  };

  const meta = roleMetadata[currentRole];
  const CurrentIcon = meta.icon;

  const roles: { id: UserRole; label: string; icon: any }[] = [
    { id: 'student', label: 'Student', icon: GraduationCap },
    { id: 'kitchen', label: 'Kitchen', icon: ChefHat },
    { id: 'manager', label: 'Manager', icon: LayoutDashboard },
    { id: 'ngo', label: 'NGO Network', icon: HeartHandshake },
    { id: 'admin', label: 'Admin', icon: ShieldCheck }
  ];

  return (
    <div className="min-h-screen bg-[#151916] text-[#F7F5EF] flex flex-col">
      
      {/* Pinned Single Application Header */}
      <header className="sticky top-0 z-40 bg-[#151916]/95 backdrop-blur-xl border-b border-[#28312B] shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: Brand Identity & Current Role Pill */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button 
                onClick={onReturnHome}
                className="flex items-center gap-2.5 group focus:outline-none"
                title="Return to Overview Homepage"
              >
                <div className="w-9 h-9 rounded-xl bg-[#123B2A] border border-[#D8F078]/40 flex items-center justify-center text-[#D8F078] shadow-glow-lime group-hover:scale-105 transition-transform duration-200">
                  <Leaf className="w-4 h-4 text-[#D8F078]" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-bold tracking-tight text-[#F7F5EF] leading-tight">
                    MessSaver
                  </div>
                  <div className="text-[10px] text-[#A9B7A0] font-mono leading-none">
                    Campus Network
                  </div>
                </div>
              </button>

              <div className="h-5 w-px bg-[#28312B] hidden sm:block" />

              {/* Current Role Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1C221E] border border-[#28312B]">
                <CurrentIcon className="w-4 h-4 text-[#D8F078]" />
                <span className="text-xs font-bold text-[#F7F5EF] capitalize">
                  {currentRole} Portal
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#D8F078] animate-pulse" />
              </div>
            </div>

            {/* Center: Desktop Role Switching Pills */}
            <nav className="hidden lg:flex items-center gap-1.5 p-1 rounded-2xl bg-[#1C221E] border border-[#28312B]">
              {roles.map((r) => {
                const Icon = r.icon;
                const isActive = currentRole === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => onSelectRole(r.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/35 shadow-sm'
                        : 'text-[#A9B7A0] hover:text-[#F7F5EF] hover:bg-[#28312B]/50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right: Return to Overview Button & Mobile Menu Toggle */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={onReturnHome}
                className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#A9B7A0] hover:text-[#F7F5EF] bg-[#1C221E] hover:bg-[#28312B] border border-[#28312B] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Overview Page</span>
              </button>

              {/* Mobile Role Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl bg-[#1C221E] border border-[#28312B] text-[#A9B7A0] hover:text-[#F7F5EF]"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#1C221E] border-b border-[#28312B] px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150">
            <div className="text-[11px] font-mono uppercase text-[#A9B7A0] px-2 py-1">
              Switch Application Role:
            </div>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((r) => {
                const Icon = r.icon;
                const isActive = currentRole === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      onSelectRole(r.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-left border ${
                      isActive
                        ? 'bg-[#123B2A] text-[#D8F078] border-[#D8F078]/40'
                        : 'bg-[#151916] text-[#A9B7A0] border-[#28312B]'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[#D8F078]" />
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="pt-2 border-t border-[#28312B]">
              <button
                onClick={onReturnHome}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-[#F7F5EF] bg-[#151916] border border-[#28312B] flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4 text-[#D8F078]" />
                <span>Return to Overview Homepage</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Workspace Context Sub-header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#28312B]">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#F7F5EF] flex items-center gap-2.5">
              <span>{meta.title}</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#A9B7A0]">
              {meta.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono self-start sm:self-auto">
            <span className="px-3 py-1 rounded-full bg-[#1C221E] text-[#D8F078] border border-[#D8F078]/25 font-bold">
              Facility: Grand Central B
            </span>
          </div>
        </div>

        {/* Portal Views */}
        {children}
      </main>

    </div>
  );
};
