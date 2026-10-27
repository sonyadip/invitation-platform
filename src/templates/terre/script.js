import { initRSVPForm, initWishesLoadMore } from '../../scripts/rsvp';
import { 
  initCountdown, 
  initGiftInteractions, 
  initGalleryLightbox, 
  initVideoPlayers, 
  initRevealAnimations,
  initBackgroundAudioHandler
} from '../../scripts/template-modules';

const root = document.querySelector('body.template-terre [data-template-root]');
const coverAction = root?.querySelector('[data-cover-action]');
const openBtn = root?.querySelector('[data-template-open]');
const heroArrow = root?.querySelector('[data-hero-arrow]');
const heroArrowLink = root?.querySelector('[data-hero-arrow] a');
const song = root?.querySelector('[data-template-audio]');
const audioBtn = root?.querySelector('[data-template-audio-toggle]');
let heroSlideshowStarted = false;
let isPlaying = false;

if (coverAction instanceof HTMLElement) {
  document.body.classList.add('template-no-scroll');
} else {
  heroArrow?.classList.add('is-visible');
}

openBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  coverAction?.classList.add('is-opening');
  if (song instanceof HTMLAudioElement) {
    song.play().catch(() => { });
    audioBtn?.classList.add('audio-toggle--playing');
    isPlaying = true;
  }
  document.body.classList.remove('template-no-scroll');
  setTimeout(() => {
    if (heroArrow instanceof HTMLElement) {
      heroArrow.classList.add('is-visible');
    }
  }, 500);
  setTimeout(() => {
    if (coverAction instanceof HTMLElement) {
      coverAction.style.display = 'none';
    }
  }, 1450);

  setTimeout(() => {
    triggerRevealAnimations();
    initGalleryLightbox(root);
  }, 300);
});
heroArrowLink?.addEventListener('click', (e) => {
  e.preventDefault();
  const quoteSection = root?.querySelector('#quote') || root?.querySelector('.quote-section') || root?.querySelector('#opening') || root?.querySelector('.opening-section');
  if (quoteSection instanceof HTMLElement) {
    quoteSection.scrollIntoView({ behavior: 'smooth' });
  }
});

initBackgroundAudioHandler(song, audioBtn);

let revealAnimationsInitialized = false;
function triggerRevealAnimations() {
  if (revealAnimationsInitialized) return;
  revealAnimationsInitialized = true;
  if (root) initRevealAnimations(root);
}

function startHeroSlideshow() {
  if (heroSlideshowStarted) return;

  const slider = root?.querySelector('[data-terre-hero-slider]');
  if (!slider) return;

  const slides = Array.from(slider.querySelectorAll('.hero-section__slide'));
  if (slides.length <= 1) return;

  heroSlideshowStarted = true;
  let activeIndex = 0;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  slides.forEach((slide, index) => {
    slide.classList.toggle('is-active', index === activeIndex);
  });

  if (reduceMotion) return;

  const advanceSlide = () => {
    slides[activeIndex]?.classList.remove('is-active');
    activeIndex = (activeIndex + 1) % slides.length;
    slides[activeIndex]?.classList.add('is-active');
  };

  setTimeout(() => {
    advanceSlide();
    setInterval(advanceSlide, 7000);
  }, 4000);
}

if (root) {
  initCountdown(root);
  initVideoPlayers(root);
  initGalleryLightbox(root);
  initRSVPForm(root);
  initWishesLoadMore(root);
  initGiftInteractions(root);

  if (!coverAction || !openBtn || coverAction.style.display === 'none') {
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
  window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 120)) {
      root.querySelectorAll('[data-animate]:not(.is-animated)').forEach(el => el.classList.add('is-animated'));
    }
  }, { passive: true });
}
