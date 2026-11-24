import type { AstroCookies } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../lib/supabase-admin';
import type { LoveStoryItem, SectionToggles, ThemeConfig, WeddingStatus } from '../types';
import { jsonResponse } from '../utils/http';
import { getSessionFromCookies } from '../utils/session';
import { constantTimeEqual } from '../utils/token';
import { hashPasswordSHA256 } from '../utils/security';
import { buildTemplateHalfPriceMap, getPlatformSettings } from './platform-settings';
import { logActivity } from './activity-log';
import { captureRevisionSnapshot } from './revision';
import { isR2StorageConfigured, uploadToR2 } from './r2-storage';
import {
  defaultThemeConfig,
  ensureStorageBucket,
  formatInstagramUrl,
  replaceGalleryImages,
  replaceGiftAccounts,
  replaceWeddingEvents,
  sanitizeCustomCss,
  sanitizeFileName,
  storageBucket,
  toDashboardError,
  type InvitationEventInput,
  type InvitationGiftInput
} from './dashboard-crud';

export type RuntimeEnv = Record<string, string | undefined>;

export class AdminApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export interface AdminApiAuthContext {
  actorName: string;
  adminSupabase: SupabaseClient<any>;
  runtimeEnv?: RuntimeEnv;
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_STATUSES: WeddingStatus[] = ['draft', 'published', 'archived'];

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  aac: 'audio/aac',
  m4a: 'audio/mp4',
  webm: 'audio/webm'
};

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mp4': 'm4a',
  'audio/webm': 'webm'
};

const DEFAULT_SECTIONS: SectionToggles = {
  hero: true,
  countdown: true,
  coupleInfo: true,
  eventDetails: true,
  story: true,
  gallery: true,
  rsvp: true,
  wishes: true,
  gift: true,
  music: true,
  share: true,
  video: true,
  livestream: true,
  introAnimation: true
};

const SETTINGS_FLAG_FIELDS: Array<{ column: string; keys: string[]; defaultValue: boolean }> = [
  { column: 'rsvp_enabled', keys: ['rsvpEnabled', 'rsvp_enabled'], defaultValue: true },
  { column: 'music_enabled', keys: ['musicEnabled', 'music_enabled'], defaultValue: true },
  { column: 'music_autoplay', keys: ['musicAutoplay', 'music_autoplay'], defaultValue: false },
  { column: 'countdown_enabled', keys: ['countdownEnabled', 'countdown_enabled'], defaultValue: true },
  { column: 'gallery_enabled', keys: ['galleryEnabled', 'gallery_enabled'], defaultValue: true },
  { column: 'wishes_enabled', keys: ['wishesEnabled', 'wishes_enabled'], defaultValue: true },
  { column: 'gift_enabled', keys: ['giftEnabled', 'gift_enabled'], defaultValue: true },
  { column: 'share_enabled', keys: ['shareEnabled', 'share_enabled'], defaultValue: true },
  { column: 'view_counter_enabled', keys: ['viewCounterEnabled', 'view_counter_enabled'], defaultValue: true },
  { column: 'maintenance_mode', keys: ['maintenanceMode', 'maintenance_mode'], defaultValue: false },
  { column: 'password_protection_enabled', keys: ['passwordProtectionEnabled', 'password_protection_enabled'], defaultValue: false }
];

const INSTAGRAM_CONTENT_KEYS = ['instagramUrl', 'groomInstagramUrl', 'brideInstagramUrl'];

export function getEnvSetting(name: string, runtimeEnv?: RuntimeEnv): string {
  return (
    runtimeEnv?.[name] ||
    (typeof process !== 'undefined' ? process.env[name] : '') ||
    (import.meta as any).env?.[name] ||
    ''
  );
}

function pick<T = any>(source: Record<string, any> | null | undefined, ...keys: string[]): T | undefined {
  if (!source || typeof source !== 'object') return undefined;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      return source[key] as T;
    }
  }
  return undefined;
}

function pickFrom(sources: Array<Record<string, any> | null | undefined>, ...keys: string[]): any {
  for (const src of sources) {
    const val = pick(src, ...keys);
    if (val !== undefined) return val;
  }
  return undefined;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function toIsoDate(value: unknown, fieldName: string): string {
  const raw = String(value || '').trim();
  if (!raw) throw new AdminApiError(400, `${fieldName} is required.`);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new AdminApiError(400, `${fieldName} must be a valid ISO/date string.`);
  }
  return parsed.toISOString();
}

export function validateAdminSlug(rawSlug: unknown): string {
  const slug = String(rawSlug || '').trim().toLowerCase();
  if (!slug || slug.length > 120 || !SLUG_REGEX.test(slug)) {
    throw new AdminApiError(400, 'Slug must use lowercase letters, numbers, and hyphens only.');
  }
  return slug;
}

export function inferMediaContentType(filename: string, rawMimeType?: string): { contentType: string; ext: string } {
  const extFromName = filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
  const normalizedMime = String(rawMimeType || '').split(';')[0].trim().toLowerCase();

  if (normalizedMime && normalizedMime !== 'application/octet-stream') {
    const mimeExt = MIME_TO_EXT[normalizedMime];
    if (!mimeExt) {
      throw new AdminApiError(400, `Unsupported media MIME type "${normalizedMime}" for ${filename}.`);
    }
    return { contentType: normalizedMime, ext: extFromName && EXT_TO_MIME[extFromName] ? extFromName : mimeExt };
  }

  const inferredMime = EXT_TO_MIME[extFromName];
  if (!inferredMime) {
    throw new AdminApiError(
      400,
      `Unsupported file type for "${filename}". Allowed: jpg, png, webp, gif, avif, mp3, wav, ogg, aac, m4a, webm.`
    );
  }
  return { contentType: inferredMime, ext: extFromName };
}

export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match?.[1]) return match[1].trim();
  const alt = request.headers.get('x-admin-token');
  return alt ? alt.trim() : null;
}

/**
 * Authenticates admin API requests via `Authorization: Bearer <ADMIN_API_TOKEN>`
 * (or `x-admin-token`) with fallback to an active admin cookie session.
 */
export async function resolveAdminApiAuth(
  request: Request,
  locals: App.Locals,
  cookies: AstroCookies
): Promise<AdminApiAuthContext | Response> {
  const runtimeEnv = locals.runtime?.env;
  const providedToken = extractBearerToken(request);

  if (providedToken) {
    const expectedToken = getEnvSetting('ADMIN_API_TOKEN', runtimeEnv).trim();
    if (!expectedToken) {
      return jsonResponse({ error: 'Server ADMIN_API_TOKEN is not configured.' }, 503);
    }
    if (!constantTimeEqual(providedToken, expectedToken)) {
      return jsonResponse({ error: 'Unauthorized: Invalid admin API token.' }, 401);
    }
    return {
      actorName: 'Admin API',
      adminSupabase: await getSupabaseAdmin(runtimeEnv),
      runtimeEnv
    };
  }

  const session = locals.session || (await getSessionFromCookies(cookies));
  if (session?.role === 'admin') {
    return {
      actorName: 'Admin Session',
      adminSupabase: await getSupabaseAdmin(runtimeEnv),
      runtimeEnv
    };
  }

  return jsonResponse({ error: 'Unauthorized: Valid admin token or admin session required.' }, 401);
}

export function handleAdminApiError(error: unknown, fallbackMessage: string): Response {
  if (error instanceof AdminApiError) {
    return jsonResponse({ error: error.message }, error.status);
  }
  console.error('[Admin API Error]', error);
  const message = error instanceof Error ? error.message : fallbackMessage;
  return jsonResponse({ error: message || fallbackMessage }, 500);
}

function mergeRecord(base: Record<string, any> | undefined, patch: Record<string, any> | undefined): Record<string, any> | undefined {
  if (!patch || typeof patch !== 'object') return base;
  const next: Record<string, any> = { ...(base || {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === '') {
      delete next[key];
    } else if (value !== undefined) {
      next[key] = value;
    }
  }
  return Object.keys(next).length ? next : undefined;
}

export function mergeThemeConfig(
  baseConfig: any,
  incomingConfig: any,
  overrides: {
    theme?: Record<string, any>;
    layout?: Record<string, any>;
    assets?: Record<string, any>;
    content?: Record<string, any>;
    customCss?: string | null;
  } = {}
): ThemeConfig {
  const next: ThemeConfig = JSON.parse(JSON.stringify(baseConfig || defaultThemeConfig));
  next.theme = mergeRecord(next.theme || defaultThemeConfig.theme, incomingConfig?.theme) as ThemeConfig['theme'];
  next.theme = mergeRecord(next.theme, overrides.theme) as ThemeConfig['theme'];

  next.layout = mergeRecord(next.layout || defaultThemeConfig.layout, incomingConfig?.layout) as ThemeConfig['layout'];
  next.layout = mergeRecord(next.layout, overrides.layout) as ThemeConfig['layout'];

  const mergedAssets = mergeRecord(mergeRecord(next.assets, incomingConfig?.assets), overrides.assets);
  if (mergedAssets) {
    next.assets = mergedAssets;
  } else {
    delete next.assets;
  }

  const mergedContent = mergeRecord(mergeRecord(next.content, incomingConfig?.content), overrides.content);
  if (mergedContent) {
    for (const igKey of INSTAGRAM_CONTENT_KEYS) {
      if (typeof mergedContent[igKey] === 'string') {
        const formatted = formatInstagramUrl(mergedContent[igKey]);
        if (formatted) mergedContent[igKey] = formatted;
        else delete mergedContent[igKey];
      }
    }
    next.content = mergedContent;
  } else {
    delete next.content;
  }

  const rawCss = overrides.customCss !== undefined
    ? overrides.customCss
    : pick(incomingConfig, 'customCss', 'custom_css');

  if (rawCss !== undefined) {
    const cleaned = rawCss === null ? null : sanitizeCustomCss(String(rawCss));
    if (cleaned) {
      next.customCss = cleaned;
    } else {
      delete next.customCss;
    }
  }

  return next;
}

export function normalizeEvents(rawEvents: any[], isPublished: boolean): InvitationEventInput[] {
  return rawEvents.map((ev, index) => {
    const num = index + 1;
    const name = String(pick(ev, 'name', 'event_name', 'eventName') || '').trim();
    const rawDate = pick(ev, 'date', 'event_date', 'eventDate');
    const venueName = String(pick(ev, 'venueName', 'venue_name') || '').trim();
    const venueAddress = String(pick(ev, 'venueAddress', 'venue_address') || '').trim();
    const mapsUrl = String(pick(ev, 'mapsUrl', 'maps_url') || '').trim();
    const startTime = String(pick(ev, 'startTime', 'start_time') || '').trim();
    const endTime = String(pick(ev, 'endTime', 'end_time') || '').trim() || 'Selesai';

    if (!name) throw new AdminApiError(400, `event ${num} name is required.`);
    const date = toIsoDate(rawDate, `event ${num} date`);
    if (!venueAddress) throw new AdminApiError(400, `event ${num} venue address is required.`);
    if (isPublished && !mapsUrl) throw new AdminApiError(400, `event ${num} maps URL is required when published.`);

    return { name, date, startTime, endTime, venueName, venueAddress, mapsUrl };
  });
}

export function normalizeGifts(rawGifts: any[]): InvitationGiftInput[] {
  return rawGifts
    .map((g, index) => {
      const bankName = String(pick(g, 'bankName', 'bank_name') || '').trim();
      const accountNumber = String(pick(g, 'accountNumber', 'account_number') || '').trim();
      const accountName = String(pick(g, 'accountName', 'account_name') || '').trim();
      const qrisUrl = asNonEmptyString(pick(g, 'qrisUrl', 'qris_url'));

      if (!bankName && !accountNumber && !accountName && !qrisUrl) return null;
      if (!bankName) throw new AdminApiError(400, `gift ${index + 1} bankName is required.`);
      if (!accountNumber) throw new AdminApiError(400, `gift ${index + 1} accountNumber is required.`);
      if (!accountName) throw new AdminApiError(400, `gift ${index + 1} accountName is required.`);

      return { bankName, accountNumber, accountName, qrisUrl };
    })
    .filter(Boolean) as InvitationGiftInput[];
}

export function normalizeGalleryUrls(rawGallery: any[]): string[] {
  return rawGallery
    .map((item) => (typeof item === 'string' ? item.trim() : String(pick(item, 'image_url', 'imageUrl', 'url') || '').trim()))
    .filter(Boolean);
}

function selectPrimaryEvent(events: InvitationEventInput[]): InvitationEventInput | undefined {
  const firstDay = events[0]?.date ? events[0].date.slice(0, 10) : '';
  const isMultiDay = events.length > 1 && events.some((e) => e.date.slice(0, 10) !== firstDay);
  if (!isMultiDay) return events[0];
  return events.find((e) => /resepsi|ngunduh/i.test(e.name)) || events[events.length - 1] || events[0];
}

function defaultExpirationIso(anchorDateIso: string | null | undefined): string | null {
  if (!anchorDateIso) return null;
  const d = new Date(anchorDateIso);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

export interface GalleryRowItem {
  id: string;
  image_url: string;
  sort_order: number;
}

function findGalleryIndex(items: GalleryRowItem[], selector: string): number {
  const clean = selector.trim();
  if (!clean) throw new AdminApiError(400, 'Gallery swap selector cannot be empty.');

  const exactIdx = items.findIndex((item) => item.id === clean || item.image_url === clean);
  if (exactIdx !== -1) return exactIdx;

  const byFilename = items
    .map((item, idx) => ({ idx, filename: (item.image_url.split('/').pop() || '').split('?')[0].toLowerCase() }))
    .filter((entry) => entry.filename === clean.toLowerCase());
  if (byFilename.length === 1) return byFilename[0].idx;

  const bySubstring = items
    .map((item, idx) => ({ idx, match: item.image_url.toLowerCase().includes(clean.toLowerCase()) }))
    .filter((entry) => entry.match);

  if (bySubstring.length === 0) {
    throw new AdminApiError(400, `Gallery item matching "${selector}" was not found.`);
  }
  if (bySubstring.length > 1) {
    throw new AdminApiError(400, `Gallery selector "${selector}" matched multiple images; specify the exact filename or URL.`);
  }
  return bySubstring[0].idx;
}

export function resolveGallerySwaps(
  currentGallery: GalleryRowItem[],
  swaps: Array<[string, string]>
): Array<{ id: string; sort_order: number; image_url: string }> {
  const working = currentGallery
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({ ...item }));

  for (const pair of swaps) {
    if (!Array.isArray(pair) || pair.length !== 2) {
      throw new AdminApiError(400, 'Each gallerySwaps entry must be a 2-element array [first, second].');
    }
    const idxA = findGalleryIndex(working, String(pair[0]));
    const idxB = findGalleryIndex(working, String(pair[1]));
    if (idxA === idxB) continue;

    const orderA = working[idxA].sort_order;
    working[idxA].sort_order = working[idxB].sort_order;
    working[idxB].sort_order = orderA;
  }

  const originalOrders = new Map(currentGallery.map((g) => [g.id, g.sort_order]));
  return working.filter((item) => originalOrders.get(item.id) !== item.sort_order);
}

export async function uploadAdminMedia(params: {
  files: File[];
  slug: string;
  scope?: string;
  customFilename?: string;
  adminSupabase: SupabaseClient<any>;
  runtimeEnv?: RuntimeEnv;
}) {
  const slug = validateAdminSlug(params.slug);
  if (!params.files.length) {
    throw new AdminApiError(400, 'At least one file is required.');
  }
  if (params.files.length > 30) {
    throw new AdminApiError(400, 'Maximum 30 files per upload request.');
  }

  const cleanScope = (params.scope || 'media')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '') || 'media';

  const maxMb = Number(getEnvSetting('ADMIN_MAX_MEDIA_MB', params.runtimeEnv)) || 15;
  const maxBytes = maxMb * 1024 * 1024;
  const bucket = getEnvSetting('SUPABASE_STORAGE_BUCKET', params.runtimeEnv) || storageBucket;
  const useR2 = isR2StorageConfigured(params.runtimeEnv);

  if (!useR2) {
    await ensureStorageBucket(params.adminSupabase);
  }

  const uploaded = await Promise.all(
    params.files.map(async (file) => {
      if (!file || typeof file.size !== 'number' || file.size <= 0) {
        throw new AdminApiError(400, 'Uploaded file cannot be empty.');
      }
      if (file.size > maxBytes) {
        throw new AdminApiError(400, `${file.name} exceeds the ${maxMb} MB limit.`);
      }

      const rawName = params.customFilename && params.files.length === 1 ? params.customFilename : file.name;
      const { contentType, ext } = inferMediaContentType(rawName || 'file', file.type);
      const cleanName = sanitizeFileName(rawName || `file.${ext}`, ext);
      const key = `${slug}/${cleanScope}/${cleanName}`;

      if (useR2) {
        const buffer = await file.arrayBuffer();
        const url = await uploadToR2(key, buffer, contentType, params.runtimeEnv);
        return { url, key, filename: cleanName, size: file.size, contentType };
      }

      const { error: uploadError } = await params.adminSupabase.storage.from(bucket).upload(key, file, {
        cacheControl: '31536000, immutable',
        upsert: true,
        contentType
      });
      if (uploadError) throw toDashboardError(uploadError, `Failed to upload ${cleanName}.`);

      const { data } = params.adminSupabase.storage.from(bucket).getPublicUrl(key);
      return { url: data.publicUrl, key, filename: cleanName, size: file.size, contentType };
    })
  );

  return uploaded;
}

export async function listAdminInvitations(
  adminSupabase: SupabaseClient<any>,
  options: { status?: string | null; limit?: number } = {}
) {
  const limit = Math.min(Math.max(options.limit || 50, 1), 200);
  let query = adminSupabase
    .from('weddings')
    .select('id, slug, bride_name, groom_name, template, status, wedding_date, purchase_price, created_at, updated_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options.status && VALID_STATUSES.includes(options.status as WeddingStatus)) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;
  if (error) throw toDashboardError(error, 'Failed to list invitations.');
  return data || [];
}

export async function getAdminInvitationBySlug(adminSupabase: SupabaseClient<any>, rawSlug: string) {
  const slug = validateAdminSlug(rawSlug);

  const { data: wedding, error: weddingError } = await adminSupabase
    .from('weddings')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (weddingError) throw toDashboardError(weddingError, 'Failed to fetch invitation.');
  if (!wedding) throw new AdminApiError(404, `Invitation "${slug}" not found.`);

  const [settingsRes, eventsRes, galleryRes, giftsRes] = await Promise.all([
    adminSupabase.from('invitation_settings').select('*').eq('wedding_id', wedding.id).maybeSingle(),
    adminSupabase.from('wedding_events').select('*').eq('wedding_id', wedding.id).order('sort_order', { ascending: true }),
    adminSupabase.from('gallery_images').select('*').eq('wedding_id', wedding.id).order('sort_order', { ascending: true }),
    adminSupabase.from('gift_accounts').select('*').eq('wedding_id', wedding.id).order('sort_order', { ascending: true })
  ]);

  if (settingsRes.error) throw toDashboardError(settingsRes.error, 'Failed to fetch invitation settings.');
  if (eventsRes.error) throw toDashboardError(eventsRes.error, 'Failed to fetch wedding events.');
  if (galleryRes.error) throw toDashboardError(galleryRes.error, 'Failed to fetch gallery images.');
  if (giftsRes.error) throw toDashboardError(giftsRes.error, 'Failed to fetch gift accounts.');

  const { client_password_hash: _hashOmitted, ...safeWedding } = wedding as Record<string, any>;
  return {
    wedding: safeWedding,
    settings: settingsRes.data || null,
    events: eventsRes.data || [],
    gallery: galleryRes.data || [],
    gifts: giftsRes.data || []
  };
}

export async function createAdminInvitation(
  adminSupabase: SupabaseClient<any>,
  body: Record<string, any>,
  actorName: string
) {
  const weddingSrc = body.wedding && typeof body.wedding === 'object' ? body.wedding : undefined;
  const settingsSrc = body.settings && typeof body.settings === 'object' ? body.settings : undefined;
  const sources = [weddingSrc, body];

  const slug = validateAdminSlug(pickFrom(sources, 'slug'));
  const statusRaw = String(pickFrom(sources, 'status') || 'draft').trim().toLowerCase() as WeddingStatus;
  if (!VALID_STATUSES.includes(statusRaw)) {
    throw new AdminApiError(400, 'status must be one of draft, published, or archived.');
  }
  const isPublished = statusRaw === 'published';

  const brideName = String(pickFrom(sources, 'brideName', 'bride_name') || '').trim();
  const groomName = String(pickFrom(sources, 'groomName', 'groom_name') || '').trim();
  const brideFullName = String(pickFrom(sources, 'brideFullName', 'bride_full_name') || '').trim();
  const groomFullName = String(pickFrom(sources, 'groomFullName', 'groom_full_name') || '').trim();

  if (!brideName) throw new AdminApiError(400, 'brideName is required.');
  if (!groomName) throw new AdminApiError(400, 'groomName is required.');
  if (!brideFullName) throw new AdminApiError(400, 'brideFullName is required.');
  if (!groomFullName) throw new AdminApiError(400, 'groomFullName is required.');

  const template = String(pickFrom(sources, 'template') || 'noir').trim().toLowerCase() || 'noir';
  const musicUrl = asNonEmptyString(pickFrom(sources, 'musicUrl', 'music_url'));
  const rawStory = pickFrom(sources, 'story');
  const story: LoveStoryItem[] = Array.isArray(rawStory) ? rawStory : [];

  const rawEvents = pick(body, 'events');
  let events: InvitationEventInput[];
  if (Array.isArray(rawEvents) && rawEvents.length > 0) {
    events = normalizeEvents(rawEvents, isPublished);
  } else {
    const fallbackDate = toIsoDate(pickFrom(sources, 'weddingDate', 'wedding_date'), 'weddingDate');
    const fallbackVenueAddress = String(pickFrom(sources, 'venueAddress', 'venue_address') || '').trim();
    const fallbackMapsUrl = String(pickFrom(sources, 'mapsUrl', 'maps_url') || '').trim();
    const fallbackVenueName = String(pickFrom(sources, 'venueName', 'venue_name') || '').trim();
    if (!fallbackVenueAddress) throw new AdminApiError(400, 'venueAddress is required.');
    if (isPublished && !fallbackMapsUrl) throw new AdminApiError(400, 'mapsUrl is required when published.');
    events = [
      {
        name: String(pick(body, 'eventName', 'event_name') || 'Resepsi').trim(),
        date: fallbackDate,
        startTime: String(pick(body, 'startTime', 'start_time') || '').trim(),
        endTime: String(pick(body, 'endTime', 'end_time') || '').trim() || 'Selesai',
        venueName: fallbackVenueName,
        venueAddress: fallbackVenueAddress,
        mapsUrl: fallbackMapsUrl
      }
    ];
  }

  const primaryEvent = selectPrimaryEvent(events)!;
  const weddingDate = primaryEvent.date;
  const venueName = String(pickFrom(sources, 'venueName', 'venue_name') ?? primaryEvent.venueName ?? '').trim();
  const venueAddress = String(pickFrom(sources, 'venueAddress', 'venue_address') || primaryEvent.venueAddress || '').trim();
  const mapsUrl = String(pickFrom(sources, 'mapsUrl', 'maps_url') || primaryEvent.mapsUrl || '').trim();

  if (!venueAddress) throw new AdminApiError(400, 'venueAddress is required.');
  if (isPublished && !mapsUrl) throw new AdminApiError(400, 'mapsUrl is required when published.');

  const rawPrice = pickFrom(sources, 'purchasePrice', 'purchase_price');
  let purchasePrice: number | null;
  if (rawPrice === undefined) {
    try {
      const platformSettings = await getPlatformSettings();
      const halfPriceMap = buildTemplateHalfPriceMap(platformSettings.home_template_cards);
      purchasePrice = halfPriceMap[template] ?? null;
    } catch {
      purchasePrice = null;
    }
  } else if (rawPrice === null || rawPrice === '') {
    purchasePrice = null;
  } else {
    const parsedPrice = Number(rawPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      throw new AdminApiError(400, 'purchasePrice must be a non-negative number.');
    }
    purchasePrice = Math.round(parsedPrice);
  }

  const rawGifts = pick(body, 'gifts');
  const gifts = Array.isArray(rawGifts) ? normalizeGifts(rawGifts) : [];
  const rawGallery = pick(body, 'galleryImageUrls', 'gallery_image_urls', 'gallery');
  const galleryUrls = Array.isArray(rawGallery) ? normalizeGalleryUrls(rawGallery) : [];

  const { data: existing } = await adminSupabase
    .from('weddings')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existing) {
    throw new AdminApiError(409, `Slug "${slug}" already exists.`);
  }

  const weddingInsert: Record<string, any> = {
    slug,
    bride_name: brideName,
    groom_name: groomName,
    bride_full_name: brideFullName,
    groom_full_name: groomFullName,
    wedding_date: weddingDate,
    venue_name: venueName,
    venue_address: venueAddress,
    maps_url: mapsUrl,
    story,
    music_url: musicUrl,
    template,
    status: statusRaw,
    purchase_price: purchasePrice
  };

  const clientPassword = asNonEmptyString(pickFrom(sources, 'clientPassword', 'client_password'));
  if (clientPassword) {
    weddingInsert.client_password_hash = await hashPasswordSHA256(clientPassword);
  }

  const { data: wedding, error: weddingError } = await adminSupabase
    .from('weddings')
    .insert(weddingInsert)
    .select('id, slug')
    .single();

  if (weddingError) throw toDashboardError(weddingError, 'Failed to create wedding.');

  try {
    const settingsSources = [settingsSrc, body];
    const flagValues: Record<string, boolean> = {};
    for (const flag of SETTINGS_FLAG_FIELDS) {
      const val = pickFrom(settingsSources, ...flag.keys);
      flagValues[flag.column] = typeof val === 'boolean' ? val : flag.defaultValue;
    }

    const rawExpiration = pickFrom(settingsSources, 'expirationDate', 'expiration_date');
    const expirationDate = rawExpiration
      ? toIsoDate(rawExpiration, 'expirationDate')
      : defaultExpirationIso(weddingDate);

    const sections: SectionToggles = {
      ...DEFAULT_SECTIONS,
      ...(typeof body.sections === 'object' && body.sections ? body.sections : {}),
      ...(typeof settingsSrc?.sections === 'object' && settingsSrc.sections ? settingsSrc.sections : {})
    };

    const incomingThemeConfig = pickFrom([settingsSrc, body], 'themeConfig', 'theme_config');
    const themeConfig = mergeThemeConfig(defaultThemeConfig, incomingThemeConfig, {
      theme: pick(body, 'theme'),
      layout: pick(body, 'layout'),
      assets: pick(body, 'assets'),
      content: pick(body, 'content'),
      customCss: pickFrom([body, settingsSrc], 'customCss', 'custom_css')
    });

    const waTemplates = pickFrom([settingsSrc, body], 'waTemplates', 'wa_templates');

    const settingsInsert: Record<string, any> = {
      wedding_id: wedding.id,
      ...flagValues,
      access_password: asNonEmptyString(pickFrom(settingsSources, 'accessPassword', 'access_password')),
      expiration_date: expirationDate,
      sections,
      theme_config: themeConfig
    };
    if (waTemplates && typeof waTemplates === 'object') {
      settingsInsert.wa_templates = waTemplates;
    }

    const { error: settingsError } = await adminSupabase.from('invitation_settings').insert(settingsInsert);
    if (settingsError) throw toDashboardError(settingsError, 'Failed to create invitation settings.');

    await replaceWeddingEvents(adminSupabase, wedding.id, events);
    await replaceGalleryImages(adminSupabase, wedding.id, galleryUrls);
    await replaceGiftAccounts(adminSupabase, wedding.id, gifts);
  } catch (err) {
    await adminSupabase.from('weddings').delete().eq('id', wedding.id);
    throw err;
  }

  const rev = await captureRevisionSnapshot(wedding.id, {
    title: String(pick(body, 'revisionTitle', 'revision_title') || 'Revision #1 (Initial Creation)'),
    note: asNonEmptyString(pick(body, 'revisionNote', 'note')) || 'Created via Admin API',
    createdBy: actorName,
    changesSummary: ['Initial invitation creation via Admin API']
  });

  await logActivity({
    wedding_id: wedding.id,
    slug: wedding.slug,
    actor_type: 'admin',
    actor_name: actorName,
    action: 'invitation.create',
    description: `New invitation '${wedding.slug}' (${brideName} & ${groomName}) created via ${actorName}.`
  });

  return {
    id: wedding.id,
    slug: wedding.slug,
    revisionId: rev.id,
    publicUrl: `/${wedding.slug}`,
    editUrl: `/dashboard/${wedding.slug}/edit`
  };
}

export async function patchAdminInvitation(
  adminSupabase: SupabaseClient<any>,
  rawSlug: string,
  body: Record<string, any>,
  actorName: string
) {
  const currentSlug = validateAdminSlug(rawSlug);
  const current = await getAdminInvitationBySlug(adminSupabase, currentSlug);
  const wedding = current.wedding;
  const currentSettings = current.settings || {};

  const weddingSrc = body.wedding && typeof body.wedding === 'object' ? body.wedding : undefined;
  const settingsSrc = body.settings && typeof body.settings === 'object' ? body.settings : undefined;
  const weddingSources = [weddingSrc, body];
  const settingsSources = [settingsSrc, body];

  const weddingPatch: Record<string, any> = {};

  const nextSlugRaw = pick(weddingSrc, 'slug') ?? pick(body, 'newSlug', 'new_slug');
  if (nextSlugRaw !== undefined) {
    const nextSlug = validateAdminSlug(nextSlugRaw);
    if (nextSlug !== currentSlug) {
      const { data: conflict } = await adminSupabase
        .from('weddings')
        .select('id')
        .eq('slug', nextSlug)
        .maybeSingle();
      if (conflict) throw new AdminApiError(409, `Slug "${nextSlug}" already exists.`);
      weddingPatch.slug = nextSlug;
    }
  }

  const stringFieldMap: Array<{ column: string; keys: string[]; allowEmpty?: boolean }> = [
    { column: 'bride_name', keys: ['brideName', 'bride_name'] },
    { column: 'groom_name', keys: ['groomName', 'groom_name'] },
    { column: 'bride_full_name', keys: ['brideFullName', 'bride_full_name'] },
    { column: 'groom_full_name', keys: ['groomFullName', 'groom_full_name'] },
    { column: 'venue_name', keys: ['venueName', 'venue_name'], allowEmpty: true },
    { column: 'venue_address', keys: ['venueAddress', 'venue_address'] },
    { column: 'maps_url', keys: ['mapsUrl', 'maps_url'], allowEmpty: true }
  ];

  for (const field of stringFieldMap) {
    const val = pickFrom(weddingSources, ...field.keys);
    if (val !== undefined) {
      const trimmed = String(val ?? '').trim();
      if (!field.allowEmpty && !trimmed) {
        throw new AdminApiError(400, `${field.keys[0]} cannot be empty.`);
      }
      weddingPatch[field.column] = trimmed;
    }
  }

  const nextWeddingDate = pickFrom(weddingSources, 'weddingDate', 'wedding_date');
  if (nextWeddingDate !== undefined) {
    weddingPatch.wedding_date = toIsoDate(nextWeddingDate, 'weddingDate');
  }

  const nextMusicUrl = pickFrom(weddingSources, 'musicUrl', 'music_url');
  if (nextMusicUrl !== undefined) {
    weddingPatch.music_url = asNonEmptyString(nextMusicUrl);
  }

  const nextTemplate = pickFrom(weddingSources, 'template');
  if (nextTemplate !== undefined) {
    weddingPatch.template = String(nextTemplate || 'noir').trim().toLowerCase() || 'noir';
  }

  const nextStatus = pickFrom(weddingSources, 'status');
  if (nextStatus !== undefined) {
    const normalizedStatus = String(nextStatus).trim().toLowerCase() as WeddingStatus;
    if (!VALID_STATUSES.includes(normalizedStatus)) {
      throw new AdminApiError(400, 'status must be one of draft, published, or archived.');
    }
    weddingPatch.status = normalizedStatus;
  }

  const nextStory = pickFrom(weddingSources, 'story');
  if (nextStory !== undefined) {
    if (!Array.isArray(nextStory)) throw new AdminApiError(400, 'story must be an array.');
    weddingPatch.story = nextStory;
  }

  const nextPrice = pickFrom(weddingSources, 'purchasePrice', 'purchase_price');
  if (nextPrice !== undefined) {
    if (nextPrice === null || nextPrice === '') {
      weddingPatch.purchase_price = null;
    } else {
      const parsed = Number(nextPrice);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new AdminApiError(400, 'purchasePrice must be a non-negative number.');
      }
      weddingPatch.purchase_price = Math.round(parsed);
    }
  }

  const nextClientPw = asNonEmptyString(pickFrom(weddingSources, 'clientPassword', 'client_password'));
  if (nextClientPw) {
    weddingPatch.client_password_hash = await hashPasswordSHA256(nextClientPw);
  }

  const resultingStatus = (weddingPatch.status || wedding.status) as WeddingStatus;
  const isPublished = resultingStatus === 'published';

  let normalizedEvents: InvitationEventInput[] | null = null;
  const rawEvents = pick(body, 'events');
  if (rawEvents !== undefined) {
    if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
      throw new AdminApiError(400, 'events must be a non-empty array.');
    }
    normalizedEvents = normalizeEvents(rawEvents, isPublished);
    const primary = selectPrimaryEvent(normalizedEvents)!;
    if (weddingPatch.wedding_date === undefined) weddingPatch.wedding_date = primary.date;
    if (weddingPatch.venue_address === undefined && primary.venueAddress) weddingPatch.venue_address = primary.venueAddress;
    if (weddingPatch.maps_url === undefined && primary.mapsUrl) weddingPatch.maps_url = primary.mapsUrl;
  }

  const effectiveMapsUrl = weddingPatch.maps_url !== undefined ? weddingPatch.maps_url : wedding.maps_url;
  if (isPublished && !effectiveMapsUrl) {
    throw new AdminApiError(400, 'mapsUrl is required when invitation status is published.');
  }

  if (Object.keys(weddingPatch).length > 0) {
    const { error } = await adminSupabase.from('weddings').update(weddingPatch).eq('id', wedding.id);
    if (error) throw toDashboardError(error, 'Failed to update wedding.');
  }

  const settingsPatch: Record<string, any> = {};
  for (const flag of SETTINGS_FLAG_FIELDS) {
    const val = pickFrom(settingsSources, ...flag.keys);
    if (typeof val === 'boolean') {
      settingsPatch[flag.column] = val;
    }
  }

  const nextAccessPassword = pickFrom(settingsSources, 'accessPassword', 'access_password');
  if (nextAccessPassword !== undefined) {
    settingsPatch.access_password = asNonEmptyString(nextAccessPassword);
  }

  const nextExpiration = pickFrom(settingsSources, 'expirationDate', 'expiration_date');
  if (nextExpiration !== undefined) {
    settingsPatch.expiration_date = nextExpiration === null || nextExpiration === ''
      ? null
      : toIsoDate(nextExpiration, 'expirationDate');
  }

  const rawSections = pick(body, 'sections') ?? pick(settingsSrc, 'sections');
  if (rawSections && typeof rawSections === 'object') {
    settingsPatch.sections = {
      ...(currentSettings.sections || DEFAULT_SECTIONS),
      ...rawSections
    };
  }

  const incomingThemeConfig = pickFrom([settingsSrc, body], 'themeConfig', 'theme_config');
  const topTheme = pick(body, 'theme');
  const topLayout = pick(body, 'layout');
  const topAssets = pick(body, 'assets');
  const topContent = pick(body, 'content');
  const topCustomCss = pickFrom([body, settingsSrc], 'customCss', 'custom_css');

  if (
    incomingThemeConfig !== undefined ||
    topTheme !== undefined ||
    topLayout !== undefined ||
    topAssets !== undefined ||
    topContent !== undefined ||
    topCustomCss !== undefined
  ) {
    settingsPatch.theme_config = mergeThemeConfig(currentSettings.theme_config, incomingThemeConfig, {
      theme: topTheme,
      layout: topLayout,
      assets: topAssets,
      content: topContent,
      customCss: topCustomCss
    });
  }

  const incomingWaTemplates = pickFrom([settingsSrc, body], 'waTemplates', 'wa_templates');
  if (incomingWaTemplates !== undefined) {
    if (incomingWaTemplates === null) {
      settingsPatch.wa_templates = null;
    } else if (typeof incomingWaTemplates === 'object') {
      settingsPatch.wa_templates = mergeRecord(currentSettings.wa_templates || {}, incomingWaTemplates) || {};
    } else {
      throw new AdminApiError(400, 'waTemplates must be an object or null.');
    }
  }

  if (Object.keys(settingsPatch).length > 0) {
    const { error } = await adminSupabase
      .from('invitation_settings')
      .update(settingsPatch)
      .eq('wedding_id', wedding.id);
    if (error) throw toDashboardError(error, 'Failed to update invitation settings.');
  }

  if (normalizedEvents) {
    await replaceWeddingEvents(adminSupabase, wedding.id, normalizedEvents);
  }

  const rawGifts = pick(body, 'gifts');
  if (rawGifts !== undefined) {
    if (!Array.isArray(rawGifts)) throw new AdminApiError(400, 'gifts must be an array.');
    await replaceGiftAccounts(adminSupabase, wedding.id, normalizeGifts(rawGifts));
  }

  const rawGallery = pick(body, 'galleryImageUrls', 'gallery_image_urls', 'gallery');
  const rawSwaps = pick(body, 'gallerySwaps', 'gallery_swaps');

  if (rawGallery !== undefined) {
    if (!Array.isArray(rawGallery)) throw new AdminApiError(400, 'galleryImageUrls must be an array.');
    await replaceGalleryImages(adminSupabase, wedding.id, normalizeGalleryUrls(rawGallery));
  } else if (rawSwaps !== undefined) {
    if (!Array.isArray(rawSwaps)) throw new AdminApiError(400, 'gallerySwaps must be an array.');
    const updates = resolveGallerySwaps(current.gallery, rawSwaps);
    for (const row of updates) {
      const { error } = await adminSupabase
        .from('gallery_images')
        .update({ sort_order: row.sort_order })
        .eq('id', row.id);
      if (error) throw toDashboardError(error, 'Failed to swap gallery image order.');
    }
  }

  const revisionNote = asNonEmptyString(pick(body, 'revisionNote', 'note'));
  const rev = await captureRevisionSnapshot(wedding.id, {
    title: asNonEmptyString(pick(body, 'revisionTitle', 'revision_title')) || undefined,
    note: revisionNote || undefined,
    createdBy: actorName
  });

  const finalSlug = weddingPatch.slug || currentSlug;
  await logActivity({
    wedding_id: wedding.id,
    slug: finalSlug,
    actor_type: 'admin',
    actor_name: actorName,
    action: 'invitation.update',
    description: `Invitation '${finalSlug}' updated via ${actorName}.` + (revisionNote ? ` Note: "${revisionNote}"` : '')
  });

  const updated = await getAdminInvitationBySlug(adminSupabase, finalSlug);
  return {
    ...updated,
    revisionId: rev.id,
    publicUrl: `/${finalSlug}`,
    editUrl: `/dashboard/${finalSlug}/edit`
  };
}
