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
  'click_wishes',
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

    // Insert into invitation_events using admin supabase
    const adminSupabase = await getSupabaseAdmin();
    const { error } = await adminSupabase.from('invitation_events').insert({
      wedding_id: weddingId,
      event_type: eventType,
      guest_name: guestName ? String(guestName).trim().slice(0, 255) : null,
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
