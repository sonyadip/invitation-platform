import type { APIRoute } from 'astro';
import { fetchAllRows } from '../../lib/supabase';
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
      const validGuests = guests.filter((g: any) => g && g.name && String(g.name).trim());
      if (validGuests.length === 0) {
        return jsonResponse({ error: 'Tidak ada data tamu valid untuk diimpor.' }, 400);
      }

      // Check past views for all guests in batch
      const allPastViews = await fetchAllRows((from, to) =>
        adminSupabase
          .from('invitation_views')
          .select('guest_name, created_at')
          .eq('wedding_id', weddingId)
          .not('guest_name', 'is', null)
          .order('created_at', { ascending: true })
          .range(from, to)
      );

      const pastViewsMap = new Map<string, { first: string; last: string; count: number }>();
      if (allPastViews) {
        for (const pv of allPastViews) {
          const key = (pv.guest_name || '').trim().toLowerCase();
          if (!key) continue;
          const existing = pastViewsMap.get(key);
          if (!existing) {
            pastViewsMap.set(key, { first: pv.created_at, last: pv.created_at, count: 1 });
          } else {
            existing.last = pv.created_at;
            existing.count += 1;
          }
        }
      }

      const recordsToInsert = validGuests.map((g: any) => {
        const cleanName = String(g.name).trim();
        const past = pastViewsMap.get(cleanName.toLowerCase());
        return {
          wedding_id: weddingId,
          guest_name: cleanName,
          phone: g.phone ? String(g.phone).trim() : null,
          opened_at: past ? past.first : null,
          last_opened_at: past ? past.last : null,
          open_count: past ? past.count : 0
        };
      });

      const { data, error } = await adminSupabase
        .from('sent_invitations')
        .insert(recordsToInsert)
        .select('id, guest_name, phone, opened_at, last_opened_at, open_count, created_at');

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

    const cleanName = String(name).trim();

    // Check if there are existing views for this guest in invitation_views
    const pastViews = await fetchAllRows((from, to) =>
      adminSupabase
        .from('invitation_views')
        .select('created_at')
        .eq('wedding_id', weddingId)
        .ilike('guest_name', cleanName)
        .order('created_at', { ascending: true })
        .range(from, to)
    );

    let openedAt: string | null = null;
    let lastOpenedAt: string | null = null;
    let openCount = 0;

    if (pastViews && pastViews.length > 0) {
      openedAt = pastViews[0].created_at;
      lastOpenedAt = pastViews[pastViews.length - 1].created_at;
      openCount = pastViews.length;
    }

    const { data, error } = await adminSupabase
      .from('sent_invitations')
      .insert({
        wedding_id: weddingId,
        guest_name: cleanName,
        phone: phone ? String(phone).trim() : null,
        opened_at: openedAt,
        last_opened_at: lastOpenedAt,
        open_count: openCount
      })
      .select('id, guest_name, phone, opened_at, last_opened_at, open_count, created_at')
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
