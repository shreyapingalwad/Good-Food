import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck, HeartHandshake, ChefHat, GraduationCap, LayoutDashboard } from 'lucide-react';
import { UserRole } from '../../types';

interface CtaSectionProps {
  onSelectRole: (role: UserRole) => void;
}

export const CtaSection: React.FC<CtaSectionProps> = ({ onSelectRole }) => {
  const roles = [
    {
      id: 'student' as UserRole,
      title: 'Student Portal',
      icon: GraduationCap,
      desc: 'Mark meal attendance, view weekly menus, rate daily dishes & track personal food footprint.',
      badge: 'Live Opt-in'
    },
    {
      id: 'kitchen' as UserRole,
      title: 'Kitchen Staff',
      icon: ChefHat,
      desc: 'View AI preparation recommendations, record batches, and dispatch surplus to verified NGOs.',
      badge: 'Production'
    },
    {
      id: 'manager' as UserRole,
      title: 'Mess Manager',
      icon: LayoutDashboard,
      desc: 'Tune safety buffers, review historical waste analytics, approve surplus & export audit CSVs.',
      badge: 'Governance'
    },
    {
      id: 'ngo' as UserRole,
      title: 'NGO Network',
      icon: HeartHandshake,
      desc: 'Browse available food donations, lock claims atomically, and confirm pickup using 4-digit PIN.',
      badge: 'Redistribution'
    },
    {
      id: 'admin' as UserRole,
      title: 'System Admin',
      icon: ShieldCheck,
      desc: 'Manage campus facilities, verify NGO credentials, configure rules & review immutable audit logs.',
      badge: 'Platform'
    }
  ];

  return (
    <section className="relative py-28 bg-[#151916] overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#123B2A]/40 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Banner */}
        <div className="glass-panel-elevated p-8 sm:p-14 rounded-3xl border border-[#D8F078]/25 text-center max-w-4xl mx-auto mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#123B2A] border border-[#D8F078]/30 text-xs text-[#D8F078] font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready for Zero-Waste Institutional Dining</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-editorial font-bold text-[#F7F5EF] tracking-tight">
            Step Into the Working Application
          </h2>

          <p className="text-sm sm:text-base text-[#A9B7A0] max-w-xl mx-auto leading-relaxed">
            MessSaver is not a static concept mockup. Launch any of the 5 specialized portals below to interact with real attendance toggles, batch production logs, and atomic surplus donation claims.
          </p>

          <div className="pt-2 flex justify-center">
            <button
              onClick={() => onSelectRole('student')}
              className="px-8 py-4 rounded-2xl text-sm font-bold text-[#151916] bg-[#D8F078] hover:bg-[#E4F88D] transition-all duration-200 shadow-glow-lime flex items-center gap-3 active:scale-95"
            >
              <span>Launch Student Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5 Portal Launch Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {roles.map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.id}
                onClick={() => onSelectRole(r.id)}
                className="glass-panel p-6 rounded-3xl text-left border border-[#28312B] hover:border-[#D8F078]/40 hover:-translate-y-1.5 transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#1C221E] border border-[#28312B] flex items-center justify-center text-[#D8F078] group-hover:scale-110 group-hover:border-[#D8F078]/30 transition-all">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#123B2A] text-[#D8F078] border border-[#D8F078]/20">
                      {r.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#F7F5EF] mb-2 group-hover:text-[#D8F078] transition-colors">
                    {r.title}
                  </h3>

                  <p className="text-xs text-[#A9B7A0] leading-relaxed">
                    {r.desc}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-[#28312B] flex items-center justify-between text-xs font-semibold text-[#D8F078]">
                  <span>Enter Portal</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
};
