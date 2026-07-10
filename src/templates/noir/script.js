import { initRSVPForm, initWishesLoadMore } from '../../scripts/rsvp';
import { 
  initCountdown, 
  initGiftInteractions, 
  initGalleryLightbox, 
  initVideoPlayers, 
  initRevealAnimations 
} from '../../scripts/template-modules';

const root = document.querySelector('body.template-noir [data-template-root]');
const cover = root?.querySelector('[data-template-cover]');
const openBtn = root?.querySelector('[data-template-open]');
const layout = root?.querySelector('[data-template-layout]');
const song = root?.querySelector('[data-template-audio]');
const audioBtn = root?.querySelector('[data-template-audio-toggle]');
let heroSlideshowStarted = false;
let isPlaying = false;

if (layout instanceof HTMLElement) layout.style.display = 'none';
if (cover instanceof HTMLElement) document.body.classList.add('template-no-scroll');

openBtn?.addEventListener('click', () => {
  if (cover instanceof HTMLElement) {
    cover.style.transition = 'opacity 1.6s ease, transform 2.4s ease';
    cover.style.opacity = '0';
    cover.style.transform = 'translateY(-100%)';
    setTimeout(() => {
      cover.style.display = 'none';
    }, 2500);
  }

  if (layout instanceof HTMLElement) {
    layout.style.display = 'flex';
    layout.style.opacity = '0';
    setTimeout(() => {
      layout.style.transition = 'opacity 1.6s ease';
      layout.style.opacity = '1';
      startHeroSlideshow();
    }, 1000);
  }

  document.body.classList.remove('template-no-scroll');

  if (song instanceof HTMLAudioElement) {
    song.play().catch(() => { });
    audioBtn?.classList.add('audio-toggle--playing');
    isPlaying = true;
  }

  setTimeout(() => {
    triggerRevealAnimations();
  }, 1800);
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

let revealAnimationsInitialized = false;
function triggerRevealAnimations() {
  if (revealAnimationsInitialized) return;
  revealAnimationsInitialized = true;
  if (root) initRevealAnimations(root);
}

function startHeroSlideshow() {
  if (heroSlideshowStarted) return;

  const slider = root?.querySelector('[data-noir-hero-slider]');
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
    setInterval(advanceSlide, 8000);
  }, 4000);
}

if (root) {
  initCountdown(root);
  initVideoPlayers(root);
  initGalleryLightbox(root);
  initRSVPForm(root);
  initWishesLoadMore(root);
  initGiftInteractions(root);

  if (!cover || !openBtn || cover.style.display === 'none') {
    triggerRevealAnimations();
  } else {
    setTimeout(() => {
      triggerRevealAnimations();
    }, 5000);
  }
}
