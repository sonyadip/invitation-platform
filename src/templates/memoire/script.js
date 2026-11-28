import { initRSVPForm, initWishesLoadMore } from '../../scripts/rsvp';
import {
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

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function initMemoire() {
  const root = document.querySelector('body.template-memoire [data-template-root]');
  if (!(root instanceof HTMLElement) || root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';

  // Ensure vertical Lenis from BaseLayout never hijacks horizontal track wheel/scroll
  destroyVerticalLenis();
  requestAnimationFrame(destroyVerticalLenis);
  window.setTimeout(destroyVerticalLenis, 150);

  const cover = root.querySelector('[data-template-cover]');
  const openBtn = root.querySelector('[data-template-open]');
  const layout = root.querySelector('[data-template-layout]');
  const track = root.querySelector('[data-horizontal-track]');
  const song = root.querySelector('[data-template-audio]');
  const audioBtn = root.querySelector('[data-template-audio-toggle]');

  if (cover instanceof HTMLElement) {
    document.body.classList.add('template-no-scroll', 'template-cover-active');
  }

  const slides = track instanceof HTMLElement
    ? Array.from(track.querySelectorAll(':scope > .h-slide'))
    : [];
  const storyHostSlide = slides.find((s) => s.hasAttribute('data-story-host')) || null;
  const storyHostIndex = storyHostSlide ? slides.indexOf(storyHostSlide) : -1;
  const storyTrack = storyHostSlide?.querySelector('[data-story-vertical-track]') || null;
  const storySlides = storyTrack instanceof HTMLElement
    ? Array.from(storyTrack.querySelectorAll(':scope > [data-story-slide]'))
    : [];

  const nextCueBtn = root.querySelector('[data-track-next-cue]');
  const navLinks = Array.from(root.querySelectorAll('[data-nav-target]'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;

  let activeIndex = 0;
  let storyActiveIndex = 0;
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

  let storyGlideRaf = null;
  let isStoryGliding = false;
  let storyGlideTargetIndex = 0;
  let storyGlideDirection = 0;
  let storyGlideStartedAt = 0;

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

  function cancelStoryGlide() {
    if (storyGlideRaf !== null) {
      cancelAnimationFrame(storyGlideRaf);
      storyGlideRaf = null;
    }
    isStoryGliding = false;
    storyGlideDirection = 0;
    if (storyTrack instanceof HTMLElement) {
      storyTrack.classList.remove('is-gliding');
    }
  }

  function resetSingleContainer(container) {
    if (!container || reduceMotion) return;
    delete container.dataset.slideAnimated;
    const items = container.querySelectorAll('[data-animate]');
    if (!items.length) return;
    items.forEach((el) => {
      el.classList.add('is-resetting');
      el.classList.remove('is-animated');
    });
    void container.offsetWidth;
    requestAnimationFrame(() => {
      items.forEach((el) => el.classList.remove('is-resetting'));
    });
  }

  function animateSingleContainer(container) {
    if (!container) return;
    if (reduceMotion) {
      container.querySelectorAll('[data-animate]').forEach((el) => el.classList.add('is-animated'));
      return;
    }
    if (container.dataset.slideAnimated === 'true') return;
    container.dataset.slideAnimated = 'true';
    const items = container.querySelectorAll('[data-animate]');
    if (!items.length) return;
    requestAnimationFrame(() => {
      items.forEach((el) => {
        el.classList.remove('is-resetting');
        el.classList.add('is-animated');
      });
    });
  }

  function resetSlideItems(slide) {
    if (!slide || reduceMotion) return;
    if (slide === storyHostSlide && storySlides.length > 0) {
      storySlides.forEach(resetSingleContainer);
      return;
    }
    resetSingleContainer(slide);
  }

  function animateSlideItems(slide) {
    if (!slide) return;
    if (slide === storyHostSlide && storySlides.length > 0) {
      animateSingleContainer(storySlides[storyActiveIndex]);
      return;
    }
    animateSingleContainer(slide);
  }

  function updateTrackChrome(idx) {
    activeIndex = idx;

    const activeId = slides[idx]?.id;
    navLinks.forEach((btn) => {
      const targetId = (btn.getAttribute('data-nav-target') || '').replace(/^#/, '');
      const isMatch = activeId === targetId || (targetId === 'mempelai-pria' && activeId === 'mempelai-wanita');
      btn.classList.toggle('is-active', Boolean(isMatch));
    });

    if (revealsStarted && (reduceMotion || !hasIO)) {
      animateSlideItems(slides[idx]);
    }
  }

  function goToStorySlide(index, smooth = true, opts = {}) {
    if (!(storyTrack instanceof HTMLElement) || storySlides.length === 0) return;
    const clamped = Math.max(0, Math.min(storySlides.length - 1, index));
    const targetStory = storySlides[clamped];
    if (!(targetStory instanceof HTMLElement)) return;

    cancelStoryGlide();
    storyActiveIndex = clamped;

    const targetTop = targetStory.offsetTop;
    if (!smooth || reduceMotion || Math.abs(targetTop - storyTrack.scrollTop) < 2) {
      storyTrack.scrollTop = targetTop;
      if (opts.skipAnimate) {
        storySlides.forEach(resetSingleContainer);
        return;
      }
      storySlides.forEach((s, i) => {
        if (i !== clamped) resetSingleContainer(s);
      });
      if (revealsStarted && activeIndex === storyHostIndex) {
        animateSingleContainer(targetStory);
      }
      return;
    }

    const startTop = storyTrack.scrollTop;
    const delta = targetTop - startTop;
    const storyDist = Math.max(1, Math.round(Math.abs(delta) / (storyTrack.clientHeight || 1)));
    const duration = Math.min(1150, 860 + (storyDist - 1) * 65);

    isStoryGliding = true;
    storyGlideTargetIndex = clamped;
    storyGlideDirection = delta >= 0 ? 1 : -1;
    storyGlideStartedAt = performance.now();
    storyTrack.classList.add('is-gliding');

    function step(now) {
      const elapsed = now - storyGlideStartedAt;
      const t = Math.min(1, elapsed / duration);
      storyTrack.scrollTop = startTop + delta * easeInOutCubic(t);

      if (t < 1) {
        storyGlideRaf = requestAnimationFrame(step);
      } else {
        storyTrack.scrollTop = targetTop;
        cancelStoryGlide();
        if (revealsStarted && activeIndex === storyHostIndex) {
          animateSingleContainer(targetStory);
        }
      }
    }

    storyGlideRaf = requestAnimationFrame(step);
  }

  function goToSlide(index, smooth = true, opts = {}) {
    if (!(track instanceof HTMLElement) || slides.length === 0) return;
    const clamped = Math.max(0, Math.min(slides.length - 1, index));
    const targetSlide = slides[clamped];
    if (!(targetSlide instanceof HTMLElement)) return;

    const prevIndex = activeIndex;

    if (clamped === storyHostIndex && storySlides.length > 0) {
      if (prevIndex === storyHostIndex && typeof opts.storyIndex === 'number') {
        goToStorySlide(opts.storyIndex, smooth);
        return;
      }
      if (prevIndex !== storyHostIndex) {
        const entryStoryIdx = typeof opts.storyIndex === 'number'
          ? opts.storyIndex
          : (prevIndex > storyHostIndex ? storySlides.length - 1 : 0);
        goToStorySlide(entryStoryIdx, false, { skipAnimate: true });
      }
    }

    cancelStoryGlide();
    cancelGlide();
    updateTrackChrome(clamped);

    const targetLeft = targetSlide.offsetLeft;
    if (!smooth || reduceMotion || Math.abs(targetLeft - track.scrollLeft) < 2) {
      track.scrollLeft = targetLeft;
      if (revealsStarted) {
        animateSlideItems(targetSlide);
      }
      return;
    }

    const startLeft = track.scrollLeft;
    const delta = targetLeft - startLeft;
    const slideDist = Math.max(1, Math.round(Math.abs(delta) / (track.clientWidth || 1)));
    const duration = Math.min(1250, 900 + (slideDist - 1) * 70);

    isGliding = true;
    glideTargetIndex = clamped;
    glideDirection = delta >= 0 ? 1 : -1;
    glideStartedAt = performance.now();
    track.classList.add('is-gliding');

    function step(now) {
      const elapsed = now - glideStartedAt;
      const t = Math.min(1, elapsed / duration);
      track.scrollLeft = startLeft + delta * easeInOutCubic(t);

      if (t < 1) {
        glideRaf = requestAnimationFrame(step);
      } else {
        track.scrollLeft = targetLeft;
        cancelGlide();
        if (revealsStarted) {
          animateSlideItems(targetSlide);
        }
      }
    }

    glideRaf = requestAnimationFrame(step);
  }

  function navigateStep(dir) {
    if (storyHostIndex >= 0 && activeIndex === storyHostIndex && storySlides.length > 0) {
      const nextStoryIdx = storyActiveIndex + dir;
      if (nextStoryIdx >= 0 && nextStoryIdx < storySlides.length) {
        goToStorySlide(nextStoryIdx, true);
        return;
      }
    }
    goToSlide(activeIndex + dir, true);
  }

  function initSlideReveals() {
    if (revealsStarted) return;
    revealsStarted = true;

    root.querySelectorAll('.sidebar [data-animate]').forEach((el) => el.classList.add('is-animated'));

    if (reduceMotion || !(track instanceof HTMLElement) || !hasIO) {
      root.querySelectorAll('[data-animate]').forEach((el) => el.classList.add('is-animated'));
      return;
    }

    animateSlideItems(slides[activeIndex]);

    const slideObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!(entry.target instanceof HTMLElement)) return;
        if (entry.intersectionRatio >= 0.3) {
          if (isGliding && entry.target !== slides[glideTargetIndex]) return;
          animateSlideItems(entry.target);
        } else if (entry.intersectionRatio <= 0.04) {
          resetSlideItems(entry.target);
        }
      });
    }, {
      root: track,
      threshold: [0.02, 0.3]
    });

    slides.forEach((slide) => slideObserver.observe(slide));

    if (storyTrack instanceof HTMLElement && storySlides.length > 0) {
      const storyObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!(entry.target instanceof HTMLElement)) return;
          if (entry.intersectionRatio >= 0.3) {
            if (activeIndex !== storyHostIndex) return;
            if (isGliding && glideTargetIndex !== storyHostIndex) return;
            if (isStoryGliding && entry.target !== storySlides[storyGlideTargetIndex]) return;
            animateSingleContainer(entry.target);
          } else if (entry.intersectionRatio <= 0.04) {
            resetSingleContainer(entry.target);
          }
        });
      }, {
        root: storyTrack,
        threshold: [0.02, 0.3]
      });

      storySlides.forEach((storySlide) => storyObserver.observe(storySlide));
    }
  }

  const initialBgVideo = root.querySelector('.main-bg-layer__video');
  if (initialBgVideo instanceof HTMLVideoElement && (cover instanceof HTMLElement || reduceMotion)) {
    initialBgVideo.removeAttribute('autoplay');
    initialBgVideo.pause();
  }

  openBtn?.addEventListener('click', () => {
    if (cover instanceof HTMLElement) {
      if (cover.classList.contains('is-opening') || cover.classList.contains('is-opened')) return;
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
    }, reduceMotion ? 0 : 1700);

    if (song instanceof HTMLAudioElement) {
      song.play().catch(() => {});
      audioBtn?.classList.add('audio-toggle--playing');
    }

    const bgVideo = root.querySelector('.main-bg-layer__video');
    if (bgVideo instanceof HTMLVideoElement) {
      bgVideo.muted = true;
      if (reduceMotion) {
        bgVideo.pause();
      } else {
        bgVideo.play().catch(() => {});
      }
    }

    window.setTimeout(() => {
      initSlideReveals();
      initGalleryLightbox(root, 'gallery');
      gallerySliderInstance?.updateSlider(0, false);
      goToSlide(0, false);
    }, reduceMotion ? 0 : 520);
  });

  if (song && audioBtn) {
    initBackgroundAudioHandler(song, audioBtn);
  }

  const menuToggle = root.querySelector('[data-menu-toggle]');
  const menuDrawer = root.querySelector('[data-menu-drawer]');

  function setDrawerOpen(open) {
    if (!(menuDrawer instanceof HTMLElement) || !(menuToggle instanceof HTMLElement)) return;
    menuDrawer.classList.toggle('is-open', open);
    menuToggle.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
  }

  menuToggle?.addEventListener('click', () => {
    const isOpen = menuDrawer?.classList.contains('is-open');
    setDrawerOpen(!isOpen);
  });

  document.addEventListener('pointerdown', (e) => {
    if (!menuDrawer?.classList.contains('is-open')) return;
    if (e.target instanceof Node && !menuToggle?.contains(e.target) && !menuDrawer.contains(e.target)) {
      setDrawerOpen(false);
    }
  });

  navLinks.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selector = btn.getAttribute('data-nav-target');
      if (!selector) return;
      const targetSlide = track?.querySelector(selector);
      const targetIdx = targetSlide ? slides.indexOf(targetSlide) : -1;
      setDrawerOpen(false);
      if (targetIdx >= 0) {
        goToSlide(targetIdx, true, targetIdx === storyHostIndex ? { storyIndex: 0 } : {});
      }
    });
  });

  nextCueBtn?.addEventListener('click', () => goToSlide(activeIndex + 1, true));

  if (storyTrack instanceof HTMLElement && storySlides.length > 0) {
    storyTrack.querySelectorAll('[data-story-next]').forEach((btn) => {
      btn.addEventListener('click', () => goToStorySlide(storyActiveIndex + 1, true));
    });
    storyTrack.querySelectorAll('[data-story-continue-right]').forEach((btn) => {
      btn.addEventListener('click', () => goToSlide(activeIndex + 1, true));
    });

    let storyScrollRaf = null;
    storyTrack.addEventListener('scroll', () => {
      if (storyScrollRaf) return;
      storyScrollRaf = requestAnimationFrame(() => {
        storyScrollRaf = null;
        if (isStoryGliding) return;
        const h = storyTrack.clientHeight || 1;
        const idx = Math.round(storyTrack.scrollTop / h);
        const clamped = Math.max(0, Math.min(storySlides.length - 1, idx));
        if (clamped !== storyActiveIndex) {
          storyActiveIndex = clamped;
        }
      });
    }, { passive: true });

    let storyTouchStartX = 0;
    let storyTouchStartY = 0;
    let storyTouchStartIdx = 0;
    let storyTouchAxis = null;

    storyTrack.addEventListener('touchstart', (e) => {
      cancelStoryGlide();
      storyTouchAxis = null;
      const t = e.touches?.[0];
      if (!t) return;
      storyTouchStartX = t.clientX;
      storyTouchStartY = t.clientY;
      storyTouchStartIdx = storyActiveIndex;
    }, { passive: true });

    storyTrack.addEventListener('touchmove', (e) => {
      const t = e.touches?.[0];
      if (!t || activeIndex !== storyHostIndex) return;
      const dx = storyTouchStartX - t.clientX;
      const dy = storyTouchStartY - t.clientY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (!storyTouchAxis && Math.max(absX, absY) >= 8) {
        storyTouchAxis = absX > absY * 1.15 ? 'x' : 'y';
      }

      if (storyTouchAxis === 'x') {
        if ((dx > 0 && storyTouchStartIdx < storySlides.length - 1) || (dx < 0 && storyTouchStartIdx > 0)) {
          e.preventDefault();
        }
      }
    }, { passive: false });

    storyTrack.addEventListener('touchend', (e) => {
      if (activeIndex !== storyHostIndex) {
        storyTouchAxis = null;
        return;
      }
      const t = e.changedTouches?.[0];
      if (!t) {
        storyTouchAxis = null;
        return;
      }
      const dx = storyTouchStartX - t.clientX;
      const dy = storyTouchStartY - t.clientY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (storyTouchAxis === 'x' && absX >= 42) {
        if (dx > 0 && storyTouchStartIdx < storySlides.length - 1) {
          goToStorySlide(storyTouchStartIdx + 1, true);
        } else if (dx < 0 && storyTouchStartIdx > 0) {
          goToStorySlide(storyTouchStartIdx - 1, true);
        }
        storyTouchAxis = null;
        return;
      }

      if ((storyTouchAxis === 'y' || (absY >= 45 && absY > absX * 1.25)) && absY >= 45) {
        if (storyTouchStartIdx === storySlides.length - 1 && storyActiveIndex === storySlides.length - 1 && dy > 0) {
          goToSlide(activeIndex + 1, true);
        } else if (storyTouchStartIdx === 0 && storyActiveIndex === 0 && dy < 0) {
          goToSlide(activeIndex - 1, true);
        }
      }
      storyTouchAxis = null;
    }, { passive: true });
  }

  if (track instanceof HTMLElement && slides.length > 0) {
    let trackTouchStartX = 0;
    let trackTouchStartY = 0;
    let trackTouchStartTime = 0;
    let trackTouchStartScrollLeft = 0;
    let trackTouchIgnored = false;
    let touchScrollable = null;
    let touchStartedAtTop = true;
    let touchStartedAtBottom = true;

    track.addEventListener('touchstart', (e) => {
      cancelGlide();
      trackTouchIgnored = false;
      touchScrollable = null;

      if (menuDrawer?.classList.contains('is-open') || document.querySelector('.fancybox__container')) {
        trackTouchIgnored = true;
        return;
      }

      const targetEl = e.target instanceof Element ? e.target : null;
      if (!targetEl || targetEl.closest('input, textarea, select, [data-menu-drawer], .fancybox__container, [data-story-vertical-track], [data-gallery-slider]')) {
        trackTouchIgnored = true;
        return;
      }

      const t = e.touches?.[0];
      if (!t) {
        trackTouchIgnored = true;
        return;
      }

      trackTouchStartX = t.clientX;
      trackTouchStartY = t.clientY;
      trackTouchStartTime = Date.now();
      trackTouchStartScrollLeft = track.scrollLeft;

      const scrollable = targetEl.closest('.h-slide--scrollable');
      if (scrollable instanceof HTMLElement && scrollable.scrollHeight > scrollable.clientHeight + 4) {
        touchScrollable = scrollable;
        touchStartedAtTop = scrollable.scrollTop <= 2;
        touchStartedAtBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 2;
      }
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
      if (trackTouchIgnored || menuDrawer?.classList.contains('is-open') || document.querySelector('.fancybox__container')) return;
      if (Math.abs(track.scrollLeft - trackTouchStartScrollLeft) > 12) return;

      const t = e.changedTouches?.[0];
      if (!t) return;
      const dx = trackTouchStartX - t.clientX;
      const dy = trackTouchStartY - t.clientY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const dt = Date.now() - trackTouchStartTime;

      if (absY >= 42 && absY > absX * 1.25 && dt < 900) {
        const dir = dy > 0 ? 1 : -1;
        if (touchScrollable instanceof HTMLElement) {
          const nowAtTop = touchScrollable.scrollTop <= 2;
          const nowAtBottom = touchScrollable.scrollTop + touchScrollable.clientHeight >= touchScrollable.scrollHeight - 2;
          if (dir > 0 && !(touchStartedAtBottom && nowAtBottom)) return;
          if (dir < 0 && !(touchStartedAtTop && nowAtTop)) return;
        }
        navigateStep(dir);
      }
    }, { passive: true });

    let scrollRaf = null;
    track.addEventListener('scroll', () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = null;
        if (isGliding) return;
        const w = track.clientWidth || 1;
        const idx = Math.round(track.scrollLeft / w);
        const clamped = Math.max(0, Math.min(slides.length - 1, idx));
        if (clamped !== activeIndex) {
          updateTrackChrome(clamped);
        }
      });
    }, { passive: true });

    track.addEventListener('wheel', (e) => {
      if (menuDrawer?.classList.contains('is-open')) return;
      if (document.querySelector('.fancybox__container')) return;

      const isHorizontalWheel = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const primaryDelta = isHorizontalWheel ? e.deltaX : e.deltaY;

      // Allow internal vertical scroll inside .h-slide--scrollable while not at boundary
      if (!isHorizontalWheel) {
        const scrollable = e.target instanceof Element ? e.target.closest('.h-slide--scrollable') : null;
        if (scrollable instanceof HTMLElement && scrollable.scrollHeight > scrollable.clientHeight + 4) {
          const atTop = scrollable.scrollTop <= 2;
          const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 2;
          if ((primaryDelta < 0 && !atTop) || (primaryDelta > 0 && !atBottom)) {
            return;
          }
        }
      }

      e.preventDefault();
      if (Math.abs(primaryDelta) < 8) return;

      const now = Date.now();
      const dir = primaryDelta > 0 ? 1 : -1;
      const absDelta = Math.abs(primaryDelta);

      if (isGliding) {
        if (dir === glideDirection || now - glideStartedAt < 220) {
          lastWheelTime = now;
          lastWheelAbs = absDelta;
          return;
        }
        lastWheelTime = now;
        lastWheelAbs = absDelta;
        wheelCooldownUntil = now + 450;
        inertiaGuardUntil = now + 950;
        goToSlide(glideTargetIndex + dir, true);
        return;
      }

      if (isStoryGliding) {
        if (dir === storyGlideDirection || now - storyGlideStartedAt < 220) {
          lastWheelTime = now;
          lastWheelAbs = absDelta;
          return;
        }
        lastWheelTime = now;
        lastWheelAbs = absDelta;
        wheelCooldownUntil = now + 450;
        inertiaGuardUntil = now + 950;
        const reversedStoryIdx = storyGlideTargetIndex + dir;
        if (reversedStoryIdx >= 0 && reversedStoryIdx < storySlides.length) {
          goToStorySlide(reversedStoryIdx, true);
        } else {
          goToSlide(activeIndex + dir, true);
        }
        return;
      }

      if (now < inertiaGuardUntil && now - lastWheelTime < 110 && absDelta <= lastWheelAbs + 3) {
        lastWheelTime = now;
        lastWheelAbs = absDelta;
        return;
      }

      if (now < wheelCooldownUntil) {
        lastWheelTime = now;
        lastWheelAbs = absDelta;
        return;
      }

      lastWheelTime = now;
      lastWheelAbs = absDelta;
      wheelCooldownUntil = now + 450;
      inertiaGuardUntil = now + 950;

      navigateStep(dir);
    }, { passive: false });

    window.addEventListener('resize', () => {
      cancelGlide();
      cancelStoryGlide();
      const current = slides[activeIndex];
      if (current instanceof HTMLElement) {
        track.scrollLeft = current.offsetLeft;
      }
      const currentStory = storySlides[storyActiveIndex];
      if (storyTrack instanceof HTMLElement && currentStory instanceof HTMLElement) {
        storyTrack.scrollTop = currentStory.offsetTop;
      }
    });

    updateTrackChrome(0);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuDrawer?.classList.contains('is-open')) {
      setDrawerOpen(false);
      return;
    }
    if (menuDrawer?.classList.contains('is-open')) return;
    if (document.querySelector('.fancybox__container')) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) {
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateStep(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateStep(-1);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const activeSlideEl = slides[activeIndex];
      if (activeSlideEl instanceof HTMLElement && activeSlideEl.classList.contains('h-slide--scrollable') && activeSlideEl.scrollHeight > activeSlideEl.clientHeight + 4) {
        const atTop = activeSlideEl.scrollTop <= 2;
        const atBottom = activeSlideEl.scrollTop + activeSlideEl.clientHeight >= activeSlideEl.scrollHeight - 2;
        if ((e.key === 'ArrowUp' && !atTop) || (e.key === 'ArrowDown' && !atBottom)) {
          return;
        }
      }
      e.preventDefault();
      navigateStep(e.key === 'ArrowDown' ? 1 : -1);
    }
  });

  function initGallerySlider() {
    const slider = root.querySelector('[data-gallery-slider]');
    if (!slider) return;

    const viewport = slider.querySelector('[data-slider-viewport]');
    const sliderTrack = slider.querySelector('[data-slider-track]');
    const rawSlides = Array.from(slider.querySelectorAll('[data-slider-slide]'));
    const prevBtn = slider.querySelector('[data-slider-prev]');
    const nextBtn = slider.querySelector('[data-slider-next]');

    if (!sliderTrack || !viewport || rawSlides.length === 0) return;

    const realCount = rawSlides.length;
    if (realCount <= 1) {
      if (prevBtn instanceof HTMLElement) prevBtn.style.display = 'none';
      if (nextBtn instanceof HTMLElement) nextBtn.style.display = 'none';
      return { updateSlider: () => {} };
    }

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

    startClones.reverse().forEach((clone) => sliderTrack.insertBefore(clone, sliderTrack.firstChild));
    endClones.forEach((clone) => sliderTrack.appendChild(clone));

    const allSlides = Array.from(sliderTrack.children);
    let currentDomIndex = cloneCount;
    let autoplayTimer = null;

    function getTargetOffset(index) {
      const activeSlide = allSlides[index];
      if (!(activeSlide instanceof HTMLElement)) return 0;
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
      sliderTrack.style.transition = 'none';
      sliderTrack.style.transform = `translateX(${getTargetOffset(currentDomIndex)}px)`;
      void sliderTrack.offsetHeight;
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
      sliderTrack.style.transition = `transform ${duration} cubic-bezier(0.22, 1, 0.36, 1)`;
      sliderTrack.style.transform = `translateX(${getTargetOffset(currentDomIndex)}px)`;
    }

    sliderTrack.addEventListener('transitionend', (e) => {
      if (e.target !== sliderTrack) return;
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
      autoplayTimer = window.setInterval(() => {
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
          if (realSlideAnchor instanceof HTMLElement) {
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
        if (Math.abs(diffX) > 10 && Math.abs(diffX) > Math.abs(diffY)) {
          isSwiping = true;
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }, { passive: false });

    slider.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const diffX = e.changedTouches[0].clientX - startX;
        const diffY = e.changedTouches[0].clientY - startY;
        if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
          e.stopPropagation();
          if (diffX < 0) {
            next();
          } else {
            prev();
          }
        }
        if (isSwiping) {
          window.setTimeout(() => {
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

    if (hasIO && track instanceof HTMLElement) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startAutoplay();
          } else {
            stopAutoplay();
          }
        });
      }, { root: track, threshold: 0.1 });
      io.observe(slider);
    } else {
      startAutoplay();
    }

    requestAnimationFrame(() => {
      snapToDomIndex(cloneCount);
    });
    window.setTimeout(() => {
      snapToDomIndex(cloneCount);
    }, 300);

    return { updateSlider, next, prev, startAutoplay, stopAutoplay };
  }

  function initMainBgSlider() {
    const slider = root.querySelector('[data-main-bg-slider]');
    if (!slider) return;
    const bgSlides = Array.from(slider.querySelectorAll('.main-bg-slider__slide'));
    if (bgSlides.length <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let idx = 0;
    window.setInterval(() => {
      bgSlides[idx]?.classList.remove('is-active');
      idx = (idx + 1) % bgSlides.length;
      bgSlides[idx]?.classList.add('is-active');
    }, 6000);
  }

  const gallerySliderInstance = initGallerySlider();
  initMainBgSlider();
  initVideoPlayers(root);
  initGalleryLightbox(root, 'gallery');
  initRSVPForm(root);
  initWishesLoadMore(root);
  initGiftInteractions(root);

  if (!cover || !openBtn || (cover instanceof HTMLElement && cover.style.display === 'none')) {
    initSlideReveals();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMemoire);
} else {
  initMemoire();
}

document.addEventListener('astro:page-load', initMemoire);
