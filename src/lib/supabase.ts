import { createClient } from '@supabase/supabase-js';
import { createSupabaseClientOptions } from './supabase-options';

function getEnvValue(name: string) {
  return (typeof process !== 'undefined' ? process.env[name] : '') || import.meta.env[name] || '';
}

function createSupabaseClient() {
  const supabaseUrl = getEnvValue('SUPABASE_URL');
  const supabaseAnonKey = getEnvValue('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required.');
  }

  return createClient(supabaseUrl, supabaseAnonKey, createSupabaseClientOptions());
}

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, property) {
    const client = createSupabaseClient() as any;
    const value = client[property];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

/**
 * Automatically pages through Supabase queries in chunks of 1000 to overcome PostgREST default max-rows limit.
 */
export async function fetchAllRows<T = any>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const results: T[] = [];
  let page = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    results.push(...data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  return results;
}

