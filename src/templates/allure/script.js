import { initRSVPForm, initWishesLoadMore } from '../../scripts/rsvp';
import { 
  initCountdown,
  initGiftInteractions, 
  initGalleryLightbox, 
  initVideoPlayers, 
  initRevealAnimations,
  initBackgroundAudioHandler
} from '../../scripts/template-modules';

function initAllure() {
  const root = document.querySelector('body.template-allure [data-template-root]');
  if (!root) return;

  const cover = root.querySelector('[data-template-cover]');
  const openBtn = root.querySelector('[data-template-open]');
  const layout = root.querySelector('[data-template-layout]');
  const song = root.querySelector('[data-template-audio]');
  const audioBtn = root.querySelector('[data-template-audio-toggle]');
  let heroSlideshowStarted = false;
  let isPlaying = false;
  let revealAnimationsInitialized = false;

  function triggerRevealAnimations() {
    if (revealAnimationsInitialized) return;
    revealAnimationsInitialized = true;
    if (root) initRevealAnimations(root);
  }

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  // Lock scroll initially
  if (cover instanceof HTMLElement) {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.body.classList.add('template-no-scroll', 'template-cover-active');
  }

  // Cover opening handler (matches Deauville & Terre)
  openBtn?.addEventListener('click', () => {
    if (cover instanceof HTMLElement) {
      cover.classList.add('is-opening');
    }

    if (layout instanceof HTMLElement) {
      layout.style.opacity = '1';
    }

    window.setTimeout(() => {
      if (cover instanceof HTMLElement) {
        cover.classList.remove('is-opening');
        cover.classList.add('is-opened');
      }

      document.body.classList.remove('template-no-scroll', 'template-cover-active');
      document.body.style.height = '';
      startHeroSlideshow();
    }, 3650);

    if (song instanceof HTMLAudioElement) {
      song.play().catch(() => {});
      audioBtn?.classList.add('audio-toggle--playing');
      isPlaying = true;
    }

    setTimeout(() => {
      triggerRevealAnimations();
      initGalleryLightbox(root);
    }, 600);
  });

  if (song && audioBtn) {
    initBackgroundAudioHandler(song, audioBtn);
  }

  function startHeroSlideshow() {
    if (heroSlideshowStarted) return;
    const slider = root.querySelector('[data-hero-slider]');
    if (!slider) return;

    const slides = Array.from(slider.querySelectorAll('.hero__slide'));
    if (slides.length <= 1) return;

    heroSlideshowStarted = true;
    let activeIndex = 0;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const advanceSlide = () => {
      slides[activeIndex]?.classList.remove('is-active');
      activeIndex = (activeIndex + 1) % slides.length;
      slides[activeIndex]?.classList.add('is-active');
    };

    setInterval(advanceSlide, 6000);
  }

  // Initialize interactive components
  initCountdown(root);
  initVideoPlayers(root);
  initGalleryLightbox(root);
  initRSVPForm(root);
  initWishesLoadMore(root);
  initGiftInteractions(root);

  // Desktop or bypassed cover reveal trigger
  if (!cover || !openBtn || cover.style.display === 'none') {
    triggerRevealAnimations();
  } else {
    if (window.innerWidth >= 1024) {
      if (document.getElementById('intro-awal')) {
        setTimeout(triggerRevealAnimations, 3600);
      } else {
        triggerRevealAnimations();
      }
    }
  }

  // Safety net scroll listener for late items
  window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 120)) {
      root.querySelectorAll('[data-animate]:not(.is-animated)').forEach(el => el.classList.add('is-animated'));
    }
  }, { passive: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAllure);
} else {
  initAllure();
}

document.addEventListener('astro:page-load', initAllure);
