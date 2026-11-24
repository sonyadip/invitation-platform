import type { Wedding, WeddingEvent, InvitationSettings } from '../types';

export const buildParentText = (
  roleText: string,
  fatherName: string | undefined | null,
  motherName: string | undefined | null,
  fallbackText: string
): string => {
  const parents = [
    fatherName ? `Bapak ${fatherName}` : '',
    motherName ? `Ibu ${motherName}` : ''
  ].filter(Boolean).join(' & ');

  return parents ? `${roleText} ${parents}` : fallbackText;
};

export const formatChildPrefix = (
  childNumber: string | number | undefined | null,
  defaultRole: 'Putra' | 'Putri' | string,
  customPrefix?: string | null,
  fallback?: string
): string => {
  if (childNumber !== undefined && childNumber !== null && String(childNumber).trim() !== '') {
    let formatted = String(childNumber).trim();
    if (!new RegExp(`^${defaultRole}`, 'i').test(formatted)) {
      formatted = `${defaultRole} ${/^[0-9]+$/.test(formatted) ? 'ke-' + formatted : formatted}`;
    }
    if (!/dari$/i.test(formatted)) {
      formatted = `${formatted} dari`;
    }
    return formatted;
  }
  return customPrefix || fallback || `${defaultRole} dari`;
};

export const buildCoupleLines = (
  prefix: string,
  fatherName: string | undefined | null,
  motherName: string | undefined | null,
  fallbackParents: string | undefined | null,
  address: string | undefined | null
): string[] => {
  const lines: string[] = [];
  if (prefix) lines.push(prefix);

  const cleanParent = (val?: string | null, defaultHonorific?: 'Bapak' | 'Ibu') => {
    if (!val || typeof val !== 'string') return '';
    const trimmed = val.trim();
    if (/^Bapak\s+Mempelai$/i.test(trimmed)) return 'Bapak Mempelai';
    if (/^Ibu\s+Mempelai$/i.test(trimmed)) return 'Ibu Mempelai';
    if (/^Mempelai$/i.test(trimmed)) {
      return defaultHonorific ? `${defaultHonorific} Mempelai` : trimmed;
    }
    return trimmed.replace(/^(?:Bapak|Ibu)\s+/i, '');
  };

  const father = cleanParent(fatherName, 'Bapak');
  const mother = cleanParent(motherName, 'Ibu');

  if (father || mother) {
    if (father) lines.push(father);
    if (mother) lines.push(mother);
  } else if (fallbackParents) {
    const cleaned = fallbackParents
      .replace(/^(Putra dari|Putri dari|Putra|Putri)\s+/i, '')
      .replace(/^dari\s+/i, '');
    const parts = cleaned.split(/\s+(?:&|dan)\s+/i).map((p, idx) => cleanParent(p, idx === 0 ? 'Bapak' : 'Ibu')).filter(Boolean);
    if (parts.length > 0) {
      parts.forEach((p) => lines.push(p));
    } else {
      lines.push(cleanParent(cleaned, 'Bapak') || fallbackParents);
    }
  }

  if (address) lines.push(address);
  return lines;
};

export const formatDate = (iso: string): string => new Date(iso).toLocaleDateString('id-ID', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'Asia/Makassar'
});

export const formatEventDate = (iso: string) => {
  const date = new Date(iso);
  return {
    weekday: date.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Makassar' }),
    date: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' })
  };
};

export const padDatePart = (value: number): string => String(value).padStart(2, '0');

export const buildCalendarDate = (dateInput: string, timeInput?: string): string => {
  const date = new Date(dateInput);
  const [hour = '09', minute = '00'] = timeInput && /^\d{1,2}:\d{2}$/.test(timeInput)
    ? timeInput.split(':')
    : ['09', '00'];

  date.setHours(Number(hour), Number(minute), 0, 0);

  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
    'T',
    padDatePart(date.getHours()),
    padDatePart(date.getMinutes()),
    '00'
  ].join('');
};

export const buildGoogleCalendarUrl = (wedding: Wedding, event: WeddingEvent): string => {
  if (!event || !wedding) return '#';
  const startTime = /^\d{1,2}:\d{2}$/.test(event.start_time) ? event.start_time : '09:00';
  const endTime = /^\d{1,2}:\d{2}$/.test(event.end_time) ? event.end_time : '11:00';
  const location = [event.venue_name, event.venue_address].filter(Boolean).join(', ');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Wedding of ${wedding.groom_name} & ${wedding.bride_name}`,
    dates: `${buildCalendarDate(event.event_date, startTime)}/${buildCalendarDate(event.event_date, endTime)}`,
    details: `Wedding invitation for ${wedding.groom_name} and ${wedding.bride_name}.`,
    location,
    ctz: 'Asia/Makassar'
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export const formatWishDate = (isoStr: string): string => new Date(isoStr).toLocaleDateString('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Makassar'
});

export const getCompactDate = (iso: string): string => new Date(iso)
  .toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  .replace(/\//g, " . ");

export const getYouTubeId = (url: string | undefined | null): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const getInstagramUsername = (url: string | undefined | null): string => {
  if (!url || url === '#') return 'Instagram';
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      const username = pathSegments[0];
      return username.startsWith('@') ? username.slice(1) : username;
    }
    return 'Instagram';
  } catch (e) {
    const rawName = url.split('/').filter(Boolean).pop() || '';
    if (!rawName) return 'Instagram';
    return rawName.startsWith('@') ? rawName.slice(1) : rawName;
  }
};

export const generatePaginationItems = (currentPage: number, totalPages: number): (number | string)[] => {
  if (totalPages <= 1) return [1];
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, '...', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, '...', totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
};

export const decodeHtmlEntities = (str: string | undefined | null): string => {
  if (!str) return '';
  let decoded = String(str);
  for (let i = 0; i < 2; i++) {
    const next = decoded
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&#x2F;/g, '/');
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
};

/**
 * Detects vector logo URL for Indonesian banks, digital banks, e-wallets, and payment channels.
 * Returns customLogo if explicitly provided, or auto-detects from bankName.
 */
export const getBankLogoUrl = (bankName?: string | null, customLogo?: string | null): string | null => {
  if (customLogo) return customLogo;
  if (!bankName) return null;

  const s = bankName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!s) return null;

  // Check compound brand names before short acronyms (e.g., "btnsyariah" before "btn").
  if (s.includes('btnsyariah') || (s.includes('btn') && s.includes('syariah'))) return '/images/banks/btn_syariah.svg';
  if (s.includes('blu') || s.includes('bcadigital')) return '/images/banks/blu.svg';
  if (s.includes('jenius')) return '/images/banks/jenius.svg';
  if (s.includes('raya') || s.includes('briagro')) return '/images/banks/raya.svg';
  if (s.includes('cimb')) return '/images/banks/cimb_niaga.svg';
  if (s.includes('danamon')) return '/images/banks/danamon.svg';
  if (s.includes('seabank')) return '/images/banks/seabank.svg';
  if (s.includes('superbank')) return '/images/banks/superbank.svg';
  if (s.includes('linebank') || s.includes('line')) return '/images/banks/linebank.svg';
  if (s.includes('neobank') || s.includes('bnc') || s.includes('neocommerce')) return '/images/banks/neobank.svg';
  if (s.includes('shopee')) return '/images/banks/shopeepay.svg';
  if (s.includes('linkaja')) return '/images/banks/linkaja.svg';
  if (s.includes('gopay') || s.includes('go-pay')) return '/images/banks/gopay.svg';
  if (s.includes('dana')) return '/images/banks/dana.svg';
  if (s.includes('mandiri') || s.includes('livin')) return '/images/banks/mandiri.svg';
  if (s.includes('permata')) return '/images/banks/permata_bank.svg';
  if (s.includes('aladin')) return '/images/banks/aladin.svg';
  if (s.includes('allo')) return '/images/banks/allo.svg';
  if (s.includes('bjb') || s.includes('jabarbanten')) return '/images/banks/bjb.svg';
  if (s.includes('dki')) return '/images/banks/dki.svg';
  if (s.includes('jago') || s.includes('artos')) return '/images/banks/jago.svg';
  if (s.includes('jateng')) return '/images/banks/jateng.svg';
  if (s.includes('jatim')) return '/images/banks/jatim.svg';
  if (s.includes('maspion')) return '/images/banks/maspion.svg';
  if (s.includes('maybank') || s.includes('bii')) return '/images/banks/maybank.svg';
  if (s.includes('mega')) return '/images/banks/mega.svg';
  if (s.includes('muamalat')) return '/images/banks/muamalat.svg';
  if (s.includes('ocbc') || s.includes('nisp')) return '/images/banks/ocbc.svg';
  if (s.includes('panin')) return '/images/banks/panin.svg';
  if (s.includes('saqu')) return '/images/banks/saqu.svg';
  if (s.includes('sinarmas')) return '/images/banks/sinarmas.svg';
  if (s.includes('paypal')) return '/images/banks/paypal.svg';
  if (s.includes('wise') || s.includes('transferwise')) return '/images/banks/wise.svg';
  if (s.includes('qris')) return '/images/banks/qris.svg';
  if (s.includes('ovo')) return '/images/banks/ovo.svg';

  if (s.includes('btn')) return '/images/banks/btn.svg';
  if (s.includes('btpn')) return '/images/banks/btpn.svg';
  if (s.includes('bca') || s.includes('centralasia')) return '/images/banks/bca.svg';
  if (s.includes('bri') || s.includes('rakyatindonesia')) return '/images/banks/bri.svg';
  if (s.includes('bni') || s.includes('negaraindonesia')) return '/images/banks/bni.svg';
  if (s.includes('bsi') || s.includes('syariahindonesia')) return '/images/banks/bsi.svg';

  return null;
};

export const cleanMetaText = (value?: string | null): string => {
  if (!value) return '';
  return String(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
};

export const extractCoordinatesFromMapsUrl = (mapsUrl?: string | null): { lat: string; lng: string } | null => {
  if (!mapsUrl) return null;
  let decoded = mapsUrl;
  try {
    decoded = decodeURIComponent(mapsUrl);
  } catch {
    decoded = mapsUrl;
  }

  const qMatch = decoded.match(/(?:[?&](?:q|ll|center)=|@)(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (qMatch) {
    return { lat: qMatch[1], lng: qMatch[2] };
  }

  const bangMatch = decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (bangMatch) {
    return { lat: bangMatch[1], lng: bangMatch[2] };
  }

  return null;
};

export const resolveInvitationGeo = (
  wedding?: Partial<Wedding> | null,
  settings?: Partial<InvitationSettings> | null,
  events?: Partial<WeddingEvent>[] | null
) => {
  const themeContent = (settings?.theme_config as any)?.content || {};
  const primaryEvent = events && events.length > 0 ? events[0] : null;

  const venueName = cleanMetaText(wedding?.venue_name || primaryEvent?.venue_name || '');
  const venueAddress = cleanMetaText(
    wedding?.venue_address ||
    primaryEvent?.venue_address ||
    themeContent.groomAddress ||
    themeContent.brideAddress ||
    themeContent.familyAddress ||
    themeContent.participantAddress ||
    ''
  );
  const mapsUrl = wedding?.maps_url || primaryEvent?.maps_url || '';

  let placename = 'Denpasar, Bali';
  if (venueName && venueAddress) {
    placename = venueAddress.toLowerCase().includes(venueName.toLowerCase())
      ? venueAddress
      : `${venueName}, ${venueAddress}`;
  } else if (venueAddress || venueName) {
    placename = venueAddress || venueName;
  }

  const locLower = placename.toLowerCase();
  let region = 'ID-BA';
  if (/\b(jawa timur|kediri|surabaya|malang|sidoarjo|banyuwangi)\b/.test(locLower)) region = 'ID-JI';
  else if (/\b(jakarta)\b/.test(locLower)) region = 'ID-JK';
  else if (/\b(jawa barat|bandung|bogor|bekasi|depok)\b/.test(locLower)) region = 'ID-JB';
  else if (/\b(jawa tengah|semarang|solo|surakarta)\b/.test(locLower)) region = 'ID-JT';
  else if (/\b(yogyakarta|jogja|sleman|bantul)\b/.test(locLower)) region = 'ID-YO';
  else if (/\b(lombok|mataram|ntb)\b/.test(locLower)) region = 'ID-NB';

  const parsedCoords = extractCoordinatesFromMapsUrl(mapsUrl);
  let lat = '-8.670458';
  let lng = '115.212629';

  if (parsedCoords) {
    lat = parsedCoords.lat;
    lng = parsedCoords.lng;
  } else if (/\b(gianyar|blahbatuh|sukawati|ubud|payangan|tampaksiring|tegallalang|beng|samplangan|keramas|belega|bonbiyu|bitera|buruan|kemenuh)\b/.test(locLower)) {
    lat = '-8.5444';
    lng = '115.3255';
  } else if (/\b(bangli|susut|kintamani|tembuku|sulahan|sekardadi|tangkas)\b/.test(locLower)) {
    lat = '-8.4542';
    lng = '115.3549';
  } else if (/\b(klungkung|nusa penida|batukandik|dawan|banjarangkan|besan|getakan)\b/.test(locLower)) {
    lat = '-8.5367';
    lng = '115.4024';
  } else if (/\b(karangasem|bugbug|amlapura|ababi|manggis|rendang|sidemen)\b/.test(locLower)) {
    lat = '-8.4485';
    lng = '115.6127';
  } else if (/\b(negara|jembrana|mendoyo|melaya|pekutatan|berangbang)\b/.test(locLower)) {
    lat = '-8.3563';
    lng = '114.6217';
  } else if (/\b(buleleng|singaraja|sawan|seririt|kubutambahan|sukasada)\b/.test(locLower)) {
    lat = '-8.1120';
    lng = '115.0882';
  } else if (/\b(tabanan|kerambitan|selemadeg|baturiti|marga)\b/.test(locLower)) {
    lat = '-8.5414';
    lng = '115.1253';
  } else if (/\b(badung|kuta|mengwi|abiansemal|petang|jimbaran|canggu|seminyak|nusa dua)\b/.test(locLower)) {
    lat = '-8.5819';
    lng = '115.1771';
  }

  return {
    region,
    placename,
    lat,
    lng,
    position: `${lat};${lng}`,
    icbm: `${lat}, ${lng}`
  };
};

export const resolveInvitationSeo = (options: {
  wedding: Partial<Wedding>;
  settings?: Partial<InvitationSettings> | null;
  events?: Partial<WeddingEvent>[] | null;
  title?: string | null;
  description?: string | null;
  templateClass?: string | null;
}) => {
  const { wedding, settings, events, title: customTitle, description: customDescription, templateClass } = options;
  const themeContent = (settings?.theme_config as any)?.content || {};
  const isMetatah = Boolean(
    wedding?.template?.toLowerCase().includes('metatah') ||
    templateClass?.toLowerCase().includes('metatah')
  );

  const rawDate = wedding?.wedding_date || events?.[0]?.event_date || '';
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const formattedDate = parsedDate && !isNaN(parsedDate.getTime())
    ? formatDate(parsedDate.toISOString())
    : '';

  let defaultTitle = '';
  let defaultDescription = '';
  let label = '';

  if (isMetatah) {
    const ceremonyTitleText = cleanMetaText(themeContent.ceremonyTitle || 'Mepandes / Metatah');
    const rawParticipants: any[] =
      Array.isArray(themeContent.participants) && themeContent.participants.length > 0
        ? themeContent.participants
        : Array.isArray(themeContent.potongGigiMembers) && themeContent.potongGigiMembers.length > 0
          ? themeContent.potongGigiMembers
          : Array.isArray(themeContent.members) && themeContent.members.length > 0
            ? themeContent.members
            : [];

    const nicknames = rawParticipants
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          return cleanMetaText(item.nickname || item.nickName || item.name || '');
        }
        return cleanMetaText(String(item || ''));
      })
      .filter(Boolean);

    const formattedNicknames = nicknames.length === 0
      ? cleanMetaText(themeContent.participantName || wedding?.groom_name || 'Peserta')
      : nicknames.length === 1
        ? nicknames[0]
        : nicknames.length === 2
          ? `${nicknames[0]} & ${nicknames[1]}`
          : `${nicknames.slice(0, -1).join(', ')} & ${nicknames[nicknames.length - 1]}`;

    const rawTitleMode = String(themeContent.titleMode || themeContent.titleType || '').toLowerCase().trim();
    const explicitCover = cleanMetaText(themeContent.coverTitle || themeContent.coverName || themeContent.title || '');

    let coverTitle = '';
    if (rawTitleMode === 'participants' || rawTitleMode === 'peserta' || Boolean(themeContent.useParticipantsAsTitle)) {
      coverTitle = cleanMetaText(themeContent.participantsTitle) || formattedNicknames;
    } else if (explicitCover) {
      coverTitle = explicitCover;
    } else if (rawTitleMode === 'default' || rawTitleMode === 'ceremony' || rawTitleMode === 'metatah') {
      coverTitle = cleanMetaText(themeContent.defaultTitle || ceremonyTitleText || 'Metatah');
    } else {
      coverTitle = cleanMetaText(themeContent.familyName || themeContent.familyTitle || wedding?.groom_name || 'Keluarga');
    }

    const isTitleRedundant = Boolean(
      coverTitle &&
      ceremonyTitleText &&
      (
        coverTitle.toLowerCase() === ceremonyTitleText.toLowerCase() ||
        ceremonyTitleText.toLowerCase().includes(coverTitle.toLowerCase()) ||
        /^(metatah|mepandes|upacara metatah|upacara mepandes)$/i.test(coverTitle)
      )
    );

    label = isTitleRedundant ? ceremonyTitleText : `${ceremonyTitleText} ${coverTitle}`.trim();
    defaultTitle = isTitleRedundant ? ceremonyTitleText : `${ceremonyTitleText} - ${coverTitle}`;
    defaultDescription = isTitleRedundant
      ? `Undangan ${ceremonyTitleText}.${formattedDate ? `\n${formattedDate}.` : ''}`
      : `Undangan ${ceremonyTitleText} ${coverTitle}.${formattedDate ? `\n${formattedDate}.` : ''}`;
  } else {
    const groomName = cleanMetaText(themeContent.groomNickname || wedding?.groom_name || 'Mempelai Pria');
    const brideName = cleanMetaText(themeContent.brideNickname || wedding?.bride_name || 'Mempelai Wanita');
    label = `${groomName} & ${brideName}`;
    defaultTitle = `The Wedding of ${groomName} & ${brideName}`;
    defaultDescription = `Undangan pernikahan ${groomName} & ${brideName}.${formattedDate ? `\n${formattedDate}.` : ''}`;
  }

  const resolvedTitle = cleanMetaText(customTitle || themeContent.metaTitle || defaultTitle);
  const resolvedDescription = cleanMetaText(customDescription || themeContent.metaDescription || defaultDescription);
  const geo = resolveInvitationGeo(wedding, settings, events);

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    label,
    formattedDate,
    isMetatah,
    geo
  };
};

