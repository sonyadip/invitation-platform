import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

export interface LenisOptionsConfig {
  duration?: number;
  lerp?: number;
  offset?: number;
  anchors?: boolean | object;
  wheelMultiplier?: number;
  touchMultiplier?: number;
  smoothWheel?: boolean;
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
    'textarea',
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

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  if (window.__lenis) {
    return window.__lenis;
  }

  // Prevent native CSS scroll-behavior from fighting Lenis RAF interpolation.
  if (typeof document !== 'undefined' && !document.getElementById('lenis-override-css')) {
    const style = document.createElement('style');
    style.id = 'lenis-override-css';
    style.textContent = `
      html.lenis,
      html.lenis body {
        scroll-behavior: auto !important;
      }
    `;
    document.head.appendChild(style);
  }

  // syncTouch stays false to preserve native iOS/Android 120Hz hardware momentum scrolling.
  const lenis = new Lenis({
    ...(config.duration !== undefined ? { duration: config.duration } : {}),
    lerp: config.lerp ?? 0.1,
    wheelMultiplier: config.wheelMultiplier ?? 1.15,
    touchMultiplier: config.touchMultiplier ?? 1,
    smoothWheel: config.smoothWheel ?? true,
    syncTouch: false,
    autoRaf: true,
    anchors: config.anchors ?? false,
    respectReducedMotion: true,
    prevent: (node: HTMLElement) => node.tagName === 'TEXTAREA',
  });

  window.__lenis = lenis;

  if (isDocumentScrollLocked()) {
    lenis.stop();
  }

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

  protectScrollContainers();

  const domObserver = new MutationObserver(() => {
    protectScrollContainers();
  });
  domObserver.observe(document.body, { childList: true, subtree: true });

  const onFullscreenChange = () => {
    setTimeout(() => {
      lenis.resize();
    }, 150);
  };
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  window.__lenisDestroy = () => {
    observer.disconnect();
    domObserver.disconnect();
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    const overrideStyle = document.getElementById('lenis-override-css');
    if (overrideStyle) overrideStyle.remove();
    lenis.destroy();
    delete window.__lenis;
    delete window.__lenisDestroy;
  };

  return lenis;
}

export function getLenis(): Lenis | undefined {
  return typeof window !== 'undefined' ? window.__lenis : undefined;
}
