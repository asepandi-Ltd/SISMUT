import React, { useState } from 'react';
import {
  Home,
  LayoutDashboard,
  ClipboardCheck,
  Activity,
  BarChart3,
  FileSpreadsheet,
  Settings,
  Bell,
  LogOut,
  Check,
  Wifi,
  WifiOff,
  Plus,
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import { canAccessRoute, ROLE_LABELS } from '../lib/permissions';
import type { PageRoute } from '../types/sismut';

const NAV_ITEMS: Array<{
  route: PageRoute;
  label: string;
  mobileLabel: string;
  Icon: typeof LayoutDashboard;
  MobileIcon: typeof Home;
}> = [
  {
    route: 'dashboard',
    label: 'Dashboard',
    mobileLabel: 'Home',
    Icon: LayoutDashboard,
    MobileIcon: Home,
  },
  {
    route: 'supervision-input',
    label: 'Penginputan Supervisi',
    mobileLabel: 'Input',
    Icon: ClipboardCheck,
    MobileIcon: Plus,
  },
  {
    route: 'monitoring',
    label: 'Monitoring & Tindak Lanjut',
    mobileLabel: 'Monitor',
    Icon: Activity,
    MobileIcon: Activity,
  },
  {
    route: 'analysis-charts',
    label: 'Grafik Analisis',
    mobileLabel: 'Grafik',
    Icon: BarChart3,
    MobileIcon: BarChart3,
  },
  {
    route: 'reports-hospital',
    label: 'Rekapitulasi Laporan',
    mobileLabel: 'Laporan',
    Icon: FileSpreadsheet,
    MobileIcon: FileSpreadsheet,
  },
  {
    route: 'app-config',
    label: 'Pengaturan',
    mobileLabel: 'Setting',
    Icon: Settings,
    MobileIcon: Settings,
  },
];

const ROUTE_TITLES: Record<PageRoute, { section: string; title: string }> = {
  dashboard: { section: 'Dashboard', title: 'Ringkasan Mutu Rumah Sakit' },
  schedules: { section: 'Supervisi', title: 'Penginputan Supervisi' },
  'supervision-input': { section: 'Penginputan Supervisi', title: 'Penginputan Supervisi Lapangan' },
  'supervision-history': { section: 'Monitoring & Tindak Lanjut', title: 'Monitoring & Tindak Lanjut Perbaikan' },
  'master-units': { section: 'Pengaturan', title: 'Pengaturan Sistem & Master Data' },
  instruments: { section: 'Pengaturan', title: 'Pengaturan Sistem & Master Data' },
  'categories-periods': { section: 'Pengaturan', title: 'Pengaturan Sistem & Master Data' },
  findings: { section: 'Monitoring & Tindak Lanjut', title: 'Monitoring & Tindak Lanjut Perbaikan' },
  'follow-ups': { section: 'Monitoring & Tindak Lanjut', title: 'Monitoring & Tindak Lanjut Perbaikan' },
  verifications: { section: 'Monitoring & Tindak Lanjut', title: 'Monitoring & Tindak Lanjut Perbaikan' },
  monitoring: { section: 'Monitoring & Tindak Lanjut', title: 'Monitoring & Tindak Lanjut Perbaikan' },
  'analysis-charts': { section: 'Grafik Analisis', title: 'Grafik Analisis & Evaluasi Mutu' },
  'quality-evaluation': { section: 'Grafik Analisis', title: 'Grafik Analisis & Evaluasi Mutu' },
  'reports-unit': { section: 'Rekapitulasi Laporan', title: 'Rekapitulasi Laporan Supervisi Mutu' },
  'reports-periodic': { section: 'Rekapitulasi Laporan', title: 'Rekapitulasi Laporan Supervisi Mutu' },
  'reports-hospital': { section: 'Rekapitulasi Laporan', title: 'Rekapitulasi Laporan Supervisi Mutu' },
  users: { section: 'Pengaturan', title: 'Pengaturan (Hak Akses, Foto Welcome Screen & Master Data)' },
  'access-rights': { section: 'Pengaturan', title: 'Pengaturan (Hak Akses, Foto Welcome Screen & Master Data)' },
  'app-config': { section: 'Pengaturan', title: 'Pengaturan (Hak Akses, Foto Welcome Screen & Master Data)' },
  'audit-trail': { section: 'Pengaturan', title: 'Pengaturan (Hak Akses, Foto Welcome Screen & Master Data)' },
};

interface AppLayoutProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  children: React.ReactNode;
}

export function AppLayout({ currentRoute, onNavigate, children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, connected, markRead, markAllRead } = useRealtime();
  const [notifOpen, setNotifOpen] = useState(false);

  if (!user) return null;

  const routeMeta = ROUTE_TITLES[currentRoute] || ROUTE_TITLES.dashboard;

  const handleNav = (route: PageRoute) => {
    onNavigate(route);
  };

  const visibleItems = NAV_ITEMS.filter((item) => canAccessRoute(user.role, item.route));

  const isMenuActive = (itemRoute: PageRoute) => {
    if (itemRoute === 'monitoring') {
      return (
        currentRoute === 'monitoring' ||
        currentRoute === 'follow-ups' ||
        currentRoute === 'findings' ||
        currentRoute === 'verifications' ||
        currentRoute === 'supervision-history'
      );
    }
    if (itemRoute === 'analysis-charts') {
      return currentRoute === 'analysis-charts' || currentRoute === 'quality-evaluation';
    }
    if (itemRoute === 'reports-hospital') {
      return (
        currentRoute === 'reports-hospital' ||
        currentRoute === 'reports-periodic' ||
        currentRoute === 'reports-unit'
      );
    }
    if (itemRoute === 'app-config') {
      return (
        currentRoute === 'app-config' ||
        currentRoute === 'users' ||
        currentRoute === 'access-rights' ||
        currentRoute === 'audit-trail' ||
        currentRoute === 'master-units' ||
        currentRoute === 'instruments' ||
        currentRoute === 'categories-periods'
      );
    }
    return currentRoute === itemRoute;
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#142D42] text-white select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <BrandLogo className="w-9 h-9 shrink-0" light />
        <div className="min-w-0">
          <p className="font-display text-base font-bold tracking-tight text-white truncate">SISMUT</p>
          <p className="text-[11px] text-[#E5F3EF]/80 truncate">RSUD Al-Mulk Sukabumi</p>
        </div>
      </div>

      {/* Navigation Items (Strictly the 6 requested menus) */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1.5" aria-label="Navigasi Utama">
        <p className="px-3 mb-2 text-[10px] font-bold tracking-wider text-[#E5F3EF]/55">
          MENU UTAMA
        </p>
        {visibleItems.map((item) => {
          const active = isMenuActive(item.route);
          const Icon = item.Icon;
          return (
            <button
              key={item.route}
              type="button"
              onClick={() => handleNav(item.route)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-[#238C89] text-white font-semibold'
                  : 'text-[#E5F3EF]/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom User Summary */}
      <div className="border-t border-white/10 p-4">
        <div className="mb-3">
          <p className="text-xs font-semibold text-white truncate">{user.full_name}</p>
          <p className="text-[11px] text-[#E5F3EF]/75 truncate">
            {ROLE_LABELS[user.role]}
            {user.unit_name ? ` · ${user.unit_name}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex">
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className="hidden lg:block w-[264px] shrink-0 border-r border-slate-200 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar (No Hamburger Menu on Mobile — uses Bottom Pill Navigation Bar instead) */}
        <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="lg:hidden shrink-0">
              <BrandLogo className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500">
                <span className="font-semibold text-[#142D42] lg:font-normal lg:text-slate-500">
                  SISMUT
                </span>
                <span>/</span>
                <span className="truncate">{routeMeta.section}</span>
              </div>
              <h1 className="font-display text-sm sm:text-lg font-bold text-[#142D42] truncate">
                {routeMeta.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Live Realtime Connection Indicator */}
            <div
              className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 pr-2 border-r border-slate-200"
              title={connected ? 'Sinkronisasi Realtime Aktif' : 'Menghubungkan ulang Realtime'}
            >
              {connected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-[#238C89]" />
                  <span className="text-[#238C89] font-medium">Realtime Aktif</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sinkronisasi</span>
                </>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                className="relative rounded-lg border border-slate-200 bg-white p-2 text-[#243447] hover:bg-slate-50 transition-colors cursor-pointer"
                aria-label="Notifikasi"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D9534F] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-lg z-40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-[#142D42]">
                      Notifikasi Mutu ({unreadCount} baru)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllRead()}
                        className="text-xs font-medium text-[#238C89] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Tandai semua dibaca</span>
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-center text-xs text-slate-500">
                        Belum ada notifikasi terbaru.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => markRead(n.id)}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                            !n.is_read ? 'bg-[#E5F3EF]/40' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#142D42]">{n.title}</span>
                            <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                              {new Date(n.created_at).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Quick Logout Button in Header */}
            <button
              type="button"
              onClick={() => logout()}
              title={`Keluar (${user.full_name})`}
              className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-[#142D42] hover:bg-slate-50 transition-colors cursor-pointer"
              aria-label="Keluar"
            >
              <LogOut className="w-4 h-4 text-[#D9534F]" />
            </button>
          </div>
        </header>

        {/* Page Body (with bottom padding on mobile for the floating capsule navbar) */}
        <main className="flex-1 p-4 sm:p-6 pb-28 lg:pb-6 max-w-[1440px] w-full mx-auto">
          {children}
        </main>

        {/* Mobile Floating Capsule Bottom Navigation Bar (Model seperti referensi foto dengan Deep Navy #142D42) */}
        <nav
          aria-label="Navigasi Mobile"
          className="no-print lg:hidden fixed bottom-3 inset-x-2.5 sm:inset-x-6 z-50 select-none"
        >
          <div
            className="mx-auto max-w-lg rounded-full bg-[#142D42] px-2.5 py-1.5 flex items-center gap-1.5 border border-white/12"
            style={{
              boxShadow:
                '0 14px 30px -6px rgba(13, 29, 44, 0.72), 0 4px 10px -2px rgba(13, 29, 44, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.14)',
            }}
          >
            {/* Left Raised Circular Emblem Badge (matching the circular badge on the left of the reference photo) */}
            <button
              type="button"
              onClick={() => handleNav('dashboard')}
              title={`${user.full_name} (${ROLE_LABELS[user.role]})`}
              className="w-11 h-11 rounded-full bg-[#1B3B56] shrink-0 flex items-center justify-center transition-transform active:scale-95 cursor-pointer relative"
              style={{
                boxShadow:
                  '0 4px 10px rgba(0, 0, 0, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
              }}
            >
              <BrandLogo className="w-6 h-6" light />
            </button>

            {/* Navigation Items Track with Continuous Arch Wave Line over Active Tab */}
            <div className="flex-1 grid grid-flow-col auto-cols-fr items-center relative">
              {visibleItems.map((item) => {
                const active = isMenuActive(item.route);
                const MobileIcon = item.MobileIcon;
                const showBadgeDot = item.route === 'monitoring' && unreadCount > 0;

                return (
                  <button
                    key={item.route}
                    type="button"
                    onClick={() => handleNav(item.route)}
                    className="relative flex flex-col items-center justify-center pt-2 pb-2 px-0.5 cursor-pointer group focus:outline-none"
                  >
                    {/* Continuous Arch/Wave Contour SVG that curves over the active item and runs along the bottom of inactive items */}
                    <svg
                      viewBox="0 0 100 66"
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                    >
                      <defs>
                        <linearGradient id={`archGrad-${item.route}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.28" />
                          <stop offset="85%" stopColor="#238C89" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {active ? (
                        <>
                          {/* Subtle glowing dome fill under the active arch */}
                          <path
                            d="M 0,62 C 14,62 17,5 50,5 C 83,5 86,62 100,62 Z"
                            fill={`url(#archGrad-${item.route})`}
                          />
                          {/* Glowing continuous arch contour line */}
                          <path
                            d="M 0,62 C 14,62 17,5 50,5 C 83,5 86,62 100,62"
                            fill="none"
                            stroke="#2DD4BF"
                            strokeWidth="2.8"
                            strokeLinecap="round"
                            style={{
                              filter: 'drop-shadow(0 0 5px rgba(45, 212, 191, 0.75))',
                            }}
                          />
                        </>
                      ) : (
                        /* Connecting horizontal line at the base of inactive tabs */
                        <path
                          d="M 0,62 L 100,62"
                          fill="none"
                          stroke="#2DD4BF"
                          strokeOpacity="0.55"
                          strokeWidth="2.2"
                        />
                      )}
                    </svg>

                    {/* Icon + Optional Notification Dot */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="relative">
                        <MobileIcon
                          className={`w-[18px] h-[18px] sm:w-5 sm:h-5 transition-all duration-200 ${
                            active
                              ? 'text-[#2DD4BF] scale-110 stroke-[2.4]'
                              : 'text-[#E5F3EF]/70 group-hover:text-white stroke-[1.75]'
                          }`}
                          style={
                            active
                              ? { filter: 'drop-shadow(0 0 6px rgba(45, 212, 191, 0.55))' }
                              : undefined
                          }
                        />
                        {showBadgeDot && (
                          <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-[#2DD4BF] ring-2 ring-[#142D42]" />
                        )}
                      </div>

                      {/* Signature Glowing Dot Directly Under Active Icon (as shown in reference photo) */}
                      <span
                        className={`mt-1 w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                          active
                            ? 'bg-[#2DD4BF] opacity-100 scale-100 shadow-[0_0_6px_#2DD4BF]'
                            : 'bg-transparent opacity-0 scale-0'
                        }`}
                      />

                      {/* Label */}
                      <span
                        className={`mt-0.5 text-[10px] sm:text-[11px] leading-tight tracking-tight truncate max-w-[56px] sm:max-w-[72px] transition-colors ${
                          active
                            ? 'font-display font-bold text-white'
                            : 'font-medium text-[#E5F3EF]/65 group-hover:text-[#E5F3EF]/90'
                        }`}
                      >
                        {item.mobileLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
