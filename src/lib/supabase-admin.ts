import { createClient } from '@supabase/supabase-js';
import { createSupabaseClientOptions } from './supabase-options';

const supabaseUrl =
  import.meta.env.SUPABASE_URL ||
  (typeof process !== 'undefined' ? process.env.SUPABASE_URL : '') ||
  '';

const serviceRoleKey =
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
  (typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY : '') ||
  '';

export async function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for dashboard CRUD operations.');
  }

  const clientOptions = await createSupabaseClientOptions();

  return createClient(supabaseUrl, serviceRoleKey, {
    ...clientOptions
  });
}
