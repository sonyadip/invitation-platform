import { initRSVPForm, initWishesLoadMore } from '../../scripts/rsvp';
import { 
  initCountdown, 
  initGiftInteractions, 
  initGalleryLightbox, 
  initRevealAnimations,
  initVideoPlayers,
  initBackgroundAudioHandler
} from '../../scripts/template-modules';

const root = document.querySelector('body.template-ivory [data-template-root]');
const cover = root?.querySelector('[data-template-cover]');
const openBtn = root?.querySelector('[data-template-open]');
const layout = root?.querySelector('[data-template-layout]');
const song = root?.querySelector('[data-template-audio]');
const audioBtn = root?.querySelector('[data-template-audio-toggle]');
let heroSlideshowStarted = false;

if (layout instanceof HTMLElement) layout.style.display = 'none';
if (cover instanceof HTMLElement) document.body.classList.add('template-no-scroll');

function startHeroSlideshow() {
  if (heroSlideshowStarted) return;

  const slider = root?.querySelector('[data-ivory-hero-slider]');
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
    setInterval(advanceSlide, 4600);
  }, 2200);
}

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
      startHeroSlideshow();
    }, 500);
  }

  document.body.classList.remove('template-no-scroll');

  if (song instanceof HTMLAudioElement) {
    song.play().catch(() => { });
    audioBtn?.classList.add('audio-toggle--playing');
  }
});

initBackgroundAudioHandler(song, audioBtn);

if (root) {
  const animatedItems = Array.from(root.querySelectorAll('[data-animate]'));
  animatedItems.forEach((item, index) => {
    if (item instanceof HTMLElement && !item.style.getPropertyValue('--animate-delay')) {
      item.style.setProperty('--animate-delay', `${Math.min(index % 3, 2) * 180}ms`);
    }
  });

  initCountdown(root);
  initRevealAnimations(root);
  initGalleryLightbox(root);
  initVideoPlayers(root);
  initRSVPForm(root);
  initWishesLoadMore(root);
  initGiftInteractions(root);
}
