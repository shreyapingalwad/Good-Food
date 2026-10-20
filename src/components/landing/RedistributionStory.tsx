import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Thermometer, Clock, Lock, CheckCircle, AlertTriangle, Truck } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const RedistributionStory: React.FC = () => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(4500); // 75 mins
  const sectionRef = useRef<HTMLElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const stepsGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      if (bannerRef.current) {
        gsap.from(bannerRef.current, {
          y: 30,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: bannerRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        });
      }

      if (stepsGridRef.current) {
        gsap.from(stepsGridRef.current.children, {
          y: 40,
          opacity: 0,
          duration: 0.75,
          stagger: 0.15,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: stepsGridRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const steps = [
    {
      num: '01',
      title: 'Strict Source Segregation',
      badge: 'Zero Plate Leftovers',
      desc: 'Only unserved kitchen gastro-trays that never left the culinary prep area qualify. Customer plate scrapes are barred by system validation and directed to composting.',
      icon: ShieldCheck,
      status: 'Passed Check',
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'
    },
    {
      num: '02',
      title: 'Thermal Core Verification',
      badge: '>= 60°C or <= 5°C',
      desc: 'Digital probe temperature is recorded at dispatch. Food in the danger zone (8°C to 59°C) is flagged and locked from distribution to prevent bacterial growth.',
      icon: Thermometer,
      status: '68.5°C Verified',
      imageUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=600&q=80'
    },
    {
      num: '03',
      title: 'Atomic Partner Reservation',
      badge: 'Race-Condition Proof',
      desc: 'When an authorized NGO claims a surplus offer, an atomic database lock assigns the donation. Multiple partners never drive out for the same batch.',
      icon: Lock,
      status: 'Locked to Robin Hood Army',
      imageUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=600&q=80'
    },
    {
      num: '04',
      title: 'Digital PIN & Audit Handover',
      badge: 'Dual Confirmation',
      desc: 'Driver presents an encrypted 4-digit token at Gate 3. Both kitchen staff and driver confirm physical handover, creating an immutable compliance record.',
      icon: CheckCircle,
      status: 'PIN #4829 Verified',
      imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=600&q=80'
    }
  ];

  return (
    <section 
      id="redistribution" 
      ref={sectionRef} 
      className="relative py-28 bg-[#123B2A]/20 border-t border-[#28312B] overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1C221E] border border-[#D8F078]/25 text-xs text-[#D8F078] font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D8F078]" />
            <span>Food Safety & Cold-Chain Protocol</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-editorial font-bold text-[#F7F5EF] tracking-tight">
            How Surplus Becomes <br />
            <span className="text-gradient-lime italic font-normal">Dignified Nourishment</span>
          </h2>

          <p className="text-sm sm:text-base text-[#A9B7A0] leading-relaxed">
            Software alone never guarantees food safety — strict protocols, physical thermal probes, and vetted human partnerships do. Inspect our 4-point verification chain.
          </p>
        </div>

        {/* Live Active Countdown Simulation Banner with Imagery */}
        <div 
          ref={bannerRef}
          className="mb-12 relative rounded-3xl overflow-hidden border border-[#D8F078]/30 shadow-card-dark"
        >
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80" 
              alt="Community distribution van" 
              className="w-full h-full object-cover filter brightness-50 contrast-125 opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1C221E] via-[#1C221E]/95 to-[#1C221E]/80" />
          </div>

          <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#123B2A] border border-[#D8F078]/40 flex items-center justify-center text-[#D8F078] shrink-0 shadow-glow-lime">
                <Truck className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-[#D8F078] uppercase">Active Safe Dispatch #DON-8841</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#123B2A] text-[#F7F5EF]">Gate 3 Cold Bay</span>
                </div>
                <h3 className="text-lg font-bold text-[#F7F5EF] mt-0.5">
                  45.0 kg Steamed Basmati Rice & Paneer Curry (110 Servings)
                </h3>
                <p className="text-xs text-[#A9B7A0]">Assigned to: Robin Hood Army (South Campus Wing)</p>
              </div>
            </div>

            {/* Countdown Clock */}
            <div className="flex items-center gap-3 bg-[#151916]/90 backdrop-blur-md px-5 py-3 rounded-2xl border border-[#D8F078]/30 shrink-0 shadow-lg">
              <Clock className="w-5 h-5 text-[#D8F078] animate-pulse" />
              <div>
                <span className="text-[10px] font-mono uppercase text-[#A9B7A0] block">Safety Window Remaining:</span>
                <span className="text-xl font-mono font-bold text-[#D8F078]">
                  {formatTime(secondsRemaining)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Protocol Steps Grid with Photos */}
        <div ref={stepsGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            return (
              <div 
                key={idx}
                className="glass-panel rounded-3xl border border-[#28312B] hover:border-[#D8F078]/40 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                {/* Photo Thumbnail */}
                <div className="h-36 w-full relative overflow-hidden">
                  <img 
                    src={st.imageUrl} 
                    alt={st.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1C221E] via-transparent to-transparent opacity-80" />
                  <div className="absolute top-3 left-3">
                    <span className="text-[10px] font-mono font-bold text-[#151916] px-2.5 py-1 rounded-full bg-[#D8F078] shadow-sm">
                      STEP {st.num}
                    </span>
                  </div>
                </div>

                <div className="p-6 pt-3 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-[#123B2A] border border-[#D8F078]/30 flex items-center justify-center text-[#D8F078]">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#151916] text-[#A9B7A0] border border-[#28312B]">
                        {st.badge}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-[#F7F5EF] mb-1.5">
                      {st.title}
                    </h4>

                    <p className="text-xs text-[#A9B7A0] leading-relaxed">
                      {st.desc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#28312B] flex items-center gap-2 text-xs font-mono text-[#D8F078]">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{st.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Disclaimer Alert Box */}
        <div className="mt-10 p-4 rounded-2xl bg-[#1C221E]/60 border border-[#28312B] flex items-start gap-3 text-xs text-[#A9B7A0] max-w-3xl mx-auto">
          <AlertTriangle className="w-4 h-4 text-[#D8F078] shrink-0 mt-0.5" />
          <span>
            <strong>Health & Safety Guarantee:</strong> All partner organizations must complete municipal health compliance audits. MessSaver does not permit partially consumed plate scraps or food held beyond 120 minutes to enter human donation channels.
          </span>
        </div>

      </div>
    </section>
  );
};
