import type { APIRoute } from 'astro';
import { jsonResponse } from '../../../utils/http';
import { decodeHtmlEntities } from '../../../utils/template-helpers';
import { ANALYTICS_EVENT_CONFIG, resolveAnalyticsAuth } from '../../../services/analytics-api';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals, cookies }) => {
  try {
    const auth = await resolveAnalyticsAuth(url, locals, cookies);
    if (auth instanceof Response) return auth;
    const { adminSupabase, weddingId } = auth;

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
      const eventMeta = ANALYTICS_EVENT_CONFIG[ev.event_type];
      return {
        guestName: gName || 'Anonim',
        isGuest: !!gName,
        rsvpStatus: rsvp ? (rsvp.attendance_status === 'attending' ? `Hadir (${rsvp.guest_count}pax)` : rsvp.attendance_status === 'declined' ? 'Tidak Hadir' : 'Ragu') : 'Belum RSVP',
        activity: eventMeta?.exportLabel || eventMeta?.label || ev.event_type,
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
