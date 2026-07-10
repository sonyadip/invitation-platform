import { initRSVPForm, initWishesLoadMore } from '../../scripts/rsvp';
import { 
  initCountdown, 
  initGiftInteractions, 
  initGalleryLightbox, 
  initRevealAnimations
} from '../../scripts/template-modules';

const root = document.querySelector('body.template-air [data-template-root]');
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

function initHeroSlideshows() {
  const sliders = Array.from(root?.querySelectorAll('[data-air-hero-slider]') || []);
  if (!sliders.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  sliders.forEach((slider) => {
    const slides = Array.from(slider.querySelectorAll('.air-cover__slide, .air-hero__slide'));
    if (slides.length <= 1) return;

    let activeIndex = Math.max(slides.findIndex((slide) => slide.classList.contains('is-active')), 0);
    slides[activeIndex]?.classList.add('is-active');

    if (reduceMotion) return;

    setInterval(() => {
      slides[activeIndex]?.classList.remove('is-active');
      activeIndex = (activeIndex + 1) % slides.length;
      slides[activeIndex]?.classList.add('is-active');
    }, 4300);
  });
}

if (root) {
  const animatedItems = Array.from(root.querySelectorAll('[data-animate]'));
  animatedItems.forEach((item, index) => {
    if (item instanceof HTMLElement && !item.style.getPropertyValue('--animate-delay')) {
      item.style.setProperty('--animate-delay', `${Math.min(index % 3, 2) * 180}ms`);
    }
  });

  initCountdown(root);
  initRevealAnimations(root);
  initHeroSlideshows();
  initGalleryLightbox(root, 'air-gallery');
  initRSVPForm(root);
  initWishesLoadMore(root);
  initGiftInteractions(root);
}
