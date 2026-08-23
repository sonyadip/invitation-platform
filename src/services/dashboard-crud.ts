import { getSupabaseAdmin } from '../lib/supabase-admin';
import type { LoveStoryItem, SectionToggles, ThemeConfig } from '../types';
import { logActivity } from './activity-log';
import { captureRevisionSnapshot } from './revision';

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
  storyEnabled: boolean;
  viewCounterEnabled: boolean;
  videoEnabled: boolean;
  introAnimationEnabled: boolean;
  maintenanceMode: boolean;
  passwordProtectionEnabled: boolean;
  accessPassword: string | null;
  clientPassword: string | null;
  expirationDate: string | null;
  heroVideoUrl: string | null;
  heroImageUrl: string | null;
  brideImageUrl: string | null;
  groomImageUrl: string | null;
  logoImageUrl: string | null;
  closingImageUrl: string | null;
  eventImageUrl: string | null;
  rsvpImageUrl: string | null;
  countdownImageUrl: string | null;
  galleryImageUrls: string[];
  galleryVideoUrls: string[];
  instagramUrl: string | null;
  groomInstagramUrl: string | null;
  brideInstagramUrl: string | null;
  groomFatherName: string | null;
  groomMotherName: string | null;
  groomChildNumber: string | null;
  groomAddress: string | null;
  brideFatherName: string | null;
  brideMotherName: string | null;
  brideChildNumber: string | null;
  brideAddress: string | null;
  giftDescription: string | null;
  thankYouMessage: string | null;
  introVerse: string | null;
  introVerseSource: string | null;
  events: InvitationEventInput[];
  gifts: InvitationGiftInput[];
  story: LoveStoryItem[];
  heroImageFile: File | null;
  brideImageFile: File | null;
  groomImageFile: File | null;
  logoImageFile: File | null;
  closingImageFile: File | null;
  eventImageFile: File | null;
  rsvpImageFile: File | null;
  countdownImageFile: File | null;
  galleryImageFiles: File[];
  musicFile: File | null;
}

export interface InvitationEventInput {
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  venueName: string;
  venueAddress: string;
  mapsUrl: string;
}

export interface InvitationGiftInput {
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrisUrl: string | null;
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
const allowedAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/x-m4a', 'audio/webm'];

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

function formatInstagramUrl(val: string | null): string | null {
  if (!val) return null;
  val = val.trim();
  if (!val) return null;
  if (val.startsWith('http://') || val.startsWith('https://')) return val;
  if (val.startsWith('@')) return `https://www.instagram.com/${val.substring(1)}`;
  return `https://www.instagram.com/${val}`;
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
  const values = (name: string) => formData
    .getAll(name)
    .map((item) => String(item || '').trim());
  const eventNames = values('eventName');
  const eventDates = values('eventDate');
  const eventStartTimes = values('eventStartTime');
  const eventEndTimes = values('eventEndTime');
  const eventVenueNames = values('eventVenueName');
  const eventVenueAddresses = values('eventVenueAddress');
  const eventMapsUrls = values('eventMapsUrl');
  const storyTitles = values('storyTitle');
  const storyDescriptions = values('storyDescription');
  const giftBankNames = values('giftBankName');
  const giftAccountNumbers = values('giftAccountNumber');
  const giftAccountNames = values('giftAccountName');
  const giftQrisUrls = values('giftQrisUrl');
  const galleryImageUrlValues = values('galleryImageUrl');
  const galleryVideoUrlValues = values('galleryVideoUrl');
  const events = eventNames
    .map((name, index) => ({
      name,
      date: eventDates[index] ? new Date(eventDates[index]).toISOString() : '',
      startTime: eventStartTimes[index] || '',
      endTime: eventEndTimes[index] || '',
      venueName: eventVenueNames[index] || '',
      venueAddress: eventVenueAddresses[index] || '',
      mapsUrl: eventMapsUrls[index] || ''
    }))
    .filter((event) => event.name || event.date || event.venueName || event.venueAddress || event.mapsUrl);
  const primaryEvent = events[0];
  const story = storyTitles
    .map((title, index) => ({
      title,
      description: storyDescriptions[index] || ''
    }))
    .filter((item) => item.title || item.description);
  const gifts = giftBankNames
    .map((bankName, index) => ({
      bankName,
      accountNumber: giftAccountNumbers[index] || '',
      accountName: giftAccountNames[index] || '',
      qrisUrl: giftQrisUrls[index] || null
    }))
    .filter((gift) => gift.bankName || gift.accountNumber || gift.accountName || gift.qrisUrl);

  return {
    slug: value('slug'),
    brideName: value('brideName'),
    groomName: value('groomName'),
    brideFullName: value('brideFullName'),
    groomFullName: value('groomFullName'),
    weddingDate: primaryEvent?.date || dateValue('weddingDate'),
    venueName: primaryEvent?.venueName || value('venueName'),
    venueAddress: primaryEvent?.venueAddress || value('venueAddress'),
    mapsUrl: primaryEvent?.mapsUrl || value('mapsUrl'),
    musicUrl: nullableValue('musicUrl'),
    template: value('template') || 'noir',
    status: value('status') || 'draft',
    rsvpEnabled: checked('rsvpEnabled'),
    musicEnabled: checked('musicEnabled'),
    countdownEnabled: checked('countdownEnabled'),
    galleryEnabled: checked('galleryEnabled'),
    wishesEnabled: checked('wishesEnabled'),
    giftEnabled: checked('giftEnabled'),
    storyEnabled: checked('storyEnabled'),
    viewCounterEnabled: checked('viewCounterEnabled'),
    videoEnabled: checked('videoEnabled'),
    introAnimationEnabled: checked('introAnimationEnabled'),
    maintenanceMode: checked('maintenanceMode'),
    passwordProtectionEnabled: checked('passwordProtectionEnabled'),
    accessPassword: nullableValue('accessPassword'),
    clientPassword: nullableValue('clientPassword'),
    expirationDate: nullableDateValue('expirationDate') || (() => {
      if (events.length > 0 && events[0].date) {
        const d = new Date(events[0].date);
        d.setMonth(d.getMonth() + 1);
        return d.toISOString();
      }
      return null;
    })(),
    heroVideoUrl: nullableValue('heroVideoUrl'),
    heroImageUrl: nullableValue('heroImageUrl'),
    brideImageUrl: nullableValue('brideImageUrl'),
    groomImageUrl: nullableValue('groomImageUrl'),
    logoImageUrl: nullableValue('logoImageUrl'),
    closingImageUrl: nullableValue('closingImageUrl'),
    eventImageUrl: nullableValue('eventImageUrl'),
    rsvpImageUrl: nullableValue('rsvpImageUrl'),
    countdownImageUrl: nullableValue('countdownImageUrl'),
    galleryImageUrls: galleryImageUrlValues.filter(Boolean),
    galleryVideoUrls: galleryVideoUrlValues.filter(Boolean),
    instagramUrl: formatInstagramUrl(nullableValue('instagramUrl')),
    groomInstagramUrl: formatInstagramUrl(nullableValue('groomInstagramUrl')),
    brideInstagramUrl: formatInstagramUrl(nullableValue('brideInstagramUrl')),
    groomFatherName: nullableValue('groomFatherName'),
    groomMotherName: nullableValue('groomMotherName'),
    groomChildNumber: nullableValue('groomChildNumber'),
    groomAddress: nullableValue('groomAddress'),
    brideFatherName: nullableValue('brideFatherName'),
    brideMotherName: nullableValue('brideMotherName'),
    brideChildNumber: nullableValue('brideChildNumber'),
    brideAddress: nullableValue('brideAddress'),
    giftDescription: nullableValue('giftDescription'),
    thankYouMessage: nullableValue('thankYouMessage'),
    introVerse: nullableValue('introVerse'),
    introVerseSource: nullableValue('introVerseSource'),
    events,
    gifts,
    story,
    heroImageFile: fileValue('heroImageFile'),
    brideImageFile: fileValue('brideImageFile'),
    groomImageFile: fileValue('groomImageFile'),
    logoImageFile: fileValue('logoImageFile'),
    closingImageFile: fileValue('closingImageFile'),
    eventImageFile: fileValue('eventImageFile'),
    rsvpImageFile: fileValue('rsvpImageFile'),
    countdownImageFile: fileValue('countdownImageFile'),
    galleryImageFiles: fileList('galleryImageFiles'),
    musicFile: fileValue('musicFile')
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
    ['venue address', input.venueAddress],
    ['maps URL', input.mapsUrl]
  ];

  for (const [label, value] of required) {
    if (!value) throw new Error(`${label} is required.`);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    throw new Error('Slug must use lowercase letters, numbers, and hyphens only.');
  }

  if (!input.events.length) {
    throw new Error('At least one event is required.');
  }

  input.events.forEach((event, index) => {
    const eventNumber = index + 1;
    const requiredEventFields = [
      [`event ${eventNumber} name`, event.name],
      [`event ${eventNumber} date`, event.date],
      [`event ${eventNumber} venue address`, event.venueAddress],
      [`event ${eventNumber} maps URL`, event.mapsUrl]
    ];

    for (const [label, value] of requiredEventFields) {
      if (!value) throw new Error(`${label} is required.`);
    }
  });

  input.story.forEach((story, index) => {
    const storyNumber = index + 1;
    if (!story.title) throw new Error(`story ${storyNumber} title is required.`);
    if (!story.description) throw new Error(`story ${storyNumber} description is required.`);
  });

  input.gifts.forEach((gift, index) => {
    const giftNumber = index + 1;
    if (!(gift.bankName || gift.accountNumber || gift.accountName || gift.qrisUrl)) return;
    if (!gift.bankName) throw new Error(`gift ${giftNumber} bank name is required.`);
    if (!gift.accountNumber) throw new Error(`gift ${giftNumber} account number is required.`);
    if (!gift.accountName) throw new Error(`gift ${giftNumber} account name is required.`);
  });
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

function validateAudioFile(file: File) {
  if (!allowedAudioTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|aac|m4a|webm)$/i)) {
    throw new Error(`Unsupported audio type for ${file.name}. Use MP3, WAV, OGG, AAC, M4A, or WebM.`);
  }

  const maxAudioBytes = 20 * 1024 * 1024; // 20MB limit for audio
  if (file.size > maxAudioBytes) {
    throw new Error(`${file.name} is too large. Maximum audio upload is 20 MB.`);
  }
}

async function ensureStorageBucket(supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>) {
  const { data: bucket, error: getBucketError } = await supabase.storage.getBucket(storageBucket);
  
  if (!getBucketError && bucket) {
    // If bucket already exists (e.g. previously configured only for images), update allowed MIME types
    await supabase.storage.updateBucket(storageBucket, {
      public: true,
      fileSizeLimit: 20 * 1024 * 1024,
      allowedMimeTypes: null as any // null or empty allows all types, or we can omit restriction
    }).catch(() => {});
    return;
  }

  const { error: createBucketError } = await supabase.storage.createBucket(storageBucket, {
    public: true,
    fileSizeLimit: 20 * 1024 * 1024
  });

  if (createBucketError && !String(createBucketError.message || '').toLowerCase().includes('already exists')) {
    throw toDashboardError(createBucketError, 'Failed to prepare storage bucket.');
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

async function uploadAudioFile(
  supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>,
  slug: string,
  file: File
) {
  validateAudioFile(file);
  await ensureStorageBucket(supabase);

  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp3';
  const path = [
    slug,
    'music',
    `${Date.now()}-${crypto.randomUUID()}.${ext}`
  ].join('/');

  const { error: uploadError } = await supabase
    .storage
    .from(storageBucket)
    .upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
      contentType: file.type || 'audio/mpeg'
    });

  if (uploadError) throw toDashboardError(uploadError, `Failed to upload ${file.name}.`);

  const { data } = supabase.storage.from(storageBucket).getPublicUrl(path);
  return data.publicUrl;
}

async function resolveUploadedImages(
  supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>,
  input: InvitationFormInput
): Promise<InvitationFormInput> {
  const [heroImageUrl, brideImageUrl, groomImageUrl, logoImageUrl, closingImageUrl, eventImageUrl, rsvpImageUrl, countdownImageUrl, galleryImageUrls, musicUrl] = await Promise.all([
    input.heroImageFile
      ? uploadImageFile(supabase, input.slug, 'hero', input.heroImageFile)
      : Promise.resolve(input.heroImageUrl),
    input.brideImageFile
      ? uploadImageFile(supabase, input.slug, 'couple', input.brideImageFile)
      : Promise.resolve(input.brideImageUrl),
    input.groomImageFile
      ? uploadImageFile(supabase, input.slug, 'couple', input.groomImageFile)
      : Promise.resolve(input.groomImageUrl),
    input.logoImageFile
      ? uploadImageFile(supabase, input.slug, 'logo', input.logoImageFile)
      : Promise.resolve(input.logoImageUrl),
    input.closingImageFile
      ? uploadImageFile(supabase, input.slug, 'closing', input.closingImageFile)
      : Promise.resolve(input.closingImageUrl),
    input.eventImageFile
      ? uploadImageFile(supabase, input.slug, 'event', input.eventImageFile)
      : Promise.resolve(input.eventImageUrl),
    input.rsvpImageFile
      ? uploadImageFile(supabase, input.slug, 'rsvp', input.rsvpImageFile)
      : Promise.resolve(input.rsvpImageUrl),
    input.countdownImageFile
      ? uploadImageFile(supabase, input.slug, 'countdown', input.countdownImageFile)
      : Promise.resolve(input.countdownImageUrl),
    Promise.all(input.galleryImageFiles.map((file) => uploadImageFile(supabase, input.slug, 'gallery', file))),
    input.musicFile
      ? uploadAudioFile(supabase, input.slug, input.musicFile)
      : Promise.resolve(input.musicUrl)
  ]);

  return {
    ...input,
    heroImageUrl,
    brideImageUrl,
    groomImageUrl,
    logoImageUrl,
    closingImageUrl,
    eventImageUrl,
    rsvpImageUrl,
    countdownImageUrl,
    musicUrl,
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
    heroVideo: input.heroVideoUrl || undefined,
    coverImage: input.heroImageUrl || undefined,
    heroImage: input.heroImageUrl || undefined,
    brideImage: input.brideImageUrl || undefined,
    groomImage: input.groomImageUrl || undefined,
    logoImage: input.logoImageUrl || undefined,
    closingImage: input.closingImageUrl || undefined,
    eventImage: input.eventImageUrl || undefined,
    rsvpImage: input.rsvpImageUrl || undefined,
    countdownImage: input.countdownImageUrl || undefined
  };

  Object.keys(assets).forEach((key) => {
    if (!assets[key as keyof typeof assets]) delete assets[key as keyof typeof assets];
  });

  if (Object.keys(assets).length) {
    themeConfig.assets = assets;
  } else {
    delete themeConfig.assets;
  }

  const content = {
    ...(themeConfig.content || {}),
    instagramUrl: input.instagramUrl || undefined,
    groomInstagramUrl: input.groomInstagramUrl || undefined,
    brideInstagramUrl: input.brideInstagramUrl || undefined,
    groomFatherName: input.groomFatherName || undefined,
    groomMotherName: input.groomMotherName || undefined,
    groomChildNumber: input.groomChildNumber || undefined,
    groomAddress: input.groomAddress || undefined,
    brideFatherName: input.brideFatherName || undefined,
    brideMotherName: input.brideMotherName || undefined,
    brideChildNumber: input.brideChildNumber || undefined,
    brideAddress: input.brideAddress || undefined,
    galleryVideoUrls: input.galleryVideoUrls?.length ? input.galleryVideoUrls : undefined,
    giftDescription: input.giftDescription || undefined,
    closingMessage: input.thankYouMessage || undefined,
    verse: input.introVerse || undefined,
    verseSource: input.introVerseSource || undefined
  };

  Object.keys(content).forEach((key) => {
    if (!content[key as keyof typeof content]) delete content[key as keyof typeof content];
  });

  if (Object.keys(content).length) {
    themeConfig.content = content;
  } else {
    delete themeConfig.content;
  }

  return themeConfig;
}

function buildSections(baseSections: any, input: InvitationFormInput): SectionToggles {
  const defaults: SectionToggles = {
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

  return {
    ...defaults,
    ...(baseSections || {}),
    countdown: input.countdownEnabled,
    story: input.storyEnabled,
    gallery: input.galleryEnabled,
    rsvp: input.rsvpEnabled,
    wishes: input.wishesEnabled,
    gift: input.giftEnabled,
    music: input.musicEnabled,
    video: input.videoEnabled,
    introAnimation: input.introAnimationEnabled
  };
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

async function replaceWeddingEvents(
  supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>,
  weddingId: string,
  events: InvitationEventInput[]
) {
  const { error: deleteError } = await supabase
    .from('wedding_events')
    .delete()
    .eq('wedding_id', weddingId);

  if (deleteError) throw toDashboardError(deleteError, 'Failed to clear wedding events.');

  const rows = events.map((event, index) => ({
    wedding_id: weddingId,
    event_name: event.name,
    event_date: event.date,
    start_time: event.startTime || '',
    end_time: event.endTime || 'Selesai',
    venue_name: event.venueName,
    venue_address: event.venueAddress,
    maps_url: event.mapsUrl,
    sort_order: index + 1
  }));

  const { error: insertError } = await supabase
    .from('wedding_events')
    .insert(rows);

  if (insertError) throw toDashboardError(insertError, 'Failed to save wedding events.');
}

async function replaceGiftAccounts(
  supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>,
  weddingId: string,
  gifts: InvitationGiftInput[]
) {
  const { error: deleteError } = await supabase
    .from('gift_accounts')
    .delete()
    .eq('wedding_id', weddingId);

  if (deleteError) throw toDashboardError(deleteError, 'Failed to clear gift accounts.');

  if (!gifts.length) return;

  const rows = gifts.map((gift, index) => ({
    wedding_id: weddingId,
    bank_name: gift.bankName,
    account_number: gift.accountNumber,
    account_name: gift.accountName,
    qris_url: gift.qrisUrl || null,
    sort_order: index + 1
  }));

  const { error: insertError } = await supabase
    .from('gift_accounts')
    .insert(rows);

  if (insertError) throw toDashboardError(insertError, 'Failed to save gift accounts.');
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
    extractStoragePath(assets.coverImage),
    extractStoragePath(assets.heroImage),
    extractStoragePath(assets.brideImage),
    extractStoragePath(assets.groomImage),
    extractStoragePath(assets.logoImage),
    extractStoragePath(assets.closingImage),
    extractStoragePath(assets.eventImage),
    extractStoragePath(assets.rsvpImage),
    extractStoragePath(assets.countdownImage)
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

  const weddingInsertData: any = {
    slug: resolvedInput.slug,
    bride_name: resolvedInput.brideName,
    groom_name: resolvedInput.groomName,
    bride_full_name: resolvedInput.brideFullName,
    groom_full_name: resolvedInput.groomFullName,
    wedding_date: resolvedInput.weddingDate,
    venue_name: resolvedInput.venueName,
    venue_address: resolvedInput.venueAddress,
    maps_url: resolvedInput.mapsUrl,
    story: resolvedInput.story,
    music_url: resolvedInput.musicUrl,
    template: resolvedInput.template,
    status: resolvedInput.status
  };

  if (resolvedInput.clientPassword && resolvedInput.clientPassword.trim() !== '') {
    const { hashPasswordSHA256 } = await import('../utils/security');
    weddingInsertData.client_password_hash = await hashPasswordSHA256(resolvedInput.clientPassword);
  }

  const { data: wedding, error: weddingError } = await supabase
    .from('weddings')
    .insert(weddingInsertData)
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
      sections: buildSections(null, resolvedInput),
      theme_config: buildThemeConfig(null, resolvedInput)
    });

  if (settingsError) throw toDashboardError(settingsError, 'Failed to create invitation settings.');
  await replaceWeddingEvents(supabase, wedding.id, resolvedInput.events);
  await replaceGalleryImages(supabase, wedding.id, resolvedInput.galleryImageUrls);
  await replaceGiftAccounts(supabase, wedding.id, resolvedInput.gifts);

  // Capture initial revision & log activity (non-blocking)
  await captureRevisionSnapshot(wedding.id, {
    title: 'Revision #1 (Initial Creation)',
    createdBy: 'admin',
    changesSummary: ['Initial invitation creation']
  });

  await logActivity({
    wedding_id: wedding.id,
    slug: wedding.slug,
    actor_type: 'admin',
    action: 'invitation.create',
    description: `New invitation '${wedding.slug}' (${resolvedInput.brideName} & ${resolvedInput.groomName}) successfully created.`
  });

  return wedding.slug as string;
}

export async function updateInvitation(weddingId: string, input: InvitationFormInput, revisionNote?: string) {
  validateInvitationForm(input);
  const supabase = await getSupabaseAdmin();
  const resolvedInput = await resolveUploadedImages(supabase, input);

  const weddingUpdateData: any = {
    slug: resolvedInput.slug,
    bride_name: resolvedInput.brideName,
    groom_name: resolvedInput.groomName,
    bride_full_name: resolvedInput.brideFullName,
    groom_full_name: resolvedInput.groomFullName,
    wedding_date: resolvedInput.weddingDate,
    venue_name: resolvedInput.venueName,
    venue_address: resolvedInput.venueAddress,
    maps_url: resolvedInput.mapsUrl,
    story: resolvedInput.story,
    music_url: resolvedInput.musicUrl,
    template: resolvedInput.template,
    status: resolvedInput.status
  };

  if (resolvedInput.clientPassword && resolvedInput.clientPassword.trim() !== '') {
    const { hashPasswordSHA256 } = await import('../utils/security');
    weddingUpdateData.client_password_hash = await hashPasswordSHA256(resolvedInput.clientPassword);
  }

  const { error: weddingError } = await supabase
    .from('weddings')
    .update(weddingUpdateData)
    .eq('id', weddingId);

  if (weddingError) throw toDashboardError(weddingError, 'Failed to update wedding.');

  const { data: currentSettings, error: currentSettingsError } = await supabase
    .from('invitation_settings')
    .select('theme_config, sections')
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
      sections: buildSections((currentSettings as any)?.sections, resolvedInput),
      theme_config: buildThemeConfig((currentSettings as any)?.theme_config, resolvedInput)
    })
    .eq('wedding_id', weddingId);

  if (settingsError) throw toDashboardError(settingsError, 'Failed to update invitation settings.');
  await replaceWeddingEvents(supabase, weddingId, resolvedInput.events);
  await replaceGalleryImages(supabase, weddingId, resolvedInput.galleryImageUrls);
  await replaceGiftAccounts(supabase, weddingId, resolvedInput.gifts);

  // Capture revision snapshot & log activity (non-blocking)
  await captureRevisionSnapshot(weddingId, {
    note: revisionNote || undefined,
    createdBy: 'admin'
  });

  await logActivity({
    wedding_id: weddingId,
    slug: resolvedInput.slug,
    actor_type: 'admin',
    action: 'invitation.update',
    description: `Invitation '${resolvedInput.slug}' updated.` + (revisionNote ? ` Note: "${revisionNote}"` : '')
  });

  return resolvedInput.slug;
}

export async function softDeleteInvitation(weddingId: string) {
  const supabase = await getSupabaseAdmin();

  // Load slug for log
  const { data: wedding } = await supabase.from('weddings').select('slug').eq('id', weddingId).maybeSingle();

  const { error } = await supabase
    .from('weddings')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: 'dashboard'
    })
    .eq('id', weddingId);

  if (error) throw toDashboardError(error, 'Failed to soft delete invitation.');

  await logActivity({
    wedding_id: weddingId,
    slug: wedding?.slug || null,
    actor_type: 'admin',
    action: 'invitation.soft_delete',
    description: `Invitation '${wedding?.slug || weddingId}' moved to trash (soft deleted).`
  });
}

export async function restoreInvitation(weddingId: string) {
  const supabase = await getSupabaseAdmin();

  const { data: wedding } = await supabase.from('weddings').select('slug').eq('id', weddingId).maybeSingle();

  const { error } = await supabase
    .from('weddings')
    .update({
      deleted_at: null,
      deleted_by: null
    })
    .eq('id', weddingId);

  if (error) throw toDashboardError(error, 'Failed to restore invitation.');

  await logActivity({
    wedding_id: weddingId,
    slug: wedding?.slug || null,
    actor_type: 'admin',
    action: 'invitation.restore',
    description: `Invitation '${wedding?.slug || weddingId}' restored from trash.`
  });
}

export async function permanentlyDeleteInvitation(weddingId: string) {
  const supabase = await getSupabaseAdmin();

  const { data: wedding } = await supabase.from('weddings').select('slug').eq('id', weddingId).maybeSingle();
  const slug = wedding?.slug || weddingId;

  await deleteUnsharedStorageImages(supabase, weddingId);

  const { error } = await supabase
    .from('weddings')
    .delete()
    .eq('id', weddingId);

  if (error) throw toDashboardError(error, 'Failed to permanently delete invitation.');

  await logActivity({
    wedding_id: null,
    slug: slug,
    actor_type: 'admin',
    action: 'invitation.permanent_delete',
    description: `Invitation '${slug}' permanently deleted along with unshared storage assets.`
  });
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

  // Capture initial revision for duplicate & log activity
  await captureRevisionSnapshot(duplicatedWedding.id, {
    title: `Revision #1 (Duplicated from '${wedding.slug}')`,
    createdBy: 'admin',
    changesSummary: [`Duplicated from template '${wedding.slug}'`]
  });

  await logActivity({
    wedding_id: duplicatedWedding.id,
    slug: duplicatedWedding.slug,
    actor_type: 'admin',
    action: 'invitation.duplicate',
    description: `New invitation '${duplicatedWedding.slug}' created by duplicating '${wedding.slug}'.`
  });

  return duplicatedWedding.slug as string;
}

export async function resetInvitationViews(weddingId: string): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { data: wedding } = await supabase.from('weddings').select('slug').eq('id', weddingId).maybeSingle();
  const { error } = await supabase.from('invitation_views').delete().eq('wedding_id', weddingId);
  if (error) {
    throw toDashboardError(error, 'Failed to reset page views.');
  }

  await logActivity({
    wedding_id: weddingId,
    slug: wedding?.slug || null,
    actor_type: 'admin',
    action: 'invitation.reset_views',
    description: `Page views statistics for '${wedding?.slug || weddingId}' reset to zero.`
  });
}

export async function resetInvitationRsvps(weddingId: string): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { data: wedding } = await supabase.from('weddings').select('slug').eq('id', weddingId).maybeSingle();
  const { error } = await supabase.from('rsvps').delete().eq('wedding_id', weddingId);
  if (error) {
    throw toDashboardError(error, 'Failed to reset RSVPs.');
  }

  await logActivity({
    wedding_id: weddingId,
    slug: wedding?.slug || null,
    actor_type: 'admin',
    action: 'invitation.reset_rsvps',
    description: `All RSVP & wishes data for '${wedding?.slug || weddingId}' cleared.`
  });
}

export async function deleteRsvp(id: string): Promise<void> {
  const supabase = await getSupabaseAdmin();
  const { data: rsvp } = await supabase.from('rsvps').select('wedding_id, guest_name').eq('id', id).maybeSingle();
  const { error } = await supabase.from('rsvps').delete().eq('id', id);
  if (error) {
    throw toDashboardError(error, 'Failed to delete RSVP.');
  }

  await logActivity({
    wedding_id: rsvp?.wedding_id || null,
    actor_type: 'admin',
    action: 'rsvp.delete',
    description: `RSVP from guest '${rsvp?.guest_name || id}' deleted by admin.`
  });
}




