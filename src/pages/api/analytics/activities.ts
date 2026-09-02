import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { jsonResponse, parseBoundedInt } from '../../../utils/http';
import { decodeHtmlEntities } from '../../../utils/template-helpers';

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

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const session = locals.session;
    if (session?.role !== 'admin') {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const slug = url.searchParams.get('slug');
    const weddingIdParam = url.searchParams.get('weddingId');
    const offset = parseBoundedInt(url.searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);
    const limit = parseBoundedInt(url.searchParams.get('limit'), 50, 1, 100);

    let weddingId = weddingIdParam;
    if (!weddingId && slug) {
      const { data: w } = await supabase.from('weddings').select('id').eq('slug', slug).single();
      if (w) weddingId = w.id;
    }

    if (!weddingId) {
      return jsonResponse({ error: 'weddingId or slug is required' }, 400);
    }

    const adminSupabase = await getSupabaseAdmin();

    // Fetch batch of views and events around the offset/limit
    const halfLimit = Math.ceil(limit / 2);
    const halfOffset = Math.floor(offset / 2);

    const [viewsRes, eventsRes] = await Promise.all([
      adminSupabase
        .from('invitation_views')
        .select('id, guest_name, device_type, os, browser, city, country, referrer, created_at')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false })
        .range(halfOffset, halfOffset + halfLimit - 1),
      adminSupabase
        .from('invitation_events')
        .select('id, event_type, guest_name, metadata, created_at')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false })
        .range(halfOffset, halfOffset + halfLimit - 1)
    ]);

    const viewItems = (viewsRes.data || []).map((v) => {
      const conf = eventConfig['page_view'];
      const dt = v.device_type || 'mobile';
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
        guestName: v.guest_name ? decodeHtmlEntities(v.guest_name) : null,
        metadata: { referrer: v.referrer },
        deviceType: dt,
        deviceModel: dt === 'desktop' ? 'Komputer Desktop' : dt === 'tablet' ? 'Tablet' : 'Smartphone',
        browser: v.browser || 'Unknown',
        os: v.os || 'Unknown',
        source: v.referrer ? (v.referrer.includes('whatsapp') ? 'WhatsApp' : 'Tautan Langsung') : 'Tautan Langsung / WhatsApp',
        city: v.city || null,
        country: v.country || null,
        createdAt: v.created_at
      };
    });

    const eventItems = (eventsRes.data || []).map((ev) => {
      const conf = eventConfig[ev.event_type] || eventConfig['page_view'];
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
        guestName: ev.guest_name ? decodeHtmlEntities(ev.guest_name) : null,
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

    const merged = [...viewItems, ...eventItems].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return jsonResponse({
      items: merged,
      offset,
      limit,
      hasMore: (viewsRes.data?.length || 0) >= halfLimit || (eventsRes.data?.length || 0) >= halfLimit
    });
  } catch (error: any) {
    return jsonResponse({ error: error?.message || 'Failed to fetch activities' }, 500);
  }
};
