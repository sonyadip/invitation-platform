import type { APIRoute } from 'astro';
import { fetchAllRows } from '../../../lib/supabase';
import { jsonResponse, parseBoundedInt } from '../../../utils/http';
import { decodeHtmlEntities } from '../../../utils/template-helpers';
import {
  ANALYTICS_EVENT_CONFIG,
  isWithinAnalyticsTimeRange,
  resolveAnalyticsAuth
} from '../../../services/analytics-api';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals, cookies }) => {
  try {
    const auth = await resolveAnalyticsAuth(url, locals, cookies);
    if (auth instanceof Response) return auth;
    const { adminSupabase, weddingId } = auth;

    const page = parseBoundedInt(url.searchParams.get('page'), 1, 1, 10000);
    const limit = parseBoundedInt(url.searchParams.get('limit'), 25, 1, 100);
    const category = (url.searchParams.get('category') || url.searchParams.get('tag') || 'all').trim();
    const eventType = (url.searchParams.get('eventType') || url.searchParams.get('event') || 'all').trim();
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const timeRange = url.searchParams.get('timeRange') || 'all';

    const [viewsData, eventsData, rsvpsRes] = await Promise.all([
      fetchAllRows<any>((from, to) =>
        adminSupabase
          .from('invitation_views')
          .select('id, guest_name, device_type, os, browser, city, country, referrer, created_at')
          .eq('wedding_id', weddingId)
          .order('created_at', { ascending: false })
          .range(from, to),
        1000,
        5
      ),
      fetchAllRows<any>((from, to) =>
        adminSupabase
          .from('invitation_events')
          .select('id, event_type, guest_name, metadata, created_at')
          .eq('wedding_id', weddingId)
          .order('created_at', { ascending: false })
          .range(from, to),
        1000,
        5
      ),
      adminSupabase
        .from('rsvps')
        .select('guest_name, attendance_status, guest_count')
        .eq('wedding_id', weddingId)
    ]);

    const viewsRes = { data: viewsData };
    const eventsRes = { data: eventsData };

    const rsvpMap = new Map<string, any>();
    for (const r of rsvpsRes.data || []) {
      if (r.guest_name) {
        rsvpMap.set(r.guest_name.trim().toLowerCase(), r);
      }
    }

    const viewItems = (viewsRes.data || []).map((v) => {
      const conf = ANALYTICS_EVENT_CONFIG['page_view'];
      const dt = v.device_type || 'mobile';
      const isGuest = !!v.guest_name;
      const gName = v.guest_name ? decodeHtmlEntities(v.guest_name) : null;
      const rsvp = gName ? rsvpMap.get(gName.trim().toLowerCase()) : null;

      return {
        id: `v-${v.id}`,
        type: 'view',
        eventType: 'page_view',
        category: 'kunjungan',
        categoryLabel: conf.categoryLabel,
        label: conf.label,
        desc: conf.desc,
        icon: conf.icon,
        badgeClass: conf.badgeClass,
        iconBg: conf.iconBg,
        iconColor: conf.iconColor,
        guestName: gName,
        isGuest,
        hasRsvp: !!rsvp,
        rsvpStatus: rsvp?.attendance_status || null,
        rsvpPax: rsvp?.guest_count || null,
        metadata: { referrer: v.referrer },
        deviceType: dt,
        deviceModel: dt === 'desktop' ? 'Komputer Desktop' : dt === 'tablet' ? 'Tablet' : 'Smartphone',
        browser: (v.browser && v.browser !== 'Other' ? v.browser : null) || 'Unknown',
        os: v.os || 'Unknown',
        source: v.referrer ? (v.referrer.includes('whatsapp') ? 'WhatsApp' : v.referrer.includes('instagram') ? 'Instagram' : 'Tautan Langsung') : 'Tautan Langsung / WhatsApp',
        city: v.city || null,
        country: v.country || null,
        createdAt: v.created_at
      };
    });

    const eventItems = (eventsRes.data || []).map((ev) => {
      const conf = ANALYTICS_EVENT_CONFIG[ev.event_type] || ANALYTICS_EVENT_CONFIG['page_view'];
      const isGuest = !!ev.guest_name;
      const gName = ev.guest_name ? decodeHtmlEntities(ev.guest_name) : null;
      const rsvp = gName ? rsvpMap.get(gName.trim().toLowerCase()) : null;

      return {
        id: `ev-${ev.id}`,
        type: 'event',
        eventType: ev.event_type,
        category: conf.category,
        categoryLabel: conf.categoryLabel,
        label: conf.label,
        desc: conf.desc,
        icon: conf.icon,
        badgeClass: conf.badgeClass,
        iconBg: conf.iconBg,
        iconColor: conf.iconColor,
        guestName: gName,
        isGuest,
        hasRsvp: !!rsvp,
        rsvpStatus: rsvp?.attendance_status || null,
        rsvpPax: rsvp?.guest_count || null,
        metadata: ev.metadata || {},
        deviceType: 'mobile',
        deviceModel: 'Smartphone',
        browser: '',
        os: '',
        source: 'Link Undangan',
        city: null,
        country: null,
        createdAt: ev.created_at
      };
    });

    const allActivities = [...viewItems, ...eventItems].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const now = Date.now();
    const timeAndSearchFiltered = allActivities.filter((item) => {
      if (!isWithinAnalyticsTimeRange(item.createdAt, timeRange, now)) return false;
      if (search) {
        const searchBlob = `${item.guestName || ''} ${item.label} ${item.desc} ${item.browser} ${item.deviceModel} ${item.source} ${item.city || ''} ${item.metadata?.target || ''} ${item.metadata?.href || ''}`.toLowerCase();
        if (!searchBlob.includes(search)) return false;
      }
      if (eventType !== 'all' && item.eventType !== eventType) return false;
      return true;
    });

    const tagCounts = {
      all: timeAndSearchFiltered.length,
      identified: timeAndSearchFiltered.filter(i => i.isGuest).length,
      interaksi: timeAndSearchFiltered.filter(i => i.category === 'interaksi').length,
      rsvp: timeAndSearchFiltered.filter(i => i.hasRsvp).length,
      vendor: timeAndSearchFiltered.filter(i => i.category === 'vendor').length,
      kunjungan: timeAndSearchFiltered.filter(i => i.category === 'kunjungan').length
    };

    const finalFiltered = timeAndSearchFiltered.filter((item) => {
      if (category === 'identified' && !item.isGuest) return false;
      if (category === 'interaksi' && item.category !== 'interaksi') return false;
      if (category === 'rsvp' && !item.hasRsvp) return false;
      if (category === 'vendor' && item.category !== 'vendor') return false;
      if (category === 'kunjungan' && item.category !== 'kunjungan') return false;
      return true;
    });

    const totalCount = finalFiltered.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * limit;
    const paginatedItems = finalFiltered.slice(start, start + limit);

    return jsonResponse({
      items: paginatedItems,
      totalCount,
      totalPages,
      currentPage,
      limit,
      tagCounts
    });
  } catch (error: any) {
    console.error('Activities API error:', error);
    return jsonResponse({ error: error?.message || 'Failed to fetch activities' }, 500);
  }
};
