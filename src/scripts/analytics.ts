export type EventType =
  | 'open_cover'
  | 'click_maps'
  | 'click_calendar'
  | 'copy_gift'
  | 'play_music'
  | 'pause_music'
  | 'play_video'
  | 'click_wishes'
  | 'click_rsvp'
  | 'view_gallery'
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
    // Use immediate fetch with keepalive for instantaneous tracking
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payloadStr,
      keepalive: true
    }).catch(() => {
      if (navigator.sendBeacon) {
        const blob = new Blob([payloadStr], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics/track', blob);
      }
    });
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
  let galleryClickCount = 0;
  let lastGalleryTrackTime = 0;
  let lastVideoTrackTime = 0;
  let lastRsvpTrackTime = 0;
  let lastWishTrackTime = 0;

  // Track user click events on key elements (using capture phase to intercept before 3rd party plugins stop propagation)
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

    // 4. Google Calendar / Calendar link click
    const calLink = target.closest('a[href*="calendar.google.com"], [data-track-calendar]');
    if (calLink) {
      sendAnalyticsEvent('click_calendar', {
        metadata: { href: (calLink as HTMLAnchorElement).href }
      });
      return;
    }

    // 5. Gift account copy button
    const copyBtn = target.closest('[data-copy-btn]');
    if (copyBtn) {
      const value = copyBtn.getAttribute('data-value') || '';
      sendAnalyticsEvent('copy_gift', {
        metadata: { target: value.slice(0, 50) }
      });
      return;
    }

    // 6. Non-Lightbox Gallery Item Click Fallback (Fancybox lightbox is tracked directly via Fancybox events)
    const galleryEl = target.closest(
      '.gallery-item, [data-gallery-img], .gallery-card, .gallery-img, a[href*="gallery" i], a[href*="galeri" i], [data-nav*="gallery" i], [data-nav*="galeri" i]'
    );
    if (galleryEl && !target.closest('[data-fancybox], .fancybox__container, .f-button, .f-thumbs__slide')) {
      const now = Date.now();
      if (now - lastGalleryTrackTime > 400) {
        lastGalleryTrackTime = now;
        galleryClickCount++;
        const img = galleryEl.querySelector('img') || (galleryEl.tagName === 'IMG' ? galleryEl : null);
        const imgSrc = (img as HTMLImageElement)?.src || galleryEl.getAttribute('href') || galleryEl.getAttribute('data-src') || '';
        sendAnalyticsEvent('view_gallery', {
          metadata: { src: imgSrc.slice(0, 150) }
        });
      }
      return;
    }

    // 8. RSVP navigation / CTA / Form interaction click
    let isRsvpAction = false;
    const rsvpDirect = target.closest(
      'a[href*="rsvp" i], a[href*="RSVP"], [data-rsvp-trigger], [data-rsvp-submit], .rsvp-cta-btn, .rsvp-form__submit, [data-nav*="rsvp" i], [data-target*="rsvp" i], [data-section*="rsvp" i], .rsvp-nav, .nav-rsvp'
    );

    if (rsvpDirect) {
      isRsvpAction = true;
    } else {
      const clickable = target.closest('a, button, [role="button"], .nav-item, .nav-link, .menu-item, li');
      if (clickable) {
        const href = (clickable as HTMLAnchorElement).href || clickable.getAttribute('href') || '';
        const ariaLabel = clickable.getAttribute('aria-label') || '';
        const title = clickable.getAttribute('title') || '';
        const text = clickable.textContent || '';
        if (
          /rsvp|konfirmasi/i.test(href) ||
          /rsvp|konfirmasi/i.test(ariaLabel) ||
          /rsvp|konfirmasi/i.test(title) ||
          /^\s*rsvp\s*$/i.test(text.trim()) ||
          /konfirmasi\s+kehadiran/i.test(text)
        ) {
          isRsvpAction = true;
        }
      }

      if (!isRsvpAction) {
        const insideRsvp = target.closest('[data-rsvp-form], [data-rsvp-section], .rsvp-form, .rsvp-section');
        if (insideRsvp) {
          const interactive = target.closest('input, select, textarea, button, [data-rsvp-submit]');
          if (interactive) {
            isRsvpAction = true;
          }
        }
      }
    }

    if (isRsvpAction) {
      const now = Date.now();
      if (now - lastRsvpTrackTime > 400) {
        lastRsvpTrackTime = now;
        sendAnalyticsEvent('click_rsvp');
      }
      return;
    }

    // 9. Wishes / Ucapan / Pagination click
    let isWishAction = false;
    const wishDirect = target.closest('a[href*="wishes" i], a[href*="ucapan" i], a[href*="doa" i], [data-wish-btn], [data-wishes-next], [data-wishes-prev], [data-wishes-page], .wishes-pagination__btn, .wishes-pagination__num, .wishes-pagination button');
    if (wishDirect) {
      isWishAction = true;
    } else {
      const clickableWish = target.closest('a, button, [role="button"], .pagination-btn, .pagination-num');
      if (clickableWish) {
        const href = (clickableWish as HTMLAnchorElement).href || clickableWish.getAttribute('href') || '';
        const text = clickableWish.textContent || '';
        if (/wishes|ucapan|doa/i.test(href) || /ucapan|doa\s+restu|kirim\s+doa/i.test(text)) {
          isWishAction = true;
        }
      }
    }

    if (isWishAction) {
      const now = Date.now();
      if (now - lastWishTrackTime > 300) {
        lastWishTrackTime = now;
        sendAnalyticsEvent('click_wishes');
      }
      return;
    }

    // 9. Vendor / Platform WhatsApp (Pemilik Jasa / Pesan Undangan)
    const vendorWaLink = target.closest('[data-track-vendor-whatsapp], .thankyou-section__socials a[aria-label="WhatsApp"], .thankyou-section a[aria-label="WhatsApp"], .thankyou-section a[href*="wa.me"], .thankyou-section a[href*="whatsapp.com"], a[href*="wa.me"][href*="Senadda"], a[href*="whatsapp.com"][href*="Senadda"]');
    if (vendorWaLink) {
      sendAnalyticsEvent('click_vendor_whatsapp', {
        metadata: { href: (vendorWaLink as HTMLAnchorElement).href }
      });
      return;
    }

    // 10. Vendor / Platform Instagram
    const vendorIgLink = target.closest('[data-track-vendor-instagram], .thankyou-section__socials a[aria-label="Instagram"], .thankyou-section a[aria-label="Instagram"], .thankyou-section a[href*="instagram.com"]');
    if (vendorIgLink) {
      sendAnalyticsEvent('click_vendor_instagram', {
        metadata: { href: (vendorIgLink as HTMLAnchorElement).href }
      });
      return;
    }

    // 11. Vendor / Platform Website
    const vendorSiteLink = target.closest('[data-track-vendor-site], .thankyou-section__socials a[aria-label="Website"], .thankyou-section a[aria-label="Website"], .thankyou-section a[href="/"], .thankyou-section a[href*="senadda"]');
    if (vendorSiteLink) {
      sendAnalyticsEvent('click_vendor_site', {
        metadata: { href: (vendorSiteLink as HTMLAnchorElement).href }
      });
      return;
    }

    // 12. Couple Instagram link (Pengantin Pria / Wanita)
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
  }, { capture: true, passive: true });
}
