import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { jsonResponse } from '../../../utils/http';
import { getSessionFromCookies } from '../../../utils/session';
import { decodeHtmlEntities } from '../../../utils/template-helpers';

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

    async function fetchAllRows<T>(
      queryFn: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
      pageSize = 1000,
      maxBatches = 5
    ): Promise<T[]> {
      const rows: T[] = [];
      let from = 0;
      let batch = 0;
      while (batch < maxBatches) {
        batch++;
        const to = from + pageSize - 1;
        const { data, error } = await queryFn(from, to);
        if (error) throw error;
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return rows;
    }

    // Fetch lightweight columns across all records for 100% accurate aggregations
    const [
      views,
      events,
      rsvpsRes,
      sentRes
    ] = await Promise.all([
      fetchAllRows<any>((from, to) =>
        adminSupabase
          .from('invitation_views')
          .select('device_type, browser, created_at, guest_name')
          .eq('wedding_id', weddingId)
          .range(from, to)
      ),
      fetchAllRows<any>((from, to) =>
        adminSupabase
          .from('invitation_events')
          .select('event_type, guest_name, created_at')
          .eq('wedding_id', weddingId)
          .range(from, to)
      ),
      adminSupabase
        .from('rsvps')
        .select('attendance_status, guest_count, message')
        .eq('wedding_id', weddingId),
      adminSupabase
        .from('sent_invitations')
        .select('id, opened_at, open_count')
        .eq('wedding_id', weddingId)
    ]);

    const rsvps = rsvpsRes.data || [];
    const sentInvitations = sentRes.data || [];

    const totalViews = views.length;
    const totalEvents = events.length;

    let mobileCount = 0;
    let desktopCount = 0;
    let tabletCount = 0;
    const browserMap = new Map<string, number>();
    const identifiedGuestsSet = new Set<string>();
    const hourlyBuckets = new Array(24).fill(0);

    for (const v of views) {
      if (v.guest_name) {
        identifiedGuestsSet.add(v.guest_name.trim().toLowerCase());
      }

      const dt = (v.device_type || 'mobile').toLowerCase();
      if (dt === 'desktop') desktopCount++;
      else if (dt === 'tablet') tabletCount++;
      else mobileCount++;

      const b = (v.browser && v.browser !== 'Other' ? v.browser : null) || 'Other';
      browserMap.set(b, (browserMap.get(b) || 0) + 1);

      if (v.created_at) {
        const d = new Date(v.created_at);
        const hour = (d.getUTCHours() + 8) % 24; // WITA
        hourlyBuckets[hour]++;
      }
    }

    let openCoverCount = 0;
    let clickMapsCount = 0;
    let clickCalendarCount = 0;
    let copyGiftCount = 0;
    let playMusicCount = 0;
    let pauseMusicCount = 0;
    let playVideoCount = 0;
    let viewGalleryCount = 0;
    let clickRsvpCount = 0;
    let clickWishesCount = 0;
    let clickCoupleInstagramCount = 0;
    let clickVendorWhatsAppCount = 0;
    let clickVendorInstagramCount = 0;
    let clickVendorSiteCount = 0;

    for (const ev of events) {
      if (ev.guest_name) {
        identifiedGuestsSet.add(ev.guest_name.trim().toLowerCase());
      }

      if (ev.created_at) {
        const d = new Date(ev.created_at);
        const hour = (d.getUTCHours() + 8) % 24; // WITA
        hourlyBuckets[hour]++;
      }

      if (ev.event_type === 'open_cover') openCoverCount++;
      else if (ev.event_type === 'click_maps') clickMapsCount++;
      else if (ev.event_type === 'click_calendar') clickCalendarCount++;
      else if (ev.event_type === 'copy_gift') copyGiftCount++;
      else if (ev.event_type === 'play_music') playMusicCount++;
      else if (ev.event_type === 'pause_music') pauseMusicCount++;
      else if (ev.event_type === 'play_video') playVideoCount++;
      else if (ev.event_type === 'view_gallery') viewGalleryCount++;
      else if (ev.event_type === 'click_rsvp') clickRsvpCount++;
      else if (ev.event_type === 'click_wishes') clickWishesCount++;
      else if (ev.event_type === 'click_couple_instagram') clickCoupleInstagramCount++;
      else if (ev.event_type === 'click_vendor_whatsapp') clickVendorWhatsAppCount++;
      else if (ev.event_type === 'click_vendor_instagram') clickVendorInstagramCount++;
      else if (ev.event_type === 'click_vendor_site') clickVendorSiteCount++;
    }

    const deviceStats = {
      mobile: mobileCount,
      desktop: desktopCount,
      tablet: tabletCount,
      mobilePercent: totalViews > 0 ? Math.round((mobileCount / totalViews) * 100) : 0,
      desktopPercent: totalViews > 0 ? Math.round((desktopCount / totalViews) * 100) : 0,
      tabletPercent: totalViews > 0 ? Math.round((tabletCount / totalViews) * 100) : 0
    };

    const browserStats = Array.from(browserMap.entries())
      .map(([browser, count]) => ({
        browser,
        count,
        percent: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0
      }))
      .sort((a, b) => {
        if (a.browser === 'Other' && b.browser !== 'Other') return 1;
        if (b.browser === 'Other' && a.browser !== 'Other') return -1;
        return b.count - a.count;
      });

    const vendorLeadsCount = clickVendorWhatsAppCount + clickVendorInstagramCount + clickVendorSiteCount;
    const rsvpCount = rsvps.length;
    const attendingCount = rsvps.filter(r => r.attendance_status === 'attending').length;
    const declinedCount = rsvps.filter(r => r.attendance_status === 'declined').length;
    const tentativeCount = rsvps.filter(r => r.attendance_status === 'tentative').length;
    const guestPaxCount = rsvps.reduce((acc, r) => acc + Number(r.guest_count || 0), 0);
    const wishesCount = rsvps.filter(r => r.message).length;

    const totalSent = sentInvitations.length;
    const totalOpenedSent = sentInvitations.filter(s => (s.open_count || 0) > 0 || s.opened_at).length;
    const openRate = totalSent > 0 ? Math.round((totalOpenedSent / totalSent) * 100) : null;
    const coverOpenRate = totalViews > 0 ? Math.min(100, Math.round((openCoverCount / totalViews) * 100)) : 0;
    const rsvpRate = totalViews > 0 ? Math.min(100, Math.round((rsvpCount / totalViews) * 100)) : 0;
    const engagementRate = totalViews > 0 ? Math.min(100, Math.round((totalEvents / totalViews) * 100)) : 0;

    const peakHour = hourlyBuckets.indexOf(Math.max(...hourlyBuckets));

    const chartRawData = [
      ...views.map(v => ({
        e: 'page_view',
        c: 'kunjungan',
        g: !!v.guest_name,
        t: v.created_at,
        n: v.guest_name ? decodeHtmlEntities(v.guest_name) : null
      })),
      ...events.map(ev => {
        const isVendor = ev.event_type?.startsWith('click_vendor');
        return {
          e: ev.event_type,
          c: isVendor ? 'vendor' : 'interaksi',
          g: !!ev.guest_name,
          t: ev.created_at,
          n: ev.guest_name ? decodeHtmlEntities(ev.guest_name) : null
        };
      })
    ];

    return jsonResponse({
      totalViews,
      totalEvents,
      totalActivities: totalViews + totalEvents,
      totalIdentifiedGuests: identifiedGuestsSet.size,
      deviceStats,
      browserStats,
      interactionStats: {
        openCover: openCoverCount,
        clickMaps: clickMapsCount,
        clickCalendar: clickCalendarCount,
        copyGift: copyGiftCount,
        playMusic: playMusicCount,
        pauseMusic: pauseMusicCount,
        playVideo: playVideoCount,
        viewGallery: viewGalleryCount,
        clickRsvp: clickRsvpCount,
        clickWishes: clickWishesCount,
        clickCoupleInstagram: clickCoupleInstagramCount,
        clickVendorWhatsApp: clickVendorWhatsAppCount,
        clickVendorInstagram: clickVendorInstagramCount,
        clickVendorSite: clickVendorSiteCount,
        vendorLeads: vendorLeadsCount,
        totalInteractions: totalEvents
      },
      rsvpStats: {
        totalRsvp: rsvpCount,
        attending: attendingCount,
        declined: declinedCount,
        tentative: tentativeCount,
        guestPax: guestPaxCount,
        wishesCount
      },
      funnel: {
        totalSent,
        totalOpenedSent,
        openRate,
        coverOpenRate,
        rsvpRate,
        engagementRate
      },
      hourlyBuckets,
      peakHour,
      chartRawData
    });
  } catch (error: any) {
    console.error('Analytics summary error:', error);
    return jsonResponse({ error: error?.message || 'Failed to calculate analytics summary' }, 500);
  }
};
