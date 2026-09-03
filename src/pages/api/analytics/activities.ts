import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { jsonResponse, parseBoundedInt } from '../../../utils/http';
import { decodeHtmlEntities } from '../../../utils/template-helpers';
import { getSessionFromCookies } from '../../../utils/session';

export const prerender = false;

const eventConfig: Record<string, { label: string; desc: string; icon: string; category: string; categoryLabel: string; badgeClass: string; iconBg: string; iconColor: string }> = {
  open_cover: { label: 'Buka Undangan', desc: 'Membuka cover / amplop undangan digital', icon: 'drafts', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--primary', iconBg: '#fbf4eb', iconColor: '#a68966' },
  click_maps: { label: 'Petunjuk Maps', desc: 'Membuka tautan rute peta lokasi / Google Maps', icon: 'location_on', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--info', iconBg: '#eff6ff', iconColor: '#2563eb' },
  click_calendar: { label: 'Simpan Kalender', desc: 'Menyimpan jadwal resepsi ke Google Calendar', icon: 'calendar_month', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--purple', iconBg: '#faf5ff', iconColor: '#9333ea' },
  copy_gift: { label: 'Salin Rekening', desc: 'Menyalin nomor rekening / informasi hadiah digital', icon: 'content_copy', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--warning', iconBg: '#fffbeb', iconColor: '#d97706' },
  play_music: { label: 'Putar Musik', desc: 'Memutar musik latar belakang undangan', icon: 'music_note', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--teal', iconBg: '#f0fdfa', iconColor: '#0d9488' },
  pause_music: { label: 'Jeda Musik', desc: 'Mematikan / menjeda musik latar belakang', icon: 'music_off', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--neutral', iconBg: '#f8fafc', iconColor: '#64748b' },
  play_video: { label: 'Putar Video Momen', desc: 'Memutar video momen pernikahan di layout video', icon: 'smart_display', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--purple', iconBg: '#f5f3ff', iconColor: '#7c3aed' },
  view_gallery: { label: 'Lihat Galeri Foto', desc: 'Membuka atau melihat preview galeri foto mempelai', icon: 'photo_library', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--indigo', iconBg: '#eef2ff', iconColor: '#4f46e5' },
  click_rsvp: { label: 'Klik Form RSVP', desc: 'Menavigasi atau membuka form konfirmasi kehadiran', icon: 'how_to_reg', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--emerald', iconBg: '#ecfdf5', iconColor: '#059669' },
  click_wishes: { label: 'Buka Form Ucapan', desc: 'Membuka form doa & ucapan selamat untuk mempelai', icon: 'forum', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--amber', iconBg: '#fffbeb', iconColor: '#b45309' },
  click_couple_instagram: { label: 'Instagram Pengantin', desc: 'Membuka tautan profil Instagram mempelai', icon: 'photo_camera', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--pink', iconBg: '#fdf2f8', iconColor: '#db2777' },
  click_vendor_whatsapp: { label: 'Vendor WhatsApp', desc: 'Menghubungi vendor undangan (Senadda) via WhatsApp', icon: 'chat', category: 'vendor', categoryLabel: 'Vendor', badgeClass: 'act-badge--success', iconBg: '#f0fdf4', iconColor: '#16a34a' },
  click_vendor_instagram: { label: 'Vendor Instagram', desc: 'Membuka profil Instagram vendor (Senadda)', icon: 'camera_alt', category: 'vendor', categoryLabel: 'Vendor', badgeClass: 'act-badge--pink', iconBg: '#fdf2f8', iconColor: '#e1306c' },
  click_vendor_site: { label: 'Website Senadda', desc: 'Mengunjungi website utama platform Senadda.id', icon: 'language', category: 'vendor', categoryLabel: 'Vendor', badgeClass: 'act-badge--info', iconBg: '#eff6ff', iconColor: '#0284c7' },
  page_view: { label: 'Kunjungan Halaman', desc: 'Membuka dan memuat halaman undangan digital', icon: 'visibility', category: 'kunjungan', categoryLabel: 'Kunjungan', badgeClass: 'act-badge--neutral', iconBg: '#f8fafc', iconColor: '#64748b' }
};

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

    const page = parseBoundedInt(url.searchParams.get('page'), 1, 1, 10000);
    const limit = parseBoundedInt(url.searchParams.get('limit'), 25, 1, 100);
    const category = (url.searchParams.get('category') || url.searchParams.get('tag') || 'all').trim();
    const eventType = (url.searchParams.get('eventType') || url.searchParams.get('event') || 'all').trim();
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const timeRange = url.searchParams.get('timeRange') || 'all';

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

    // Fetch lightweight columns from views and events
    const [viewsData, eventsData, rsvpsRes] = await Promise.all([
      fetchAllRows<any>((from, to) =>
        adminSupabase
          .from('invitation_views')
          .select('id, guest_name, device_type, os, browser, city, country, referrer, created_at')
          .eq('wedding_id', weddingId)
          .order('created_at', { ascending: false })
          .range(from, to)
      ),
      fetchAllRows<any>((from, to) =>
        adminSupabase
          .from('invitation_events')
          .select('id, event_type, guest_name, metadata, created_at')
          .eq('wedding_id', weddingId)
          .order('created_at', { ascending: false })
          .range(from, to)
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
      const conf = eventConfig['page_view'];
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
      const conf = eventConfig[ev.event_type] || eventConfig['page_view'];
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

    // Merge and sort
    const allActivities = [...viewItems, ...eventItems].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Helper: isWithinTimeRange
    const now = Date.now();
    function isWithinTime(createdAtStr: string): boolean {
      if (timeRange === 'all' || !createdAtStr) return true;
      const itemTime = new Date(createdAtStr).getTime();
      if (timeRange === '24h') return now - itemTime <= 24 * 3600 * 1000;
      if (timeRange === '7d') return now - itemTime <= 7 * 24 * 3600 * 1000;
      if (timeRange === '30d') return now - itemTime <= 30 * 24 * 3600 * 1000;
      if (timeRange === 'today') {
        const itemWita = new Date(itemTime + 8 * 3600000).toISOString().slice(0, 10);
        const nowWita = new Date(now + 8 * 3600000).toISOString().slice(0, 10);
        return itemWita === nowWita;
      }
      return true;
    }

    // Filter by time & search first for base counts
    const timeAndSearchFiltered = allActivities.filter((item) => {
      if (!isWithinTime(item.createdAt)) return false;
      if (search) {
        const searchBlob = `${item.guestName || ''} ${item.label} ${item.desc} ${item.browser} ${item.deviceModel} ${item.source} ${item.city || ''} ${item.metadata?.target || ''} ${item.metadata?.href || ''}`.toLowerCase();
        if (!searchBlob.includes(search)) return false;
      }
      if (eventType !== 'all' && item.eventType !== eventType) return false;
      return true;
    });

    // Compute dynamic tag counts
    const tagCounts = {
      all: timeAndSearchFiltered.length,
      identified: timeAndSearchFiltered.filter(i => i.isGuest).length,
      interaksi: timeAndSearchFiltered.filter(i => i.category === 'interaksi').length,
      rsvp: timeAndSearchFiltered.filter(i => i.hasRsvp).length,
      vendor: timeAndSearchFiltered.filter(i => i.category === 'vendor').length,
      kunjungan: timeAndSearchFiltered.filter(i => i.category === 'kunjungan').length
    };

    // Apply active category filter
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
