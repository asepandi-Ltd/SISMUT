import type { PageRoute, UserRole } from '../types/sismut';

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  KOMITE_MUTU: 'Komite Mutu Rumah Sakit',
  MANAJEMEN: 'Manajemen',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  SUPER_ADMIN:
    'Akses penuh seluruh fitur sistem, manajemen pengguna, hak akses, pengaturan foto welcome screen, master data, penginputan supervisi, monitoring & tindak lanjut, analisis, dan laporan.',
  KOMITE_MUTU:
    'Melaksanakan penginputan supervisi lapangan, monitoring & tindak lanjut perbaikan unit, pengelolaan instrumen/master unit, grafik analisis, serta penyusunan rekapitulasi laporan mutu.',
  MANAJEMEN:
    'Memantau dashboard eksekutif rumah sakit, monitoring & tindak lanjut perbaikan lintas unit, grafik analisis capaian mutu, serta mengunduh rekapitulasi laporan resmi.',
};

export const UNIT_CATEGORIES = [
  'RAWAT JALAN',
  'RAWAT INAP',
  'INSTALASI GAWAT DARURAT',
  'PENUNJANG MEDIS',
  'PENUNJANG NONMEDIS',
  'MANAJEMEN DAN UNIT LAINNYA',
] as const;

export const RISK_LEVELS = ['Rendah', 'Sedang', 'Tinggi', 'Kritis'] as const;

export const FINDING_STATUSES = [
  'Belum Ditindaklanjuti',
  'Dalam Proses',
  'Menunggu Verifikasi',
  'Perlu Perbaikan Ulang',
  'Selesai',
  'Terlambat',
] as const;

export function canAccessRoute(role: UserRole, route: PageRoute): boolean {
  const matrix: Record<PageRoute, UserRole[]> = {
    dashboard: ['SUPER_ADMIN', 'KOMITE_MUTU', 'MANAJEMEN'],
    schedules: ['SUPER_ADMIN', 'KOMITE_MUTU', 'MANAJEMEN'],
    'supervision-input': ['SUPER_ADMIN', 'KOMITE_MUTU'],
    'supervision-history': ['SUPER_ADMIN', 'KOMITE_MUTU', 'MANAJEMEN'],
    'master-units': ['SUPER_ADMIN', 'KOMITE_MUTU'],
    instruments: ['SUPER_ADMIN', 'KOMITE_MUTU'],
    'categories-periods': ['SUPER_ADMIN', 'KOMITE_MUTU'],
    findings: ['SUPER_ADMIN', 'KOMITE_MUTU', 'MANAJEMEN'],
    'follow-ups': ['SUPER_ADMIN', 'KOMITE_MUTU', 'MANAJEMEN'],
    verifications: ['SUPER_ADMIN', 'KOMITE_MUTU'],
    monitoring: ['SUPER_ADMIN', 'KOMITE_MUTU', 'MANAJEMEN'],
    'analysis-charts': ['SUPER_ADMIN', 'KOMITE_MUTU', 'MANAJEMEN'],
    'quality-evaluation': ['SUPER_ADMIN', 'KOMITE_MUTU', 'MANAJEMEN'],
    'reports-unit': ['SUPER_ADMIN', 'KOMITE_MUTU', 'MANAJEMEN'],
    'reports-periodic': ['SUPER_ADMIN', 'KOMITE_MUTU', 'MANAJEMEN'],
    'reports-hospital': ['SUPER_ADMIN', 'KOMITE_MUTU', 'MANAJEMEN'],
    users: ['SUPER_ADMIN'],
    'access-rights': ['SUPER_ADMIN', 'KOMITE_MUTU'],
    'app-config': ['SUPER_ADMIN', 'KOMITE_MUTU'],
    'audit-trail': ['SUPER_ADMIN', 'KOMITE_MUTU'],
  };

  return matrix[route]?.includes(role) ?? false;
}

export const canPerformSupervision = (role: UserRole) =>
  role === 'SUPER_ADMIN' || role === 'KOMITE_MUTU';

export const canManageMasterData = (role: UserRole) =>
  role === 'SUPER_ADMIN' || role === 'KOMITE_MUTU';

export const canReopenSupervision = (role: UserRole) =>
  role === 'SUPER_ADMIN' || role === 'KOMITE_MUTU';

export const canVerifyFollowUp = (role: UserRole) =>
  role === 'SUPER_ADMIN' || role === 'KOMITE_MUTU';

export const canSubmitFollowUp = (role: UserRole) =>
  role === 'SUPER_ADMIN' || role === 'KOMITE_MUTU' || role === 'MANAJEMEN';

export const isReadOnlyRole = (role: UserRole) => false && role === 'MANAJEMEN';
