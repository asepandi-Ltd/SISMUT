import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Upload, Eye } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import { canPerformSupervision, FINDING_STATUSES, RISK_LEVELS } from '../lib/permissions';
import { FindingStatusIndicator, RiskIndicator } from '../components/StatusText';
import type { Finding, RiskLevel, Supervision, Unit } from '../types/sismut';

interface FindingsPageProps {
  onOpenFollowUp: (findingId: string) => void;
}

export function FindingsPage({ onOpenFollowUp }: FindingsPageProps) {
  const { user } = useAuth();
  const { revision } = useRealtime();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [supervisions, setSupervisions] = useState<Supervision[]>([]);

  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [unitFilter, setUnitFilter] = useState('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [detailFinding, setDetailFinding] = useState<Finding | null>(null);
  const [form, setForm] = useState({
    supervision_id: '',
    unit_id: '',
    category_name: 'Keselamatan Pasien',
    description: '',
    evidence_url: '',
    risk_level: 'Sedang' as RiskLevel,
    recommendation: '',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  });

  const loadData = useCallback(async () => {
    const [f, u, s] = await Promise.all([
      api.getFindings(),
      api.getUnits(),
      api.getSupervisions(),
    ]);
    setFindings(f);
    setUnits(u.filter((x) => x.is_active));
    setSupervisions(s);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, revision]);

  const openCreate = () => {
    const firstSup = supervisions[0];
    setForm({
      supervision_id: firstSup?.id || '',
      unit_id: firstSup?.unit_id || units[0]?.id || '',
      category_name: 'Keselamatan Pasien',
      description: '',
      evidence_url: '',
      risk_level: 'Sedang',
      recommendation: '',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    });
    setModalOpen(true);
  };

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await api.uploadEvidence(file, 'supervision-evidence');
      setForm((f) => ({ ...f, evidence_url: url }));
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createFinding(form);
    setModalOpen(false);
    await loadData();
  };

  const filtered = findings.filter((f) => {
    if (riskFilter !== 'ALL' && f.risk_level !== riskFilter) return false;
    if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
    if (unitFilter !== 'ALL' && f.unit_id !== unitFilter) return false;
    if (
      search &&
      !f.finding_number.toLowerCase().includes(search.toLowerCase()) &&
      !f.description.toLowerCase().includes(search.toLowerCase()) &&
      !(f.unit_name || '').toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const canCreate = user ? canPerformSupervision(user.role) : false;

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor atau uraian temuan..."
              className="rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs w-56"
            />
          </div>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
          >
            <option value="ALL">Semua Risiko</option>
            {RISK_LEVELS.map((r) => (
              <option key={r} value={r}>
                Risiko {r}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
          >
            <option value="ALL">Semua Status</option>
            {FINDING_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
          >
            <option value="ALL">Semua Unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.unit_name}
              </option>
            ))}
          </select>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#142D42] px-4 py-2 text-xs font-semibold text-white hover:bg-[#245A78] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Temuan Manual</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">No. Temuan</th>
                <th className="py-3 px-4">Unit &amp; Kategori</th>
                <th className="py-3 px-4">Deskripsi Ketidaksesuaian</th>
                <th className="py-3 px-4">Risiko</th>
                <th className="py-3 px-4">Batas Waktu</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Tidak ada temuan yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50 align-top">
                    <td className="py-3 px-4 font-mono font-semibold text-[#142D42] whitespace-nowrap">
                      <p>{f.finding_number}</p>
                      <p className="text-[11px] font-normal text-slate-400">{f.supervision_number}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#243447]">{f.unit_name}</p>
                      <p className="text-[11px] text-slate-500">{f.category_name}</p>
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <p className="text-[#243447]">{f.description}</p>
                      {f.recommendation && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          Rekomendasi: {f.recommendation}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <RiskIndicator level={f.risk_level} />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {f.due_date}
                    </td>
                    <td className="py-3 px-4">
                      <FindingStatusIndicator status={f.status} dueDate={f.due_date} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() => setDetailFinding(f)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#245A78] hover:underline cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                      {f.status !== 'Selesai' && (
                        <button
                          type="button"
                          onClick={() => onOpenFollowUp(f.id)}
                          className="text-xs font-semibold text-[#238C89] hover:underline cursor-pointer"
                        >
                          Isi RTL
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

      {/* Detail Modal */}
      {detailFinding && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="font-mono text-xs font-bold text-[#238C89]">
                  {detailFinding.finding_number}
                </p>
                <h3 className="font-display text-base font-bold text-[#142D42]">
                  {detailFinding.unit_name} — {detailFinding.category_name}
                </h3>
              </div>
              <RiskIndicator level={detailFinding.risk_level} />
            </div>

            <div className="text-xs space-y-2.5 text-[#243447]">
              <div>
                <p className="font-semibold text-slate-500">Deskripsi Ketidaksesuaian</p>
                <p className="mt-0.5">{detailFinding.description}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-500">Rekomendasi Supervisor</p>
                <p className="mt-0.5">{detailFinding.recommendation || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <p className="font-semibold text-slate-500">Penanggung Jawab Unit</p>
                  <p>{detailFinding.pic_name || 'Kepala Unit Terkait'}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-500">Batas Waktu Penyelesaian</p>
                  <p className="font-mono">{detailFinding.due_date}</p>
                </div>
              </div>
              {detailFinding.evidence_url && (
                <div>
                  <p className="font-semibold text-slate-500 mb-1">Foto Bukti Temuan</p>
                  <img
                    src={detailFinding.evidence_url}
                    alt="Bukti temuan supervisi"
                    className="max-h-56 rounded-lg border border-slate-200 object-contain"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailFinding(null)}
                className="rounded-lg bg-[#142D42] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Finding Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl">
            <h3 className="font-display text-base font-bold text-[#142D42] mb-4">
              Catat Temuan Supervisi
            </h3>
            <form onSubmit={handleCreate} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Referensi Supervisi
                  </label>
                  <select
                    required
                    value={form.supervision_id}
                    onChange={(e) => {
                      const sup = supervisions.find((s) => s.id === e.target.value);
                      setForm((f) => ({
                        ...f,
                        supervision_id: e.target.value,
                        unit_id: sup?.unit_id || f.unit_id,
                      }));
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  >
                    {supervisions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.supervision_number} · {s.unit_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tingkat Risiko (Kebijakan RS)
                  </label>
                  <select
                    value={form.risk_level}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, risk_level: e.target.value as RiskLevel }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold"
                  >
                    {RISK_LEVELS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kategori</label>
                  <input
                    type="text"
                    required
                    value={form.category_name}
                    onChange={(e) => setForm((f) => ({ ...f, category_name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Batas Waktu Penyelesaian
                  </label>
                  <input
                    type="date"
                    required
                    value={form.due_date}
                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Deskripsi Ketidaksesuaian
                </label>
                <textarea
                  required
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Rekomendasi Supervisor
                </label>
                <textarea
                  rows={2}
                  value={form.recommendation}
                  onChange={(e) => setForm((f) => ({ ...f, recommendation: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? 'Mengunggah...' : 'Unggah Foto Bukti'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhoto(e.target.files?.[0])}
                  />
                </label>
                {form.evidence_url && (
                  <span className="text-xs text-[#238C89] font-medium">Foto siap dilampirkan</span>
                )}
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
                  Simpan Temuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
