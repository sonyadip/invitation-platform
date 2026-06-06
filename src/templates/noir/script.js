const root = document.querySelector('[data-template-root]');
const cover = root?.querySelector('[data-template-cover]');
const openBtn = root?.querySelector('[data-template-open]');
const layout = root?.querySelector('[data-template-layout]');
const song = root?.querySelector('[data-template-audio]');
const audioBtn = root?.querySelector('[data-template-audio-toggle]');

if (layout instanceof HTMLElement) layout.style.display = 'none';
if (cover instanceof HTMLElement) document.body.classList.add('template-no-scroll');

openBtn?.addEventListener('click', () => {
  if (cover instanceof HTMLElement) {
    cover.style.transition = 'opacity 0.8s ease, transform 1.2s ease';
    cover.style.opacity = '0';
    cover.style.transform = 'translateY(-100%)';
    setTimeout(() => {
      cover.style.display = 'none';
    }, 1300);
  }

  if (layout instanceof HTMLElement) {
    layout.style.display = 'flex';
    layout.style.opacity = '0';
    setTimeout(() => {
      layout.style.transition = 'opacity 0.8s ease';
      layout.style.opacity = '1';
    }, 500);
  }

  document.body.classList.remove('template-no-scroll');

  if (song instanceof HTMLAudioElement) {
    song.play().catch(() => { });
    audioBtn?.classList.add('audio-toggle--playing');
  }
});

let isPlaying = false;

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
    threshold: 0.02,
    rootMargin: '0px 0px -4% 0px'
  });

  animatedItems.forEach((item, index) => {
    if (item instanceof HTMLElement) {
      item.style.setProperty('--animate-delay', `${Math.min(index % 3, 2) * 180}ms`);
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

    Fancybox.bind(galleryRoot, '[data-fancybox="noir-gallery"]');
  } catch (error) {
    console.error('Failed to initialize gallery lightbox:', error);
  }
}

function createWishCard({ name, attendance, message, createdAt }) {
  const wishCard = document.createElement('div');
  wishCard.className = 'wish-card animate-fade-in-up';

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

function initRSVPForm() {
  const form = root?.querySelector('[data-rsvp-form]');
  const successState = root?.querySelector('[data-rsvp-success]');
  const errorEl = root?.querySelector('[data-rsvp-error]');
  const submitBtn = root?.querySelector('[data-rsvp-submit]');
  const wishesContainer = root?.querySelector('[data-wishes-list]');
  const emptyState = root?.querySelector('[data-wishes-empty]');

  if (!(form instanceof HTMLFormElement) || !(successState instanceof HTMLElement) || !(submitBtn instanceof HTMLButtonElement)) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

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
      count: 1,
      message: formData.get('message')
    };

    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Terjadi kesalahan sistem.');

      form.style.display = 'none';
      successState.style.display = 'flex';

      if (wishesContainer && result.item?.message) {
        if (emptyState instanceof HTMLElement) emptyState.style.display = 'none';
        const wishCard = createWishCard({
          name: result.item.guest_name,
          attendance: result.item.attendance_status,
          message: result.item.message,
          createdAt: result.item.created_at
        });
        wishesContainer.prepend(wishCard);
        wishCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (error) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
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

  button.addEventListener('click', async () => {
    const weddingId = button.dataset.weddingId;
    const offset = parseInt(button.dataset.offset || '0', 10);

    if (!weddingId) return;

    button.disabled = true;
    button.textContent = 'Loading...';

    try {
      const response = await fetch(`/api/wishes?weddingId=${encodeURIComponent(weddingId)}&offset=${offset}&limit=3`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal memuat ucapan.');

      result.items.forEach((wish) => {
        const card = createWishCard({
          name: wish.guest_name,
          attendance: wish.attendance_status,
          message: wish.message || '',
          createdAt: wish.created_at
        });
        wishesContainer.append(card);
      });

      const nextOffset = offset + result.items.length;
      button.dataset.offset = String(nextOffset);

      if (!result.hasMore || result.items.length === 0) {
        button.remove();
      } else {
        button.disabled = false;
        button.textContent = 'Load More';
      }
    } catch (error) {
      button.disabled = false;
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

  giftToggle?.addEventListener('click', () => {
    if (!(giftGrid instanceof HTMLElement)) return;

    const isHidden = giftGrid.hasAttribute('hidden');
    if (isHidden) {
      giftGrid.removeAttribute('hidden');
      giftToggle.textContent = 'Sembunyikan Hadiah Pernikahan';
    } else {
      giftGrid.setAttribute('hidden', '');
      giftToggle.textContent = 'Lihat Hadiah Pernikahan';
    }
  });

  copyBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const value = btn.getAttribute('data-value') || '';
      const textSpan = btn.querySelector('span');
      const originalText = textSpan?.textContent || 'Salin';

      try {
        await navigator.clipboard.writeText(value);
        btn.style.backgroundColor = '#ecfdf5';
        btn.style.color = '#059669';
        btn.style.borderColor = '#a7f3d0';
        if (textSpan) textSpan.textContent = 'Tersalin!';

        setTimeout(() => {
          btn.style.backgroundColor = '';
          btn.style.color = '';
          btn.style.borderColor = '';
          if (textSpan) textSpan.textContent = originalText;
        }, 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    });
  });

  const closeQRIS = () => {
    if (!(qrisLightbox instanceof HTMLElement)) return;
    qrisLightbox.style.opacity = '0';
    qrisLightbox.style.pointerEvents = 'none';
    if (qrisCard instanceof HTMLElement) qrisCard.style.transform = 'scale(0.95)';
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

initCountdown();
initRevealAnimations();
initGalleryLightbox();
initRSVPForm();
initWishesLoadMore();
initGiftInteractions();
