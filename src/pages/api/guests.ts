import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { jsonResponse } from '../../utils/http';
import { getSessionFromCookies } from '../../utils/session';

export const prerender = false;

async function checkWeddingAuth(session: any, weddingId: string, adminSupabase: any): Promise<boolean> {
  if (!session) return false;
  if (session.role === 'admin') return true;
  if (session.role === 'client') {
    if (session.weddingId && session.weddingId === weddingId) return true;
    const { data } = await adminSupabase
      .from('weddings')
      .select('id')
      .eq('slug', session.slug)
      .single();
    return data?.id === weddingId;
  }
  return false;
}

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const session = locals.session || await getSessionFromCookies(cookies);
    if (!session) {
      return jsonResponse({ error: 'Unauthorized: Sesi tidak valid atau telah berakhir.' }, 401);
    }

    const payload = await request.json();
    const { weddingId, name, phone, guests } = payload;

    if (!weddingId) {
      return jsonResponse({ error: 'weddingId is required' }, 400);
    }

    const adminSupabase = await getSupabaseAdmin();
    const isAuthorized = await checkWeddingAuth(session, weddingId, adminSupabase);
    if (!isAuthorized) {
      return jsonResponse({ error: 'Forbidden: Anda tidak memiliki akses ke data undangan ini.' }, 403);
    }

    // Support batch insertion
    if (Array.isArray(guests) && guests.length > 0) {
      const recordsToInsert = guests
        .filter((g: any) => g && g.name && String(g.name).trim())
        .map((g: any) => ({
          wedding_id: weddingId,
          guest_name: String(g.name).trim(),
          phone: g.phone ? String(g.phone).trim() : null
        }));

      if (recordsToInsert.length === 0) {
        return jsonResponse({ error: 'Tidak ada data tamu valid untuk diimpor.' }, 400);
      }

      const { data, error } = await adminSupabase
        .from('sent_invitations')
        .insert(recordsToInsert)
        .select('id, guest_name, phone, created_at');

      if (error) throw error;

      return jsonResponse({
        success: true,
        message: `${data.length} tamu berhasil ditambahkan.`,
        items: data
      });
    }

    // Single insertion
    if (!name) {
      return jsonResponse({ error: 'Nama tamu (name) diperlukan.' }, 400);
    }

    const { data, error } = await adminSupabase
      .from('sent_invitations')
      .insert({
        wedding_id: weddingId,
        guest_name: String(name).trim(),
        phone: phone ? String(phone).trim() : null
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

export const DELETE: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const session = locals.session || await getSessionFromCookies(cookies);
    if (!session) {
      return jsonResponse({ error: 'Unauthorized: Sesi tidak valid atau telah berakhir.' }, 401);
    }

    const payload = await request.json();
    const { id } = payload;

    if (!id) {
      return jsonResponse({ error: 'id is required' }, 400);
    }

    const adminSupabase = await getSupabaseAdmin();

    if (session.role !== 'admin') {
      // Ensure client owns the guest record
      const { data: guestRecord } = await adminSupabase
        .from('sent_invitations')
        .select('wedding_id')
        .eq('id', id)
        .single();

      if (!guestRecord) {
        return jsonResponse({ error: 'Tamu tidak ditemukan.' }, 404);
      }

      const isAuthorized = await checkWeddingAuth(session, guestRecord.wedding_id, adminSupabase);
      if (!isAuthorized) {
        return jsonResponse({ error: 'Forbidden: Anda tidak memiliki akses untuk menghapus data ini.' }, 403);
      }
    }

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
