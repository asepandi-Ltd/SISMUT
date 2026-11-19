import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { AppSettings } from '../types/sismut';

export interface OfficialReportPayload {
  reportTitle: string;
  reportTypeLabel: string;
  periodLabel: string;
  unitLabel?: string;
  settings: AppSettings;
  pendahuluan: string;
  tujuan: string;
  metode: string;
  hasilPemeriksaan: string;
  tableHeaders: string[];
  tableRows: Array<Array<string | number>>;
  analisis: string;
  permasalahan: string;
  rekomendasi: string[];
  rencanaTindakLanjut: string;
  penutup: string;
  signerLeftTitle?: string;
  signerLeftName?: string;
  signerRightTitle?: string;
  signerRightName?: string;
}

export function exportOfficialReportPDF(payload: OfficialReportPayload) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 16;
  const contentW = pageW - marginX * 2;
  let y = 16;

  // Kop Surat RSUD Al-Mulk Kota Sukabumi
  doc.setFillColor(20, 45, 66); // #142D42
  doc.rect(marginX, y, contentW, 2, 'F');
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(36, 90, 120);
  doc.text('PEMERINTAH KOTA SUKABUMI', pageW / 2, y, { align: 'center' });
  y += 5;

  doc.setFontSize(14);
  doc.setTextColor(20, 45, 66);
  doc.text(payload.settings.hospital_name.toUpperCase(), pageW / 2, y, { align: 'center' });
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(payload.settings.hospital_address, pageW / 2, y, { align: 'center' });
  y += 3.5;
  doc.text('SISMUT — Sistem Informasi Supervisi Mutu Rumah Sakit | Mutu Terjaga, Pelayanan Terpercaya', pageW / 2, y, {
    align: 'center',
  });
  y += 3;

  doc.setDrawColor(20, 45, 66);
  doc.setLineWidth(0.7);
  doc.line(marginX, y, pageW - marginX, y);
  doc.setLineWidth(0.2);
  doc.line(marginX, y + 1, pageW - marginX, y + 1);
  y += 8;

  // Report Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 45, 66);
  doc.text(payload.reportTitle.toUpperCase(), pageW / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(35, 140, 137);
  doc.text(
    `Jenis: ${payload.reportTypeLabel}  |  Periode: ${payload.periodLabel}${payload.unitLabel ? `  |  Unit: ${payload.unitLabel}` : ''}`,
    pageW / 2,
    y,
    { align: 'center' }
  );
  y += 8;

  const ensureSpace = (needed: number) => {
    if (y + needed > 272) {
      doc.addPage();
      y = 18;
    }
  };

  const addSection = (title: string, body: string) => {
    ensureSpace(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 45, 66);
    doc.text(title, marginX, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(36, 52, 71);
    const lines = doc.splitTextToSize(body || '-', contentW);
    for (const line of lines) {
      ensureSpace(5);
      doc.text(line, marginX, y);
      y += 4.2;
    }
    y += 3;
  };

  addSection('I. PENDAHULUAN', payload.pendahuluan);
  addSection('II. TUJUAN', payload.tujuan);
  addSection('III. METODE SUPERVISI', payload.metode);
  addSection('IV. HASIL PEMERIKSAAN', payload.hasilPemeriksaan);

  // Table Rekapitulasi
  ensureSpace(24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 45, 66);
  doc.text('V. TABEL REKAPITULASI DATA SUPERVISI', marginX, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [payload.tableHeaders],
    body: payload.tableRows.map((r) => r.map((c) => String(c ?? '-'))),
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [36, 52, 71],
    },
    headStyles: {
      fillColor: [20, 45, 66],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = ((doc as any).lastAutoTable?.finalY ?? y + 20) + 7;

  addSection('VI. ANALISIS CAPAIAN MUTU', payload.analisis);
  addSection('VII. PERMASALAHAN YANG DITEMUKAN', payload.permasalahan);

  // Rekomendasi list
  ensureSpace(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 45, 66);
  doc.text('VIII. REKOMENDASI PERBAIKAN', marginX, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(36, 52, 71);
  payload.rekomendasi.forEach((rec, idx) => {
    const lines = doc.splitTextToSize(`${idx + 1}. ${rec}`, contentW);
    for (const l of lines) {
      ensureSpace(5);
      doc.text(l, marginX, y);
      y += 4.2;
    }
  });
  y += 3;

  addSection('IX. RENCANA TINDAK LANJUT (RTL)', payload.rencanaTindakLanjut);
  addSection('X. PENUTUP', payload.penutup);

  // Signature Block
  ensureSpace(40);
  y += 4;
  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${payload.settings.hospital_city}, ${todayStr}`, pageW - marginX - 55, y);
  y += 5;
  doc.text(payload.signerLeftTitle || 'Ketua Komite Mutu', marginX + 5, y);
  doc.text(payload.signerRightTitle || `Direktur ${payload.settings.hospital_name}`, pageW - marginX - 60, y);
  y += 22;
  doc.setFont('helvetica', 'bold');
  doc.text(payload.signerLeftName || 'Ns. Siti Aminah, S.Kep., M.Kep.', marginX + 5, y);
  doc.text(payload.signerRightName || 'dr. H. Ahmad Fauzi, Sp.PD, MARS', pageW - marginX - 60, y);

  const safeSlug = payload.reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  doc.save(`SISMUT-${safeSlug}.pdf`);
}

export function exportOfficialReportExcel(payload: OfficialReportPayload) {
  const wb = XLSX.utils.book_new();

  const summarySheetData = [
    [payload.settings.hospital_name.toUpperCase()],
    [payload.settings.hospital_address],
    ['SISTEM INFORMASI SUPERVISI MUTU RUMAH SAKIT (SISMUT)'],
    [],
    ['Judul Laporan', payload.reportTitle],
    ['Jenis Laporan', payload.reportTypeLabel],
    ['Periode', payload.periodLabel],
    ['Unit', payload.unitLabel || 'Seluruh Unit RSUD Al-Mulk'],
    ['Tanggal Cetak', new Date().toLocaleString('id-ID')],
    [],
    ['Pendahuluan', payload.pendahuluan],
    ['Tujuan', payload.tujuan],
    ['Metode Supervisi', payload.metode],
    ['Hasil Pemeriksaan', payload.hasilPemeriksaan],
    ['Analisis', payload.analisis],
    ['Permasalahan', payload.permasalahan],
    ['Rekomendasi', payload.rekomendasi.join(' | ')],
    ['Rencana Tindak Lanjut', payload.rencanaTindakLanjut],
    ['Penutup', payload.penutup],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
  wsSummary['!cols'] = [{ wch: 24 }, { wch: 95 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Resmi');

  const tableSheetData = [payload.tableHeaders, ...payload.tableRows];
  const wsTable = XLSX.utils.aoa_to_sheet(tableSheetData);
  wsTable['!cols'] = payload.tableHeaders.map(() => ({ wch: 24 }));
  XLSX.utils.book_append_sheet(wb, wsTable, 'Rekapitulasi Data');

  const safeSlug = payload.reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  XLSX.writeFile(wb, `SISMUT-${safeSlug}.xlsx`);
}
