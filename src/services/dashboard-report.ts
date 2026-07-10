import { supabase } from '../lib/supabase';
import type { LoveStoryItem } from '../types';

export interface SlugReport {
  weddingId: string;
  slug: string;
  coupleName: string;
  weddingDate: string;
  status: string;
  template: string;
  customDomain: string | null;
  isMaintenance: boolean;
  isExpired: boolean;
  passwordProtected: boolean;
  viewCount: number;
  rsvpCount: number;
  attendingCount: number;
  declinedCount: number;
  guestCount: number;
  wishesCount: number;
  latestRsvpAt: string | null;
  createdAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface DashboardReport {
  generatedAt: string;
  totals: {
    invitations: number;
    published: number;
    archived: number;
    draft: number;
    views: number;
    rsvps: number;
    attending: number;
    declined: number;
    guests: number;
    wishes: number;
    deleted: number;
  };
  reports: SlugReport[];
  deletedReports: SlugReport[];
}

export interface SlugReportDetail {
  generatedAt: string;
  summary: SlugReport;
  wedding: {
    id: string;
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
    story: LoveStoryItem[];
    template: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  settings: {
    rsvpEnabled: boolean;
    musicEnabled: boolean;
    countdownEnabled: boolean;
    galleryEnabled: boolean;
    wishesEnabled: boolean;
    giftEnabled: boolean;
    storyEnabled: boolean;
    viewCounterEnabled: boolean;
    maintenanceMode: boolean;
    expirationDate: string | null;
    passwordProtectionEnabled: boolean;
    assets: {
      heroVideo: string;
      heroImage: string;
      brideImage: string;
      groomImage: string;
      logoImage: string;
    };
    content: {
      instagramUrl: string;
      groomInstagramUrl: string;
      brideInstagramUrl: string;
      groomFatherName: string;
      groomMotherName: string;
      brideFatherName: string;
      brideMotherName: string;
      giftDescription: string;
      thankYouMessage: string;
      introVerse: string;
      introVerseSource: string;
    };
  } | null;
  galleryImages: Array<{
    imageUrl: string;
    sortOrder: number;
  }>;
  events: Array<{
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    venueName: string;
    venueAddress: string;
    mapsUrl: string;
  }>;
  gifts: Array<{
    bankName: string;
    accountNumber: string;
    accountName: string;
    hasQris: boolean;
    qrisUrl: string;
  }>;
  rsvps: Array<{
    guestName: string;
    attendanceStatus: string;
    guestCount: number;
    message: string | null;
    createdAt: string;
  }>;
  dailyViews: Array<{
    date: string;
    count: number;
  }>;
}

interface CountBucket {
  views: number;
  rsvps: number;
  attending: number;
  declined: number;
  guests: number;
  wishes: number;
  latestRsvpAt: string | null;
}

const emptyBucket = (): CountBucket => ({
  views: 0,
  rsvps: 0,
  attending: 0,
  declined: 0,
  guests: 0,
  wishes: 0,
  latestRsvpAt: null
});

export async function getDashboardReport(now = new Date()): Promise<DashboardReport> {
  const [weddingsRes, settingsRes, domainsRes, viewsRes, rsvpsRes] = await Promise.all([
    supabase
      .from('weddings')
      .select('id, slug, bride_name, groom_name, wedding_date, template, status, deleted_at, deleted_by, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('invitation_settings')
      .select('wedding_id, maintenance_mode, expiration_date, password_protection_enabled'),
    supabase
      .from('custom_domains')
      .select('wedding_id, domain, status')
      .eq('status', 'active'),
    supabase
      .from('invitation_views')
      .select('wedding_id'),
    supabase
      .from('rsvps')
      .select('wedding_id, attendance_status, guest_count, message, created_at')
      .order('created_at', { ascending: false })
  ]);

  if (weddingsRes.error) throw weddingsRes.error;
  if (settingsRes.error) throw settingsRes.error;
  if (domainsRes.error) throw domainsRes.error;
  if (viewsRes.error) throw viewsRes.error;
  if (rsvpsRes.error) throw rsvpsRes.error;

  const settingsByWedding = new Map(
    (settingsRes.data || []).map((settings: any) => [settings.wedding_id, settings])
  );
  const domainByWedding = new Map(
    (domainsRes.data || []).map((domain: any) => [domain.wedding_id, domain.domain])
  );
  const bucketByWedding = new Map<string, CountBucket>();

  const bucketFor = (weddingId: string) => {
    const current = bucketByWedding.get(weddingId);
    if (current) return current;

    const next = emptyBucket();
    bucketByWedding.set(weddingId, next);
    return next;
  };

  for (const view of viewsRes.data || []) {
    bucketFor((view as any).wedding_id).views += 1;
  }

  for (const rsvp of rsvpsRes.data || []) {
    const row = rsvp as any;
    const bucket = bucketFor(row.wedding_id);
    const guestCount = Number(row.guest_count || 0);

    bucket.rsvps += 1;
    bucket.guests += Number.isFinite(guestCount) ? guestCount : 0;
    if (row.attendance_status === 'attending') bucket.attending += 1;
    if (row.attendance_status === 'declined') bucket.declined += 1;
    if (row.message) bucket.wishes += 1;
    if (!bucket.latestRsvpAt || new Date(row.created_at) > new Date(bucket.latestRsvpAt)) {
      bucket.latestRsvpAt = row.created_at;
    }
  }

  const reports = (weddingsRes.data || []).map((wedding: any) => {
    const settings = settingsByWedding.get(wedding.id) as any;
    const bucket = bucketByWedding.get(wedding.id) || emptyBucket();
    const isExpired = Boolean(settings?.expiration_date && new Date(settings.expiration_date) < now);

    return {
      weddingId: wedding.id,
      slug: wedding.slug,
      coupleName: `${wedding.groom_name} & ${wedding.bride_name}`,
      weddingDate: wedding.wedding_date,
      status: wedding.status,
      template: wedding.template,
      customDomain: domainByWedding.get(wedding.id) || null,
      isMaintenance: Boolean(settings?.maintenance_mode),
      isExpired,
      passwordProtected: Boolean(settings?.password_protection_enabled),
      viewCount: bucket.views,
      rsvpCount: bucket.rsvps,
      attendingCount: bucket.attending,
      declinedCount: bucket.declined,
      guestCount: bucket.guests,
      wishesCount: bucket.wishes,
      latestRsvpAt: bucket.latestRsvpAt,
      createdAt: wedding.created_at,
      deletedAt: wedding.deleted_at,
      deletedBy: wedding.deleted_by
    };
  });

  const activeReports = reports.filter((report) => !report.deletedAt);
  const deletedReports = reports.filter((report) => report.deletedAt);

  const totals = activeReports.reduce(
    (acc, report) => {
      acc.invitations += 1;
      if (report.status === 'published') acc.published += 1;
      if (report.status === 'archived') acc.archived += 1;
      if (report.status === 'draft') acc.draft += 1;
      acc.views += report.viewCount;
      acc.rsvps += report.rsvpCount;
      acc.attending += report.attendingCount;
      acc.declined += report.declinedCount;
      acc.guests += report.guestCount;
      acc.wishes += report.wishesCount;
      return acc;
    },
    {
      invitations: 0,
      published: 0,
      archived: 0,
      draft: 0,
      views: 0,
      rsvps: 0,
      attending: 0,
      declined: 0,
      guests: 0,
      wishes: 0,
      deleted: deletedReports.length
    }
  );

  return {
    generatedAt: now.toISOString(),
    totals,
    reports: activeReports,
    deletedReports
  };
}

export async function getSlugReportDetail(slug: string, now = new Date()): Promise<SlugReportDetail | null> {
  const { data: wedding, error: weddingError } = await supabase
    .from('weddings')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (weddingError) throw weddingError;
  if (!wedding) return null;

  const [settingsRes, domainsRes, eventsRes, galleryRes, giftsRes, rsvpsRes, viewsRes] = await Promise.all([
    supabase
      .from('invitation_settings')
      .select('rsvp_enabled, music_enabled, countdown_enabled, gallery_enabled, wishes_enabled, gift_enabled, view_counter_enabled, maintenance_mode, expiration_date, password_protection_enabled, sections, theme_config')
      .eq('wedding_id', wedding.id)
      .maybeSingle(),
    supabase
      .from('custom_domains')
      .select('domain, status')
      .eq('wedding_id', wedding.id)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('wedding_events')
      .select('event_name, event_date, start_time, end_time, venue_name, venue_address, maps_url')
      .eq('wedding_id', wedding.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('gallery_images')
      .select('image_url, sort_order')
      .eq('wedding_id', wedding.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('gift_accounts')
      .select('bank_name, account_number, account_name, qris_url')
      .eq('wedding_id', wedding.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('rsvps')
      .select('guest_name, attendance_status, guest_count, message, created_at')
      .eq('wedding_id', wedding.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('invitation_views')
      .select('created_at')
      .eq('wedding_id', wedding.id)
      .order('created_at', { ascending: false })
  ]);

  if (settingsRes.error) throw settingsRes.error;
  if (domainsRes.error) throw domainsRes.error;
  if (eventsRes.error) throw eventsRes.error;
  if (galleryRes.error) throw galleryRes.error;
  if (giftsRes.error) throw giftsRes.error;
  if (rsvpsRes.error) throw rsvpsRes.error;
  if (viewsRes.error) throw viewsRes.error;

  const settings = settingsRes.data as any;
  const assets = settings?.theme_config?.assets || {};
  const content = settings?.theme_config?.content || {};
  const rsvps = (rsvpsRes.data || []) as any[];
  const views = (viewsRes.data || []) as any[];
  const isExpired = Boolean(settings?.expiration_date && new Date(settings.expiration_date) < now);
  const attendingCount = rsvps.filter((item) => item.attendance_status === 'attending').length;
  const declinedCount = rsvps.filter((item) => item.attendance_status === 'declined').length;
  const guestCount = rsvps.reduce((total, item) => total + Number(item.guest_count || 0), 0);
  const wishesCount = rsvps.filter((item) => item.message).length;
  const latestRsvpAt = rsvps[0]?.created_at || null;
  const dailyViewMap = new Map<string, number>();

  for (const view of views) {
    const date = new Date(view.created_at).toISOString().slice(0, 10);
    dailyViewMap.set(date, (dailyViewMap.get(date) || 0) + 1);
  }

  const dailyViews = Array.from(dailyViewMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const summary: SlugReport = {
    weddingId: wedding.id,
    slug: wedding.slug,
    coupleName: `${wedding.groom_name} & ${wedding.bride_name}`,
    weddingDate: wedding.wedding_date,
    status: wedding.status,
    template: wedding.template,
    customDomain: (domainsRes.data as any)?.domain || null,
    isMaintenance: Boolean(settings?.maintenance_mode),
    isExpired,
    passwordProtected: Boolean(settings?.password_protection_enabled),
    viewCount: views.length,
    rsvpCount: rsvps.length,
    attendingCount,
    declinedCount,
    guestCount,
    wishesCount,
    latestRsvpAt,
    createdAt: wedding.created_at,
    deletedAt: wedding.deleted_at,
    deletedBy: wedding.deleted_by
  };

  return {
    generatedAt: now.toISOString(),
    summary,
    wedding: {
      id: wedding.id,
      slug: wedding.slug,
      brideName: wedding.bride_name,
      groomName: wedding.groom_name,
      brideFullName: wedding.bride_full_name,
      groomFullName: wedding.groom_full_name,
      weddingDate: wedding.wedding_date,
      venueName: wedding.venue_name,
      venueAddress: wedding.venue_address,
      mapsUrl: wedding.maps_url,
      musicUrl: wedding.music_url,
      story: Array.isArray(wedding.story) ? wedding.story : [],
      template: wedding.template,
      status: wedding.status,
      createdAt: wedding.created_at,
      updatedAt: wedding.updated_at
    },
    settings: settings ? {
      rsvpEnabled: Boolean(settings.rsvp_enabled),
      musicEnabled: Boolean(settings.music_enabled),
      countdownEnabled: Boolean(settings.countdown_enabled),
      galleryEnabled: Boolean(settings.gallery_enabled),
      wishesEnabled: Boolean(settings.wishes_enabled),
      giftEnabled: Boolean(settings.gift_enabled),
      storyEnabled: settings.sections?.story !== false,
      viewCounterEnabled: Boolean(settings.view_counter_enabled),
      maintenanceMode: Boolean(settings.maintenance_mode),
      expirationDate: settings.expiration_date,
      passwordProtectionEnabled: Boolean(settings.password_protection_enabled),
      assets: {
        heroVideo: assets.heroVideo || '',
        heroImage: assets.coverImage || assets.heroImage || '',
        brideImage: assets.brideImage || '',
        groomImage: assets.groomImage || '',
        logoImage: assets.logoImage || ''
      },
      content: {
        instagramUrl: content.instagramUrl || '',
        groomInstagramUrl: content.groomInstagramUrl || '',
        brideInstagramUrl: content.brideInstagramUrl || '',
        groomFatherName: content.groomFatherName || '',
        groomMotherName: content.groomMotherName || '',
        brideFatherName: content.brideFatherName || '',
        brideMotherName: content.brideMotherName || '',
        giftDescription: content.giftDescription || '',
        thankYouMessage: content.closingMessage || '',
        introVerse: content.verse || '',
        introVerseSource: content.verseSource || ''
      }
    } : null,
    galleryImages: ((galleryRes.data || []) as any[]).map((image) => ({
      imageUrl: image.image_url,
      sortOrder: Number(image.sort_order || 0)
    })),
    events: ((eventsRes.data || []) as any[]).map((event) => ({
      name: event.event_name,
      date: event.event_date,
      startTime: event.start_time,
      endTime: event.end_time,
      venueName: event.venue_name,
      venueAddress: event.venue_address,
      mapsUrl: event.maps_url
    })),
    gifts: ((giftsRes.data || []) as any[]).map((gift) => ({
      bankName: gift.bank_name,
      accountNumber: gift.account_number,
      accountName: gift.account_name,
      hasQris: Boolean(gift.qris_url),
      qrisUrl: gift.qris_url || ''
    })),
    rsvps: rsvps.map((rsvp) => ({
      guestName: rsvp.guest_name,
      attendanceStatus: rsvp.attendance_status,
      guestCount: Number(rsvp.guest_count || 0),
      message: rsvp.message,
      createdAt: rsvp.created_at
    })),
    dailyViews
  };
}
