import { initRSVPForm, initWishesLoadMore } from '../../scripts/rsvp';
import { 
  initGiftInteractions, 
  initGalleryLightbox, 
  initVideoPlayers, 
  initRevealAnimations,
  initBackgroundAudioHandler
} from '../../scripts/template-modules';

function initNocturne() {
  const root = document.querySelector('body.template-nocturne [data-template-root]');
  if (!root) return;

  const cover = root.querySelector('[data-template-cover]');
  const openBtn = root.querySelector('[data-template-open]');
  const layout = root.querySelector('[data-template-layout]');
  const song = root.querySelector('[data-template-audio]');
  const audioBtn = root.querySelector('[data-template-audio-toggle]');
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

    if (layout instanceof HTMLElement) {
      layout.style.opacity = '1';
    }

    window.setTimeout(() => {
      if (cover instanceof HTMLElement) {
        cover.classList.remove('is-opening');
        cover.classList.add('is-opened');
        cover.style.display = 'none';
      }

      document.body.classList.remove('template-no-scroll', 'template-cover-active');
      document.body.style.height = '';
    }, 2650);

    if (song instanceof HTMLAudioElement) {
      song.play().catch(() => {});
      audioBtn?.classList.add('audio-toggle--playing');
      isPlaying = true;
    }

    setTimeout(() => {
      triggerRevealAnimations();
      initGalleryLightbox(root);
      gallerySliderInstance?.updateSlider(0, false);
    }, 400);
  });

  if (song && audioBtn) {
    initBackgroundAudioHandler(song, audioBtn);
  }

  const countdownEls = root.querySelectorAll('[data-nocturne-countdown]');
  countdownEls.forEach(countdownEl => {
    const targetDateStr = countdownEl.getAttribute('data-target-date');
    const targetDate = targetDateStr ? new Date(targetDateStr).getTime() : NaN;

    if (!isNaN(targetDate)) {
      const daysEl = countdownEl.querySelector('.ts-days');
      const hoursEl = countdownEl.querySelector('.ts-hours');
      const minutesEl = countdownEl.querySelector('.ts-minutes');
      const secondsEl = countdownEl.querySelector('.ts-seconds');

      const updateCountdown = () => {
        const now = Date.now();
        const diff = targetDate - now;

        if (diff <= 0) {
          if (daysEl) daysEl.textContent = '00';
          if (hoursEl) hoursEl.textContent = '00';
          if (minutesEl) minutesEl.textContent = '00';
          if (secondsEl) secondsEl.textContent = '00';
          return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
        if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
      };

      updateCountdown();
      setInterval(updateCountdown, 1000);
    }
  });

  function initGallerySlider() {
    const slider = root.querySelector('[data-gallery-slider]');
    if (!slider) return;

    const viewport = slider.querySelector('[data-slider-viewport]');
    const track = slider.querySelector('[data-slider-track]');
    const rawSlides = Array.from(slider.querySelectorAll('[data-slider-slide]'));
    const prevBtn = slider.querySelector('[data-slider-prev]');
    const nextBtn = slider.querySelector('[data-slider-next]');

    if (!track || !viewport || rawSlides.length === 0) return;

    const realCount = rawSlides.length;
    if (realCount <= 1) {
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      return { updateSlider: () => {} };
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cloneCount = Math.min(3, realCount);

    const startClones = rawSlides.slice(-cloneCount).map((slide, i) => {
      const clone = slide.cloneNode(true);
      clone.setAttribute('data-slider-clone', 'true');
      clone.setAttribute('data-clone-origin', String(realCount - cloneCount + i));
      clone.classList.remove('is-active');
      clone.querySelectorAll('[data-fancybox]').forEach((a) => a.removeAttribute('data-fancybox'));
      return clone;
    });

    const endClones = rawSlides.slice(0, cloneCount).map((slide, i) => {
      const clone = slide.cloneNode(true);
      clone.setAttribute('data-slider-clone', 'true');
      clone.setAttribute('data-clone-origin', String(i));
      clone.classList.remove('is-active');
      clone.querySelectorAll('[data-fancybox]').forEach((a) => a.removeAttribute('data-fancybox'));
      return clone;
    });

    startClones.reverse().forEach((clone) => track.insertBefore(clone, track.firstChild));
    endClones.forEach((clone) => track.appendChild(clone));

    const allSlides = Array.from(track.children);
    let currentDomIndex = cloneCount;
    let autoplayTimer = null;
    let isVisible = false;

    function getTargetOffset(index) {
      const activeSlide = allSlides[index];
      if (!activeSlide) return 0;
      const viewportWidth = viewport.offsetWidth || slider.offsetWidth || 350;
      const slideLeft = activeSlide.offsetLeft;
      const slideWidth = activeSlide.offsetWidth || (viewportWidth * 0.74);
      return -(slideLeft - (viewportWidth - slideWidth) / 2);
    }

    function syncActiveClasses(index) {
      allSlides.forEach((s, idx) => {
        s.classList.toggle('is-active', idx === index);
      });
    }

    function snapToDomIndex(index) {
      currentDomIndex = index;
      syncActiveClasses(currentDomIndex);
      track.style.transition = 'none';
      track.style.transform = `translateX(${getTargetOffset(currentDomIndex)}px)`;
      void track.offsetHeight;
    }

    function goToDomIndex(index, smooth = true, isAuto = false) {
      if (allSlides.length === 0) return;

      if (currentDomIndex >= realCount + cloneCount) {
        snapToDomIndex(currentDomIndex - realCount);
      } else if (currentDomIndex < cloneCount) {
        snapToDomIndex(currentDomIndex + realCount);
      }

      currentDomIndex = index;
      syncActiveClasses(currentDomIndex);

      if (!smooth || reduceMotion) {
        snapToDomIndex(currentDomIndex);
        return;
      }

      const duration = isAuto ? '1.1s' : '0.85s';
      track.style.transition = `transform ${duration} cubic-bezier(0.22, 1, 0.36, 1)`;
      track.style.transform = `translateX(${getTargetOffset(currentDomIndex)}px)`;
    }

    track.addEventListener('transitionend', (e) => {
      if (e.target !== track) return;
      if (currentDomIndex >= realCount + cloneCount) {
        snapToDomIndex(currentDomIndex - realCount);
      } else if (currentDomIndex < cloneCount) {
        snapToDomIndex(currentDomIndex + realCount);
      }
    });

    function next(isAuto = false) {
      goToDomIndex(currentDomIndex + 1, true, isAuto);
    }

    function prev() {
      goToDomIndex(currentDomIndex - 1, true, false);
    }

    function startAutoplay() {
      if (reduceMotion) return;
      stopAutoplay();
      autoplayTimer = setInterval(() => {
        next(true);
      }, 4500);
    }

    function stopAutoplay() {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }

    function updateSlider(realIndex, smooth = true) {
      const targetReal = ((realIndex % realCount) + realCount) % realCount;
      goToDomIndex(targetReal + cloneCount, smooth);
    }

    prevBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      prev();
      startAutoplay();
    });

    nextBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      next();
      startAutoplay();
    });

    allSlides.forEach((slide, idx) => {
      slide.addEventListener('click', (e) => {
        if (idx !== currentDomIndex) {
          e.preventDefault();
          e.stopPropagation();
          goToDomIndex(idx);
          startAutoplay();
        } else if (slide.getAttribute('data-slider-clone') === 'true') {
          const originIdx = parseInt(slide.getAttribute('data-clone-origin') || '0', 10);
          const realSlideAnchor = rawSlides[originIdx]?.querySelector('a');
          if (realSlideAnchor) {
            e.preventDefault();
            realSlideAnchor.click();
          }
        }
      });
    });

    slider.addEventListener('mouseenter', stopAutoplay);
    slider.addEventListener('mouseleave', startAutoplay);

    let startX = 0;
    let startY = 0;
    let isSwiping = false;

    slider.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSwiping = false;
        stopAutoplay();
      }
    }, { passive: true });

    slider.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const diffX = e.touches[0].clientX - startX;
        const diffY = e.touches[0].clientY - startY;
        if (Math.abs(diffX) > 15 && Math.abs(diffX) > Math.abs(diffY)) {
          isSwiping = true;
        }
      }
    }, { passive: true });

    slider.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const diffX = e.changedTouches[0].clientX - startX;
        const diffY = e.changedTouches[0].clientY - startY;
        if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
          if (diffX < 0) {
            next();
          } else {
            prev();
          }
        }
        if (isSwiping) {
          setTimeout(() => {
            isSwiping = false;
          }, 350);
        }
        startAutoplay();
      }
    }, { passive: true });

    slider.addEventListener('click', (e) => {
      if (isSwiping) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    window.addEventListener('resize', () => {
      snapToDomIndex(currentDomIndex);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startAutoplay();
          } else {
            stopAutoplay();
          }
        });
      }, { threshold: 0.1 });
      io.observe(slider);
    } else {
      startAutoplay();
    }

    requestAnimationFrame(() => {
      snapToDomIndex(cloneCount);
    });
    setTimeout(() => {
      snapToDomIndex(cloneCount);
    }, 300);

    return { updateSlider, next, prev, startAutoplay, stopAutoplay };
  }

  const gallerySliderInstance = initGallerySlider();

  function initMainBgSlider() {
    const slider = root.querySelector('[data-main-bg-slider]');
    if (!slider) return;

    const slides = Array.from(slider.querySelectorAll('.main-bg-slider__slide'));
    if (slides.length <= 1) return;

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

  initMainBgSlider();

  initVideoPlayers(root);
  initGalleryLightbox(root);
  initRSVPForm(root);
  initWishesLoadMore(root);
  initGiftInteractions(root);

  if (!cover || !openBtn || cover.style.display === 'none') {
    triggerRevealAnimations();
  }

  window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 120)) {
      root.querySelectorAll('[data-animate]:not(.is-animated)').forEach(el => el.classList.add('is-animated'));
    }
  }, { passive: true });

  window.addEventListener('wish:submitted', () => {
    root.querySelectorAll('.wish-card:not(.is-animated)').forEach(el => el.classList.add('is-animated'));
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNocturne);
} else {
  initNocturne();
}

document.addEventListener('astro:page-load', initNocturne);
