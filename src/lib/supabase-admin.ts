import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseClientOptions } from './supabase-options';

function getEnvValue(name: string) {
  return (typeof process !== 'undefined' ? process.env[name] : '') || import.meta.env[name] || '';
}

let cachedAdminClient: SupabaseClient<any> | null = null;
let cachedAdminKey = '';

export async function getSupabaseAdmin() {
  const supabaseUrl = getEnvValue('SUPABASE_URL');
  const serviceRoleKey = getEnvValue('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for dashboard CRUD operations.');
  }

  const currentKey = `${supabaseUrl}::${serviceRoleKey}`;
  if (!cachedAdminClient || cachedAdminKey !== currentKey) {
    cachedAdminClient = createClient<any>(supabaseUrl, serviceRoleKey, createSupabaseClientOptions());
    cachedAdminKey = currentKey;
  }

  return cachedAdminClient;
}
