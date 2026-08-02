import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { jsonResponse } from '../../utils/http';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await request.json();
    const { weddingId, name, phone } = payload;

    if (!weddingId || !name) {
      return jsonResponse({ error: 'weddingId and name are required' }, 400);
    }

    const adminSupabase = await getSupabaseAdmin();
    const { data, error } = await adminSupabase
      .from('sent_invitations')
      .insert({
        wedding_id: weddingId,
        guest_name: name,
        phone: phone || null
      })
      .select('id, guest_name, phone, created_at')
      .single();

    if (error) throw error;

    return jsonResponse({
      success: true,
      message: 'Guest added successfully',
      item: data
    });
  } catch (error: any) {
    console.error('Guests API POST error:', error);
    return jsonResponse({ error: error.message || 'Failed to add guest' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const payload = await request.json();
    const { id } = payload;

    if (!id) {
      return jsonResponse({ error: 'id is required' }, 400);
    }

    const adminSupabase = await getSupabaseAdmin();
    const { error } = await adminSupabase
      .from('sent_invitations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return jsonResponse({
      success: true,
      message: 'Guest deleted successfully'
    });
  } catch (error: any) {
    console.error('Guests API DELETE error:', error);
    return jsonResponse({ error: error.message || 'Failed to delete guest' }, 500);
  }
};
