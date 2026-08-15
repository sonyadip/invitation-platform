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
  childNumber: string | undefined | null,
  defaultRole: 'Putra' | 'Putri',
  customPrefix?: string | null,
  fallback?: string
): string => {
  if (childNumber) {
    let formatted = childNumber.trim();
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

  const parents = [
    fatherName?.trim() || '',
    motherName?.trim() || ''
  ].filter(Boolean).join(' & ');

  if (parents) {
    lines.push(parents);
  } else if (fallbackParents) {
    const cleaned = fallbackParents
      .replace(/^(Putra dari|Putri dari|Putra|Putri)\s+/i, '')
      .replace(/^dari\s+/i, '');
    lines.push(cleaned || fallbackParents);
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
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Wedding of ${wedding.groom_name} & ${wedding.bride_name}`,
    dates: `${buildCalendarDate(event.event_date, startTime)}/${buildCalendarDate(event.event_date, endTime)}`,
    details: `Wedding invitation for ${wedding.groom_name} and ${wedding.bride_name}.`,
    location: `${event.venue_name}, ${event.venue_address}`,
    ctz: 'Asia/Makassar'
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export const formatWishDate = (isoStr: string): string => new Date(isoStr).toLocaleDateString('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
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
    // If not a URL, it might be raw text or a bad URL.
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
