import { createClient } from '@supabase/supabase-js';
import { createSupabaseClientOptions } from './supabase-options';

const supabaseUrl = import.meta.env.SUPABASE_URL || 
  (typeof process !== 'undefined' ? process.env.SUPABASE_URL : '') || 
  'https://placeholder-project-id.supabase.co'; // Fallback to avoid build compilation crash

const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY || 
  (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : '') || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-key'; // Fallback to avoid build compilation crash

if (supabaseUrl.includes('placeholder-project-id')) {
  console.warn('WARNING: Supabase URL and Anon Key are using default placeholder values. Database calls will fail until actual credentials are configured in your environment.');
}

const clientOptions = await createSupabaseClientOptions();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, clientOptions);
