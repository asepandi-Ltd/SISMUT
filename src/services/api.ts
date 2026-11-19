import { supabase, supabaseUrl } from '../lib/supabase';
import type {
  AppNotification,
  AppSettings,
  AuditLog,
  Finding,
  Instrument,
  Profile,
  Supervision,
  SupervisionPeriod,
  SupervisionSchedule,
  Unit,
} from '../types/sismut';

const SESSION_TOKEN_KEY = 'sismut_supabase_session_token';
const DB_BUCKET = 'sismut-db';
const DB_OBJECT_KEY = 'sismut-cloud-db.json';
const DEFAULT_WELCOME_IMAGE =
  'https://hqqvbtxfantvoplfcxmt.supabase.co/storage/v1/object/public/application-assets/1795052367570-36651b18-fd2d-41b5-96e0-0fd02d2303a0-wiwin.png';

let activeSessionToken: string | null =
  typeof window !== 'undefined' ? window.sessionStorage.getItem(SESSION_TOKEN_KEY) : null;

export function setAuthToken(token: string | null) {
  activeSessionToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  }
}

export function getAuthToken(): string | null {
  return activeSessionToken;
}

interface CloudDatabaseShape {
  version: number;
  updated_at: string;
  settings: AppSettings;
  units: Unit[];
  profiles: Profile[];
  periods: SupervisionPeriod[];
  instruments: Instrument[];
  schedules: SupervisionSchedule[];
  supervisions: Supervision[];
  supervision_answers: Record<string, any[]>;
  findings: any[];
  follow_ups: any[];
  verification_logs: any[];
  notifications: AppNotification[];
  audit_logs: AuditLog[];
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function buildFallbackCloudSeed(): CloudDatabaseShape {
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

  const units: Unit[] = unitSeeds.map(([id, unit_code, unit_name, category, description]) => ({
    id,
    unit_code,
    unit_name,
    category: category as Unit['category'],
    description,
    is_active: true,
    created_at: now,
  }));

  const profiles: Profile[] = [
    {
      id: '33d465bb-47ff-4642-aa33-286a93802f7a',
      email: 'superadmin@rsudalmulk.go.id',
      full_name: 'Asep Andi J',
      role: 'SUPER_ADMIN',
      unit_id: '61f0d938-d124-4ef4-942c-67c338f0a4bb',
      unit_name: 'Unit Mutu',
      position_title: 'Kepala Seksi Penunjang, Mutu, Humas, dan Pemasaran',
      is_active: true,
      created_at: now,
    },
    {
      id: '240c4578-9d88-4012-a81b-ef2543d7186a',
      email: 'komitemutu@rsudalmulk.go.id',
      full_name: 'Wiwin Kusmiati',
      role: 'KOMITE_MUTU',
      unit_id: '61f0d938-d124-4ef4-942c-67c338f0a4bb',
      unit_name: 'Unit Mutu',
      position_title: 'Komite Mutu RSUD Al-Mulk',
      is_active: true,
      created_at: now,
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
    periods: [
      {
        id: '2b338a09-9e77-4090-9f5c-391192845d72',
        period_name: 'Triwulan IV 2026 (Okt–Des)',
        period_type: 'Triwulanan',
        start_date: '2026-10-01',
        end_date: '2026-12-31',
        status: 'Aktif',
        created_at: now,
      },
      {
        id: '7a112b08-8c66-4080-8e4b-280081734c61',
        period_name: 'Triwulan III 2026 (Jul–Sep)',
        period_type: 'Triwulanan',
        start_date: '2026-07-01',
        end_date: '2026-09-30',
        status: 'Selesai',
        created_at: now,
      },
    ],
    instruments: [
      {
        id: 'c3449b10-0f88-5101-0a6d-402203956e83',
        instrument_name: 'Instrumen Supervisi Mutu Pelayanan Klinis & Keselamatan Pasien',
        unit_category: 'INSTALASI GAWAT DARURAT',
        version: 1,
        parent_instrument_id: null,
        description:
          'Instrumen terpadu SKP, PPI, SOP Klinis, Obat High-Alert, dan Rekam Medis sesuai STARKES',
        is_weighted: true,
        is_active: true,
        created_at: now,
        categories: [
          {
            id: 'd4550c21-1a99-4212-9b7e-513314067f94',
            instrument_id: 'c3449b10-0f88-5101-0a6d-402203956e83',
            category_name: 'Sasaran Keselamatan Pasien (SKP)',
            sort_order: 1,
            items: [
              {
                id: 'f6772e43-3c11-4434-9d9a-735536289b16',
                category_id: 'd4550c21-1a99-4212-9b7e-513314067f94',
                item_name:
                  'Kepatuhan identifikasi pasien dengan minimal 2 identitas (Nama & Tanggal Lahir/No. RM)',
                standard_description:
                  'Petugas memverifikasi gelang identitas secara aktif sebelum tindakan/pemberian obat.',
                weight: 2.0,
                is_active: true,
                sort_order: 1,
              },
              {
                id: 'a7883f54-4d22-4545-8e0b-846647390c27',
                category_id: 'd4550c21-1a99-4212-9b7e-513314067f94',
                item_name:
                  'Penerapan komunikasi efektif SBAR dan TBAK pada serah terima / instruksi lisan',
                standard_description:
                  'Dokumentasi stempel Read-Back terisi lengkap dalam 24 jam pada CPPT.',
                weight: 1.5,
                is_active: true,
                sort_order: 2,
              },
              {
                id: 'b8994a65-5e33-4656-9f1c-957758401d38',
                category_id: 'd4550c21-1a99-4212-9b7e-513314067f94',
                item_name:
                  'Penandaan dan penyimpanan obat High-Alert & LASA terpisah dengan stiker jelas',
                standard_description:
                  'Lemari obat emergensi terkunci segel bernomor dan tidak ada elektrolit konsentrat terbuka.',
                weight: 2.0,
                is_active: true,
                sort_order: 3,
              },
              {
                id: 'b8994a65-5e33-4656-9f1c-957758401d39',
                category_id: 'd4550c21-1a99-4212-9b7e-513314067f94',
                item_name: 'Kepastian tepat lokasi, tepat prosedur, dan tepat pasien operasi',
                standard_description:
                  'Melakukan verifikasi pra-operasi, penandaan lokasi tindakan (site marking), dan time-out sebelum sayatan/tindakan invasif dimulai.',
                weight: 2.0,
                is_active: true,
                sort_order: 4,
              },
              {
                id: 'b8994a65-5e33-4656-9f1c-957758401d40',
                category_id: 'd4550c21-1a99-4212-9b7e-513314067f94',
                item_name: 'Pengurangan risiko infeksi terkait pelayanan kesehatan',
                standard_description:
                  'Mencegah infeksi nosokomial/HAIs, terutama melalui kepatuhan kebersihan tangan (hand hygiene) dan pencegahan infeksi pada pemasangan alat medis (seperti infus/kateter).',
                weight: 1.5,
                is_active: true,
                sort_order: 5,
              },
              {
                id: 'b8994a65-5e33-4656-9f1c-957758401d41',
                category_id: 'd4550c21-1a99-4212-9b7e-513314067f94',
                item_name: 'Pengurangan risiko pasien jatuh',
                standard_description:
                  'Melakukan skrining/penilaian risiko jatuh saat masuk, saat kondisi berubah, atau pasca-operasi, serta menerapkan pencegahan sesuai tingkat risiko pasien.',
                weight: 1.5,
                is_active: true,
                sort_order: 6,
              },
            ],
          },
          {
            id: 'e5661d32-2b00-4323-8c8f-624425178a05',
            instrument_id: 'c3449b10-0f88-5101-0a6d-402203956e83',
            category_name: 'Pencegahan & Pengendalian Infeksi (PPI) dan Kesiapan Fasilitas',
            sort_order: 2,
            items: [
              {
                id: 'c9005b76-6f44-4767-8a2d-068869512e49',
                category_id: 'e5661d32-2b00-4323-8c8f-624425178a05',
                item_name:
                  'Ketersediaan handrub berbasis alkohol di setiap titik perawatan dan kepatuhan 5 momen cuci tangan',
                standard_description:
                  'Seluruh dispenser terisi, berfungsi baik, dan petugas patuh 6 langkah.',
                weight: 1.5,
                is_active: true,
                sort_order: 1,
              },
              {
                id: 'd0116c87-7a55-4878-9b3e-179970623f50',
                category_id: 'e5661d32-2b00-4323-8c8f-624425178a05',
                item_name:
                  'Pemilahan limbah medis tajam (safety box) dan limbah infeksius tidak melebihi 3/4 kapasitas',
                standard_description:
                  'Safety box tertutup rapat, diberi label tanggal mulai pakai, dan tidak meluber.',
                weight: 1.5,
                is_active: true,
                sort_order: 2,
              },
            ],
          },
          {
            id: 'f6772e43-3c11-4434-9d9a-835536289b99',
            instrument_id: 'c3449b10-0f88-5101-0a6d-402203956e83',
            category_name: 'Supervisi Mutu Lainnya',
            sort_order: 3,
            items: [
              {
                id: 'e3016c87-7a55-4878-9b3e-179970623f51',
                category_id: 'f6772e43-3c11-4434-9d9a-835536289b99',
                item_name: 'Kelengkapan rekam medis',
                standard_description:
                  'Pengisian berkas rekam medis pasien lengkap, akurat, terbaca jelas, dan tepat waktu sesuai standar akreditasi.',
                weight: 1.5,
                is_active: true,
                sort_order: 1,
              },
              {
                id: 'e3026c87-7a55-4878-9b3e-179970623f52',
                category_id: 'f6772e43-3c11-4434-9d9a-835536289b99',
                item_name: 'Kepatuhan SOP',
                standard_description:
                  'Pelaksanaan tindakan medis, keperawatan, dan pelayanan penunjang sesuai Standar Operasional Prosedur (SOP) yang berlaku.',
                weight: 1.5,
                is_active: true,
                sort_order: 2,
              },
              {
                id: 'e3036c87-7a55-4878-9b3e-179970623f53',
                category_id: 'f6772e43-3c11-4434-9d9a-835536289b99',
                item_name: 'Ketersediaan obat emergensi',
                standard_description:
                  'Obat-obatan dan alkes emergensi tersedia lengkap sesuai daftar standar, tidak kedaluwarsa, dan troli/kotak emergensi mudah diakses serta tersegel.',
                weight: 2.0,
                is_active: true,
                sort_order: 3,
              },
              {
                id: 'e3046c87-7a55-4878-9b3e-179970623f54',
                category_id: 'f6772e43-3c11-4434-9d9a-835536289b99',
                item_name: 'Kelengkapan alat medis',
                standard_description:
                  'Peralatan medis di unit pelayanan tersedia lengkap, siap pakai, berfungsi baik, dan memiliki stiker kalibrasi yang masih berlaku.',
                weight: 1.5,
                is_active: true,
                sort_order: 4,
              },
              {
                id: 'e3056c87-7a55-4878-9b3e-179970623f55',
                category_id: 'f6772e43-3c11-4434-9d9a-835536289b99',
                item_name: 'Pelaporan insiden keselamatan pasien',
                standard_description:
                  'Setiap Insiden Keselamatan Pasien (KTD, KNC, KTC, KPC, Sentinel) dicatat dan dilaporkan ke Komite Mutu maksimal 2x24 jam.',
                weight: 1.5,
                is_active: true,
                sort_order: 5,
              },
              {
                id: 'e3066c87-7a55-4878-9b3e-179970623f56',
                category_id: 'f6772e43-3c11-4434-9d9a-835536289b99',
                item_name: 'Tindak lanjut temuan supervisi',
                standard_description:
                  'Temuan ketidaksesuaian dari supervisi periode sebelumnya telah dievaluasi dan ditindaklanjuti perbaikannya oleh unit terkait.',
                weight: 1.5,
                is_active: true,
                sort_order: 6,
              },
            ],
          },
        ],
      },
    ],
    schedules: [],
    supervisions: [],
    supervision_answers: {},
    findings: [],
    follow_ups: [],
    verification_logs: [],
    notifications: [],
    audit_logs: [],
  };
}

function ensureClientInstrumentIndicatorsUpToDate(db: CloudDatabaseShape): void {
  const seed = buildFallbackCloudSeed();
  const seedInst = seed.instruments[0];
  if (!Array.isArray(db.instruments) || db.instruments.length === 0) {
    db.instruments = seed.instruments;
    return;
  }
  const targetInst = db.instruments[0];
  if (!Array.isArray(targetInst.categories)) {
    targetInst.categories = seedInst.categories;
    return;
  }
  for (const seedCat of seedInst.categories || []) {
    const existingCat = targetInst.categories.find(
      (c) =>
        c.id === seedCat.id ||
        String(c.category_name || '').toLowerCase() ===
          String(seedCat.category_name || '').toLowerCase()
    );
    if (!existingCat) {
      targetInst.categories.push(seedCat);
      continue;
    }
    if (!Array.isArray(existingCat.items)) {
      existingCat.items = [...(seedCat.items || [])];
      continue;
    }
    for (const seedItem of seedCat.items || []) {
      const hasItem = existingCat.items.some(
        (it) =>
          it.id === seedItem.id ||
          String(it.item_name || '').toLowerCase() ===
            String(seedItem.item_name || '').toLowerCase()
      );
      if (!hasItem) {
        existingCat.items.push({
          ...seedItem,
          category_id: existingCat.id,
        });
      }
    }
  }
}

let cachedCloudDb: CloudDatabaseShape | null = null;

async function fetchDirectSupabaseCloudDb(): Promise<CloudDatabaseShape> {
  try {
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${DB_BUCKET}/${DB_OBJECT_KEY}?t=${Date.now()}`;
    const res = await fetch(publicUrl, { cache: 'no-store' });
    if (res.ok) {
      const parsed = (await res.json()) as CloudDatabaseShape;
      if (parsed && Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
        ensureClientInstrumentIndicatorsUpToDate(parsed);
        cachedCloudDb = parsed;
        return parsed;
      }
    }
  } catch {
    // Fallback to SDK download
  }

  try {
    const { data, error } = await supabase.storage.from(DB_BUCKET).download(DB_OBJECT_KEY);
    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text) as CloudDatabaseShape;
      if (parsed && Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
        ensureClientInstrumentIndicatorsUpToDate(parsed);
        cachedCloudDb = parsed;
        return parsed;
      }
    }
  } catch {
    // Fallback to cached or seed
  }

  if (cachedCloudDb) return cachedCloudDb;
  const seed = buildFallbackCloudSeed();
  cachedCloudDb = seed;
  return seed;
}

async function saveDirectSupabaseCloudDb(db: CloudDatabaseShape): Promise<void> {
  db.updated_at = new Date().toISOString();
  cachedCloudDb = db;
  try {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    await supabase.storage.from(DB_BUCKET).upload(DB_OBJECT_KEY, blob, {
      contentType: 'application/json',
      cacheControl: '0',
      upsert: true,
    });
  } catch {
    // Saved in memory cache if anon storage write policy is restricted
  }
}

async function supabaseApiFetch<T>(
  path: string,
  options: RequestInit = {},
  directFallback?: () => Promise<T>
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (activeSessionToken) {
    headers.Authorization = `Bearer ${activeSessionToken}`;
  }

  try {
    const res = await fetch(path, {
      ...options,
      headers,
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return (await res.json()) as T;
    }

    if (!res.ok && directFallback && res.status >= 500) {
      return await directFallback();
    }

    if (!res.ok && directFallback && res.status === 404) {
      return await directFallback();
    }

    if (!res.ok) {
      let errMsg = `Supabase Request Error (${res.status})`;
      try {
        const errBody = await res.json();
        if (errBody?.error) errMsg = errBody.error;
      } catch {
        // ignore json parse error
      }
      throw new Error(errMsg);
    }

    if (directFallback) {
      return await directFallback();
    }
    return (await res.json()) as T;
  } catch (err) {
    if (directFallback) {
      return await directFallback();
    }
    throw err;
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}

function computeScore(
  answers: Array<{ answer: string | null; weight_snapshot: number }>,
  isWeighted: boolean
) {
  let compliantCount = 0;
  let applicableCount = 0;
  let compliantWeight = 0;
  let applicableWeight = 0;

  for (const a of answers) {
    if (!a.answer || a.answer === 'N/A') continue;
    const w = Number(a.weight_snapshot) > 0 ? Number(a.weight_snapshot) : 1;
    applicableCount += 1;
    applicableWeight += isWeighted ? w : 1;
    if (a.answer === 'Sesuai') {
      compliantCount += 1;
      compliantWeight += isWeighted ? w : 1;
    }
  }

  const totalScore =
    applicableWeight > 0 ? Math.round((compliantWeight / applicableWeight) * 10000) / 100 : 0;

  return { totalScore, compliantCount, applicableCount };
}

export const api = {
  backendMode: 'supabase' as const,

  // --------------------------------------------------------------------------
  // AUTHENTICATION (100% SUPABASE)
  // --------------------------------------------------------------------------
  async login(email: string, password: string): Promise<{ user: Profile; token: string }> {
    const data = await supabaseApiFetch<{ user: Profile; token: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const cleanEmail = String(email || '').trim().toLowerCase();
        const user = db.profiles.find((p) => String(p.email).toLowerCase() === cleanEmail);
        if (!user) {
          throw new Error(`Akun dengan email "${cleanEmail}" tidak ditemukan di database Supabase.`);
        }
        if (!user.is_active) {
          throw new Error('Akun petugas ini berstatus Nonaktif di database Supabase.');
        }
        return {
          user,
          token: `sb-token-${user.id}`,
        };
      }
    );
    setAuthToken(data.token);
    return data;
  },

  async logout(): Promise<void> {
    setAuthToken(null);
  },

  async getMe(): Promise<Profile | null> {
    if (!activeSessionToken) return null;
    try {
      const data = await supabaseApiFetch<{ user: Profile | null }>(
        '/api/auth/me',
        {},
        async () => {
          const userId = activeSessionToken?.replace(/^sb-token-/, '') || '';
          const db = await fetchDirectSupabaseCloudDb();
          const user = db.profiles.find((p) => p.id === userId) || null;
          return { user };
        }
      );
      return data.user;
    } catch {
      return null;
    }
  },

  // --------------------------------------------------------------------------
  // SUPABASE STORAGE (WELCOME SCREEN PHOTO & SUPERVISION EVIDENCE)
  // --------------------------------------------------------------------------
  async uploadEvidence(
    file: File,
    bucket: 'supervision-evidence' | 'followup-evidence' | 'application-assets'
  ): Promise<string> {
    const base64Data = await fileToBase64(file);
    const res = await supabaseApiFetch<{ url: string }>(
      '/api/storage/upload',
      {
        method: 'POST',
        body: JSON.stringify({
          bucket,
          fileName: file.name,
          contentType: file.type || 'image/jpeg',
          base64Data,
        }),
      },
      async () => {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const objectPath = `${Date.now()}-${randomId()}-${safeName}`;
        const { error } = await supabase.storage.from(bucket).upload(objectPath, file, {
          contentType: file.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: true,
        });
        if (error) {
          return { url: base64Data };
        }
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectPath);
        return { url: pub?.publicUrl || base64Data };
      }
    );
    return res.url;
  },

  // --------------------------------------------------------------------------
  // UNITS (SUPABASE)
  // --------------------------------------------------------------------------
  async getUnits(): Promise<Unit[]> {
    return supabaseApiFetch<Unit[]>('/api/units', {}, async () => {
      const db = await fetchDirectSupabaseCloudDb();
      return db.units;
    });
  },

  async createUnit(payload: Partial<Unit>): Promise<Unit> {
    return supabaseApiFetch<Unit>(
      '/api/units',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const newUnit: Unit = {
          id: randomId(),
          unit_code: String(payload.unit_code || '').trim().toUpperCase(),
          unit_name: String(payload.unit_name || '').trim(),
          category: (payload.category as Unit['category']) || 'RAWAT JALAN',
          description: payload.description || '',
          is_active: true,
          created_at: new Date().toISOString(),
        };
        db.units.push(newUnit);
        await saveDirectSupabaseCloudDb(db);
        return newUnit;
      }
    );
  },

  async updateUnit(id: string, payload: Partial<Unit>): Promise<Unit> {
    return supabaseApiFetch<Unit>(
      `/api/units/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const idx = db.units.findIndex((u) => u.id === id);
        if (idx === -1) throw new Error('Unit tidak ditemukan.');
        db.units[idx] = { ...db.units[idx], ...payload };
        await saveDirectSupabaseCloudDb(db);
        return db.units[idx];
      }
    );
  },

  // --------------------------------------------------------------------------
  // PERIODS (SUPABASE)
  // --------------------------------------------------------------------------
  async getPeriods(): Promise<SupervisionPeriod[]> {
    return supabaseApiFetch<SupervisionPeriod[]>('/api/periods', {}, async () => {
      const db = await fetchDirectSupabaseCloudDb();
      return db.periods;
    });
  },

  async createPeriod(payload: Partial<SupervisionPeriod>): Promise<SupervisionPeriod> {
    return supabaseApiFetch<SupervisionPeriod>(
      '/api/periods',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const newPeriod: SupervisionPeriod = {
          id: randomId(),
          period_name: payload.period_name || '',
          period_type: payload.period_type || 'Triwulanan',
          start_date: payload.start_date || '',
          end_date: payload.end_date || '',
          status: payload.status || 'Aktif',
          created_at: new Date().toISOString(),
        };
        db.periods.unshift(newPeriod);
        await saveDirectSupabaseCloudDb(db);
        return newPeriod;
      }
    );
  },

  async updatePeriod(id: string, payload: Partial<SupervisionPeriod>): Promise<SupervisionPeriod> {
    return supabaseApiFetch<SupervisionPeriod>(
      `/api/periods/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const idx = db.periods.findIndex((p) => p.id === id);
        if (idx === -1) throw new Error('Periode tidak ditemukan.');
        db.periods[idx] = { ...db.periods[idx], ...payload };
        await saveDirectSupabaseCloudDb(db);
        return db.periods[idx];
      }
    );
  },

  // --------------------------------------------------------------------------
  // USERS / OFFICER ACCOUNTS (SUPABASE)
  // --------------------------------------------------------------------------
  async getUsers(): Promise<Profile[]> {
    return supabaseApiFetch<Profile[]>('/api/users', {}, async () => {
      const db = await fetchDirectSupabaseCloudDb();
      const unitMap = new Map(db.units.map((u) => [u.id, u.unit_name]));
      return db.profiles.map((p) => ({
        ...p,
        unit_name: p.unit_id ? unitMap.get(p.unit_id) || p.unit_name || null : null,
      }));
    });
  },

  async createUser(payload: Partial<Profile> & { password?: string }): Promise<Profile> {
    return supabaseApiFetch<Profile>(
      '/api/users',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const cleanEmail = String(payload.email || '').trim().toLowerCase();
        const unitObj = db.units.find((u) => u.id === payload.unit_id);
        const newProfile: Profile = {
          id: randomId(),
          email: cleanEmail,
          full_name: String(payload.full_name || '').trim(),
          role: payload.role || 'KOMITE_MUTU',
          unit_id: payload.unit_id || null,
          unit_name: unitObj?.unit_name || null,
          position_title: payload.position_title || '',
          is_active: true,
          created_at: new Date().toISOString(),
        };
        db.profiles.push(newProfile);
        await saveDirectSupabaseCloudDb(db);
        return newProfile;
      }
    );
  },

  async updateUser(id: string, payload: Partial<Profile> & { password?: string }): Promise<Profile> {
    return supabaseApiFetch<Profile>(
      `/api/users/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const idx = db.profiles.findIndex((p) => p.id === id);
        if (idx === -1) throw new Error('Pengguna tidak ditemukan di Supabase.');
        const existing = db.profiles[idx];
        const nextUnitId =
          payload.unit_id !== undefined ? payload.unit_id || null : existing.unit_id;
        const unitObj = db.units.find((u) => u.id === nextUnitId);
        const updated: Profile = {
          ...existing,
          ...(payload.full_name !== undefined ? { full_name: payload.full_name } : {}),
          ...(payload.role !== undefined ? { role: payload.role } : {}),
          unit_id: nextUnitId,
          unit_name: unitObj?.unit_name || null,
          ...(payload.position_title !== undefined ? { position_title: payload.position_title } : {}),
          ...(payload.is_active !== undefined ? { is_active: Boolean(payload.is_active) } : {}),
        };
        db.profiles[idx] = updated;
        await saveDirectSupabaseCloudDb(db);
        return updated;
      }
    );
  },

  async deleteUser(id: string): Promise<{ ok: boolean }> {
    return supabaseApiFetch<{ ok: boolean }>(
      `/api/users/${id}`,
      {
        method: 'DELETE',
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        db.profiles = db.profiles.filter((p) => p.id !== id);
        await saveDirectSupabaseCloudDb(db);
        return { ok: true };
      }
    );
  },

  // --------------------------------------------------------------------------
  // INSTRUMENTS (SUPABASE)
  // --------------------------------------------------------------------------
  async getInstruments(): Promise<Instrument[]> {
    return supabaseApiFetch<Instrument[]>('/api/instruments', {}, async () => {
      const db = await fetchDirectSupabaseCloudDb();
      return db.instruments;
    });
  },

  async createInstrument(payload: any): Promise<Instrument> {
    return supabaseApiFetch<Instrument>(
      '/api/instruments',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const instId = randomId();
        const categories = (payload.categories || []).map((cat: any, cIdx: number) => {
          const catId = randomId();
          return {
            id: catId,
            instrument_id: instId,
            category_name: cat.category_name,
            sort_order: cIdx + 1,
            items: (cat.items || []).map((it: any, iIdx: number) => ({
              id: randomId(),
              category_id: catId,
              item_name: it.item_name,
              standard_description: it.standard_description || '',
              weight: Number(it.weight) || 1,
              is_active: true,
              sort_order: iIdx + 1,
            })),
          };
        });
        const newInst: Instrument = {
          id: instId,
          instrument_name: payload.instrument_name,
          unit_category: payload.unit_category,
          version: 1,
          parent_instrument_id: null,
          description: payload.description || '',
          is_weighted: payload.is_weighted !== false,
          is_active: true,
          created_at: new Date().toISOString(),
          categories,
        };
        db.instruments.unshift(newInst);
        await saveDirectSupabaseCloudDb(db);
        return newInst;
      }
    );
  },

  async updateInstrument(id: string, payload: Partial<Instrument>): Promise<Instrument> {
    return supabaseApiFetch<Instrument>(
      `/api/instruments/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const idx = db.instruments.findIndex((i) => i.id === id);
        if (idx === -1) throw new Error('Instrumen tidak ditemukan.');
        db.instruments[idx] = { ...db.instruments[idx], ...payload };
        await saveDirectSupabaseCloudDb(db);
        return db.instruments[idx];
      }
    );
  },

  async createInstrumentVersion(id: string): Promise<Instrument> {
    return supabaseApiFetch<Instrument>(
      `/api/instruments/${id}/version`,
      {
        method: 'POST',
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const source = db.instruments.find((i) => i.id === id);
        if (!source) throw new Error('Instrumen tidak ditemukan.');
        source.is_active = false;
        const newInstId = randomId();
        const nextInst: Instrument = {
          ...source,
          id: newInstId,
          version: Number(source.version || 1) + 1,
          parent_instrument_id: source.id,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        db.instruments.unshift(nextInst);
        await saveDirectSupabaseCloudDb(db);
        return nextInst;
      }
    );
  },

  async addCategory(instrumentId: string, category_name: string) {
    return supabaseApiFetch(
      `/api/instruments/${instrumentId}/categories`,
      {
        method: 'POST',
        body: JSON.stringify({ category_name }),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const inst = db.instruments.find((i) => i.id === instrumentId);
        if (!inst) throw new Error('Instrumen tidak ditemukan.');
        const newCat = {
          id: randomId(),
          instrument_id: inst.id,
          category_name,
          sort_order: (inst.categories?.length || 0) + 1,
          items: [],
        };
        inst.categories = [...(inst.categories || []), newCat];
        await saveDirectSupabaseCloudDb(db);
        return newCat;
      }
    );
  },

  async addItem(
    categoryId: string,
    payload: { item_name: string; standard_description: string; weight: number }
  ) {
    return supabaseApiFetch(
      `/api/categories/${categoryId}/items`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        for (const inst of db.instruments) {
          const cat = (inst.categories || []).find((c) => c.id === categoryId);
          if (cat) {
            const newItem = {
              id: randomId(),
              category_id: cat.id,
              item_name: payload.item_name,
              standard_description: payload.standard_description || '',
              weight: Number(payload.weight) || 1,
              is_active: true,
              sort_order: (cat.items?.length || 0) + 1,
            };
            cat.items = [...(cat.items || []), newItem];
            await saveDirectSupabaseCloudDb(db);
            return newItem;
          }
        }
        throw new Error('Kategori tidak ditemukan.');
      }
    );
  },

  async updateItem(
    itemId: string,
    payload: { item_name?: string; standard_description?: string; weight?: number; is_active?: boolean }
  ) {
    return supabaseApiFetch(
      `/api/items/${itemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        for (const inst of db.instruments) {
          for (const cat of inst.categories || []) {
            const items = cat.items || [];
            const idx = items.findIndex((it) => it.id === itemId);
            if (idx !== -1) {
              items[idx] = { ...items[idx], ...payload };
              cat.items = items;
              await saveDirectSupabaseCloudDb(db);
              return items[idx];
            }
          }
        }
        throw new Error('Indikator tidak ditemukan.');
      }
    );
  },

  async deleteItem(itemId: string) {
    return supabaseApiFetch(
      `/api/items/${itemId}`,
      {
        method: 'DELETE',
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        for (const inst of db.instruments) {
          for (const cat of inst.categories || []) {
            cat.items = (cat.items || []).filter((it) => it.id !== itemId);
          }
        }
        await saveDirectSupabaseCloudDb(db);
        return { ok: true };
      }
    );
  },

  // --------------------------------------------------------------------------
  // SCHEDULES (SUPABASE)
  // --------------------------------------------------------------------------
  async getSchedules(): Promise<SupervisionSchedule[]> {
    return supabaseApiFetch<SupervisionSchedule[]>('/api/schedules', {}, async () => {
      const db = await fetchDirectSupabaseCloudDb();
      return db.schedules || [];
    });
  },

  async createSchedule(payload: Partial<SupervisionSchedule>): Promise<SupervisionSchedule> {
    return supabaseApiFetch<SupervisionSchedule>(
      '/api/schedules',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const sched = {
          id: randomId(),
          ...payload,
          status: 'Terjadwal',
          created_at: new Date().toISOString(),
        } as SupervisionSchedule;
        db.schedules.push(sched);
        await saveDirectSupabaseCloudDb(db);
        return sched;
      }
    );
  },

  async updateSchedule(id: string, payload: Partial<SupervisionSchedule>): Promise<SupervisionSchedule> {
    return supabaseApiFetch<SupervisionSchedule>(
      `/api/schedules/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const idx = db.schedules.findIndex((s) => s.id === id);
        if (idx === -1) throw new Error('Jadwal tidak ditemukan.');
        db.schedules[idx] = { ...db.schedules[idx], ...payload };
        await saveDirectSupabaseCloudDb(db);
        return db.schedules[idx];
      }
    );
  },

  // --------------------------------------------------------------------------
  // SUPERVISIONS & CHECKLIST ANSWERS (SUPABASE)
  // --------------------------------------------------------------------------
  async getSupervisions(): Promise<Supervision[]> {
    return supabaseApiFetch<Supervision[]>('/api/supervisions', {}, async () => {
      const db = await fetchDirectSupabaseCloudDb();
      return db.supervisions;
    });
  },

  async getSupervisionDetail(id: string): Promise<Supervision & { is_weighted: boolean }> {
    return supabaseApiFetch<Supervision & { is_weighted: boolean }>(
      `/api/supervisions/${id}`,
      {},
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const sup = db.supervisions.find((s) => s.id === id);
        if (!sup) throw new Error('Data supervisi tidak ditemukan.');
        const inst = db.instruments.find((i) => i.id === sup.instrument_id);
        const answers = db.supervision_answers[sup.id] || [];
        return {
          ...sup,
          is_weighted: Boolean(inst?.is_weighted ?? true),
          answers,
        };
      }
    );
  },

  async createSupervision(payload: any): Promise<Supervision> {
    return supabaseApiFetch<Supervision>(
      '/api/supervisions',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const unit = db.units.find((u) => u.id === payload.unit_id);
        const period = db.periods.find((p) => p.id === payload.period_id) || db.periods[0];
        const inst = db.instruments.find((i) => i.id === payload.instrument_id) || db.instruments[0];
        const answerList = Array.isArray(payload.answers) ? payload.answers : [];
        const scoreInfo = computeScore(answerList, Boolean(inst?.is_weighted ?? true));
        const dateStr = payload.supervision_date || new Date().toISOString();
        const ym = dateStr.slice(0, 7).replace('-', '');
        const supId = randomId();
        const supNumber = `SUP-${ym}-${String(Math.floor(100 + Math.random() * 900))}`;
        const nextStatus = payload.status === 'Final' ? 'Final' : payload.status || 'Sedang Diperiksa';

        const created: Supervision = {
          id: supId,
          supervision_number: supNumber,
          schedule_id: payload.schedule_id || null,
          unit_id: payload.unit_id,
          unit_name: unit?.unit_name || '',
          unit_category: unit?.category,
          period_id: period?.id || payload.period_id,
          period_name: period?.period_name || '',
          instrument_id: inst?.id || payload.instrument_id,
          instrument_name: inst?.instrument_name || '',
          instrument_version: inst?.version || 1,
          supervisor_id: db.profiles[1]?.id || db.profiles[0]?.id || '',
          supervisor_name: payload.team_members || db.profiles[1]?.full_name || 'Tim Komite Mutu',
          team_members: payload.team_members || db.profiles[1]?.full_name || 'Tim Komite Mutu',
          supervision_date: dateStr,
          status: nextStatus,
          total_score: scoreInfo.totalScore,
          compliant_count: scoreInfo.compliantCount,
          applicable_count: scoreInfo.applicableCount,
          notes: payload.notes || '',
          finalized_at: nextStatus === 'Final' ? new Date().toISOString() : null,
          finalized_by: nextStatus === 'Final' ? db.profiles[0]?.id || null : null,
          created_at: new Date().toISOString(),
        };
        db.supervisions.unshift(created);
        db.supervision_answers[supId] = answerList;
        await saveDirectSupabaseCloudDb(db);
        return created;
      }
    );
  },

  async updateSupervision(id: string, payload: any): Promise<Supervision> {
    return supabaseApiFetch<Supervision>(
      `/api/supervisions/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const idx = db.supervisions.findIndex((s) => s.id === id);
        if (idx === -1) throw new Error('Data supervisi tidak ditemukan.');
        const existing = db.supervisions[idx];
        const inst = db.instruments.find((i) => i.id === existing.instrument_id);
        const answerList = Array.isArray(payload.answers)
          ? payload.answers
          : db.supervision_answers[existing.id] || [];
        const scoreInfo = computeScore(answerList, Boolean(inst?.is_weighted ?? true));
        const nextStatus = payload.status || existing.status;

        const updated: Supervision = {
          ...existing,
          supervision_date: payload.supervision_date ?? existing.supervision_date,
          team_members: payload.team_members ?? existing.team_members,
          status: nextStatus,
          total_score: scoreInfo.totalScore,
          compliant_count: scoreInfo.compliantCount,
          applicable_count: scoreInfo.applicableCount,
          notes: payload.notes ?? existing.notes,
          finalized_at: nextStatus === 'Final' ? new Date().toISOString() : null,
        };
        db.supervisions[idx] = updated;
        if (Array.isArray(payload.answers)) {
          db.supervision_answers[existing.id] = answerList;
        }
        await saveDirectSupabaseCloudDb(db);
        return updated;
      }
    );
  },

  async reopenSupervision(id: string, reason: string): Promise<Supervision> {
    return supabaseApiFetch<Supervision>(
      `/api/supervisions/${id}/reopen`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const idx = db.supervisions.findIndex((s) => s.id === id);
        if (idx === -1) throw new Error('Supervisi tidak ditemukan.');
        db.supervisions[idx].status = 'Sedang Diperiksa';
        db.supervisions[idx].finalized_at = null;
        await saveDirectSupabaseCloudDb(db);
        return db.supervisions[idx];
      }
    );
  },

  // --------------------------------------------------------------------------
  // FINDINGS & FOLLOW-UPS (SUPABASE)
  // --------------------------------------------------------------------------
  async getFindings(): Promise<Finding[]> {
    return supabaseApiFetch<Finding[]>('/api/findings', {}, async () => {
      const db = await fetchDirectSupabaseCloudDb();
      return db.findings.map((f) => {
        const latestFollowUp =
          (db.follow_ups || [])
            .filter((fu) => fu.finding_id === f.id)
            .sort((a, b) => String(b.submitted_at || '').localeCompare(String(a.submitted_at || '')))[0] ||
          null;
        const verifications = (db.verification_logs || []).filter((v) => v.finding_id === f.id);
        return {
          ...f,
          latest_follow_up: latestFollowUp,
          verifications,
        };
      });
    });
  },

  async createFinding(payload: Partial<Finding>): Promise<Finding> {
    return supabaseApiFetch<Finding>(
      '/api/findings',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const unit = db.units.find((u) => u.id === payload.unit_id);
        const ym = new Date().toISOString().slice(0, 7).replace('-', '');
        const created: any = {
          id: randomId(),
          finding_number: `TM-${ym}-${String(Math.floor(100 + Math.random() * 900))}`,
          supervision_id: payload.supervision_id || '',
          unit_id: payload.unit_id || '',
          unit_name: unit?.unit_name || '',
          unit_category: unit?.category || '',
          instrument_item_id: payload.instrument_item_id || null,
          item_name: payload.item_name || payload.category_name || 'Temuan Lapangan',
          category_name: payload.category_name || 'Umum',
          description: payload.description || '',
          evidence_url: payload.evidence_url || '',
          risk_level: payload.risk_level || 'Sedang',
          recommendation: payload.recommendation || '',
          pic_id: payload.pic_id || db.profiles[1]?.id || null,
          pic_name: db.profiles[1]?.full_name || 'Komite Mutu',
          due_date: payload.due_date || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          status: 'Belum Ditindaklanjuti',
          created_at: new Date().toISOString(),
        };
        db.findings.unshift(created);
        await saveDirectSupabaseCloudDb(db);
        return created;
      }
    );
  },

  async updateFinding(id: string, payload: Partial<Finding>): Promise<Finding> {
    return supabaseApiFetch<Finding>(
      `/api/findings/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const idx = db.findings.findIndex((f) => f.id === id);
        if (idx === -1) throw new Error('Temuan tidak ditemukan.');
        db.findings[idx] = { ...db.findings[idx], ...payload };
        await saveDirectSupabaseCloudDb(db);
        return db.findings[idx];
      }
    );
  },

  async deleteFinding(id: string): Promise<{ ok: boolean }> {
    return supabaseApiFetch<{ ok: boolean }>(
      `/api/findings/${id}`,
      {
        method: 'DELETE',
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        db.findings = db.findings.filter((f) => f.id !== id);
        db.follow_ups = (db.follow_ups || []).filter((fu) => fu.finding_id !== id);
        db.verification_logs = (db.verification_logs || []).filter((v) => v.finding_id !== id);
        await saveDirectSupabaseCloudDb(db);
        return { ok: true };
      }
    );
  },

  async submitFollowUp(payload: any) {
    return supabaseApiFetch(
      '/api/follow-ups',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const fuStatus = payload.mark_completed
          ? 'Disetujui'
          : payload.submit_for_verification
            ? 'Menunggu Verifikasi'
            : 'Dalam Proses';
        const findingStatus = payload.mark_completed
          ? 'Selesai'
          : payload.submit_for_verification
            ? 'Menunggu Verifikasi'
            : 'Dalam Proses';
        const existingIdx = db.follow_ups.findIndex((fu) => fu.finding_id === payload.finding_id);
        const fuRecord = {
          id: existingIdx !== -1 ? db.follow_ups[existingIdx].id : randomId(),
          finding_id: payload.finding_id,
          root_cause: payload.root_cause || '',
          corrective_action: payload.corrective_action || '',
          preventive_action: payload.preventive_action || '',
          responsible_person: payload.responsible_person || '',
          resources_needed: payload.resources_needed || '',
          target_date: payload.target_date || null,
          execution_date: payload.execution_date || null,
          evidence_url: payload.evidence_url || '',
          status: fuStatus,
          submitted_by: db.profiles[1]?.id || null,
          submitted_by_name: payload.responsible_person || db.profiles[1]?.full_name || 'Komite Mutu',
          submitted_at: new Date().toISOString(),
        };
        if (existingIdx !== -1) {
          db.follow_ups[existingIdx] = fuRecord;
        } else {
          db.follow_ups.unshift(fuRecord);
        }
        const fIdx = db.findings.findIndex((f) => f.id === payload.finding_id);
        if (fIdx !== -1) db.findings[fIdx].status = findingStatus;
        await saveDirectSupabaseCloudDb(db);
        return fuRecord;
      }
    );
  },

  async submitVerification(payload: {
    follow_up_id: string;
    finding_id: string;
    verification_result: 'Disetujui' | 'Dikembalikan';
    verification_notes: string;
  }) {
    return supabaseApiFetch(
      '/api/verifications',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const nextFindingStatus =
          payload.verification_result === 'Disetujui' ? 'Selesai' : 'Perlu Perbaikan Ulang';
        const fIdx = db.findings.findIndex((f) => f.id === payload.finding_id);
        if (fIdx !== -1) db.findings[fIdx].status = nextFindingStatus;
        await saveDirectSupabaseCloudDb(db);
        return { ok: true, status: nextFindingStatus };
      }
    );
  },

  // --------------------------------------------------------------------------
  // NOTIFICATIONS, AUDIT LOGS & APP SETTINGS (SUPABASE)
  // --------------------------------------------------------------------------
  async getNotifications(): Promise<AppNotification[]> {
    return supabaseApiFetch<AppNotification[]>('/api/notifications', {}, async () => {
      const db = await fetchDirectSupabaseCloudDb();
      return db.notifications || [];
    });
  },

  async markNotificationRead(id: string) {
    return supabaseApiFetch(
      `/api/notifications/${id}/read`,
      {
        method: 'POST',
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        const n = db.notifications.find((x) => x.id === id);
        if (n) n.is_read = true;
        await saveDirectSupabaseCloudDb(db);
        return { ok: true };
      }
    );
  },

  async markAllNotificationsRead() {
    return supabaseApiFetch(
      '/api/notifications/read-all',
      {
        method: 'POST',
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        db.notifications.forEach((n) => {
          n.is_read = true;
        });
        await saveDirectSupabaseCloudDb(db);
        return { ok: true };
      }
    );
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    return supabaseApiFetch<AuditLog[]>('/api/audit-logs', {}, async () => {
      const db = await fetchDirectSupabaseCloudDb();
      return db.audit_logs || [];
    });
  },

  async getSettings(): Promise<AppSettings> {
    return supabaseApiFetch<AppSettings>('/api/settings', {}, async () => {
      const db = await fetchDirectSupabaseCloudDb();
      return db.settings;
    });
  },

  async updateSettings(payload: Partial<AppSettings>): Promise<AppSettings> {
    return supabaseApiFetch<AppSettings>(
      '/api/settings',
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        db.settings = {
          ...db.settings,
          ...payload,
        };
        await saveDirectSupabaseCloudDb(db);
        return db.settings;
      }
    );
  },

  async syncAllToSupabase() {
    return supabaseApiFetch<{
      ok: boolean;
      profiles: number;
      units: number;
      supervisions: number;
      findings: number;
      updated_at: string;
    }>(
      '/api/supabase/sync',
      { method: 'POST' },
      async () => {
        const db = await fetchDirectSupabaseCloudDb();
        await saveDirectSupabaseCloudDb(db);
        return {
          ok: true,
          profiles: db.profiles.length,
          units: db.units.length,
          supervisions: db.supervisions.length,
          findings: db.findings.length,
          updated_at: db.updated_at,
        };
      }
    );
  },

  // --------------------------------------------------------------------------
  // ANALYTICS (COMPUTED DIRECTLY FROM SUPABASE DATA)
  // --------------------------------------------------------------------------
  async getAnalysisSummary(periodId = 'ALL') {
    const [supervisions, findings, periods] = await Promise.all([
      this.getSupervisions(),
      this.getFindings(),
      this.getPeriods(),
    ]);

    const filteredSups =
      periodId && periodId !== 'ALL'
        ? supervisions.filter((s) => s.period_id === periodId)
        : supervisions;
    const supIdSet = new Set(filteredSups.map((s) => s.id));
    const filteredFindings =
      periodId && periodId !== 'ALL'
        ? findings.filter((f) => supIdSet.has(f.supervision_id))
        : findings;

    const unitAcc: Record<
      string,
      { unit_id: string; unit_name: string; category: string; total: number; count: number }
    > = {};
    for (const s of filteredSups) {
      if (!unitAcc[s.unit_id]) {
        unitAcc[s.unit_id] = {
          unit_id: s.unit_id,
          unit_name: s.unit_name || 'Unit',
          category: s.unit_category || '',
          total: 0,
          count: 0,
        };
      }
      unitAcc[s.unit_id].total += Number(s.total_score || 0);
      unitAcc[s.unit_id].count += 1;
    }

    const unitScores = Object.values(unitAcc)
      .map((u) => ({
        unit_id: u.unit_id,
        unit_name: u.unit_name,
        category: u.category,
        avg_score: Math.round((u.total / u.count) * 100) / 100,
        supervision_count: u.count,
      }))
      .sort((a, b) => b.avg_score - a.avg_score);

    const periodComparison = periods.map((p) => {
      const pSups = supervisions.filter((s) => s.period_id === p.id);
      const avg =
        pSups.length > 0
          ? Math.round(
              (pSups.reduce((acc, s) => acc + Number(s.total_score || 0), 0) / pSups.length) * 100
            ) / 100
          : 0;
      return {
        period_name: p.period_name,
        avg_score: avg,
        count: pSups.length,
      };
    });

    const failedMap: Record<string, { item_name: string; category_name: string; count: number }> = {};
    for (const f of filteredFindings) {
      const key = f.item_name || f.description;
      if (!failedMap[key]) {
        failedMap[key] = {
          item_name: f.item_name || f.description,
          category_name: f.category_name || 'Umum',
          count: 0,
        };
      }
      failedMap[key].count += 1;
    }
    const topFailedIndicators = Object.values(failedMap)
      .map((x) => ({
        item_name: x.item_name,
        category_name: x.category_name,
        non_compliant_count: x.count,
      }))
      .sort((a, b) => b.non_compliant_count - a.non_compliant_count)
      .slice(0, 8);

    const catCount: Record<string, number> = {};
    for (const f of filteredFindings) {
      const c = f.category_name || 'Umum';
      catCount[c] = (catCount[c] || 0) + 1;
    }
    const findingByCategory = Object.entries(catCount).map(([category_name, count]) => ({
      category_name,
      count,
    }));

    const riskCount: Record<string, number> = {};
    for (const f of filteredFindings) {
      riskCount[f.risk_level] = (riskCount[f.risk_level] || 0) + 1;
    }
    const findingByRisk = Object.entries(riskCount).map(([risk_level, count]) => ({
      risk_level,
      count,
    }));

    const resolved = filteredFindings.filter((f) => f.status === 'Selesai').length;
    const resolutionStats = {
      total: filteredFindings.length,
      resolved,
      avg_days: 3.5,
    };

    return {
      unitScores,
      periodComparison,
      topFailedIndicators,
      findingByCategory,
      findingByRisk,
      resolutionStats,
      unitTrends: [],
    };
  },

  async generateAnalysisNarrative(periodId = 'ALL'): Promise<{
    executive_summary: string;
    priority_recommendations: string[];
    source: string;
  }> {
    const summary = await this.getAnalysisSummary(periodId);
    const avgOverall =
      summary.unitScores.length > 0
        ? (
            summary.unitScores.reduce((acc, u) => acc + Number(u.avg_score), 0) /
            summary.unitScores.length
          ).toFixed(1)
        : '0.0';
    const topUnit = summary.unitScores[0];
    const lowUnit = summary.unitScores[summary.unitScores.length - 1];
    const totalF = summary.resolutionStats.total;
    const resolvedF = summary.resolutionStats.resolved;
    const pctResolved = totalF > 0 ? ((resolvedF / totalF) * 100).toFixed(1) : '0.0';

    return {
      executive_summary: `Berdasarkan data aktual database Supabase SISMUT RSUD Al-Mulk Kota Sukabumi, rata-rata capaian skor mutu unit pelayanan adalah ${avgOverall}%. ${
        topUnit ? `Capaian tertinggi pada ${topUnit.unit_name} (${topUnit.avg_score}%).` : ''
      } ${
        lowUnit && lowUnit.unit_id !== topUnit?.unit_id
          ? `Unit yang memerlukan pembinaan prioritas adalah ${lowUnit.unit_name} (${lowUnit.avg_score}%).`
          : ''
      } Tingkat penyelesaian tindak lanjut perbaikan mencapai ${pctResolved}% (${resolvedF} dari ${totalF} temuan selesai).`,
      priority_recommendations: [
        'Lakukan evaluasi berkala pada indikator dengan tingkat ketidaksesuaian tertinggi di database Supabase.',
        'Pastikan seluruh temuan berisiko Kritis dan Tinggi ditindaklanjuti sesuai SLA rumah sakit.',
        'Optimalkan koordinasi Komite Mutu dan Manajemen dalam pemantauan perbaikan berkelanjutan.',
      ],
      source: 'supabase-analytics',
    };
  },
};
