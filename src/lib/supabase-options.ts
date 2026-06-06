export async function createSupabaseClientOptions() {
  const options: any = {
    auth: {
      persistSession: false
    }
  };

  if (typeof globalThis.WebSocket === 'undefined' && typeof window === 'undefined') {
    try {
      const ws = await import('ws');
      options.realtime = {
        transport: ws.WebSocket || ws.default || ws
      };
    } catch (err) {
      console.warn('Could not load ws transport for Supabase Realtime:', err);
    }
  }

  return options;
}
