import React, { useState } from 'react';
import { ArrowLeft, Lock, Mail, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../contexts/AuthContext';

interface LoginPageProps {
  onBackToWelcome: () => void;
}

const ROLE_QUICK_ACCOUNTS = [
  {
    label: 'Super Admin',
    email: 'superadmin@rsudalmulk.go.id',
    desc: 'Akses penuh seluruh fitur, manajemen pengguna, hak akses & pengaturan sistem',
  },
  {
    label: 'Komite Mutu Rumah Sakit',
    email: 'komitemutu@rsudalmulk.go.id',
    desc: 'Penginputan supervisi, monitoring & tindak lanjut perbaikan, analisis & laporan',
  },
  {
    label: 'Manajemen',
    email: 'manajemen@rsudalmulk.go.id',
    desc: 'Monitoring & tindak lanjut perbaikan unit, dashboard, grafik analisis & laporan',
  },
];

export function LoginPage({ onBackToWelcome }: LoginPageProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('superadmin@rsudalmulk.go.id');
  const [password, setPassword] = useState('Sismut2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeQuickEmail, setActiveQuickEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim() || 'superadmin@rsudalmulk.go.id', password || 'Sismut2026!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal masuk ke sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (acctEmail: string) => {
    setEmail(acctEmail);
    setPassword('Sismut2026!');
    setError('');
    setActiveQuickEmail(acctEmail);
    setSubmitting(true);
    try {
      await login(acctEmail, 'Sismut2026!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal masuk ke sistem.');
    } finally {
      setSubmitting(false);
      setActiveQuickEmail(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-between">
      <div className="px-6 sm:px-10 pt-6">
        <button
          type="button"
          onClick={onBackToWelcome}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#245A78] hover:text-[#142D42] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Halaman Pembuka</span>
        </button>
      </div>

      <div className="mx-auto w-full max-w-4xl px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Login Form Card */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3.5 pb-6 border-b border-slate-100">
            <BrandLogo className="w-11 h-11 shrink-0" />
            <div>
              <h1 className="font-display text-xl font-bold text-[#142D42]">
                Masuk ke SISMUT
              </h1>
              <p className="text-xs text-slate-500">
                Sistem Informasi Supervisi Mutu · RSUD Al-Mulk Kota Sukabumi
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-[#D9534F]/30 bg-[#D9534F]/5 px-4 py-3 text-sm text-[#D9534F]"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-[#243447] mb-1.5">
                Email Pegawai / Nama Pengguna
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="superadmin@rsudalmulk.go.id"
                  className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-[#243447] focus:border-[#245A78] focus:outline-none focus:ring-2 focus:ring-[#245A78]/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-[#243447] mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-11 py-2.5 text-sm text-[#243447] focus:border-[#245A78] focus:outline-none focus:ring-2 focus:ring-[#245A78]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#142D42] px-5 py-3 font-display text-sm font-semibold text-white transition-colors hover:bg-[#245A78] disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Memverifikasi & Masuk...' : 'Masuk ke Sistem'}
            </button>
          </form>
        </div>

        {/* One-Click Role Login Directory */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div>
            <h2 className="font-display text-sm font-bold text-[#142D42]">
              Akses Cepat Berdasarkan Peran
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik salah satu peran di bawah untuk langsung masuk ke sistem
            </p>
          </div>

          <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
            {ROLE_QUICK_ACCOUNTS.map((acct) => {
              const isEntering = activeQuickEmail === acct.email;
              return (
                <button
                  key={acct.email}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleQuickLogin(acct.email)}
                  className="w-full py-2.5 text-left hover:bg-[#E5F3EF]/60 px-2.5 -mx-2.5 rounded-lg transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#142D42] group-hover:text-[#238C89]">
                      {acct.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#238C89]">
                      <LogIn className="w-3 h-3" />
                      <span>{isEntering ? 'Masuk...' : 'Masuk'}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{acct.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="px-6 py-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        RSUD Al-Mulk Kota Sukabumi · SISMUT — Mutu Terjaga, Pelayanan Terpercaya
      </footer>
    </div>
  );
}
