import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Play, CalendarClock } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import { canManageMasterData, canPerformSupervision } from '../lib/permissions';
import type {
  Instrument,
  Profile,
  SupervisionPeriod,
  SupervisionSchedule,
  Unit,
} from '../types/sismut';

interface SchedulesPageProps {
  onStartFromSchedule: (sched: SupervisionSchedule) => void;
}

export function SchedulesPage({ onStartFromSchedule }: SchedulesPageProps) {
  const { user } = useAuth();
  const { revision } = useRealtime();
  const [schedules, setSchedules] = useState<SupervisionSchedule[]>([]);
  const [periods, setPeriods] = useState<SupervisionPeriod[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [supervisors, setSupervisors] = useState<Profile[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    period_id: '',
    unit_id: '',
    instrument_id: '',
    supervisor_id: '',
    scheduled_date: new Date().toISOString().slice(0, 10),
    scheduled_time: '09:00',
    team_members: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    const [s, p, u, i, us] = await Promise.all([
      api.getSchedules(),
      api.getPeriods(),
      api.getUnits(),
      api.getInstruments(),
      api.getUsers(),
    ]);
    setSchedules(s);
    setPeriods(p);
    setUnits(u.filter((x) => x.is_active));
    setInstruments(i.filter((x) => x.is_active));
    setSupervisors(
      us.filter((x) => x.is_active && ['SUPER_ADMIN', 'KOMITE_MUTU'].includes(x.role))
    );
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, revision]);

  const openModal = () => {
    setForm({
      period_id: periods.find((p) => p.status === 'Aktif')?.id || periods[0]?.id || '',
      unit_id: units[0]?.id || '',
      instrument_id: instruments[0]?.id || '',
      supervisor_id: supervisors[0]?.id || user?.id || '',
      scheduled_date: new Date().toISOString().slice(0, 10),
      scheduled_time: '09:00',
      team_members: '',
      notes: '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createSchedule(form);
    setModalOpen(false);
    await loadData();
  };

  const canCreate = user ? canManageMasterData(user.role) : false;
  const canExecute = user ? canPerformSupervision(user.role) : false;

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CalendarClock className="w-5 h-5 text-[#245A78]" />
          <div>
            <h2 className="font-display text-sm font-bold text-[#142D42]">
              Jadwal Pelaksanaan Supervisi Mutu
            </h2>
            <p className="text-xs text-slate-500">
              Perencanaan jadwal pemeriksaan unit RSUD Al-Mulk Kota Sukabumi
            </p>
          </div>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-2 rounded-lg bg-[#142D42] px-4 py-2 text-xs font-semibold text-white hover:bg-[#245A78] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Jadwal Supervisi</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Tanggal &amp; Waktu</th>
                <th className="py-3 px-4">Unit Pelayanan</th>
                <th className="py-3 px-4">Instrumen</th>
                <th className="py-3 px-4">Supervisor &amp; Tim</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Belum ada jadwal supervisi terdaftar.
                  </td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                      <p className="font-semibold text-[#142D42]">{s.scheduled_date}</p>
                      <p className="text-[11px] text-slate-500">{s.scheduled_time} WIB · {s.period_name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#243447]">{s.unit_name}</p>
                      <p className="text-[11px] text-slate-500">{s.unit_category}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">{s.instrument_name}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-[#243447]">{s.supervisor_name}</p>
                      {s.team_members && <p className="text-[11px] text-slate-500">{s.team_members}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          s.status === 'Selesai'
                            ? 'text-emerald-700'
                            : s.status === 'Berlangsung'
                              ? 'text-[#245A78]'
                              : s.status === 'Ditunda'
                                ? 'text-[#D9534F]'
                                : 'text-[#B87A14]'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {canExecute && s.status !== 'Selesai' && (
                        <button
                          type="button"
                          onClick={() => onStartFromSchedule(s)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#238C89] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1d7875] cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Mulai Supervisi</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl">
            <h3 className="font-display text-base font-bold text-[#142D42] mb-4">
              Tambah Jadwal Supervisi
            </h3>
            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Periode</label>
                  <select
                    required
                    value={form.period_id}
                    onChange={(e) => setForm((f) => ({ ...f, period_id: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.period_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Unit Tujuan</label>
                  <select
                    required
                    value={form.unit_id}
                    onChange={(e) => setForm((f) => ({ ...f, unit_id: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.unit_name} ({u.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Instrumen Supervisi</label>
                <select
                  required
                  value={form.instrument_id}
                  onChange={(e) => setForm((f) => ({ ...f, instrument_id: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                >
                  {instruments.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.instrument_name} (v{inst.version})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Supervisor Utama</label>
                  <select
                    required
                    value={form.supervisor_id}
                    onChange={(e) => setForm((f) => ({ ...f, supervisor_id: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  >
                    {supervisors.map((sv) => (
                      <option key={sv.id} value={sv.id}>
                        {sv.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={form.scheduled_date}
                    onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Waktu</label>
                  <input
                    type="time"
                    value={form.scheduled_time}
                    onChange={(e) => setForm((f) => ({ ...f, scheduled_time: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tim Pemeriksa</label>
                <input
                  type="text"
                  value={form.team_members}
                  onChange={(e) => setForm((f) => ({ ...f, team_members: e.target.value }))}
                  placeholder="Nama anggota tim pemeriksa..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Catatan Jadwal</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
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
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
