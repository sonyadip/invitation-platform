import { getSupabaseAdmin } from '../lib/supabase-admin';
import type { ThemeConfig } from '../types';

export interface InvitationFormInput {
  slug: string;
  brideName: string;
  groomName: string;
  brideFullName: string;
  groomFullName: string;
  weddingDate: string;
  venueName: string;
  venueAddress: string;
  mapsUrl: string;
  musicUrl: string | null;
  template: string;
  status: string;
  rsvpEnabled: boolean;
  musicEnabled: boolean;
  countdownEnabled: boolean;
  galleryEnabled: boolean;
  wishesEnabled: boolean;
  giftEnabled: boolean;
  viewCounterEnabled: boolean;
  maintenanceMode: boolean;
  passwordProtectionEnabled: boolean;
  accessPassword: string | null;
  expirationDate: string | null;
  heroImageUrl: string | null;
  brideImageUrl: string | null;
  groomImageUrl: string | null;
  galleryImageUrls: string[];
  heroImageFile: File | null;
  brideImageFile: File | null;
  groomImageFile: File | null;
  galleryImageFiles: File[];
}

const storageBucket =
  (typeof process !== 'undefined' ? process.env.SUPABASE_STORAGE_BUCKET : '') ||
  import.meta.env.SUPABASE_STORAGE_BUCKET ||
  'invitation-images';
const maxUploadBytes = Number(
  (typeof process !== 'undefined' ? process.env.MAX_IMAGE_UPLOAD_MB : '') ||
  import.meta.env.MAX_IMAGE_UPLOAD_MB ||
  5
) * 1024 * 1024;
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

const defaultThemeConfig: ThemeConfig = {
  theme: {
    primaryColor: '#ffffff',
    secondaryColor: '#111111',
    textColor: '#ffffff',
    bgColor: '#111111',
    fontHeading: 'CVR',
    fontBody: 'Josefin Sans'
  },
  layout: {
    heroStyle: 'centered',
    galleryColumns: 3
  }
};

function toDashboardError(error: any, context: string) {
  if (!error) return new Error(context);
  if (error instanceof Error) return error;

  const parts = [
    context,
    error.message,
    error.details,
    error.hint,
    error.code ? `code: ${error.code}` : ''
  ].filter(Boolean);

  return new Error(parts.join(' - '));
}

export function parseInvitationForm(formData: FormData): InvitationFormInput {
  const value = (name: string) => String(formData.get(name) || '').trim();
  const nullableValue = (name: string) => value(name) || null;
  const checked = (name: string) => formData.get(name) === 'on';
  const fileValue = (name: string) => {
    const file = formData.get(name);
    return isUploadFile(file) ? file : null;
  };
  const fileList = (name: string) => formData
    .getAll(name)
    .filter(isUploadFile);
  const textareaList = (name: string) => value(name)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  const dateValue = (name: string) => {
    const raw = value(name);
    return raw ? new Date(raw).toISOString() : '';
  };
  const nullableDateValue = (name: string) => {
    const raw = value(name);
    return raw ? new Date(raw).toISOString() : null;
  };

  return {
    slug: value('slug'),
    brideName: value('brideName'),
    groomName: value('groomName'),
    brideFullName: value('brideFullName'),
    groomFullName: value('groomFullName'),
    weddingDate: dateValue('weddingDate'),
    venueName: value('venueName'),
    venueAddress: value('venueAddress'),
    mapsUrl: value('mapsUrl'),
    musicUrl: nullableValue('musicUrl'),
    template: value('template') || 'noir',
    status: value('status') || 'draft',
    rsvpEnabled: checked('rsvpEnabled'),
    musicEnabled: checked('musicEnabled'),
    countdownEnabled: checked('countdownEnabled'),
    galleryEnabled: checked('galleryEnabled'),
    wishesEnabled: checked('wishesEnabled'),
    giftEnabled: checked('giftEnabled'),
    viewCounterEnabled: checked('viewCounterEnabled'),
    maintenanceMode: checked('maintenanceMode'),
    passwordProtectionEnabled: checked('passwordProtectionEnabled'),
    accessPassword: nullableValue('accessPassword'),
    expirationDate: nullableDateValue('expirationDate'),
    heroImageUrl: nullableValue('heroImageUrl'),
    brideImageUrl: nullableValue('brideImageUrl'),
    groomImageUrl: nullableValue('groomImageUrl'),
    galleryImageUrls: textareaList('galleryImageUrls'),
    heroImageFile: fileValue('heroImageFile'),
    brideImageFile: fileValue('brideImageFile'),
    groomImageFile: fileValue('groomImageFile'),
    galleryImageFiles: fileList('galleryImageFiles')
  };
}

export function validateInvitationForm(input: InvitationFormInput) {
  const required = [
    ['slug', input.slug],
    ['bride name', input.brideName],
    ['groom name', input.groomName],
    ['bride full name', input.brideFullName],
    ['groom full name', input.groomFullName],
    ['wedding date', input.weddingDate],
    ['venue name', input.venueName],
    ['venue address', input.venueAddress],
    ['maps URL', input.mapsUrl]
  ];

  for (const [label, value] of required) {
    if (!value) throw new Error(`${label} is required.`);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    throw new Error('Slug must use lowercase letters, numbers, and hyphens only.');
  }
}

function isUploadFile(value: FormDataEntryValue): value is File {
  return typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'size' in value &&
    typeof (value as File).name === 'string' &&
    Number((value as File).size) > 0;
}

function fileExtension(file: File) {
  const byType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif'
  };
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return byType[file.type] || extension || 'jpg';
}

function validateImageFile(file: File) {
  if (!allowedImageTypes.includes(file.type)) {
    throw new Error(`Unsupported image type for ${file.name}. Use JPG, PNG, WebP, GIF, or AVIF.`);
  }

  if (file.size > maxUploadBytes) {
    const maxMb = Math.round(maxUploadBytes / 1024 / 1024);
    throw new Error(`${file.name} is too large. Maximum image upload is ${maxMb} MB.`);
  }
}

async function ensureStorageBucket(supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>) {
  const { error: getBucketError } = await supabase.storage.getBucket(storageBucket);
  if (!getBucketError) return;

  const { error: createBucketError } = await supabase.storage.createBucket(storageBucket, {
    public: true,
    fileSizeLimit: maxUploadBytes,
    allowedMimeTypes: allowedImageTypes
  });

  if (createBucketError && !String(createBucketError.message || '').toLowerCase().includes('already exists')) {
    throw toDashboardError(createBucketError, 'Failed to prepare image storage bucket.');
  }
}

async function uploadImageFile(
  supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>,
  slug: string,
  scope: string,
  file: File
) {
  validateImageFile(file);
  await ensureStorageBucket(supabase);

  const path = [
    slug,
    scope,
    `${Date.now()}-${crypto.randomUUID()}.${fileExtension(file)}`
  ].join('/');

  const { error: uploadError } = await supabase
    .storage
    .from(storageBucket)
    .upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
      contentType: file.type
    });

  if (uploadError) throw toDashboardError(uploadError, `Failed to upload ${file.name}.`);

  const { data } = supabase.storage.from(storageBucket).getPublicUrl(path);
  return data.publicUrl;
}

async function resolveUploadedImages(
  supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>,
  input: InvitationFormInput
): Promise<InvitationFormInput> {
  const [heroImageUrl, brideImageUrl, groomImageUrl, galleryImageUrls] = await Promise.all([
    input.heroImageFile
      ? uploadImageFile(supabase, input.slug, 'hero', input.heroImageFile)
      : Promise.resolve(input.heroImageUrl),
    input.brideImageFile
      ? uploadImageFile(supabase, input.slug, 'couple', input.brideImageFile)
      : Promise.resolve(input.brideImageUrl),
    input.groomImageFile
      ? uploadImageFile(supabase, input.slug, 'couple', input.groomImageFile)
      : Promise.resolve(input.groomImageUrl),
    Promise.all(input.galleryImageFiles.map((file) => uploadImageFile(supabase, input.slug, 'gallery', file)))
  ]);

  return {
    ...input,
    heroImageUrl,
    brideImageUrl,
    groomImageUrl,
    galleryImageUrls: [
      ...input.galleryImageUrls,
      ...galleryImageUrls
    ]
  };
}

function cloneThemeConfig(themeConfig: any): ThemeConfig {
  return JSON.parse(JSON.stringify(themeConfig || defaultThemeConfig));
}

function buildThemeConfig(baseThemeConfig: any, input: InvitationFormInput): ThemeConfig {
  const themeConfig = cloneThemeConfig(baseThemeConfig);
  themeConfig.theme = themeConfig.theme || defaultThemeConfig.theme;
  themeConfig.layout = themeConfig.layout || defaultThemeConfig.layout;

  const assets = {
    ...(themeConfig.assets || {}),
    heroImage: input.heroImageUrl || undefined,
    brideImage: input.brideImageUrl || undefined,
    groomImage: input.groomImageUrl || undefined
  };

  Object.keys(assets).forEach((key) => {
    if (!assets[key as keyof typeof assets]) delete assets[key as keyof typeof assets];
  });

  if (Object.keys(assets).length) {
    themeConfig.assets = assets;
  } else {
    delete themeConfig.assets;
  }

  return themeConfig;
}

async function replaceGalleryImages(
  supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>,
  weddingId: string,
  imageUrls: string[]
) {
  const { error: deleteError } = await supabase
    .from('gallery_images')
    .delete()
    .eq('wedding_id', weddingId);

  if (deleteError) throw toDashboardError(deleteError, 'Failed to clear gallery images.');

  if (!imageUrls.length) return;

  const rows = imageUrls.map((imageUrl, index) => ({
    wedding_id: weddingId,
    image_url: imageUrl,
    sort_order: index + 1
  }));

  const { error: insertError } = await supabase
    .from('gallery_images')
    .insert(rows);

  if (insertError) throw toDashboardError(insertError, 'Failed to save gallery images.');
}

function extractStoragePath(url: string | null | undefined) {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);
    const marker = `/storage/v1/object/public/${storageBucket}/`;
    const markerIndex = parsedUrl.pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    return decodeURIComponent(parsedUrl.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

function collectAssetPaths(themeConfig: any) {
  const assets = themeConfig?.assets || {};
  return [
    extractStoragePath(assets.heroImage),
    extractStoragePath(assets.brideImage),
    extractStoragePath(assets.groomImage)
  ].filter(Boolean) as string[];
}

async function collectWeddingStoragePaths(
  supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>,
  weddingId: string
) {
  const [settingsRes, galleryRes, giftsRes] = await Promise.all([
    supabase
      .from('invitation_settings')
      .select('theme_config')
      .eq('wedding_id', weddingId)
      .maybeSingle(),
    supabase
      .from('gallery_images')
      .select('image_url')
      .eq('wedding_id', weddingId),
    supabase
      .from('gift_accounts')
      .select('qris_url')
      .eq('wedding_id', weddingId)
  ]);

  if (settingsRes.error) throw toDashboardError(settingsRes.error, 'Failed to load image settings for deletion.');
  if (galleryRes.error) throw toDashboardError(galleryRes.error, 'Failed to load gallery images for deletion.');
  if (giftsRes.error) throw toDashboardError(giftsRes.error, 'Failed to load gift images for deletion.');

  const paths = [
    ...collectAssetPaths((settingsRes.data as any)?.theme_config),
    ...((galleryRes.data || []) as any[]).map((image) => extractStoragePath(image.image_url)),
    ...((giftsRes.data || []) as any[]).map((gift) => extractStoragePath(gift.qris_url))
  ].filter(Boolean) as string[];

  return Array.from(new Set(paths));
}

async function collectReferencedStoragePaths(
  supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>,
  excludeWeddingId: string
) {
  const [settingsRes, galleryRes, giftsRes] = await Promise.all([
    supabase
      .from('invitation_settings')
      .select('wedding_id, theme_config')
      .neq('wedding_id', excludeWeddingId),
    supabase
      .from('gallery_images')
      .select('wedding_id, image_url')
      .neq('wedding_id', excludeWeddingId),
    supabase
      .from('gift_accounts')
      .select('wedding_id, qris_url')
      .neq('wedding_id', excludeWeddingId)
      .not('qris_url', 'is', null)
  ]);

  if (settingsRes.error) throw toDashboardError(settingsRes.error, 'Failed to check shared image settings.');
  if (galleryRes.error) throw toDashboardError(galleryRes.error, 'Failed to check shared gallery images.');
  if (giftsRes.error) throw toDashboardError(giftsRes.error, 'Failed to check shared gift images.');

  const paths = [
    ...((settingsRes.data || []) as any[]).flatMap((settings) => collectAssetPaths(settings.theme_config)),
    ...((galleryRes.data || []) as any[]).map((image) => extractStoragePath(image.image_url)),
    ...((giftsRes.data || []) as any[]).map((gift) => extractStoragePath(gift.qris_url))
  ].filter(Boolean) as string[];

  return new Set(paths);
}

async function deleteUnsharedStorageImages(
  supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>,
  weddingId: string
) {
  const sourcePaths = await collectWeddingStoragePaths(supabase, weddingId);
  if (!sourcePaths.length) return;

  const referencedPaths = await collectReferencedStoragePaths(supabase, weddingId);
  const removablePaths = sourcePaths.filter((path) => !referencedPaths.has(path));
  if (!removablePaths.length) return;

  const { error } = await supabase
    .storage
    .from(storageBucket)
    .remove(removablePaths);

  if (error) throw toDashboardError(error, 'Failed to delete invitation images from storage.');
}

export async function createInvitation(input: InvitationFormInput) {
  validateInvitationForm(input);
  const supabase = await getSupabaseAdmin();
  const resolvedInput = await resolveUploadedImages(supabase, input);

  const { data: wedding, error: weddingError } = await supabase
    .from('weddings')
    .insert({
      slug: resolvedInput.slug,
      bride_name: resolvedInput.brideName,
      groom_name: resolvedInput.groomName,
      bride_full_name: resolvedInput.brideFullName,
      groom_full_name: resolvedInput.groomFullName,
      wedding_date: resolvedInput.weddingDate,
      venue_name: resolvedInput.venueName,
      venue_address: resolvedInput.venueAddress,
      maps_url: resolvedInput.mapsUrl,
      story: [],
      music_url: resolvedInput.musicUrl,
      template: resolvedInput.template,
      status: resolvedInput.status
    })
    .select('id, slug')
    .single();

  if (weddingError) throw toDashboardError(weddingError, 'Failed to create wedding.');

  const { error: settingsError } = await supabase
    .from('invitation_settings')
    .insert({
      wedding_id: wedding.id,
      rsvp_enabled: resolvedInput.rsvpEnabled,
      music_enabled: resolvedInput.musicEnabled,
      countdown_enabled: resolvedInput.countdownEnabled,
      gallery_enabled: resolvedInput.galleryEnabled,
      wishes_enabled: resolvedInput.wishesEnabled,
      gift_enabled: resolvedInput.giftEnabled,
      view_counter_enabled: resolvedInput.viewCounterEnabled,
      maintenance_mode: resolvedInput.maintenanceMode,
      password_protection_enabled: resolvedInput.passwordProtectionEnabled,
      access_password: resolvedInput.accessPassword,
      expiration_date: resolvedInput.expirationDate,
      theme_config: buildThemeConfig(null, resolvedInput)
    });

  if (settingsError) throw toDashboardError(settingsError, 'Failed to create invitation settings.');
  await replaceGalleryImages(supabase, wedding.id, resolvedInput.galleryImageUrls);

  return wedding.slug as string;
}

export async function updateInvitation(weddingId: string, input: InvitationFormInput) {
  validateInvitationForm(input);
  const supabase = await getSupabaseAdmin();
  const resolvedInput = await resolveUploadedImages(supabase, input);

  const { error: weddingError } = await supabase
    .from('weddings')
    .update({
      slug: resolvedInput.slug,
      bride_name: resolvedInput.brideName,
      groom_name: resolvedInput.groomName,
      bride_full_name: resolvedInput.brideFullName,
      groom_full_name: resolvedInput.groomFullName,
      wedding_date: resolvedInput.weddingDate,
      venue_name: resolvedInput.venueName,
      venue_address: resolvedInput.venueAddress,
      maps_url: resolvedInput.mapsUrl,
      music_url: resolvedInput.musicUrl,
      template: resolvedInput.template,
      status: resolvedInput.status
    })
    .eq('id', weddingId);

  if (weddingError) throw toDashboardError(weddingError, 'Failed to update wedding.');

  const { data: currentSettings, error: currentSettingsError } = await supabase
    .from('invitation_settings')
    .select('theme_config')
    .eq('wedding_id', weddingId)
    .maybeSingle();

  if (currentSettingsError) {
    throw toDashboardError(currentSettingsError, 'Failed to load current invitation settings.');
  }

  const { error: settingsError } = await supabase
    .from('invitation_settings')
    .update({
      rsvp_enabled: resolvedInput.rsvpEnabled,
      music_enabled: resolvedInput.musicEnabled,
      countdown_enabled: resolvedInput.countdownEnabled,
      gallery_enabled: resolvedInput.galleryEnabled,
      wishes_enabled: resolvedInput.wishesEnabled,
      gift_enabled: resolvedInput.giftEnabled,
      view_counter_enabled: resolvedInput.viewCounterEnabled,
      maintenance_mode: resolvedInput.maintenanceMode,
      password_protection_enabled: resolvedInput.passwordProtectionEnabled,
      access_password: resolvedInput.accessPassword,
      expiration_date: resolvedInput.expirationDate,
      theme_config: buildThemeConfig((currentSettings as any)?.theme_config, resolvedInput)
    })
    .eq('wedding_id', weddingId);

  if (settingsError) throw toDashboardError(settingsError, 'Failed to update invitation settings.');
  await replaceGalleryImages(supabase, weddingId, resolvedInput.galleryImageUrls);

  return resolvedInput.slug;
}

export async function softDeleteInvitation(weddingId: string) {
  const supabase = await getSupabaseAdmin();

  const { error } = await supabase
    .from('weddings')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: 'dashboard'
    })
    .eq('id', weddingId);

  if (error) throw toDashboardError(error, 'Failed to soft delete invitation.');
}

export async function restoreInvitation(weddingId: string) {
  const supabase = await getSupabaseAdmin();

  const { error } = await supabase
    .from('weddings')
    .update({
      deleted_at: null,
      deleted_by: null
    })
    .eq('id', weddingId);

  if (error) throw toDashboardError(error, 'Failed to restore invitation.');
}

export async function permanentlyDeleteInvitation(weddingId: string) {
  const supabase = await getSupabaseAdmin();

  await deleteUnsharedStorageImages(supabase, weddingId);

  const { error } = await supabase
    .from('weddings')
    .delete()
    .eq('id', weddingId);

  if (error) throw toDashboardError(error, 'Failed to permanently delete invitation.');
}

async function buildDuplicateSlug(supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>, sourceSlug: string) {
  const baseSlug = `${sourceSlug}-copy`;

  for (let index = 1; index <= 100; index += 1) {
    const candidate = index === 1 ? baseSlug : `${baseSlug}-${index}`;
    const { data, error } = await supabase
      .from('weddings')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (error) throw toDashboardError(error, 'Failed to check duplicate slug.');
    if (!data) return candidate;
  }

  throw new Error('Could not generate a unique duplicate slug.');
}

export async function duplicateInvitation(weddingId: string) {
  const supabase = await getSupabaseAdmin();

  const { data: wedding, error: weddingError } = await supabase
    .from('weddings')
    .select('*')
    .eq('id', weddingId)
    .is('deleted_at', null)
    .maybeSingle();

  if (weddingError) throw toDashboardError(weddingError, 'Failed to load source invitation.');
  if (!wedding) throw new Error('Source invitation was not found.');

  const newSlug = await buildDuplicateSlug(supabase, wedding.slug);

  const { data: duplicatedWedding, error: insertWeddingError } = await supabase
    .from('weddings')
    .insert({
      slug: newSlug,
      bride_name: wedding.bride_name,
      groom_name: wedding.groom_name,
      bride_full_name: wedding.bride_full_name,
      groom_full_name: wedding.groom_full_name,
      wedding_date: wedding.wedding_date,
      venue_name: wedding.venue_name,
      venue_address: wedding.venue_address,
      maps_url: wedding.maps_url,
      story: wedding.story || [],
      music_url: wedding.music_url,
      template: wedding.template,
      status: 'draft'
    })
    .select('id, slug')
    .single();

  if (insertWeddingError) throw toDashboardError(insertWeddingError, 'Failed to insert duplicated wedding.');

  const [settingsRes, eventsRes, galleryRes, giftsRes] = await Promise.all([
    supabase
      .from('invitation_settings')
      .select('*')
      .eq('wedding_id', weddingId)
      .maybeSingle(),
    supabase
      .from('wedding_events')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('gallery_images')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('gift_accounts')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true })
  ]);

  if (settingsRes.error) throw toDashboardError(settingsRes.error, 'Failed to load source settings.');
  if (eventsRes.error) throw toDashboardError(eventsRes.error, 'Failed to load source events.');
  if (galleryRes.error) throw toDashboardError(galleryRes.error, 'Failed to load source gallery.');
  if (giftsRes.error) throw toDashboardError(giftsRes.error, 'Failed to load source gift accounts.');

  const settings = settingsRes.data as any;
  if (settings) {
    const { error } = await supabase.from('invitation_settings').insert({
      wedding_id: duplicatedWedding.id,
      rsvp_enabled: settings.rsvp_enabled,
      music_enabled: settings.music_enabled,
      music_autoplay: settings.music_autoplay,
      countdown_enabled: settings.countdown_enabled,
      gallery_enabled: settings.gallery_enabled,
      wishes_enabled: settings.wishes_enabled,
      gift_enabled: settings.gift_enabled,
      share_enabled: settings.share_enabled,
      view_counter_enabled: settings.view_counter_enabled,
      maintenance_mode: settings.maintenance_mode,
      expiration_date: settings.expiration_date,
      password_protection_enabled: settings.password_protection_enabled,
      access_password: settings.access_password,
      sections: settings.sections,
      theme_config: settings.theme_config
    });

    if (error) throw toDashboardError(error, 'Failed to duplicate invitation settings.');
  }

  const events = ((eventsRes.data || []) as any[]).map((event) => ({
    wedding_id: duplicatedWedding.id,
    event_name: event.event_name,
    event_date: event.event_date,
    start_time: event.start_time,
    end_time: event.end_time,
    venue_name: event.venue_name,
    venue_address: event.venue_address,
    maps_url: event.maps_url,
    sort_order: event.sort_order
  }));

  if (events.length) {
    const { error } = await supabase.from('wedding_events').insert(events);
    if (error) throw toDashboardError(error, 'Failed to duplicate events.');
  }

  const gallery = ((galleryRes.data || []) as any[]).map((image) => ({
    wedding_id: duplicatedWedding.id,
    image_url: image.image_url,
    sort_order: image.sort_order
  }));

  if (gallery.length) {
    const { error } = await supabase.from('gallery_images').insert(gallery);
    if (error) throw toDashboardError(error, 'Failed to duplicate gallery.');
  }

  const gifts = ((giftsRes.data || []) as any[]).map((gift) => ({
    wedding_id: duplicatedWedding.id,
    bank_name: gift.bank_name,
    account_number: gift.account_number,
    account_name: gift.account_name,
    qris_url: gift.qris_url,
    sort_order: gift.sort_order
  }));

  if (gifts.length) {
    const { error } = await supabase.from('gift_accounts').insert(gifts);
    if (error) throw toDashboardError(error, 'Failed to duplicate gift accounts.');
  }

  return duplicatedWedding.slug as string;
}
