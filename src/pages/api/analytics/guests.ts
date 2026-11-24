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
    const limit = parseBoundedInt(url.searchParams.get('limit'), 15, 1, 50);
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const timeRange = url.searchParams.get('timeRange') || 'all';

    const [viewsData, eventsData, rsvpsRes, sentRes] = await Promise.all([
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
        .select('guest_name, attendance_status, guest_count, message')
        .eq('wedding_id', weddingId),
      adminSupabase
        .from('sent_invitations')
        .select('guest_name, phone, opened_at, last_opened_at, open_count')
        .eq('wedding_id', weddingId)
    ]);

    const viewsRes = { data: viewsData };
    const eventsRes = { data: eventsData };

    const rsvpMap = new Map<string, any>();
    for (const r of rsvpsRes.data || []) {
      if (r.guest_name) {
        rsvpMap.set(r.guest_name.trim().toLowerCase(), {
          status: r.attendance_status,
          guestCount: r.guest_count,
          message: r.message
        });
      }
    }

    const sentMap = new Map<string, any>();
    for (const s of sentRes.data || []) {
      if (s.guest_name) {
        sentMap.set(s.guest_name.trim().toLowerCase(), {
          phone: s.phone,
          openCount: s.open_count,
          lastOpenedAt: s.last_opened_at || s.opened_at
        });
      }
    }

    const now = Date.now();

    interface GuestCard {
      key: string;
      guestName: string;
      isGuest: boolean;
      totalActivities: number;
      lastActive: string;
      devices: string[];
      browsers: string[];
      sources: string[];
      cities: string[];
      rsvp: any;
      sentInfo: any;
      counts: {
        cover: number;
        maps: number;
        calendar: number;
        gift: number;
        participant: number;
        coupleIg: number;
        vendorWa: number;
        vendorIg: number;
        vendorSite: number;
        music: number;
        gallery: number;
        rsvpClick: number;
        wishes: number;
        views: number;
      };
      items: any[];
    }

    const guestMap = new Map<string, GuestCard>();

    const allRawItems: any[] = [
      ...(viewsRes.data || []).map(v => ({ ...v, itemType: 'view', event_type: 'page_view' })),
      ...(eventsRes.data || []).map(ev => ({ ...ev, itemType: 'event' }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    for (const item of allRawItems) {
      if (!isWithinAnalyticsTimeRange(item.created_at, timeRange, now)) continue;

      const isGuest = !!item.guest_name;
      const key = isGuest ? item.guest_name.trim().toLowerCase() : '__anon__';
      const displayName = isGuest ? decodeHtmlEntities(item.guest_name.trim()) : 'Pengunjung Umum (Anonim)';

      if (!guestMap.has(key)) {
        guestMap.set(key, {
          key,
          guestName: displayName,
          isGuest,
          totalActivities: 0,
          lastActive: item.created_at,
          devices: [],
          browsers: [],
          sources: [],
          cities: [],
          rsvp: isGuest && rsvpMap.has(key) ? rsvpMap.get(key) : null,
          sentInfo: isGuest && sentMap.has(key) ? sentMap.get(key) : null,
          counts: {
            cover: 0,
            maps: 0,
            calendar: 0,
            gift: 0,
            participant: 0,
            coupleIg: 0,
            vendorWa: 0,
            vendorIg: 0,
            vendorSite: 0,
            music: 0,
            gallery: 0,
            rsvpClick: 0,
            wishes: 0,
            views: 0
          },
          items: []
        });
      }

      const g = guestMap.get(key)!;
      g.totalActivities++;

      if (item.device_type) {
        const devLabel = item.device_type === 'desktop' ? 'Komputer Desktop' : item.device_type === 'tablet' ? 'Tablet' : 'Smartphone';
        if (!g.devices.includes(devLabel)) g.devices.push(devLabel);
      }
      if (item.browser && item.browser !== 'Other' && !g.browsers.includes(item.browser)) {
        g.browsers.push(item.browser);
      }
      if (item.referrer) {
        const src = item.referrer.includes('whatsapp') ? 'WhatsApp' : item.referrer.includes('instagram') ? 'Instagram' : 'Tautan Langsung';
        if (!g.sources.includes(src)) g.sources.push(src);
      }
      if (item.city && !g.cities.includes(item.city)) {
        g.cities.push(item.city);
      }

      if (item.event_type === 'open_cover') g.counts.cover++;
      else if (item.event_type === 'click_maps') g.counts.maps++;
      else if (item.event_type === 'click_calendar') g.counts.calendar++;
      else if (item.event_type === 'copy_gift') g.counts.gift++;
      else if (item.event_type === 'click_participant') g.counts.participant++;
      else if (item.event_type === 'click_couple_instagram') g.counts.coupleIg++;
      else if (item.event_type === 'click_vendor_whatsapp') g.counts.vendorWa++;
      else if (item.event_type === 'click_vendor_instagram') g.counts.vendorIg++;
      else if (item.event_type === 'click_vendor_site') g.counts.vendorSite++;
      else if (item.event_type === 'play_music' || item.event_type === 'pause_music') g.counts.music++;
      else if (item.event_type === 'view_gallery') g.counts.gallery++;
      else if (item.event_type === 'click_rsvp') g.counts.rsvpClick++;
      else if (item.event_type === 'click_wishes') g.counts.wishes++;
      else if (item.event_type === 'page_view') g.counts.views++;

      if (new Date(item.created_at).getTime() > new Date(g.lastActive).getTime()) {
        g.lastActive = item.created_at;
      }

      if (g.items.length < 20) {
        const conf = ANALYTICS_EVENT_CONFIG[item.event_type] || {
          label: item.event_type,
          desc: 'Aktivitas pada undangan',
          icon: 'touch_app',
          badgeClass: 'act-badge--neutral',
          iconColor: '#64748b'
        };
        g.items.push({
          id: item.id,
          eventType: item.event_type,
          label: conf.label,
          desc: conf.desc,
          icon: conf.icon,
          badgeClass: conf.badgeClass,
          iconColor: conf.iconColor,
          createdAt: item.created_at,
          metadata: item.metadata || {}
        });
      }
    }

    let guestsList = Array.from(guestMap.values()).sort((a, b) => {
      if (a.isGuest && !b.isGuest) return -1;
      if (!a.isGuest && b.isGuest) return 1;
      return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
    });

    if (search) {
      guestsList = guestsList.filter(g => {
        const searchBlob = `${g.guestName} ${g.rsvp?.message || ''} ${g.sentInfo?.phone || ''} ${g.devices.join(' ')} ${g.browsers.join(' ')} ${g.sources.join(' ')} ${g.cities.join(' ')}`.toLowerCase();
        return searchBlob.includes(search);
      });
    }

    const totalCount = guestsList.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * limit;
    const paginatedItems = guestsList.slice(start, start + limit);

    return jsonResponse({
      items: paginatedItems,
      totalCount,
      totalPages,
      currentPage,
      limit
    });
  } catch (error: any) {
    console.error('Guests API error:', error);
    return jsonResponse({ error: error?.message || 'Failed to fetch guest journeys' }, 500);
  }
};
