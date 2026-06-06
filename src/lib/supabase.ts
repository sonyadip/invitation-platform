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
