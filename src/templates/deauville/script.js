import { initRSVPForm, initWishesLoadMore } from '../../scripts/rsvp';
import {
  initCountdown,
  initGiftInteractions,
  initGalleryLightbox,
  initVideoPlayers,
  initBackgroundAudioHandler
} from '../../scripts/template-modules';

function destroyVerticalLenis() {
  if (typeof window !== 'undefined' && typeof window.__lenisDestroy === 'function') {
    window.__lenisDestroy();
  }
}

// Smooth editorial bezier (responsive start, long velvety deceleration)
function cubicBezierEase(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t) => (3 * ax * t + 2 * bx) * t + cx;

  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-5) break;
      const dx = sampleDX(t);
      if (Math.abs(dx) < 1e-6) break;
      t -= err / dx;
    }
    return sampleY(Math.max(0, Math.min(1, t)));
  };
}

const easeSlide = cubicBezierEase(0.38, 0.04, 0.16, 1);

function canScrollInternally(target, boundary, deltaY) {
  let el = target instanceof Element ? target : null;
  while (el && el !== boundary) {
    if (el instanceof HTMLElement && el.scrollHeight > el.clientHeight + 4) {
      const overflowY = window.getComputedStyle(el).overflowY;
      const isScrollable =
        overflowY === 'auto' ||
        overflowY === 'scroll' ||
        el.tagName === 'TEXTAREA' ||
        el.hasAttribute('data-wishes-list') ||
        el.hasAttribute('data-gift-grid');
      if (isScrollable) {
        const atTop = el.scrollTop <= 2;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
        if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) {
          return true;
        }
      }
    }
    el = el.parentElement;
  }
  return false;
}

function isCoverOrModalLocked() {
  return (
    document.body.style.overflow === 'hidden' ||
    document.body.classList.contains('template-no-scroll') ||
    document.body.classList.contains('template-cover-active') ||
    Boolean(document.querySelector('.fancybox__container'))
  );
}

function initDeauville() {
  const root = document.querySelector('body.template-deauville [data-template-root]');
  if (!(root instanceof HTMLElement) || root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';

  // Ensure vertical Lenis from BaseLayout never hijacks per-section track scroll
  destroyVerticalLenis();
  requestAnimationFrame(destroyVerticalLenis);
  window.setTimeout(destroyVerticalLenis, 150);

  const cover = root.querySelector('[data-template-cover]');
  const layout = root.querySelector('[data-template-layout]');
  const openBtn = root.querySelector('[data-template-open]');
  const track = root.querySelector('.invitation-main');
  const song = root.querySelector('[data-template-audio]');
  const audioBtn = root.querySelector('[data-template-audio-toggle]');

  let ytPlayer = null;
  let ytReady = false;
  let ytDeferredPlay = false;

  if (root.querySelector('[data-yt-bg]')) {
    const initYtPlayers = () => {
      const ytBgEls = root.querySelectorAll('[data-yt-bg]');
      ytBgEls.forEach((ytBgEl) => {
        const videoId = ytBgEl.getAttribute('data-yt-bg');
        if (!videoId || ytBgEl.childElementCount > 0 || !window.YT?.Player) return;

        const playerDiv = document.createElement('div');
        ytBgEl.appendChild(playerDiv);

        ytPlayer = new window.YT.Player(playerDiv, {
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            loop: 1,
            playlist: videoId,
            playsinline: 1,
            mute: 1,
            rel: 0,
            showinfo: 0,
            modestbranding: 1,
            disablekb: 1
          },
          events: {
            onReady: (event) => {
              ytReady = true;
              event.target.mute();
              if (ytDeferredPlay) {
                event.target.playVideo();
              }
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                event.target.playVideo();
              }
            }
          }
        });
      });
    };

    if (window.YT?.Player) {
      initYtPlayers();
    } else {
      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevReady === 'function') prevReady();
        initYtPlayers();
      };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
          document.head.appendChild(tag);
        }
      }
    }
  }

  root.querySelectorAll('video').forEach((v) => {
    v.removeAttribute('autoplay');
    v.pause();
  });

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  if (cover instanceof HTMLElement) {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (track instanceof HTMLElement) track.scrollTop = 0;
    document.body.classList.add('template-no-scroll', 'template-cover-active');
  }

  const slides = track instanceof HTMLElement
    ? Array.from(track.querySelectorAll(':scope > .snap-section'))
    : [];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;
  const resetRafMap = new WeakMap();

  let activeIndex = 0;
  let wheelCooldownUntil = 0;
  let lastWheelTime = 0;
  let lastWheelAbs = 0;
  let inertiaGuardUntil = 0;
  let revealsStarted = false;

  let glideRaf = null;
  let isGliding = false;
  let glideTargetIndex = 0;
  let glideDirection = 0;
  let glideStartedAt = 0;

  function assignStaggerDelays() {
    const openingItems = Array.from(root.querySelectorAll('[data-opening-animate]'));
    openingItems.forEach((item, index) => {
      if (item instanceof HTMLElement && !item.style.getPropertyValue('--opening-delay')) {
        item.style.setProperty('--opening-delay', `${index * 0.35}s`);
      }
    });

    const animatedItems = Array.from(root.querySelectorAll('[data-animate]'));
    animatedItems.forEach((item) => {
      if (!(item instanceof HTMLElement) || item.style.getPropertyValue('--animate-delay')) return;

      const wishesList = item.closest('.wishes-list');
      if (wishesList && wishesList !== item) {
        const listItems = Array.from(wishesList.querySelectorAll(':scope > [data-animate]'));
        const idx = listItems.indexOf(item);
        if (idx >= 0) {
          item.style.setProperty('--animate-delay', `${Math.min(idx * 140, 800)}ms`);
        }
        return;
      }

      const container = item.closest(
        '.event-card, .countdown-section, .rsvp-section, .gift-section'
      );
      if (container && container !== item) {
        const containerItems = Array.from(container.querySelectorAll('[data-animate]'));
        const idx = containerItems.indexOf(item);
        if (idx >= 0) {
          item.style.setProperty('--animate-delay', `${Math.min(idx * 180, 1200)}ms`);
        }
        return;
      }

      const parent = item.parentElement;
      if (!parent) return;
      const computedStyle = window.getComputedStyle(parent);
      const display = computedStyle.display;
      const colCount = (display === 'grid' || display === 'inline-grid')
        ? computedStyle.gridTemplateColumns.split(' ').filter(Boolean).length
        : 1;
      const isGrid = colCount > 1 || parent.classList.contains('gallery-grid');
      const siblings = Array.from(parent.querySelectorAll(':scope > [data-animate]'));
      if (siblings.length > 1) {
        const siblingIndex = siblings.indexOf(item);
        if (siblingIndex >= 0) {
          const delay = isGrid
            ? Math.min((siblingIndex % (colCount > 1 ? colCount : 2)) * 140 + Math.floor(siblingIndex / (colCount > 1 ? colCount : 2)) * 80, 800)
            : Math.min(siblingIndex * 180, 1200);
          item.style.setProperty('--animate-delay', `${delay}ms`);
        }
      }
    });
  }

  function cancelGlide() {
    if (glideRaf !== null) {
      cancelAnimationFrame(glideRaf);
      glideRaf = null;
    }
    isGliding = false;
    glideDirection = 0;
    if (track instanceof HTMLElement) {
      track.classList.remove('is-gliding');
    }
  }

  function resetSlideItems(slide) {
    if (!slide || reduceMotion) return;
    const pendingRaf = resetRafMap.get(slide);
    if (pendingRaf) {
      cancelAnimationFrame(pendingRaf);
      resetRafMap.delete(slide);
    }
    delete slide.dataset.slideAnimated;

    const items = slide.querySelectorAll('[data-animate], [data-opening-animate]');
    if (!items.length) return;
    items.forEach((el) => {
      el.classList.add('is-resetting');
      el.classList.remove('is-animated');
    });
    void slide.offsetWidth;
    const rafId = requestAnimationFrame(() => {
      resetRafMap.delete(slide);
      items.forEach((el) => el.classList.remove('is-resetting'));
    });
    resetRafMap.set(slide, rafId);
  }

  function animateSlideItems(slide) {
    if (!slide) return;
    const items = slide.querySelectorAll('[data-animate], [data-opening-animate]');
    if (reduceMotion) {
      items.forEach((el) => el.classList.add('is-animated'));
      return;
    }
    if (slide.dataset.slideAnimated === 'true') return;

    const pendingRaf = resetRafMap.get(slide);
    if (pendingRaf) {
      cancelAnimationFrame(pendingRaf);
      resetRafMap.delete(slide);
      items.forEach((el) => el.classList.remove('is-resetting'));
      void slide.offsetWidth;
    }

    slide.dataset.slideAnimated = 'true';
    if (!items.length) return;
    requestAnimationFrame(() => {
      items.forEach((el) => {
        el.classList.remove('is-resetting');
        el.classList.add('is-animated');
      });
    });
  }

  function updateTrackChrome(idx) {
    activeIndex = idx;
    if (revealsStarted && (reduceMotion || !hasIO)) {
      animateSlideItems(slides[idx]);
    }
  }

  function resetOffscreenSlides(activeSlideIndex) {
    if (!revealsStarted || reduceMotion) return;
    slides.forEach((s, i) => {
      if (i !== activeSlideIndex && s.dataset.slideAnimated === 'true') {
        resetSlideItems(s);
      }
    });
  }

  function goToSlide(index, smooth = true) {
    if (!(track instanceof HTMLElement) || slides.length === 0) return;
    const clamped = Math.max(0, Math.min(slides.length - 1, index));
    const targetSlide = slides[clamped];
    if (!(targetSlide instanceof HTMLElement)) return;

    cancelGlide();
    updateTrackChrome(clamped);

    const targetTop = targetSlide.offsetTop;
    if (!smooth || reduceMotion || Math.abs(targetTop - track.scrollTop) < 2) {
      track.scrollTop = targetTop;
      if (revealsStarted) {
        resetOffscreenSlides(clamped);
        animateSlideItems(targetSlide);
      }
      return;
    }

    const startTop = track.scrollTop;
    const delta = targetTop - startTop;
    const slideDist = Math.max(1, Math.round(Math.abs(delta) / (track.clientHeight || 1)));
    const duration = Math.min(1500, 1180 + (slideDist - 1) * 90);

    isGliding = true;
    glideTargetIndex = clamped;
    glideDirection = delta >= 0 ? 1 : -1;
    glideStartedAt = performance.now();
    track.classList.add('is-gliding');

    let frameOrigin = null;
    function step(now) {
      if (frameOrigin === null) frameOrigin = now;
      const elapsed = Math.max(0, now - frameOrigin);
      const t = Math.min(1, elapsed / duration);
      track.scrollTop = startTop + delta * easeSlide(t);

      if (t < 1) {
        glideRaf = requestAnimationFrame(step);
      } else {
        track.scrollTop = targetTop;
        cancelGlide();
        if (revealsStarted) {
          animateSlideItems(targetSlide);
          requestAnimationFrame(() => {
            if (!isGliding) resetOffscreenSlides(activeIndex);
          });
        }
      }
    }

    glideRaf = requestAnimationFrame(step);
  }

  function initSlideReveals() {
    if (revealsStarted) return;
    revealsStarted = true;

    root.querySelectorAll('.sidebar-section [data-animate]').forEach((el) => {
      el.classList.add('is-animated');
    });

    if (reduceMotion || !(track instanceof HTMLElement) || !hasIO) {
      root.querySelectorAll('[data-animate], [data-opening-animate]').forEach((el) => {
        el.classList.add('is-animated');
      });
      return;
    }

    animateSlideItems(slides[activeIndex]);

    const slideObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!(entry.target instanceof HTMLElement)) return;
        if (entry.intersectionRatio >= 0.5) {
          if (isGliding && entry.target !== slides[glideTargetIndex]) return;
          animateSlideItems(entry.target);
        } else if (entry.intersectionRatio <= 0.04) {
          // Defer offscreen reflows while gliding so animations never stutter mid-frame
          if (isGliding) return;
          resetSlideItems(entry.target);
        }
      });
    }, {
      root: track,
      threshold: [0.02, 0.5]
    });

    slides.forEach((slide) => slideObserver.observe(slide));
  }

  function playAutoplayVideos() {
    const videos = Array.from(root.querySelectorAll('video') || []);
    videos.forEach((video) => {
      if (video instanceof HTMLVideoElement) {
        video.play().catch(() => {});
      }
    });

    if (root.querySelector('[data-yt-bg]')) {
      if (ytReady && ytPlayer && typeof ytPlayer.playVideo === 'function') {
        ytPlayer.playVideo();
      } else {
        ytDeferredPlay = true;
      }
    }
  }

  openBtn?.addEventListener('click', () => {
    if (cover instanceof HTMLElement) {
      cover.classList.add('is-opening');
    }
    if (layout instanceof HTMLElement) {
      layout.style.opacity = '1';
    }

    playAutoplayVideos();

    window.setTimeout(() => {
      initSlideReveals();
      initGalleryLightbox(root);
      goToSlide(0, false);
    }, 1100);

    window.setTimeout(() => {
      if (cover instanceof HTMLElement) {
        cover.classList.remove('is-opening');
        cover.classList.add('is-opened');
        cover.style.display = 'none';
      }
      document.body.classList.remove('template-no-scroll', 'template-cover-active');
      document.body.style.height = '';
    }, 2000);

    if (song instanceof HTMLAudioElement) {
      song.play().catch(() => {});
      audioBtn?.classList.add('audio-toggle--playing');
    }
  });

  if (song && audioBtn) {
    initBackgroundAudioHandler(song, audioBtn);
  }

  function initSliders() {
    const sliders = Array.from(root.querySelectorAll('[data-template-slider]') || []);
    sliders.forEach((slider) => {
      const bgSlides = Array.from(slider.querySelectorAll('.template-slide'));
      if (bgSlides.length <= 1) return;

      let bgActiveIndex = Math.max(bgSlides.findIndex((slide) => slide.classList.contains('is-active')), 0);
      bgSlides[bgActiveIndex]?.classList.add('is-active');
      if (reduceMotion) return;

      window.setInterval(() => {
        bgSlides[bgActiveIndex]?.classList.remove('is-active');
        bgActiveIndex = (bgActiveIndex + 1) % bgSlides.length;
        bgSlides[bgActiveIndex]?.classList.add('is-active');
      }, 4000);
    });
  }

  function initGallerySliders() {
    const sliders = Array.from(root.querySelectorAll('[data-gallery-slider]') || []);
    sliders.forEach((slider) => {
      const gTrack = slider.querySelector('.gallery-slider__track');
      const gSlides = Array.from(slider.querySelectorAll('.gallery-slider__slide'));
      const dots = Array.from(slider.querySelectorAll('.gallery-slider__dot'));
      const prevBtn = slider.querySelector('[data-slider-prev]');
      const nextBtn = slider.querySelector('[data-slider-next]');

      if (!(gTrack instanceof HTMLElement) || gSlides.length <= 1) return;

      let currentIndex = 0;
      let timer = null;

      const update = () => {
        gTrack.style.transform = `translateX(-${currentIndex * 100}%)`;
        gSlides.forEach((slide, idx) => slide.classList.toggle('is-active', idx === currentIndex));
        dots.forEach((dot, idx) => dot.classList.toggle('is-active', idx === currentIndex));
      };

      const next = () => {
        currentIndex = (currentIndex + 1) % gSlides.length;
        update();
      };

      const prev = () => {
        currentIndex = (currentIndex - 1 + gSlides.length) % gSlides.length;
        update();
      };

      const stopTimer = () => {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      };

      const startTimer = () => {
        if (reduceMotion) return;
        stopTimer();
        timer = setInterval(next, 5000);
      };

      prevBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        prev();
        startTimer();
      });

      nextBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        next();
        startTimer();
      });

      dots.forEach((dot, idx) => {
        dot.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          currentIndex = idx;
          update();
          startTimer();
        });
      });

      slider.addEventListener('mouseenter', stopTimer);
      slider.addEventListener('mouseleave', startTimer);

      let startX = 0;
      let startY = 0;
      let isSwiping = false;

      slider.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          startX = e.touches[0].screenX;
          startY = e.touches[0].screenY;
          isSwiping = false;
          stopTimer();
        }
      }, { passive: true });

      slider.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
          const diffX = e.touches[0].screenX - startX;
          const diffY = e.touches[0].screenY - startY;
          if (Math.abs(diffX) > 15 && Math.abs(diffX) > Math.abs(diffY)) {
            isSwiping = true;
          }
        }
      }, { passive: true });

      slider.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 1) {
          const diffX = e.changedTouches[0].screenX - startX;
          const diffY = e.changedTouches[0].screenY - startY;
          if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX < 0) next();
            else prev();
          }
          if (isSwiping) {
            setTimeout(() => { isSwiping = false; }, 350);
          }
          startTimer();
        }
      }, { passive: true });

      slider.addEventListener('click', (e) => {
        if (isSwiping) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);

      update();

      if (hasIO) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) startTimer();
            else stopTimer();
          });
        }, { threshold: 0.15 });
        io.observe(slider);
      } else {
        startTimer();
      }
    });
  }

  if (track instanceof HTMLElement && slides.length > 0) {
    track.addEventListener('touchstart', () => {
      cancelGlide();
    }, { passive: true });

    let scrollRaf = null;
    track.addEventListener('scroll', () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = null;
        if (isGliding) return;
        const h = track.clientHeight || 1;
        const idx = Math.round(track.scrollTop / h);
        const clamped = Math.max(0, Math.min(slides.length - 1, idx));
        if (clamped !== activeIndex) {
          updateTrackChrome(clamped);
        }
      });
    }, { passive: true });

    track.addEventListener('wheel', (e) => {
      if (isCoverOrModalLocked()) return;

      // Let native horizontal gestures (trackpad 2-finger swipe / carousel) behave naturally
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      // Allow internal vertical scroll inside scrollable sections/lists while not at boundary
      if (canScrollInternally(e.target, track, e.deltaY)) return;

      e.preventDefault();
      if (Math.abs(e.deltaY) < 8) return;

      const now = Date.now();
      const dir = e.deltaY > 0 ? 1 : -1;
      const absY = Math.abs(e.deltaY);

      if (isGliding) {
        if (dir === glideDirection || now - glideStartedAt < 220) {
          lastWheelTime = now;
          lastWheelAbs = absY;
          return;
        }
        lastWheelTime = now;
        lastWheelAbs = absY;
        wheelCooldownUntil = now + 450;
        inertiaGuardUntil = now + 950;
        goToSlide(glideTargetIndex + dir, true);
        return;
      }

      if (now < inertiaGuardUntil && now - lastWheelTime < 110 && absY <= lastWheelAbs + 3) {
        lastWheelTime = now;
        lastWheelAbs = absY;
        return;
      }

      if (now < wheelCooldownUntil) {
        lastWheelTime = now;
        lastWheelAbs = absY;
        return;
      }

      lastWheelTime = now;
      lastWheelAbs = absY;
      wheelCooldownUntil = now + 450;
      inertiaGuardUntil = now + 950;

      goToSlide(activeIndex + dir, true);
    }, { passive: false });

    let resizeSnapTimeout;
    window.addEventListener('resize', () => {
      if (isCoverOrModalLocked()) return;
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

      clearTimeout(resizeSnapTimeout);
      resizeSnapTimeout = window.setTimeout(() => {
        cancelGlide();
        const current = slides[activeIndex];
        if (current instanceof HTMLElement) {
          track.scrollTop = current.offsetTop;
        }
      }, 150);
    }, { passive: true });

    window.addEventListener('focusout', (e) => {
      const targetTag = e.target instanceof Element ? e.target.tagName : '';
      if (targetTag === 'TEXTAREA' || targetTag === 'INPUT' || targetTag === 'SELECT') {
        window.setTimeout(() => {
          const activeTag = document.activeElement?.tagName;
          if (!['TEXTAREA', 'INPUT', 'SELECT'].includes(activeTag || '') && !isGliding) {
            goToSlide(activeIndex, false);
          }
        }, 250);
      }
    });

    updateTrackChrome(0);
  }

  document.addEventListener('keydown', (e) => {
    if (isCoverOrModalLocked()) return;
    const activeEl = document.activeElement;
    const tag = activeEl?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || activeEl?.isContentEditable) {
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && tag !== 'BUTTON' && tag !== 'A')) {
      e.preventDefault();
      goToSlide(activeIndex + 1, true);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      goToSlide(activeIndex - 1, true);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goToSlide(0, true);
    } else if (e.key === 'End') {
      e.preventDefault();
      goToSlide(slides.length - 1, true);
    }
  });

  assignStaggerDelays();
  initSliders();
  initGallerySliders();
  initCountdown(root);
  initGalleryLightbox(root);
  initVideoPlayers(root);
  initRSVPForm(root);
  initWishesLoadMore(root);
  initGiftInteractions(root);

  if (!cover || !openBtn || (cover instanceof HTMLElement && cover.style.display === 'none')) {
    initSlideReveals();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDeauville);
} else {
  initDeauville();
}

document.addEventListener('astro:page-load', initDeauville);
