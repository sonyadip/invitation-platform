import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { jsonResponse } from '../../../utils/http';
import { decodeHtmlEntities } from '../../../utils/template-helpers';
import { getSessionFromCookies } from '../../../utils/session';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals, cookies }) => {
  try {
    const session = locals.session || await getSessionFromCookies(cookies);
    const slug = url.searchParams.get('slug');
    const weddingIdParam = url.searchParams.get('weddingId');

    const adminSupabase = await getSupabaseAdmin();

    let weddingId = weddingIdParam;
    let weddingSlug = slug;
    if (!weddingId && slug) {
      const { data: w } = await adminSupabase.from('weddings').select('id, slug').eq('slug', slug).single();
      if (w) {
        weddingId = w.id;
        weddingSlug = w.slug;
      }
    } else if (weddingId && !weddingSlug) {
      const { data: w } = await adminSupabase.from('weddings').select('id, slug').eq('id', weddingId).single();
      if (w) weddingSlug = w.slug;
    }

    if (!weddingId) {
      return jsonResponse({ error: 'weddingId or slug is required' }, 400);
    }

    const isAdmin = session?.role === 'admin';
    const isClient = session?.role === 'client' && (session?.slug === weddingSlug || session?.weddingId === weddingId);

    if (!isAdmin && !isClient) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const [viewsRes, eventsRes, rsvpsRes] = await Promise.all([
      adminSupabase
        .from('invitation_views')
        .select('id, guest_name, device_type, os, browser, city, country, referrer, created_at')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false }),
      adminSupabase
        .from('invitation_events')
        .select('id, event_type, guest_name, metadata, created_at')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false }),
      adminSupabase
        .from('rsvps')
        .select('guest_name, attendance_status, guest_count, message')
        .eq('wedding_id', weddingId)
    ]);

    const rsvpMap = new Map<string, any>();
    for (const r of rsvpsRes.data || []) {
      if (r.guest_name) {
        rsvpMap.set(r.guest_name.trim().toLowerCase(), r);
      }
    }

    const eventLabels: Record<string, string> = {
      open_cover: 'Buka Undangan',
      click_maps: 'Petunjuk Maps',
      click_calendar: 'Simpan Kalender',
      copy_gift: 'Salin Rekening',
      play_music: 'Putar Musik',
      pause_music: 'Jeda Musik',
      play_video: 'Putar Video',
      view_gallery: 'Lihat Galeri',
      click_rsvp: 'Klik RSVP',
      click_wishes: 'Buka Doa / Ucapan',
      click_couple_instagram: 'Instagram Pengantin',
      click_vendor_whatsapp: 'WhatsApp Senadda',
      click_vendor_instagram: 'Instagram Senadda',
      click_vendor_site: 'Website Senadda',
      page_view: 'Kunjungan Halaman'
    };

    const viewItems = (viewsRes.data || []).map((v) => {
      const gName = v.guest_name ? decodeHtmlEntities(v.guest_name) : null;
      const rsvp = gName ? rsvpMap.get(gName.trim().toLowerCase()) : null;
      return {
        guestName: gName || 'Anonim',
        isGuest: !!gName,
        rsvpStatus: rsvp ? (rsvp.attendance_status === 'attending' ? `Hadir (${rsvp.guest_count}pax)` : rsvp.attendance_status === 'declined' ? 'Tidak Hadir' : 'Ragu') : 'Belum RSVP',
        activity: 'Kunjungan Halaman',
        detail: v.referrer ? `Referrer: ${v.referrer}` : 'Tautan Langsung / WhatsApp',
        device: `${v.device_type || 'mobile'} - ${v.browser || 'Unknown'} (${v.os || 'Unknown'})`,
        location: v.city ? `${v.city}${v.country ? `, ${v.country}` : ''}` : '-',
        createdAt: v.created_at
      };
    });

    const eventItems = (eventsRes.data || []).map((ev) => {
      const gName = ev.guest_name ? decodeHtmlEntities(ev.guest_name) : null;
      const rsvp = gName ? rsvpMap.get(gName.trim().toLowerCase()) : null;
      return {
        guestName: gName || 'Anonim',
        isGuest: !!gName,
        rsvpStatus: rsvp ? (rsvp.attendance_status === 'attending' ? `Hadir (${rsvp.guest_count}pax)` : rsvp.attendance_status === 'declined' ? 'Tidak Hadir' : 'Ragu') : 'Belum RSVP',
        activity: eventLabels[ev.event_type] || ev.event_type,
        detail: ev.metadata ? JSON.stringify(ev.metadata) : '-',
        device: 'Smartphone',
        location: '-',
        createdAt: ev.created_at
      };
    });

    const allActivities = [...viewItems, ...eventItems].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return jsonResponse({
      items: allActivities,
      total: allActivities.length
    });
  } catch (error: any) {
    console.error('Export API error:', error);
    return jsonResponse({ error: error?.message || 'Failed to export activities' }, 500);
  }
};
