import { sendAnalyticsEvent } from './analytics';

export function initCountdown(root: Element | Document = document) {
  const timer = root.querySelector('[data-countdown-timer]');
  if (!(timer instanceof HTMLElement)) return;

  const targetDate = new Date(timer.dataset.date || '').getTime();
  const days = timer.querySelector('[data-countdown-days]');
  const hours = timer.querySelector('[data-countdown-hours]');
  const minutes = timer.querySelector('[data-countdown-minutes]');
  const seconds = timer.querySelector('[data-countdown-seconds]');
  const pad = (num: number) => String(num).padStart(2, '0');
  const setText = (el: Element | null, value: string) => {
    if (el) el.textContent = value;
  };

  const update = () => {
    const difference = targetDate - Date.now();
    if (!Number.isFinite(targetDate) || difference <= 0) {
      setText(days, '00');
      setText(hours, '00');
      setText(minutes, '00');
      setText(seconds, '00');
      if (typeof window !== 'undefined' && (window as any)._countdownIntervalIds) {
        clearInterval((window as any)._countdownIntervalIds[timer.dataset.date || '']);
      }
      return;
    }

    setText(days, pad(Math.floor(difference / (1000 * 60 * 60 * 24))));
    setText(hours, pad(Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))));
    setText(minutes, pad(Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))));
    setText(seconds, pad(Math.floor((difference % (1000 * 60)) / 1000)));
  };

  const intervalId = setInterval(update, 1000);
  if (typeof window !== 'undefined') {
    (window as any)._countdownIntervalIds = (window as any)._countdownIntervalIds || {};
    (window as any)._countdownIntervalIds[timer.dataset.date || ''] = intervalId;
  }
  update();
}

function copyTextToClipboard(text: string): boolean {
  if (navigator.clipboard && window.isSecureContext && document.hasFocus()) {
    navigator.clipboard.writeText(text).catch(() => {
      fallbackCopy(text);
    });
    return true;
  }
  return fallbackCopy(text);
}

function fallbackCopy(text: string): boolean {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copy failed:', err);
    return false;
  }
}

export function initGiftInteractions(root: Element | Document = document) {
  const giftToggle = root.querySelector('[data-gift-toggle]');
  const giftGrid = root.querySelector('[data-gift-grid]');
  const copyBtns = root.querySelectorAll('[data-copy-btn]') || [];

  if (giftToggle instanceof HTMLButtonElement && giftGrid instanceof HTMLElement) {
    if (giftToggle.dataset.bound !== 'true') {
      giftToggle.dataset.bound = 'true';
      giftToggle.addEventListener('click', () => {
        if (!(giftGrid instanceof HTMLElement)) return;
        const isHidden = giftGrid.hasAttribute('hidden');
        const span = giftToggle.querySelector('span');
        if (isHidden) {
          giftGrid.removeAttribute('hidden');
          giftGrid.classList.add('is-open');
          giftGrid.querySelectorAll('[data-animate]').forEach((item) => item.classList.add('is-animated'));
          giftToggle.setAttribute('aria-expanded', 'true');
          if (span) span.textContent = 'Sembunyikan Hadiah Pernikahan';
          else giftToggle.textContent = 'Sembunyikan Hadiah Pernikahan';
        } else {
          giftGrid.setAttribute('hidden', '');
          giftGrid.classList.remove('is-open');
          giftToggle.setAttribute('aria-expanded', 'false');
          if (span) span.textContent = 'Lihat Hadiah Pernikahan';
          else giftToggle.textContent = 'Lihat Hadiah Pernikahan';
        }
      });
    }
  }

  copyBtns.forEach((btn) => {
    if (!(btn instanceof HTMLElement)) return;
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';

    let timeoutId: number | undefined;

    btn.addEventListener('click', () => {
      const value = btn.getAttribute('data-value') || '';
      const textSpan = btn.querySelector('.gift-btn__text') || btn.querySelector('span:last-of-type') || btn.querySelector('span');
      
      if (!btn.dataset.originalText && textSpan?.textContent) {
        btn.dataset.originalText = textSpan.textContent.trim();
      }
      const originalText = btn.dataset.originalText || 'Salin';

      try {
        copyTextToClipboard(value);

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        btn.classList.remove('is-copied');
        void btn.offsetWidth; // force reflow for smooth animation replay
        btn.classList.add('is-copied');

        if (textSpan) textSpan.textContent = 'Tersalin';

        timeoutId = window.setTimeout(() => {
          btn.classList.remove('is-copied');
          if (textSpan) textSpan.textContent = originalText;
        }, 1800);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    });
  });
}

export async function initGalleryLightbox(root: Element | Document = document, groupName: string = 'gallery-section') {
  try {
    await import('@fancyapps/ui/dist/fancybox/fancybox.css');
    await import('../styles/fancybox-custom.scss');
    const { Fancybox } = await import('@fancyapps/ui');

    const container = root instanceof HTMLElement ? root : document.body;
    const selector = `[data-fancybox="${groupName}"], [data-fancybox="gallery-section"], [data-fancybox]`;

    try {
      Fancybox.unbind(container, selector);
    } catch (_) {}

    let lastTrackedSlideIndex = -1;
    let lastSlideTrackTime = 0;

    const trackSlideView = (slide: any, index: number, action: string) => {
      const now = Date.now();
      if (lastTrackedSlideIndex === index && now - lastSlideTrackTime < 800) return;
      lastTrackedSlideIndex = index;
      lastSlideTrackTime = now;
      try {
        sendAnalyticsEvent('view_gallery', {
          metadata: {
            action,
            slideIndex: index,
            src: String(slide?.src || slide?.thumb || '').slice(0, 150)
          }
        });
      } catch (_) {}
    };

    Fancybox.bind(container, selector, {
      groupAll: false,
      placeFocusBack: false,
      Fullscreen: false,
      Toolbar: {
        display: {
          left: ['counter'],
          right: ['close'],
        },
      },
      Thumbs: {
        showOnStart: true,
        type: 'classic',
      },
      Carousel: {
        infinite: true,
        friction: 0.84,
        plugins: {
          Fullscreen: null as any,
        },
      },
      Images: {
        zoom: true,
      },
      on: {
        'ready': (fancybox: any) => {
          const slide = fancybox.getSlide ? fancybox.getSlide() : null;
          const index = (fancybox.pageIndex ?? fancybox.page ?? 0) + 1;
          trackSlideView(slide, index, 'open_lightbox');
        },
        'Carousel.change': (_fancybox: any, carousel: any, to: number) => {
          const slide = carousel?.slides ? carousel.slides[to] : null;
          trackSlideView(slide, to + 1, 'slide_change');
        },
        'close': () => {
          lastTrackedSlideIndex = -1;
        }
      }
    });
  } catch (error) {
    console.error('Failed to initialize gallery lightbox:', error);
  }
}

export function initVideoPlayers(root: Element | Document = document) {
  const players = Array.from(root.querySelectorAll('[data-template-video]') || []);
  if (!players.length) return;

  players.forEach((player) => {
    if ((player as HTMLElement).dataset.bound === 'true') return;
    (player as HTMLElement).dataset.bound = 'true';

    const video = player.querySelector('video');
    const playBtn = player.querySelector('[data-template-video-play]');
    if (!(player instanceof HTMLElement) || !(video instanceof HTMLVideoElement) || !(playBtn instanceof HTMLButtonElement)) return;

    const showPosterState = () => {
      player.classList.remove('is-playing');
      video.controls = false;
    };

    playBtn.addEventListener('click', () => {
      video.controls = true;
      video.play().catch(showPosterState);
    });

    let lastPlayTrackTime = 0;
    video.addEventListener('play', () => {
      player.classList.add('is-playing');
      video.controls = true;
      const now = Date.now();
      if (now - lastPlayTrackTime > 2000) {
        lastPlayTrackTime = now;
        try {
          sendAnalyticsEvent('play_video', {
            metadata: { src: video.currentSrc || video.src || '' }
          });
        } catch (_) {}
      }
    });
    video.addEventListener('pause', showPosterState);
    video.addEventListener('ended', showPosterState);
  });
}

export function initRevealAnimations(root: Element | Document = document) {
  const animatedItems = Array.from(root.querySelectorAll('[data-animate]') || []);
  if (!animatedItems.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    animatedItems.forEach((item) => item.classList.add('is-animated'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-animated');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.04,
    rootMargin: '0px 0px -8% 0px'
  });

  animatedItems.forEach((item, index) => {
    if (item instanceof HTMLElement) {
      if (!item.style.getPropertyValue('--animate-delay')) {
        // Assign default stagger if not set by template
        item.style.setProperty('--animate-delay', `${Math.min(index % 3, 2) * 150}ms`);
      }
    }
    observer.observe(item);
  });
}

export function initBackgroundAudioHandler(
  song: HTMLAudioElement | null | undefined,
  audioBtn?: HTMLElement | null,
  getIsPlaying?: () => boolean,
  setIsPlaying?: (playing: boolean) => void
) {
  if (!song || typeof document === 'undefined') return;

  let wasPlayingBeforeHidden = false;
  let lastAudioPlayTrackTime = 0;
  let lastAudioPauseTrackTime = 0;

  song.addEventListener('play', () => {
    const now = Date.now();
    if (now - lastAudioPlayTrackTime > 250) {
      lastAudioPlayTrackTime = now;
      try {
        sendAnalyticsEvent('play_music');
      } catch (_) {}
    }
  });

  song.addEventListener('pause', () => {
    if (!document.hidden) {
      const now = Date.now();
      if (now - lastAudioPauseTrackTime > 250) {
        lastAudioPauseTrackTime = now;
        try {
          sendAnalyticsEvent('pause_music');
        } catch (_) {}
      }
    }
  });

  const handleVisibilityChange = () => {
    if (document.hidden) {
      if (!song.paused) {
        wasPlayingBeforeHidden = true;
        song.pause();
        audioBtn?.classList.remove('audio-toggle--playing');
      }
    } else {
      if (wasPlayingBeforeHidden) {
        wasPlayingBeforeHidden = false;
        song.play().catch(() => {});
        audioBtn?.classList.add('audio-toggle--playing');
      }
    }
  };

  const handlePageHide = () => {
    if (!song.paused) {
      song.pause();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide);
  window.addEventListener('blur', () => {
    // Optional additional safeguard for iframe/window focus loss if needed
  });
}
