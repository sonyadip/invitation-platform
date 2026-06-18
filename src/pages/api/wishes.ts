import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { jsonResponse, parseBoundedInt } from '../../utils/http';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const weddingId = url.searchParams.get('weddingId');
    const offset = parseBoundedInt(url.searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);
    const limit = parseBoundedInt(url.searchParams.get('limit'), 3, 1, 50);

    if (!weddingId) {
      return jsonResponse({ error: 'weddingId is required.' }, 400);
    }

    console.log('[Noir RSVP API CHECK] wishes request:', { weddingId, offset, limit });

    const { data, error } = await supabase
      .from('rsvps')
      .select('id, guest_name, attendance_status, message, created_at')
      .eq('wedding_id', weddingId)
      .not('message', 'is', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit);

    if (error) throw error;

    const rows = data || [];
    const items = rows.slice(0, limit);

    console.log('[Noir RSVP API CHECK] wishes response:', {
      weddingId,
      offset,
      limit,
      returned: items.length,
      hasMore: rows.length > limit,
      ids: items.map((item: any) => item.id)
    });

    return jsonResponse({ items, hasMore: rows.length > limit });
  } catch (error: any) {
    console.error('Wishes load api error:', error);
    return jsonResponse({ error: error.message || 'Failed to load wishes.' }, 500);
  }
};
