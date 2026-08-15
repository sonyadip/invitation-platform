import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { jsonResponse } from '../../utils/http';
import { validateRSVPInput } from '../../utils/security';

export const prerender = false;

/**
 * Endpoint for processing incoming guest RSVPs.
 * Incorporates setting overrides (checking if RSVP is active or has expired),
 * handles input sanitization, and saves records securely.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await request.json();
    const { weddingId, name, attendance, count, message } = payload;
    console.log('[Noir RSVP API CHECK] raw payload:', payload);
    console.log('[Noir RSVP API] submit request', {
      weddingId,
      name,
      attendance,
      hasMessage: Boolean(message)
    });

    if (!weddingId) {
      return jsonResponse({ error: 'ID Pernikahan (weddingId) wajib disertakan.' }, 400);
    }

    const normalizedMessage = message ? String(message).trim().slice(0, 500) : '';

    // 1. Fetch dynamic settings to verify toggle & expiration state
    const { data: settings, error: settingsError } = await supabase
      .from('invitation_settings')
      .select('rsvp_enabled, expiration_date')
      .eq('wedding_id', weddingId)
      .maybeSingle();
    console.log('[Noir RSVP API CHECK] settings lookup result:', {
      weddingId,
      settings,
      settingsError
    });

    if (settingsError || !settings) {
      console.error('[Noir RSVP API] settings lookup failed', { weddingId, settingsError });
      return jsonResponse({ error: 'Pengaturan undangan tidak valid atau tidak ditemukan.' }, 404);
    }

    // 2. Enforce RSVP enabled constraint
    if (!settings.rsvp_enabled) {
      return jsonResponse({ error: 'Penerimaan konfirmasi kehadiran RSVP untuk undangan ini telah ditutup oleh admin.' }, 403);
    }

    // 3. Enforce expiration constraint
    if (settings.expiration_date && new Date(settings.expiration_date) < new Date()) {
      return jsonResponse({ error: 'Masa aktif undangan online telah berakhir. Pengiriman RSVP diblokir.' }, 403);
    }

    // 4. Sanitize and validate parameters using our security engine
    const validated = validateRSVPInput(name, attendance, count);
    console.log('[Noir RSVP API CHECK] validated payload:', validated);

    // 5. Store validated RSVP response into Supabase
    const insertPayload = {
      wedding_id: weddingId,
      guest_name: validated.name,
      attendance_status: validated.status,
      guest_count: validated.count,
      message: normalizedMessage
    };
    console.log('[Noir RSVP API CHECK] insert payload:', insertPayload);

    const { data: insertedRSVP, error: insertError } = await supabase
      .from('rsvps')
      .insert(insertPayload)
      .select('*')
      .single();
    console.log('[Noir RSVP API CHECK] insert result:', {
      insertedRSVP,
      insertError
    });

    if (insertError) {
      console.error('[Noir RSVP API] insert failed', { weddingId, insertError });
      throw insertError;
    }

    console.log('[Noir RSVP API] submit response', {
      weddingId,
      id: insertedRSVP.id,
      hasMessage: Boolean(insertedRSVP.message)
    });

    return jsonResponse({
      success: true,
      message: 'Kehadiran berhasil dikonfirmasi.',
      item: insertedRSVP
    });
  } catch (error: any) {
    console.error('RSVP submission api error:', error);
    return jsonResponse({ error: error.message || 'Gagal memproses konfirmasi kehadiran.' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const payload = await request.json();
    const { id } = payload;

    if (!id) {
      return jsonResponse({ error: 'id wajib disertakan.' }, 400);
    }

    const adminSupabase = await getSupabaseAdmin();
    const { error } = await adminSupabase
      .from('rsvps')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return jsonResponse({
      success: true,
      message: 'Data RSVP berhasil dihapus.'
    });
  } catch (error: any) {
    console.error('RSVP delete API error:', error);
    return jsonResponse({ error: error.message || 'Gagal menghapus data RSVP.' }, 500);
  }
};

