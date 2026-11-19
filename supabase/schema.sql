-- ============================================================================
-- SISMUT (Sistem Informasi Supervisi Mutu) RSUD Al-Mulk Kota Sukabumi
-- Supabase PostgreSQL Schema, Triggers, Functions, Storage, Realtime, RLS & Seed
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. MASTER UNITS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_code TEXT NOT NULL UNIQUE,
  unit_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN (
      'RAWAT JALAN',
      'RAWAT INAP',
      'INSTALASI GAWAT DARURAT',
      'PENUNJANG MEDIS',
      'PENUNJANG NONMEDIS',
      'MANAJEMEN DAN UNIT LAINNYA'
    )
  ),
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_units_category ON public.units(category);
CREATE INDEX IF NOT EXISTS idx_units_active ON public.units(is_active);

-- ----------------------------------------------------------------------------
-- 2. PROFILES (3 ROLES: SUPER_ADMIN, KOMITE_MUTU, MANAJEMEN)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (
    role IN ('SUPER_ADMIN', 'KOMITE_MUTU', 'MANAJEMEN')
  ),
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  position_title TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_unit ON public.profiles(unit_id);

-- ----------------------------------------------------------------------------
-- 3. SUPERVISION PERIODS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supervision_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'Triwulanan' CHECK (period_type IN ('Bulanan', 'Triwulanan', 'Semesteran', 'Tahunan')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Aktif', 'Selesai', 'Arsip')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_period_dates CHECK (end_date >= start_date)
);

-- ----------------------------------------------------------------------------
-- 4. INSTRUMENTS, CATEGORIES, ITEMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_name TEXT NOT NULL,
  unit_category TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  parent_instrument_id UUID REFERENCES public.instruments(id) ON DELETE SET NULL,
  description TEXT DEFAULT '',
  is_weighted BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instruments_unit_cat ON public.instruments(unit_category);
CREATE INDEX IF NOT EXISTS idx_instruments_active ON public.instruments(is_active);

CREATE TABLE IF NOT EXISTS public.instrument_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inst_cat_instrument ON public.instrument_categories(instrument_id);

CREATE TABLE IF NOT EXISTS public.instrument_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.instrument_categories(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  standard_description TEXT DEFAULT '',
  weight NUMERIC(6,2) NOT NULL DEFAULT 1.00 CHECK (weight > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inst_item_category ON public.instrument_items(category_id);

-- ----------------------------------------------------------------------------
-- 5. SUPERVISION SCHEDULES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supervision_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.supervision_periods(id) ON DELETE RESTRICT,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE RESTRICT,
  supervisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT DEFAULT '09:00',
  team_members TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Terjadwal' CHECK (status IN ('Terjadwal', 'Berlangsung', 'Selesai', 'Ditunda')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. SUPERVISIONS & ANSWERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supervisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervision_number TEXT NOT NULL UNIQUE,
  schedule_id UUID REFERENCES public.supervision_schedules(id) ON DELETE SET NULL,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  period_id UUID NOT NULL REFERENCES public.supervision_periods(id) ON DELETE RESTRICT,
  instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE RESTRICT,
  instrument_version INTEGER NOT NULL DEFAULT 1,
  supervisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_members TEXT DEFAULT '',
  supervision_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'Belum Diperiksa' CHECK (
    status IN ('Belum Diperiksa', 'Sedang Diperiksa', 'Sudah Diperiksa', 'Final')
  ),
  total_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  compliant_count INTEGER NOT NULL DEFAULT 0,
  applicable_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supervisions_unit ON public.supervisions(unit_id);
CREATE INDEX IF NOT EXISTS idx_supervisions_period ON public.supervisions(period_id);
CREATE INDEX IF NOT EXISTS idx_supervisions_status ON public.supervisions(status);
CREATE INDEX IF NOT EXISTS idx_supervisions_date ON public.supervisions(supervision_date);

CREATE TABLE IF NOT EXISTS public.supervision_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervision_id UUID NOT NULL REFERENCES public.supervisions(id) ON DELETE CASCADE,
  instrument_item_id UUID NOT NULL REFERENCES public.instrument_items(id) ON DELETE RESTRICT,
  item_name_snapshot TEXT NOT NULL,
  category_name_snapshot TEXT NOT NULL,
  weight_snapshot NUMERIC(6,2) NOT NULL DEFAULT 1.00,
  answer TEXT CHECK (answer IN ('Sesuai', 'Tidak Sesuai', 'N/A')),
  notes TEXT DEFAULT '',
  supporting_evidence TEXT DEFAULT '',
  evidence_url TEXT DEFAULT '',
  recommendation TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supervision_id, instrument_item_id)
);

CREATE INDEX IF NOT EXISTS idx_answers_supervision ON public.supervision_answers(supervision_id);

-- ----------------------------------------------------------------------------
-- 7. FINDINGS, FOLLOW-UPS & VERIFICATION LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_number TEXT NOT NULL UNIQUE,
  supervision_id UUID NOT NULL REFERENCES public.supervisions(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  instrument_item_id UUID REFERENCES public.instrument_items(id) ON DELETE SET NULL,
  category_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  evidence_url TEXT DEFAULT '',
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Rendah', 'Sedang', 'Tinggi', 'Kritis')),
  recommendation TEXT NOT NULL DEFAULT '',
  pic_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Belum Ditindaklanjuti' CHECK (
    status IN (
      'Belum Ditindaklanjuti',
      'Dalam Proses',
      'Menunggu Verifikasi',
      'Perlu Perbaikan Ulang',
      'Selesai',
      'Terlambat'
    )
  ),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_findings_unit ON public.findings(unit_id);
CREATE INDEX IF NOT EXISTS idx_findings_risk ON public.findings(risk_level);
CREATE INDEX IF NOT EXISTS idx_findings_status ON public.findings(status);
CREATE INDEX IF NOT EXISTS idx_findings_due ON public.findings(due_date);

CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID NOT NULL REFERENCES public.findings(id) ON DELETE CASCADE,
  root_cause TEXT NOT NULL DEFAULT '',
  corrective_action TEXT NOT NULL DEFAULT '',
  preventive_action TEXT NOT NULL DEFAULT '',
  responsible_person TEXT NOT NULL DEFAULT '',
  resources_needed TEXT DEFAULT '',
  target_date DATE,
  execution_date DATE,
  evidence_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Dalam Proses' CHECK (
    status IN ('Dalam Proses', 'Menunggu Verifikasi', 'Disetujui', 'Dikembalikan')
  ),
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followups_finding ON public.follow_ups(finding_id);

CREATE TABLE IF NOT EXISTS public.verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follow_up_id UUID NOT NULL REFERENCES public.follow_ups(id) ON DELETE CASCADE,
  finding_id UUID NOT NULL REFERENCES public.findings(id) ON DELETE CASCADE,
  verifier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verification_result TEXT NOT NULL CHECK (verification_result IN ('Disetujui', 'Dikembalikan')),
  verification_notes TEXT NOT NULL DEFAULT '',
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. NOTIFICATIONS, AUDIT LOGS & APP SETTINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_role TEXT,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'info',
  related_table TEXT,
  related_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL DEFAULT '',
  user_role TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  reason TEXT DEFAULT '',
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_table ON public.audit_logs(table_name, created_at DESC);

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_name TEXT NOT NULL DEFAULT 'RSUD Al-Mulk Kota Sukabumi',
  hospital_address TEXT NOT NULL DEFAULT 'Jl. Pelabuhan II KM. 6, Lembursitu, Kota Sukabumi, Jawa Barat',
  hospital_city TEXT NOT NULL DEFAULT 'Kota Sukabumi',
  accreditation_target TEXT NOT NULL DEFAULT 'Paripurna (KARS / STARKES)',
  min_passing_score NUMERIC(5,2) NOT NULL DEFAULT 80.00,
  critical_sla_days INTEGER NOT NULL DEFAULT 2,
  high_sla_days INTEGER NOT NULL DEFAULT 7,
  medium_sla_days INTEGER NOT NULL DEFAULT 14,
  low_sla_days INTEGER NOT NULL DEFAULT 30,
  welcome_image_url TEXT DEFAULT '/src/assets/images/welcome_hospital_interior_1794923926771.jpg',
  welcome_tagline TEXT DEFAULT 'Mutu Terjaga, Pelayanan Terpercaya',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. AUTOMATIC updated_at TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'units', 'profiles', 'supervision_periods', 'instruments',
    'instrument_categories', 'instrument_items', 'supervision_schedules',
    'supervisions', 'supervision_answers', 'findings', 'follow_ups', 'app_settings'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();', t, t);
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervision_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instrument_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instrument_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervision_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervision_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow full CRUD for authenticated & anon client sessions using the configured Supabase project
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'units', 'profiles', 'supervision_periods', 'instruments',
    'instrument_categories', 'instrument_items', 'supervision_schedules',
    'supervisions', 'supervision_answers', 'findings', 'follow_ups',
    'verification_logs', 'notifications', 'audit_logs', 'app_settings'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "sismut_all_%s" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "sismut_all_%s" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 11. STORAGE BUCKETS & POLICIES
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('supervision-evidence', 'supervision-evidence', true),
  ('followup-evidence', 'followup-evidence', true),
  ('application-assets', 'application-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "storage_sismut_read" ON storage.objects;
CREATE POLICY "storage_sismut_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('supervision-evidence', 'followup-evidence', 'application-assets'));

DROP POLICY IF EXISTS "storage_sismut_write" ON storage.objects;
CREATE POLICY "storage_sismut_write" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id IN ('supervision-evidence', 'followup-evidence', 'application-assets'));

DROP POLICY IF EXISTS "storage_sismut_update" ON storage.objects;
CREATE POLICY "storage_sismut_update" ON storage.objects FOR UPDATE TO anon, authenticated
  USING (bucket_id IN ('supervision-evidence', 'followup-evidence', 'application-assets'));

-- ----------------------------------------------------------------------------
-- 12. REALTIME PUBLICATION
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE
    public.units,
    public.profiles,
    public.supervision_periods,
    public.instruments,
    public.supervisions,
    public.supervision_answers,
    public.findings,
    public.follow_ups,
    public.verification_logs,
    public.notifications,
    public.app_settings;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;
