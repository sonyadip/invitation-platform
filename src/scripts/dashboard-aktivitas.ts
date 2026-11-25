declare global {
  interface Window {
    showToast?: (opts: { type: 'success' | 'error' | 'info' | 'warning'; message: string }) => void;
    XLSX?: {
      utils: {
        aoa_to_sheet: (data: Array<Array<string | number>>) => unknown;
        book_new: () => unknown;
        book_append_sheet: (wb: unknown, ws: unknown, name: string) => void;
      };
      writeFile: (wb: unknown, filename: string) => void;
    };
  }
}

interface WeddingGift {
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
}

interface ActivityMetadata {
  target?: string;
  accountName?: string;
  bankName?: string;
  href?: string;
  role?: string;
  participantName?: string;
}

interface GuestRsvpSummary {
  attendanceStatus?: string;
  status?: string;
  guestCount?: number;
  message?: string;
}

interface ActivityItem {
  id: string;
  guestName?: string;
  guestRsvp?: GuestRsvpSummary | null;
  category: string;
  eventType: string;
  label: string;
  desc: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  badgeClass?: string;
  deviceType?: string;
  deviceModel?: string;
  os?: string;
  browser?: string;
  source?: string;
  city?: string;
  country?: string;
  createdAt: string;
  metadata?: ActivityMetadata;
}

interface GuestCounts {
  cover: number;
  maps: number;
  calendar: number;
  gift: number;
  participant: number;
  gallery: number;
  music: number;
  coupleIg: number;
  vendorWa: number;
  views: number;
}

interface GuestTimelineEvent {
  eventType?: string;
  label?: string;
  desc?: string;
  icon?: string;
  iconColor?: string;
  badgeClass?: string;
  createdAt: string;
  metadata?: ActivityMetadata;
}

interface GuestJourneyItem {
  guestName: string;
  isGuest: boolean;
  lastActive: string;
  totalActivities: number;
  counts: GuestCounts;
  rsvp?: GuestRsvpSummary | null;
  sentInfo?: { phone?: string } | null;
  devices?: string[];
  browsers?: string[];
  sources?: string[];
  cities?: string[];
  items?: GuestTimelineEvent[];
}

interface ChartActivityPoint {
  e?: string;
  c?: string;
  g?: boolean;
  t?: string;
  n?: string;
}

interface ChartBucket {
  key: string;
  label: string;
  fullLabel: string;
  count: number;
  guests: Set<string>;
}

interface SummaryResponse {
  totalViews?: number;
  totalEvents?: number;
  totalActivities?: number;
  totalIdentifiedGuests?: number;
  funnel?: {
    coverOpenRate?: number;
    rsvpRate?: number;
    engagementRate?: number;
    totalSent?: number;
    openRate?: number;
    totalOpenedSent?: number;
  };
  rsvpStats?: { totalRsvp?: number };
  interactionStats?: {
    openCover?: number;
    clickMaps?: number;
    clickCalendar?: number;
    copyGift?: number;
    playMusic?: number;
    playVideo?: number;
    viewGallery?: number;
    clickRsvp?: number;
    clickParticipant?: number;
    clickCoupleInstagram?: number;
    clickVendorWhatsApp?: number;
    clickVendorInstagram?: number;
    clickVendorSite?: number;
    vendorLeads?: number;
  };
  deviceStats?: {
    mobile?: number;
    desktop?: number;
    tablet?: number;
    mobilePercent?: number;
    desktopPercent?: number;
    tabletPercent?: number;
  };
  browserStats?: Array<{ browser: string; count: number }>;
  chartRawData?: ChartActivityPoint[];
}

const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as const;
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] as const;

interface MilestoneDef {
  key: keyof GuestCounts;
  variant: string;
  icon: string;
  label: string;
  title: string;
}

const GUEST_MILESTONE_DEFS: readonly MilestoneDef[] = [
  { key: 'maps', variant: 'info', icon: 'location_on', label: 'Cek Maps', title: 'Melihat rute Google Maps' },
  { key: 'calendar', variant: 'purple', icon: 'event_available', label: 'Simpan Kalender', title: 'Menyimpan acara ke kalender' },
  { key: 'gift', variant: 'warning', icon: 'content_copy', label: 'Salin Rekening', title: 'Menyalin nomor rekening amplop' },
  { key: 'participant', variant: 'purple', icon: 'person', label: 'Detail Peserta', title: 'Membuka profil detail peserta' },
  { key: 'gallery', variant: 'indigo', icon: 'photo_library', label: 'Galeri', title: 'Melihat galeri foto' },
  { key: 'music', variant: 'teal', icon: 'music_note', label: 'Musik', title: 'Memutar musik latar' },
  { key: 'coupleIg', variant: 'pink', icon: 'photo_camera', label: 'Profil IG', title: 'Melihat Instagram Mempelai' },
  { key: 'vendorWa', variant: 'success', icon: 'chat', label: 'WA Senadda', title: 'Menghubungi WhatsApp Senadda' },
  { key: 'views', variant: 'neutral', icon: 'visibility', label: 'Kunjungan', title: 'Total kunjungan halaman' }
];

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toWitaDate(dateStr: string): Date {
  return new Date(new Date(dateStr).getTime() + 8 * 3600000);
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} mnt lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Kemarin';
  if (days < 7) return `${days} hari lalu`;
  const wita = toWitaDate(dateStr);
  return `${wita.getUTCDate()} ${MONTHS_ID[wita.getUTCMonth()]}`;
}

function formatFullDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = toWitaDate(dateStr);
  const hour = String(d.getUTCHours()).padStart(2, '0');
  const minute = String(d.getUTCMinutes()).padStart(2, '0');
  return `${DAYS_ID[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_ID[d.getUTCMonth()]} ${d.getUTCFullYear()} ${hour}.${minute} WITA`;
}

function getDeviceIcon(deviceType?: string): string {
  const normalized = (deviceType || '').toLowerCase();
  if (normalized === 'desktop') return 'computer';
  if (normalized === 'tablet') return 'tablet_android';
  return 'smartphone';
}

function renderChip(variant: string, icon: string, content: string): string {
  return `<span class="act-chip act-chip--${variant}"><span class="material-symbols-outlined chip-icon">${icon}</span>${escapeHtml(content)}</span>`;
}

function renderSkeletonHtml(rows: number): string {
  return `<div class="act-skeleton-list">${'<div class="act-skeleton-row"></div>'.repeat(rows)}</div>`;
}

function renderEmptyStateHtml(icon: string, title: string, text: string, isError = false): string {
  const iconStyle = isError ? ' style="color: #ef4444;"' : '';
  return `<div class="activity-empty"><span class="material-symbols-outlined activity-empty__icon"${iconStyle}>${icon}</span><p class="activity-empty__title">${title}</p><p class="activity-empty__text">${text}</p></div>`;
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function initInteractiveChartEngine() {
  const svg = document.getElementById('activityGraphSvg') as SVGSVGElement | null;
  if (!svg) return { updateData: (_data: ChartActivityPoint[]) => {} };

  const gridGroup = document.getElementById('graphGridGroup');
  const barsGroup = document.getElementById('graphBarsGroup') as SVGGElement | null;
  const areaGroup = document.getElementById('graphAreaGroup') as SVGGElement | null;
  const areaPath = document.getElementById('graphAreaPath');
  const linePath = document.getElementById('graphLinePath');
  const pointsGroup = document.getElementById('graphPointsGroup');
  const trackerGroup = document.getElementById('graphTrackerGroup') as SVGGElement | null;
  const trackerLine = document.getElementById('graphTrackerLine');
  const trackerCircle = document.getElementById('graphTrackerCircle');
  const xAxisLabels = document.getElementById('graphXAxisLabels');
  const tooltip = document.getElementById('graphTooltip') as HTMLElement | null;
  const tooltipTitle = document.getElementById('graphTooltipTitle');
  const tooltipVal = document.getElementById('graphTooltipVal');
  const tooltipSub = document.getElementById('graphTooltipSub');
  const kpiTotal = document.getElementById('graphKpiTotal');
  const kpiPeak = document.getElementById('graphKpiPeak');
  const kpiAvg = document.getElementById('graphKpiAvg');
  const kpiGuests = document.getElementById('graphKpiGuests');
  const metricSelect = document.getElementById('graphMetricFilter') as HTMLSelectElement | null;
  const timeTabs = document.querySelectorAll<HTMLButtonElement>('.graph-time-tab');
  const typeButtons = document.querySelectorAll<HTMLButtonElement>('.graph-type-btn');

  let rawActivities: ChartActivityPoint[] = [];
  let currentMetric = 'all';
  let currentRange = '24h';
  let currentType = 'area';
  let resizeTimer: number | undefined;

  const matchesMetric = (item: ChartActivityPoint): boolean => {
    switch (currentMetric) {
      case 'views':
        return item.e === 'page_view';
      case 'cover':
        return item.e === 'open_cover';
      case 'interaction':
        return item.c === 'interaksi';
      case 'guests':
        return item.g === true;
      case 'vendor':
        return item.c === 'vendor';
      default:
        return true;
    }
  };

  const buildBuckets = (): ChartBucket[] => {
    const now = new Date();
    const filtered = rawActivities.filter(matchesMetric);
    const buckets: ChartBucket[] = [];
    const bucketMap = new Map<string, ChartBucket>();

    if (currentRange === '24h') {
      const nowTime = now.getTime();
      const oneHour = 3600000;
      for (let i = 23; i >= 0; i--) {
        const bTime = new Date(nowTime - i * oneHour);
        const bHour = (bTime.getUTCHours() + 8) % 24;
        const label = `${String(bHour).padStart(2, '0')}:00`;
        const key = `${bTime.toISOString().slice(0, 10)}-${bHour}`;
        const bucket: ChartBucket = {
          key,
          label,
          fullLabel: `${label} WITA`,
          count: 0,
          guests: new Set()
        };
        buckets.push(bucket);
        bucketMap.set(key, bucket);
      }

      for (const item of filtered) {
        if (!item.t) continue;
        const parsed = new Date(item.t);
        if (nowTime - parsed.getTime() > 24 * oneHour) continue;
        const key = `${parsed.toISOString().slice(0, 10)}-${(parsed.getUTCHours() + 8) % 24}`;
        const bucket = bucketMap.get(key);
        if (bucket) {
          bucket.count++;
          if (item.n) bucket.guests.add(item.n.toLowerCase());
        }
      }
      return buckets;
    }

    if (currentRange === '7d' || currentRange === '30d') {
      const daysCount = currentRange === '7d' ? 7 : 30;
      const oneDay = 86400000;
      for (let i = daysCount - 1; i >= 0; i--) {
        const bTime = new Date(now.getTime() - i * oneDay);
        const key = bTime.toISOString().slice(0, 10);
        const label = `${bTime.getUTCDate()} ${MONTHS_ID[bTime.getUTCMonth()]}`;
        const bucket: ChartBucket = {
          key,
          label,
          fullLabel: `${label} ${bTime.getUTCFullYear()}`,
          count: 0,
          guests: new Set()
        };
        buckets.push(bucket);
        bucketMap.set(key, bucket);
      }

      for (const item of filtered) {
        if (!item.t) continue;
        const bucket = bucketMap.get(item.t.slice(0, 10));
        if (bucket) {
          bucket.count++;
          if (item.n) bucket.guests.add(item.n.toLowerCase());
        }
      }
      return buckets;
    }

    const dateMap = new Map<string, { count: number; guests: Set<string> }>();
    for (const item of filtered) {
      if (!item.t) continue;
      const dStr = item.t.slice(0, 10);
      let entry = dateMap.get(dStr);
      if (!entry) {
        entry = { count: 0, guests: new Set() };
        dateMap.set(dStr, entry);
      }
      entry.count++;
      if (item.n) entry.guests.add(item.n.toLowerCase());
    }

    const sortedDates = Array.from(dateMap.keys()).sort();
    if (sortedDates.length === 0) {
      const label = `${now.getUTCDate()} ${MONTHS_ID[now.getUTCMonth()]}`;
      buckets.push({
        key: now.toISOString().slice(0, 10),
        label,
        fullLabel: `${label} ${now.getUTCFullYear()}`,
        count: 0,
        guests: new Set()
      });
      return buckets;
    }

    for (const dStr of sortedDates) {
      const dt = new Date(dStr);
      const label = `${dt.getUTCDate()} ${MONTHS_ID[dt.getUTCMonth()]}`;
      const entry = dateMap.get(dStr)!;
      buckets.push({
        key: dStr,
        label,
        fullLabel: `${label} ${dt.getUTCFullYear()}`,
        count: entry.count,
        guests: entry.guests
      });
    }

    return buckets;
  };

  const renderChart = () => {
    const buckets = buildBuckets();
    let totalCount = 0;
    let maxCount = 1;
    let peakBucket: ChartBucket | null = null;
    const allGuests = new Set<string>();

    for (const b of buckets) {
      totalCount += b.count;
      if (b.count > maxCount) maxCount = b.count;
      if (!peakBucket || b.count > peakBucket.count) peakBucket = b;
      b.guests.forEach((g) => allGuests.add(g));
    }

    if (kpiTotal) kpiTotal.textContent = totalCount.toLocaleString('id-ID');
    if (kpiGuests) kpiGuests.textContent = allGuests.size.toLocaleString('id-ID');
    if (kpiAvg) kpiAvg.textContent = buckets.length > 0 ? (totalCount / buckets.length).toFixed(1) : '0';
    if (kpiPeak) {
      kpiPeak.textContent = peakBucket && peakBucket.count > 0 ? `${peakBucket.count} (${peakBucket.label})` : '-';
    }

    const W = 800;
    const H = 220;
    const padL = 30;
    const padR = 30;
    const padT = 25;
    const padB = 30;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    if (gridGroup) {
      let gridHtml = '';
      for (let i = 0; i <= 4; i++) {
        const y = padT + (plotH / 4) * i;
        gridHtml += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="rgba(226, 232, 240, 0.6)" stroke-width="1" stroke-dasharray="2,2" />`;
      }
      gridGroup.innerHTML = gridHtml;
    }

    const n = buckets.length;
    const pts = buckets.map((bucket, idx) => ({
      x: n > 1 ? padL + (idx / (n - 1)) * plotW : padL + plotW / 2,
      y: padT + plotH - (bucket.count / maxCount) * plotH,
      bucket
    }));

    if (currentType === 'area') {
      if (barsGroup) barsGroup.style.display = 'none';
      if (areaGroup) areaGroup.style.display = 'block';

      let lineD = '';
      let areaD = '';
      if (pts.length > 0) {
        lineD = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
        areaD = `M ${pts[0].x.toFixed(1)} ${padT + plotH} L ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;

        for (let i = 1; i < pts.length; i++) {
          const prev = pts[i - 1];
          const curr = pts[i];
          const midX = (prev.x + curr.x) / 2;
          const segment = ` C ${midX.toFixed(1)} ${prev.y.toFixed(1)}, ${midX.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
          lineD += segment;
          areaD += segment;
        }
        areaD += ` L ${pts[pts.length - 1].x.toFixed(1)} ${padT + plotH} Z`;
      }

      linePath?.setAttribute('d', lineD);
      areaPath?.setAttribute('d', areaD);

      if (pointsGroup) {
        pointsGroup.innerHTML = pts
          .filter((p) => p.bucket.count > 0 || pts.length <= 12)
          .map(
            (p) =>
              `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#111827" stroke="#ffffff" stroke-width="1.5" />`
          )
          .join('');
      }
    } else {
      if (areaGroup) areaGroup.style.display = 'none';
      if (barsGroup) {
        barsGroup.style.display = 'block';
        const barWidth = Math.max(4, Math.min(28, (plotW / n) * 0.65));
        barsGroup.innerHTML = pts
          .map((p) => {
            const bx = p.x - barWidth / 2;
            const bh = padT + plotH - p.y;
            return `<rect x="${bx.toFixed(1)}" y="${p.y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="var(--color-primary, #111827)" opacity="0.85" />`;
          })
          .join('');
      }
    }

    if (xAxisLabels) {
      const containerWidth = xAxisLabels.clientWidth || svg.clientWidth || window.innerWidth;
      const targetCount = containerWidth < 420 ? 4 : containerWidth < 640 ? 5 : 7;
      const labelIndices =
        n <= targetCount
          ? Array.from({ length: n }, (_, i) => i)
          : Array.from({ length: targetCount }, (_, k) => Math.round((k * (n - 1)) / (targetCount - 1)));

      xAxisLabels.innerHTML = labelIndices
        .map((idx) => (buckets[idx] ? `<span>${escapeHtml(buckets[idx].label)}</span>` : ''))
        .join('');
    }

    svg.onmousemove = (e) => {
      if (pts.length === 0) return;
      const rect = svg.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * W;

      let closest = pts[0];
      let minDiff = Math.abs(closest.x - mouseX);
      for (let i = 1; i < pts.length; i++) {
        const diff = Math.abs(pts[i].x - mouseX);
        if (diff < minDiff) {
          minDiff = diff;
          closest = pts[i];
        }
      }

      if (trackerGroup) {
        trackerGroup.style.display = 'block';
        trackerLine?.setAttribute('x1', closest.x.toFixed(1));
        trackerLine?.setAttribute('x2', closest.x.toFixed(1));
        trackerCircle?.setAttribute('cx', closest.x.toFixed(1));
        trackerCircle?.setAttribute('cy', closest.y.toFixed(1));
      }

      if (tooltip) {
        tooltip.style.display = 'block';
        if (tooltipTitle) tooltipTitle.textContent = closest.bucket.fullLabel;
        if (tooltipVal) tooltipVal.textContent = `${closest.bucket.count} Aktivitas`;
        if (tooltipSub) {
          const gCount = closest.bucket.guests.size;
          tooltipSub.textContent = gCount > 0 ? `${gCount} tamu teridentifikasi` : 'Tidak ada tamu bernama';
        }

        const svgW = svg.clientWidth || 800;
        const svgH = svg.clientHeight || 215;
        const pointX = (closest.x / W) * svgW;
        const pointY = (closest.y / H) * svgH;
        const tooltipWidth = tooltip.offsetWidth || 160;
        const halfTooltip = tooltipWidth / 2;
        const clampedX = Math.max(halfTooltip + 8, Math.min(svgW - halfTooltip - 8, pointX));
        const arrowOffset = Math.max(12, Math.min(tooltipWidth - 12, halfTooltip + (pointX - clampedX)));

        tooltip.style.setProperty('--arrow-left', `${arrowOffset}px`);
        tooltip.classList.toggle('graph-tooltip--below', pointY < 50);
        tooltip.style.left = `${clampedX}px`;
        tooltip.style.top = `${pointY < 50 ? pointY + 12 : pointY - 10}px`;
      }
    };

    svg.onmouseleave = () => {
      if (trackerGroup) trackerGroup.style.display = 'none';
      if (tooltip) {
        tooltip.style.display = 'none';
        tooltip.classList.remove('graph-tooltip--below');
      }
    };
  };

  metricSelect?.addEventListener('change', () => {
    currentMetric = metricSelect.value;
    renderChart();
  });

  timeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      timeTabs.forEach((t) => t.classList.remove('graph-time-tab--active'));
      tab.classList.add('graph-time-tab--active');
      currentRange = tab.getAttribute('data-range') || '24h';
      renderChart();
    });
  });

  typeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      typeButtons.forEach((b) => b.classList.remove('graph-type-btn--active'));
      btn.classList.add('graph-type-btn--active');
      currentType = btn.getAttribute('data-type') || 'area';
      renderChart();
    });
  });

  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(renderChart, 150);
  });

  return {
    updateData(nextActivities: ChartActivityPoint[]) {
      rawActivities = nextActivities;
      renderChart();
    }
  };
}

export function initAktivitasPage() {
  const rootEl = document.getElementById('activityPageRoot');
  if (!rootEl) return;

  const slug = rootEl.dataset.slug || window.location.pathname.split('/')[2] || '';
  const originUrl = rootEl.dataset.origin || window.location.origin;

  let weddingGifts: WeddingGift[] = [];
  try {
    weddingGifts = JSON.parse(rootEl.getAttribute('data-wedding-gifts') || '[]');
  } catch {
    weddingGifts = [];
  }

  const searchInput = document.getElementById('activitySearch') as HTMLInputElement | null;
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const timeRangeSelect = document.getElementById('timeRangeFilter') as HTMLSelectElement | null;
  const eventSelect = document.getElementById('eventFilter') as HTMLSelectElement | null;
  const exportBtn = document.getElementById('activityExport') as HTMLButtonElement | null;
  const refreshBtn = document.getElementById('refreshActivityBtn');
  const tagButtons = document.querySelectorAll<HTMLElement>('.activity-tag');
  const tagRow = document.getElementById('activityTagsRow');
  const filterIndicator = document.getElementById('filterIndicator');
  const filterIndicatorText = document.getElementById('filterIndicatorText');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');

  const viewModeTimelineBtn = document.getElementById('viewModeTimeline');
  const viewModeGuestsBtn = document.getElementById('viewModeGuests');
  const activityList = document.getElementById('activityList');
  const guestJourneyList = document.getElementById('guestJourneyList');
  const eventFilterWrapper = document.getElementById('eventFilterWrapper');

  const prevBtn = document.getElementById('actPrev') as HTMLButtonElement | null;
  const nextBtn = document.getElementById('actNext') as HTMLButtonElement | null;
  const pageNumbers = document.getElementById('actPageNumbers');
  const interactionCards = document.querySelectorAll<HTMLElement>('.interaction-card[data-filter]');

  const chartController = initInteractiveChartEngine();

  let viewMode: 'timeline' | 'guests' = 'timeline';
  let currentTimelinePage = 1;
  let currentGuestsPage = 1;
  let totalTimelinePages = 1;
  let totalGuestsPages = 1;
  let activeTag = 'all';
  let searchQuery = '';
  let searchTimeout: number | undefined;

  const formatGiftParts = (metadata?: ActivityMetadata): string[] => {
    const accNum = (metadata?.target || '').trim();
    const cleanAccNum = accNum.replace(/[\s-]+/g, '');
    const matched = weddingGifts.find((g) => (g.accountNumber || '').replace(/[\s-]+/g, '') === cleanAccNum);
    const accountName = metadata?.accountName || matched?.accountName || '';
    const bankName = metadata?.bankName || matched?.bankName || '';

    const parts: string[] = [];
    if (bankName) parts.push(`Bank <strong>${escapeHtml(bankName)}</strong>`);
    if (accNum) parts.push(`No. Rek: <code>${escapeHtml(accNum)}</code>`);
    if (accountName) parts.push(`a.n. <strong>${escapeHtml(accountName)}</strong>`);
    return parts;
  };

  const renderTimelineMetaBox = (item: ActivityItem): string => {
    if (item.eventType === 'copy_gift' && (item.metadata?.target || item.metadata?.accountName)) {
      const parts = formatGiftParts(item.metadata);
      return `<div class="act-meta-box act-meta-box--warning"><span class="material-symbols-outlined meta-icon">content_copy</span><span>${parts.join(' &bull; ') || 'Rekening Hadir / Digital'}</span></div>`;
    }
    if (item.eventType === 'click_maps' && item.metadata?.href) {
      return `<div class="act-meta-box act-meta-box--info"><span class="material-symbols-outlined meta-icon">location_on</span><span>Tautan Maps: <a href="${escapeHtml(item.metadata.href)}" target="_blank" rel="noopener noreferrer" class="meta-link">${escapeHtml(item.metadata.href)}</a></span></div>`;
    }
    if (item.eventType === 'click_couple_instagram') {
      const linkOrRole = item.metadata?.href
        ? `<a href="${escapeHtml(item.metadata.href)}" target="_blank" rel="noopener noreferrer" class="meta-link">${escapeHtml(item.metadata.href)}</a>`
        : escapeHtml(item.metadata?.role || 'Pengantin');
      return `<div class="act-meta-box act-meta-box--pink"><span class="material-symbols-outlined meta-icon">photo_camera</span><span>Instagram Mempelai: ${linkOrRole}</span></div>`;
    }
    if (item.eventType === 'click_participant') {
      const pName = item.metadata?.participantName ? escapeHtml(item.metadata.participantName) : 'Peserta';
      const pRole = item.metadata?.role ? ` <span style="font-weight: normal; opacity: 0.85;">(${escapeHtml(item.metadata.role)})</span>` : '';
      return `<div class="act-meta-box act-meta-box--purple"><span class="material-symbols-outlined meta-icon">person</span><span>Peserta: <strong>${pName}</strong>${pRole}</span></div>`;
    }
    return '';
  };

  const renderTimelineRow = (item: ActivityItem): string => {
    const isGuest = Boolean(item.guestName);
    const guestDisplay = isGuest ? item.guestName! : 'Pengunjung Umum (Anonim)';
    const guestRsvp = item.guestRsvp;
    const giftParts = item.eventType === 'copy_gift' ? formatGiftParts(item.metadata) : [];
    const searchIndex = `${item.guestName || ''} ${guestRsvp?.message || ''} ${item.label} ${item.desc} ${item.browser || ''} ${item.deviceModel || ''} ${item.os || ''} ${item.source || ''} ${item.city || ''} ${item.metadata?.target || ''} ${item.metadata?.accountName || ''} ${giftParts.join(' ')} ${item.metadata?.href || ''}`.toLowerCase();

    let rsvpBadgeHtml = '';
    if (guestRsvp?.attendanceStatus) {
      const text =
        guestRsvp.attendanceStatus === 'attending'
          ? `Hadir (${guestRsvp.guestCount || 1}pax)`
          : guestRsvp.attendanceStatus === 'declined'
            ? 'Tidak Hadir'
            : 'Ragu';
      rsvpBadgeHtml = `<span class="rsvp-micro-badge rsvp-micro-badge--${escapeHtml(guestRsvp.attendanceStatus)}">${escapeHtml(text)}</span>`;
    }

    const chips: string[] = [];
    if (item.deviceModel && item.deviceModel !== 'Perangkat Web') {
      chips.push(renderChip('device', getDeviceIcon(item.deviceType), `${item.deviceModel}${item.os ? ` (${item.os})` : ''}`));
    }
    if (item.browser && item.browser !== 'Unknown') {
      chips.push(renderChip('browser', 'language', item.browser));
    }
    if (item.source) {
      chips.push(renderChip('source', 'link', item.source));
    }
    if (item.city) {
      chips.push(renderChip('location', 'place', `${item.city}${item.country ? `, ${item.country}` : ''}`));
    }

    return `
      <div
        class="act-row-wrapper"
        data-id="${escapeHtml(item.id)}"
        data-name="${escapeHtml((item.guestName || '').toLowerCase())}"
        data-is-guest="${isGuest ? 'true' : 'false'}"
        data-has-rsvp="${guestRsvp ? 'true' : 'false'}"
        data-category="${escapeHtml(item.category)}"
        data-event="${escapeHtml(item.eventType)}"
        data-time="${escapeHtml(item.createdAt)}"
        data-search="${escapeHtml(searchIndex)}"
      >
        <div class="act-row">
          <div class="act-row__icon-box" style="background: ${item.iconBg}; color: ${item.iconColor};">
            <span class="material-symbols-outlined">${item.icon}</span>
          </div>

          <div class="act-row__content">
            <div class="act-row__header">
              <div class="act-row__actor">
                <span class="act-row__name ${!isGuest ? 'act-row__name--anon' : ''}">${escapeHtml(guestDisplay)}</span>
                ${isGuest ? '<span class="act-tag-guest">Tamu</span>' : '<span class="act-tag-anon">Anonim</span>'}
                ${rsvpBadgeHtml}
              </div>
              <span class="act-time-rel">${timeAgo(item.createdAt)}</span>
            </div>

            <div class="act-row__action-row">
              <span class="act-badge ${item.badgeClass || ''}">${escapeHtml(item.label)}</span>
            </div>

            <p class="act-row__desc">${escapeHtml(item.desc)}</p>

            ${renderTimelineMetaBox(item)}

            <div class="act-row__footer">
              <div class="act-row__chips">${chips.join('')}</div>
              <div class="act-date-full">
                <span class="material-symbols-outlined" style="font-size: 13px;">schedule</span>
                ${formatFullDate(item.createdAt)}
              </div>
            </div>
          </div>
        </div>
        <div class="act-row__divider"></div>
      </div>
    `;
  };

  const renderGuestCard = (guest: GuestJourneyItem): string => {
    const isGuest = guest.isGuest;
    const initials = isGuest ? (guest.guestName || '').slice(0, 2).toUpperCase() : '?';
    const guestDirectLink = isGuest ? `${originUrl}/${slug}?to=${encodeURIComponent(guest.guestName)}` : '';
    const guestRsvp = guest.rsvp;
    const searchIndex = `${guest.guestName} ${guestRsvp?.message || ''} ${guest.sentInfo?.phone || ''} ${(guest.devices || []).join(' ')} ${(guest.browsers || []).join(' ')} ${(guest.sources || []).join(' ')} ${(guest.cities || []).join(' ')}`.toLowerCase();

    let rsvpBadgeHtml = '';
    if (guestRsvp?.status) {
      const status = guestRsvp.status;
      const icon = status === 'attending' ? 'check_circle' : status === 'declined' ? 'cancel' : 'help';
      const text =
        status === 'attending'
          ? `Konfirmasi Hadir (${guestRsvp.guestCount || 1} Pax)`
          : status === 'declined'
            ? 'Berhalangan Hadir'
            : 'Ragu-ragu';
      rsvpBadgeHtml = `<span class="rsvp-status-badge rsvp-status-badge--${escapeHtml(status)}"><span class="material-symbols-outlined" style="font-size: 13px;">${icon}</span>${escapeHtml(text)}</span>`;
    } else if (isGuest) {
      rsvpBadgeHtml = '<span class="rsvp-status-badge rsvp-status-badge--none"><span class="material-symbols-outlined" style="font-size: 13px;">pending</span>Belum Konfirmasi RSVP</span>';
    }

    let quickActionsHtml = '';
    if (isGuest) {
      quickActionsHtml += `<button type="button" class="action-icon-btn copy-guest-link-btn" data-link="${escapeHtml(guestDirectLink)}" data-name="${escapeHtml(guest.guestName)}" title="Salin tautan undangan personal untuk tamu ini"><span class="material-symbols-outlined">link</span></button>`;
      if (guest.sentInfo?.phone) {
        quickActionsHtml += `<a href="https://wa.me/${guest.sentInfo.phone.replace(/[^0-9]/g, '')}" target="_blank" rel="noopener noreferrer" class="action-icon-btn action-icon-btn--wa" title="Buka chat WhatsApp tamu"><span class="material-symbols-outlined">chat</span></a>`;
      }
    }
    quickActionsHtml += '<button type="button" class="guest-card__toggle-btn" aria-expanded="false" title="Buka detail riwayat"><span class="toggle-text">Detail</span><span class="material-symbols-outlined toggle-icon">expand_more</span></button>';

    const wishQuoteHtml = guestRsvp?.message
      ? `<div class="guest-wish-quote"><span class="material-symbols-outlined quote-icon">format_quote</span><p class="quote-text">"${escapeHtml(guestRsvp.message)}"</p></div>`
      : '';

    const milestoneBadges: string[] = [
      guest.counts.cover > 0
        ? `<span class="milestone-badge milestone-badge--done" title="Sudah membuka amplop cover"><span class="material-symbols-outlined">mark_email_read</span> Buka Cover (${guest.counts.cover}x)</span>`
        : '<span class="milestone-badge milestone-badge--pending" title="Belum membuka cover"><span class="material-symbols-outlined">drafts</span> Buka Cover</span>'
    ];

    for (const def of GUEST_MILESTONE_DEFS) {
      const count = guest.counts[def.key];
      if (count > 0) {
        milestoneBadges.push(
          `<span class="milestone-badge milestone-badge--${def.variant}" title="${def.title}"><span class="material-symbols-outlined">${def.icon}</span> ${def.label} (${count}x)</span>`
        );
      }
    }

    const techChips: string[] = [];
    if (guest.devices?.length) techChips.push(renderChip('device', 'devices', guest.devices.join(', ')));
    if (guest.browsers?.length) techChips.push(renderChip('browser', 'language', guest.browsers.join(', ')));
    if (guest.sources?.length) techChips.push(renderChip('source', 'link', guest.sources.join(', ')));
    if (guest.cities?.length) techChips.push(renderChip('location', 'place', guest.cities.join(', ')));

    const timelineItemsHtml = (guest.items || [])
      .map((it) => {
        let extraGiftHtml = '';
        if (it.eventType === 'copy_gift' || it.label === 'Salin Rekening') {
          const parts = formatGiftParts(it.metadata);
          if (parts.length > 0) {
            extraGiftHtml = `<div class="guest-timeline-gift"><span class="material-symbols-outlined">content_copy</span><span>${parts.join(' &bull; ')}</span></div>`;
          }
        }
        return `
          <div class="guest-timeline-item">
            <div class="guest-timeline-item__icon" style="color: ${it.iconColor || '#64748b'};">
              <span class="material-symbols-outlined">${it.icon || 'touch_app'}</span>
            </div>
            <div class="guest-timeline-item__content">
              <div class="guest-timeline-item__top">
                <span class="act-badge ${it.badgeClass || 'act-badge--neutral'}">${escapeHtml(it.label || 'Aktivitas')}</span>
                <span class="guest-timeline-item__time">${formatFullDate(it.createdAt)}</span>
              </div>
              <p class="guest-timeline-item__desc">${escapeHtml(it.desc || '')}</p>
              ${extraGiftHtml}
            </div>
          </div>
        `;
      })
      .join('');

    const avatarStyle = isGuest ? 'background: #e0e7ff; color: #3730a3;' : 'background: #f1f5f9; color: #64748b;';

    return `
      <div
        class="guest-card"
        data-guest-name="${escapeHtml((guest.guestName || '').toLowerCase())}"
        data-search="${escapeHtml(searchIndex)}"
        data-is-guest="${isGuest ? 'true' : 'false'}"
        data-has-rsvp="${guestRsvp ? 'true' : 'false'}"
        data-has-cover="${guest.counts.cover > 0 ? 'true' : 'false'}"
        data-has-maps="${guest.counts.maps > 0 ? 'true' : 'false'}"
        data-has-gift="${guest.counts.gift > 0 ? 'true' : 'false'}"
        data-time="${escapeHtml(guest.lastActive)}"
      >
        <div class="guest-card__header">
          <div class="guest-card__avatar" style="${avatarStyle}">${escapeHtml(initials)}</div>
          <div class="guest-card__body">
            <div class="guest-card__top-bar">
              <div class="guest-card__name-row">
                <h4 class="guest-card__name">${escapeHtml(guest.guestName)}</h4>
                ${isGuest ? '<span class="act-tag-guest">Tamu</span>' : '<span class="act-tag-anon">Anonim</span>'}
              </div>
              <div class="guest-card__quick-actions">${quickActionsHtml}</div>
            </div>
            <div class="guest-card__sub-row">
              ${rsvpBadgeHtml ? `<div class="guest-card__rsvp-wrap">${rsvpBadgeHtml}</div>` : ''}
              <p class="guest-card__meta">
                <span class="guest-card__meta-item">Terakhir aktif: <strong>${timeAgo(guest.lastActive)}</strong></span>
                <span class="meta-dot">•</span>
                <span class="guest-card__meta-item">Total: <strong>${guest.totalActivities} aktivitas</strong></span>
                ${guest.sentInfo?.phone ? `<span class="meta-dot">•</span><span class="guest-card__meta-item">WA: <strong>${escapeHtml(guest.sentInfo.phone)}</strong></span>` : ''}
              </p>
            </div>
          </div>
        </div>
        ${wishQuoteHtml}
        <div class="guest-card__milestones">${milestoneBadges.join('')}</div>
        <div class="guest-card__tech">${techChips.join('')}</div>
        <div class="guest-card__timeline" style="display: none;">
          <div class="guest-timeline-header">
            <span class="timeline-title">Riwayat Lengkap Interaksi:</span>
            ${isGuest ? `<button type="button" class="filter-guest-btn" data-name="${escapeHtml(guest.guestName)}"><span class="material-symbols-outlined" style="font-size: 14px;">filter_alt</span>Filter di Semua Log</button>` : ''}
          </div>
          <div class="guest-timeline-items">${timelineItemsHtml}</div>
        </div>
      </div>
    `;
  };

  const scrollToTopSection = () => {
    const cardEl = document.getElementById('activityListCard') || activityList;
    if (!cardEl) return;
    const targetY = cardEl.getBoundingClientRect().top + window.pageYOffset - 85;
    window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
  };

  const updateFilterIndicator = () => {
    const isFiltered = Boolean(
      searchQuery ||
        activeTag !== 'all' ||
        (eventSelect && eventSelect.value !== 'all') ||
        (timeRangeSelect && timeRangeSelect.value !== 'all')
    );
    if (!filterIndicator) return;
    filterIndicator.style.display = isFiltered ? 'flex' : 'none';
    if (filterIndicatorText) {
      filterIndicatorText.textContent = `Menampilkan hasil filter${searchQuery ? ` untuk "${searchQuery}"` : ''}`;
    }
  };

  const updatePaginationControls = (currentPage: number, totalPages: number) => {
    if (!pageNumbers || !prevBtn || !nextBtn) return;

    pageNumbers.innerHTML = '';
    if (totalPages <= 1) {
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;

    const goToPage = (nextPage: number) => {
      if (viewMode === 'timeline') fetchActivities(nextPage, true);
      else fetchGuests(nextPage, true);
    };

    prevBtn.onclick = () => {
      if (currentPage > 1) goToPage(currentPage - 1);
    };
    nextBtn.onclick = () => {
      if (currentPage < totalPages) goToPage(currentPage + 1);
    };

    const appendBtn = (num: number) => {
      const btn = document.createElement('button');
      btn.className = `pagination-num${num === currentPage ? ' pagination-num--active' : ''}`;
      btn.textContent = String(num);
      btn.onclick = () => goToPage(num);
      pageNumbers.appendChild(btn);
    };

    const appendEllipsis = () => {
      const span = document.createElement('span');
      span.className = 'pagination-ellipsis';
      span.textContent = '...';
      pageNumbers.appendChild(span);
    };

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) appendBtn(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) appendBtn(i);
      appendEllipsis();
      appendBtn(totalPages);
    } else if (currentPage >= totalPages - 2) {
      appendBtn(1);
      appendEllipsis();
      for (let i = totalPages - 3; i <= totalPages; i++) appendBtn(i);
    } else {
      appendBtn(1);
      appendEllipsis();
      appendBtn(currentPage - 1);
      appendBtn(currentPage);
      appendBtn(currentPage + 1);
      appendEllipsis();
      appendBtn(totalPages);
    }
  };

  async function fetchSummary() {
    try {
      const res = await fetch(`/api/analytics/summary?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error('Failed to fetch summary');
      const data = (await res.json()) as SummaryResponse;

      const setText = (id: string, text: string) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };
      const setWidth = (id: string, percent: number) => {
        const el = document.getElementById(id) as HTMLElement | null;
        if (el) el.style.width = `${percent}%`;
      };

      setText('statTotalViews', Number(data.totalViews || 0).toLocaleString('id-ID'));
      setText('statTotalInteractions', Number(data.totalEvents || 0).toLocaleString('id-ID'));
      setText('statTotalIdentified', Number(data.totalIdentifiedGuests || 0).toLocaleString('id-ID'));
      setText('statVendorLeads', Number(data.interactionStats?.vendorLeads || 0).toLocaleString('id-ID'));

      setText('funnelCoverVal', `${data.funnel?.coverOpenRate || 0}%`);
      setWidth('funnelCoverBar', data.funnel?.coverOpenRate || 0);
      setText('funnelCoverDesc', `${data.interactionStats?.openCover || 0} dari ${data.totalViews || 0} pengunjung buka amplop`);

      setText('funnelRsvpVal', `${data.funnel?.rsvpRate || 0}%`);
      setWidth('funnelRsvpBar', data.funnel?.rsvpRate || 0);
      setText('funnelRsvpDesc', `${data.rsvpStats?.totalRsvp || 0} tamu telah mengisi RSVP`);

      setText('funnelEngageVal', `${data.funnel?.engagementRate || 0}%`);
      setWidth('funnelEngageBar', Math.min(100, data.funnel?.engagementRate || 0));
      const avg = data.totalViews && data.totalViews > 0 ? ((data.totalEvents || 0) / data.totalViews).toFixed(1) : '0';
      setText('funnelEngageDesc', `Rata-rata ${avg} aksi per pengunjung`);

      const waItem = document.getElementById('funnelWaItem');
      if (data.funnel?.totalSent && data.funnel.totalSent > 0 && waItem) {
        waItem.style.display = 'flex';
        setText('funnelWaVal', `${data.funnel.openRate || 0}%`);
        setWidth('funnelWaBar', data.funnel.openRate || 0);
        setText('funnelWaDesc', `${data.funnel.totalOpenedSent || 0} dari ${data.funnel.totalSent} tamu WA telah membuka`);
      }

      const statsMap: Record<string, number | undefined> = {
        cardStatCover: data.interactionStats?.openCover,
        cardStatMaps: data.interactionStats?.clickMaps,
        cardStatCalendar: data.interactionStats?.clickCalendar,
        cardStatGift: data.interactionStats?.copyGift,
        cardStatMusic: data.interactionStats?.playMusic,
        cardStatVideo: data.interactionStats?.playVideo,
        cardStatGallery: data.interactionStats?.viewGallery,
        cardStatRsvp: data.interactionStats?.clickRsvp,
        cardStatParticipant: data.interactionStats?.clickParticipant,
        cardStatCoupleIg: data.interactionStats?.clickCoupleInstagram,
        cardStatVendorWa: data.interactionStats?.clickVendorWhatsApp,
        cardStatVendorIg: data.interactionStats?.clickVendorInstagram,
        cardStatVendorSite: data.interactionStats?.clickVendorSite
      };

      if ((data.interactionStats?.clickParticipant || 0) > 0) {
        const wrap = document.getElementById('cardParticipantWrapper');
        if (wrap) wrap.style.display = 'flex';
      }
      if ((data.interactionStats?.clickCoupleInstagram || 0) > 0) {
        const wrap = document.getElementById('cardCoupleIgWrapper');
        if (wrap) wrap.style.display = 'flex';
      }

      for (const [id, val] of Object.entries(statsMap)) {
        setText(id, String(val ?? 0));
      }

      setWidth('barDeviceMobile', data.deviceStats?.mobilePercent || 0);
      setWidth('barDeviceDesktop', data.deviceStats?.desktopPercent || 0);
      setWidth('barDeviceTablet', data.deviceStats?.tabletPercent || 0);

      setText('lblDeviceMobile', `${data.deviceStats?.mobilePercent || 0}% (${data.deviceStats?.mobile || 0})`);
      setText('lblDeviceDesktop', `${data.deviceStats?.desktopPercent || 0}% (${data.deviceStats?.desktop || 0})`);
      setText('lblDeviceTablet', `${data.deviceStats?.tabletPercent || 0}% (${data.deviceStats?.tablet || 0})`);

      const browserList = document.getElementById('browserTagList');
      if (browserList) {
        browserList.innerHTML = data.browserStats?.length
          ? data.browserStats
              .slice(0, 8)
              .map((b) => `<span class="browser-tag">${escapeHtml(b.browser)} <span class="browser-tag__count">${b.count}</span></span>`)
              .join('')
          : '';
      }

      setText('tagAllCount', `(${data.totalActivities || 0})`);
      setText('tagIdentifiedCount', `(${data.totalIdentifiedGuests || 0})`);
      setText('tagInteraksiCount', `(${data.totalEvents || 0})`);
      setText('tagRsvpCount', `(${data.rsvpStats?.totalRsvp || 0})`);
      setText('tagVendorCount', `(${data.interactionStats?.vendorLeads || 0})`);
      setText('tagKunjunganCount', `(${data.totalViews || 0})`);
      setText('badgeTotalTimeline', String(data.totalActivities || 0));
      setText('badgeTotalGuests', String(data.totalIdentifiedGuests || 0));

      if (data.chartRawData) {
        chartController.updateData(data.chartRawData);
      }
    } catch (err) {
      console.error('Error fetching analytics summary:', err);
    }
  }

  let activitiesRequestId = 0;
  let guestsRequestId = 0;

  async function fetchActivities(page = 1, scrollToTop = false) {
    const reqId = ++activitiesRequestId;
    currentTimelinePage = page;
    if (activityList) activityList.innerHTML = renderSkeletonHtml(3);

    const params = new URLSearchParams({
      slug,
      page: String(page),
      category: activeTag,
      tag: activeTag,
      eventType: eventSelect?.value || 'all',
      event: eventSelect?.value || 'all',
      search: searchQuery,
      timeRange: timeRangeSelect?.value || 'all'
    });

    try {
      const res = await fetch(`/api/analytics/activities?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch activities');
      const data = await res.json();
      if (reqId !== activitiesRequestId) return;

      totalTimelinePages = data.totalPages || data.pagination?.totalPages || 1;

      if (data.tagCounts) {
        const tagMap: Record<string, number | undefined> = {
          tagAllCount: data.tagCounts.all,
          tagIdentifiedCount: data.tagCounts.identified,
          tagInteraksiCount: data.tagCounts.interaksi,
          tagRsvpCount: data.tagCounts.rsvp,
          tagVendorCount: data.tagCounts.vendor,
          tagKunjunganCount: data.tagCounts.kunjungan
        };
        for (const [id, count] of Object.entries(tagMap)) {
          const el = document.getElementById(id);
          if (el) el.textContent = `(${count || 0})`;
        }
      }

      if (!activityList) return;
      activityList.innerHTML =
        !data.items || data.items.length === 0
          ? renderEmptyStateHtml('inbox', 'Tidak Ada Aktivitas Sesuai Filter', 'Coba ubah kata kunci pencarian atau sesuaikan opsi filter.')
          : (data.items as ActivityItem[]).map(renderTimelineRow).join('');

      updatePaginationControls(currentTimelinePage, totalTimelinePages);
      updateFilterIndicator();
      if (scrollToTop) scrollToTopSection();
    } catch (err) {
      if (reqId !== activitiesRequestId) return;
      console.error('Error fetching activities:', err);
      if (activityList) {
        activityList.innerHTML = renderEmptyStateHtml('error', 'Gagal Memuat Data', 'Terjadi kendala saat mengambil data aktivitas. Silakan coba tombol perbarui.', true);
      }
    }
  }

  async function fetchGuests(page = 1, scrollToTop = false) {
    const reqId = ++guestsRequestId;
    currentGuestsPage = page;
    if (guestJourneyList) guestJourneyList.innerHTML = renderSkeletonHtml(2);

    const params = new URLSearchParams({
      slug,
      page: String(page),
      search: searchQuery,
      timeRange: timeRangeSelect?.value || 'all'
    });

    try {
      const res = await fetch(`/api/analytics/guests?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch guests');
      const data = await res.json();
      if (reqId !== guestsRequestId) return;

      totalGuestsPages = data.totalPages || data.pagination?.totalPages || 1;

      if (!guestJourneyList) return;
      guestJourneyList.innerHTML =
        !data.items || data.items.length === 0
          ? renderEmptyStateHtml('group_off', 'Tidak Ada Tamu Sesuai Filter', 'Coba ubah kata kunci pencarian atau sesuaikan rentang waktu.')
          : (data.items as GuestJourneyItem[]).map(renderGuestCard).join('');

      updatePaginationControls(currentGuestsPage, totalGuestsPages);
      updateFilterIndicator();
      if (scrollToTop) scrollToTopSection();
    } catch (err) {
      if (reqId !== guestsRequestId) return;
      console.error('Error fetching guests:', err);
      if (guestJourneyList) {
        guestJourneyList.innerHTML = renderEmptyStateHtml('error', 'Gagal Memuat Tamu', 'Terjadi kendala saat mengambil data tamu. Silakan coba lagi.', true);
      }
    }
  }

  const switchViewMode = (mode: 'timeline' | 'guests') => {
    viewMode = mode;
    const isTimeline = mode === 'timeline';
    viewModeTimelineBtn?.classList.toggle('view-switch-btn--active', isTimeline);
    viewModeGuestsBtn?.classList.toggle('view-switch-btn--active', !isTimeline);
    if (activityList) activityList.style.display = isTimeline ? 'flex' : 'none';
    if (guestJourneyList) guestJourneyList.style.display = isTimeline ? 'none' : 'flex';
    if (tagRow) tagRow.style.display = isTimeline ? 'flex' : 'none';
    if (eventFilterWrapper) eventFilterWrapper.style.display = isTimeline ? 'block' : 'none';

    if (isTimeline) fetchActivities(1);
    else fetchGuests(1);
  };

  const syncActiveCardState = (selectedEvent: string) => {
    interactionCards.forEach((card) => {
      const filter = card.getAttribute('data-filter');
      card.classList.toggle('is-active', Boolean(selectedEvent && filter === selectedEvent && selectedEvent !== 'all'));
    });
  };

  // Single delegated handler covers dynamic guest cards without re-binding listeners per page load.
  guestJourneyList?.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const copyBtn = target.closest<HTMLElement>('.copy-guest-link-btn');
    if (copyBtn) {
      event.stopPropagation();
      const link = copyBtn.getAttribute('data-link') || '';
      const name = copyBtn.getAttribute('data-name') || 'Tamu';
      if (!link) return;
      try {
        await copyTextToClipboard(link);
        if (window.showToast) {
          window.showToast({ type: 'success', message: `Tautan personal untuk ${name} berhasil disalin ke clipboard!` });
        } else {
          alert(`Tautan untuk ${name} berhasil disalin!`);
        }
      } catch {
        window.showToast?.({ type: 'error', message: 'Gagal menyalin link' });
      }
      return;
    }

    const filterBtn = target.closest<HTMLElement>('.filter-guest-btn');
    if (filterBtn) {
      event.stopPropagation();
      const name = filterBtn.getAttribute('data-name') || '';
      if (searchInput) searchInput.value = name;
      searchQuery = name.toLowerCase();
      if (clearSearchBtn) clearSearchBtn.style.display = 'flex';
      switchViewMode('timeline');
      return;
    }

    if (target.closest('.guest-card__timeline') || target.closest('.action-icon-btn')) return;

    const card = target.closest<HTMLElement>('.guest-card');
    if (!card) return;
    const timeline = card.querySelector<HTMLElement>('.guest-card__timeline');
    if (!timeline) return;

    const nextExpanded = timeline.style.display === 'none';
    timeline.style.display = nextExpanded ? 'block' : 'none';
    card.querySelector('.guest-card__toggle-btn')?.setAttribute('aria-expanded', String(nextExpanded));
    const toggleText = card.querySelector('.toggle-text');
    if (toggleText) toggleText.textContent = nextExpanded ? 'Tutup' : 'Detail';
    card.classList.toggle('guest-card--expanded', nextExpanded);
  });

  viewModeTimelineBtn?.addEventListener('click', () => switchViewMode('timeline'));
  viewModeGuestsBtn?.addEventListener('click', () => switchViewMode('guests'));

  tagButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tagButtons.forEach((b) => b.classList.remove('activity-tag--active'));
      btn.classList.add('activity-tag--active');
      activeTag = btn.getAttribute('data-tag') || 'all';
      fetchActivities(1);
    });
  });

  interactionCards.forEach((card) => {
    const handleFilterClick = () => {
      const filterVal = card.getAttribute('data-filter');
      if (!filterVal || !eventSelect) return;

      eventSelect.value = eventSelect.value === filterVal ? 'all' : filterVal;
      syncActiveCardState(eventSelect.value);

      if (viewMode !== 'timeline') switchViewMode('timeline');
      else fetchActivities(1);

      document.getElementById('activityListCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    card.addEventListener('click', handleFilterClick);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleFilterClick();
      }
    });
  });

  eventSelect?.addEventListener('change', () => {
    syncActiveCardState(eventSelect.value);
    fetchActivities(1);
  });

  timeRangeSelect?.addEventListener('change', () => {
    if (viewMode === 'timeline') fetchActivities(1);
    else fetchGuests(1);
  });

  searchInput?.addEventListener('input', () => {
    const val = searchInput.value.trim();
    searchQuery = val.toLowerCase();
    if (clearSearchBtn) clearSearchBtn.style.display = val ? 'flex' : 'none';

    window.clearTimeout(searchTimeout);
    searchTimeout = window.setTimeout(() => {
      if (viewMode === 'timeline') fetchActivities(1);
      else fetchGuests(1);
    }, 300);
  });

  clearSearchBtn?.addEventListener('click', () => {
    if (!searchInput) return;
    window.clearTimeout(searchTimeout);
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    if (viewMode === 'timeline') fetchActivities(1);
    else fetchGuests(1);
    searchInput.focus();
  });

  resetFiltersBtn?.addEventListener('click', () => {
    window.clearTimeout(searchTimeout);
    if (searchInput) searchInput.value = '';
    searchQuery = '';
    if (clearSearchBtn) clearSearchBtn.style.display = 'none';
    if (timeRangeSelect) timeRangeSelect.value = 'all';
    if (eventSelect) eventSelect.value = 'all';
    syncActiveCardState('all');
    activeTag = 'all';
    tagButtons.forEach((b) => b.classList.remove('activity-tag--active'));
    document.getElementById('tagAll')?.classList.add('activity-tag--active');

    if (viewMode === 'timeline') fetchActivities(1);
    else fetchGuests(1);
  });

  refreshBtn?.addEventListener('click', () => {
    const icon = refreshBtn.querySelector('.refresh-icon');
    icon?.classList.add('refresh-icon--spin');
    window.showToast?.({ type: 'info', message: 'Memperbarui data aktivitas...' });
    fetchSummary();
    if (viewMode === 'timeline') fetchActivities(currentTimelinePage);
    else fetchGuests(currentGuestsPage);
    window.setTimeout(() => icon?.classList.remove('refresh-icon--spin'), 600);
  });

  exportBtn?.addEventListener('click', async () => {
    const xlsx = window.XLSX;
    if (!xlsx) {
      window.showToast?.({ type: 'info', message: 'Modul export sedang dimuat, silakan coba sesaat lagi.' });
      return;
    }

    exportBtn.disabled = true;
    window.showToast?.({ type: 'info', message: 'Menyiapkan data ekspor Excel...' });

    try {
      const res = await fetch(`/api/analytics/export?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error('Failed to export data');
      const data = await res.json();

      if (!data.items || data.items.length === 0) {
        window.showToast?.({ type: 'warning', message: 'Tidak ada data aktivitas untuk diekspor.' });
        return;
      }

      const rows: Array<Array<string | number>> = [
        ['No', 'Nama Tamu', 'Tipe', 'Status RSVP', 'Aktivitas', 'Keterangan / Target', 'Perangkat / Browser', 'Lokasi', 'Waktu (WITA)']
      ];

      (data.items as Array<Record<string, unknown>>).forEach((it, index) => {
        rows.push([
          index + 1,
          String(it.guestName || ''),
          it.isGuest ? 'Tamu Terdaftar' : 'Anonim',
          String(it.rsvpStatus || ''),
          String(it.activity || ''),
          String(it.detail || ''),
          String(it.device || ''),
          String(it.location || ''),
          formatFullDate(String(it.createdAt || ''))
        ]);
      });

      const ws = xlsx.utils.aoa_to_sheet(rows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Semua Log Aktivitas');
      xlsx.writeFile(wb, `Laporan_Aktivitas_${slug}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      window.showToast?.({ type: 'success', message: 'Data aktivitas berhasil diunduh ke Excel.' });
    } catch (err) {
      console.error('Export error:', err);
      window.showToast?.({ type: 'error', message: 'Gagal mengekspor data ke Excel.' });
    } finally {
      exportBtn.disabled = false;
    }
  });

  const urlParams = new URLSearchParams(window.location.search);
  const initialEvent = urlParams.get('filter') || urlParams.get('event') || urlParams.get('eventType');
  if (initialEvent && eventSelect) {
    const optionExists = Array.from(eventSelect.options).some((opt) => opt.value === initialEvent);
    if (optionExists) {
      eventSelect.value = initialEvent;
      syncActiveCardState(initialEvent);
    }
  }

  fetchSummary();
  fetchActivities(1);

  if (initialEvent || window.location.hash === '#activityListCard') {
    window.setTimeout(() => {
      document.getElementById('activityListCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAktivitasPage);
} else {
  initAktivitasPage();
}
