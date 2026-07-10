import { initRSVPForm, initWishesLoadMore } from '../../scripts/rsvp';
import { 
  initCountdown, 
  initGiftInteractions, 
  initGalleryLightbox, 
  initVideoPlayers, 
  initRevealAnimations 
} from '../../scripts/template-modules';

const root = document.querySelector('body.template-editorial [data-template-root]');
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
    });
  }

  document.body.classList.remove('template-no-scroll', 'template-cover-active');

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

function initSlideshows() {
  const sliders = Array.from(root?.querySelectorAll('[data-template-slider]') || []);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  sliders.forEach((slider) => {
    const slides = Array.from(slider.querySelectorAll('.template-slide'));
    if (slides.length <= 1) return;

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

if (root) {
  initSlideshows();
  initRevealAnimations(root);
  initCountdown(root);
  initVideoPlayers(root);
  initGalleryLightbox(root);
  initRSVPForm(root);
  initWishesLoadMore(root);
  initGiftInteractions(root);
}
