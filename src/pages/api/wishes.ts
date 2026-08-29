import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { jsonResponse, parseBoundedInt } from '../../utils/http';
import { decodeHtmlEntities } from '../../utils/template-helpers';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const weddingId = url.searchParams.get('weddingId');
    const pageParam = url.searchParams.get('page');
    const offsetParam = url.searchParams.get('offset');
    const limit = parseBoundedInt(url.searchParams.get('limit'), 4, 1, 50);

    if (!weddingId) {
      return jsonResponse({ error: 'weddingId is required.' }, 400);
    }

    let offset = 0;
    if (pageParam !== null) {
      const page = parseBoundedInt(pageParam, 1, 1, Number.MAX_SAFE_INTEGER);
      offset = (page - 1) * limit;
    } else if (offsetParam !== null) {
      offset = parseBoundedInt(offsetParam, 0, 0, Number.MAX_SAFE_INTEGER);
    }

    if (weddingId.startsWith('preview-')) {
      const mockWishes = Array.from({ length: 40 }, (_, i) => ({
        id: `wish-${i + 1}`,
        wedding_id: weddingId,
        guest_name: ['Sahabat', 'Budi Santoso', 'Siti Rahma', 'Dimas Anggara', 'Rina Wulandari', 'Andi Pratama', 'Maya Putri', 'Eko Prasetyo', 'Dewi Lestari', 'Fajar Ramadhan'][i % 10] + ` #${i + 1}`,
        attendance_status: i % 3 === 0 ? 'attending' : (i % 3 === 1 ? 'tentative' : 'declined'),
        guest_count: (i % 3) + 1,
        message: [
          'Selamat menempuh hidup baru, semoga bahagia selalu!',
          'Selamat ya! Semoga lancar sampai hari H dan langgeng selamanya.',
        ][i % 4],
        created_at: new Date(Date.now() - i * 3600000).toISOString()
      }));

      const items = mockWishes.slice(offset, offset + limit);
      const total = mockWishes.length;
      const totalPages = Math.ceil(total / limit);
      const currentPage = Math.floor(offset / limit) + 1;

      return jsonResponse({
        items,
        total,
        page: currentPage,
        totalPages,
        hasMore: offset + limit < total
      });
    }

    const { data, count, error } = await supabase
      .from('rsvps')
      .select('id, guest_name, attendance_status, message, created_at', { count: 'exact' })
      .eq('wedding_id', weddingId)
      .not('message', 'is', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const items = (data || []).map((w) => ({
      ...w,
      guest_name: decodeHtmlEntities(w.guest_name),
      message: decodeHtmlEntities(w.message)
    }));
    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.floor(offset / limit) + 1;

    return jsonResponse({
      items,
      total,
      page: currentPage,
      totalPages,
      hasMore: offset + limit < total
    });
  } catch (error: any) {
    console.error('Wishes load api error:', error);
    return jsonResponse({ error: error.message || 'Failed to load wishes.' }, 500);
  }
};
