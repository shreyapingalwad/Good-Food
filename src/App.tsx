import React, { useState } from 'react';
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
import { AssetManifestModal } from './components/landing/AssetManifestModal';

// Portals
import { PortalShell } from './components/portals/PortalShell';
import { StudentPortal } from './components/portals/StudentPortal';
import { KitchenPortal } from './components/portals/KitchenPortal';
import { ManagerPortal } from './components/portals/ManagerPortal';
import { NgoPortal } from './components/portals/NgoPortal';
import { AdminPortal } from './components/portals/AdminPortal';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'landing' | 'portal'>('landing');
  const [currentRole, setCurrentRole] = useState<UserRole>('student');
  const [isAssetManifestOpen, setIsAssetManifestOpen] = useState<boolean>(false);

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
    const el = document.getElementById('workflow');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#151916] text-[#F7F5EF] selection:bg-[#D8F078] selection:text-[#151916] relative">
      
      {/* Top Navbar */}
      <Navbar
        onSelectRole={handleSelectRole}
        activeView={activeView}
        currentRole={currentRole}
        onNavigateHome={handleReturnHome}
        onOpenAssetManifest={() => setIsAssetManifestOpen(true)}
      />

      {/* View Switcher: Landing Page vs Active Application Portal */}
      {activeView === 'landing' ? (
        <div className="animate-in fade-in duration-300">
          <HeroSection 
            onExplore={handleSelectRole} 
            onSeeHowItWorks={handleSeeHowItWorks} 
          />
          <ImpactStats />
          <ProblemSection />
          <WorkflowSection />
          <DemandSimulator />
          <RedistributionStory />
          <AnalyticsPreview />
          <TechEngineSection />
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
          {currentRole === 'student' && <StudentPortal />}
          {currentRole === 'kitchen' && <KitchenPortal />}
          {currentRole === 'manager' && <ManagerPortal />}
          {currentRole === 'ngo' && <NgoPortal />}
          {currentRole === 'admin' && <AdminPortal />}
        </PortalShell>
      )}

      {/* Footer */}
      <Footer
        onSelectRole={handleSelectRole}
        onOpenAssetManifest={() => setIsAssetManifestOpen(true)}
      />

      {/* Asset Manifest Modal */}
      <AssetManifestModal
        isOpen={isAssetManifestOpen}
        onClose={() => setIsAssetManifestOpen(false)}
      />

    </div>
  );
};

export default App;
