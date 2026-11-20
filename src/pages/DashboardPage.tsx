import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Building2,
  ClipboardCheck,
  Award,
  AlertOctagon,
  Clock,
  CheckCircle2,
  ShieldAlert,
  TrendingUp,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import { useRealtime } from '../contexts/RealtimeContext';
import { useAuth } from '../contexts/AuthContext';
import { FindingStatusIndicator, RiskIndicator, SupervisionStatusIndicator } from '../components/StatusText';
import type {
  DashboardFilters,
  Finding,
  PageRoute,
  Supervision,
  Unit,
} from '../types/sismut';

const CHART_COLORS = ['#142D42', '#245A78', '#238C89', '#E6A23C', '#D9534F', '#64748B'];

interface DashboardPageProps {
  onNavigate: (route: PageRoute) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user } = useAuth();
  const { revision } = useRealtime();
  const [units, setUnits] = useState<Unit[]>([]);
  const [supervisions, setSupervisions] = useState<Supervision[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Supervision | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [filters, setFilters] = useState<DashboardFilters>({
    year: 'ALL',
    month: 'ALL',
    periodId: 'ALL',
    unitCategory: 'ALL',
    unitId: 'ALL',
    status: 'ALL',
  });

  const loadData = useCallback(async () => {
    try {
      const [u, s, f] = await Promise.all([
        api.getUnits(),
        api.getSupervisions(),
        api.getFindings(),
      ]);
      setUnits(u);
      setSupervisions(s);
      setFindings(f);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, revision]);

  const years = useMemo(() => {
    const set = new Set<string>();
    supervisions.forEach((s) => set.add(s.supervision_date.slice(0, 4)));
    if (set.size === 0) set.add('2026');
    return Array.from(set).sort().reverse();
  }, [supervisions]);

  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      if (filters.unitCategory !== 'ALL' && u.category !== filters.unitCategory) return false;
      if (filters.unitId !== 'ALL' && u.id !== filters.unitId) return false;
      return u.is_active;
    });
  }, [units, filters.unitCategory, filters.unitId]);

  const filteredSupervisions = useMemo(() => {
    return supervisions.filter((s) => {
      if (filters.year !== 'ALL' && !s.supervision_date.startsWith(filters.year)) return false;
      if (filters.month !== 'ALL' && s.supervision_date.slice(5, 7) !== filters.month) return false;
      if (filters.periodId !== 'ALL' && s.period_id !== filters.periodId) return false;
      if (filters.unitCategory !== 'ALL' && s.unit_category !== filters.unitCategory) return false;
      if (filters.unitId !== 'ALL' && s.unit_id !== filters.unitId) return false;
      if (filters.status !== 'ALL' && s.status !== filters.status) return false;
      return true;
    });
  }, [supervisions, filters]);

  const filteredFindings = useMemo(() => {
    const supIds = new Set(filteredSupervisions.map((s) => s.id));
    return findings.filter((f) => {
      if (filters.unitCategory !== 'ALL' && f.unit_category !== filters.unitCategory) return false;
      if (filters.unitId !== 'ALL' && f.unit_id !== filters.unitId) return false;
      if (
        (filters.year !== 'ALL' ||
          filters.month !== 'ALL' ||
          filters.periodId !== 'ALL' ||
          filters.status !== 'ALL') &&
        !supIds.has(f.supervision_id)
      ) {
        return false;
      }
      return true;
    });
  }, [findings, filteredSupervisions, filters]);

  // KPI Metrics
  const kpis = useMemo(() => {
    const totalRegisteredUnits = filteredUnits.length;
    const totalSupervisions = filteredSupervisions.length;
    const supervisedUnitsSet = new Set(filteredSupervisions.map((s) => s.unit_id));
    const totalSupervisedUnits = supervisedUnitsSet.size;
    const avgScore =
      totalSupervisions > 0
        ? filteredSupervisions.reduce((acc, s) => acc + Number(s.total_score || 0), 0) / totalSupervisions
        : 0;

    const totalFindings = filteredFindings.length;
    const notStartedFindings = filteredFindings.filter((f) => f.status === 'Belum Ditindaklanjuti').length;
    const inProgressFindings = filteredFindings.filter(
      (f) =>
        f.status === 'Dalam Proses' ||
        f.status === 'Menunggu Verifikasi' ||
        f.status === 'Perlu Perbaikan Ulang'
    ).length;
    const overdueFindings = filteredFindings.filter((f) => f.status === 'Terlambat').length;
    const completedFindings = filteredFindings.filter((f) => f.status === 'Selesai').length;
    const completionPct = totalFindings > 0 ? (completedFindings / totalFindings) * 100 : 0;

    return {
      totalRegisteredUnits,
      totalSupervisions,
      totalSupervisedUnits,
      avgScore,
      totalFindings,
      notStartedFindings,
      inProgressFindings,
      overdueFindings,
      completedFindings,
      completionPct,
    };
  }, [filteredUnits, filteredSupervisions, filteredFindings]);

  // 1. Unit Score Chart & Ranking
  const unitScoreRanking = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number; category: string }> = {};
    for (const s of filteredSupervisions) {
      if (!map[s.unit_id]) {
        map[s.unit_id] = {
          name: s.unit_name || 'Unit',
          total: 0,
          count: 0,
          category: s.unit_category || '',
        };
      }
      map[s.unit_id].total += Number(s.total_score || 0);
      map[s.unit_id].count += 1;
    }
    return Object.entries(map)
      .map(([id, v]) => ({
        unitId: id,
        unit: v.name,
        category: v.category,
        score: Math.round((v.total / v.count) * 100) / 100,
        count: v.count,
      }))
      .sort((a, b) => b.score - a.score);
  }, [filteredSupervisions]);

  // 2. Monthly Trend Chart
  const monthlyTrend = useMemo(() => {
    const map: Record<string, { month: string; total: number; count: number }> = {};
    for (const s of filteredSupervisions) {
      const ym = s.supervision_date.slice(0, 7);
      if (!map[ym]) map[ym] = { month: ym, total: 0, count: 0 };
      map[ym].total += Number(s.total_score || 0);
      map[ym].count += 1;
    }
    return Object.values(map)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({
        bulan: m.month,
        skor: Math.round((m.total / m.count) * 100) / 100,
        jumlah: m.count,
      }));
  }, [filteredSupervisions]);

  // 3. Findings by Category
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of filteredFindings) {
      const key = f.category_name || 'Lainnya';
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredFindings]);

  // 4. RTL Status Breakdown
  const rtlBreakdown = useMemo(() => {
    const map: Record<string, number> = {
      Selesai: 0,
      'Menunggu Verifikasi': 0,
      'Dalam Proses': 0,
      'Belum Ditindaklanjuti': 0,
      'Perlu Perbaikan Ulang': 0,
      Terlambat: 0,
    };
    for (const f of filteredFindings) {
      map[f.status] = (map[f.status] || 0) + 1;
    }
    return Object.entries(map)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({ status, count }));
  }, [filteredFindings]);

  // Priority High & Critical Findings
  const urgentFindings = useMemo(() => {
    return filteredFindings.filter(
      (f) => f.status !== 'Selesai' && (f.risk_level === 'Kritis' || f.risk_level === 'Tinggi')
    );
  }, [filteredFindings]);

  const openFindings = useMemo(() => {
    return filteredFindings.filter((f) => f.status !== 'Selesai').slice(0, 8);
  }, [filteredFindings]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-xl border border-slate-200 bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <section className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-display text-sm font-bold text-[#142D42]">
            Filter Data Eksekutif
          </h2>
          <button
            type="button"
            onClick={() =>
              setFilters({
                year: 'ALL',
                month: 'ALL',
                periodId: 'ALL',
                unitCategory: 'ALL',
                unitId: 'ALL',
                status: 'ALL',
              })
            }
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#245A78] hover:text-[#142D42] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filter</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            aria-label="Filter Tahun"
            value={filters.year}
            onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-[#243447] focus:border-[#245A78] focus:outline-none"
          >
            <option value="ALL">Semua Tahun</option>
            {years.map((y) => (
              <option key={y} value={y}>
                Tahun {y}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter Bulan"
            value={filters.month}
            onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-[#243447] focus:border-[#245A78] focus:outline-none"
          >
            <option value="ALL">Semua Bulan</option>
            {[
              ['01', 'Januari'],
              ['02', 'Februari'],
              ['03', 'Maret'],
              ['04', 'April'],
              ['05', 'Mei'],
              ['06', 'Juni'],
              ['07', 'Juli'],
              ['08', 'Agustus'],
              ['09', 'September'],
              ['10', 'Oktober'],
              ['11', 'November'],
              ['12', 'Desember'],
            ].map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter Nama Unit"
            value={filters.unitId}
            onChange={(e) => setFilters((f) => ({ ...f, unitId: e.target.value }))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-[#243447] focus:border-[#245A78] focus:outline-none"
          >
            <option value="ALL">Semua Unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.unit_name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter Status Supervisi"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-[#243447] focus:border-[#245A78] focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="Belum Diperiksa">Belum Diperiksa</option>
            <option value="Sedang Diperiksa">Sedang Diperiksa</option>
            <option value="Sudah Diperiksa">Sudah Diperiksa</option>
            <option value="Final">Final</option>
          </select>
        </div>
      </section>

      {/* High/Critical Risk Executive Attention Banner */}
      {urgentFindings.length > 0 && (
        <section className="bg-white border border-[#D9534F]/40 rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[#D9534F] mt-0.5 shrink-0" />
              <div>
                <h2 className="font-display text-sm font-bold text-[#142D42]">
                  Perhatian Khusus: {urgentFindings.length} Temuan Risiko Tinggi / Kritis Aktif
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {urgentFindings
                    .slice(0, 2)
                    .map((u) => `${u.finding_number} (${u.unit_name} · ${u.risk_level})`)
                    .join(' · ')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('findings')}
              className="rounded-lg bg-[#D9534F] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#c24440] transition-colors whitespace-nowrap cursor-pointer"
            >
              Tinjau Temuan Prioritas
            </button>
          </div>
        </section>
      )}

      {/* Stat Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Supervisi Dilaksanakan"
          value={String(kpis.totalSupervisions)}
          sub={`${kpis.totalSupervisedUnits} unit telah disupervisi`}
          Icon={ClipboardCheck}
        />
        <StatCard
          label="Rata-Rata Skor Mutu"
          value={`${kpis.avgScore.toFixed(1)}%`}
          sub="Berdasarkan indikator berlaku"
          Icon={Award}
          accent="teal"
        />
        <StatCard
          label="Total Temuan"
          value={String(kpis.totalFindings)}
          sub={`${kpis.notStartedFindings} belum · ${kpis.inProgressFindings} proses · ${kpis.overdueFindings} terlambat`}
          Icon={AlertOctagon}
          accent={kpis.overdueFindings > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="Penyelesaian Tindak Lanjut"
          value={`${kpis.completionPct.toFixed(1)}%`}
          sub={`${kpis.completedFindings} dari ${kpis.totalFindings} temuan selesai`}
          Icon={CheckCircle2}
          accent="teal"
        />
      </section>

      {/* Charts Row 1 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Rata-Rata Skor Mutu per Unit */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-display text-sm font-bold text-[#142D42] mb-1">
            Rata-Rata Skor Mutu Setiap Unit
          </h3>
          <p className="text-xs text-slate-500 mb-4">Perbandingan persentase capaian standar mutu</p>
          <div className="h-72">
            {unitScoreRanking.length === 0 ? (
              <EmptyChartState />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={unitScoreRanking} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="unit" type="category" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => [`${val ?? 0}%`, 'Skor Mutu']} />
                  <Bar dataKey="score" fill="#245A78" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Tren Hasil Supervisi per Bulan */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-display text-sm font-bold text-[#142D42] mb-1">
            Tren Hasil Supervisi Per Bulan
          </h3>
          <p className="text-xs text-slate-500 mb-4">Perkembangan skor mutu rata-rata rumah sakit</p>
          <div className="h-72">
            {monthlyTrend.length === 0 ? (
              <EmptyChartState />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ left: 0, right: 16, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => [`${val ?? 0}%`, 'Rata-Rata Skor']} />
                  <Area
                    type="monotone"
                    dataKey="skor"
                    stroke="#238C89"
                    fill="#E5F3EF"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Charts Row 2 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 3: Kategori Temuan */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-display text-sm font-bold text-[#142D42] mb-1">
            Distribusi Kategori Temuan
          </h3>
          <p className="text-xs text-slate-500 mb-4">Jumlah ketidaksesuaian berdasarkan domain mutu</p>
          <div className="h-64">
            {categoryBreakdown.length === 0 ? (
              <EmptyChartState />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                    label={({ name, value }) => `${String(name ?? '').slice(0, 18)}: ${value}`}
                  >
                    {categoryBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 4: Tingkat Penyelesaian RTL */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-display text-sm font-bold text-[#142D42] mb-1">
            Status Penyelesaian Tindak Lanjut (RTL)
          </h3>
          <p className="text-xs text-slate-500 mb-4">Progres perbaikan temuan unit</p>
          <div className="h-64">
            {rtlBreakdown.length === 0 ? (
              <EmptyChartState />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rtlBreakdown} margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#238C89" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Ranking Unit & Highest/Lowest + Open Findings */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ranking Unit */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-sm font-bold text-[#142D42]">
                Ranking Unit Pelayanan
              </h3>
              <p className="text-xs text-slate-500">Skor tertinggi hingga terendah</p>
            </div>
            <TrendingUp className="w-4 h-4 text-[#238C89]" />
          </div>

          {unitScoreRanking.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">Belum ada data skor supervisi.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {unitScoreRanking.map((u, idx) => (
                <div key={u.unitId} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-slate-400 w-5 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#142D42] truncate">{u.unit}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {u.category} · {u.count}x supervisi
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`font-mono text-sm font-bold tabular-nums ${
                        u.score >= 85
                          ? 'text-emerald-700'
                          : u.score >= 75
                            ? 'text-[#245A78]'
                            : 'text-[#D9534F]'
                      }`}
                    >
                      {u.score.toFixed(1)}%
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {idx === 0 ? 'Tertinggi' : idx === unitScoreRanking.length - 1 ? 'Terendah' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daftar Item Perlu Tindak Lanjut */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-sm font-bold text-[#142D42]">
                Hal yang Perlu Diperbaiki (Belum Selesai)
              </h3>
              <p className="text-xs text-slate-500">Ketidaksesuaian yang memerlukan tindak lanjut perbaikan</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('follow-ups')}
              className="text-xs font-semibold text-[#245A78] hover:underline cursor-pointer"
            >
              Buka Tindak Lanjut
            </button>
          </div>

          {openFindings.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              Seluruh item perbaikan pada filter ini telah selesai ditindaklanjuti.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-2 pr-3">Nomor &amp; Unit</th>
                    <th className="py-2 px-3">Risiko</th>
                    <th className="py-2 px-3">Batas Waktu</th>
                    <th className="py-2 pl-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {openFindings.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-3">
                        <p className="font-mono font-semibold text-[#142D42]">{f.finding_number}</p>
                        <p className="text-slate-600 line-clamp-1">
                          {f.unit_name} — {f.description}
                        </p>
                      </td>
                      <td className="py-2.5 px-3">
                        <RiskIndicator level={f.risk_level} />
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {f.due_date}
                      </td>
                      <td className="py-2.5 pl-3">
                        <FindingStatusIndicator status={f.status} dueDate={f.due_date} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Recent Supervision Activities */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#245A78]" />
            <h3 className="font-display text-sm font-bold text-[#142D42]">
              Aktivitas Penginputan Supervisi Terbaru
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('monitoring')}
            className="text-xs font-semibold text-[#245A78] hover:underline cursor-pointer"
          >
            Buka Monitoring Lengkap
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="py-2 pr-3">No. Supervisi</th>
                <th className="py-2 px-3">Unit</th>
                <th className="py-2 px-3">Periode</th>
                <th className="py-2 px-3">Tanggal</th>
                <th className="py-2 px-3">Supervisor</th>
                <th className="py-2 px-3 text-right">Skor</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 pl-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredSupervisions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Belum ada data penginputan supervisi pada periode/filter ini.
                  </td>
                </tr>
              ) : (
                filteredSupervisions.slice(0, 6).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-3 font-mono font-semibold text-[#142D42]">
                      {s.supervision_number}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#243447]">{s.unit_name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{s.period_name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 tabular-nums">
                      {s.supervision_date.slice(0, 10)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{s.supervisor_name}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#142D42] tabular-nums">
                      {Number(s.total_score).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3">
                      <SupervisionStatusIndicator status={s.status} />
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(s)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-200 text-[#D9534F] hover:bg-red-50 text-[11px] font-semibold cursor-pointer"
                        title="Hapus Data Supervisi & Capaian"
                      >
                        <Trash2 className="w-3 h-3" />
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-5 shadow-xl">
            <h3 className="font-display text-base font-bold text-[#142D42]">
              Hapus Data Supervisi & Capaian
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Apakah Anda yakin ingin menghapus data supervisi{' '}
              <span className="font-mono font-bold text-[#142D42]">
                {deleteTarget.supervision_number}
              </span>{' '}
              pada unit <span className="font-semibold text-[#142D42]">{deleteTarget.unit_name}</span>?
              Seluruh data capaian dan temuan terkait supervisi ini juga akan ikut dihapus.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  try {
                    setDeleting(true);
                    await api.deleteSupervision(deleteTarget.id);
                    setDeleteTarget(null);
                    await loadData();
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-[#D9534F] text-white text-xs font-semibold hover:bg-red-700 cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  Icon,
  accent = 'default',
}: {
  label: string;
  value: string;
  sub: string;
  Icon: typeof Building2;
  accent?: 'default' | 'teal' | 'danger';
}) {
  const valColor =
    accent === 'teal' ? 'text-[#238C89]' : accent === 'danger' ? 'text-[#D9534F]' : 'text-[#142D42]';
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <Icon className="w-4 h-4 text-slate-400 shrink-0" />
      </div>
      <p className={`font-display text-2xl font-bold mt-2 tabular-nums ${valColor}`}>{value}</p>
      <p className="text-[11px] text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

function EmptyChartState() {
  return (
    <div className="h-full flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
      Tidak ada data untuk kombinasi filter ini.
    </div>
  );
}
