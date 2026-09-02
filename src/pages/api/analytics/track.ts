import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { jsonResponse } from '../../../utils/http';

export const prerender = false;

const ALLOWED_EVENTS = new Set([
  'open_cover',
  'click_maps',
  'click_calendar',
  'copy_gift',
  'play_music',
  'pause_music',
  'play_video',
  'click_wishes',
  'click_rsvp',
  'view_gallery',
  'click_couple_instagram',
  'click_vendor_whatsapp',
  'click_vendor_instagram',
  'click_vendor_site'
]);

export const POST: APIRoute = async ({ request }) => {
  try {
    let payload: any = null;
    try {
      payload = await request.json();
    } catch {
      const rawText = await request.text().catch(() => '');
      if (rawText) {
        try {
          payload = JSON.parse(rawText);
        } catch {
          payload = null;
        }
      }
    }

    if (!payload || typeof payload !== 'object') {
      return jsonResponse({ error: 'Invalid JSON payload' }, 400);
    }

    const { weddingId, eventType, guestName, metadata } = payload;

    if (!weddingId || typeof weddingId !== 'string') {
      return jsonResponse({ error: 'weddingId is required' }, 400);
    }

    if (!eventType || !ALLOWED_EVENTS.has(eventType)) {
      return jsonResponse({ error: 'Invalid or unsupported eventType' }, 400);
    }

    // Server-side deduplication safeguard within 2 seconds
    const adminSupabase = await getSupabaseAdmin();
    const twoSecondsAgo = new Date(Date.now() - 2000).toISOString();
    const sanitizedGuest = guestName ? String(guestName).trim().slice(0, 255) : null;

    let checkQuery = adminSupabase
      .from('invitation_events')
      .select('id')
      .eq('wedding_id', weddingId)
      .eq('event_type', eventType)
      .gte('created_at', twoSecondsAgo);

    if (sanitizedGuest) {
      checkQuery = checkQuery.eq('guest_name', sanitizedGuest);
    } else {
      checkQuery = checkQuery.is('guest_name', null);
    }

    const { data: recentEvents } = await checkQuery.limit(1);
    if (recentEvents && recentEvents.length > 0) {
      return jsonResponse({ success: true, deduped: true });
    }

    // Insert into invitation_events using admin supabase
    const { error } = await adminSupabase.from('invitation_events').insert({
      wedding_id: weddingId,
      event_type: eventType,
      guest_name: sanitizedGuest,
      metadata: metadata && typeof metadata === 'object' ? metadata : {}
    });

    if (error) {
      console.warn('Analytics event tracking error:', error.message);
      return jsonResponse({ success: false, message: error.message });
    }

    return jsonResponse({ success: true });
  } catch (error: any) {
    console.error('Track API error:', error);
    return jsonResponse({ error: error.message || 'Failed to track event' }, 500);
  }
};
