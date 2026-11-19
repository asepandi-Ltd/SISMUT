import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Save,
  Lock,
  Printer,
  Upload,
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { calculateSupervisionScore, getScorePredicate } from '../lib/scoring';
import { RISK_LEVELS } from '../lib/permissions';
import type {
  AnswerOption,
  Instrument,
  RiskLevel,
  Supervision,
  SupervisionAnswer,
  SupervisionPeriod,
  SupervisionSchedule,
  Unit,
} from '../types/sismut';

interface SupervisionFormPageProps {
  initialSchedule?: SupervisionSchedule | null;
  draftSupervisionId?: string | null;
  onDone: () => void;
}

export function SupervisionFormPage({
  initialSchedule,
  draftSupervisionId,
  onDone,
}: SupervisionFormPageProps) {
  const { user } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [periods, setPeriods] = useState<SupervisionPeriod[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [drafts, setDrafts] = useState<Supervision[]>([]);

  const [editingId, setEditingId] = useState<string | null>(draftSupervisionId || null);
  const [scheduleId, setScheduleId] = useState<string | null>(initialSchedule?.id || null);
  const [periodId, setPeriodId] = useState(initialSchedule?.period_id || '');
  const [unitId, setUnitId] = useState(initialSchedule?.unit_id || '');
  const [instrumentId, setInstrumentId] = useState(initialSchedule?.instrument_id || '');
  const [supervisionDate, setSupervisionDate] = useState(new Date().toISOString().slice(0, 16));
  const [teamMembers, setTeamMembers] = useState(
    initialSchedule?.team_members || user?.full_name || ''
  );
  const [notes, setNotes] = useState('');
  const [answers, setAnswers] = useState<Record<string, SupervisionAnswer>>({});

  const [uploadingItem, setUploadingItem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadReferenceData = useCallback(async () => {
    const [u, p, i, sups] = await Promise.all([
      api.getUnits(),
      api.getPeriods(),
      api.getInstruments(),
      api.getSupervisions(),
    ]);
    const activeUnits = u.filter((x) => x.is_active);
    const activeInst = i.filter((x) => x.is_active);
    setUnits(activeUnits);
    setPeriods(p);
    setInstruments(activeInst);
    setDrafts(sups.filter((s) => s.status !== 'Final'));

    if (!initialSchedule && !draftSupervisionId) {
      setPeriodId((prev) => prev || p.find((x) => x.status === 'Aktif')?.id || p[0]?.id || '');
      setUnitId((prev) => prev || activeUnits[0]?.id || '');
      setInstrumentId((prev) => prev || activeInst[0]?.id || '');
    }
  }, [initialSchedule, draftSupervisionId]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  // Load existing draft if requested
  const loadDraftById = useCallback(async (id: string) => {
    const detail = await api.getSupervisionDetail(id);
    setEditingId(detail.id);
    setScheduleId(detail.schedule_id || null);
    setPeriodId(detail.period_id);
    setUnitId(detail.unit_id);
    setInstrumentId(detail.instrument_id);
    setSupervisionDate(detail.supervision_date.slice(0, 16));
    setTeamMembers(detail.team_members || '');
    setNotes(detail.notes || '');
    const map: Record<string, SupervisionAnswer> = {};
    for (const a of detail.answers || []) {
      map[a.instrument_item_id] = { ...a, risk_level: a.risk_level || 'Sedang' };
    }
    setAnswers(map);
  }, []);

  useEffect(() => {
    if (draftSupervisionId) {
      loadDraftById(draftSupervisionId);
    }
  }, [draftSupervisionId, loadDraftById]);

  const selectedInstrument = useMemo(
    () => instruments.find((i) => i.id === instrumentId) || null,
    [instruments, instrumentId]
  );

  // Sync checklist answers structure whenever instrument changes (preserving already entered values)
  useEffect(() => {
    if (!selectedInstrument) return;
    setAnswers((prev) => {
      const next: Record<string, SupervisionAnswer> = {};
      for (const cat of selectedInstrument.categories || []) {
        for (const it of cat.items || []) {
          if (!it.is_active) continue;
          next[it.id] = prev[it.id] || {
            instrument_item_id: it.id,
            item_name_snapshot: it.item_name,
            category_name_snapshot: cat.category_name,
            weight_snapshot: it.weight,
            answer: null,
            notes: '',
            supporting_evidence: '',
            evidence_url: '',
            recommendation: '',
            risk_level: 'Sedang',
          };
        }
      }
      return next;
    });
  }, [selectedInstrument]);

  const answerArray = useMemo(() => Object.values(answers), [answers]);
  const scoreSummary = useMemo(
    () => calculateSupervisionScore(answerArray, selectedInstrument?.is_weighted ?? true),
    [answerArray, selectedInstrument]
  );
  const predicate = getScorePredicate(scoreSummary.totalScore);

  const updateAnswer = (itemId: string, patch: Partial<SupervisionAnswer>) => {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        ...patch,
      },
    }));
  };

  const handlePhotoUpload = async (itemId: string, file: File | undefined) => {
    if (!file) return;
    setUploadingItem(itemId);
    try {
      const url = await api.uploadEvidence(file, 'supervision-evidence');
      updateAnswer(itemId, { evidence_url: url });
    } catch (err: unknown) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal mengunggah foto bukti.',
      });
    } finally {
      setUploadingItem(null);
    }
  };

  const handleSaveSupervision = async (
    targetStatus: 'Sedang Diperiksa' | 'Sudah Diperiksa' | 'Final'
  ) => {
    setFeedback(null);
    if (!unitId || !periodId || !instrumentId) {
      setFeedback({ type: 'err', text: 'Pilih periode, unit, dan instrumen supervisi terlebih dahulu.' });
      return;
    }

    if (targetStatus === 'Final' && scoreSummary.unansweredCount > 0) {
      setFeedback({
        type: 'err',
        text: `Masih terdapat ${scoreSummary.unansweredCount} indikator yang belum diisi. Lengkapi checklist (Sesuai / Tidak Sesuai / N/A) sebelum finalisasi.`,
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        schedule_id: scheduleId,
        unit_id: unitId,
        period_id: periodId,
        instrument_id: instrumentId,
        supervision_date: supervisionDate,
        team_members: teamMembers,
        status: targetStatus,
        notes,
        generate_findings: targetStatus === 'Final' || targetStatus === 'Sudah Diperiksa',
        answers: answerArray,
      };

      const saved = editingId
        ? await api.updateSupervision(editingId, payload)
        : await api.createSupervision(payload);

      setEditingId(saved.id);
      setFeedback({
        type: 'ok',
        text:
          targetStatus === 'Final'
            ? `Supervisi ${saved.supervision_number} telah selesai (${scoreSummary.totalScore.toFixed(1)}%). Indikator yang perlu diperbaiki otomatis masuk ke Monitoring & Tindak Lanjut.`
            : `Pemeriksaan berhasil disimpan sebagai ${targetStatus} (${saved.supervision_number}).`,
      });
      await loadReferenceData();
      if (targetStatus === 'Final' || targetStatus === 'Sudah Diperiksa') {
        setTimeout(() => onDone(), 900);
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menyimpan hasil supervisi.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Resume Draft Picker */}
      {drafts.length > 0 && !editingId && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#142D42]">
            <FileText className="w-4 h-4 text-[#238C89]" />
            <span className="font-semibold">Lanjutkan Pemeriksaan Draft ({drafts.length}):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {drafts.slice(0, 4).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => loadDraftById(d.id)}
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-[#243447] hover:bg-[#E5F3EF] cursor-pointer"
              >
                {d.supervision_number} · {d.unit_name} ({d.status})
              </button>
            ))}
          </div>
        </div>
      )}

      {feedback && (
        <div
          role="alert"
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-medium ${
            feedback.type === 'ok'
              ? 'border-[#238C89]/40 bg-[#E5F3EF] text-[#142D42]'
              : 'border-[#D9534F]/40 bg-[#D9534F]/5 text-[#D9534F]'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Header Metadata Form */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div>
            <h2 className="font-display text-sm font-bold text-[#142D42]">
              Identitas Pelaksanaan Supervisi Lapangan
            </h2>
            <p className="text-xs text-slate-500">
              {editingId ? 'Melanjutkan pengisian draft pemeriksaan' : 'Buat pemeriksaan unit baru'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-500">Estimasi Skor Berjalan</p>
            <p className="font-mono text-2xl font-bold text-[#142D42] tabular-nums">
              {scoreSummary.totalScore.toFixed(1)}%
            </p>
            <p className="text-[11px] font-medium text-[#238C89]">
              {scoreSummary.compliantCount}/{scoreSummary.applicableCount} indikator berlaku ·{' '}
              {scoreSummary.naCount} N/A · {predicate.label}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Periode Supervisi</label>
            <select
              disabled={Boolean(editingId)}
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs disabled:bg-slate-100"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.period_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Unit yang Diperiksa</label>
            <select
              disabled={Boolean(editingId)}
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs disabled:bg-slate-100"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.unit_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal &amp; Waktu</label>
            <input
              type="datetime-local"
              value={supervisionDate}
              onChange={(e) => setSupervisionDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Supervisor / Tim Pemeriksa</label>
            <input
              type="text"
              value={teamMembers}
              onChange={(e) => setTeamMembers(e.target.value)}
              placeholder="Nama supervisor & anggota tim"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </div>
        </div>
      </section>

      {/* Checklist Categories & Indicators */}
      {selectedInstrument && (
        <div className="space-y-5">
          {(selectedInstrument.categories || []).map((cat, cIdx) => (
            <section key={cat.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-[#142D42] text-white px-5 py-3">
                <h3 className="font-display text-sm font-bold">
                  {cIdx + 1}. {cat.category_name}
                </h3>
              </div>

              <div className="divide-y divide-slate-200">
                {(cat.items || [])
                  .filter((it) => it.is_active)
                  .map((it, iIdx) => {
                    const ansState = answers[it.id];
                    const currentAns: AnswerOption = ansState?.answer ?? null;

                    return (
                      <div key={it.id} className="p-5 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex-1 min-w-[260px]">
                            <p className="text-sm font-semibold text-[#142D42]">
                              {cIdx + 1}.{iIdx + 1} {it.item_name}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">{it.standard_description}</p>
                            <p className="text-[11px] font-mono text-[#245A78] mt-1">
                              Bobot Penilaian: {it.weight}
                            </p>
                          </div>

                          {/* Checklist Radio Buttons */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateAnswer(it.id, { answer: 'Sesuai' })}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold border transition-colors cursor-pointer ${
                                currentAns === 'Sesuai'
                                  ? 'bg-[#238C89] border-[#238C89] text-white'
                                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Sesuai</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => updateAnswer(it.id, { answer: 'Tidak Sesuai' })}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold border transition-colors cursor-pointer ${
                                currentAns === 'Tidak Sesuai'
                                  ? 'bg-[#D9534F] border-[#D9534F] text-white'
                                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Tidak Sesuai</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => updateAnswer(it.id, { answer: 'N/A' })}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold border transition-colors cursor-pointer ${
                                currentAns === 'N/A'
                                  ? 'bg-slate-700 border-slate-700 text-white'
                                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <MinusCircle className="w-3.5 h-3.5" />
                              <span>Tidak Berlaku (N/A)</span>
                            </button>
                          </div>
                        </div>

                        {/* Notes, Supporting Evidence, Photo Upload, Recommendation */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                          <input
                            type="text"
                            value={ansState?.notes || ''}
                            onChange={(e) => updateAnswer(it.id, { notes: e.target.value })}
                            placeholder={
                              currentAns === 'Tidak Sesuai'
                                ? 'Deskripsi temuan ketidaksesuaian (wajib jelas)...'
                                : 'Catatan supervisor...'
                            }
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                          />
                          <input
                            type="text"
                            value={ansState?.supporting_evidence || ''}
                            onChange={(e) =>
                              updateAnswer(it.id, { supporting_evidence: e.target.value })
                            }
                            placeholder="Bukti pendukung (observasi/dokumen/wawancara)..."
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                          />
                          <div className="flex items-center gap-2">
                            <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-[#243447] hover:bg-slate-100 cursor-pointer shrink-0">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{uploadingItem === it.id ? 'Mengunggah...' : 'Foto Bukti'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handlePhotoUpload(it.id, e.target.files?.[0])}
                              />
                            </label>
                            {ansState?.evidence_url && (
                              <a
                                href={ansState.evidence_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-medium text-[#238C89] underline truncate"
                              >
                                Lihat Foto Terunggah
                              </a>
                            )}
                          </div>
                        </div>

                        {currentAns === 'Tidak Sesuai' && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#D9534F]/5 border border-[#D9534F]/20 rounded-lg p-3">
                            <div className="md:col-span-2">
                              <label className="block text-[11px] font-semibold text-[#D9534F] mb-1">
                                Rekomendasi Perbaikan Supervisor
                              </label>
                              <input
                                type="text"
                                value={ansState?.recommendation || ''}
                                onChange={(e) =>
                                  updateAnswer(it.id, { recommendation: e.target.value })
                                }
                                placeholder="Tuliskan rekomendasi tindak lanjut untuk unit..."
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#D9534F] mb-1">
                                Tingkat Risiko (Penetapan Petugas)
                              </label>
                              <select
                                value={ansState?.risk_level || 'Sedang'}
                                onChange={(e) =>
                                  updateAnswer(it.id, { risk_level: e.target.value as RiskLevel })
                                }
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                              >
                                {RISK_LEVELS.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Overall Notes & Sticky Action Bar */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#142D42] mb-1.5">
            Catatan Keseluruhan Supervisi Unit
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ringkasan hasil observasi lapangan, apresiasi, atau catatan strategis..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            Indikator belum diisi:{' '}
            <span className="font-mono font-bold text-[#142D42]">
              {scoreSummary.unansweredCount}
            </span>{' '}
            (tidak dihitung sebagai sesuai)
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveSupervision('Sedang Diperiksa')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#243447] hover:bg-slate-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Draft</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveSupervision('Sudah Diperiksa')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#245A78] px-4 py-2 text-xs font-semibold text-white hover:bg-[#142D42] cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Hasil</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveSupervision('Final')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#238C89] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1d7875] cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Finalisasi Supervisi</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer no-print"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Hasil</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
