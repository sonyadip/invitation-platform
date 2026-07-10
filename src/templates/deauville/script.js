import { initRSVPForm, initWishesLoadMore } from '../../scripts/rsvp';
import { 
  initCountdown, 
  initGiftInteractions, 
  initGalleryLightbox, 
  initVideoPlayers, 
  initRevealAnimations 
} from '../../scripts/template-modules';

const root = document.querySelector('body.template-deauville [data-template-root]');
const cover = root?.querySelector('[data-template-cover]');
const openBtn = root?.querySelector('[data-template-open]');
const song = root?.querySelector('[data-template-audio]');
const audioBtn = root?.querySelector('[data-template-audio-toggle]');
let isPlaying = false;

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

  window.setTimeout(() => {
    if (cover instanceof HTMLElement) {
      cover.classList.remove('is-opening');
      cover.classList.add('is-opened');
    }

    document.body.classList.remove('template-no-scroll', 'template-cover-active');
    document.body.style.height = '';
    triggerOpeningAnimations();
  }, 2000);

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

function triggerOpeningAnimations() {
  const items = Array.from(root?.querySelectorAll('[data-opening-animate]') || []);
  if (!items.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  items.forEach((item, index) => {
    if (!(item instanceof HTMLElement)) return;
    item.classList.remove('is-animated');
    item.style.setProperty('--opening-delay', `${0.0 + (index * 0.35)}s`);
    if (reduceMotion) {
      item.classList.add('is-animated');
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        item.classList.add('is-animated');
      });
    });
  });
}

function initSliders() {
  const sliders = Array.from(root?.querySelectorAll('[data-template-slider]') || []);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  sliders.forEach((slider) => {
    const slides = Array.from(slider.querySelectorAll('.template-slide'));
    if (slides.length <= 1) return;

    let activeIndex = Math.max(slides.findIndex((slide) => slide.classList.contains('is-active')), 0);
    slides[activeIndex]?.classList.add('is-active');
    if (reduceMotion) return;

    setInterval(() => {
      slides[activeIndex]?.classList.remove('is-active');
      activeIndex = (activeIndex + 1) % slides.length;
      slides[activeIndex]?.classList.add('is-active');
    }, 4000);
  });
}

function initFullpageScroll() {
  const allSections = Array.from(root?.querySelectorAll('.snap-section') || []);
  if (!allSections.length) return;

  let isScrolling = false;
  let currentSectionIndex = 0;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const index = allSections.indexOf(entry.target);
        if (index !== -1) {
          currentSectionIndex = index;
        }
      }
    });
  }, { threshold: 0.5 });

  allSections.forEach(sec => observer.observe(sec));

  window.addEventListener('wheel', (e) => {
    if (document.body.style.overflow === 'hidden' || document.body.classList.contains('template-no-scroll')) {
      return;
    }

    const target = e.target;
    const scrollable = target.closest('textarea, [data-wishes-list], [data-gift-grid]');
    if (scrollable && scrollable.scrollHeight > scrollable.clientHeight) {
      return;
    }

    e.preventDefault();

    if (isScrolling) return;

    if (e.deltaY > 0) {
      if (currentSectionIndex < allSections.length - 1) {
        currentSectionIndex++;
        scrollToSection(currentSectionIndex);
      }
    } else if (e.deltaY < 0) {
      if (currentSectionIndex > 0) {
        currentSectionIndex--;
        scrollToSection(currentSectionIndex);
      }
    }
  }, { passive: false });

  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (document.body.style.overflow === 'hidden' || document.body.classList.contains('template-no-scroll')) {
      return;
    }

    const target = e.target;
    const scrollable = target.closest('textarea, [data-wishes-list], [data-gift-grid]');
    if (scrollable && scrollable.scrollHeight > scrollable.clientHeight) {
      return;
    }

    e.preventDefault();

    if (isScrolling) return;

    const touchEndY = e.touches[0].clientY;
    const diff = touchStartY - touchEndY;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        if (currentSectionIndex < allSections.length - 1) {
          currentSectionIndex++;
          scrollToSection(currentSectionIndex);
          touchStartY = touchEndY;
        }
      } else {
        if (currentSectionIndex > 0) {
          currentSectionIndex--;
          scrollToSection(currentSectionIndex);
          touchStartY = touchEndY;
        }
      }
    }
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (document.body.style.overflow === 'hidden' || document.body.classList.contains('template-no-scroll')) {
      return;
    }

    const target = e.target;
    const targetTag = target.tagName.toLowerCase();
    if (targetTag === 'textarea' || targetTag === 'input' || targetTag === 'select') {
      return;
    }

    if (["ArrowUp", "PageUp", "Home"].includes(e.key)) {
      e.preventDefault();
      if (!isScrolling && currentSectionIndex > 0) {
        currentSectionIndex--;
        scrollToSection(currentSectionIndex);
      }
    } else if (["ArrowDown", "PageDown", "Space", "End"].includes(e.key)) {
      e.preventDefault();
      if (!isScrolling && currentSectionIndex < allSections.length - 1) {
        currentSectionIndex++;
        scrollToSection(currentSectionIndex);
      }
    }
  }, { passive: false });

  let windowHeight = window.innerHeight;
  window.addEventListener('resize', () => {
    if (document.body.style.overflow === 'hidden' || document.body.classList.contains('template-no-scroll')) {
      return;
    }
    
    clearTimeout(window.resizeSnapTimeout);
    window.resizeSnapTimeout = setTimeout(() => {
      // Re-snap when window height increases (e.g. mobile keyboard closes) or orientation changes
      if (window.innerHeight > windowHeight || Math.abs(window.innerHeight - windowHeight) > 100) {
        if (!isScrolling && allSections[currentSectionIndex]) {
          // Temporarily disable isScrolling block for immediate snap
          const tempIsScrolling = isScrolling;
          isScrolling = false;
          scrollToSection(currentSectionIndex);
          isScrolling = tempIsScrolling;
        }
      }
      windowHeight = window.innerHeight;
    }, 250);
  }, { passive: true });

  // Also handle focusout for forms as a fallback
  window.addEventListener('focusout', (e) => {
    const targetTag = e.target.tagName?.toLowerCase();
    if (targetTag === 'textarea' || targetTag === 'input' || targetTag === 'select') {
      setTimeout(() => {
        // Only snap if no other input is currently focused
        if (!['textarea', 'input', 'select'].includes(document.activeElement?.tagName?.toLowerCase())) {
          const tempIsScrolling = isScrolling;
          isScrolling = false;
          scrollToSection(currentSectionIndex);
          isScrolling = tempIsScrolling;
        }
      }, 300);
    }
  });

  function scrollToSection(index) {
    if (isScrolling) return;
    isScrolling = true;

    const targetSection = allSections[index];
    const targetY = targetSection.getBoundingClientRect().top + window.scrollY;
    const startY = window.scrollY;
    const distance = targetY - startY;
    const duration = 1200;
    let startTime = null;

    function easeInOutQuart(t) {
      return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    }

    const originalScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';

    function animation(currentTime) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easeProgress = easeInOutQuart(progress);

      window.scrollTo(0, startY + (distance * easeProgress));

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      } else {
        document.documentElement.style.scrollBehavior = originalScrollBehavior;
        setTimeout(() => {
          isScrolling = false;
        }, 100);
      }
    }

    requestAnimationFrame(animation);
  }
}

if (root) {
  initSliders();
  initRevealAnimations(root);
  initCountdown(root);
  initGalleryLightbox(root);
  initVideoPlayers(root);
  initRSVPForm(root);
  initWishesLoadMore(root);
  initGiftInteractions(root);
  initFullpageScroll();
}
