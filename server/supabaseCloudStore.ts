import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const DEFAULT_SUPABASE_URL = 'https://hqqvbtxfantvoplfcxmt.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcXZidHhmYW50dm9wbGZjeG10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5NjkxODgsImV4cCI6MjExMDU0NTE4OH0.GnZ_o3416AeGCTwaUbqib1FHcRl1aMFkSfcKqT2rfx0';
const DEFAULT_WELCOME_IMAGE =
  'https://hqqvbtxfantvoplfcxmt.supabase.co/storage/v1/object/public/application-assets/1795052367570-36651b18-fd2d-41b5-96e0-0fd02d2303a0-wiwin.png';
const DB_BUCKET = 'sismut-db';
const DB_OBJECT_KEY = 'sismut-cloud-db.json';

export function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return DEFAULT_SUPABASE_URL;
  const cleaned = rawUrl
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/auth\/v1\/?$/i, '')
    .replace(/\/storage\/v1\/?$/i, '')
    .replace(/\/+$/, '');
  return cleaned || DEFAULT_SUPABASE_URL;
}

export function getSupabaseConfig() {
  const rawUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;
  const url = normalizeSupabaseUrl(rawUrl);
  const anonKey = (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY
  ).trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const activeKey = serviceRoleKey || anonKey;
  return {
    url,
    anonKey,
    serviceRoleKey,
    activeKey,
    isConfigured: Boolean(url && activeKey && url.startsWith('http')),
  };
}

let cachedClient: SupabaseClient | null = null;
let cachedClientKey = '';

export function getSupabaseAdminClient(): SupabaseClient {
  const cfg = getSupabaseConfig();
  if (!cfg.isConfigured) {
    throw new Error(
      'Konfigurasi Supabase belum lengkap. Pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY telah diisi.'
    );
  }
  const cacheSig = `${cfg.url}|${cfg.activeKey}`;
  if (!cachedClient || cachedClientKey !== cacheSig) {
    cachedClient = createClient(cfg.url, cfg.activeKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cachedClientKey = cacheSig;
  }
  return cachedClient;
}

export interface SupabaseCloudDatabase {
  version: number;
  updated_at: string;
  settings: any;
  units: any[];
  profiles: any[];
  periods: any[];
  instruments: any[];
  schedules: any[];
  supervisions: any[];
  supervision_answers: Record<string, any[]>;
  findings: any[];
  follow_ups: any[];
  verification_logs: any[];
  notifications: any[];
  audit_logs: any[];
}

export function buildInitialSeedDatabase(): SupabaseCloudDatabase {
  const now = new Date().toISOString();

  const unitSeeds: Array<[string, string, string, string, string]> = [
    ['56bfdf93-52c0-4a0d-9756-9142b5748be2', 'RJ-01', 'Poliklinik Umum', 'RAWAT JALAN', 'Pelayanan pemeriksaan dokter umum rawat jalan'],
    ['c2b54705-a238-4f6a-ad60-854275b10772', 'RJ-02', 'Poliklinik Spesialis', 'RAWAT JALAN', 'Pelayanan poliklinik penyakit dalam, anak, bedah, dan kebidanan'],
    ['6a0584d7-3b27-46c6-b516-43d9387a2460', 'RJ-03', 'Pendaftaran Rawat Jalan', 'RAWAT JALAN', 'Admisi dan registrasi pasien rawat jalan serta verifikasi JKN'],
    ['7f6fb88a-e526-4a62-842d-a9b0ebaa7276', 'RJ-04', 'Rekam Medis Rawat Jalan', 'RAWAT JALAN', 'Pengelolaan berkas dan rekam medis elektronik rawat jalan'],
    ['1b63e34e-77d5-468d-a245-eb414a44d77c', 'RI-01', 'Ruang Perawatan', 'RAWAT INAP', 'Instalasi rawat inap kelas I, II, dan III'],
    ['64c45c50-3c4b-45c5-942c-7aa611748802', 'RI-02', 'Ruang Isolasi', 'RAWAT INAP', 'Ruang perawatan isolasi tekanan negatif dan infeksi menular'],
    ['63cb917b-4176-4a3b-a3e8-1ba954e2bc28', 'RI-03', 'Ruang Perawatan Khusus (ICU/HCU)', 'RAWAT INAP', 'Unit perawatan intensif dan observasi ketat'],
    ['276c2a0d-2f00-465c-96f9-269c0d8d4a02', 'IGD-01', 'IGD', 'INSTALASI GAWAT DARURAT', 'Instalasi Gawat Darurat 24 jam pelayanan kegawatdaruratan'],
    ['1a12e854-8364-4820-b606-f1b9238e15a7', 'IGD-02', 'Area Triase', 'INSTALASI GAWAT DARURAT', 'Area pemilahan kegawatan pasien datang'],
    ['90997e6b-6620-4cf5-835d-69682fb48120', 'IGD-03', 'Area Tindakan dan Observasi', 'INSTALASI GAWAT DARURAT', 'Ruang resusitasi, tindakan bedah minor, dan observasi IGD'],
    ['c29699a2-5c4d-469a-832d-4c5c5059a585', 'PM-01', 'Laboratorium', 'PENUNJANG MEDIS', 'Laboratorium patologi klinik dan mikrobiologi'],
    ['a8f33bc4-68c0-4a8d-9d49-1a55c32fb5a1', 'PM-02', 'Radiologi', 'PENUNJANG MEDIS', 'Instalasi pencitraan diagnostik X-Ray dan USG'],
    ['7f9f2b12-9d72-4a49-8385-351d55e1320b', 'PM-03', 'Farmasi', 'PENUNJANG MEDIS', 'Instalasi farmasi rawat jalan, rawat inap, dan gudang obat'],
    ['2d478577-08d0-4821-8b4d-45283d13702a', 'PM-04', 'CSSD', 'PENUNJANG MEDIS', 'Central Sterile Supply Department / sterilisasi sentral'],
    ['449e46c2-a40a-4a47-9356-03097f365c62', 'PM-05', 'Gizi', 'PENUNJANG MEDIS', 'Instalasi gizi klinik dan penyelenggaraan makanan pasien'],
    ['57e92784-0430-4271-8d0e-331d5269252d', 'PM-06', 'Rekam Medis', 'PENUNJANG MEDIS', 'Unit rekam medis sentral dan pelaporan SIRS'],
    ['13f82112-c777-4f0c-9514-141046717226', 'PM-07', 'Pelayanan Ambulans', 'PENUNJANG MEDIS', 'Pelayanan transportasi rujukan dan evakuasi medis'],
    ['65d91746-352c-46c0-976b-910a914c4257', 'PN-01', 'IPSRS', 'PENUNJANG NONMEDIS', 'Instalasi Pemeliharaan Sarana dan Prasarana Rumah Sakit'],
    ['728a1241-6142-486b-a309-123166709333', 'PN-02', 'Sanitasi dan Kesehatan Lingkungan', 'PENUNJANG NONMEDIS', 'Pengawasan kualitas air, udara, dan kesling rumah sakit'],
    ['971e1214-2010-4c9a-9456-851245632145', 'PN-03', 'Laundry', 'PENUNJANG NONMEDIS', 'Pengelolaan linen bersih dan infeksius rumah sakit'],
    ['32145698-7412-4589-9632-145236987412', 'PN-04', 'Kebersihan', 'PENUNJANG NONMEDIS', 'Layanan kebersihan area klinis dan publik'],
    ['65478932-1452-4369-8521-478963258741', 'PN-05', 'Keamanan', 'PENUNJANG NONMEDIS', 'Sistem pengamanan dan ketertiban lingkungan rumah sakit'],
    ['78945612-3698-4521-7412-589632147852', 'PN-06', 'Pengelolaan Limbah', 'PENUNJANG NONMEDIS', 'Pengelolaan limbah B3 medis padat dan IPAL cair'],
    ['14785236-9632-4587-8521-654123987456', 'PN-07', 'Sarana dan Prasarana', 'PENUNJANG NONMEDIS', 'Pengelolaan utilitas listrik, air, gas medis, dan gedung'],
    ['61f0d938-d124-4ef4-942c-67c338f0a4bb', 'MJ-01', 'Unit Mutu', 'MANAJEMEN DAN UNIT LAINNYA', 'Komite Mutu dan Keselamatan Pasien Rumah Sakit'],
    ['98563214-7412-4589-8523-698741258963', 'MJ-02', 'PPI', 'MANAJEMEN DAN UNIT LAINNYA', 'Komite Pencegahan dan Pengendalian Infeksi'],
    ['36985214-7458-4963-8521-478523698741', 'MJ-03', 'K3RS', 'MANAJEMEN DAN UNIT LAINNYA', 'Komite Kesehatan dan Keselamatan Kerja Rumah Sakit'],
  ];

  const unitIdByCode: Record<string, string> = {};
  const units = unitSeeds.map(([id, unit_code, unit_name, category, description]) => {
    unitIdByCode[unit_code] = id;
    return {
      id,
      unit_code,
      unit_name,
      category,
      description,
      is_active: true,
      created_at: now,
    };
  });

  const profiles = [
    {
      id: '33d465bb-47ff-4642-aa33-286a93802f7a',
      email: 'superadmin@rsudalmulk.go.id',
      full_name: 'Asep Andi J',
      role: 'SUPER_ADMIN',
      unit_id: unitIdByCode['MJ-01'],
      unit_name: 'Unit Mutu',
      position_title: 'Kepala Seksi Penunjang, Mutu, Humas, dan Pemasaran',
      is_active: true,
      created_at: now,
      auth_user_id: 'ae32419a-6863-41ed-a886-df9e103bb48b',
    },
    {
      id: '240c4578-9d88-4012-a81b-ef2543d7186a',
      email: 'komitemutu@rsudalmulk.go.id',
      full_name: 'Wiwin Kusmiati',
      role: 'KOMITE_MUTU',
      unit_id: unitIdByCode['MJ-01'],
      unit_name: 'Unit Mutu',
      position_title: 'Komite Mutu RSUD Al-Mulk',
      is_active: true,
      created_at: now,
      auth_user_id: 'ca32a6bc-5a49-410c-a58d-20647a9db976',
    },
    {
      id: 'c8822749-f09e-4c41-a6e7-a163274a2234',
      email: 'manajemen@rsudalmulk.go.id',
      full_name: 'Dr. Deni Purnama, MKM.,MARS',
      role: 'MANAJEMEN',
      unit_id: null,
      unit_name: null,
      position_title: 'Direktur / Manajemen RSUD Al-Mulk Kota Sukabumi',
      is_active: true,
      created_at: now,
      auth_user_id: '7bfef0ef-c9b6-4fb7-8b6a-36f83688081e',
    },
  ];

  const period1Id = '2b338a09-9e77-4090-9f5c-391192845d72';
  const period2Id = '7a112b08-8c66-4080-8e4b-280081734c61';
  const periods = [
    {
      id: period1Id,
      period_name: 'Triwulan IV 2026 (Okt–Des)',
      period_type: 'Triwulanan',
      start_date: '2026-10-01',
      end_date: '2026-12-31',
      status: 'Aktif',
    },
    {
      id: period2Id,
      period_name: 'Triwulan III 2026 (Jul–Sep)',
      period_type: 'Triwulanan',
      start_date: '2026-07-01',
      end_date: '2026-09-30',
      status: 'Selesai',
    },
  ];

  const inst1Id = 'c3449b10-0f88-5101-0a6d-402203956e83';
  const cat1Id = 'd4550c21-1a99-4212-9b7e-513314067f94';
  const cat2Id = 'e5661d32-2b00-4323-8c8f-624425178a05';
  const cat3Id = 'f6772e43-3c11-4434-9d9a-835536289b99';
  const item1Id = 'f6772e43-3c11-4434-9d9a-735536289b16';
  const item2Id = 'a7883f54-4d22-4545-8e0b-846647390c27';
  const item3Id = 'b8994a65-5e33-4656-9f1c-957758401d38';
  const item1_4Id = 'b8994a65-5e33-4656-9f1c-957758401d39';
  const item1_5Id = 'b8994a65-5e33-4656-9f1c-957758401d40';
  const item1_6Id = 'b8994a65-5e33-4656-9f1c-957758401d41';
  const item4Id = 'c9005b76-6f44-4767-8a2d-068869512e49';
  const item5Id = 'd0116c87-7a55-4878-9b3e-179970623f50';
  const item3_1Id = 'e3016c87-7a55-4878-9b3e-179970623f51';
  const item3_2Id = 'e3026c87-7a55-4878-9b3e-179970623f52';
  const item3_3Id = 'e3036c87-7a55-4878-9b3e-179970623f53';
  const item3_4Id = 'e3046c87-7a55-4878-9b3e-179970623f54';
  const item3_5Id = 'e3056c87-7a55-4878-9b3e-179970623f55';
  const item3_6Id = 'e3066c87-7a55-4878-9b3e-179970623f56';

  const instruments = [
    {
      id: inst1Id,
      instrument_name: 'Instrumen Supervisi Mutu Pelayanan Klinis & Keselamatan Pasien',
      unit_category: 'INSTALASI GAWAT DARURAT',
      version: 1,
      parent_instrument_id: null,
      description: 'Instrumen terpadu SKP, PPI, SOP Klinis, Obat High-Alert, dan Rekam Medis sesuai STARKES',
      is_weighted: true,
      is_active: true,
      created_at: now,
      categories: [
        {
          id: cat1Id,
          instrument_id: inst1Id,
          category_name: 'Sasaran Keselamatan Pasien (SKP)',
          sort_order: 1,
          items: [
            {
              id: item1Id,
              category_id: cat1Id,
              item_name: 'Kepatuhan identifikasi pasien dengan minimal 2 identitas (Nama & Tanggal Lahir/No. RM)',
              standard_description: 'Petugas memverifikasi gelang identitas secara aktif sebelum tindakan/pemberian obat.',
              weight: 2.0,
              is_active: true,
              sort_order: 1,
            },
            {
              id: item2Id,
              category_id: cat1Id,
              item_name: 'Penerapan komunikasi efektif SBAR dan TBAK pada serah terima / instruksi lisan',
              standard_description: 'Dokumentasi stempel Read-Back terisi lengkap dalam 24 jam pada CPPT.',
              weight: 1.5,
              is_active: true,
              sort_order: 2,
            },
            {
              id: item3Id,
              category_id: cat1Id,
              item_name: 'Penandaan dan penyimpanan obat High-Alert & LASA terpisah dengan stiker jelas',
              standard_description: 'Lemari obat emergensi terkunci segel bernomor dan tidak ada elektrolit konsentrat terbuka.',
              weight: 2.0,
              is_active: true,
              sort_order: 3,
            },
            {
              id: item1_4Id,
              category_id: cat1Id,
              item_name: 'Kepastian tepat lokasi, tepat prosedur, dan tepat pasien operasi',
              standard_description: 'Melakukan verifikasi pra-operasi, penandaan lokasi tindakan (site marking), dan time-out sebelum sayatan/tindakan invasif dimulai.',
              weight: 2.0,
              is_active: true,
              sort_order: 4,
            },
            {
              id: item1_5Id,
              category_id: cat1Id,
              item_name: 'Pengurangan risiko infeksi terkait pelayanan kesehatan',
              standard_description: 'Mencegah infeksi nosokomial/HAIs, terutama melalui kepatuhan kebersihan tangan (hand hygiene) dan pencegahan infeksi pada pemasangan alat medis (seperti infus/kateter).',
              weight: 1.5,
              is_active: true,
              sort_order: 5,
            },
            {
              id: item1_6Id,
              category_id: cat1Id,
              item_name: 'Pengurangan risiko pasien jatuh',
              standard_description: 'Melakukan skrining/penilaian risiko jatuh saat masuk, saat kondisi berubah, atau pasca-operasi, serta menerapkan pencegahan sesuai tingkat risiko pasien.',
              weight: 1.5,
              is_active: true,
              sort_order: 6,
            },
          ],
        },
        {
          id: cat2Id,
          instrument_id: inst1Id,
          category_name: 'Pencegahan & Pengendalian Infeksi (PPI) dan Kesiapan Fasilitas',
          sort_order: 2,
          items: [
            {
              id: item4Id,
              category_id: cat2Id,
              item_name: 'Ketersediaan handrub berbasis alkohol di setiap titik perawatan dan kepatuhan 5 momen cuci tangan',
              standard_description: 'Seluruh dispenser terisi, berfungsi baik, dan petugas patuh 6 langkah.',
              weight: 1.5,
              is_active: true,
              sort_order: 1,
            },
            {
              id: item5Id,
              category_id: cat2Id,
              item_name: 'Pemilahan limbah medis tajam (safety box) dan limbah infeksius tidak melebihi 3/4 kapasitas',
              standard_description: 'Safety box tertutup rapat, diberi label tanggal mulai pakai, dan tidak meluber.',
              weight: 1.5,
              is_active: true,
              sort_order: 2,
            },
          ],
        },
        {
          id: cat3Id,
          instrument_id: inst1Id,
          category_name: 'Supervisi Mutu Lainnya',
          sort_order: 3,
          items: [
            {
              id: item3_1Id,
              category_id: cat3Id,
              item_name: 'Kelengkapan rekam medis',
              standard_description: 'Pengisian berkas rekam medis pasien lengkap, akurat, terbaca jelas, dan tepat waktu sesuai standar akreditasi.',
              weight: 1.5,
              is_active: true,
              sort_order: 1,
            },
            {
              id: item3_2Id,
              category_id: cat3Id,
              item_name: 'Kepatuhan SOP',
              standard_description: 'Pelaksanaan tindakan medis, keperawatan, dan pelayanan penunjang sesuai Standar Operasional Prosedur (SOP) yang berlaku.',
              weight: 1.5,
              is_active: true,
              sort_order: 2,
            },
            {
              id: item3_3Id,
              category_id: cat3Id,
              item_name: 'Ketersediaan obat emergensi',
              standard_description: 'Obat-obatan dan alkes emergensi tersedia lengkap sesuai daftar standar, tidak kedaluwarsa, dan troli/kotak emergensi mudah diakses serta tersegel.',
              weight: 2.0,
              is_active: true,
              sort_order: 3,
            },
            {
              id: item3_4Id,
              category_id: cat3Id,
              item_name: 'Kelengkapan alat medis',
              standard_description: 'Peralatan medis di unit pelayanan tersedia lengkap, siap pakai, berfungsi baik, dan memiliki stiker kalibrasi yang masih berlaku.',
              weight: 1.5,
              is_active: true,
              sort_order: 4,
            },
            {
              id: item3_5Id,
              category_id: cat3Id,
              item_name: 'Pelaporan insiden keselamatan pasien',
              standard_description: 'Setiap Insiden Keselamatan Pasien (KTD, KNC, KTC, KPC, Sentinel) dicatat dan dilaporkan ke Komite Mutu maksimal 2x24 jam.',
              weight: 1.5,
              is_active: true,
              sort_order: 5,
            },
            {
              id: item3_6Id,
              category_id: cat3Id,
              item_name: 'Tindak lanjut temuan supervisi',
              standard_description: 'Temuan ketidaksesuaian dari supervisi periode sebelumnya telah dievaluasi dan ditindaklanjuti perbaikannya oleh unit terkait.',
              weight: 1.5,
              is_active: true,
              sort_order: 6,
            },
          ],
        },
      ],
    },
  ];

  return {
    version: 1,
    updated_at: now,
    settings: {
      id: 'ad61028c-6140-4161-935d-734e53810542',
      hospital_name: 'RSUD Al-Mulk Kota Sukabumi',
      hospital_address: 'Jl. Pelabuhan II KM. 6, Lembursitu, Kota Sukabumi, Jawa Barat 43169',
      hospital_city: 'Kota Sukabumi',
      accreditation_target: 'Paripurna (STARKES Kemenkes)',
      min_passing_score: 80.0,
      critical_sla_days: 2,
      high_sla_days: 7,
      medium_sla_days: 14,
      low_sla_days: 30,
      welcome_image_url: DEFAULT_WELCOME_IMAGE,
      welcome_tagline: 'Mutu Terjaga, Pelayanan Terpercaya',
      updated_at: now,
    },
    units,
    profiles,
    periods,
    instruments,
    schedules: [],
    supervisions: [],
    supervision_answers: {},
    findings: [],
    follow_ups: [],
    verification_logs: [],
    notifications: [],
    audit_logs: [
      {
        id: 'l1000001-0000-4000-8000-000000000001',
        user_id: profiles[0].id,
        user_name: profiles[0].full_name,
        user_role: 'SUPER_ADMIN',
        action: 'SUPABASE_CLOUD_INITIALIZED',
        table_name: 'system',
        record_id: 'init',
        reason: 'Inisialisasi penyimpanan penuh pada Supabase Cloud RSUD Al-Mulk',
        old_data: null,
        new_data: { project_storage: 'supabase-cloud' },
        created_at: now,
      },
    ],
  };
}

let inMemoryCache: SupabaseCloudDatabase | null = null;
let initPromise: Promise<SupabaseCloudDatabase> | null = null;

async function ensureSupabaseBuckets(sb: SupabaseClient) {
  try {
    const buckets = [DB_BUCKET, 'supervision-evidence', 'followup-evidence', 'application-assets'];
    const { data: existing } = await sb.storage.listBuckets();
    const existingIds = new Set((existing || []).map((b) => b.id));

    for (const b of buckets) {
      if (!existingIds.has(b)) {
        await sb.storage.createBucket(b, { public: true });
      }
    }
  } catch {
    // Non-fatal when using anon key
  }
}

export async function syncProfilesWithSupabaseAuth(sb: SupabaseClient, profiles: any[]) {
  try {
    const { data: authList, error } = await sb.auth.admin.listUsers();
    if (error || !authList) return;

    const existingByEmail = new Map(
      (authList.users || []).map((u) => [(u.email || '').toLowerCase(), u])
    );

    for (const p of profiles) {
      const email = String(p.email || '').trim().toLowerCase();
      if (!email) continue;
      const existingUser = existingByEmail.get(email);
      const metadata = {
        profile_id: p.id,
        full_name: p.full_name,
        role: p.role,
        unit_id: p.unit_id,
        unit_name: p.unit_name,
        position_title: p.position_title,
        is_active: p.is_active,
      };
      if (!existingUser) {
        const { data: created } = await sb.auth.admin.createUser({
          email,
          password: p.password || 'Sismut2026!',
          email_confirm: true,
          user_metadata: metadata,
        });
        if (created?.user?.id) {
          p.auth_user_id = created.user.id;
        }
      } else {
        p.auth_user_id = existingUser.id;
        await sb.auth.admin.updateUserById(existingUser.id, {
          user_metadata: metadata,
        });
      }
    }
  } catch {
    // Non-fatal if anon key is used instead of service_role
  }
}

export async function saveSupabaseDatabase(db: SupabaseCloudDatabase): Promise<void> {
  const sb = getSupabaseAdminClient();
  db.updated_at = new Date().toISOString();
  inMemoryCache = db;

  const payload = Buffer.from(JSON.stringify(db, null, 2), 'utf-8');
  const { error } = await sb.storage.from(DB_BUCKET).upload(DB_OBJECT_KEY, payload, {
    contentType: 'application/json',
    cacheControl: '0',
    upsert: true,
  });

  if (error) {
    await ensureSupabaseBuckets(sb);
    const retry = await sb.storage.from(DB_BUCKET).upload(DB_OBJECT_KEY, payload, {
      contentType: 'application/json',
      cacheControl: '0',
      upsert: true,
    });
    if (retry.error) {
      console.warn(
        `[Supabase Cloud Store] Peringatan simpan storage (pastikan SUPABASE_SERVICE_ROLE_KEY diatur di Vercel untuk tulis permanen): ${retry.error.message}`
      );
    }
  }
}

export function ensureInstrumentIndicatorsUpToDate(db: SupabaseCloudDatabase): boolean {
  let modified = false;
  const seed = buildInitialSeedDatabase();
  const seedInst = seed.instruments[0];

  if (!Array.isArray(db.instruments) || db.instruments.length === 0) {
    db.instruments = seed.instruments;
    return true;
  }

  const targetInst = db.instruments[0];
  if (!Array.isArray(targetInst.categories)) {
    targetInst.categories = seedInst.categories;
    return true;
  }

  for (const seedCat of seedInst.categories) {
    let existingCat = targetInst.categories.find(
      (c: any) =>
        c.id === seedCat.id ||
        String(c.category_name || '').toLowerCase() ===
          String(seedCat.category_name || '').toLowerCase()
    );

    if (!existingCat) {
      targetInst.categories.push(seedCat);
      modified = true;
      continue;
    }

    if (!Array.isArray(existingCat.items)) {
      existingCat.items = [...seedCat.items];
      modified = true;
      continue;
    }

    for (const seedItem of seedCat.items) {
      const hasItem = existingCat.items.some(
        (it: any) =>
          it.id === seedItem.id ||
          String(it.item_name || '').toLowerCase() ===
            String(seedItem.item_name || '').toLowerCase()
      );
      if (!hasItem) {
        existingCat.items.push({
          ...seedItem,
          category_id: existingCat.id,
        });
        modified = true;
      }
    }
  }

  // Sinkronkan data supervisi dengan data temuan monitoring:
  // Jika supervisi memiliki jawaban "Tidak Sesuai" (atau berasal dari data contoh SUP-202611-101 / SUP-202611-102)
  // tetapi seluruh data temuan monitoring-nya sudah dihapus, hapus juga record supervisi tersebut
  // agar capaian di Dashboard 100% berkesesuaian dengan data di Monitoring.
  if (Array.isArray(db.supervisions) && db.supervisions.length > 0) {
    const activeFindingSupIds = new Set(
      (db.findings || []).map((f: any) => f.supervision_id).filter(Boolean)
    );
    const beforeLen = db.supervisions.length;
    db.supervisions = db.supervisions.filter((s: any) => {
      const isLegacySeed =
        s.supervision_number === 'SUP-202611-101' || s.supervision_number === 'SUP-202611-102';
      const hadNonCompliant =
        Number(s.compliant_count || 0) < Number(s.applicable_count || 0) ||
        (db.supervision_answers?.[s.id] || []).some((a: any) => a.answer === 'Tidak Sesuai');

      if ((isLegacySeed || hadNonCompliant) && !activeFindingSupIds.has(s.id)) {
        if (db.supervision_answers && db.supervision_answers[s.id]) {
          delete db.supervision_answers[s.id];
        }
        return false;
      }
      return true;
    });
    if (db.supervisions.length !== beforeLen) {
      modified = true;
    }
  }

  return modified;
}

export async function loadSupabaseDatabase(forceRefresh = false): Promise<SupabaseCloudDatabase> {
  if (inMemoryCache && !forceRefresh) {
    return inMemoryCache;
  }
  if (initPromise && !forceRefresh) {
    return initPromise;
  }

  initPromise = (async () => {
    const sb = getSupabaseAdminClient();
    const cfg = getSupabaseConfig();
    await ensureSupabaseBuckets(sb);

    // Try downloading from Supabase Storage SDK first, then public URL fallback
    const { data: blob, error } = await sb.storage.from(DB_BUCKET).download(DB_OBJECT_KEY);

    if (!error && blob) {
      try {
        const text = await blob.text();
        const parsed = JSON.parse(text) as SupabaseCloudDatabase;
        let needsSave = ensureInstrumentIndicatorsUpToDate(parsed);
        if (!Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
          const seed = buildInitialSeedDatabase();
          parsed.profiles = seed.profiles;
          needsSave = true;
        }
        await syncProfilesWithSupabaseAuth(sb, parsed.profiles);
        if (needsSave) {
          await saveSupabaseDatabase(parsed);
        }
        inMemoryCache = parsed;
        return parsed;
      } catch {
        // Re-initialize if corrupted
      }
    }

    // Fallback: try public fetch with cache-busting query param
    try {
      const publicUrl = `${cfg.url}/storage/v1/object/public/${DB_BUCKET}/${DB_OBJECT_KEY}?t=${Date.now()}`;
      const res = await fetch(publicUrl);
      if (res.ok) {
        const parsed = (await res.json()) as SupabaseCloudDatabase;
        if (parsed && Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
          const needsSave = ensureInstrumentIndicatorsUpToDate(parsed);
          if (needsSave) {
            try {
              await saveSupabaseDatabase(parsed);
            } catch {
              // ignore if read-only
            }
          }
          inMemoryCache = parsed;
          return parsed;
        }
      }
    } catch {
      // Proceed to seed
    }

    const initialDb = buildInitialSeedDatabase();
    await syncProfilesWithSupabaseAuth(sb, initialDb.profiles);
    try {
      await saveSupabaseDatabase(initialDb);
    } catch {
      // Non-fatal if anon key cannot write without service_role
    }
    inMemoryCache = initialDb;
    return initialDb;
  })();

  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
}

export async function createSupabaseAuthUser(profile: any, password?: string) {
  try {
    const sb = getSupabaseAdminClient();
    const { data } = await sb.auth.admin.createUser({
      email: profile.email,
      password: password || 'Sismut2026!',
      email_confirm: true,
      user_metadata: {
        profile_id: profile.id,
        full_name: profile.full_name,
        role: profile.role,
        unit_id: profile.unit_id,
        unit_name: profile.unit_name,
        position_title: profile.position_title,
        is_active: profile.is_active,
      },
    });
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

export async function updateSupabaseAuthUser(profile: any) {
  try {
    const sb = getSupabaseAdminClient();
    let targetId = profile.auth_user_id;
    if (!targetId) {
      const { data: list } = await sb.auth.admin.listUsers();
      const match = (list?.users || []).find(
        (u) => (u.email || '').toLowerCase() === String(profile.email || '').toLowerCase()
      );
      targetId = match?.id;
    }
    if (targetId) {
      await sb.auth.admin.updateUserById(targetId, {
        user_metadata: {
          profile_id: profile.id,
          full_name: profile.full_name,
          role: profile.role,
          unit_id: profile.unit_id,
          unit_name: profile.unit_name,
          position_title: profile.position_title,
          is_active: profile.is_active,
        },
      });
    }
  } catch {
    // Non-fatal
  }
}

export async function deleteSupabaseAuthUser(email: string, authUserId?: string) {
  try {
    const sb = getSupabaseAdminClient();
    if (authUserId) {
      await sb.auth.admin.deleteUser(authUserId);
      return;
    }
    const { data: list } = await sb.auth.admin.listUsers();
    const match = (list?.users || []).find(
      (u) => (u.email || '').toLowerCase() === email.toLowerCase()
    );
    if (match) {
      await sb.auth.admin.deleteUser(match.id);
    }
  } catch {
    // Ignore if user wasn't in auth.users
  }
}

export async function uploadToSupabaseBucket(
  bucket: 'supervision-evidence' | 'followup-evidence' | 'application-assets',
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const sb = getSupabaseAdminClient();
  await ensureSupabaseBuckets(sb);

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const objectPath = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const { error } = await sb.storage.from(bucket).upload(objectPath, buffer, {
    contentType: contentType || 'application/octet-stream',
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    throw new Error(`Gagal mengunggah file ke Supabase Storage (${bucket}): ${error.message}`);
  }

  const { data: pub } = sb.storage.from(bucket).getPublicUrl(objectPath);
  if (pub?.publicUrl) {
    return pub.publicUrl;
  }

  const { data: signed, error: signErr } = await sb.storage
    .from(bucket)
    .createSignedUrl(objectPath, 60 * 60 * 24 * 365);
  if (signErr || !signed?.signedUrl) {
    throw new Error(`Gagal membuat URL dari Supabase Storage: ${signErr?.message || ''}`);
  }
  return signed.signedUrl;
}
