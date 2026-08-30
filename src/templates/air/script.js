import { initRSVPForm, initWishesLoadMore } from '../../scripts/rsvp';
import { 
  initCountdown, 
  initGiftInteractions, 
  initGalleryLightbox, 
  initVideoPlayers, 
  initRevealAnimations,
  initBackgroundAudioHandler
} from '../../scripts/template-modules';

function initAirTemplate() {
  const root = document.querySelector('body.template-air [data-template-root]');
  if (!root) return;

  const cover = root.querySelector('[data-template-cover]');
  const openBtn = root.querySelector('[data-template-open]');
  const layout = root.querySelector('[data-template-layout]');
  const song = root.querySelector('[data-template-audio]');
  const audioBtn = root.querySelector('[data-template-audio-toggle]');

  if (layout instanceof HTMLElement) layout.style.display = 'none';
  if (cover instanceof HTMLElement) document.body.classList.add('template-no-scroll');

  if (openBtn && openBtn.dataset.bound !== 'true') {
    openBtn.dataset.bound = 'true';
    openBtn.addEventListener('click', () => {
      const coverBtn = cover?.querySelector('.cover-section__btn');
      
      if (coverBtn instanceof HTMLElement) {
        coverBtn.style.transition = 'transform 0.9s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.7s ease 0.1s';
        coverBtn.style.transform = 'translateY(100px)';
        coverBtn.style.opacity = '0';
      }

      setTimeout(() => {
        if (cover instanceof HTMLElement) {
          cover.style.transition = '';
          cover.style.display = 'none';
        }

        if (layout instanceof HTMLElement) {
          layout.style.display = '';
          layout.style.opacity = '1';
          
          const heroBtn = layout.querySelector('.hero-section__scroll-btn');
          if (heroBtn instanceof HTMLElement) {
            heroBtn.style.transform = 'translateX(100px)';
            heroBtn.style.opacity = '0';
            setTimeout(() => {
              heroBtn.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease';
              heroBtn.style.transform = 'translateX(0)';
              heroBtn.style.opacity = '1';
              
              setTimeout(() => {
                heroBtn.style.transition = '';
                heroBtn.style.transform = '';
                heroBtn.classList.add('is-floating');
              }, 850);
            }, 50);
          }
          
          initRevealAnimations(root);
        }
      }, 850);

      document.body.classList.remove('template-no-scroll');

      if (song instanceof HTMLAudioElement) {
        song.play().then(() => {
          audioBtn?.classList.add('audio-toggle--playing');
        }).catch(() => { });
      }
    });
  }

  initBackgroundAudioHandler(song, audioBtn);

  function initHeroSlideshows() {
    const sliders = Array.from(root.querySelectorAll('[data-hero-section-slider]'));
    if (!sliders.length) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const startSliders = () => {
      sliders.forEach((slider) => {
        const slides = Array.from(slider.querySelectorAll('.cover-section__slide, .hero-section__slide'));
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
    };

    if (document.getElementById('cinematic-preloader') || document.getElementById('intro-awal')) {
      setTimeout(startSliders, 5500); // Wait for intro animation to almost finish
    } else {
      startSliders();
    }
  }

  const animatedItems = Array.from(root.querySelectorAll('[data-animate]'));
  animatedItems.forEach((item, index) => {
    if (item instanceof HTMLElement && !item.style.getPropertyValue('--animate-delay')) {
      item.style.setProperty('--animate-delay', `${Math.min(index % 3, 2) * 180}ms`);
    }
  });

  initCountdown(root);
  initVideoPlayers(root);
  initHeroSlideshows();
  initGalleryLightbox(root, 'gallery-section');
  initRSVPForm(root);
  initWishesLoadMore(root);
  initGiftInteractions(root);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAirTemplate);
} else {
  initAirTemplate();
}
document.addEventListener('astro:page-load', initAirTemplate);
