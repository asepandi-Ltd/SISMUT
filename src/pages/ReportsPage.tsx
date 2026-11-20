import { useEffect, useMemo, useState, useCallback } from 'react';
import { FileDown, FileSpreadsheet, Printer } from 'lucide-react';
import { api } from '../services/api';
import { exportOfficialReportExcel, exportOfficialReportPDF, type OfficialReportPayload } from '../lib/exportReports';
import type {
  AppSettings,
  Finding,
  Supervision,
  SupervisionPeriod,
  Unit,
} from '../types/sismut';

const REPORT_TYPES = [
  { id: 'period', label: '1. Laporan Supervisi Per Periode' },
  { id: 'rekap', label: '2. Rekapitulasi Nilai Seluruh Unit' },
  { id: 'rtl', label: '3. Laporan Tindak Lanjut Perbaikan' },
  { id: 'completion', label: '4. Laporan Penyelesaian Perbaikan' },
  { id: 'monthly', label: '5. Laporan Evaluasi Mutu Bulanan' },
  { id: 'quarterly', label: '6. Laporan Evaluasi Triwulanan' },
  { id: 'annual', label: '7. Laporan Evaluasi Tahunan' },
  { id: 'executive', label: '8. Executive Summary Supervisi Mutu Rumah Sakit' },
] as const;

interface ReportsPageProps {
  defaultTab: 'unit' | 'periodic' | 'hospital';
  customRecommendations: string[];
}

export function ReportsPage({ defaultTab, customRecommendations }: ReportsPageProps) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [periods, setPeriods] = useState<SupervisionPeriod[]>([]);
  const [supervisions, setSupervisions] = useState<Supervision[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [reportType, setReportType] = useState<string>(
    defaultTab === 'unit' ? 'unit' : defaultTab === 'periodic' ? 'quarterly' : 'executive'
  );
  const [selectedPeriodId, setSelectedPeriodId] = useState('ALL');
  const [selectedUnitId, setSelectedUnitId] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');

  useEffect(() => {
    setReportType(defaultTab === 'unit' ? 'unit' : defaultTab === 'periodic' ? 'quarterly' : 'executive');
  }, [defaultTab]);

  const loadData = useCallback(async () => {
    const [u, p, s, f, st] = await Promise.all([
      api.getUnits(),
      api.getPeriods(),
      api.getSupervisions(),
      api.getFindings(),
      api.getSettings(),
    ]);
    setUnits(u);
    setPeriods(p);
    setSupervisions(s);
    setFindings(f);
    setSettings(st);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSups = useMemo(() => {
    return supervisions.filter((s) => {
      if (selectedPeriodId !== 'ALL' && s.period_id !== selectedPeriodId) return false;
      if (selectedUnitId !== 'ALL' && s.unit_id !== selectedUnitId) return false;
      if (selectedMonth !== 'ALL' && s.supervision_date.slice(5, 7) !== selectedMonth) return false;
      return true;
    });
  }, [supervisions, selectedPeriodId, selectedUnitId, selectedMonth]);

  const filteredFindings = useMemo(() => {
    const supIds = new Set(filteredSups.map((s) => s.id));
    return findings.filter((f) => {
      if (selectedUnitId !== 'ALL' && f.unit_id !== selectedUnitId) return false;
      if (
        (selectedPeriodId !== 'ALL' || selectedMonth !== 'ALL') &&
        !supIds.has(f.supervision_id)
      ) {
        return false;
      }
      return true;
    });
  }, [findings, filteredSups, selectedUnitId, selectedPeriodId, selectedMonth]);

  const reportPayload: OfficialReportPayload | null = useMemo(() => {
    if (!settings) return null;
    const typeLabel = REPORT_TYPES.find((t) => t.id === reportType)?.label || 'Laporan Resmi';
    const periodObj = periods.find((p) => p.id === selectedPeriodId);
    const unitObj = units.find((u) => u.id === selectedUnitId);
    const periodLabel = periodObj ? periodObj.period_name : 'Seluruh Periode Evaluasi';
    const unitLabel = unitObj ? unitObj.unit_name : 'Seluruh Unit Pelayanan & Penunjang';

    const avgScore =
      filteredSups.length > 0
        ? (
            filteredSups.reduce((a, b) => a + Number(b.total_score || 0), 0) / filteredSups.length
          ).toFixed(1)
        : '0.0';
    const doneFindings = filteredFindings.filter((f) => f.status === 'Selesai').length;
    const pctDone =
      filteredFindings.length > 0
        ? ((doneFindings / filteredFindings.length) * 100).toFixed(1)
        : '0.0';

    let tableHeaders: string[] = [];
    let tableRows: Array<Array<string | number>> = [];

    if (reportType === 'findings' || reportType === 'rtl' || reportType === 'completion') {
      tableHeaders = ['No. Temuan', 'Unit', 'Risiko', 'Uraian Temuan', 'Batas Waktu', 'Status RTL'];
      tableRows = filteredFindings.map((f) => [
        f.finding_number,
        f.unit_name || '-',
        f.risk_level,
        f.description,
        f.due_date,
        f.status,
      ]);
    } else {
      tableHeaders = ['No. Supervisi', 'Unit Pelayanan', 'Periode', 'Tanggal', 'Skor (%)', 'Status'];
      tableRows = filteredSups.map((s) => [
        s.supervision_number,
        s.unit_name || '-',
        s.period_name || '-',
        s.supervision_date.slice(0, 10),
        Number(s.total_score).toFixed(1),
        s.status,
      ]);
    }

    return {
      reportTitle: `${typeLabel.replace(/^\d+\.\s*/, '')} — ${settings.hospital_name}`,
      reportTypeLabel: typeLabel.replace(/^\d+\.\s*/, ''),
      periodLabel,
      unitLabel,
      settings,
      pendahuluan: `Laporan ini disusun oleh Komite Mutu dan Keselamatan Pasien ${settings.hospital_name} sebagai bagian dari siklus pengendalian mutu berkelanjutan dan pemenuhan standar akreditasi ${settings.accreditation_target}.`,
      tujuan: `Mengevaluasi tingkat kepatuhan standar pelayanan pada ${unitLabel}, mengidentifikasi ketidaksesuaian berisiko, serta memantau efektivitas pelaksanaan Rencana Tindak Lanjut (RTL).`,
      metode:
        'Supervisi lapangan dilakukan melalui observasi langsung, telaah dokumen rekam medis/SPO, pemeriksaan fisik sarana prasarana, serta wawancara petugas menggunakan instrumen checklist berbobot SISMUT (indikator N/A dikeluarkan dari penyebut skor).',
      hasilPemeriksaan: `Tercatat ${filteredSups.length} pelaksanaan supervisi dengan rata-rata capaian skor mutu sebesar ${avgScore}% (ambang batas kelulusan mutu rumah sakit: ${settings.min_passing_score}%).`,
      tableHeaders,
      tableRows,
      analisis: `Dari ${filteredFindings.length} temuan ketidaksesuaian yang tercatat, sebanyak ${doneFindings} temuan (${pctDone}%) telah dinyatakan Selesai dan terverifikasi oleh Supervisor Mutu.`,
      permasalahan:
        filteredFindings
          .filter((f) => f.status !== 'Selesai')
          .slice(0, 4)
          .map((f) => `${f.finding_number} (${f.unit_name} - Risiko ${f.risk_level}): ${f.description}`)
          .join('; ') || 'Seluruh permasalahan temuan telah diselesaikan sesuai standar.',
      rekomendasi:
        customRecommendations.length > 0
          ? customRecommendations
          : [
              'Lakukan pengawasan melekat oleh Kepala Unit terhadap kepatuhan SPO berisiko tinggi.',
              'Pastikan seluruh RTL dengan status Terlambat atau Mendekati Batas Waktu segera diunggah bukti perbaikannya.',
            ],
      rencanaTindakLanjut:
        'Setiap unit penerima temuan wajib melengkapi analisis akar penyebab, tindakan korektif, dan tindakan pencegahan melalui modul RTL SISMUT untuk diverifikasi oleh Supervisor.',
      penutup: `Demikian laporan resmi supervisi mutu ${settings.hospital_name} ini disusun untuk menjadi dasar pengambilan keputusan Direksi dan perbaikan mutu berkelanjutan.`,
    };
  }, [
    settings,
    reportType,
    periods,
    units,
    selectedPeriodId,
    selectedUnitId,
    filteredSups,
    filteredFindings,
    customRecommendations,
  ]);

  return (
    <div className="space-y-6">
      {/* Filter & Export Bar */}
      <section className="no-print bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jenis Laporan</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium"
            >
              {REPORT_TYPES.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Periode</label>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            >
              <option value="ALL">Semua Periode</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.period_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unit</label>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            >
              <option value="ALL">Seluruh Unit Rumah Sakit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.unit_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bulan</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            >
              <option value="ALL">Semua Bulan</option>
              {[
                ['08', 'Agustus'],
                ['09', 'September'],
                ['10', 'Oktober'],
                ['11', 'November'],
                ['12', 'Desember'],
              ].map(([m, label]) => (
                <option key={m} value={m}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={!reportPayload}
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-[#243447] hover:bg-slate-50 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Halaman</span>
          </button>

          <button
            type="button"
            disabled={!reportPayload}
            onClick={() => reportPayload && exportOfficialReportExcel(reportPayload)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#238C89] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1d7875] cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            disabled={!reportPayload}
            onClick={() => reportPayload && exportOfficialReportPDF(reportPayload)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#142D42] px-4 py-2 text-xs font-semibold text-white hover:bg-[#245A78] cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>Unduh Laporan PDF Resmi</span>
          </button>
        </div>
      </section>

      {/* Formal Hospital Document Preview */}
      {reportPayload && (
        <article className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 space-y-6 max-w-4xl mx-auto">
          {/* Kop Surat */}
          <header className="text-center border-b-2 border-[#142D42] pb-4 space-y-1">
            <p className="text-xs font-bold tracking-wider text-[#245A78]">PEMERINTAH KOTA SUKABUMI</p>
            <h2 className="font-display text-xl font-extrabold text-[#142D42]">
              {reportPayload.settings.hospital_name.toUpperCase()}
            </h2>
            <p className="text-xs text-slate-600">{reportPayload.settings.hospital_address}</p>
            <p className="text-[11px] font-medium text-[#238C89]">
              SISMUT — Sistem Informasi Supervisi Mutu Rumah Sakit
            </p>
          </header>

          <div className="text-center space-y-1">
            <h3 className="font-display text-base font-bold text-[#142D42] uppercase">
              {reportPayload.reportTitle}
            </h3>
            <p className="text-xs text-slate-600">
              Periode: <strong>{reportPayload.periodLabel}</strong> · Unit:{' '}
              <strong>{reportPayload.unitLabel}</strong>
            </p>
          </div>

          <div className="space-y-4 text-xs text-[#243447] leading-relaxed">
            <DocSection title="I. PENDAHULUAN" body={reportPayload.pendahuluan} />
            <DocSection title="II. TUJUAN" body={reportPayload.tujuan} />
            <DocSection title="III. METODE SUPERVISI" body={reportPayload.metode} />
            <DocSection title="IV. HASIL PEMERIKSAAN" body={reportPayload.hasilPemeriksaan} />

            <div>
              <h4 className="font-display font-bold text-[#142D42] mb-2">
                V. TABEL REKAPITULASI DATA
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#142D42] text-white text-[11px]">
                      {reportPayload.tableHeaders.map((h) => (
                        <th key={h} className="py-2 px-3 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportPayload.tableRows.length === 0 ? (
                      <tr>
                        <td colSpan={reportPayload.tableHeaders.length} className="p-4 text-center text-slate-400">
                          Tidak ada baris data pada filter terpilih.
                        </td>
                      </tr>
                    ) : (
                      reportPayload.tableRows.map((row, rIdx) => (
                        <tr key={rIdx} className="odd:bg-white even:bg-slate-50">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="py-2 px-3 tabular-nums">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <DocSection title="VI. ANALISIS CAPAIAN MUTU" body={reportPayload.analisis} />
            <DocSection title="VII. PERMASALAHAN YANG DITEMUKAN" body={reportPayload.permasalahan} />

            <div>
              <h4 className="font-display font-bold text-[#142D42] mb-1">
                VIII. REKOMENDASI PERBAIKAN
              </h4>
              <ol className="list-decimal list-inside space-y-1">
                {reportPayload.rekomendasi.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ol>
            </div>

            <DocSection title="IX. RENCANA TINDAK LANJUT (RTL)" body={reportPayload.rencanaTindakLanjut} />
            <DocSection title="X. PENUTUP" body={reportPayload.penutup} />
          </div>

          {/* Signature Block */}
          <footer className="pt-8 grid grid-cols-2 gap-8 text-xs text-[#142D42]">
            <div className="text-center space-y-16">
              <div>
                <p>Mengetahui,</p>
                <p className="font-semibold">Ketua Komite Mutu RSUD Al-Mulk</p>
              </div>
              <p className="font-bold underline">Ns. Siti Aminah, S.Kep., M.Kep.</p>
            </div>

            <div className="text-center space-y-16">
              <div>
                <p>
                  {reportPayload.settings.hospital_city},{' '}
                  {new Date().toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className="font-semibold">Direktur {reportPayload.settings.hospital_name}</p>
              </div>
              <p className="font-bold underline">dr. H. Ahmad Fauzi, Sp.PD, MARS</p>
            </div>
          </footer>
        </article>
      )}
    </div>
  );
}

function DocSection({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h4 className="font-display font-bold text-[#142D42] mb-1">{title}</h4>
      <p>{body}</p>
    </div>
  );
}
