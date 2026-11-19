import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const DEFAULT_WELCOME_IMAGE = '/src/assets/images/welcome_hospital_interior_1794923926771.jpg';
const DB_BUCKET = 'sismut-db';
const DB_OBJECT_KEY = 'sismut-cloud-db.json';

export function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  return rawUrl
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/auth\/v1\/?$/i, '')
    .replace(/\/storage\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

export function getSupabaseConfig() {
  const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const url = normalizeSupabaseUrl(rawUrl);
  const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
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

function buildInitialSeedDatabase(): SupabaseCloudDatabase {
  const now = new Date().toISOString();

  const unitSeeds: Array<[string, string, string, string]> = [
    ['RJ-01', 'Poliklinik Umum', 'RAWAT JALAN', 'Pelayanan pemeriksaan dokter umum rawat jalan'],
    ['RJ-02', 'Poliklinik Spesialis', 'RAWAT JALAN', 'Pelayanan poliklinik penyakit dalam, anak, bedah, dan kebidanan'],
    ['RJ-03', 'Pendaftaran Rawat Jalan', 'RAWAT JALAN', 'Admisi dan registrasi pasien rawat jalan serta verifikasi JKN'],
    ['RJ-04', 'Rekam Medis Rawat Jalan', 'RAWAT JALAN', 'Pengelolaan berkas dan rekam medis elektronik rawat jalan'],
    ['RI-01', 'Ruang Perawatan', 'RAWAT INAP', 'Instalasi rawat inap kelas I, II, dan III'],
    ['RI-02', 'Ruang Isolasi', 'RAWAT INAP', 'Ruang perawatan isolasi tekanan negatif dan infeksi menular'],
    ['RI-03', 'Ruang Perawatan Khusus (ICU/HCU)', 'RAWAT INAP', 'Unit perawatan intensif dan observasi ketat'],
    ['IGD-01', 'IGD', 'INSTALASI GAWAT DARURAT', 'Instalasi Gawat Darurat 24 jam pelayanan kegawatdaruratan'],
    ['IGD-02', 'Area Triase', 'INSTALASI GAWAT DARURAT', 'Area pemilahan kegawatan pasien datang'],
    ['IGD-03', 'Area Tindakan dan Observasi', 'INSTALASI GAWAT DARURAT', 'Ruang resusitasi, tindakan bedah minor, dan observasi IGD'],
    ['PM-01', 'Laboratorium', 'PENUNJANG MEDIS', 'Laboratorium patologi klinik dan mikrobiologi'],
    ['PM-02', 'Radiologi', 'PENUNJANG MEDIS', 'Instalasi pencitraan diagnostik X-Ray dan USG'],
    ['PM-03', 'Farmasi', 'PENUNJANG MEDIS', 'Instalasi farmasi rawat jalan, rawat inap, dan gudang obat'],
    ['PM-04', 'CSSD', 'PENUNJANG MEDIS', 'Central Sterile Supply Department / sterilisasi sentral'],
    ['PM-05', 'Gizi', 'PENUNJANG MEDIS', 'Instalasi gizi klinik dan penyelenggaraan makanan pasien'],
    ['PM-06', 'Rekam Medis', 'PENUNJANG MEDIS', 'Unit rekam medis sentral dan pelaporan SIRS'],
    ['PM-07', 'Pelayanan Ambulans', 'PENUNJANG MEDIS', 'Pelayanan transportasi rujukan dan evakuasi medis'],
    ['PN-01', 'IPSRS', 'PENUNJANG NONMEDIS', 'Instalasi Pemeliharaan Sarana dan Prasarana Rumah Sakit'],
    ['PN-02', 'Sanitasi dan Kesehatan Lingkungan', 'PENUNJANG NONMEDIS', 'Pengawasan kualitas air, udara, dan kesling rumah sakit'],
    ['PN-03', 'Laundry', 'PENUNJANG NONMEDIS', 'Pengelolaan linen bersih dan infeksius rumah sakit'],
    ['PN-04', 'Kebersihan', 'PENUNJANG NONMEDIS', 'Layanan kebersihan area klinis dan publik'],
    ['PN-05', 'Keamanan', 'PENUNJANG NONMEDIS', 'Sistem pengamanan dan ketertiban lingkungan rumah sakit'],
    ['PN-06', 'Pengelolaan Limbah', 'PENUNJANG NONMEDIS', 'Pengelolaan limbah B3 medis padat dan IPAL cair'],
    ['PN-07', 'Sarana dan Prasarana', 'PENUNJANG NONMEDIS', 'Pengelolaan utilitas listrik, air, gas medis, dan gedung'],
    ['MJ-01', 'Unit Mutu', 'MANAJEMEN DAN UNIT LAINNYA', 'Komite Mutu dan Keselamatan Pasien Rumah Sakit'],
    ['MJ-02', 'PPI', 'MANAJEMEN DAN UNIT LAINNYA', 'Komite Pencegahan dan Pengendalian Infeksi'],
    ['MJ-03', 'K3RS', 'MANAJEMEN DAN UNIT LAINNYA', 'Komite Kesehatan dan Keselamatan Kerja Rumah Sakit'],
  ];

  const unitIdByCode: Record<string, string> = {};
  const units = unitSeeds.map(([unit_code, unit_name, category, description]) => {
    const id = crypto.randomUUID();
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
      id: crypto.randomUUID(),
      email: 'superadmin@rsudalmulk.go.id',
      full_name: 'Dr. Hendra Wijaya, MARS',
      role: 'SUPER_ADMIN',
      unit_id: unitIdByCode['MJ-01'],
      unit_name: 'Unit Mutu',
      position_title: 'Super Admin Sistem Informasi & Mutu',
      is_active: true,
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      email: 'komitemutu@rsudalmulk.go.id',
      full_name: 'Ns. Siti Aminah, S.Kep., M.Kep.',
      role: 'KOMITE_MUTU',
      unit_id: unitIdByCode['MJ-01'],
      unit_name: 'Unit Mutu',
      position_title: 'Ketua Komite Mutu RSUD Al-Mulk',
      is_active: true,
      created_at: now,
    },
    {
      id: crypto.randomUUID(),
      email: 'manajemen@rsudalmulk.go.id',
      full_name: 'dr. H. Ahmad Fauzi, Sp.PD, MARS',
      role: 'MANAJEMEN',
      unit_id: null,
      unit_name: null,
      position_title: 'Direktur / Manajemen RSUD Al-Mulk Kota Sukabumi',
      is_active: true,
      created_at: now,
    },
  ];

  const period1Id = crypto.randomUUID();
  const period2Id = crypto.randomUUID();
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

  const inst1Id = crypto.randomUUID();
  const cat1Id = crypto.randomUUID();
  const cat2Id = crypto.randomUUID();
  const item1Id = crypto.randomUUID();
  const item2Id = crypto.randomUUID();
  const item3Id = crypto.randomUUID();
  const item4Id = crypto.randomUUID();
  const item5Id = crypto.randomUUID();

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
      ],
    },
  ];

  const sup1Id = crypto.randomUUID();
  const sup2Id = crypto.randomUUID();
  const komiteProfile = profiles[1];

  const supervisions = [
    {
      id: sup1Id,
      supervision_number: 'SUP-202611-101',
      schedule_id: null,
      unit_id: unitIdByCode['IGD-01'],
      unit_name: 'IGD',
      unit_category: 'INSTALASI GAWAT DARURAT',
      period_id: period1Id,
      period_name: 'Triwulan IV 2026 (Okt–Des)',
      instrument_id: inst1Id,
      instrument_name: 'Instrumen Supervisi Mutu Pelayanan Klinis & Keselamatan Pasien',
      instrument_version: 1,
      supervisor_id: komiteProfile.id,
      supervisor_name: komiteProfile.full_name,
      team_members: 'Ns. Siti Aminah, S.Kep., M.Kep.',
      supervision_date: '2026-11-15T09:00:00.000Z',
      status: 'Final',
      total_score: 76.47,
      compliant_count: 4,
      applicable_count: 5,
      notes: 'Supervisi mutu pelayanan IGD shift pagi. Ditemukan 1 ketidaksesuaian pada pelabelan obat High-Alert di troli emergensi.',
      finalized_at: '2026-11-15T10:30:00.000Z',
      finalized_by: komiteProfile.id,
      created_at: now,
    },
    {
      id: sup2Id,
      supervision_number: 'SUP-202611-102',
      schedule_id: null,
      unit_id: unitIdByCode['RI-01'],
      unit_name: 'Ruang Perawatan',
      unit_category: 'RAWAT INAP',
      period_id: period1Id,
      period_name: 'Triwulan IV 2026 (Okt–Des)',
      instrument_id: inst1Id,
      instrument_name: 'Instrumen Supervisi Mutu Pelayanan Klinis & Keselamatan Pasien',
      instrument_version: 1,
      supervisor_id: komiteProfile.id,
      supervisor_name: komiteProfile.full_name,
      team_members: 'Ns. Siti Aminah, S.Kep., M.Kep.',
      supervision_date: '2026-11-16T10:00:00.000Z',
      status: 'Final',
      total_score: 82.35,
      compliant_count: 4,
      applicable_count: 5,
      notes: 'Supervisi ruang perawatan rawat inap berjalan baik, perlu tindak lanjut kelengkapan stempel TBAK pada CPPT.',
      finalized_at: '2026-11-16T11:15:00.000Z',
      finalized_by: komiteProfile.id,
      created_at: now,
    },
  ];

  const supervision_answers: Record<string, any[]> = {
    [sup1Id]: [
      {
        id: crypto.randomUUID(),
        supervision_id: sup1Id,
        instrument_item_id: item1Id,
        item_name_snapshot: 'Kepatuhan identifikasi pasien dengan minimal 2 identitas (Nama & Tanggal Lahir/No. RM)',
        category_name_snapshot: 'Sasaran Keselamatan Pasien (SKP)',
        weight_snapshot: 2.0,
        answer: 'Sesuai',
        notes: 'Gelang identitas terpasang dan diverifikasi aktif oleh perawat.',
        supporting_evidence: 'Observasi langsung 5 pasien IGD',
        evidence_url: '',
        recommendation: 'Pertahankan kepatuhan identifikasi.',
      },
      {
        id: crypto.randomUUID(),
        supervision_id: sup1Id,
        instrument_item_id: item2Id,
        item_name_snapshot: 'Penerapan komunikasi efektif SBAR dan TBAK pada serah terima / instruksi lisan',
        category_name_snapshot: 'Sasaran Keselamatan Pasien (SKP)',
        weight_snapshot: 1.5,
        answer: 'Sesuai',
        notes: 'Dokumentasi SBAR dan TBAK terisi lengkap.',
        supporting_evidence: 'Cek berkas rekam medis IGD',
        evidence_url: '',
        recommendation: '',
      },
      {
        id: crypto.randomUUID(),
        supervision_id: sup1Id,
        instrument_item_id: item3Id,
        item_name_snapshot: 'Penandaan dan penyimpanan obat High-Alert & LASA terpisah dengan stiker jelas',
        category_name_snapshot: 'Sasaran Keselamatan Pasien (SKP)',
        weight_snapshot: 2.0,
        answer: 'Tidak Sesuai',
        notes: 'Ditemukan 2 ampul obat High-Alert di laci troli emergensi yang stikernya terkelupas dan segel troli belum diperbarui.',
        supporting_evidence: 'Pemeriksaan troli emergensi IGD',
        evidence_url: '',
        recommendation: 'Segera tempel ulang stiker High-Alert merah dan lakukan penyegelan ulang bersama petugas Farmasi.',
      },
      {
        id: crypto.randomUUID(),
        supervision_id: sup1Id,
        instrument_item_id: item4Id,
        item_name_snapshot: 'Ketersediaan handrub berbasis alkohol di setiap titik perawatan dan kepatuhan 5 momen cuci tangan',
        category_name_snapshot: 'Pencegahan & Pengendalian Infeksi (PPI) dan Kesiapan Fasilitas',
        weight_snapshot: 1.5,
        answer: 'Sesuai',
        notes: 'Handrub tersedia di setiap bed IGD.',
        supporting_evidence: 'Inspeksi bed IGD',
        evidence_url: '',
        recommendation: '',
      },
      {
        id: crypto.randomUUID(),
        supervision_id: sup1Id,
        instrument_item_id: item5Id,
        item_name_snapshot: 'Pemilahan limbah medis tajam (safety box) dan limbah infeksius tidak melebihi 3/4 kapasitas',
        category_name_snapshot: 'Pencegahan & Pengendalian Infeksi (PPI) dan Kesiapan Fasilitas',
        weight_snapshot: 1.5,
        answer: 'Sesuai',
        notes: 'Safety box dalam batas aman.',
        supporting_evidence: 'Inspeksi ruang tindakan',
        evidence_url: '',
        recommendation: '',
      },
    ],
    [sup2Id]: [
      {
        id: crypto.randomUUID(),
        supervision_id: sup2Id,
        instrument_item_id: item1Id,
        item_name_snapshot: 'Kepatuhan identifikasi pasien dengan minimal 2 identitas (Nama & Tanggal Lahir/No. RM)',
        category_name_snapshot: 'Sasaran Keselamatan Pasien (SKP)',
        weight_snapshot: 2.0,
        answer: 'Sesuai',
        notes: 'Sesuai standar.',
        supporting_evidence: '',
        evidence_url: '',
        recommendation: '',
      },
      {
        id: crypto.randomUUID(),
        supervision_id: sup2Id,
        instrument_item_id: item2Id,
        item_name_snapshot: 'Penerapan komunikasi efektif SBAR dan TBAK pada serah terima / instruksi lisan',
        category_name_snapshot: 'Sasaran Keselamatan Pasien (SKP)',
        weight_snapshot: 1.5,
        answer: 'Tidak Sesuai',
        notes: 'Ditemukan 2 berkas CPPT instruksi telepon DPJP belum diparaf verifikasi TBAK dalam 1x24 jam.',
        supporting_evidence: 'Audit RM Rawat Inap',
        evidence_url: '',
        recommendation: 'Lakukan sosialisasi ulang pengisian stempel TBAK dan reminder oleh Kepala Ruangan setiap pagi.',
      },
      {
        id: crypto.randomUUID(),
        supervision_id: sup2Id,
        instrument_item_id: item3Id,
        item_name_snapshot: 'Penandaan dan penyimpanan obat High-Alert & LASA terpisah dengan stiker jelas',
        category_name_snapshot: 'Sasaran Keselamatan Pasien (SKP)',
        weight_snapshot: 2.0,
        answer: 'Sesuai',
        notes: 'Lemari obat terkunci dan berlabel.',
        supporting_evidence: '',
        evidence_url: '',
        recommendation: '',
      },
      {
        id: crypto.randomUUID(),
        supervision_id: sup2Id,
        instrument_item_id: item4Id,
        item_name_snapshot: 'Ketersediaan handrub berbasis alkohol di setiap titik perawatan dan kepatuhan 5 momen cuci tangan',
        category_name_snapshot: 'Pencegahan & Pengendalian Infeksi (PPI) dan Kesiapan Fasilitas',
        weight_snapshot: 1.5,
        answer: 'Sesuai',
        notes: 'Handrub terisi penuh.',
        supporting_evidence: '',
        evidence_url: '',
        recommendation: '',
      },
      {
        id: crypto.randomUUID(),
        supervision_id: sup2Id,
        instrument_item_id: item5Id,
        item_name_snapshot: 'Pemilahan limbah medis tajam (safety box) dan limbah infeksius tidak melebihi 3/4 kapasitas',
        category_name_snapshot: 'Pencegahan & Pengendalian Infeksi (PPI) dan Kesiapan Fasilitas',
        weight_snapshot: 1.5,
        answer: 'Sesuai',
        notes: 'Pemilahan limbah sesuai SOP PPI.',
        supporting_evidence: '',
        evidence_url: '',
        recommendation: '',
      },
    ],
  };

  const finding1Id = crypto.randomUUID();
  const finding2Id = crypto.randomUUID();
  const findings = [
    {
      id: finding1Id,
      finding_number: 'TM-202611-201',
      supervision_id: sup1Id,
      supervision_number: 'SUP-202611-101',
      unit_id: unitIdByCode['IGD-01'],
      unit_name: 'IGD',
      unit_category: 'INSTALASI GAWAT DARURAT',
      instrument_item_id: item3Id,
      item_name: 'Penandaan dan penyimpanan obat High-Alert & LASA terpisah dengan stiker jelas',
      category_name: 'Sasaran Keselamatan Pasien (SKP)',
      description: 'Ditemukan 2 ampul obat High-Alert di laci troli emergensi yang stikernya terkelupas dan segel troli belum diperbarui.',
      evidence_url: '',
      risk_level: 'Tinggi',
      recommendation: 'Segera tempel ulang stiker High-Alert merah dan lakukan penyegelan ulang bersama petugas Farmasi.',
      pic_id: komiteProfile.id,
      pic_name: komiteProfile.full_name,
      due_date: '2026-11-22',
      status: 'Belum Ditindaklanjuti',
      created_at: now,
    },
    {
      id: finding2Id,
      finding_number: 'TM-202611-202',
      supervision_id: sup2Id,
      supervision_number: 'SUP-202611-102',
      unit_id: unitIdByCode['RI-01'],
      unit_name: 'Ruang Perawatan',
      unit_category: 'RAWAT INAP',
      instrument_item_id: item2Id,
      item_name: 'Penerapan komunikasi efektif SBAR dan TBAK pada serah terima / instruksi lisan',
      category_name: 'Sasaran Keselamatan Pasien (SKP)',
      description: 'Ditemukan 2 berkas CPPT instruksi telepon DPJP belum diparaf verifikasi TBAK dalam 1x24 jam.',
      evidence_url: '',
      risk_level: 'Sedang',
      recommendation: 'Lakukan sosialisasi ulang pengisian stempel TBAK dan reminder oleh Kepala Ruangan setiap pagi.',
      pic_id: komiteProfile.id,
      pic_name: komiteProfile.full_name,
      due_date: '2026-11-30',
      status: 'Dalam Proses',
      created_at: now,
    },
  ];

  const followUp1Id = crypto.randomUUID();
  const follow_ups = [
    {
      id: followUp1Id,
      finding_id: finding2Id,
      root_cause: 'Perawat jaga malam belum menempelkan stempel TBAK saat menerima instruksi lisan via telepon.',
      corrective_action: 'Menempelkan stempel TBAK di meja nurse station dan melengkapi paraf DPJP saat visite pagi.',
      preventive_action: 'Briefing pre-conference setiap pergantian shift mengenai kepatuhan TBAK 1x24 jam.',
      responsible_person: 'Kepala Ruangan Rawat Inap & Komite Mutu',
      resources_needed: 'Stempel TBAK tambahan di setiap nurse station',
      target_date: '2026-11-25',
      execution_date: '2026-11-17',
      evidence_url: '',
      status: 'Dalam Proses',
      submitted_by: komiteProfile.id,
      submitted_by_name: komiteProfile.full_name,
      submitted_at: now,
    },
  ];

  return {
    version: 1,
    updated_at: now,
    settings: {
      id: crypto.randomUUID(),
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
    supervisions,
    supervision_answers,
    findings,
    follow_ups,
    verification_logs: [],
    notifications: [
      {
        id: crypto.randomUUID(),
        recipient_id: null,
        recipient_role: 'KOMITE_MUTU',
        unit_id: unitIdByCode['IGD-01'],
        title: 'Temuan Baru Risiko Tinggi di IGD',
        message: 'Temuan TM-202611-201 pada indikator Obat High-Alert memerlukan tindak lanjut perbaikan segera.',
        category: 'warning',
        related_table: 'findings',
        related_id: finding1Id,
        is_read: false,
        created_at: now,
      },
    ],
    audit_logs: [
      {
        id: crypto.randomUUID(),
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
  const buckets = [DB_BUCKET, 'supervision-evidence', 'followup-evidence', 'application-assets'];
  const { data: existing } = await sb.storage.listBuckets();
  const existingIds = new Set((existing || []).map((b) => b.id));

  for (const b of buckets) {
    if (!existingIds.has(b)) {
      await sb.storage.createBucket(b, { public: b !== DB_BUCKET });
    }
  }
}

async function syncProfilesWithSupabaseAuth(sb: SupabaseClient, profiles: any[]) {
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
      if (!existingUser) {
        const { data: created } = await sb.auth.admin.createUser({
          email,
          password: p.password || 'Sismut2026!',
          email_confirm: true,
          user_metadata: {
            profile_id: p.id,
            full_name: p.full_name,
            role: p.role,
            unit_id: p.unit_id,
            unit_name: p.unit_name,
            position_title: p.position_title,
            is_active: p.is_active,
          },
        });
        if (created?.user?.id) {
          p.auth_user_id = created.user.id;
        }
      } else {
        p.auth_user_id = existingUser.id;
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
      throw new Error(`Gagal menyimpan data ke Supabase Cloud: ${retry.error.message}`);
    }
  }
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
    await ensureSupabaseBuckets(sb);

    const { data: blob, error } = await sb.storage.from(DB_BUCKET).download(DB_OBJECT_KEY);

    if (!error && blob) {
      try {
        const text = await blob.text();
        const parsed = JSON.parse(text) as SupabaseCloudDatabase;
        // Ensure the 3 core roles exist if profiles ever became empty
        if (!Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
          const seed = buildInitialSeedDatabase();
          parsed.profiles = seed.profiles;
          await syncProfilesWithSupabaseAuth(sb, parsed.profiles);
          await saveSupabaseDatabase(parsed);
        }
        inMemoryCache = parsed;
        return parsed;
      } catch {
        // Re-initialize if corrupted
      }
    }

    const initialDb = buildInitialSeedDatabase();
    await syncProfilesWithSupabaseAuth(sb, initialDb.profiles);
    await saveSupabaseDatabase(initialDb);
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
        position_title: profile.position_title,
        is_active: profile.is_active,
      },
    });
    return data?.user?.id || null;
  } catch {
    return null;
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
