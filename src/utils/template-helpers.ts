import type { Wedding, WeddingEvent } from '../types';

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
  day: 'numeric'
});

export const formatEventDate = (iso: string) => {
  const date = new Date(iso);
  return {
    weekday: date.toLocaleDateString('id-ID', { weekday: 'long' }),
    date: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
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

  // 1. Compound / specific brand names first to avoid false substring matches
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

  // 2. Acronyms & core banks
  if (s.includes('btn')) return '/images/banks/btn.svg';
  if (s.includes('btpn')) return '/images/banks/btpn.svg';
  if (s.includes('bca') || s.includes('centralasia')) return '/images/banks/bca.svg';
  if (s.includes('bri') || s.includes('rakyatindonesia')) return '/images/banks/bri.svg';
  if (s.includes('bni') || s.includes('negaraindonesia')) return '/images/banks/bni.svg';
  if (s.includes('bsi') || s.includes('syariahindonesia')) return '/images/banks/bsi.svg';

  return null;
};
