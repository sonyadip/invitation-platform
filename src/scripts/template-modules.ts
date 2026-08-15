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
    if ((btn as HTMLElement).dataset.bound === 'true') return;
    (btn as HTMLElement).dataset.bound = 'true';

    btn.addEventListener('click', async () => {
      const value = btn.getAttribute('data-value') || '';
      const textSpan = btn.querySelector('span');
      const originalText = textSpan?.textContent || 'Salin';

      try {
        await navigator.clipboard.writeText(value);
        btn.classList.add('is-copied');
        if (textSpan) textSpan.textContent = 'Tersalin';
        setTimeout(() => {
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
    await import('glightbox/dist/css/glightbox.min.css');
    const GLightbox = (await import('glightbox')).default;
    
    GLightbox({
      selector: `[data-fancybox="${groupName}"], [data-fancybox="gallery-section"], [data-fancybox]`,
      touchNavigation: true,
      loop: true,
      zoomable: true,
      draggable: true
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

    video.addEventListener('play', () => {
      player.classList.add('is-playing');
      video.controls = true;
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
