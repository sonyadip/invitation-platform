import { createClient } from '@supabase/supabase-js';
import { createSupabaseClientOptions } from './supabase-options';

const supabaseUrl =
  (typeof process !== 'undefined' ? process.env.SUPABASE_URL : '') ||
  import.meta.env.SUPABASE_URL ||
  'https://placeholder-project-id.supabase.co'; // Fallback to avoid build compilation crash

const supabaseAnonKey =
  (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : '') ||
  import.meta.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-key'; // Fallback to avoid build compilation crash

if (supabaseUrl.includes('placeholder-project-id')) {
  console.warn('WARNING: Supabase URL and Anon Key are using default placeholder values. Database calls will fail until actual credentials are configured in your environment.');
}

const clientOptions = await createSupabaseClientOptions();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, clientOptions);
