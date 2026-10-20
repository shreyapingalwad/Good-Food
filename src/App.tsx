import React, { useState, useEffect } from 'react';
import { UserRole } from './types';
import { Navbar } from './components/landing/Navbar';
import { HeroSection } from './components/landing/HeroSection';
import { ImpactStats } from './components/landing/ImpactStats';
import { ProblemSection } from './components/landing/ProblemSection';
import { WorkflowSection } from './components/landing/WorkflowSection';
import { DemandSimulator } from './components/landing/DemandSimulator';
import { RedistributionStory } from './components/landing/RedistributionStory';
import { AnalyticsPreview } from './components/landing/AnalyticsPreview';
import { TechEngineSection } from './components/landing/TechEngineSection';
import { CtaSection } from './components/landing/CtaSection';
import { Footer } from './components/landing/Footer';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Portals (Code-split with React.lazy)
import { PortalShell } from './components/portals/PortalShell';

const StudentPortal = React.lazy(() => import('./components/portals/StudentPortal').then(m => ({ default: m.StudentPortal })));
const KitchenPortal = React.lazy(() => import('./components/portals/KitchenPortal').then(m => ({ default: m.KitchenPortal })));
const ManagerPortal = React.lazy(() => import('./components/portals/ManagerPortal').then(m => ({ default: m.ManagerPortal })));
const NgoPortal = React.lazy(() => import('./components/portals/NgoPortal').then(m => ({ default: m.NgoPortal })));
const AdminPortal = React.lazy(() => import('./components/portals/AdminPortal').then(m => ({ default: m.AdminPortal })));
const AssetManifestModal = React.lazy(() => import('./components/landing/AssetManifestModal').then(m => ({ default: m.AssetManifestModal })));

// Accessible Portal Loading Skeleton
const PortalLoadingSkeleton: React.FC = () => (
  <div className="w-full space-y-6 animate-pulse py-4" aria-busy="true" aria-label="Loading portal workspace">
    <div className="h-28 rounded-3xl bg-[#1C221E] border border-[#28312B]" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-44 rounded-3xl bg-[#1C221E] border border-[#28312B]" />
      <div className="h-44 rounded-3xl bg-[#1C221E] border border-[#28312B]" />
      <div className="h-44 rounded-3xl bg-[#1C221E] border border-[#28312B]" />
    </div>
    <div className="h-64 rounded-3xl bg-[#1C221E] border border-[#28312B]" />
  </div>
);

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'landing' | 'portal'>('landing');
  const [currentRole, setCurrentRole] = useState<UserRole>('student');
  const [isAssetManifestOpen, setIsAssetManifestOpen] = useState<boolean>(false);

  useEffect(() => {
    // When view changes, refresh ScrollTrigger after DOM has settled
    const timeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);
    return () => clearTimeout(timeout);
  }, [activeView, currentRole]);

  const handleSelectRole = (role: UserRole) => {
    setCurrentRole(role);
    setActiveView('portal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReturnHome = () => {
    setActiveView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSeeHowItWorks = () => {
    const el = document.getElementById('problem');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#151916] text-[#F7F5EF] selection:bg-[#D8F078] selection:text-[#151916] relative">
      
      {/* Top Navbar for Landing View Only */}
      {activeView === 'landing' && (
        <Navbar
          onSelectRole={handleSelectRole}
          activeView={activeView}
          currentRole={currentRole}
          onNavigateHome={handleReturnHome}
          onOpenAssetManifest={() => setIsAssetManifestOpen(true)}
        />
      )}

      {/* View Switcher: Landing Page vs Active Application Portal */}
      {activeView === 'landing' ? (
        <div className="animate-in fade-in duration-300">
          {/* Chapter 0: Hero & Value Proposition */}
          <HeroSection 
            onExplore={handleSelectRole} 
            onSeeHowItWorks={handleSeeHowItWorks} 
          />

          {/* Chapter 1: The Problem — Institutional Dining Food Waste Crisis */}
          <ProblemSection />

          {/* Chapter 2: The Insight — Dual-Engine Baseline & Random Forest ML Architecture */}
          <TechEngineSection />

          {/* Chapter 3: The Prediction — Interactive Demand Sandbox & Buffer Tuning */}
          <DemandSimulator />

          {/* Chapter 4: The Action — 5-Stage Closed Loop & Food Safety Cold Chain */}
          <WorkflowSection />
          <RedistributionStory />

          {/* Chapter 5: The Impact — Measured Pilot Metrics & Operational Telemetry */}
          <ImpactStats />
          <AnalyticsPreview />

          {/* Chapter 6: The Conclusion — Enterprise Role Portal Launchpad */}
          <CtaSection onSelectRole={handleSelectRole} />
        </div>
      ) : (
        <PortalShell
          currentRole={currentRole}
          onSelectRole={(r) => {
            setCurrentRole(r);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onReturnHome={handleReturnHome}
        >
          <React.Suspense fallback={<PortalLoadingSkeleton />}>
            {currentRole === 'student' && <StudentPortal />}
            {currentRole === 'kitchen' && <KitchenPortal />}
            {currentRole === 'manager' && <ManagerPortal />}
            {currentRole === 'ngo' && <NgoPortal />}
            {currentRole === 'admin' && <AdminPortal />}
          </React.Suspense>
        </PortalShell>
      )}

      {/* Footer */}
      <Footer
        onSelectRole={handleSelectRole}
        onOpenAssetManifest={() => setIsAssetManifestOpen(true)}
      />

      {/* Asset Manifest Modal (Code-split) */}
      {isAssetManifestOpen && (
        <React.Suspense fallback={null}>
          <AssetManifestModal
            isOpen={isAssetManifestOpen}
            onClose={() => setIsAssetManifestOpen(false)}
          />
        </React.Suspense>
      )}

    </div>
  );
};

export default App;

