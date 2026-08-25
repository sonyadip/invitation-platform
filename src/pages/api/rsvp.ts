import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { jsonResponse } from '../../utils/http';
import { validateRSVPInput } from '../../utils/security';
import { getSessionFromCookies } from '../../utils/session';
import { logActivity } from '../../services/activity-log';

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
      return jsonResponse({ error: 'Wedding ID (weddingId) is required.' }, 400);
    }

    const normalizedMessage = message ? String(message).trim().slice(0, 500) : '';

    // Mock handler for preview pages
    if (typeof weddingId === 'string' && weddingId.startsWith('preview-')) {
      const validated = validateRSVPInput(name, attendance, count);
      const mockItem = {
        id: `wish-preview-${Date.now()}`,
        wedding_id: weddingId,
        guest_name: validated.name,
        attendance_status: validated.status,
        guest_count: validated.count,
        message: normalizedMessage,
        created_at: new Date().toISOString()
      };
      return jsonResponse({
        success: true,
        message: 'RSVP confirmation submitted successfully.',
        item: mockItem
      });
    }

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
      return jsonResponse({ error: 'Invitation settings not found or invalid.' }, 404);
    }

    // 2. Enforce RSVP enabled constraint
    if (!settings.rsvp_enabled) {
      return jsonResponse({ error: 'RSVP confirmation for this invitation has been closed by admin.' }, 403);
    }

    // 3. Enforce expiration constraint
    if (settings.expiration_date && new Date(settings.expiration_date) < new Date()) {
      return jsonResponse({ error: 'The online invitation has expired. RSVP submission is closed.' }, 403);
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

    // Log activity (fail-safe)
    const statusText = validated.status === 'attending' ? 'Attending' : (validated.status === 'tentative' ? 'Tentative' : 'Declined');
    await logActivity({
      wedding_id: weddingId,
      actor_type: 'guest',
      actor_name: validated.name,
      action: 'rsvp.submit',
      entity_type: 'rsvp',
      entity_id: insertedRSVP.id,
      description: `Guest '${validated.name}' submitted RSVP confirmation (${statusText} - ${validated.count} pax).` + (normalizedMessage ? ` Message: "${normalizedMessage.slice(0, 80)}"` : ''),
      metadata: {
        guest_name: validated.name,
        attendance_status: validated.status,
        guest_count: validated.count,
        has_message: Boolean(normalizedMessage)
      }
    });

    return jsonResponse({
      success: true,
      message: 'RSVP confirmation submitted successfully.',
      item: insertedRSVP
    });

  } catch (error: any) {
    console.error('RSVP submission api error:', error);
    return jsonResponse({ error: error.message || 'Failed to process RSVP confirmation.' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const session = locals.session || await getSessionFromCookies(cookies);
    if (!session) {
      return jsonResponse({ error: 'Unauthorized: Sesi tidak valid atau telah berakhir.' }, 401);
    }

    const payload = await request.json();
    const { id } = payload;

    if (!id) {
      return jsonResponse({ error: 'id is required.' }, 400);
    }

    const adminSupabase = await getSupabaseAdmin();

    if (session.role !== 'admin') {
      const { data: rsvpRecord } = await adminSupabase
        .from('rsvps')
        .select('wedding_id')
        .eq('id', id)
        .single();

      if (!rsvpRecord) {
        return jsonResponse({ error: 'Data RSVP tidak ditemukan.' }, 404);
      }

      const { data: wedding } = await adminSupabase
        .from('weddings')
        .select('id')
        .eq('slug', session.slug)
        .single();

      if (!wedding || wedding.id !== rsvpRecord.wedding_id) {
        return jsonResponse({ error: 'Forbidden: Anda tidak memiliki akses untuk menghapus RSVP ini.' }, 403);
      }
    }

    const { error } = await adminSupabase
      .from('rsvps')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return jsonResponse({
      success: true,
      message: 'RSVP entry deleted successfully.'
    });
  } catch (error: any) {
    console.error('RSVP delete API error:', error);
    return jsonResponse({ error: error.message || 'Failed to delete RSVP entry.' }, 500);
  }
};
