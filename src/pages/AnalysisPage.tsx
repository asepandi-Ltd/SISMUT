import { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Sparkles, TrendingUp, TrendingDown, Edit3, Check } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import { canManageMasterData } from '../lib/permissions';
import type { SupervisionPeriod } from '../types/sismut';

interface AnalysisPageProps {
  mode: 'charts' | 'evaluation';
  editableRecommendations: string[];
  onSaveRecommendations: (recs: string[]) => void;
}

export function AnalysisPage({
  mode,
  editableRecommendations,
  onSaveRecommendations,
}: AnalysisPageProps) {
  const { user } = useAuth();
  const { revision } = useRealtime();
  const [periods, setPeriods] = useState<SupervisionPeriod[]>([]);
  const [periodId, setPeriodId] = useState('ALL');
  const [summary, setSummary] = useState<any>(null);
  const [narrative, setNarrative] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [editingRecs, setEditingRecs] = useState(false);
  const [draftRecs, setDraftRecs] = useState<string[]>(editableRecommendations);

  const loadData = useCallback(async () => {
    const [p, s] = await Promise.all([api.getPeriods(), api.getAnalysisSummary(periodId)]);
    setPeriods(p);
    setSummary(s);
  }, [periodId]);

  useEffect(() => {
    loadData();
  }, [loadData, revision]);

  useEffect(() => {
    setDraftRecs(editableRecommendations);
  }, [editableRecommendations]);

  const handleGenerateNarrative = async () => {
    setGenerating(true);
    try {
      const res = await api.generateAnalysisNarrative(periodId);
      setNarrative(res.executive_summary);
      if (editableRecommendations.length === 0 && res.priority_recommendations.length > 0) {
        onSaveRecommendations(res.priority_recommendations);
        setDraftRecs(res.priority_recommendations);
      }
    } finally {
      setGenerating(false);
    }
  };

  const canEditRecs = user ? canManageMasterData(user.role) : false;

  if (!summary) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-400">
        Memuat analisis data mutu aktual...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector & Narrative Trigger */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-[#142D42]">Periode Evaluasi:</label>
          <select
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
          >
            <option value="ALL">Seluruh Periode (Komparatif)</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.period_name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={generating}
          onClick={handleGenerateNarrative}
          className="inline-flex items-center gap-2 rounded-lg bg-[#238C89] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1d7875] disabled:opacity-60 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>
            {generating ? 'Menyusun Analisis dari Data Aktual...' : 'Hasilkan Narasi Evaluasi Mutu'}
          </span>
        </button>
      </section>

      {/* Auto Descriptive Analysis Narrative */}
      {(narrative || mode === 'evaluation') && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h2 className="font-display text-sm font-bold text-[#142D42]">
            Ringkasan Analisis Deskriptif Berbasis Data Aktual
          </h2>
          {narrative ? (
            <p className="text-sm text-[#243447] leading-relaxed">{narrative}</p>
          ) : (
            <p className="text-xs text-slate-500">
              Klik tombol &ldquo;Hasilkan Narasi Evaluasi Mutu&rdquo; untuk menyusun ringkasan
              otomatis yang tervalidasi langsung dari angka database supervisi RSUD Al-Mulk.
            </p>
          )}
        </section>
      )}

      {/* Charts: Unit Comparison + Period Comparison */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-display text-sm font-bold text-[#142D42] mb-1">
            Perbandingan Capaian Nilai Antarunit
          </h3>
          <p className="text-xs text-slate-500 mb-4">Skor mutu rata-rata (%) per unit pelayanan</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.unitScores}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="unit_name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => [`${val ?? 0}%`, 'Skor Rata-Rata']} />
                <Bar dataKey="avg_score" fill="#142D42" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-display text-sm font-bold text-[#142D42] mb-1">
            Perbandingan Hasil Antarperiode
          </h3>
          <p className="text-xs text-slate-500 mb-4">Tren capaian mutu lintas siklus supervisi</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.periodComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="period_name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => [`${val ?? 0}%`, 'Rata-Rata Periode']} />
                <Bar dataKey="avg_score" fill="#238C89" radius={[4, 4, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Indicators with Highest Non-Compliance + Resolution Velocity + Unit Trends */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-[#142D42]">
            Indikator dengan Ketidaksesuaian Tertinggi (Masalah Berulang)
          </h3>
          {summary.topFailedIndicators.length === 0 ? (
            <p className="text-xs text-slate-400">Belum ada indikator tidak sesuai.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {summary.topFailedIndicators.map((ind: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#243447]">{ind.item_name}</p>
                    <p className="text-[11px] text-slate-500">{ind.category_name}</p>
                  </div>
                  <span className="font-mono font-bold text-[#D9534F] shrink-0 tabular-nums">
                    {ind.non_compliant_count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 space-y-6">
          {/* Resolution Velocity & Risk Distribution */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">Kecepatan Penyelesaian RTL</p>
              <p className="font-mono text-2xl font-bold text-[#142D42] mt-1 tabular-nums">
                {summary.resolutionStats?.avg_days ?? 0} hari
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Rata-rata durasi penutupan temuan selesai
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Distribusi Tingkat Risiko</p>
              <div className="mt-1.5 space-y-1 text-xs">
                {(summary.findingByRisk || []).map((r: any) => (
                  <div key={r.risk_level} className="flex justify-between">
                    <span className="text-slate-600">{r.risk_level}</span>
                    <span className="font-mono font-bold text-[#142D42] tabular-nums">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Unit Improvement / Decline Deltas */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h3 className="font-display text-sm font-bold text-[#142D42]">
              Unit Mengalami Peningkatan / Penurunan Mutu
            </h3>
            {summary.unitTrends.length === 0 ? (
              <p className="text-xs text-slate-400">
                Memerlukan minimal 2 periode supervisi untuk perbandingan tren per unit.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {summary.unitTrends.map((t: any) => (
                  <div key={t.unit_name} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#142D42]">{t.unit_name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {t.previous_score}% ({t.previous_period}) → {t.current_score}% ({t.current_period})
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 font-mono font-bold tabular-nums ${
                        t.delta >= 0 ? 'text-emerald-700' : 'text-[#D9534F]'
                      }`}
                    >
                      {t.delta >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      {t.delta >= 0 ? `+${t.delta}%` : `${t.delta}%`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Editable Priority Recommendations for Official Reports */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-[#142D42]">
              Rekomendasi Prioritas Perbaikan (Masuk ke Laporan Resmi)
            </h3>
            <p className="text-xs text-slate-500">
              Admin Mutu dapat menyunting butir rekomendasi sebelum dicetak ke laporan PDF/Excel
            </p>
          </div>
          {canEditRecs && (
            <button
              type="button"
              onClick={() => {
                if (editingRecs) {
                  onSaveRecommendations(draftRecs.filter((r) => r.trim() !== ''));
                }
                setEditingRecs((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#142D42] hover:bg-slate-50 cursor-pointer"
            >
              {editingRecs ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#238C89]" />
                  <span>Simpan Rekomendasi</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Rekomendasi</span>
                </>
              )}
            </button>
          )}
        </div>

        {editingRecs ? (
          <div className="space-y-2">
            {draftRecs.map((rec, idx) => (
              <input
                key={idx}
                type="text"
                value={rec}
                onChange={(e) => {
                  const copy = [...draftRecs];
                  copy[idx] = e.target.value;
                  setDraftRecs(copy);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            ))}
            <button
              type="button"
              onClick={() => setDraftRecs((prev) => [...prev, ''])}
              className="text-xs font-semibold text-[#238C89] hover:underline cursor-pointer"
            >
              + Tambah Butir Rekomendasi
            </button>
          </div>
        ) : (
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-[#243447]">
            {editableRecommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
