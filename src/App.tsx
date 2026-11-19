import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { WelcomeScreen } from './components/WelcomeScreen';
import { LoginPage } from './components/LoginPage';
import { AppLayout } from './layouts/AppLayout';
import { canAccessRoute } from './lib/permissions';
import { DashboardPage } from './pages/DashboardPage';
import { SupervisionFormPage } from './pages/SupervisionFormPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import type { PageRoute } from './types/sismut';

function AppShell() {
  const { user, loading } = useAuth();
  const [showWelcome, setShowWelcome] = useState(true);
  const [route, setRoute] = useState<PageRoute>('dashboard');

  const [draftSupervisionId, setDraftSupervisionId] = useState<string | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [editableRecommendations, setEditableRecommendations] = useState<string[]>([
    'Prioritaskan verifikasi harian kelengkapan segel troli emergensi dan ketersediaan cadangan segel bernomor di IGD.',
    'Lakukan pemantauan rutin kapasitas safety box limbah tajam (maksimal 3/4 penuh) berkoordinasi dengan unit kesling.',
    'Terapkan pengingat jadwal pencatatan suhu kulkas vaksin/obat pagi dan sore di Instalasi Farmasi.',
  ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#142D42] text-white flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="font-display text-2xl font-bold tracking-tight">SISMUT</p>
          <p className="text-xs text-[#E5F3EF]/80">Memuat sistem supervisi mutu RSUD Al-Mulk...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showWelcome) {
      return <WelcomeScreen onEnter={() => setShowWelcome(false)} />;
    }
    return <LoginPage onBackToWelcome={() => setShowWelcome(true)} />;
  }

  const activeRoute: PageRoute = canAccessRoute(user.role, route) ? route : 'dashboard';

  const handleNavigate = (nextRoute: PageRoute) => {
    if (nextRoute !== 'supervision-input') {
      setDraftSupervisionId(null);
    }
    if (nextRoute !== 'monitoring' && nextRoute !== 'follow-ups') {
      setSelectedFindingId(null);
    }
    setRoute(nextRoute);
  };

  const renderPage = () => {
    switch (activeRoute) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'supervision-input':
        return (
          <SupervisionFormPage
            draftSupervisionId={draftSupervisionId}
            onDone={() => {
              setDraftSupervisionId(null);
              setRoute('monitoring');
            }}
          />
        );
      case 'monitoring':
      case 'follow-ups':
      case 'findings':
      case 'verifications':
      case 'supervision-history':
      case 'schedules':
        return (
          <MonitoringPage
            preselectedFindingId={selectedFindingId}
            onResumeSupervision={(supId) => {
              setDraftSupervisionId(supId);
              setRoute('supervision-input');
            }}
            onNewSupervision={() => {
              setDraftSupervisionId(null);
              setRoute('supervision-input');
            }}
          />
        );
      case 'analysis-charts':
      case 'quality-evaluation':
        return (
          <AnalysisPage
            mode="evaluation"
            editableRecommendations={editableRecommendations}
            onSaveRecommendations={setEditableRecommendations}
          />
        );
      case 'reports-hospital':
      case 'reports-periodic':
      case 'reports-unit':
        return (
          <ReportsPage
            defaultTab="hospital"
            customRecommendations={editableRecommendations}
          />
        );
      case 'app-config':
      case 'users':
      case 'access-rights':
      case 'audit-trail':
      case 'master-units':
      case 'instruments':
      case 'categories-periods':
        return <SettingsPage tab="app-config" />;
      default:
        return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <AppLayout currentRoute={activeRoute} onNavigate={handleNavigate}>
      {renderPage()}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <AppShell />
      </RealtimeProvider>
    </AuthProvider>
  );
}
