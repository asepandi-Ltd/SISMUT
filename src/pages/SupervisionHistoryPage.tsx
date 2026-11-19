import React, { useEffect, useState, useCallback } from 'react';
import { Eye, LockOpen, Printer, Edit3, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import { canPerformSupervision, canReopenSupervision } from '../lib/permissions';
import { SupervisionStatusIndicator } from '../components/StatusText';
import type { Supervision } from '../types/sismut';

interface SupervisionHistoryPageProps {
  onResumeDraft: (id: string) => void;
}

export function SupervisionHistoryPage({ onResumeDraft }: SupervisionHistoryPageProps) {
  const { user } = useAuth();
  const { revision } = useRealtime();
  const [items, setItems] = useState<Supervision[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<(Supervision & { is_weighted: boolean }) | null>(
    null
  );
  const [reopenTarget, setReopenTarget] = useState<Supervision | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [error, setError] = useState('');

  const loadList = useCallback(async () => {
    const data = await api.getSupervisions();
    setItems(data);
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList, revision]);

  const openDetail = async (id: string) => {
    const detail = await api.getSupervisionDetail(id);
    setSelectedDetail(detail);
  };

  const handleReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenTarget) return;
    setError('');
    try {
      await api.reopenSupervision(reopenTarget.id, reopenReason);
      setReopenTarget(null);
      setReopenReason('');
      await loadList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membuka kembali supervisi.');
    }
  };

  const allowEdit = user ? canPerformSupervision(user.role) : false;
  const allowReopen = user ? canReopenSupervision(user.role) : false;

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-[#D9534F]/30 bg-[#D9534F]/5 px-4 py-2.5 text-xs text-[#D9534F]">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">No. Supervisi</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4">Periode &amp; Instrumen</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4 text-right">Skor Mutu</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {items.map((s) => (
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
                      onClick={() => openDetail(s.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#245A78] hover:underline cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detail</span>
                    </button>
                    {allowEdit && s.status !== 'Final' && (
                      <button
                        type="button"
                        onClick={() => onResumeDraft(s.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#238C89] hover:underline cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Lanjutkan</span>
                      </button>
                    )}
                    {allowReopen && s.status === 'Final' && (
                      <button
                        type="button"
                        onClick={() => setReopenTarget(s)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#B87A14] hover:underline cursor-pointer"
                      >
                        <LockOpen className="w-3.5 h-3.5" />
                        <span>Buka Kembali</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
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
                    <p className="text-[#B87A14]">Rekomendasi: {a.recommendation}</p>
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

      {/* Reopen Modal */}
      {reopenTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="font-display text-base font-bold text-[#142D42] mb-2">
              Buka Kembali Supervisi Final
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Pembukaan kembali hasil supervisi <strong>{reopenTarget.supervision_number}</strong>{' '}
              akan dicatat secara permanen ke dalam Audit Trail.
            </p>
            <form onSubmit={handleReopen} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Alasan Pembukaan Kembali (Wajib)
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="Jelaskan alasan resmi perubahan hasil supervisi..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReopenTarget(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#B87A14] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Konfirmasi Buka Kembali
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
