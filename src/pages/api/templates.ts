import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { jsonResponse } from '../../utils/http';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await request.json();
    const { weddingId, templates } = payload;

    if (!weddingId || !templates) {
      return jsonResponse({ error: 'weddingId and templates are required' }, 400);
    }

    const adminSupabase = await getSupabaseAdmin();
    const { error } = await adminSupabase
      .from('invitation_settings')
      .update({ wa_templates: templates })
      .eq('wedding_id', weddingId);

    if (error) throw error;

    return jsonResponse({
      success: true,
      message: 'Templates updated successfully'
    });
  } catch (error: any) {
    console.error('Templates API POST error:', error);
    return jsonResponse({ error: error.message || 'Failed to update templates' }, 500);
  }
};
