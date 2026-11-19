# Panduan Konfigurasi Supabase — SISMUT RSUD Al-Mulk Kota Sukabumi

Aplikasi SISMUT mendukung dua mode backend secara penuh:
1. **Mode Terintegrasi Server (Default AI Studio)**: Menggunakan Express, database relasional server-side SQLite (`data/sismut.db`), WebSocket Realtime (`/ws`), dan penyimpanan terproteksi (`/api/storage/...`) sehingga seluruh fitur langsung berjalan tanpa konfigurasi tambahan.
2. **Mode Supabase Cloud (Produksi PostgreSQL)**: Aktif otomatis ketika environment variables Supabase diisi.

## Langkah Aktivasi Mode Supabase PostgreSQL

1. Buat proyek baru di **Supabase**.
2. Buka **SQL Editor** di dashboard Supabase, lalu jalankan seluruh isi file `supabase/schema.sql`.
   - Skrip tersebut membuat seluruh 15 tabel relasional dengan UUID PK, foreign keys, indeks, trigger `updated_at`, fungsi transaksional (`finalize_supervision`, `reopen_supervision`), bucket storage privat (`supervision-evidence`, `followup-evidence`, `application-assets`), publikasi Realtime (`supabase_realtime`), dan seluruh kebijakan Row Level Security (RLS) untuk 5 peran pengguna (`SUPER_ADMIN`, `ADMIN_MUTU`, `SUPERVISOR`, `KEPALA_UNIT`, `DIREKSI`).
3. Buat akun pengguna melalui **Authentication > Users** di Supabase dan sisipkan baris yang sesuai ke tabel `public.profiles` dengan `role` dan `unit_id`.
4. Isi environment variables berikut di `.env`:
   ```env
   VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
   VITE_SUPABASE_ANON_KEY="<anon-key>"
   ```
   *(Jangan pernah menaruh `SUPABASE_SERVICE_ROLE_KEY` pada variabel berawalan `VITE_`)*
5. Restart server dengan `npm run dev` atau build produksi dengan `npm run build && npm start`.
