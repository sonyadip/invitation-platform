import type { FullInvitationData, GiftAccount, LoveStoryItem, RSVP, WeddingEvent } from '../types';
import { COMMON_ASSETS } from '../utils/cdn';

const DEFAULT_WEDDING_STORY: LoveStoryItem[] = [
  {
    year: '2020',
    title: 'Pertama Bertemu',
    description:
      'Semua berawal dari pertemuan sederhana yang tak pernah direncanakan. Dari sapaan singkat yang terasa biasa, perlahan tumbuh rasa nyaman yang sulit dijelaskan.'
  },
  {
    year: '2023',
    title: 'Menjalin Hubungan',
    description:
      'Hari demi hari, kami belajar mengenal satu sama lain, tentang mimpi, kebiasaan kecil, dan cara kami saling melengkapi.'
  },
  {
    year: '2026',
    title: 'Hari Pernikahan',
    description:
      'Kini, perjalanan itu membawa kami pada langkah baru yang lebih berarti. Dengan hati yang penuh syukur, kami siap menapaki babak berikutnya.'
  }
];

const DEFAULT_METATAH_STORY: LoveStoryItem[] = [
  {
    year: 'Makna',
    title: 'Upacara Mepandes / Metatah',
    description:
      'Upacara Manusa Yadnya dalam tradisi Hindu Bali untuk menyucikan diri dan mengendalikan Sad Ripu (enam musuh dalam diri manusia).'
  },
  {
    year: 'Doa',
    title: 'Penyucian Diri Menuju Kedewasaan',
    description:
      'Sebagai simbol peralihan menuju kedewasaan, memohon keselamatan, ketenangan batin, serta keharmonisan lahir dan batin kepada Ida Sang Hyang Widhi Wasa.'
  }
];

const MOCK_WISH_AUTHORS = [
  'Sahabat',
  'Budi Santoso',
  'Siti Rahma',
  'Dimas Anggara',
  'Rina Wulandari',
  'Andi Pratama',
  'Maya Putri',
  'Eko Prasetyo',
  'Dewi Lestari',
  'Fajar Ramadhan'
];

const WEDDING_MOCK_MESSAGES = [
  'Selamat menempuh hidup baru, semoga bahagia selalu!',
  'Selamat ya! Semoga lancar sampai hari H dan langgeng selamanya.',
  'Doa terbaik untuk kedua mempelai',
  'Selamat berbahagia! Semoga cinta kasih senantiasa menyertai perjalanan hidup kalian.'
];

const METATAH_MOCK_MESSAGES = [
  'Selamat melaksanakan upacara Metatah / Potong Gigi. Semoga senantiasa diberkahi kerahayuan dan kedamaian.',
  'Rahajeng nyanggra Upacara Metatah. Dumogi rahayu sareng sami lan mamargi antar.',
  'Selamat dan sukses atas upacara Metatah putra-putri tercinta. Semoga menjadi pribadi yang berbudi luhur.',
  'Dumogi asung kertha wara nugraha Ida Sang Hyang Widhi Wasa menyertai seluruh rangkaian upacara.'
];

const DEFAULT_INSTAGRAM_URL = 'https://www.instagram.com/senadda.id';
const DEFAULT_INSTAGRAM_HANDLE = 'senadda.id';
const DEFAULT_GIFT_DESCRIPTION =
  'Tanpa mengurangi rasa hormat, bagi tamu yang ingin mengirimkan hadiah kasih dapat melalui rekening berikut.';

export function isNonLiveInvitationId(weddingId?: string | null): boolean {
  return Boolean(weddingId && (weddingId.startsWith('preview-') || weddingId.startsWith('ads-')));
}

export function getFuturePreviewWeddingDate(daysAhead = 30): string {
  const target = new Date(Date.now() + daysAhead * 86_400_000);
  const datePart = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(target);

  return `${datePart}T08:00:00+08:00`;
}

export function buildMockWishes(weddingId: string, isMetatah: boolean, count = 40): RSVP[] {
  const messages = isMetatah ? METATAH_MOCK_MESSAGES : WEDDING_MOCK_MESSAGES;

  return Array.from({ length: count }, (_, i) => ({
    id: `wish-${i + 1}`,
    wedding_id: weddingId,
    guest_name: `${MOCK_WISH_AUTHORS[i % MOCK_WISH_AUTHORS.length]} #${i + 1}`,
    attendance_status: (i % 3 === 0 ? 'attending' : i % 3 === 1 ? 'tentative' : 'declined') as any,
    guest_count: (i % 3) + 1,
    message: messages[i % messages.length],
    created_at: new Date(Date.now() - i * 3600000).toISOString()
  }));
}

export function buildMockGift(
  weddingId: string,
  accountName: string,
  createdAt = new Date().toISOString()
): GiftAccount {
  return {
    id: 'gift-1',
    wedding_id: weddingId,
    bank_name: 'BCA',
    account_number: '0123 456 789',
    account_name: accountName || 'Nama Mempelai',
    qris_url: null,
    sort_order: 1,
    created_at: createdAt
  };
}

function sanitizeParticipantItem(item: unknown): unknown {
  if (!item || typeof item !== 'object') {
    return item;
  }

  const copy: Record<string, any> = { ...(item as Record<string, any>) };

  if (copy.fatherName) copy.fatherName = 'I Wayan Sudarma';
  if (copy.motherName) copy.motherName = 'Ni Made Sukerti';
  if (copy.parentsText) copy.parentsText = 'I Wayan Sudarma & Ni Made Sukerti';
  if (Array.isArray(copy.parents) && copy.parents.length > 0) {
    copy.parents = ['I Wayan Sudarma & Ni Made Sukerti'];
  } else if (typeof copy.parents === 'string' && copy.parents.trim()) {
    copy.parents = 'I Wayan Sudarma & Ni Made Sukerti';
  }
  if (copy.address) copy.address = 'Denpasar, Bali';
  if (copy.city) copy.city = 'Denpasar';
  if (copy.origin) copy.origin = 'Denpasar, Bali';
  if (copy.instagram) copy.instagram = DEFAULT_INSTAGRAM_HANDLE;
  if (copy.instagramUrl) copy.instagramUrl = DEFAULT_INSTAGRAM_URL;
  if (copy.ig) copy.ig = DEFAULT_INSTAGRAM_HANDLE;

  return copy;
}

export function buildSanitizedThemeContent(
  rawContent: Record<string, any> | undefined,
  isMetatah: boolean,
  options?: {
    clearGiftDescription?: boolean;
    galleryVideoUrls?: string[];
  }
): Record<string, any> {
  const base = rawContent || {};
  const sanitized: Record<string, any> = {
    ...base,
    groomFatherName: isMetatah ? 'I Wayan Sudarma' : 'Bapak Mempelai',
    groomMotherName: isMetatah ? 'Ni Made Sukerti' : 'Ibu Mempelai',
    groomParents: isMetatah ? 'I Wayan Sudarma & Ni Made Sukerti' : 'Putra dari Bapak Mempelai & Ibu Mempelai',
    brideFatherName: isMetatah ? 'I Wayan Sudarma' : 'Bapak Mempelai',
    brideMotherName: isMetatah ? 'Ni Made Sukerti' : 'Ibu Mempelai',
    brideParents: isMetatah ? 'I Wayan Sudarma & Ni Made Sukerti' : 'Putri dari Bapak Mempelai & Ibu Mempelai',
    groomAddress: 'Denpasar, Bali',
    brideAddress: 'Gianyar, Bali',
    groomCity: 'Denpasar',
    brideCity: 'Gianyar',
    groomOrigin: 'Denpasar, Bali',
    brideOrigin: 'Gianyar, Bali',
    participantAddress: 'Denpasar, Bali',
    familyAddress: 'Gianyar, Bali',
    instagramUrl: DEFAULT_INSTAGRAM_URL,
    groomInstagramUrl: DEFAULT_INSTAGRAM_URL,
    brideInstagramUrl: DEFAULT_INSTAGRAM_URL,
    groomIg: DEFAULT_INSTAGRAM_HANDLE,
    brideIg: DEFAULT_INSTAGRAM_HANDLE,
    participantInstagramUrl: DEFAULT_INSTAGRAM_URL,
    participantIg: DEFAULT_INSTAGRAM_HANDLE,
    whatsappUrl: undefined,
    metaTitle: undefined,
    metaDescription: undefined
  };

  if (isMetatah) {
    sanitized.fatherName = 'I Wayan Sudarma';
    sanitized.motherName = 'Ni Made Sukerti';
    sanitized.participantFatherName = 'I Wayan Sudarma';
    sanitized.participantMotherName = 'Ni Made Sukerti';
    sanitized.participantParents = 'I Wayan Sudarma & Ni Made Sukerti';
    sanitized.familyInviting = 'I Wayan Sudarma & Ni Made Sukerti';
    sanitized.parentsName = 'I Wayan Sudarma & Ni Made Sukerti';
    sanitized.familyNames = 'I Wayan Sudarma & Ni Made Sukerti';
  }

  if (Array.isArray(base.participants)) {
    sanitized.participants = base.participants.map(sanitizeParticipantItem);
  }
  if (Array.isArray(base.potongGigiMembers)) {
    sanitized.potongGigiMembers = base.potongGigiMembers.map(sanitizeParticipantItem);
  }
  if (Array.isArray(base.members)) {
    sanitized.members = base.members.map(sanitizeParticipantItem);
  }

  if (options?.clearGiftDescription) {
    sanitized.giftDescription = DEFAULT_GIFT_DESCRIPTION;
  }

  if (options?.galleryVideoUrls !== undefined) {
    sanitized.galleryVideoUrls = options.galleryVideoUrls;
  }

  return sanitized;
}

/**
 * Masks sensitive client invitation details (parents, addresses, venues, maps,
 * social links, bank gifts, and guest wishes) for admin ads content capture
 * while preserving the couple's full names, photos, and template layout.
 */
export function sanitizeInvitationForAds(clientData: FullInvitationData): FullInvitationData {
  const templateKey = (clientData.wedding.template || 'noir').trim().toLowerCase();
  const isMetatah = templateKey.includes('metatah');
  // Use `ads-` instead of `preview-` so templates do not inject stock preview photos/videos when absent.
  const adsWeddingId = isMetatah
    ? `ads-metatah-${clientData.wedding.slug}`
    : `ads-${clientData.wedding.slug}`;
  const now = new Date().toISOString();

  const venueName = 'The Royal Garden';
  const venueAddress = 'Jl. Pantai Indah No. 8, Bali';
  const mapsUrl = 'https://maps.google.com';

  const rawStory = Array.isArray(clientData.wedding.story)
    ? clientData.wedding.story.filter((item) => item && (item.title?.trim() || item.description?.trim()))
    : [];
  const hasMeaningfulStory = isMetatah
    ? rawStory.length > 0 && rawStory[0]?.title !== 'Pertama Bertemu'
    : rawStory.length > 0;
  const hasClientStory = clientData.settings.sections?.story !== false && hasMeaningfulStory;
  const story: LoveStoryItem[] = hasClientStory
    ? (isMetatah ? DEFAULT_METATAH_STORY : DEFAULT_WEDDING_STORY).map((item) => ({ ...item }))
    : [];

  const rawAssets = clientData.settings.theme_config?.assets || {};
  const rawContent = clientData.settings.theme_config?.content || {};
  const videoSectionEnabled = clientData.settings.sections?.video !== false;
  const hasHeroVideo = Boolean(typeof rawAssets.heroVideo === 'string' && rawAssets.heroVideo.trim());
  const hasVideoUrl = Boolean(typeof rawAssets.videoUrl === 'string' && rawAssets.videoUrl.trim());
  const hasGalleryVideos =
    Array.isArray(rawContent.galleryVideoUrls) &&
    rawContent.galleryVideoUrls.some((url: unknown) => typeof url === 'string' && url.trim() !== '');
  const hasClientVideo = videoSectionEnabled && (hasHeroVideo || hasVideoUrl || hasGalleryVideos);

  const {
    groom_instagram: _groomIg,
    bride_instagram: _brideIg,
    client_password_hash: _clientPasswordHash,
    ...safeWeddingRest
  } = clientData.wedding as any;

  const wedding = {
    ...safeWeddingRest,
    id: adsWeddingId,
    venue_name: venueName,
    venue_address: venueAddress,
    maps_url: mapsUrl,
    story,
    status: 'published' as const
  };

  const settings = {
    ...clientData.settings,
    id: `ads-settings-${clientData.wedding.slug}`,
    wedding_id: adsWeddingId,
    view_counter_enabled: false,
    maintenance_mode: false,
    expiration_date: null,
    password_protection_enabled: false,
    access_password: null,
    sections: {
      ...clientData.settings.sections,
      story: hasClientStory,
      video: hasClientVideo,
      livestream: false
    },
    theme_config: {
      ...clientData.settings.theme_config,
      assets: {
        ...rawAssets,
        heroVideo: hasHeroVideo ? COMMON_ASSETS.PREVIEW_VIDEO : undefined,
        videoUrl: videoSectionEnabled && hasVideoUrl ? COMMON_ASSETS.PREVIEW_VIDEO : undefined
      },
      content: buildSanitizedThemeContent(rawContent, isMetatah, {
        clearGiftDescription: true,
        galleryVideoUrls: videoSectionEnabled && hasGalleryVideos ? [COMMON_ASSETS.PREVIEW_VIDEO] : []
      })
    }
  };

  const events: WeddingEvent[] =
    clientData.events && clientData.events.length > 0
      ? clientData.events.map((evt) => ({
          ...evt,
          wedding_id: adsWeddingId,
          venue_name: venueName,
          venue_address: venueAddress,
          maps_url: mapsUrl
        }))
      : [
          {
            id: 'event-1',
            wedding_id: adsWeddingId,
            event_name: isMetatah ? 'Metatah' : 'Akad Nikah',
            event_date: clientData.wedding.wedding_date,
            start_time: '09:00',
            end_time: '11:00',
            venue_name: venueName,
            venue_address: venueAddress,
            maps_url: mapsUrl,
            sort_order: 1,
            created_at: now
          }
        ];

  const gallery = (clientData.gallery || []).map((item) => ({
    ...item,
    wedding_id: adsWeddingId
  }));

  const gifts = [
    buildMockGift(
      adsWeddingId,
      wedding.groom_full_name || wedding.groom_name || 'Nama Mempelai',
      now
    )
  ];

  const wishes = buildMockWishes(adsWeddingId, isMetatah);

  return {
    wedding,
    settings,
    events,
    gallery,
    gifts,
    wishes
  };
}
