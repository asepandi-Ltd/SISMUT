import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://hqqvbtxfantvoplfcxmt.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcXZidHhmYW50dm9wbGZjeG10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5NjkxODgsImV4cCI6MjExMDU0NTE4OH0.GnZ_o3416AeGCTwaUbqib1FHcRl1aMFkSfcKqT2rfx0';

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

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);
export const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    supabaseAnonKey.length > 20
);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export function requireSupabase(): SupabaseClient {
  return supabase;
}
