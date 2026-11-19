-- ============================================================================
-- SISMUT RSUD AL-MULK KOTA SUKABUMI
-- FULL DATA IMPORT & STORAGE POLICY SCRIPT FOR SUPABASE
-- ============================================================================

-- 1. Pastikan Storage Buckets Publik Tersedia dan Mengizinkan Akses Aplikasi
insert into storage.buckets (id, name, public)
values
  ('sismut-db', 'sismut-db', true),
  ('supervision-evidence', 'supervision-evidence', true),
  ('followup-evidence', 'followup-evidence', true),
  ('application-assets', 'application-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "sismut_public_read" on storage.objects;
create policy "sismut_public_read"
on storage.objects for select
to public
using (bucket_id in ('sismut-db', 'supervision-evidence', 'followup-evidence', 'application-assets'));

drop policy if exists "sismut_public_write" on storage.objects;
create policy "sismut_public_write"
on storage.objects for insert
to public
with check (bucket_id in ('sismut-db', 'supervision-evidence', 'followup-evidence', 'application-assets'));

drop policy if exists "sismut_public_update" on storage.objects;
create policy "sismut_public_update"
on storage.objects for update
to public
using (bucket_id in ('sismut-db', 'supervision-evidence', 'followup-evidence', 'application-assets'));

-- 2. Tabel Master Unit Pelayanan (27 Unit RSUD Al-Mulk Kota Sukabumi)
create table if not exists public.units (
  id uuid primary key,
  unit_code text unique not null,
  unit_name text not null,
  category text not null,
  description text default '',
  is_active boolean default true,
  created_at timestamptz default now()
);

insert into public.units (id, unit_code, unit_name, category, description, is_active)
values
  ('56bfdf93-52c0-4a0d-9756-9142b5748be2', 'RJ-01', 'Poliklinik Umum', 'RAWAT JALAN', 'Pelayanan pemeriksaan dokter umum rawat jalan', true),
  ('c2b54705-a238-4f6a-ad60-854275b10772', 'RJ-02', 'Poliklinik Spesialis', 'RAWAT JALAN', 'Pelayanan poliklinik penyakit dalam, anak, bedah, dan kebidanan', true),
  ('6a0584d7-3b27-46c6-b516-43d9387a2460', 'RJ-03', 'Pendaftaran Rawat Jalan', 'RAWAT JALAN', 'Admisi dan registrasi pasien rawat jalan serta verifikasi JKN', true),
  ('7f6fb88a-e526-4a62-842d-a9b0ebaa7276', 'RJ-04', 'Rekam Medis Rawat Jalan', 'RAWAT JALAN', 'Pengelolaan berkas dan rekam medis elektronik rawat jalan', true),
  ('1b63e34e-77d5-468d-a245-eb414a44d77c', 'RI-01', 'Ruang Perawatan', 'RAWAT INAP', 'Instalasi rawat inap kelas I, II, dan III', true),
  ('64c45c50-3c4b-45c5-942c-7aa611748802', 'RI-02', 'Ruang Isolasi', 'RAWAT INAP', 'Ruang perawatan isolasi tekanan negatif dan infeksi menular', true),
  ('63cb917b-4176-4a3b-a3e8-1ba954e2bc28', 'RI-03', 'Ruang Perawatan Khusus (ICU/HCU)', 'RAWAT INAP', 'Unit perawatan intensif dan observasi ketat', true),
  ('276c2a0d-2f00-465c-96f9-269c0d8d4a02', 'IGD-01', 'IGD', 'INSTALASI GAWAT DARURAT', 'Instalasi Gawat Darurat 24 jam pelayanan kegawatdaruratan', true),
  ('1a12e854-8364-4820-b606-f1b9238e15a7', 'IGD-02', 'Area Triase', 'INSTALASI GAWAT DARURAT', 'Area pemilahan kegawatan pasien datang', true),
  ('90997e6b-6620-4cf5-835d-69682fb48120', 'IGD-03', 'Area Tindakan dan Observasi', 'INSTALASI GAWAT DARURAT', 'Ruang resusitasi, tindakan bedah minor, dan observasi IGD', true),
  ('c29699a2-5c4d-469a-832d-4c5c5059a585', 'PM-01', 'Laboratorium', 'PENUNJANG MEDIS', 'Laboratorium patologi klinik dan mikrobiologi', true),
  ('a8f33bc4-68c0-4a8d-9d49-1a55c32fb5a1', 'PM-02', 'Radiologi', 'PENUNJANG MEDIS', 'Instalasi pencitraan diagnostik X-Ray dan USG', true),
  ('7f9f2b12-9d72-4a49-8385-351d55e1320b', 'PM-03', 'Farmasi', 'PENUNJANG MEDIS', 'Instalasi farmasi rawat jalan, rawat inap, dan gudang obat', true),
  ('2d478577-08d0-4821-8b4d-45283d13702a', 'PM-04', 'CSSD', 'PENUNJANG MEDIS', 'Central Sterile Supply Department / sterilisasi sentral', true),
  ('449e46c2-a40a-4a47-9356-03097f365c62', 'PM-05', 'Gizi', 'PENUNJANG MEDIS', 'Instalasi gizi klinik dan penyelenggaraan makanan pasien', true),
  ('57e92784-0430-4271-8d0e-331d5269252d', 'PM-06', 'Rekam Medis', 'PENUNJANG MEDIS', 'Unit rekam medis sentral dan pelaporan SIRS', true),
  ('13f82112-c777-4f0c-9514-141046717226', 'PM-07', 'Pelayanan Ambulans', 'PENUNJANG MEDIS', 'Pelayanan transportasi rujukan dan evakuasi medis', true),
  ('65d91746-352c-46c0-976b-910a914c4257', 'PN-01', 'IPSRS', 'PENUNJANG NONMEDIS', 'Instalasi Pemeliharaan Sarana dan Prasarana Rumah Sakit', true),
  ('728a1241-6142-486b-a309-123166709333', 'PN-02', 'Sanitasi dan Kesehatan Lingkungan', 'PENUNJANG NONMEDIS', 'Pengawasan kualitas air, udara, dan kesling rumah sakit', true),
  ('971e1214-2010-4c9a-9456-851245632145', 'PN-03', 'Laundry', 'PENUNJANG NONMEDIS', 'Pengelolaan linen bersih dan infeksius rumah sakit', true),
  ('32145698-7412-4589-9632-145236987412', 'PN-04', 'Kebersihan', 'PENUNJANG NONMEDIS', 'Layanan kebersihan area klinis dan publik', true),
  ('65478932-1452-4369-8521-478963258741', 'PN-05', 'Keamanan', 'PENUNJANG NONMEDIS', 'Sistem pengamanan dan ketertiban lingkungan rumah sakit', true),
  ('78945612-3698-4521-7412-589632147852', 'PN-06', 'Pengelolaan Limbah', 'PENUNJANG NONMEDIS', 'Pengelolaan limbah B3 medis padat dan IPAL cair', true),
  ('14785236-9632-4587-8521-654123987456', 'PN-07', 'Sarana dan Prasarana', 'PENUNJANG NONMEDIS', 'Pengelolaan utilitas listrik, air, gas medis, dan gedung', true),
  ('61f0d938-d124-4ef4-942c-67c338f0a4bb', 'MJ-01', 'Unit Mutu', 'MANAJEMEN DAN UNIT LAINNYA', 'Komite Mutu dan Keselamatan Pasien Rumah Sakit', true),
  ('98563214-7412-4589-8523-698741258963', 'MJ-02', 'PPI', 'MANAJEMEN DAN UNIT LAINNYA', 'Komite Pencegahan dan Pengendalian Infeksi', true),
  ('36985214-7458-4963-8521-478523698741', 'MJ-03', 'K3RS', 'MANAJEMEN DAN UNIT LAINNYA', 'Komite Kesehatan dan Keselamatan Kerja Rumah Sakit', true)
on conflict (unit_code) do update
set unit_name = excluded.unit_name,
    category = excluded.category,
    description = excluded.description,
    is_active = excluded.is_active;

-- 3. Tabel Profil Akun Petugas RSUD Al-Mulk
create table if not exists public.profiles (
  id uuid primary key,
  email text unique not null,
  full_name text not null,
  role text not null,
  unit_id uuid references public.units(id) on delete set null,
  unit_name text,
  position_title text default '',
  is_active boolean default true,
  created_at timestamptz default now()
);

insert into public.profiles (id, email, full_name, role, unit_id, unit_name, position_title, is_active)
values
  ('33d465bb-47ff-4642-aa33-286a93802f7a', 'superadmin@rsudalmulk.go.id', 'Asep Andi J', 'SUPER_ADMIN', '61f0d938-d124-4ef4-942c-67c338f0a4bb', 'Unit Mutu', 'Kepala Seksi Penunjang, Mutu, Humas, dan Pemasaran', true),
  ('240c4578-9d88-4012-a81b-ef2543d7186a', 'komitemutu@rsudalmulk.go.id', 'Wiwin Kusmiati', 'KOMITE_MUTU', '61f0d938-d124-4ef4-942c-67c338f0a4bb', 'Unit Mutu', 'Komite Mutu RSUD Al-Mulk', true),
  ('c8822749-f09e-4c41-a6e7-a163274a2234', 'manajemen@rsudalmulk.go.id', 'Dr. Deni Purnama, MKM.,MARS', 'MANAJEMEN', null, null, 'Direktur / Manajemen RSUD Al-Mulk Kota Sukabumi', true)
on conflict (email) do update
set full_name = excluded.full_name,
    role = excluded.role,
    unit_id = excluded.unit_id,
    unit_name = excluded.unit_name,
    position_title = excluded.position_title,
    is_active = excluded.is_active;

-- 4. Tabel Pengaturan Aplikasi & Welcome Screen
create table if not exists public.app_settings (
  id uuid primary key,
  hospital_name text not null,
  hospital_address text not null,
  hospital_city text not null,
  accreditation_target text not null,
  min_passing_score numeric(5,2) default 80.00,
  critical_sla_days int default 2,
  high_sla_days int default 7,
  medium_sla_days int default 14,
  low_sla_days int default 30,
  welcome_image_url text,
  welcome_tagline text,
  updated_at timestamptz default now()
);

insert into public.app_settings (
  id, hospital_name, hospital_address, hospital_city, accreditation_target,
  min_passing_score, critical_sla_days, high_sla_days, medium_sla_days, low_sla_days,
  welcome_image_url, welcome_tagline
)
values (
  'ad61028c-6140-4161-935d-734e53810542',
  'RSUD Al-Mulk Kota Sukabumi',
  'Jl. Pelabuhan II KM. 6, Lembursitu, Kota Sukabumi, Jawa Barat 43169',
  'Kota Sukabumi',
  'Paripurna (STARKES Kemenkes)',
  80.00, 2, 7, 14, 30,
  'https://hqqvbtxfantvoplfcxmt.supabase.co/storage/v1/object/public/application-assets/1795052367570-36651b18-fd2d-41b5-96e0-0fd02d2303a0-wiwin.png',
  'Mutu Terjaga, Pelayanan Terpercaya'
)
on conflict (id) do update
set hospital_name = excluded.hospital_name,
    welcome_image_url = excluded.welcome_image_url,
    welcome_tagline = excluded.welcome_tagline,
    updated_at = now();
