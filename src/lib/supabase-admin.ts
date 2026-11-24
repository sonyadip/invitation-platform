import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseClientOptions } from './supabase-options';
import type { SessionPayload } from '../utils/session';

function getEnvValue(name: string, runtimeEnv?: Record<string, string | undefined>) {
  return runtimeEnv?.[name] || (typeof process !== 'undefined' ? process.env[name] : '') || import.meta.env[name] || '';
}

let cachedAdminClient: SupabaseClient<any> | null = null;
let cachedAdminKey = '';

export async function getSupabaseAdmin(runtimeEnv?: Record<string, string | undefined>) {
  const supabaseUrl = getEnvValue('SUPABASE_URL', runtimeEnv);
  const serviceRoleKey = getEnvValue('SUPABASE_SERVICE_ROLE_KEY', runtimeEnv);

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

/**
 * Verifies whether the current session owns or administers the target wedding.
 */
export async function hasWeddingWriteAccess(
  adminSupabase: SupabaseClient<any>,
  session: SessionPayload | null | undefined,
  weddingId: string
): Promise<boolean> {
  if (!session) return false;
  if (session.role === 'admin') return true;
  if (session.role !== 'client') return false;
  if (session.weddingId && session.weddingId === weddingId) return true;
  if (!session.slug) return false;

  const { data: wedding } = await adminSupabase
    .from('weddings')
    .select('id')
    .eq('slug', session.slug)
    .maybeSingle();

  return wedding?.id === weddingId;
}
