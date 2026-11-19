import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useRealtime } from '../contexts/RealtimeContext';
import { RiskIndicator, FindingStatusIndicator } from '../components/StatusText';
import type { Finding } from '../types/sismut';

export function VerificationPage() {
  const { revision } = useRealtime();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    const data = await api.getFindings();
    setFindings(data);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, revision]);

  const queue = findings.filter((f) => f.status === 'Menunggu Verifikasi');
  const history = findings.filter((f) => (f.latest_follow_up?.verification_logs || []).length > 0);

  const handleVerify = async (f: Finding, result: 'Disetujui' | 'Dikembalikan') => {
    setError('');
    setSuccess('');
    const fu = f.latest_follow_up;
    if (!fu) return;
    const notes = (notesById[f.id] || '').trim();
    if (result === 'Dikembalikan' && !notes) {
      setError('Catatan alasan pengembalian wajib diisi saat mengembalikan perbaikan.');
      return;
    }

    try {
      await api.submitVerification({
        follow_up_id: fu.id,
        finding_id: f.id,
        verification_result: result,
        verification_notes: notes || 'Bukti perbaikan telah diverifikasi dan sesuai standar.',
      });
      setSuccess(
        result === 'Disetujui'
          ? `Temuan ${f.finding_number} disetujui dan dinyatakan Selesai.`
          : `Temuan ${f.finding_number} dikembalikan ke unit untuk perbaikan ulang.`
      );
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memproses verifikasi.');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-[#D9534F]/30 bg-[#D9534F]/5 px-4 py-3 text-xs text-[#D9534F]">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-[#238C89]/30 bg-[#E5F3EF] px-4 py-3 text-xs text-[#142D42] font-medium">
          {success}
        </div>
      )}

      {/* Awaiting Verification Queue */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#238C89]" />
          <h2 className="font-display text-sm font-bold text-[#142D42]">
            Antrean Verifikasi Tindak Lanjut ({queue.length})
          </h2>
        </div>

        {queue.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
            Saat ini tidak ada tindak lanjut yang menunggu verifikasi.
          </div>
        ) : (
          <div className="space-y-4">
            {queue.map((f) => {
              const fu = f.latest_follow_up;
              return (
                <div key={f.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-[#142D42]">{f.finding_number}</span>
                        <span>·</span>
                        <span className="font-semibold text-[#245A78]">{f.unit_name}</span>
                        <span>·</span>
                        <RiskIndicator level={f.risk_level} />
                      </div>
                      <p className="text-sm font-bold text-[#142D42] mt-1">{f.description}</p>
                    </div>
                    <FindingStatusIndicator status={f.status} dueDate={f.due_date} />
                  </div>

                  {fu && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#243447]">
                      <div>
                        <p className="font-semibold text-slate-500">Akar Penyebab</p>
                        <p className="mt-0.5">{fu.root_cause}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500">Tindakan Korektif &amp; Pencegahan</p>
                        <p className="mt-0.5">{fu.corrective_action}</p>
                        {fu.preventive_action && (
                          <p className="mt-1 text-slate-500">Pencegahan: {fu.preventive_action}</p>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500">PIC &amp; Tanggal Pelaksanaan</p>
                        <p className="mt-0.5">
                          {fu.responsible_person} · <span className="font-mono">{fu.execution_date}</span>
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500">Bukti Perbaikan</p>
                        {fu.evidence_url ? (
                          <a
                            href={fu.evidence_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block mt-1 font-semibold text-[#238C89] underline"
                          >
                            Buka Foto Bukti Perbaikan Unit
                          </a>
                        ) : (
                          <p className="text-slate-400 mt-0.5">Tidak ada lampiran foto</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <textarea
                      rows={2}
                      value={notesById[f.id] || ''}
                      onChange={(e) =>
                        setNotesById((prev) => ({ ...prev, [f.id]: e.target.value }))
                      }
                      placeholder="Catatan verifikasi lapangan (wajib diisi jika dikembalikan)..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                    <div className="flex flex-wrap justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleVerify(f, 'Dikembalikan')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9534F] px-4 py-2 text-xs font-semibold text-[#D9534F] hover:bg-[#D9534F]/5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Kembalikan untuk Perbaikan Ulang</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerify(f, 'Disetujui')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#238C89] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1d7875] cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Setujui &amp; Nyatakan Selesai</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Verification History Log */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-display text-sm font-bold text-[#142D42] mb-3">
          Riwayat Verifikasi Terbaru
        </h3>
        <div className="divide-y divide-slate-100 text-xs">
          {history.map((f) =>
            (f.latest_follow_up?.verification_logs || []).map((log) => (
              <div key={log.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-semibold text-[#142D42]">{f.finding_number}</span>{' '}
                  <span className="text-slate-600">({f.unit_name})</span> —{' '}
                  <span
                    className={`font-semibold ${
                      log.verification_result === 'Disetujui'
                        ? 'text-emerald-700'
                        : 'text-[#D9534F]'
                    }`}
                  >
                    {log.verification_result}
                  </span>
                  <p className="text-slate-500 mt-0.5">{log.verification_notes}</p>
                </div>
                <span className="font-mono text-[11px] text-slate-400">
                  {log.verifier_name} · {log.verified_at.slice(0, 10)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
