import React, { useEffect, useState, useCallback } from 'react';
import {
  Camera,
  SlidersHorizontal,
  Check,
  ChevronRight,
  MapPin,
  Clock,
  CheckCircle2,
  KeyRound,
  X,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS } from '../lib/permissions';
import type { AppSettings, Profile } from '../types/sismut';

interface WelcomeScreenProps {
  onEnter: () => void;
}

const DEFAULT_WELCOME_IMAGE =
  'https://hqqvbtxfantvoplfcxmt.supabase.co/storage/v1/object/public/application-assets/1795052367570-36651b18-fd2d-41b5-96e0-0fd02d2303a0-wiwin.png';

const INITIAL_SUPABASE_USERS: Profile[] = [
  {
    id: '33d465bb-47ff-4642-aa33-286a93802f7a',
    email: 'superadmin@rsudalmulk.go.id',
    full_name: 'Asep Andi J',
    role: 'SUPER_ADMIN',
    unit_id: '61f0d938-d124-4ef4-942c-67c338f0a4bb',
    unit_name: 'Unit Mutu',
    position_title: 'Kepala Seksi Penunjang, Mutu, Humas, dan Pemasaran',
    is_active: true,
    created_at: '2026-11-18T18:54:56.817Z',
  },
  {
    id: '240c4578-9d88-4012-a81b-ef2543d7186a',
    email: 'komitemutu@rsudalmulk.go.id',
    full_name: 'Wiwin Kusmiati',
    role: 'KOMITE_MUTU',
    unit_id: '61f0d938-d124-4ef4-942c-67c338f0a4bb',
    unit_name: 'Unit Mutu',
    position_title: 'Komite Mutu RSUD Al-Mulk',
    is_active: true,
    created_at: '2026-11-18T18:54:56.817Z',
  },
  {
    id: 'c8822749-f09e-4c41-a6e7-a163274a2234',
    email: 'manajemen@rsudalmulk.go.id',
    full_name: 'Dr. Deni Purnama, MKM.,MARS',
    role: 'MANAJEMEN',
    unit_id: null,
    unit_name: null,
    position_title: 'Direktur / Manajemen RSUD Al-Mulk Kota Sukabumi',
    is_active: true,
    created_at: '2026-11-18T18:54:56.817Z',
  },
];

export function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  const { login } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [users, setUsers] = useState<Profile[]>(INITIAL_SUPABASE_USERS);
  const [selectedUserId, setSelectedUserId] = useState<string>(INITIAL_SUPABASE_USERS[0].id);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [bgImage, setBgImage] = useState(DEFAULT_WELCOME_IMAGE);
  const [imgError, setImgError] = useState(false);
  const [hospitalName, setHospitalName] = useState('RSUD Al-Mulk Kota Sukabumi');
  const [tagline, setTagline] = useState('Mutu Terjaga, Pelayanan Terpercaya');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Kustomisasi Modal
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customForm, setCustomForm] = useState({
    hospital_name: 'RSUD Al-Mulk Kota Sukabumi',
    welcome_tagline: 'Mutu Terjaga, Pelayanan Terpercaya',
    welcome_image_url: DEFAULT_WELCOME_IMAGE,
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      const [userList, st] = await Promise.all([api.getUsers(), api.getSettings()]);
      const activeUsers = userList.filter((u) => u.is_active);
      const listToUse = activeUsers.length > 0 ? activeUsers : userList;
      setUsers(listToUse);
      if (listToUse.length > 0) {
        setSelectedUserId((prev) =>
          prev && listToUse.some((u) => u.id === prev) ? prev : listToUse[0].id
        );
      }

      if (st) {
        setSettings(st);
        const imgUrl = st.welcome_image_url || DEFAULT_WELCOME_IMAGE;
        setBgImage(imgUrl);
        setImgError(false);
        setHospitalName(st.hospital_name || 'RSUD Al-Mulk Kota Sukabumi');
        setTagline(st.welcome_tagline || 'Mutu Terjaga, Pelayanan Terpercaya');
        setCustomForm({
          hospital_name: st.hospital_name || 'RSUD Al-Mulk Kota Sukabumi',
          welcome_tagline: st.welcome_tagline || 'Mutu Terjaga, Pelayanan Terpercaya',
          welcome_image_url: imgUrl,
        });
      }
    } catch (err: unknown) {
      setLoginError(
        err instanceof Error ? err.message : 'Gagal terhubung ke database Supabase.'
      );
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0] || null;

  const handleDirectLogin = async () => {
    if (!selectedUser) {
      onEnter();
      return;
    }
    setLoginError('');
    setLoggingIn(true);
    try {
      await login(selectedUser.email, 'Sismut2026!');
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Gagal masuk ke sistem.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handlePhotoUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadingPhoto(true);
    setUploadSuccess('');
    try {
      const url = await api.uploadEvidence(file, 'application-assets');
      setBgImage(url);
      setImgError(false);
      setCustomForm((f) => ({ ...f, welcome_image_url: url }));
      const nextSettings: Partial<AppSettings> = {
        ...(settings || {}),
        welcome_image_url: url,
      };
      const updated = await api.updateSettings(nextSettings);
      setSettings(updated);
      setUploadSuccess('Foto Welcome Screen berhasil disimpan ke Supabase!');
      setTimeout(() => setUploadSuccess(''), 3500);
    } catch (err: unknown) {
      setLoginError(
        err instanceof Error ? err.message : 'Gagal mengunggah foto ke Supabase Storage.'
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveCustomization = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nextSettings: Partial<AppSettings> = {
        ...(settings || {}),
        hospital_name: customForm.hospital_name,
        welcome_tagline: customForm.welcome_tagline,
        welcome_image_url: customForm.welcome_image_url || DEFAULT_WELCOME_IMAGE,
      };
      const updated = await api.updateSettings(nextSettings);
      setSettings(updated);
      setHospitalName(customForm.hospital_name);
      setTagline(customForm.welcome_tagline);
      setBgImage(customForm.welcome_image_url || DEFAULT_WELCOME_IMAGE);
      setImgError(false);
      setCustomizeOpen(false);
      setUploadSuccess('Kustomisasi disimpan ke Supabase!');
      setTimeout(() => setUploadSuccess(''), 3500);
    } catch (err: unknown) {
      setLoginError(
        err instanceof Error ? err.message : 'Gagal menyimpan pengaturan ke Supabase.'
      );
      setCustomizeOpen(false);
    }
  };

  const handleResetPhoto = async () => {
    setBgImage(DEFAULT_WELCOME_IMAGE);
    setImgError(false);
    setCustomForm((f) => ({ ...f, welcome_image_url: DEFAULT_WELCOME_IMAGE }));
    if (settings) {
      const updated = await api.updateSettings({
        ...settings,
        welcome_image_url: DEFAULT_WELCOME_IMAGE,
      });
      setSettings(updated);
    }
  };

  const timeText = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const shortDateText = now.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const getInitial = (name: string) => {
    const clean = name.replace(/^(dr\.|Dr\.|Ns\.|apt\.|H\.|Hj\.)\s*/gi, '').trim();
    return (clean[0] || name[0] || 'S').toUpperCase();
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-[#243447] flex flex-col justify-between select-none">
      {/* Top Header Bar */}
      <header className="w-full bg-white border-b border-slate-200/80 px-5 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#142D42] text-white font-display font-extrabold text-xs flex items-center justify-center shadow-sm">
            SM
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-sm text-[#142D42] tracking-tight">
                SISMUT
              </span>
              <span className="rounded bg-[#E5F3EF] px-2 py-0.5 text-[10px] font-bold text-[#238C89] uppercase tracking-wider">
                RSUD AL-MULK
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Sistem Informasi Supervisi Mutu Rumah Sakit
            </p>
          </div>
        </div>

        {/* Right Action Buttons: Status, Unggah Foto, Kustomisasi */}
        <div className="flex flex-wrap items-center gap-2">
          {uploadSuccess && (
            <span className="text-xs font-semibold text-[#238C89] bg-[#E5F3EF] px-3 py-1.5 rounded-lg">
              {uploadSuccess}
            </span>
          )}

          <div
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold ${
              loginError
                ? 'border-[#D9534F]/30 bg-[#D9534F]/10 text-[#D9534F]'
                : 'border-emerald-200 bg-emerald-50/70 text-emerald-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                loginError ? 'bg-[#D9534F]' : 'bg-emerald-500 animate-pulse'
              }`}
            />
            <span>{loginError ? 'Menunggu Konfigurasi Supabase' : 'Supabase Online'}</span>
          </div>

          <label className="inline-flex items-center gap-1.5 rounded-lg border border-[#238C89]/30 bg-[#E5F3EF]/70 hover:bg-[#E5F3EF] px-3.5 py-1.5 text-xs font-semibold text-[#142D42] transition-colors cursor-pointer">
            <Camera className="w-3.5 h-3.5 text-[#238C89]" />
            <span>{uploadingPhoto ? 'Mengunggah...' : 'Unggah Foto'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
            />
          </label>

          <button
            type="button"
            onClick={() => setCustomizeOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Kustomisasi</span>
          </button>
        </div>
      </header>

      {/* Main Split Content */}
      <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 sm:px-8 py-6 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Card: Pilih Akun Petugas */}
          <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              {/* Card Header */}
              <div className="flex items-center gap-3.5 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-[#142D42] text-white font-display font-extrabold text-sm flex items-center justify-center shadow-sm shrink-0">
                  SM
                </div>
                <div>
                  <h1 className="font-display text-lg font-extrabold text-[#142D42]">
                    Pilih Akun Petugas
                  </h1>
                  <p className="text-xs text-slate-500">
                    Tentukan akun sebelum melaksanakan supervisi mutu
                  </p>
                </div>
              </div>

              {loginError && (
                <div className="mb-3 rounded-lg border border-[#D9534F]/30 bg-[#D9534F]/5 px-3 py-2 text-xs text-[#D9534F]">
                  {loginError}
                </div>
              )}

              {/* Account List */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {users.map((u) => {
                  const isSelected = selectedUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUserId(u.id)}
                      className={`w-full text-left rounded-xl border p-3.5 transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'border-[#238C89] bg-[#E5F3EF]/45 shadow-xs'
                          : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl font-display font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#142D42] text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {getInitial(u.full_name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-display text-xs font-bold text-[#142D42] truncate">
                              {u.full_name}
                            </p>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#238C89] shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            <span className="font-semibold text-[#238C89]">
                              {ROLE_LABELS[u.role]}
                            </span>
                            {' · '}
                            <span>{u.position_title || u.unit_name || 'RSUD Al-Mulk'}</span>
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#238C89] text-white'
                            : 'border border-slate-200 bg-slate-100/80'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Enter CTA */}
            <div className="pt-5 mt-5 border-t border-slate-100 space-y-3">
              <button
                type="button"
                disabled={loggingIn || !selectedUser}
                onClick={handleDirectLogin}
                className="w-full rounded-xl bg-[#142D42] hover:bg-[#245A78] disabled:opacity-60 px-5 py-3.5 font-display text-xs font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>
                  {loggingIn
                    ? 'Memverifikasi & Masuk...'
                    : selectedUser
                      ? `Masuk Sebagai ${selectedUser.full_name}`
                      : 'Masuk ke Aplikasi'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  Peran:{' '}
                  <strong className="text-[#142D42]">
                    {selectedUser ? ROLE_LABELS[selectedUser.role] : '-'}
                  </strong>
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#238C89]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Siap Bertugas</span>
                </span>
              </div>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={onEnter}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-[#245A78] transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Masuk manual dengan email &amp; kata sandi</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Large Rounded Photo Card with User's Uploaded Image */}
          <div className="lg:col-span-8 relative min-h-[460px] lg:min-h-[560px] rounded-2xl overflow-hidden bg-[#142D42] border border-slate-200/80 shadow-sm flex flex-col justify-end">
            {!imgError && bgImage && (
              <img
                src={bgImage}
                alt={`Foto Welcome Screen ${hospitalName}`}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            )}

            {/* Subtle Bottom Gradient so Typography is Always Clear while Preserving Full Photo Clarity */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(20, 45, 66, 0.08) 0%, rgba(20, 45, 66, 0.18) 50%, rgba(20, 45, 66, 0.82) 100%)',
              }}
            />

            {/* Floating Quick Photo Upload Pill on Corner of Image */}
            <div className="absolute top-4 right-4 z-10">
              <label className="inline-flex items-center gap-1.5 rounded-xl bg-black/45 hover:bg-black/65 backdrop-blur-md border border-white/20 px-3.5 py-2 text-xs font-semibold text-white transition-all cursor-pointer shadow-sm">
                <Camera className="w-3.5 h-3.5 text-[#E5F3EF]" />
                <span>{uploadingPhoto ? 'Mengunggah Foto...' : 'Ganti Foto Ini'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                />
              </label>
            </div>

            {/* Bottom-Left Overlay Text matching Screenshot Layout */}
            <div className="relative z-10 p-6 sm:p-10 max-w-2xl text-white">
              <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-xs">
                SISMUT
              </h2>
              <p className="font-display text-sm sm:text-base font-bold uppercase tracking-wide text-white/95 mt-1.5 drop-shadow-xs">
                &ldquo;{tagline}&rdquo;
              </p>
              <p className="font-display text-xs sm:text-sm font-bold uppercase tracking-widest text-[#E5F3EF] mt-2">
                {hospitalName}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Status Bar */}
      <footer className="w-full bg-white border-t border-slate-200/80 px-5 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#238C89]" />
          <span>{hospitalName}, Jawa Barat</span>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#238C89]" />
          <span>Sistem Informasi Supervisi Mutu Rumah Sakit Terpadu</span>
        </div>

        <div className="flex items-center gap-1.5 font-mono tabular-nums">
          <Clock className="w-3.5 h-3.5 text-[#245A78]" />
          <span className="font-semibold text-[#142D42]">WIB {timeText}</span>
          <span className="text-slate-400">({shortDateText})</span>
        </div>
      </footer>

      {/* Kustomisasi Welcome Screen Modal */}
      {customizeOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-[#142D42]">
                  Kustomisasi Welcome Screen
                </h3>
                <p className="text-xs text-slate-500">
                  Unggah foto sendiri atau sesuaikan teks halaman pembuka
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomizeOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomization} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#142D42]">
                  Foto Welcome Screen
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 rounded-lg bg-[#238C89] hover:bg-[#1d7875] px-3.5 py-2 text-xs font-semibold text-white cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingPhoto ? 'Mengunggah...' : 'Pilih Foto dari Perangkat'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleResetPhoto}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Foto Default</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Atau URL Gambar
                </label>
                <input
                  type="text"
                  value={customForm.welcome_image_url}
                  onChange={(e) =>
                    setCustomForm((f) => ({ ...f, welcome_image_url: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tagline / Semboyan
                </label>
                <input
                  type="text"
                  value={customForm.welcome_tagline}
                  onChange={(e) =>
                    setCustomForm((f) => ({ ...f, welcome_tagline: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Institusi Rumah Sakit
                </label>
                <input
                  type="text"
                  value={customForm.hospital_name}
                  onChange={(e) =>
                    setCustomForm((f) => ({ ...f, hospital_name: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCustomizeOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#142D42] px-4 py-2 text-xs font-semibold text-white hover:bg-[#245A78] cursor-pointer"
                >
                  Simpan Tampilan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
