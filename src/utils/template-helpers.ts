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
