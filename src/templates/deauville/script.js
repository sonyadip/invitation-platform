const root = document.querySelector('body.template-deauville [data-template-root]');
const cover = root?.querySelector('[data-template-cover]');
const openBtn = root?.querySelector('[data-template-open]');
const song = root?.querySelector('[data-template-audio]');
const audioBtn = root?.querySelector('[data-template-audio-toggle]');
let isPlaying = false;

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

if (cover instanceof HTMLElement) {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  document.body.classList.add('template-no-scroll', 'template-cover-active');
}

openBtn?.addEventListener('click', () => {
  if (cover instanceof HTMLElement) {
    cover.classList.add('is-opening');
  }

  window.setTimeout(() => {
    if (cover instanceof HTMLElement) {
      cover.classList.remove('is-opening');
      cover.classList.add('is-opened');
    }

    document.body.classList.remove('template-no-scroll', 'template-cover-active');
    document.body.style.height = '';
    triggerOpeningAnimations();
  }, 1000);

  if (song instanceof HTMLAudioElement) {
    song.play().catch(() => { });
    audioBtn?.classList.add('audio-toggle--playing');
    isPlaying = true;
  }
});

if (audioBtn && song instanceof HTMLAudioElement) {
  audioBtn.addEventListener('click', () => {
    if (isPlaying) {
      song.pause();
      audioBtn.classList.remove('audio-toggle--playing');
    } else {
      song.play().catch(() => { });
      audioBtn.classList.add('audio-toggle--playing');
    }

    isPlaying = !isPlaying;
  });
}

function triggerOpeningAnimations() {
  const items = Array.from(root?.querySelectorAll('[data-opening-animate]') || []);
  if (!items.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  items.forEach((item, index) => {
    if (!(item instanceof HTMLElement)) return;
    item.classList.remove('is-animated');
    item.style.setProperty('--opening-delay', `${0.2 + (index * 0.35)}s`);
    if (reduceMotion) {
      item.classList.add('is-animated');
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        item.classList.add('is-animated');
      });
    });
  });
}

function initSliders() {
  const sliders = Array.from(root?.querySelectorAll('[data-template-slider]') || []);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  sliders.forEach((slider) => {
    const slides = Array.from(slider.querySelectorAll('.template-slide'));
    if (slides.length <= 1) return;

    let activeIndex = Math.max(slides.findIndex((slide) => slide.classList.contains('is-active')), 0);
    slides[activeIndex]?.classList.add('is-active');
    if (reduceMotion) return;

    setInterval(() => {
      slides[activeIndex]?.classList.remove('is-active');
      activeIndex = (activeIndex + 1) % slides.length;
      slides[activeIndex]?.classList.add('is-active');
    }, 3600);
  });
}

function initRevealAnimations() {
  const animatedItems = Array.from(root?.querySelectorAll('[data-animate]') || []);
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
      item.style.setProperty('--animate-delay', `${Math.min(index % 3, 2) * 140}ms`);
    }
    observer.observe(item);
  });
}

function initCountdown() {
  const timer = root?.querySelector('[data-countdown-timer]');
  if (!(timer instanceof HTMLElement)) return;

  const targetDate = new Date(timer.dataset.date || '').getTime();
  const days = timer.querySelector('[data-countdown-days]');
  const hours = timer.querySelector('[data-countdown-hours]');
  const minutes = timer.querySelector('[data-countdown-minutes]');
  const seconds = timer.querySelector('[data-countdown-seconds]');
  const pad = (num) => String(num).padStart(2, '0');
  const setText = (el, value) => {
    if (el) el.textContent = value;
  };

  const update = () => {
    const difference = targetDate - Date.now();
    if (!Number.isFinite(targetDate) || difference <= 0) {
      setText(days, '00');
      setText(hours, '00');
      setText(minutes, '00');
      setText(seconds, '00');
      clearInterval(intervalId);
      return;
    }

    setText(days, pad(Math.floor(difference / (1000 * 60 * 60 * 24))));
    setText(hours, pad(Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))));
    setText(minutes, pad(Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))));
    setText(seconds, pad(Math.floor((difference % (1000 * 60)) / 1000)));
  };

  const intervalId = setInterval(update, 1000);
  update();
}

async function initGalleryLightbox() {
  try {
    const { Fancybox } = await import('@fancyapps/ui');
    const galleryRoot = root instanceof Element ? root : document.body;
    Fancybox.bind(galleryRoot, '[data-fancybox="gallery-section"]');
  } catch (error) {
    console.error('Failed to initialize gallery lightbox:', error);
  }
}

function initVideoPlayers() {
  const players = Array.from(root?.querySelectorAll('[data-template-video]') || []);
  if (!players.length) return;

  players.forEach((player) => {
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

function getWishKey({ id, name, message, createdAt }) {
  return id ? String(id) : [createdAt || '', name || '', message || ''].join('|');
}

function getRenderedWishKeys(container) {
  return new Set(
    Array.from(container.querySelectorAll('[data-wish-key], [data-wish-id]'))
      .map((item) => item.getAttribute('data-wish-key') || item.getAttribute('data-wish-id'))
      .filter(Boolean)
  );
}

function createWishCard({ id, name, attendance, message, createdAt }) {
  const wishCard = document.createElement('article');
  wishCard.className = 'wish-card';
  if (id) wishCard.dataset.wishId = String(id);
  wishCard.dataset.wishKey = getWishKey({ id, name, message, createdAt });

  const header = document.createElement('div');
  header.className = 'wish-card__header';

  const meta = document.createElement('div');
  meta.className = 'wish-card__meta';

  const nameEl = document.createElement('span');
  nameEl.className = 'wish-card__name';
  nameEl.textContent = name;

  const badge = document.createElement('span');
  const isAttending = attendance === 'attending';
  badge.className = `wish-card__badge ${isAttending ? 'wish-card__badge--attend' : 'wish-card__badge--absent'}`;
  badge.textContent = isAttending ? 'Hadir' : 'Absen';

  const date = document.createElement('span');
  date.className = 'wish-card__date';
  date.textContent = new Date(createdAt || Date.now()).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const messageEl = document.createElement('p');
  messageEl.className = 'wish-card__message';
  messageEl.textContent = message;

  meta.append(nameEl, badge);
  header.append(meta, date);
  wishCard.append(header, messageEl);

  return wishCard;
}

function renderWishItems(wishesContainer, items, emptyState) {
  wishesContainer.querySelectorAll('.wish-card').forEach((card) => card.remove());

  if (emptyState instanceof HTMLElement) {
    emptyState.style.display = items.length ? 'none' : '';
  }

  const renderedKeys = new Set();
  let renderedCount = 0;

  items.forEach((wish) => {
    const wishKey = getWishKey({
      id: wish.id,
      name: wish.guest_name,
      message: wish.message || '',
      createdAt: wish.created_at
    });

    if (renderedKeys.has(wishKey)) return;

    wishesContainer.append(createWishCard({
      id: wish.id,
      name: wish.guest_name,
      attendance: wish.attendance_status,
      message: wish.message || '',
      createdAt: wish.created_at
    }));
    renderedKeys.add(wishKey);
    renderedCount += 1;
  });

  return renderedCount;
}

async function syncWishesFromServer({ weddingId, wishesContainer, emptyState, loadMoreBtn, limit, submittedItem = null }) {
  const response = await fetch(`/api/wishes?weddingId=${encodeURIComponent(weddingId)}&offset=0&limit=${limit}&_=${Date.now()}`, {
    cache: 'no-store'
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Gagal menyinkronkan ucapan.');

  const items = submittedItem ? [submittedItem, ...(result.items || [])] : (result.items || []);
  const renderedCount = renderWishItems(wishesContainer, items, emptyState);

  if (loadMoreBtn instanceof HTMLButtonElement) {
    loadMoreBtn.dataset.offset = String(renderedCount);
    loadMoreBtn.dataset.deauvilleLoading = 'false';
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Load More';
    if (!result.hasMore && renderedCount <= (result.items?.length || 0)) loadMoreBtn.remove();
  }

  return renderedCount;
}

function initRSVPForm() {
  const form = root?.querySelector('[data-rsvp-form]');
  const successState = root?.querySelector('[data-rsvp-success]');
  const errorEl = root?.querySelector('[data-rsvp-error]');
  const submitBtn = root?.querySelector('[data-rsvp-submit]');
  const wishesContainer = root?.querySelector('[data-wishes-list]');
  const emptyState = root?.querySelector('[data-wishes-empty]');
  const loadMoreBtn = root?.querySelector('[data-wishes-load-more]');

  if (!(form instanceof HTMLFormElement) || !(successState instanceof HTMLElement) || !(submitBtn instanceof HTMLButtonElement)) return;
  if (form.dataset.deauvilleRsvpBound === 'true') return;
  form.dataset.deauvilleRsvpBound = 'true';
  const submitLabel = submitBtn.textContent || 'Send';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.dataset.deauvilleSubmitting === 'true') return;
    form.dataset.deauvilleSubmitting = 'true';

    if (errorEl instanceof HTMLElement) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';

    const formData = new FormData(form);
    const payload = {
      weddingId: formData.get('weddingId'),
      name: formData.get('name'),
      attendance: formData.get('attendance'),
      count: formData.get('count') || 1,
      message: formData.get('message')
    };

    if (!payload.weddingId || !payload.name || !payload.attendance || !String(payload.message || '').trim()) {
      form.dataset.deauvilleSubmitting = 'false';
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
      if (errorEl instanceof HTMLElement) {
        errorEl.style.display = 'block';
        errorEl.textContent = 'Data RSVP belum lengkap. Isi nama, konfirmasi kehadiran, dan ucapan.';
      }
      return;
    }

    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Terjadi kesalahan sistem.');

      form.style.display = 'none';
      successState.style.display = 'block';

      if (wishesContainer && result.item?.message) {
        const currentRendered = wishesContainer.querySelectorAll('.wish-card').length;
        await syncWishesFromServer({
          weddingId: String(payload.weddingId),
          wishesContainer,
          emptyState,
          loadMoreBtn,
          limit: Math.max(currentRendered + 1, 4),
          submittedItem: result.item
        });
        wishesContainer.querySelector('.wish-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      form.dataset.deauvilleSubmitting = 'false';
    } catch (error) {
      form.dataset.deauvilleSubmitting = 'false';
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
      if (errorEl instanceof HTMLElement) {
        errorEl.style.display = 'block';
        errorEl.textContent = error instanceof Error ? error.message : 'Gagal mengirim RSVP. Coba kembali.';
      }
    }
  });
}

function initWishesLoadMore() {
  const button = root?.querySelector('[data-wishes-load-more]');
  const wishesContainer = root?.querySelector('[data-wishes-list]');
  if (!(button instanceof HTMLButtonElement) || !wishesContainer) return;
  if (button.dataset.deauvilleWishesBound === 'true') return;
  button.dataset.deauvilleWishesBound = 'true';

  button.addEventListener('click', async () => {
    if (button.dataset.deauvilleLoading === 'true') return;

    const weddingId = button.dataset.weddingId;
    const offset = parseInt(button.dataset.offset || '0', 10);
    if (!weddingId) return;

    button.dataset.deauvilleLoading = 'true';
    button.disabled = true;
    button.textContent = 'Loading...';

    try {
      const response = await fetch(`/api/wishes?weddingId=${encodeURIComponent(weddingId)}&offset=${offset}&limit=4`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal memuat ucapan.');

      const existingWishKeys = getRenderedWishKeys(wishesContainer);
      result.items.forEach((wish) => {
        const wishKey = getWishKey({
          id: wish.id,
          name: wish.guest_name,
          message: wish.message || '',
          createdAt: wish.created_at
        });
        if (existingWishKeys.has(wishKey)) return;

        wishesContainer.append(createWishCard({
          id: wish.id,
          name: wish.guest_name,
          attendance: wish.attendance_status,
          message: wish.message || '',
          createdAt: wish.created_at
        }));
        existingWishKeys.add(wishKey);
      });

      const nextOffset = offset + result.items.length;
      button.dataset.offset = String(nextOffset);

      if (!result.hasMore || result.items.length === 0) {
        button.remove();
      } else {
        button.disabled = false;
        button.dataset.deauvilleLoading = 'false';
        button.textContent = 'Load More';
      }
    } catch (error) {
      button.disabled = false;
      button.dataset.deauvilleLoading = 'false';
      button.textContent = 'Load More';
      console.error(error);
    }
  });
}

function initGiftInteractions() {
  const giftToggle = root?.querySelector('[data-gift-toggle]');
  const giftGrid = root?.querySelector('[data-gift-grid]');
  const copyBtns = root?.querySelectorAll('[data-copy-btn]') || [];
  const qrisBtns = root?.querySelectorAll('[data-qris-btn]') || [];
  const qrisLightbox = root?.querySelector('[data-qris-lightbox]');
  const qrisCard = root?.querySelector('[data-qris-card]');
  const qrisClose = root?.querySelector('[data-qris-close]');
  const qrisImg = root?.querySelector('[data-qris-img]');

  if (giftToggle instanceof HTMLButtonElement && giftGrid instanceof HTMLElement) {
    giftToggle.addEventListener('click', () => {
      const isHidden = giftGrid.hasAttribute('hidden');
      if (isHidden) {
        giftGrid.removeAttribute('hidden');
        giftGrid.classList.add('is-open');
        giftGrid.querySelectorAll('[data-animate]').forEach((item) => item.classList.add('is-animated'));
        giftToggle.setAttribute('aria-expanded', 'true');
        giftToggle.textContent = 'Sembunyikan Hadiah Pernikahan';
      } else {
        giftGrid.setAttribute('hidden', '');
        giftGrid.classList.remove('is-open');
        giftToggle.setAttribute('aria-expanded', 'false');
        giftToggle.textContent = 'Lihat Hadiah Pernikahan';
      }
    });
  }

  copyBtns.forEach((btn) => {
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

  const closeQRIS = () => {
    if (!(qrisLightbox instanceof HTMLElement)) return;
    qrisLightbox.style.opacity = '0';
    qrisLightbox.style.pointerEvents = 'none';
    if (qrisCard instanceof HTMLElement) qrisCard.style.transform = 'scale(0.96)';
    document.body.style.overflow = '';
  };

  qrisBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-url') || '';
      if (!(qrisLightbox instanceof HTMLElement) || !(qrisImg instanceof HTMLImageElement)) return;

      qrisImg.src = url;
      qrisLightbox.style.opacity = '1';
      qrisLightbox.style.pointerEvents = 'auto';
      if (qrisCard instanceof HTMLElement) qrisCard.style.transform = 'scale(1)';
      document.body.style.overflow = 'hidden';
    });
  });

  qrisClose?.addEventListener('click', closeQRIS);
  qrisLightbox?.addEventListener('click', (event) => {
    if (event.target === qrisLightbox) closeQRIS();
  });
}

initSliders();
initRevealAnimations();
initCountdown();
initGalleryLightbox();
initRSVPForm();
initWishesLoadMore();
initGiftInteractions();
initFullpageScroll();

function initFullpageScroll() {
  const allSections = Array.from(root?.querySelectorAll('.snap-section') || []);
  if (!allSections.length) return;

  let isScrolling = false;
  let currentSectionIndex = 0;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const index = allSections.indexOf(entry.target);
        if (index !== -1) {
          currentSectionIndex = index;
        }
      }
    });
  }, { threshold: 0.5 });

  allSections.forEach(sec => observer.observe(sec));

  window.addEventListener('wheel', (e) => {
    if (document.body.style.overflow === 'hidden' || document.body.classList.contains('template-no-scroll')) {
      return; 
    }
    
    const scrollable = e.target.closest('textarea, [data-wishes-list], [data-gift-grid]');
    if (scrollable && scrollable.scrollHeight > scrollable.clientHeight) {
      return;
    }

    e.preventDefault();

    if (isScrolling) return;

    if (e.deltaY > 0) {
      if (currentSectionIndex < allSections.length - 1) {
        currentSectionIndex++;
        scrollToSection(currentSectionIndex);
      }
    } else if (e.deltaY < 0) {
      if (currentSectionIndex > 0) {
        currentSectionIndex--;
        scrollToSection(currentSectionIndex);
      }
    }
  }, { passive: false });

  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (document.body.style.overflow === 'hidden' || document.body.classList.contains('template-no-scroll')) {
      return; 
    }
    
    const scrollable = e.target.closest('textarea, [data-wishes-list], [data-gift-grid]');
    if (scrollable && scrollable.scrollHeight > scrollable.clientHeight) {
      return;
    }

    // SELALU cegah scroll bawaan kecuali pada elemen yang boleh di-scroll
    e.preventDefault();

    if (isScrolling) return;

    const touchEndY = e.touches[0].clientY;
    const diff = touchStartY - touchEndY;

    if (Math.abs(diff) > 40) { 
      if (diff > 0) {
        if (currentSectionIndex < allSections.length - 1) {
          currentSectionIndex++;
          scrollToSection(currentSectionIndex);
          touchStartY = touchEndY;
        }
      } else {
        if (currentSectionIndex > 0) {
          currentSectionIndex--;
          scrollToSection(currentSectionIndex);
          touchStartY = touchEndY;
        }
      }
    }
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (document.body.style.overflow === 'hidden' || document.body.classList.contains('template-no-scroll')) {
      return; 
    }

    const targetTag = e.target.tagName.toLowerCase();
    if (targetTag === 'textarea' || targetTag === 'input' || targetTag === 'select') {
      return;
    }

    if (["ArrowUp", "PageUp", "Home"].includes(e.key)) {
      e.preventDefault();
      if (!isScrolling && currentSectionIndex > 0) {
        currentSectionIndex--;
        scrollToSection(currentSectionIndex);
      }
    } else if (["ArrowDown", "PageDown", "Space", "End"].includes(e.key)) {
      e.preventDefault();
      if (!isScrolling && currentSectionIndex < allSections.length - 1) {
        currentSectionIndex++;
        scrollToSection(currentSectionIndex);
      }
    }
  }, { passive: false });

  function scrollToSection(index) {
    if (isScrolling) return;
    isScrolling = true;

    const targetSection = allSections[index];
    const targetY = targetSection.getBoundingClientRect().top + window.scrollY;
    const startY = window.scrollY;
    const distance = targetY - startY;
    const duration = 1200; // Lebih lambat (1.2 detik)
    let startTime = null;

    // Easing function (easeInOutQuart) untuk efek yang sangat mulus di awal dan akhir
    function easeInOutQuart(t) {
      return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    }

    // Matikan sementara scroll-behavior CSS agar tidak bentrok
    const originalScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';

    function animation(currentTime) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easeProgress = easeInOutQuart(progress);

      window.scrollTo(0, startY + (distance * easeProgress));

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      } else {
        document.documentElement.style.scrollBehavior = originalScrollBehavior;
        setTimeout(() => {
          isScrolling = false;
        }, 100); 
      }
    }

    requestAnimationFrame(animation);
  }
}
