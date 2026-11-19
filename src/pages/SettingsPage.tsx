import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Shield,
  Check,
  X,
  Image as ImageIcon,
  Upload,
  RotateCcw,
  Users,
  Building2,
  ScrollText,
  Settings,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '../lib/permissions';
import { MasterUnitsPage } from './MasterUnitsPage';
import { InstrumentsPage } from './InstrumentsPage';
import { CategoriesPeriodsPage } from './CategoriesPeriodsPage';
import type { AppSettings, AuditLog, Profile, Unit, UserRole } from '../types/sismut';

interface SettingsPageProps {
  tab?: 'users' | 'access-rights' | 'app-config' | 'audit-trail';
}

const DEFAULT_WELCOME_IMAGE = '/src/assets/images/welcome_hospital_interior_1794923926771.jpg';

export function SettingsPage({ tab = 'app-config' }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<
    'welcome-config' | 'users-access' | 'master-data' | 'audit-trail'
  >(() => {
    if (tab === 'users' || tab === 'access-rights') return 'users-access';
    if (tab === 'audit-trail') return 'audit-trail';
    return 'welcome-config';
  });

  const [masterSubTab, setMasterSubTab] = useState<'units' | 'instruments' | 'periods'>('units');

  const [users, setUsers] = useState<Profile[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploadingWelcomeImg, setUploadingWelcomeImg] = useState(false);

  // User modal
  const [userModal, setUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'KOMITE_MUTU' as UserRole,
    unit_id: '',
    position_title: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [uList, unList, st, logs] = await Promise.all([
        api.getUsers(),
        api.getUnits(),
        api.getSettings(),
        api.getAuditLogs(),
      ]);
      setUsers(uList);
      setUnits(unList);
      setSettings({
        ...st,
        welcome_image_url: st.welcome_image_url || DEFAULT_WELCOME_IMAGE,
        welcome_tagline: st.welcome_tagline || 'Mutu Terjaga, Pelayanan Terpercaya',
      });
      setAuditLogs(logs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengaturan.');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({
      email: '',
      password: '',
      full_name: '',
      role: 'KOMITE_MUTU',
      unit_id: '',
      position_title: '',
    });
    setUserModal(true);
  };

  const openEditUser = (u: Profile) => {
    setEditingUser(u);
    setUserForm({
      email: u.email,
      password: '',
      full_name: u.full_name,
      role: u.role,
      unit_id: u.unit_id || '',
      position_title: u.position_title,
    });
    setUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          full_name: userForm.full_name,
          role: userForm.role,
          unit_id: userForm.unit_id || null,
          position_title: userForm.position_title,
          ...(userForm.password ? { password: userForm.password } : {}),
        });
      } else {
        await api.createUser({
          ...userForm,
          unit_id: userForm.unit_id || null,
        });
      }
      setUserModal(false);
      await loadData();
      setMessage('Data akun pengguna dan hak akses berhasil disimpan.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pengguna.');
    }
  };

  const toggleUserActive = async (u: Profile) => {
    await api.updateUser(u.id, { is_active: !u.is_active });
    await loadData();
  };

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;
    setError('');
    setMessage('');
    try {
      await api.deleteUser(deletingUser.id);
      const removedName = deletingUser.full_name;
      setDeletingUser(null);
      await loadData();
      setMessage(`Akun pengguna "${removedName}" berhasil dihapus dari daftar.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus akun pengguna.');
      setDeletingUser(null);
    }
  };

  const handleWelcomeImageUpload = async (file: File | undefined) => {
    if (!file || !settings) return;
    setUploadingWelcomeImg(true);
    setError('');
    setMessage('');
    try {
      const url = await api.uploadEvidence(file, 'application-assets');
      const next = { ...settings, welcome_image_url: url };
      setSettings(next);
      await api.updateSettings(next);
      setMessage('Foto latar Welcome Screen berhasil diperbarui dan diterapkan.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah foto Welcome Screen.');
    } finally {
      setUploadingWelcomeImg(false);
    }
  };

  const handleResetWelcomeImage = async () => {
    if (!settings) return;
    const next = { ...settings, welcome_image_url: DEFAULT_WELCOME_IMAGE };
    setSettings(next);
    await api.updateSettings(next);
    setMessage('Foto latar Welcome Screen dikembalikan ke foto default RSUD Al-Mulk.');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setError('');
    const updated = await api.updateSettings(settings);
    setSettings(updated);
    setMessage('Konfigurasi aplikasi, Foto Welcome Screen, dan standar SLA berhasil disimpan.');
  };

  const matrixRows: Array<{ capability: string; roles: Record<UserRole, boolean> }> = [
    {
      capability: 'Melihat Dashboard Eksekutif & Grafik Analisis',
      roles: { SUPER_ADMIN: true, KOMITE_MUTU: true, MANAJEMEN: true },
    },
    {
      capability: 'Penginputan Supervisi Lapangan & Dokumentasi Foto',
      roles: { SUPER_ADMIN: true, KOMITE_MUTU: true, MANAJEMEN: false },
    },
    {
      capability: 'Monitoring & Mengisi Tindak Lanjut Perbaikan',
      roles: { SUPER_ADMIN: true, KOMITE_MUTU: true, MANAJEMEN: true },
    },
    {
      capability: 'Mengunduh Rekapitulasi Laporan Resmi (PDF & Excel)',
      roles: { SUPER_ADMIN: true, KOMITE_MUTU: true, MANAJEMEN: true },
    },
    {
      capability: 'Mengelola Master Unit, Instrumen Indikator & Periode',
      roles: { SUPER_ADMIN: true, KOMITE_MUTU: true, MANAJEMEN: false },
    },
    {
      capability: 'Mengelola Akun Pengguna, Hak Akses & Foto Welcome Screen',
      roles: { SUPER_ADMIN: true, KOMITE_MUTU: true, MANAJEMEN: false },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Internal Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            setActiveSection('welcome-config');
            setMessage('');
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeSection === 'welcome-config'
              ? 'bg-[#142D42] text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Foto Welcome Screen &amp; Profil RS</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection('users-access');
            setMessage('');
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeSection === 'users-access'
              ? 'bg-[#142D42] text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Hak Akses &amp; Manajemen Pengguna</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection('master-data');
            setMessage('');
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeSection === 'master-data'
              ? 'bg-[#142D42] text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Master Unit, Instrumen &amp; Periode</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection('audit-trail');
            setMessage('');
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeSection === 'audit-trail'
              ? 'bg-[#142D42] text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ScrollText className="w-3.5 h-3.5" />
          <span>Log Audit Sistem</span>
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-[#238C89]/30 bg-[#E5F3EF] px-4 py-2.5 text-xs font-medium text-[#142D42]">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-[#D9534F]/30 bg-[#D9534F]/5 px-4 py-2.5 text-xs text-[#D9534F]">
          {error}
        </div>
      )}

      {/* SECTION 1: FOTO WELCOME SCREEN & PROFIL RS */}
      {activeSection === 'welcome-config' && settings && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Welcome Screen Photo Customizer & Preview */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ImageIcon className="w-4 h-4 text-[#238C89]" />
              <div>
                <h2 className="font-display text-sm font-bold text-[#142D42]">
                  Pengaturan Foto Welcome Screen
                </h2>
                <p className="text-xs text-slate-500">
                  Ubah foto latar belakang halaman pembuka aplikasi SISMUT
                </p>
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="relative h-52 w-full rounded-xl overflow-hidden bg-[#142D42] border border-slate-200">
              {settings.welcome_image_url && (
                <img
                  src={settings.welcome_image_url}
                  alt="Pratinjau Welcome Screen"
                  className="absolute inset-0 w-full h-full object-cover opacity-45"
                />
              )}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(20, 45, 66, 0.90) 0%, rgba(36, 90, 120, 0.80) 100%)',
                }}
              />
              <div className="relative z-10 p-5 h-full flex flex-col justify-between text-white">
                <p className="text-[10px] font-semibold tracking-wider uppercase text-[#E5F3EF]/85">
                  Pratinjau Tampilan Welcome Screen
                </p>
                <div>
                  <p className="font-display text-xl font-extrabold">SISMUT</p>
                  <p className="text-xs text-[#E5F3EF]">{settings.hospital_name}</p>
                  <p className="text-[11px] text-white/80 mt-1 italic">
                    &ldquo;{settings.welcome_tagline || 'Mutu Terjaga, Pelayanan Terpercaya'}&rdquo;
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <label className="inline-flex items-center gap-1.5 rounded-lg bg-[#238C89] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1d7875] cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {uploadingWelcomeImg ? 'Mengunggah Foto...' : 'Unggah Foto Baru dari Perangkat'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleWelcomeImageUpload(e.target.files?.[0])}
                />
              </label>

              <button
                type="button"
                onClick={handleResetWelcomeImage}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Atau Tempel URL Gambar Latar Welcome Screen
              </label>
              <input
                type="text"
                value={settings.welcome_image_url || ''}
                onChange={(e) => setSettings({ ...settings, welcome_image_url: e.target.value })}
                placeholder="https://... atau path gambar"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          {/* Right: Hospital Profile, Tagline & SLA Configuration */}
          <form
            onSubmit={handleSaveSettings}
            className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <div className="border-b border-slate-100 pb-3">
              <h2 className="font-display text-base font-bold text-[#142D42]">
                Konfigurasi Identitas Rumah Sakit, Tagline &amp; Standar Mutu
              </h2>
              <p className="text-xs text-slate-500">
                Pengaturan ini diterapkan pada Welcome Screen, Dashboard, dan Kop Laporan Resmi
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Rumah Sakit
                </label>
                <input
                  type="text"
                  value={settings.hospital_name}
                  onChange={(e) => setSettings({ ...settings, hospital_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tagline Welcome Screen
                </label>
                <input
                  type="text"
                  value={settings.welcome_tagline || ''}
                  onChange={(e) => setSettings({ ...settings, welcome_tagline: e.target.value })}
                  placeholder="Mutu Terjaga, Pelayanan Terpercaya"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Alamat Resmi</label>
              <input
                type="text"
                value={settings.hospital_address}
                onChange={(e) => setSettings({ ...settings, hospital_address: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Akreditasi
                </label>
                <input
                  type="text"
                  value={settings.accreditation_target}
                  onChange={(e) =>
                    setSettings({ ...settings, accreditation_target: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ambang Batas Skor Kelulusan Mutu (%)
                </label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={settings.min_passing_score}
                  onChange={(e) =>
                    setSettings({ ...settings, min_passing_score: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-medium text-[#D9534F] mb-1">
                  SLA Kritis (Hari)
                </label>
                <input
                  type="number"
                  min={1}
                  value={settings.critical_sla_days}
                  onChange={(e) =>
                    setSettings({ ...settings, critical_sla_days: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#C2410C] mb-1">
                  SLA Tinggi (Hari)
                </label>
                <input
                  type="number"
                  min={1}
                  value={settings.high_sla_days}
                  onChange={(e) =>
                    setSettings({ ...settings, high_sla_days: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#B87A14] mb-1">
                  SLA Sedang (Hari)
                </label>
                <input
                  type="number"
                  min={1}
                  value={settings.medium_sla_days}
                  onChange={(e) =>
                    setSettings({ ...settings, medium_sla_days: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#245A78] mb-1">
                  SLA Rendah (Hari)
                </label>
                <input
                  type="number"
                  min={1}
                  value={settings.low_sla_days}
                  onChange={(e) =>
                    setSettings({ ...settings, low_sla_days: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="rounded-lg bg-[#142D42] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#245A78] cursor-pointer"
              >
                Simpan Seluruh Pengaturan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION 2: HAK AKSES & MANAJEMEN PENGGUNA */}
      {activeSection === 'users-access' && (
        <div className="space-y-6">
          {/* User Accounts Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-bold text-[#142D42]">
                  Daftar Akun Pengguna &amp; Penugasan Peran
                </h2>
                <p className="text-xs text-slate-500">
                  Kelola akun pegawai, peran akses (Role), dan penempatan unit
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateUser}
                className="inline-flex items-center gap-2 rounded-lg bg-[#142D42] px-4 py-2 text-xs font-semibold text-white hover:bg-[#245A78] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Pengguna Baru</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-3 px-4">Nama &amp; Email</th>
                    <th className="py-3 px-4">Jabatan</th>
                    <th className="py-3 px-4">Role / Hak Akses</th>
                    <th className="py-3 px-4">Unit Terkait</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#142D42]">{u.full_name}</p>
                        <p className="font-mono text-[11px] text-slate-500">{u.email}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{u.position_title || '-'}</td>
                      <td className="py-3 px-4 font-semibold text-[#245A78]">
                        {ROLE_LABELS[u.role]}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {u.unit_name || 'Seluruh Rumah Sakit'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={
                            u.is_active ? 'font-semibold text-emerald-700' : 'text-slate-400'
                          }
                        >
                          {u.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-3">
                        <button
                          type="button"
                          onClick={() => openEditUser(u)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#245A78] hover:underline cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleUserActive(u)}
                          className="text-xs font-medium text-slate-600 hover:underline cursor-pointer"
                        >
                          {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingUser(u)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#D9534F] hover:underline cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Access Matrix */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2 text-[#142D42] font-display font-bold text-sm">
                <Shield className="w-4 h-4 text-[#238C89]" />
                <span>Matriks Hak Akses Berdasarkan Peran (Role-Based Access Control)</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Rincian kewenangan setiap peran pengguna di dalam aplikasi SISMUT
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-3 px-4">Fitur &amp; Kewenangan Sistem</th>
                    {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                      <th key={r} className="py-3 px-4 text-center">
                        {ROLE_LABELS[r]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {matrixRows.map((row) => (
                    <tr key={row.capability}>
                      <td className="py-3 px-4 font-medium text-[#243447]">{row.capability}</td>
                      {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                        <td key={r} className="py-3 px-4 text-center">
                          {row.roles[r] ? (
                            <Check className="w-4 h-4 text-[#238C89] mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
              <div key={role} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-[#142D42] font-display font-bold text-xs">
                  <Shield className="w-3.5 h-3.5 text-[#238C89]" />
                  <span>{ROLE_LABELS[role]}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: MASTER UNIT, INSTRUMEN & PERIODE */}
      {activeSection === 'master-data' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMasterSubTab('units')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                masterSubTab === 'units'
                  ? 'bg-[#238C89] text-white'
                  : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              Master Unit Pelayanan
            </button>
            <button
              type="button"
              onClick={() => setMasterSubTab('instruments')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                masterSubTab === 'instruments'
                  ? 'bg-[#238C89] text-white'
                  : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              Instrumen &amp; Indikator Checklist
            </button>
            <button
              type="button"
              onClick={() => setMasterSubTab('periods')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                masterSubTab === 'periods'
                  ? 'bg-[#238C89] text-white'
                  : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              Periode Supervisi
            </button>
          </div>

          {masterSubTab === 'units' && <MasterUnitsPage />}
          {masterSubTab === 'instruments' && <InstrumentsPage />}
          {masterSubTab === 'periods' && <CategoriesPeriodsPage />}
        </div>
      )}

      {/* SECTION 4: AUDIT TRAIL */}
      {activeSection === 'audit-trail' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-display text-sm font-bold text-[#142D42]">
              Log Audit Aktivitas &amp; Perubahan Data
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Pengguna &amp; Peran</th>
                  <th className="py-3 px-4">Aksi</th>
                  <th className="py-3 px-4">Tabel &amp; ID</th>
                  <th className="py-3 px-4">Catatan / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                      {log.created_at}
                    </td>
                    <td className="py-2.5 px-4">
                      <p className="font-semibold text-[#142D42]">{log.user_name}</p>
                      <p className="text-[11px] text-slate-500">{log.user_role}</p>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-[#245A78]">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">
                      {log.table_name} · {log.record_id.slice(0, 8)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{log.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Modal */}
      {userModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="font-display text-base font-bold text-[#142D42] mb-4">
              {editingUser ? 'Edit Pengguna & Hak Akses' : 'Tambah Akun Pengguna'}
            </h3>
            <form onSubmit={handleSaveUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={userForm.full_name}
                  onChange={(e) => setUserForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {editingUser ? 'Kata Sandi Baru (Opsional)' : 'Kata Sandi'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userForm.password}
                  onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={userForm.role}
                    onChange={(e) =>
                      setUserForm((f) => ({ ...f, role: e.target.value as UserRole }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  >
                    {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Unit Terkait (Opsional)
                  </label>
                  <select
                    value={userForm.unit_id}
                    onChange={(e) => setUserForm((f) => ({ ...f, unit_id: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  >
                    <option value="">Lintas Unit / RS</option>
                    {units.map((un) => (
                      <option key={un.id} value={un.id}>
                        {un.unit_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Jabatan</label>
                <input
                  type="text"
                  value={userForm.position_title}
                  onChange={(e) =>
                    setUserForm((f) => ({ ...f, position_title: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#142D42] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D9534F]/10 text-[#D9534F] flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-[#142D42]">
                  Hapus Akun Pengguna
                </h3>
                <p className="text-xs text-slate-500">
                  Konfirmasi penghapusan akun dari daftar pengguna
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun{' '}
              <strong className="text-[#142D42]">{deletingUser.full_name}</strong> (
              <span className="font-mono">{deletingUser.email}</span>) dengan role{' '}
              <strong>{ROLE_LABELS[deletingUser.role]}</strong>?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#D9534F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#c9302c] cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
