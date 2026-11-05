/**
 * Utilities to transform Supabase storage URLs into Cloudflare CDN edge-cached URLs.
 * Ensures zero mutation of underlying database records while streaming assets
 * through Cloudflare's unlimited, free edge CDN network.
 */

function getSupabaseHost(): string {
  const supabaseUrl =
    (typeof process !== 'undefined' ? process.env.SUPABASE_URL : '') ||
    (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.SUPABASE_URL : '') ||
    '';

  if (!supabaseUrl) return '';

  try {
    return new URL(supabaseUrl).host;
  } catch {
    return '';
  }
}

const R2_PUBLIC_URL = (
  (typeof process !== 'undefined' ? process.env.R2_PUBLIC_URL : '') ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.R2_PUBLIC_URL ? (import.meta as any).env.R2_PUBLIC_URL : '') ||
  'https://media.senadda.id'
).replace(/\/$/, '');

const USE_R2 =
  (typeof process !== 'undefined' ? process.env.USE_R2_STORAGE : '') ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.USE_R2_STORAGE ? (import.meta as any).env.USE_R2_STORAGE : '') ||
  'true';

export const COMMON_ASSETS = {
  PREVIEW_VIDEO: USE_R2 === 'true' ? `${R2_PUBLIC_URL}/common/preview-video.mp4` : '/images/preview-video.mp4',
  METATAH_MUSIC: USE_R2 === 'true' ? `${R2_PUBLIC_URL}/common/metatah-music.mp3` : '/audio/metatah-music.mp3'
};

/**
 * Converts a Supabase Storage public URL to a relative Cloudflare-cached route,
 * and seamlessly routes known heavy media assets to high-speed R2 CDN edge.
 */
export function toCdnUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();
  if (!trimmed) return '';

  if (USE_R2 === 'true') {
    if (trimmed === '/images/preview-video.mp4') {
      return COMMON_ASSETS.PREVIEW_VIDEO;
    }
    if (trimmed === '/audio/metatah-music.mp3') {
      return COMMON_ASSETS.METATAH_MUSIC;
    }
  }

  const supabasePattern = /^https?:\/\/[^\/]+\.supabase\.co\/storage\/v1\/object\/public\/(.+)$/i;
  const match = trimmed.match(supabasePattern);

  if (match && match[1]) {
    return `/storage/v1/object/public/${match[1]}`;
  }

  const host = getSupabaseHost();
  if (host && trimmed.includes(host) && trimmed.includes('/storage/v1/object/public/')) {
    const idx = trimmed.indexOf('/storage/v1/object/public/');
    return trimmed.substring(idx);
  }

  return trimmed;
}

/**
 * Recursively scans and transforms Supabase storage URLs within nested invitation objects.
 */
export function transformMediaUrls<T>(value: T): T {
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string') {
      return toCdnUrl(value) as unknown as T;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => transformMediaUrls(item)) as unknown as T;
  }

  const result: any = { ...value };
  for (const [k, v] of Object.entries(result)) {
    if (typeof v === 'string') {
      if (
        k.endsWith('url') ||
        k.endsWith('Url') ||
        k.endsWith('image') ||
        k.endsWith('Image') ||
        k.endsWith('music') ||
        k.endsWith('Music') ||
        k.endsWith('photo') ||
        k.endsWith('Photo') ||
        k.endsWith('poster') ||
        k.endsWith('Poster') ||
        v.includes('/storage/v1/object/public/')
      ) {
        result[k] = toCdnUrl(v);
      }
    } else if (typeof v === 'object' && v !== null) {
      result[k] = transformMediaUrls(v);
    }
  }

  return result;
}
