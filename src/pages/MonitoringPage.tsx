import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Eye,
  Edit3,
  Wrench,
  Printer,
  X,
  Upload,
  CheckCircle2,
  Save,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import { canPerformSupervision, RISK_LEVELS } from '../lib/permissions';
import {
  FindingStatusIndicator,
  RiskIndicator,
  SupervisionStatusIndicator,
} from '../components/StatusText';
import type { Finding, Supervision, SupervisionPeriod } from '../types/sismut';

interface MonitoringPageProps {
  preselectedFindingId?: string | null;
  onResumeSupervision: (supervisionId: string) => void;
  onNewSupervision: () => void;
}

const SIMPLIFIED_STATUSES = [
  'Belum Ditindaklanjuti',
  'Dalam Proses',
  'Selesai',
  'Terlambat',
] as const;

export function MonitoringPage({
  preselectedFindingId,
  onResumeSupervision,
  onNewSupervision,
}: MonitoringPageProps) {
  const { user } = useAuth();
  const { revision } = useRealtime();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [periods, setPeriods] = useState<SupervisionPeriod[]>([]);
  const [supervisions, setSupervisions] = useState<Supervision[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<(Supervision & { is_weighted: boolean }) | null>(
    null
  );

  const [activeTab, setActiveTab] = useState<'perbaikan' | 'supervisi'>('perbaikan');
  const [periodFilter, setPeriodFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Integrated Tindak Lanjut (Follow-Up) state
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    preselectedFindingId || null
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [deletingFinding, setDeletingFinding] = useState<Finding | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [listMessage, setListMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [followUpForm, setFollowUpForm] = useState({
    root_cause: '',
    corrective_action: '',
    preventive_action: '',
    responsible_person: user?.full_name || '',
    resources_needed: '',
    target_date: new Date().toISOString().slice(0, 10),
    execution_date: new Date().toISOString().slice(0, 10),
    evidence_url: '',
  });

  const loadData = useCallback(async () => {
    const [f, p, s] = await Promise.all([
      api.getFindings(),
      api.getPeriods(),
      api.getSupervisions(),
    ]);
    setFindings(f);
    setPeriods(p);
    setSupervisions(s);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, revision]);

  useEffect(() => {
    if (preselectedFindingId) {
      setSelectedFindingId(preselectedFindingId);
      setActiveTab('perbaikan');
    }
  }, [preselectedFindingId]);

  const selectedFinding = useMemo(
    () => findings.find((f) => f.id === selectedFindingId) || null,
    [findings, selectedFindingId]
  );

  useEffect(() => {
    if (!selectedFinding) return;
    const fu = selectedFinding.latest_follow_up;
    setFollowUpForm({
      root_cause: fu?.root_cause || '',
      corrective_action: fu?.corrective_action || '',
      preventive_action: fu?.preventive_action || '',
      responsible_person:
        fu?.responsible_person || selectedFinding.pic_name || user?.full_name || '',
      resources_needed: fu?.resources_needed || '',
      target_date:
        fu?.target_date || selectedFinding.due_date || new Date().toISOString().slice(0, 10),
      execution_date: fu?.execution_date || new Date().toISOString().slice(0, 10),
      evidence_url: fu?.evidence_url || '',
    });
  }, [selectedFinding, user]);

  const categories = useMemo(
    () => Array.from(new Set(findings.map((f) => f.category_name))).sort(),
    [findings]
  );

  const filteredSupervisions = useMemo(() => {
    return supervisions.filter((s) => {
      if (periodFilter !== 'ALL' && s.period_id !== periodFilter) return false;
      return true;
    });
  }, [supervisions, periodFilter]);

  const filteredFindings = useMemo(() => {
    const periodSupIds = new Set(
      supervisions.filter((s) => periodFilter === 'ALL' || s.period_id === periodFilter).map((s) => s.id)
    );
    return findings.filter((f) => {
      if (periodFilter !== 'ALL' && !periodSupIds.has(f.supervision_id)) return false;
      if (categoryFilter !== 'ALL' && f.category_name !== categoryFilter) return false;
      if (riskFilter !== 'ALL' && f.risk_level !== riskFilter) return false;
      if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
      return true;
    });
  }, [findings, supervisions, periodFilter, categoryFilter, riskFilter, statusFilter]);

  const openSupervisionDetail = async (id: string) => {
    const detail = await api.getSupervisionDetail(id);
    setSelectedDetail(detail);
  };

  const handlePhotoUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await api.uploadEvidence(file, 'followup-evidence');
      setFollowUpForm((f) => ({ ...f, evidence_url: url }));
    } catch (err: unknown) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal mengunggah bukti perbaikan.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitFollowUp = async (markCompleted: boolean) => {
    if (!selectedFinding) return;
    if (!followUpForm.root_cause.trim() || !followUpForm.corrective_action.trim()) {
      setFeedback({
        type: 'err',
        text: 'Harap isi Akar Penyebab Masalah dan Tindakan Perbaikan yang Dilakukan.',
      });
      return;
    }
    setFeedback(null);
    setSaving(true);
    try {
      await api.submitFollowUp({
        finding_id: selectedFinding.id,
        ...followUpForm,
        mark_completed: markCompleted,
      });
      await loadData();
      setFeedback({
        type: 'ok',
        text: markCompleted
          ? `Tindak lanjut perbaikan untuk ${selectedFinding.finding_number} berhasil disimpan dan ditandai Selesai.`
          : `Progres perbaikan untuk ${selectedFinding.finding_number} berhasil disimpan sebagai Dalam Proses.`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menyimpan tindak lanjut perbaikan.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeleteFinding = async () => {
    if (!deletingFinding) return;
    setDeletingBusy(true);
    setListMessage(null);
    try {
      const targetNum = deletingFinding.finding_number;
      const targetUnit = deletingFinding.unit_name;
      const targetId = deletingFinding.id;
      await api.deleteFinding(targetId);
      if (selectedFindingId === targetId) {
        setSelectedFindingId(null);
        setFeedback(null);
      }
      setDeletingFinding(null);
      await loadData();
      setListMessage({
        type: 'ok',
        text: `Data ketidaksesuaian & tindak lanjut ${targetNum} (${targetUnit}) berhasil dihapus dari database Supabase.`,
      });
    } catch (err: unknown) {
      setListMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menghapus data ketidaksesuaian.',
      });
      setDeletingFinding(null);
    } finally {
      setDeletingBusy(false);
    }
  };

  const canInput = user ? canPerformSupervision(user.role) : false;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
        >
          <option value="ALL">Semua Periode</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.period_name}
            </option>
          ))}
        </select>

        {activeTab === 'perbaikan' && (
          <>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
            >
              <option value="ALL">Semua Tingkat Risiko</option>
              {RISK_LEVELS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
            >
              <option value="ALL">Semua Status Perbaikan</option>
              {SIMPLIFIED_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </>
        )}
      </section>

      {activeTab === 'perbaikan' ? (
        <>

          {/* Integrated Tindak Lanjut Form Drawer / Card when an item is selected */}
          {selectedFinding && (
            <section className="bg-white border-2 border-[#238C89] rounded-xl p-5 shadow-sm space-y-5">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#238C89]">
                      FORM TINDAK LANJUT PERBAIKAN · {selectedFinding.finding_number}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-semibold text-[#142D42]">
                      {selectedFinding.unit_name} ({selectedFinding.category_name})
                    </span>
                    <FindingStatusIndicator
                      status={selectedFinding.status}
                      dueDate={selectedFinding.due_date}
                    />
                  </div>
                  <h3 className="font-display text-base font-bold text-[#142D42]">
                    {selectedFinding.description}
                  </h3>
                  <p className="text-xs text-slate-600">
                    <strong>Rekomendasi Perbaikan:</strong>{' '}
                    {selectedFinding.recommendation || '-'} · Target Penyelesaian:{' '}
                    <span className="font-mono font-semibold">{selectedFinding.due_date}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFindingId(null);
                    setFeedback(null);
                  }}
                  className="rounded-lg border border-slate-300 p-1.5 text-slate-500 hover:text-[#142D42] cursor-pointer"
                  aria-label="Tutup form tindak lanjut"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {feedback && (
                <div
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-medium ${
                    feedback.type === 'ok'
                      ? 'border-[#238C89]/40 bg-[#E5F3EF] text-[#142D42]'
                      : 'border-[#D9534F]/40 bg-[#D9534F]/5 text-[#D9534F]'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{feedback.text}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#142D42] mb-1">
                    Akar Penyebab Masalah
                  </label>
                  <textarea
                    rows={2}
                    value={followUpForm.root_cause}
                    onChange={(e) =>
                      setFollowUpForm((f) => ({ ...f, root_cause: e.target.value }))
                    }
                    placeholder="Jelaskan penyebab terjadinya ketidaksesuaian..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#142D42] mb-1">
                      Tindakan Perbaikan yang Dilakukan
                    </label>
                    <textarea
                      rows={3}
                      value={followUpForm.corrective_action}
                      onChange={(e) =>
                        setFollowUpForm((f) => ({ ...f, corrective_action: e.target.value }))
                      }
                      placeholder="Langkah perbaikan langsung yang telah atau sedang dikerjakan..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#142D42] mb-1">
                      Langkah Pencegahan Agar Tidak Berulang
                    </label>
                    <textarea
                      rows={3}
                      value={followUpForm.preventive_action}
                      onChange={(e) =>
                        setFollowUpForm((f) => ({ ...f, preventive_action: e.target.value }))
                      }
                      placeholder="Langkah antisipasi ke depan..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Penanggung Jawab (PIC)
                    </label>
                    <input
                      type="text"
                      value={followUpForm.responsible_person}
                      onChange={(e) =>
                        setFollowUpForm((f) => ({ ...f, responsible_person: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Kebutuhan Sarana / Sumber Daya
                    </label>
                    <input
                      type="text"
                      value={followUpForm.resources_needed}
                      onChange={(e) =>
                        setFollowUpForm((f) => ({ ...f, resources_needed: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Tanggal Pelaksanaan Perbaikan
                    </label>
                    <input
                      type="date"
                      value={followUpForm.execution_date}
                      onChange={(e) =>
                        setFollowUpForm((f) => ({ ...f, execution_date: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-medium text-[#243447] hover:bg-slate-100 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploading ? 'Mengunggah...' : 'Unggah Foto Bukti Perbaikan'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                      />
                    </label>
                    {followUpForm.evidence_url && (
                      <a
                        href={followUpForm.evidence_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[#238C89] underline"
                      >
                        Lihat Foto Bukti Perbaikan
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSubmitFollowUp(false)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-[#243447] hover:bg-slate-50 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Dalam Proses</span>
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSubmitFollowUp(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#238C89] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1d7875] cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simpan &amp; Tandai Selesai Diperbaiki</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Table of Items Needing Follow-Up */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-bold text-[#142D42]">
                Daftar Ketidaksesuaian &amp; Tindak Lanjut Perbaikan
              </h3>
              <span className="text-xs text-slate-500">
                Klik &ldquo;Tindak Lanjuti&rdquo; untuk mengisi perbaikan atau &ldquo;Hapus&rdquo; untuk menghapus data
              </span>
            </div>
            {listMessage && (
              <div
                className={`mx-5 mt-3 flex items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-xs font-medium ${
                  listMessage.type === 'ok'
                    ? 'border-[#238C89]/40 bg-[#E5F3EF] text-[#142D42]'
                    : 'border-[#D9534F]/40 bg-[#D9534F]/5 text-[#D9534F]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{listMessage.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setListMessage(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-3 px-4">Unit &amp; Kategori</th>
                    <th className="py-3 px-4">Hal yang Perlu Diperbaiki &amp; Rekomendasi</th>
                    <th className="py-3 px-4">Risiko</th>
                    <th className="py-3 px-4">Batas Waktu</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Tindak Lanjut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredFindings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Tidak ada item perbaikan pada filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredFindings.map((f) => {
                      const isSelected = selectedFindingId === f.id;
                      return (
                        <tr
                          key={f.id}
                          className={`align-top transition-colors ${
                            isSelected ? 'bg-[#E5F3EF]/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <p className="font-semibold text-[#142D42]">{f.unit_name}</p>
                            <p className="text-[11px] text-slate-500">
                              {f.category_name} · <span className="font-mono">{f.finding_number}</span>
                            </p>
                          </td>
                          <td className="py-3 px-4 max-w-md">
                            <p className="font-medium text-[#243447]">{f.description}</p>
                            {f.recommendation && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Rekomendasi: {f.recommendation}
                              </p>
                            )}
                            {f.latest_follow_up?.corrective_action && (
                              <p className="text-[11px] text-[#238C89] mt-1">
                                Tindakan Perbaikan: {f.latest_follow_up.corrective_action}
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
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedFindingId(isSelected ? null : f.id);
                                  setFeedback(null);
                                }}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#142D42] text-white'
                                    : 'bg-[#238C89] text-white hover:bg-[#1d7875]'
                                }`}
                              >
                                <Wrench className="w-3.5 h-3.5" />
                                <span>
                                  {isSelected
                                    ? 'Sedang Dibuka'
                                    : f.status === 'Selesai'
                                      ? 'Lihat / Edit Perbaikan'
                                      : 'Tindak Lanjuti'}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingFinding(f)}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#D9534F]/30 bg-[#D9534F]/10 hover:bg-[#D9534F] text-[#D9534F] hover:text-white px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
                                title={`Hapus data ${f.finding_number}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        /* Monitoring Hasil Penginputan Supervisi */
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h3 className="font-display text-sm font-bold text-[#142D42]">
              Daftar Hasil Penginputan Supervisi Unit
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">No. Supervisi</th>
                  <th className="py-3 px-4">Unit Pelayanan</th>
                  <th className="py-3 px-4">Periode &amp; Instrumen</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4 text-right">Skor Mutu</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSupervisions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-semibold text-[#142D42]">
                      {s.supervision_number}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#243447]">{s.unit_name}</p>
                      <p className="text-[11px] text-slate-500">{s.unit_category}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-[#243447]">{s.period_name}</p>
                      <p className="text-[11px] text-slate-500">
                        {s.instrument_name} (v{s.instrument_version})
                      </p>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {s.supervision_date.slice(0, 10)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#142D42] tabular-nums">
                      {Number(s.total_score).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4">
                      <SupervisionStatusIndicator status={s.status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() => openSupervisionDetail(s.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#245A78] hover:underline cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                      {canInput && s.status !== 'Final' && (
                        <button
                          type="button"
                          onClick={() => onResumeSupervision(s.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#238C89] hover:underline cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Lanjutkan Input</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Detail Supervision Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full max-h-[88vh] overflow-y-auto p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
              <div>
                <p className="font-mono text-xs font-bold text-[#238C89]">
                  {selectedDetail.supervision_number}
                </p>
                <h3 className="font-display text-lg font-bold text-[#142D42]">
                  {selectedDetail.unit_name} — {selectedDetail.period_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Supervisor: {selectedDetail.supervisor_name} · Skor Akhir:{' '}
                  <strong className="text-[#142D42]">
                    {Number(selectedDetail.total_score).toFixed(1)}%
                  </strong>
                </p>
              </div>
              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDetail(null)}
                  className="rounded-lg border border-slate-300 p-1.5 text-slate-500 hover:text-[#142D42] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {selectedDetail.notes && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-[#243447]">
                <strong>Catatan Keseluruhan:</strong> {selectedDetail.notes}
              </div>
            )}

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {(selectedDetail.answers || []).map((a, idx) => (
                <div key={a.instrument_item_id || idx} className="p-3.5 text-xs space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] text-slate-500">{a.category_name_snapshot}</p>
                      <p className="font-semibold text-[#142D42]">{a.item_name_snapshot}</p>
                    </div>
                    <span
                      className={`font-bold shrink-0 ${
                        a.answer === 'Sesuai'
                          ? 'text-emerald-700'
                          : a.answer === 'Tidak Sesuai'
                            ? 'text-[#D9534F]'
                            : 'text-slate-500'
                      }`}
                    >
                      {a.answer || 'Belum Diisi'}
                    </span>
                  </div>
                  {a.notes && <p className="text-slate-600">Catatan: {a.notes}</p>}
                  {a.recommendation && (
                    <p className="text-[#B87A14]">Rekomendasi Perbaikan: {a.recommendation}</p>
                  )}
                  {a.evidence_url && (
                    <a
                      href={a.evidence_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-[#238C89] underline"
                    >
                      Lihat Foto Dokumentasi
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi Hapus Data Ketidaksesuaian & Tindak Lanjut Perbaikan */}
      {deletingFinding && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#D9534F]/10 text-[#D9534F] flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-[#142D42]">
                    Hapus Data Ketidaksesuaian &amp; Tindak Lanjut
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {deletingFinding.finding_number} · {deletingFinding.unit_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingFinding(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p>
                Apakah Anda yakin ingin menghapus data ketidaksesuaian dan riwayat tindak lanjut
                perbaikan berikut dari database Supabase?
              </p>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1">
                <p className="font-semibold text-[#142D42]">
                  {deletingFinding.unit_name} ({deletingFinding.category_name})
                </p>
                <p className="text-slate-600">{deletingFinding.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deletingBusy}
                onClick={() => setDeletingFinding(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingBusy}
                onClick={handleConfirmDeleteFinding}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#D9534F] hover:bg-[#c0392b] disabled:opacity-60 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingBusy ? 'Menghapus...' : 'Ya, Hapus Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
