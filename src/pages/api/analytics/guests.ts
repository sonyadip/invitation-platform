import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { jsonResponse, parseBoundedInt } from '../../../utils/http';
import { decodeHtmlEntities } from '../../../utils/template-helpers';
import { getSessionFromCookies } from '../../../utils/session';

export const prerender = false;

const eventConfig: Record<string, { label: string; desc: string; icon: string; badgeClass: string; iconColor: string }> = {
  open_cover: { label: 'Buka Undangan', desc: 'Membuka cover / amplop undangan digital', icon: 'drafts', badgeClass: 'act-badge--primary', iconColor: '#a68966' },
  click_maps: { label: 'Petunjuk Maps', desc: 'Membuka tautan rute peta lokasi / Google Maps', icon: 'location_on', badgeClass: 'act-badge--info', iconColor: '#2563eb' },
  click_calendar: { label: 'Simpan Kalender', desc: 'Menyimpan jadwal resepsi ke Google Calendar', icon: 'calendar_month', badgeClass: 'act-badge--purple', iconColor: '#9333ea' },
  copy_gift: { label: 'Salin Rekening', desc: 'Menyalin nomor rekening / informasi hadiah digital', icon: 'content_copy', badgeClass: 'act-badge--warning', iconColor: '#d97706' },
  play_music: { label: 'Putar Musik', desc: 'Memutar musik latar belakang undangan', icon: 'music_note', badgeClass: 'act-badge--teal', iconColor: '#0d9488' },
  pause_music: { label: 'Jeda Musik', desc: 'Mematikan / menjeda musik latar belakang', icon: 'music_off', badgeClass: 'act-badge--neutral', iconColor: '#64748b' },
  play_video: { label: 'Putar Video Momen', desc: 'Memutar video momen pernikahan di layout video', icon: 'smart_display', badgeClass: 'act-badge--purple', iconColor: '#7c3aed' },
  view_gallery: { label: 'Lihat Galeri Foto', desc: 'Membuka atau melihat preview galeri foto mempelai', icon: 'photo_library', badgeClass: 'act-badge--indigo', iconColor: '#4f46e5' },
  click_rsvp: { label: 'Klik Form RSVP', desc: 'Menavigasi atau membuka form konfirmasi kehadiran', icon: 'how_to_reg', badgeClass: 'act-badge--emerald', iconColor: '#059669' },
  click_wishes: { label: 'Buka Form Ucapan', desc: 'Membuka form doa & ucapan selamat untuk mempelai', icon: 'forum', badgeClass: 'act-badge--amber', iconColor: '#b45309' },
  click_couple_instagram: { label: 'Instagram Pengantin', desc: 'Membuka tautan profil Instagram mempelai', icon: 'photo_camera', badgeClass: 'act-badge--pink', iconColor: '#db2777' },
  click_vendor_whatsapp: { label: 'Vendor WhatsApp', desc: 'Menghubungi vendor undangan (Senadda) via WhatsApp', icon: 'chat', badgeClass: 'act-badge--success', iconColor: '#16a34a' },
  click_vendor_instagram: { label: 'Vendor Instagram', desc: 'Membuka profil Instagram vendor (Senadda)', icon: 'camera_alt', badgeClass: 'act-badge--pink', iconColor: '#e1306c' },
  click_vendor_site: { label: 'Website Senadda', desc: 'Mengunjungi website utama platform Senadda.id', icon: 'language', badgeClass: 'act-badge--info', iconColor: '#0284c7' },
  page_view: { label: 'Kunjungan Halaman', desc: 'Membuka dan memuat halaman undangan digital', icon: 'visibility', badgeClass: 'act-badge--neutral', iconColor: '#64748b' }
};

export const GET: APIRoute = async ({ url, locals, cookies }) => {
  try {
    const session = locals.session || await getSessionFromCookies(cookies);
    const slug = url.searchParams.get('slug');
    const weddingIdParam = url.searchParams.get('weddingId');
    const page = parseBoundedInt(url.searchParams.get('page'), 1, 1, 10000);
    const limit = parseBoundedInt(url.searchParams.get('limit'), 15, 1, 50);
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const timeRange = url.searchParams.get('timeRange') || 'all';

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

    const [viewsData, eventsData, rsvpsRes, sentRes] = await Promise.all([
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
      if (!isWithinTime(item.created_at)) continue;

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
        const conf = eventConfig[item.event_type] || {
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
