import { initRSVPForm, initWishesLoadMore } from '../../scripts/rsvp';
import {
  initCountdown,
  initGiftInteractions,
  initGalleryLightbox,
  initVideoPlayers,
  initRevealAnimations,
  initBackgroundAudioHandler
} from '../../scripts/template-modules';

const root = document.querySelector('body.template-lumiere-metatah-v2 [data-template-root]');
const cover = root?.querySelector('[data-template-cover]');
const layout = root?.querySelector('[data-template-layout]');
const openBtn = root?.querySelector('[data-template-open]');
const song = root?.querySelector('[data-template-audio]');
const audioBtn = root?.querySelector('[data-template-audio-toggle]');
let isPlaying = false;

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

if (layout instanceof HTMLElement) layout.style.display = 'none';
if (cover instanceof HTMLElement) {
  window.scrollTo(0, 0);
  document.body.classList.add('template-no-scroll', 'template-cover-active');
}

openBtn?.addEventListener('click', () => {
  if (cover instanceof HTMLElement) {
    cover.classList.add('is-opening');
    setTimeout(() => {
      cover.style.display = 'none';
    }, 1600);
  }

  if (layout instanceof HTMLElement) {
    layout.style.display = 'block';
    layout.style.opacity = '0';
    requestAnimationFrame(() => {
      layout.style.transition = 'opacity 1200ms ease';
      layout.style.opacity = '1';
      initSlideshows();
      if (root) initRevealAnimations(root);
    });
  }

  document.body.classList.remove('template-no-scroll', 'template-cover-active');

  if (song instanceof HTMLAudioElement) {
    song.play().catch(() => { });
    audioBtn?.classList.add('audio-toggle--playing');
    isPlaying = true;
  }
});

initBackgroundAudioHandler(song, audioBtn);

function initSlideshows() {
  const sliders = Array.from(root?.querySelectorAll('[data-template-slider]') || []);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  sliders.forEach((slider) => {
    const slides = Array.from(slider.querySelectorAll('.template-slide'));
    if (slides.length <= 1) return;

    slides.forEach((slide) => {
      if (slide instanceof HTMLImageElement && slide.dataset.src && !slide.getAttribute('src')) {
        slide.src = slide.dataset.src;
      }
    });

    const firstCandidates = slides
      .map((slide, index) => ({ slide, index }))
      .filter(({ slide }) => slide instanceof HTMLElement && slide.dataset.coverSlide !== 'true');
    const randomPool = firstCandidates.length > 0 ? firstCandidates : slides.map((slide, index) => ({ slide, index }));
    let activeIndex = randomPool[Math.floor(Math.random() * randomPool.length)]?.index || 0;
    slides.forEach((slide, index) => slide.classList.toggle('is-active', index === activeIndex));
    slides[activeIndex]?.classList.add('is-active');
    if (reduceMotion) return;

    setInterval(() => {
      slides[activeIndex]?.classList.remove('is-active');
      activeIndex = (activeIndex + 1) % slides.length;
      slides[activeIndex]?.classList.add('is-active');
    }, 7200);
  });
}

function initParticipantModals(container) {
  const triggerBtns = Array.from(container.querySelectorAll('[data-open-participant-modal]'));
  const closeBtns = Array.from(container.querySelectorAll('[data-close-participant-modal]'));
  const dialogs = Array.from(container.querySelectorAll('.participant-modal'));

  if (!triggerBtns.length && !dialogs.length) return;

  const closeDialog = (dialog) => {
    if (!(dialog instanceof HTMLDialogElement) || !dialog.open) return;
    if (dialog.classList.contains('is-closing')) return;

    dialog.classList.add('is-closing');
    dialog.classList.remove('is-open');

    if (dialog._closeTimeout) {
      clearTimeout(dialog._closeTimeout);
    }

    dialog._closeTimeout = setTimeout(() => {
      dialog.classList.remove('is-closing');
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
      dialog._closeTimeout = null;
      const anyOpen = dialogs.some((d) => d instanceof HTMLDialogElement && d.open);
      if (!anyOpen) {
        document.body.classList.remove('participant-modal-active');
      }
    }, 480);
  };

  const openDialog = (dialog) => {
    if (!(dialog instanceof HTMLDialogElement)) return;
    if (dialog._closeTimeout) {
      clearTimeout(dialog._closeTimeout);
      dialog._closeTimeout = null;
    }
    dialog.classList.remove('is-closing');
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    document.body.classList.add('participant-modal-active');

    // Force style reflow so browser commits initial opacity: 0 & translateY
    void dialog.offsetWidth;

    // Trigger smooth enter transition
    requestAnimationFrame(() => {
      dialog.classList.add('is-open');
    });
  };

  triggerBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const modalId = btn.getAttribute('data-open-participant-modal');
      const dialog = modalId ? document.getElementById(modalId) : null;
      if (dialog) openDialog(dialog);
    });
  });

  closeBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const modalId = btn.getAttribute('data-close-participant-modal');
      const dialog = (modalId ? document.getElementById(modalId) : null) || btn.closest('dialog');
      if (dialog) closeDialog(dialog);
    });
  });

  dialogs.forEach((dialog) => {
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault(); // Intercept ESC key for smooth closing animation
      closeDialog(dialog);
    });

    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        closeDialog(dialog);
      }
    });
  });
}

if (root) {
  initRevealAnimations(root);
  initCountdown(root);
  initVideoPlayers(root);
  initGalleryLightbox(root, 'gallery-section');
  initRSVPForm(root);
  initWishesLoadMore(root);
  initGiftInteractions(root);
  initParticipantModals(root);

  if (!cover || !openBtn || cover.style.display === 'none') {
    initSlideshows();
  }
}
