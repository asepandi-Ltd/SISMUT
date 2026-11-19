import { useEffect, useState, useCallback } from 'react';
import { Upload, CheckCircle2, Save, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import { FindingStatusIndicator, RiskIndicator } from '../components/StatusText';
import type { Finding } from '../types/sismut';

interface FollowUpPageProps {
  preselectedFindingId?: string | null;
}

export function FollowUpPage({ preselectedFindingId }: FollowUpPageProps) {
  const { user } = useAuth();
  const { revision } = useRealtime();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [filterMode, setFilterMode] = useState<'open' | 'all'>('open');
  const [selectedId, setSelectedId] = useState<string | null>(preselectedFindingId || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [form, setForm] = useState({
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
    const data = await api.getFindings();
    setFindings(data);
    setSelectedId(
      (prev) =>
        preselectedFindingId ||
        prev ||
        data.find((f) => f.status !== 'Selesai')?.id ||
        data[0]?.id ||
        null
    );
  }, [preselectedFindingId]);

  useEffect(() => {
    loadData();
  }, [loadData, revision]);

  const visibleList = findings.filter((f) =>
    filterMode === 'open' ? f.status !== 'Selesai' : true
  );

  const selected = findings.find((f) => f.id === selectedId) || null;

  useEffect(() => {
    if (!selected) return;
    const fu = selected.latest_follow_up;
    setForm({
      root_cause: fu?.root_cause || '',
      corrective_action: fu?.corrective_action || '',
      preventive_action: fu?.preventive_action || '',
      responsible_person: fu?.responsible_person || selected.pic_name || user?.full_name || '',
      resources_needed: fu?.resources_needed || '',
      target_date: fu?.target_date || selected.due_date || new Date().toISOString().slice(0, 10),
      execution_date: fu?.execution_date || new Date().toISOString().slice(0, 10),
      evidence_url: fu?.evidence_url || '',
    });
  }, [selected, user]);

  const handlePhotoUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await api.uploadEvidence(file, 'followup-evidence');
      setForm((f) => ({ ...f, evidence_url: url }));
    } catch (err: unknown) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal mengunggah bukti perbaikan.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (markCompleted: boolean) => {
    if (!selected) return;
    setFeedback(null);
    setSaving(true);
    try {
      await api.submitFollowUp({
        finding_id: selected.id,
        ...form,
        mark_completed: markCompleted,
      });
      await loadData();
      setFeedback({
        type: 'ok',
        text: markCompleted
          ? `Perbaikan untuk ${selected.finding_number} berhasil disimpan dan ditandai Selesai.`
          : `Progres tindak lanjut untuk ${selected.finding_number} disimpan sebagai Dalam Proses.`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menyimpan tindak lanjut.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left List of Items Needing Improvement */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-sm font-bold text-[#142D42]">
            Hal yang Perlu Diperbaiki
          </h2>
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setFilterMode('open')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer ${
                filterMode === 'open' ? 'bg-white text-[#142D42] shadow-sm' : 'text-slate-600'
              }`}
            >
              Belum Selesai
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer ${
                filterMode === 'all' ? 'bg-white text-[#142D42] shadow-sm' : 'text-slate-600'
              }`}
            >
              Semua
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
          {visibleList.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              Seluruh item perbaikan telah selesai ditindaklanjuti.
            </p>
          ) : (
            visibleList.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setSelectedId(f.id);
                  setFeedback(null);
                }}
                className={`w-full text-left py-3 px-3 -mx-1 rounded-lg transition-colors cursor-pointer ${
                  selected?.id === f.id ? 'bg-[#E5F3EF]/70' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-[#142D42]">
                    {f.unit_name}
                  </span>
                  <RiskIndicator level={f.risk_level} />
                </div>
                <p className="text-xs font-medium text-[#243447] mt-1 line-clamp-2">
                  {f.description}
                </p>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono">{f.finding_number}</span>
                  <FindingStatusIndicator status={f.status} dueDate={f.due_date} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Follow-Up Form */}
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        {!selected ? (
          <p className="text-xs text-slate-500 py-12 text-center">
            Pilih item yang perlu diperbaiki di sebelah kiri untuk mengisi tindak lanjut perbaikan.
          </p>
        ) : (
          <>
            <div className="border-b border-slate-200 pb-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-[#238C89]">
                  {selected.finding_number} · {selected.unit_name} ({selected.category_name})
                </span>
                <FindingStatusIndicator status={selected.status} dueDate={selected.due_date} />
              </div>
              <h3 className="font-display text-base font-bold text-[#142D42]">
                {selected.description}
              </h3>
              <p className="text-xs text-slate-600">
                <strong>Rekomendasi Perbaikan:</strong> {selected.recommendation || '-'} · Target
                Penyelesaian: <span className="font-mono font-semibold">{selected.due_date}</span>
              </p>
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
                  value={form.root_cause}
                  onChange={(e) => setForm((f) => ({ ...f, root_cause: e.target.value }))}
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
                    value={form.corrective_action}
                    onChange={(e) => setForm((f) => ({ ...f, corrective_action: e.target.value }))}
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
                    value={form.preventive_action}
                    onChange={(e) => setForm((f) => ({ ...f, preventive_action: e.target.value }))}
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
                    value={form.responsible_person}
                    onChange={(e) => setForm((f) => ({ ...f, responsible_person: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kebutuhan Sarana / Sumber Daya
                  </label>
                  <input
                    type="text"
                    value={form.resources_needed}
                    onChange={(e) => setForm((f) => ({ ...f, resources_needed: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tanggal Pelaksanaan Perbaikan
                  </label>
                  <input
                    type="date"
                    value={form.execution_date}
                    onChange={(e) => setForm((f) => ({ ...f, execution_date: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
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
                {form.evidence_url && (
                  <a
                    href={form.evidence_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-[#238C89] underline"
                  >
                    Lihat Foto Bukti Perbaikan
                  </a>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmit(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-[#243447] hover:bg-slate-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Dalam Proses</span>
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmit(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#238C89] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1d7875] cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan &amp; Tandai Selesai Diperbaiki</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
