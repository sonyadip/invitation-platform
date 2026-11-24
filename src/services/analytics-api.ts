import type { AstroCookies } from 'astro';
import { getSupabaseAdmin } from '../lib/supabase-admin';
import { jsonResponse } from '../utils/http';
import { getSessionFromCookies, type SessionPayload } from '../utils/session';

export interface AnalyticsEventMeta {
  label: string;
  exportLabel?: string;
  desc: string;
  icon: string;
  category: string;
  categoryLabel: string;
  badgeClass: string;
  iconBg: string;
  iconColor: string;
}

export const ANALYTICS_EVENT_CONFIG: Record<string, AnalyticsEventMeta> = {
  open_cover: { label: 'Buka Undangan', desc: 'Membuka cover / amplop undangan digital', icon: 'drafts', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--primary', iconBg: '#f3f4f6', iconColor: '#111827' },
  click_maps: { label: 'Petunjuk Maps', desc: 'Membuka tautan rute peta lokasi / Google Maps', icon: 'location_on', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--info', iconBg: '#eff6ff', iconColor: '#2563eb' },
  click_calendar: { label: 'Simpan Kalender', desc: 'Menyimpan jadwal resepsi ke Google Calendar', icon: 'calendar_month', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--purple', iconBg: '#faf5ff', iconColor: '#9333ea' },
  copy_gift: { label: 'Salin Rekening', desc: 'Menyalin nomor rekening / informasi hadiah digital', icon: 'content_copy', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--warning', iconBg: '#fffbeb', iconColor: '#d97706' },
  play_music: { label: 'Putar Musik', desc: 'Memutar musik latar belakang undangan', icon: 'music_note', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--teal', iconBg: '#f0fdfa', iconColor: '#0d9488' },
  pause_music: { label: 'Jeda Musik', desc: 'Mematikan / menjeda musik latar belakang', icon: 'music_off', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--neutral', iconBg: '#f8fafc', iconColor: '#64748b' },
  play_video: { label: 'Putar Video Momen', exportLabel: 'Putar Video', desc: 'Memutar video momen pernikahan di layout video', icon: 'smart_display', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--purple', iconBg: '#f5f3ff', iconColor: '#7c3aed' },
  view_gallery: { label: 'Lihat Galeri Foto', exportLabel: 'Lihat Galeri', desc: 'Membuka atau melihat preview galeri foto mempelai', icon: 'photo_library', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--indigo', iconBg: '#eef2ff', iconColor: '#4f46e5' },
  click_rsvp: { label: 'Klik Form RSVP', exportLabel: 'Klik RSVP', desc: 'Menavigasi atau membuka form konfirmasi kehadiran', icon: 'how_to_reg', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--emerald', iconBg: '#ecfdf5', iconColor: '#059669' },
  click_wishes: { label: 'Buka Form Ucapan', exportLabel: 'Buka Doa / Ucapan', desc: 'Membuka form doa & ucapan selamat untuk mempelai', icon: 'forum', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--amber', iconBg: '#fffbeb', iconColor: '#b45309' },
  click_participant: { label: 'Detail Peserta', desc: 'Membuka popup profil detail peserta upacara', icon: 'person', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--purple', iconBg: '#faf5ff', iconColor: '#9333ea' },
  click_couple_instagram: { label: 'Instagram Pengantin', desc: 'Membuka tautan profil Instagram mempelai', icon: 'photo_camera', category: 'interaksi', categoryLabel: 'Interaksi', badgeClass: 'act-badge--pink', iconBg: '#fdf2f8', iconColor: '#db2777' },
  click_vendor_whatsapp: { label: 'Vendor WhatsApp', exportLabel: 'WhatsApp Senadda', desc: 'Menghubungi vendor undangan (Senadda) via WhatsApp', icon: 'chat', category: 'vendor', categoryLabel: 'Vendor', badgeClass: 'act-badge--success', iconBg: '#f0fdf4', iconColor: '#16a34a' },
  click_vendor_instagram: { label: 'Vendor Instagram', exportLabel: 'Instagram Senadda', desc: 'Membuka profil Instagram vendor (Senadda)', icon: 'camera_alt', category: 'vendor', categoryLabel: 'Vendor', badgeClass: 'act-badge--pink', iconBg: '#fdf2f8', iconColor: '#e1306c' },
  click_vendor_site: { label: 'Website Senadda', desc: 'Mengunjungi website utama platform Senadda.id', icon: 'language', category: 'vendor', categoryLabel: 'Vendor', badgeClass: 'act-badge--info', iconBg: '#eff6ff', iconColor: '#0284c7' },
  page_view: { label: 'Kunjungan Halaman', desc: 'Membuka dan memuat halaman undangan digital', icon: 'visibility', category: 'kunjungan', categoryLabel: 'Kunjungan', badgeClass: 'act-badge--neutral', iconBg: '#f8fafc', iconColor: '#64748b' }
};

export interface AnalyticsAuthContext {
  adminSupabase: Awaited<ReturnType<typeof getSupabaseAdmin>>;
  weddingId: string;
  weddingSlug: string | null;
}

/**
 * Resolves weddingId/slug from analytics query parameters and enforces admin or owner session authorization.
 */
export async function resolveAnalyticsAuth(
  url: URL,
  locals: App.Locals,
  cookies: AstroCookies
): Promise<AnalyticsAuthContext | Response> {
  const session: SessionPayload | null = locals.session || await getSessionFromCookies(cookies);
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

  return { adminSupabase, weddingId, weddingSlug };
}

export function isWithinAnalyticsTimeRange(createdAtStr: string, timeRange: string, nowMs: number): boolean {
  if (timeRange === 'all' || !createdAtStr) return true;
  const itemTime = new Date(createdAtStr).getTime();
  if (timeRange === '24h') return nowMs - itemTime <= 24 * 3600 * 1000;
  if (timeRange === '7d') return nowMs - itemTime <= 7 * 24 * 3600 * 1000;
  if (timeRange === '30d') return nowMs - itemTime <= 30 * 24 * 3600 * 1000;
  if (timeRange === 'today') {
    const itemWita = new Date(itemTime + 8 * 3600000).toISOString().slice(0, 10);
    const nowWita = new Date(nowMs + 8 * 3600000).toISOString().slice(0, 10);
    return itemWita === nowWita;
  }
  return true;
}
