export type UserRole =
  | 'SUPER_ADMIN'
  | 'KOMITE_MUTU'
  | 'MANAJEMEN';

export type UnitCategory =
  | 'RAWAT JALAN'
  | 'RAWAT INAP'
  | 'INSTALASI GAWAT DARURAT'
  | 'PENUNJANG MEDIS'
  | 'PENUNJANG NONMEDIS'
  | 'MANAJEMEN DAN UNIT LAINNYA';

export type SupervisionStatus =
  | 'Belum Diperiksa'
  | 'Sedang Diperiksa'
  | 'Sudah Diperiksa'
  | 'Final';

export type AnswerOption = 'Sesuai' | 'Tidak Sesuai' | 'N/A' | null;

export type RiskLevel = 'Rendah' | 'Sedang' | 'Tinggi' | 'Kritis';

export type FindingStatus =
  | 'Belum Ditindaklanjuti'
  | 'Dalam Proses'
  | 'Menunggu Verifikasi'
  | 'Perlu Perbaikan Ulang'
  | 'Selesai'
  | 'Terlambat';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  unit_id: string | null;
  unit_name?: string | null;
  position_title: string;
  is_active: boolean;
  created_at: string;
}

export interface Unit {
  id: string;
  unit_code: string;
  unit_name: string;
  category: UnitCategory;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SupervisionPeriod {
  id: string;
  period_name: string;
  period_type: 'Bulanan' | 'Triwulanan' | 'Semesteran' | 'Tahunan';
  start_date: string;
  end_date: string;
  status: 'Draft' | 'Aktif' | 'Selesai' | 'Arsip';
  created_at: string;
}

export interface InstrumentItem {
  id: string;
  category_id: string;
  item_name: string;
  standard_description: string;
  weight: number;
  is_active: boolean;
  sort_order: number;
}

export interface InstrumentCategory {
  id: string;
  instrument_id: string;
  category_name: string;
  sort_order: number;
  items?: InstrumentItem[];
}

export interface Instrument {
  id: string;
  instrument_name: string;
  unit_category: string;
  version: number;
  parent_instrument_id?: string | null;
  description: string;
  is_weighted: boolean;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  categories?: InstrumentCategory[];
  usage_count?: number;
}

export interface SupervisionSchedule {
  id: string;
  period_id: string;
  period_name?: string;
  unit_id: string;
  unit_name?: string;
  unit_category?: string;
  instrument_id: string;
  instrument_name?: string;
  supervisor_id: string;
  supervisor_name?: string;
  scheduled_date: string;
  scheduled_time: string;
  team_members: string;
  status: 'Terjadwal' | 'Berlangsung' | 'Selesai' | 'Ditunda';
  notes: string;
  created_at: string;
}

export interface SupervisionAnswer {
  id?: string;
  supervision_id?: string;
  instrument_item_id: string;
  item_name_snapshot: string;
  category_name_snapshot: string;
  weight_snapshot: number;
  answer: AnswerOption;
  notes: string;
  supporting_evidence: string;
  evidence_url: string;
  recommendation: string;
  risk_level?: RiskLevel;
}

export interface Supervision {
  id: string;
  supervision_number: string;
  schedule_id?: string | null;
  unit_id: string;
  unit_name?: string;
  unit_category?: UnitCategory;
  period_id: string;
  period_name?: string;
  instrument_id: string;
  instrument_name?: string;
  instrument_version: number;
  supervisor_id: string;
  supervisor_name?: string;
  team_members: string;
  supervision_date: string;
  status: SupervisionStatus;
  total_score: number;
  compliant_count: number;
  applicable_count: number;
  notes: string;
  finalized_at?: string | null;
  finalized_by?: string | null;
  created_at: string;
  answers?: SupervisionAnswer[];
}

export interface Finding {
  id: string;
  finding_number: string;
  supervision_id: string;
  supervision_number?: string;
  unit_id: string;
  unit_name?: string;
  unit_category?: UnitCategory;
  instrument_item_id?: string | null;
  item_name?: string;
  category_name: string;
  description: string;
  evidence_url: string;
  risk_level: RiskLevel;
  recommendation: string;
  pic_id?: string | null;
  pic_name?: string;
  due_date: string;
  status: FindingStatus;
  created_by?: string | null;
  created_at: string;
  latest_follow_up?: FollowUp | null;
}

export interface FollowUp {
  id: string;
  finding_id: string;
  root_cause: string;
  corrective_action: string;
  preventive_action: string;
  responsible_person: string;
  resources_needed: string;
  target_date: string | null;
  execution_date: string | null;
  evidence_url: string;
  status: 'Dalam Proses' | 'Menunggu Verifikasi' | 'Disetujui' | 'Dikembalikan';
  submitted_by?: string | null;
  submitted_at?: string | null;
  created_at: string;
  verification_logs?: VerificationLog[];
}

export interface VerificationLog {
  id: string;
  follow_up_id: string;
  finding_id: string;
  verifier_id: string;
  verifier_name?: string;
  verification_result: 'Disetujui' | 'Dikembalikan';
  verification_notes: string;
  verified_at: string;
}

export interface AppNotification {
  id: string;
  recipient_id?: string | null;
  recipient_role?: string | null;
  unit_id?: string | null;
  title: string;
  message: string;
  category: string;
  related_table?: string | null;
  related_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_name: string;
  user_role: string;
  action: string;
  table_name: string;
  record_id: string;
  reason: string;
  old_data: unknown;
  new_data: unknown;
  created_at: string;
}

export interface AppSettings {
  id: string;
  hospital_name: string;
  hospital_address: string;
  hospital_city: string;
  accreditation_target: string;
  min_passing_score: number;
  critical_sla_days: number;
  high_sla_days: number;
  medium_sla_days: number;
  low_sla_days: number;
  welcome_image_url?: string;
  welcome_tagline?: string;
  updated_at: string;
}

export interface DashboardFilters {
  year: string;
  month: string;
  periodId: string;
  unitCategory: string;
  unitId: string;
  status: string;
}

export type PageRoute =
  | 'dashboard'
  | 'schedules'
  | 'supervision-input'
  | 'supervision-history'
  | 'master-units'
  | 'instruments'
  | 'categories-periods'
  | 'findings'
  | 'follow-ups'
  | 'verifications'
  | 'monitoring'
  | 'analysis-charts'
  | 'quality-evaluation'
  | 'reports-unit'
  | 'reports-periodic'
  | 'reports-hospital'
  | 'users'
  | 'access-rights'
  | 'app-config'
  | 'audit-trail';
