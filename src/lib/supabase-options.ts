import ws from 'ws';

export function createSupabaseClientOptions() {
  const options: any = {
    auth: {
      persistSession: false
    }
  };

  if (typeof globalThis.WebSocket === 'undefined' && typeof window === 'undefined') {
    options.realtime = {
      transport: (ws as any).WebSocket || ws
    };
  }

  return options;
}
