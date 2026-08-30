import { supabase } from '../lib/supabase';
import { getSupabaseAdmin } from '../lib/supabase-admin';
import type { LoveStoryItem } from '../types';
import { decodeHtmlEntities } from '../utils/template-helpers';
import { parseUserAgent, detectDeviceModel, parseTrafficSource } from '../utils/analytics';

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
  tentativeCount: number;
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
    accessPassword: string | null;
    videoEnabled: boolean;
    introAnimationEnabled: boolean;
    assets: {
      heroVideo?: string;
      heroImage?: string;
      brideImage?: string;
      groomImage?: string;
      logoImage?: string;
      closingImage?: string;
      eventImage?: string;
      rsvpImage?: string;
      countdownImage?: string;
      sliderImages?: string[];
      [key: string]: any;
    };

    content: {
      instagramUrl: string;
      groomInstagramUrl: string;
      brideInstagramUrl: string;
      groomFatherName: string;
      groomMotherName: string;
      groomAddress: string;
      brideFatherName: string;
      brideMotherName: string;
      brideAddress: string;
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
    id: string;
    guestName: string;
    attendanceStatus: string;
    guestCount: number;
    message: string | null;
    createdAt: string;
  }>;
  sentInvitations: Array<{
    id: string;
    guestName: string;
    phone: string | null;
    openedAt: string | null;
    lastOpenedAt: string | null;
    openCount: number;
    createdAt: string;
  }>;
  waTemplates: any;
  dailyViews: Array<{
    date: string;
    count: number;
  }>;
  analytics?: {
    deviceStats: {
      mobile: number;
      desktop: number;
      tablet: number;
      mobilePercent: number;
      desktopPercent: number;
      tabletPercent: number;
    };
    browserStats: Array<{
      browser: string;
      count: number;
      percent: number;
    }>;
    interactionStats: {
      openCover: number;
      clickMaps: number;
      clickCalendar: number;
      copyGift: number;
      playMusic?: number;
      playVideo?: number;
      clickWishes?: number;
      clickRsvp?: number;
      viewGallery?: number;
      clickCoupleInstagram: number;
      clickVendorWhatsApp: number;
      clickVendorInstagram: number;
      clickVendorSite: number;
      totalInteractions: number;
    };
    recentVisitors: Array<{
      guestName: string | null;
      deviceType: string;
      os: string;
      browser: string;
      city: string | null;
      country: string | null;
      createdAt: string;
    }>;
    allVisitors?: Array<{
      id: string;
      guestName: string | null;
      deviceType: string;
      deviceModel: string;
      os: string;
      browser: string;
      source: string;
      city: string | null;
      country: string | null;
      referrer: string | null;
      createdAt: string;
    }>;
    allEvents?: Array<{
      id: string;
      eventType: string;
      guestName: string | null;
      metadata: Record<string, any>;
      createdAt: string;
    }>;
  };
}

interface CountBucket {
  views: number;
  rsvps: number;
  attending: number;
  declined: number;
  tentative: number;
  guests: number;
  wishes: number;
  latestRsvpAt: string | null;
}

const emptyBucket = (): CountBucket => ({
  views: 0,
  rsvps: 0,
  attending: 0,
  declined: 0,
  tentative: 0,
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
    if (row.attendance_status === 'tentative') bucket.tentative += 1;
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
      tentativeCount: bucket.tentative,
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
      acc.tentative += report.tentativeCount;
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
      tentative: 0,
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

  const adminSupabase = await getSupabaseAdmin();

  const [settingsRes, domainsRes, eventsRes, galleryRes, giftsRes, rsvpsRes] = await Promise.all([
    supabase
      .from('invitation_settings')
      .select('rsvp_enabled, music_enabled, countdown_enabled, gallery_enabled, wishes_enabled, gift_enabled, view_counter_enabled, maintenance_mode, expiration_date, password_protection_enabled, access_password, sections, theme_config, wa_templates')
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
      .select('id, guest_name, attendance_status, guest_count, message, created_at')
      .eq('wedding_id', wedding.id)
      .order('created_at', { ascending: false })
  ]);

  // Resilient queries with graceful fallback for database schema safety
  let views: any[] = [];
  try {
    const enrichedViews = await adminSupabase
      .from('invitation_views')
      .select('id, guest_name, device_type, os, browser, city, country, referrer, user_agent, created_at')
      .eq('wedding_id', wedding.id)
      .order('created_at', { ascending: false });

    if (enrichedViews.error) {
      const basicViews = await adminSupabase
        .from('invitation_views')
        .select('created_at, user_agent')
        .eq('wedding_id', wedding.id)
        .order('created_at', { ascending: false });
      views = basicViews.data || [];
    } else {
      views = enrichedViews.data || [];
    }
  } catch (e) {
    views = [];
  }

  let rawGuests: any[] = [];
  try {
    const enrichedGuests = await adminSupabase
      .from('sent_invitations')
      .select('id, guest_name, phone, opened_at, last_opened_at, open_count, created_at')
      .eq('wedding_id', wedding.id)
      .order('created_at', { ascending: false });

    if (enrichedGuests.error) {
      const basicGuests = await adminSupabase
        .from('sent_invitations')
        .select('id, guest_name, phone, created_at')
        .eq('wedding_id', wedding.id)
        .order('created_at', { ascending: false });
      rawGuests = basicGuests.data || [];
    } else {
      rawGuests = enrichedGuests.data || [];
    }
  } catch (e) {
    rawGuests = [];
  }

  let trackedEvents: any[] = [];
  try {
    const { data: eventsData, error: eventsError } = await adminSupabase
      .from('invitation_events')
      .select('id, event_type, guest_name, metadata, created_at')
      .eq('wedding_id', wedding.id)
      .order('created_at', { ascending: false });
    if (!eventsError && eventsData) {
      trackedEvents = eventsData;
    }
  } catch (e) {
    trackedEvents = [];
  }

  if (settingsRes.error) throw settingsRes.error;
  if (domainsRes.error) throw domainsRes.error;
  if (eventsRes.error) throw eventsRes.error;
  if (galleryRes.error) throw galleryRes.error;
  if (giftsRes.error) throw giftsRes.error;
  if (rsvpsRes.error) throw rsvpsRes.error;

  const settings = settingsRes.data as any;
  const assets = settings?.theme_config?.assets || {};
  const content = settings?.theme_config?.content || {};
  const waTemplates = settings?.wa_templates || { "Formal": "", "Teman": "", "Keluarga": "" };
  const rsvps = (rsvpsRes.data || []) as any[];
  const sentInvitations = rawGuests.map((g) => ({
    id: g.id,
    guestName: decodeHtmlEntities(g.guest_name),
    phone: g.phone || '',
    openedAt: g.opened_at || null,
    lastOpenedAt: g.last_opened_at || null,
    openCount: Number(g.open_count || 0),
    createdAt: g.created_at
  }));
  const isExpired = Boolean(settings?.expiration_date && new Date(settings.expiration_date) < now);
  const attendingCount = rsvps.filter((item) => item.attendance_status === 'attending').length;
  const declinedCount = rsvps.filter((item) => item.attendance_status === 'declined').length;
  const tentativeCount = rsvps.filter((item) => item.attendance_status === 'tentative').length;
  const guestCount = rsvps.reduce((total, item) => total + Number(item.guest_count || 0), 0);
  const wishesCount = rsvps.filter((item) => item.message).length;
  const latestRsvpAt = rsvps[0]?.created_at || null;
  const dailyViewMap = new Map<string, number>();

  let mobileCount = 0;
  let desktopCount = 0;
  let tabletCount = 0;
  const browserMap = new Map<string, number>();

  for (const view of views) {
    const date = new Date(view.created_at).toISOString().slice(0, 10);
    dailyViewMap.set(date, (dailyViewMap.get(date) || 0) + 1);

    const parsed = parseUserAgent(view.user_agent || '');
    const dt = (view.device_type || parsed.deviceType || 'mobile').toLowerCase();
    if (dt === 'desktop') desktopCount++;
    else if (dt === 'tablet') tabletCount++;
    else mobileCount++;

    const b = (view.browser && view.browser !== 'Other' ? view.browser : null) || parsed.browser || 'Other';
    browserMap.set(b, (browserMap.get(b) || 0) + 1);
  }

  const totalViews = views.length;
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

  let openCoverCount = 0;
  let clickMapsCount = 0;
  let clickCalendarCount = 0;
  let copyGiftCount = 0;
  let playMusicCount = 0;
  let playVideoCount = 0;
  let clickWishesCount = 0;
  let clickRsvpCount = 0;
  let viewGalleryCount = 0;
  let clickCoupleInstagramCount = 0;
  let clickVendorWhatsAppCount = 0;
  let clickVendorInstagramCount = 0;
  let clickVendorSiteCount = 0;

  for (const ev of trackedEvents) {
    if (ev.event_type === 'open_cover') openCoverCount++;
    else if (ev.event_type === 'click_maps') clickMapsCount++;
    else if (ev.event_type === 'click_calendar') clickCalendarCount++;
    else if (ev.event_type === 'copy_gift') copyGiftCount++;
    else if (ev.event_type === 'play_music') playMusicCount++;
    else if (ev.event_type === 'play_video') playVideoCount++;
    else if (ev.event_type === 'click_wishes') clickWishesCount++;
    else if (ev.event_type === 'click_rsvp') clickRsvpCount++;
    else if (ev.event_type === 'view_gallery') viewGalleryCount++;
    else if (ev.event_type === 'click_couple_instagram') clickCoupleInstagramCount++;
    else if (ev.event_type === 'click_vendor_whatsapp') clickVendorWhatsAppCount++;
    else if (ev.event_type === 'click_vendor_instagram') clickVendorInstagramCount++;
    else if (ev.event_type === 'click_vendor_site') clickVendorSiteCount++;
  }

  const interactionStats = {
    openCover: openCoverCount,
    clickMaps: clickMapsCount,
    clickCalendar: clickCalendarCount,
    copyGift: copyGiftCount,
    playMusic: playMusicCount,
    playVideo: playVideoCount,
    clickWishes: clickWishesCount,
    clickRsvp: clickRsvpCount,
    viewGallery: viewGalleryCount,
    clickCoupleInstagram: clickCoupleInstagramCount,
    clickVendorWhatsApp: clickVendorWhatsAppCount,
    clickVendorInstagram: clickVendorInstagramCount,
    clickVendorSite: clickVendorSiteCount,
    totalInteractions: trackedEvents.length
  };

  const allVisitors = views.map((v) => {
    const parsed = parseUserAgent(v.user_agent || '');
    const deviceModel = detectDeviceModel(v.user_agent || '');
    const source = parseTrafficSource(v.referrer, v.user_agent);
    return {
      id: v.id || '',
      guestName: v.guest_name ? decodeHtmlEntities(v.guest_name) : null,
      deviceType: v.device_type || parsed.deviceType || 'mobile',
      deviceModel,
      os: v.os || parsed.os || 'Unknown',
      browser: (v.browser && v.browser !== 'Other' ? v.browser : null) || parsed.browser || 'Unknown',
      source,
      city: v.city || null,
      country: v.country || null,
      referrer: v.referrer || null,
      createdAt: v.created_at
    };
  });

  const recentVisitors = allVisitors.slice(0, 10).map(v => ({
    guestName: v.guestName,
    deviceType: v.deviceType,
    os: v.os,
    browser: v.browser,
    city: v.city,
    country: v.country,
    createdAt: v.createdAt
  }));

  const allEvents = trackedEvents.map((ev) => ({
    id: ev.id || '',
    eventType: ev.event_type,
    guestName: ev.guest_name ? decodeHtmlEntities(ev.guest_name) : null,
    metadata: ev.metadata || {},
    createdAt: ev.created_at
  }));

  const analytics = {
    deviceStats,
    browserStats,
    interactionStats,
    recentVisitors,
    allVisitors,
    allEvents
  };

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
    tentativeCount,
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
      videoEnabled: settings.sections?.video !== false,
      introAnimationEnabled: settings.sections?.introAnimation !== false,
      expirationDate: settings.expiration_date,
      passwordProtectionEnabled: Boolean(settings.password_protection_enabled),
      accessPassword: settings.access_password || '',
      assets: {
        heroVideo: assets.heroVideo || '',
        heroImage: assets.coverImage || assets.heroImage || '',
        ogImage: assets.ogImage || '',
        brideImage: assets.brideImage || '',
        groomImage: assets.groomImage || '',
        logoImage: assets.logoImage || '',
        closingImage: assets.closingImage || '',
        eventImage: assets.eventImage || '',
        rsvpImage: assets.rsvpImage || '',
        countdownImage: assets.countdownImage || '',
        sliderImages: Array.isArray(assets.sliderImages) ? assets.sliderImages : []
      },
      content: {
        instagramUrl: content.instagramUrl || '',
        groomInstagramUrl: content.groomInstagramUrl || '',
        brideInstagramUrl: content.brideInstagramUrl || '',
        groomFatherName: content.groomFatherName || '',
        groomMotherName: content.groomMotherName || '',
        groomChildNumber: content.groomChildNumber || '',
        groomAddress: content.groomAddress || '',
        brideFatherName: content.brideFatherName || '',
        brideMotherName: content.brideMotherName || '',
        brideChildNumber: content.brideChildNumber || '',
        brideAddress: content.brideAddress || '',
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
      id: rsvp.id,
      guestName: decodeHtmlEntities(rsvp.guest_name),
      attendanceStatus: rsvp.attendance_status,
      guestCount: Number(rsvp.guest_count || 0),
      message: decodeHtmlEntities(rsvp.message),
      createdAt: rsvp.created_at
    })),
    sentInvitations,
    waTemplates,
    dailyViews,
    analytics
  };
}
