import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { jsonResponse } from '../../utils/http';
import { getSessionFromCookies } from '../../utils/session';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const session = locals.session || await getSessionFromCookies(cookies);
    if (!session) {
      return jsonResponse({ error: 'Unauthorized: Sesi tidak valid atau telah berakhir.' }, 401);
    }

    const payload = await request.json();
    const { weddingId, templates } = payload;

    if (!weddingId || !templates) {
      return jsonResponse({ error: 'weddingId and templates are required' }, 400);
    }

    const adminSupabase = await getSupabaseAdmin();

    if (session.role !== 'admin') {
      const { data: wedding } = await adminSupabase
        .from('weddings')
        .select('id')
        .eq('slug', session.slug)
        .single();

      if (!wedding || wedding.id !== weddingId) {
        return jsonResponse({ error: 'Forbidden: Anda tidak memiliki akses untuk mengubah template ini.' }, 403);
      }
    }

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
