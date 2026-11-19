import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { useRealtime } from '../contexts/RealtimeContext';
import type { SupervisionPeriod } from '../types/sismut';

const STANDARD_ASSESSMENT_DOMAINS = [
  '1. Kepatuhan terhadap SOP',
  '2. Keselamatan pasien',
  '3. Pencegahan dan Pengendalian Infeksi (PPI)',
  '4. Kebersihan dan sanitasi lingkungan',
  '5. Ketersediaan sarana dan prasarana',
  '6. Ketersediaan alat kesehatan',
  '7. Kesiapan pelayanan',
  '8. Dokumentasi rekam medis',
  '9. Pelaksanaan identifikasi pasien',
  '10. Kepatuhan terhadap standar pelayanan',
  '11. Pengelolaan obat dan BMHP',
  '12. K3RS dan keselamatan kerja',
  '13. Kepuasan dan pengalaman pasien',
  '14. Administrasi dan pelaporan',
];

export function CategoriesPeriodsPage() {
  const { revision } = useRealtime();
  const [periods, setPeriods] = useState<SupervisionPeriod[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    period_name: '',
    period_type: 'Triwulanan' as SupervisionPeriod['period_type'],
    start_date: '',
    end_date: '',
    status: 'Aktif' as SupervisionPeriod['status'],
  });

  const loadPeriods = useCallback(async () => {
    const data = await api.getPeriods();
    setPeriods(data);
  }, []);

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods, revision]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createPeriod(form);
    setModalOpen(false);
    setForm({ period_name: '', period_type: 'Triwulanan', start_date: '', end_date: '', status: 'Aktif' });
    await loadPeriods();
  };

  const handleStatusChange = async (p: SupervisionPeriod, status: SupervisionPeriod['status']) => {
    await api.updatePeriod(p.id, { status });
    await loadPeriods();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Periods Master */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-bold text-[#142D42]">
              Master Periode Supervisi
            </h2>
            <p className="text-xs text-slate-500">Siklus evaluasi mutu rumah sakit</p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#142D42] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#245A78] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Periode</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {periods.map((p) => (
            <div key={p.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#142D42] flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#238C89]" />
                  <span>{p.period_name}</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                  {p.period_type} · {p.start_date} s/d {p.end_date}
                </p>
              </div>
              <select
                value={p.status}
                onChange={(e) =>
                  handleStatusChange(p, e.target.value as SupervisionPeriod['status'])
                }
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-[#243447]"
              >
                <option value="Draft">Draft</option>
                <option value="Aktif">Aktif</option>
                <option value="Selesai">Selesai</option>
                <option value="Arsip">Arsip</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Reference 14 Quality Assessment Domains */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-display text-sm font-bold text-[#142D42] mb-1">
          Standar Domain Kategori Penilaian Mutu
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          14 domain acuan penyusunan instrumen supervisi RSUD Al-Mulk
        </p>
        <div className="divide-y divide-slate-100 text-xs text-[#243447]">
          {STANDARD_ASSESSMENT_DOMAINS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="font-display text-base font-bold text-[#142D42] mb-4">
              Tambah Periode Supervisi
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Periode</label>
                <input
                  type="text"
                  required
                  value={form.period_name}
                  onChange={(e) => setForm((f) => ({ ...f, period_name: e.target.value }))}
                  placeholder="Misal: Triwulan I 2027 (Jan–Mar)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Jenis Periode</label>
                <select
                  value={form.period_type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      period_type: e.target.value as SupervisionPeriod['period_type'],
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                >
                  <option value="Bulanan">Bulanan</option>
                  <option value="Triwulanan">Triwulanan</option>
                  <option value="Semesteran">Semesteran</option>
                  <option value="Tahunan">Tahunan</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#142D42] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Simpan Periode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
