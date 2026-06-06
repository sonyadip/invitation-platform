import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
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

    if (!weddingId) {
      return jsonResponse({ error: 'ID Pernikahan (weddingId) wajib disertakan.' }, 400);
    }

    // 1. Fetch dynamic settings to verify toggle & expiration state
    const { data: settings, error: settingsError } = await supabase
      .from('invitation_settings')
      .select('rsvp_enabled, expiration_date')
      .eq('wedding_id', weddingId)
      .maybeSingle();

    if (settingsError || !settings) {
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

    // 5. Store validated RSVP response into Supabase
    const { data: insertedRSVP, error: insertError } = await supabase
      .from('rsvps')
      .insert({
        wedding_id: weddingId,
        guest_name: validated.name,
        attendance_status: validated.status,
        guest_count: validated.count,
        message: message ? String(message).trim().slice(0, 500) : null // Safe message trim cap
      })
      .select('guest_name, attendance_status, message, created_at')
      .single();

    if (insertError) {
      throw insertError;
    }

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
