import { createClient } from '@supabase/supabase-js';
import { createSupabaseClientOptions } from './supabase-options';

function getEnvValue(name: string) {
  return (typeof process !== 'undefined' ? process.env[name] : '') || import.meta.env[name] || '';
}

export async function getSupabaseAdmin() {
  const supabaseUrl = getEnvValue('SUPABASE_URL');
  const serviceRoleKey = getEnvValue('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for dashboard CRUD operations.');
  }

  const clientOptions = createSupabaseClientOptions();

  return createClient(supabaseUrl, serviceRoleKey, {
    ...clientOptions
  });
}
