export function createSupabaseClientOptions() {
  return {
    auth: {
      persistSession: false
    }
  };
}
