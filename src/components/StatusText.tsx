import { AlertTriangle, CheckCircle2, Clock, Info, RotateCcw, ShieldAlert } from 'lucide-react';
import type { FindingStatus, RiskLevel, SupervisionStatus } from '../types/sismut';

export function RiskIndicator({ level }: { level: RiskLevel }) {
  const styles: Record<RiskLevel, { color: string; Icon: typeof Info }> = {
    Rendah: { color: 'text-[#245A78]', Icon: Info },
    Sedang: { color: 'text-[#B87A14]', Icon: Clock },
    Tinggi: { color: 'text-[#C2410C]', Icon: AlertTriangle },
    Kritis: { color: 'text-[#D9534F]', Icon: ShieldAlert },
  };
  const { color, Icon } = styles[level] || styles.Sedang;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{level}</span>
    </span>
  );
}

export function FindingStatusIndicator({
  status,
  dueDate,
}: {
  status: FindingStatus;
  dueDate?: string;
}) {
  const isNearDue = (() => {
    if (!dueDate || status === 'Selesai') return false;
    const diff = (new Date(dueDate).getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 3;
  })();

  if (status === 'Selesai') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Selesai</span>
      </span>
    );
  }
  if (status === 'Terlambat') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D9534F] whitespace-nowrap">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
        <span>Terlambat</span>
      </span>
    );
  }
  if (status === 'Perlu Perbaikan Ulang') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D9534F] whitespace-nowrap">
        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
        <span>Perlu Perbaikan Ulang</span>
      </span>
    );
  }
  if (isNearDue) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B87A14] whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>{status} · Mendekati Batas Waktu</span>
      </span>
    );
  }
  if (status === 'Menunggu Verifikasi' || status === 'Dalam Proses') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#245A78] whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span>{status}</span>
    </span>
  );
}

export function SupervisionStatusIndicator({ status }: { status: SupervisionStatus }) {
  const map: Record<SupervisionStatus, string> = {
    'Belum Diperiksa': 'text-slate-500',
    'Sedang Diperiksa': 'text-[#B87A14]',
    'Sudah Diperiksa': 'text-[#245A78]',
    Final: 'text-emerald-700',
  };
  return (
    <span className={`text-xs font-semibold whitespace-nowrap ${map[status] || 'text-slate-600'}`}>
      {status}
    </span>
  );
}
