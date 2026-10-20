import React from 'react';
import { UserRole } from '../../types';
import { 
  GraduationCap, 
  ChefHat, 
  LayoutDashboard, 
  HeartHandshake, 
  ShieldCheck, 
  Home, 
  ArrowLeft,
  Bell,
  Sparkles
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
  const roleMetadata: Record<UserRole, { title: string; subtitle: string; icon: any; color: string }> = {
    student: {
      title: 'Student Dining Portal',
      subtitle: 'Campus Meal Opt-in, Daily Menus & Ecological Impact',
      icon: GraduationCap,
      color: 'text-[#D8F078]'
    },
    kitchen: {
      title: 'Kitchen Culinary Operations',
      subtitle: 'Batch Cooking Targets, Consumption Logging & Safe Surplus Dispatch',
      icon: ChefHat,
      color: 'text-[#D8F078]'
    },
    manager: {
      title: 'Mess Executive Management',
      subtitle: 'Buffer Overrides, Waste Trends, NGO Coordination & Audits',
      icon: LayoutDashboard,
      color: 'text-[#D8F078]'
    },
    ngo: {
      title: 'Verified NGO Partner Network',
      subtitle: 'Live Surplus Broadcast, Atomic Reservation & PIN Handover',
      icon: HeartHandshake,
      color: 'text-[#D8F078]'
    },
    admin: {
      title: 'Campus System Governance',
      subtitle: 'Role Verification, Facility Rules & Compliance Logs',
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
    <div className="min-h-screen bg-[#151916] text-[#F7F5EF] flex flex-col pt-20">
      
      {/* Top Application Ribbon */}
      <div className="bg-[#1C221E] border-b border-[#28312B] sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Left: Role identity */}
            <div className="flex items-center gap-3">
              <button
                onClick={onReturnHome}
                className="p-2 rounded-xl bg-[#151916] border border-[#28312B] hover:border-[#D8F078]/40 hover:text-[#D8F078] text-[#A9B7A0] transition-colors"
                title="Return to Marketing Overview"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="w-9 h-9 rounded-xl bg-[#123B2A] border border-[#D8F078]/30 flex items-center justify-center text-[#D8F078]">
                <CurrentIcon className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-[#F7F5EF] leading-tight">
                    {meta.title}
                  </h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/25">
                    Live Demo
                  </span>
                </div>
                <p className="text-xs text-[#A9B7A0] hidden md:block">
                  {meta.subtitle}
                </p>
              </div>
            </div>

            {/* Right: Quick Role Switcher Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {roles.map((r) => {
                const Icon = r.icon;
                const isActive = currentRole === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => onSelectRole(r.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/40 shadow-sm'
                        : 'bg-[#151916] text-[#A9B7A0] border border-[#28312B] hover:text-[#F7F5EF] hover:border-[#A9B7A0]/30'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

    </div>
  );
};
