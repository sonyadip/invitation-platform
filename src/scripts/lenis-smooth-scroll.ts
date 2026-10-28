import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

export interface LenisOptionsConfig {
  duration?: number;
  lerp?: number;
  offset?: number;
}

declare global {
  interface Window {
    __lenis?: Lenis;
    __lenisDestroy?: () => void;
  }
}

/**
 * Check if the document scroll is currently locked by template covers, intro animations, or modals.
 */
function isDocumentScrollLocked(): boolean {
  if (typeof document === 'undefined') return false;
  return (
    document.body.classList.contains('template-no-scroll') ||
    document.body.classList.contains('is-locked') ||
    document.body.classList.contains('participant-modal-active') ||
    document.documentElement.classList.contains('participant-modal-active') ||
    document.documentElement.classList.contains('intro-scroll-lock') ||
    document.body.style.overflow === 'hidden'
  );
}

/**
 * Automatically mark modals, dialogs, and lightboxes with data-lenis-prevent
 * so scrolling inside them is isolated from the smooth window scroll.
 */
function protectScrollContainers() {
  const modalSelectors = [
    'dialog',
    '[role="dialog"]',
    '.participant-modal',
    '.participant-modal__dialog',
    '.senadda-modal',
    '.fancybox__container',
    '.fancybox__slide',
    '#login-modal',
  ];

  modalSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      if (!el.hasAttribute('data-lenis-prevent')) {
        el.setAttribute('data-lenis-prevent', '');
      }
    });
  });
}

/**
 * Initialize Lenis smooth scroll for templates and landing/promo pages.
 */
export function initLenis(config: LenisOptionsConfig = {}): Lenis | null {
  if (typeof window === 'undefined') return null;

  // Respect user preference for reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  // Prevent multiple instances on the same window
  if (window.__lenis) {
    return window.__lenis;
  }

  const offset = config.offset ?? -70;

  // Initialize Lenis
  // Note: syncTouch is false to preserve native iOS/Android 120Hz hardware momentum scrolling.
  // Smooth scroll applies to desktop pointer wheel / trackpad gestures.
  const lenis = new Lenis({
    duration: config.duration ?? 1.1,
    lerp: config.lerp ?? 0.09,
    smoothWheel: true,
    syncTouch: false,
    autoRaf: true,
    anchors: {
      offset,
    },
    respectReducedMotion: true,
  });

  window.__lenis = lenis;

  // Check initial scroll lock state (e.g. unopened invitation cover or intro screen)
  if (isDocumentScrollLocked()) {
    lenis.stop();
  }

  // Observer to toggle Lenis when cover is opened or modals are opened/closed
  const observer = new MutationObserver(() => {
    if (isDocumentScrollLocked()) {
      lenis.stop();
    } else {
      lenis.start();
      lenis.resize();
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style'],
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class', 'style'],
  });

  // Protect modals and dynamic overlays from scroll interference
  protectScrollContainers();

  const domObserver = new MutationObserver(() => {
    protectScrollContainers();
  });
  domObserver.observe(document.body, { childList: true, subtree: true });

  // Recalculate dimensions on fullscreen toggle (used by "Buka Undangan")
  const onFullscreenChange = () => {
    setTimeout(() => {
      lenis.resize();
    }, 150);
  };
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  // Store cleanup function
  window.__lenisDestroy = () => {
    observer.disconnect();
    domObserver.disconnect();
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    lenis.destroy();
    delete window.__lenis;
    delete window.__lenisDestroy;
  };

  return lenis;
}

export function getLenis(): Lenis | undefined {
  return typeof window !== 'undefined' ? window.__lenis : undefined;
}
