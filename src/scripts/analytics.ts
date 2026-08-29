export type EventType =
  | 'open_cover'
  | 'click_maps'
  | 'click_calendar'
  | 'copy_gift'
  | 'play_music'
  | 'click_wishes'
  | 'click_couple_instagram'
  | 'click_vendor_whatsapp'
  | 'click_vendor_instagram'
  | 'click_vendor_site';

interface TrackEventOptions {
  weddingId?: string;
  guestName?: string | null;
  metadata?: Record<string, any>;
}

export function sendAnalyticsEvent(eventType: EventType, options: TrackEventOptions = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const weddingId = options.weddingId || document.body.dataset.weddingId || '';
  if (!weddingId || weddingId.startsWith('preview-')) return;

  const guestName = options.guestName ?? document.body.dataset.guestName ?? null;

  const payload = {
    weddingId,
    eventType,
    guestName,
    metadata: {
      ...options.metadata,
      path: window.location.pathname,
      timestamp: new Date().toISOString()
    }
  };

  try {
    const payloadStr = JSON.stringify(payload);
    // Use navigator.sendBeacon if available for non-blocking dispatch
    if (navigator.sendBeacon) {
      const blob = new Blob([payloadStr], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/track', blob);
    } else {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadStr,
        keepalive: true
      }).catch(() => {});
    }
  } catch (err) {
    // Fail silently so user experience is never interrupted
  }
}

let trackingInitialized = false;

export function initAutomaticInteractionTracking() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (trackingInitialized) return;
  trackingInitialized = true;

  const weddingId = document.body.dataset.weddingId;
  if (!weddingId || weddingId.startsWith('preview-')) return;

  let coverOpenedTracked = false;

  // Track user click events on key elements
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // 1. Cover open button
    const openBtn = target.closest('[data-template-open]');
    if (openBtn && !coverOpenedTracked) {
      coverOpenedTracked = true;
      sendAnalyticsEvent('open_cover');
      return;
    }

    // 2. Google Maps link click
    const mapsLink = target.closest('a[href*="google.com/maps"], a[href*="maps.app.goo.gl"], a[href*="goo.gl/maps"], [data-track-maps]');
    if (mapsLink) {
      sendAnalyticsEvent('click_maps', {
        metadata: { href: (mapsLink as HTMLAnchorElement).href }
      });
      return;
    }

    // 3. Google Calendar / Calendar link click
    const calLink = target.closest('a[href*="calendar.google.com"], [data-track-calendar]');
    if (calLink) {
      sendAnalyticsEvent('click_calendar', {
        metadata: { href: (calLink as HTMLAnchorElement).href }
      });
      return;
    }

    // 4. Gift account copy button
    const copyBtn = target.closest('[data-copy-btn]');
    if (copyBtn) {
      const value = copyBtn.getAttribute('data-value') || '';
      sendAnalyticsEvent('copy_gift', {
        metadata: { target: value.slice(0, 50) }
      });
      return;
    }

    // 5. Vendor / Platform WhatsApp (Pemilik Jasa / Pesan Undangan)
    const vendorWaLink = target.closest('[data-track-vendor-whatsapp], .thankyou-section__socials a[aria-label="WhatsApp"], .thankyou-section a[aria-label="WhatsApp"], .thankyou-section a[href*="wa.me"], .thankyou-section a[href*="whatsapp.com"], a[href*="wa.me"][href*="Senadda"], a[href*="whatsapp.com"][href*="Senadda"]');
    if (vendorWaLink) {
      sendAnalyticsEvent('click_vendor_whatsapp', {
        metadata: { href: (vendorWaLink as HTMLAnchorElement).href }
      });
      return;
    }

    // 6. Vendor / Platform Instagram
    const vendorIgLink = target.closest('[data-track-vendor-instagram], .thankyou-section__socials a[aria-label="Instagram"], .thankyou-section a[aria-label="Instagram"], .thankyou-section a[href*="instagram.com"]');
    if (vendorIgLink) {
      sendAnalyticsEvent('click_vendor_instagram', {
        metadata: { href: (vendorIgLink as HTMLAnchorElement).href }
      });
      return;
    }

    // 7. Vendor / Platform Website
    const vendorSiteLink = target.closest('[data-track-vendor-site], .thankyou-section__socials a[aria-label="Website"], .thankyou-section a[aria-label="Website"], .thankyou-section a[href="/"], .thankyou-section a[href*="senadda"]');
    if (vendorSiteLink) {
      sendAnalyticsEvent('click_vendor_site', {
        metadata: { href: (vendorSiteLink as HTMLAnchorElement).href }
      });
      return;
    }

    // 8. Couple Instagram link (Pengantin Pria / Wanita)
    const coupleIgLink = target.closest('[data-track-couple-instagram], .person-card__social, .couple-section__social, .couple-swiss a[href*="instagram.com"], .couple-section a[href*="instagram.com"]');
    if (coupleIgLink) {
      const role = coupleIgLink.getAttribute('data-track-couple-instagram') || 'couple';
      sendAnalyticsEvent('click_couple_instagram', {
        metadata: {
          href: (coupleIgLink as HTMLAnchorElement).href,
          role
        }
      });
      return;
    }
  }, { passive: true });
}
