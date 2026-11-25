import { getLenis, initLenis } from './lenis-smooth-scroll';

interface ModelContextNavigator extends Navigator {
  modelContext?: {
    provideContext?: (context: unknown, options?: { signal?: AbortSignal }) => void;
    registerTool?: (tool: unknown, options?: { signal?: AbortSignal }) => void;
  };
}

const INTRO_ENTER_MS = 1100;
const INTRO_HOLD_MS = 700;
const INTRO_RING_SHRINK_MS = 1500;
const INTRO_EXIT_MS = 1250;
const INTRO_TOTAL_MS = INTRO_ENTER_MS + INTRO_HOLD_MS + INTRO_RING_SHRINK_MS + INTRO_EXIT_MS;
const HERO_REVEAL_MS = 3600;
const HERO_REVEAL_INTERVAL_MS = 6000;
const HERO_INTRO_REVEAL_MS = 650;
const HERO_INTRO_INTERVAL_MS = 820;
const POST_INTRO_DELAY_MS = 1800;
const PROMO_DURATION_MS = 2 * 24 * 60 * 60 * 1000;

function resetStyles(el: HTMLElement | null, props: string[]) {
  if (!el) return;
  for (const prop of props) {
    el.style.removeProperty(prop);
  }
}

function initMobileMenu() {
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.querySelector<HTMLElement>('.nav-links');
  if (!menuToggle || !navLinks) return;

  const updateMenuPosition = () => {
    if (window.innerWidth > 768) {
      navLinks.style.cssText = '';
      return;
    }

    const rect = menuToggle.getBoundingClientRect();
    const menuHeight = navLinks.offsetHeight;
    const menuWidth = navLinks.offsetWidth;

    const topPos =
      rect.bottom + 16 + menuHeight > window.innerHeight
        ? rect.top - menuHeight - 10
        : rect.bottom + 10;

    let leftPos = rect.right - menuWidth;
    leftPos = Math.max(16, Math.min(leftPos, window.innerWidth - menuWidth - 16));

    navLinks.style.position = 'fixed';
    navLinks.style.top = `${topPos}px`;
    navLinks.style.bottom = 'auto';
    navLinks.style.left = `${leftPos}px`;
    navLinks.style.right = 'auto';
  };

  const closeMenu = () => {
    navLinks.classList.remove('is-open');
    menuToggle.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  };

  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    menuToggle.classList.toggle('is-open', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) updateMenuPosition();
  });

  navLinks.querySelectorAll('a').forEach((anchor) => {
    anchor.addEventListener('click', closeMenu);
  });

  document.addEventListener('pointerdown', (e) => {
    if (!navLinks.classList.contains('is-open')) return;
    if (e.target instanceof Node && !menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
      closeMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (navLinks.classList.contains('is-open')) updateMenuPosition();
  });
}

function initLoginModal() {
  const loginBtn = document.getElementById('login-btn');
  const loginModal = document.getElementById('login-modal');
  const loginModalClose = document.getElementById('login-modal-close');
  const loginModalCloseBtn = document.getElementById('login-modal-close-btn');
  const loginForm = document.getElementById('login-form-unified');
  const usernameInput = document.getElementById('username') as HTMLInputElement | null;

  if (!loginBtn || !loginModal || !loginModalClose || !loginModalCloseBtn) return;

  const openModal = () => {
    loginModal.setAttribute('open', 'true');
    loginBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    loginModal.removeAttribute('open');
    loginBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  loginBtn.addEventListener('click', openModal);
  loginModalClose.addEventListener('click', closeModal);
  loginModalCloseBtn.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && loginModal.hasAttribute('open')) {
      closeModal();
      loginBtn.focus();
    }
  });

  if (!loginForm) return;
  const urlParams = new URLSearchParams(window.location.search);
  const loginType = urlParams.get('login');
  if (loginType !== 'admin' && loginType !== 'client') return;

  openModal();
  if (loginType === 'admin' && usernameInput) {
    usernameInput.value = 'admin';
  }

  const errParam = urlParams.get('error');
  if ((errParam === '1' || errParam === 'link_used') && !document.getElementById('admin-error')) {
    const errorMsg = document.createElement('p');
    errorMsg.id = 'admin-error';
    errorMsg.className = 'login-modal__error';
    errorMsg.textContent =
      errParam === 'link_used'
        ? 'Akun sudah diklaim. Silakan login dengan password Anda.'
        : 'Username atau Password salah.';
    loginForm.insertBefore(errorMsg, loginForm.querySelector('.submit-btn'));
  }
}

function initTemplateCatalog() {
  const templateGrid = document.getElementById('template-grid');
  const filterBtns = document.querySelectorAll<HTMLButtonElement>('.template-filter-btn');
  const templateCardEls = document.querySelectorAll<HTMLElement>('.template-grid .template-card');
  const emptyStateEl = document.getElementById('template-empty');

  if (templateGrid) {
    templateGrid.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;

      const variantBtn = target.closest<HTMLButtonElement>('.template-card__variant-btn');
      if (variantBtn) {
        e.stopPropagation();
        const card = variantBtn.closest<HTMLElement>('.template-card');
        if (!card) return;

        card.querySelectorAll('.template-card__variant-btn').forEach((btn) => btn.classList.remove('is-active'));
        variantBtn.classList.add('is-active');

        const previewLink = card.querySelector<HTMLAnchorElement>('.template-card__btn-preview');
        const orderLink = card.querySelector<HTMLAnchorElement>('.template-card__btn-order');
        const nextPreviewUrl = variantBtn.getAttribute('data-preview-url');
        const nextWaUrl = variantBtn.getAttribute('data-wa-url');
        const nextPrice = variantBtn.getAttribute('data-price');
        const nextPromoPrice = variantBtn.getAttribute('data-promo-price');

        if (previewLink && nextPreviewUrl) previewLink.setAttribute('href', nextPreviewUrl);
        if (orderLink && nextWaUrl) orderLink.setAttribute('href', nextWaUrl);

        const priceOriginalEl = card.querySelector('.template-card__price--original s');
        const pricePromoEl = card.querySelector('.template-card__price--promo');
        const regularPriceEl = card.querySelector(
          '.template-card__price:not(.template-card__price--original):not(.template-card__price--promo)'
        );

        if (nextPromoPrice && pricePromoEl) pricePromoEl.textContent = nextPromoPrice;
        if (nextPrice && priceOriginalEl) {
          priceOriginalEl.textContent = nextPrice;
        } else if (nextPrice && regularPriceEl) {
          regularPriceEl.textContent = nextPrice;
        }
        return;
      }

      if (target.closest('.template-card__btn-order') || target.closest('.template-card__btn-preview')) {
        return;
      }

      const card = target.closest<HTMLElement>('.template-card');
      if (!card) return;

      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) return;

      const previewLink = card.querySelector<HTMLAnchorElement>('.template-card__btn-preview');
      if (previewLink?.href) previewLink.click();
    });

    templateGrid.addEventListener('auxclick', (e) => {
      if (e.button !== 1) return;
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (
        target.closest('.template-card__variant-btn') ||
        target.closest('.template-card__btn-order') ||
        target.closest('.template-card__btn-preview')
      ) {
        return;
      }
      const previewLink = target.closest('.template-card')?.querySelector<HTMLAnchorElement>('.template-card__btn-preview');
      if (previewLink?.href) {
        window.open(previewLink.href, '_blank', 'noopener,noreferrer');
      }
    });
  }

  const applyFilter = (filter: string) => {
    let visibleCount = 0;
    templateCardEls.forEach((card) => {
      const cardCat = card.getAttribute('data-category') || 'pernikahan';
      if (cardCat === filter) {
        card.classList.remove('is-filtered-out');
        card.classList.add('is-visible');
        visibleCount++;
      } else {
        card.classList.add('is-filtered-out');
      }
    });

    if (emptyStateEl) {
      emptyStateEl.classList.toggle('hidden', visibleCount > 0);
    }
  };

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter') || 'pernikahan';
      filterBtns.forEach((b) => {
        b.classList.remove('is-active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      applyFilter(filter);

      try {
        const url = new URL(window.location.href);
        if (filter === 'pernikahan') {
          url.searchParams.delete('kategori');
          url.searchParams.delete('category');
          url.searchParams.delete('filter');
        } else {
          url.searchParams.set('kategori', filter);
        }
        window.history.replaceState({}, '', url.toString());
      } catch {
        // Ignore history restriction errors in sandboxed frames.
      }
    });
  });

  try {
    const initialParams = new URLSearchParams(window.location.search);
    const targetCategory =
      initialParams.get('kategori') || initialParams.get('category') || initialParams.get('filter');
    if (targetCategory?.toLowerCase() === 'metatah') {
      document.querySelector<HTMLButtonElement>('.template-filter-btn[data-filter="metatah"]')?.click();
    }
  } catch {
    // Ignore invalid URL query parsing.
  }
}

function initDashboardTabs() {
  const tabsContainer = document.querySelector<HTMLElement>('.dashboard-tabs');
  if (!tabsContainer) return;

  const nav = tabsContainer.querySelector<HTMLElement>('.dashboard-tabs__nav');
  const indicator = nav?.querySelector<HTMLElement>('.dashboard-tabs__indicator') || null;
  const btns = tabsContainer.querySelectorAll<HTMLButtonElement>('.dashboard-tabs__btn');
  const infoItems = tabsContainer.querySelectorAll<HTMLElement>('.dashboard-tabs__info-item');
  const panels = tabsContainer.querySelectorAll<HTMLElement>('.dashboard-tabs__panel');

  const moveIndicator = (btn: HTMLElement | null) => {
    if (!indicator || !btn || btn.offsetWidth === 0) return;
    indicator.style.width = `${btn.offsetWidth}px`;
    indicator.style.left = `${btn.offsetLeft}px`;
  };

  const setActiveTab = (tab: string | undefined) => {
    if (!tab) return;
    btns.forEach((btn) => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.toggle('is-active', isActive);
      if (isActive) moveIndicator(btn);
    });

    infoItems.forEach((item) => {
      const isActive = item.dataset.tab === tab;
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    panels.forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.panel === tab);
    });
  };

  const syncActiveIndicator = () => {
    const activeBtn = tabsContainer.querySelector<HTMLElement>('.dashboard-tabs__btn.is-active');
    if (activeBtn) moveIndicator(activeBtn);
  };

  requestAnimationFrame(syncActiveIndicator);
  document.fonts?.ready.then(syncActiveIndicator);

  btns.forEach((btn) => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
  });

  infoItems.forEach((item) => {
    item.addEventListener('click', () => setActiveTab(item.dataset.tab));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setActiveTab(item.dataset.tab);
      }
    });
  });

  window.addEventListener('resize', () => {
    const cur = tabsContainer.querySelector<HTMLElement>('.dashboard-tabs__btn.is-active');
    if (cur) moveIndicator(cur);
  });
}

function initFaqAccordion() {
  const faqItems = Array.from(document.querySelectorAll<HTMLElement>('.faq-item')).map((item) => ({
    item,
    btn: item.querySelector<HTMLButtonElement>('.faq-btn'),
    content: item.querySelector<HTMLElement>('.faq-content')
  }));

  for (const entry of faqItems) {
    if (!entry.btn || !entry.content) continue;
    entry.btn.addEventListener('click', () => {
      const wasActive = entry.item.classList.contains('active');

      for (const other of faqItems) {
        other.item.classList.remove('active');
        other.btn?.setAttribute('aria-expanded', 'false');
        if (other.content) other.content.style.maxHeight = '';
      }

      if (!wasActive && entry.content) {
        entry.item.classList.add('active');
        entry.btn?.setAttribute('aria-expanded', 'true');
        entry.content.style.maxHeight = `${entry.content.scrollHeight}px`;
      }
    });
  }
}

function initPromoPopup() {
  const popup = document.getElementById('promo-popup');
  if (!popup) return;

  const closeBtn = popup.querySelector<HTMLButtonElement>('.promo-popup__close');
  const ctaBtn = popup.querySelector<HTMLAnchorElement>('.promo-popup__cta');
  const overlay = popup.querySelector<HTMLElement>('.promo-popup__overlay');
  const cdDays = document.getElementById('cd-days');
  const cdHours = document.getElementById('cd-hours');
  const cdMinutes = document.getElementById('cd-minutes');
  const cdSeconds = document.getElementById('cd-seconds');

  let timerId = 0;

  const getDeadline = (): number => {
    const now = Date.now();
    const stored = localStorage.getItem('senadda_promo_end');
    const parsed = stored ? parseInt(stored, 10) : NaN;
    if (Number.isFinite(parsed) && parsed > now) return parsed;
    const next = now + PROMO_DURATION_MS;
    localStorage.setItem('senadda_promo_end', String(next));
    return next;
  };

  let endTime = getDeadline();

  const updateCountdown = () => {
    const now = Date.now();
    let distance = endTime - now;
    if (distance < 0) {
      endTime = now + PROMO_DURATION_MS;
      localStorage.setItem('senadda_promo_end', String(endTime));
      distance = PROMO_DURATION_MS;
    }

    const d = Math.floor(distance / 86400000);
    const h = Math.floor((distance % 86400000) / 3600000);
    const m = Math.floor((distance % 3600000) / 60000);
    const s = Math.floor((distance % 60000) / 1000);

    if (cdDays) cdDays.textContent = String(d).padStart(2, '0');
    if (cdHours) cdHours.textContent = String(h).padStart(2, '0');
    if (cdMinutes) cdMinutes.textContent = String(m).padStart(2, '0');
    if (cdSeconds) cdSeconds.textContent = String(s).padStart(2, '0');
  };

  const closePopup = () => {
    popup.classList.remove('is-visible');
    if (timerId) {
      window.clearInterval(timerId);
      timerId = 0;
    }
    window.setTimeout(() => popup.classList.add('hidden'), 400);
    localStorage.setItem('senadda_promo_closed', 'true');
  };

  if (!localStorage.getItem('senadda_promo_closed')) {
    window.setTimeout(() => {
      updateCountdown();
      timerId = window.setInterval(updateCountdown, 1000);
      popup.classList.remove('hidden');
      window.setTimeout(() => popup.classList.add('is-visible'), 50);
    }, 6100);
  }

  closeBtn?.addEventListener('click', closePopup);
  overlay?.addEventListener('click', closePopup);
  ctaBtn?.addEventListener('click', closePopup);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popup.classList.contains('is-visible')) {
      closePopup();
    }
  });
}

function initHeroAndScroll() {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  if (!window.location.hash) {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  const mainEl = document.querySelector<HTMLElement>('main');
  const startEl = document.querySelector<HTMLElement>('.start');
  const sections = document.querySelectorAll<HTMLElement>('[data-section]');
  const parallaxItems = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
  const heroSection = document.querySelector<HTMLElement>('.hero-shell');
  const heroPlaceholder = document.querySelector<HTMLElement>('.hero-shell-placeholder');
  const heroMotionCards = Array.from(document.querySelectorAll<HTMLElement>('[data-hero-motion-card]'));
  const anchorLinks = document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
  const menuBtn = document.getElementById('menu-toggle');
  const navLinks = document.querySelector<HTMLElement>('.nav-links');
  const waBtn = document.getElementById('floating-wa');
  const waAnchor = document.getElementById('hero-wa-anchor');

  const updateReveal = () => {
    if (mainEl && startEl) {
      mainEl.style.paddingBottom = `${startEl.offsetHeight}px`;
    }
  };

  window.addEventListener('resize', updateReveal);
  window.addEventListener('load', updateReveal);
  if (startEl && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(updateReveal).observe(startEl);
  }
  updateReveal();

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastScrollY = 0;
  let activeHeroMotionCard = 0;
  let isHeroMotionAnimating = false;
  let scrollRafId = 0;

  const isIntroScrollLocked = () =>
    document.documentElement.classList.contains('intro-scroll-lock');

  const keepIntroAtTop = (event?: Event) => {
    if (!isIntroScrollLocked() || window.location.hash) return;
    event?.preventDefault();
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const handleIntroPageShow = () => keepIntroAtTop();
  const handleIntroKeyDown = (event: KeyboardEvent) => {
    if ([' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) {
      keepIntroAtTop(event);
    }
  };

  // Attach blocking wheel/touch listeners only while the intro scroll lock is active.
  let introLockListenersBound = false;
  const unbindIntroLockListeners = () => {
    if (!introLockListenersBound) return;
    introLockListenersBound = false;
    window.removeEventListener('pageshow', handleIntroPageShow);
    window.removeEventListener('wheel', keepIntroAtTop);
    window.removeEventListener('touchmove', keepIntroAtTop);
    window.removeEventListener('keydown', handleIntroKeyDown);
  };

  if (isIntroScrollLocked() && !window.location.hash) {
    introLockListenersBound = true;
    window.addEventListener('pageshow', handleIntroPageShow);
    window.addEventListener('wheel', keepIntroAtTop, { passive: false });
    window.addEventListener('touchmove', keepIntroAtTop, { passive: false });
    window.addEventListener('keydown', handleIntroKeyDown, { passive: false });
  }

  const syncHeroFixed = () => {
    if (!heroSection || !heroPlaceholder) return;
    heroSection.classList.remove('hero-shell--fixed');
    heroPlaceholder.style.height = '';

    if (window.innerWidth >= 768) {
      heroPlaceholder.style.height = `${window.innerHeight * 2}px`;
      heroSection.classList.add('hero-shell--fixed');
    }
  };

  // Batch layout reads before DOM writes so scroll frames avoid forced reflow.
  const applyScrollState = () => {
    scrollRafId = 0;
    const currentScrollY = window.scrollY;
    const winHeight = window.innerHeight;
    const winWidth = window.innerWidth;
    const heroHeight = heroSection?.clientHeight || winHeight;
    const heroHidePoint = heroHeight * 0.6;
    const heroProgress = Math.min(currentScrollY / winHeight, 1);
    const isScrollingDown = currentScrollY > lastScrollY && currentScrollY > heroHidePoint;

    const isWaScrolled = heroProgress >= 0.4 || currentScrollY > 400;
    let waAnchorRect: DOMRect | null = null;
    let docClientWidth = winWidth;
    let docClientHeight = winHeight;
    if (!isWaScrolled && waBtn && waAnchor) {
      waAnchorRect = waAnchor.getBoundingClientRect();
      docClientWidth = document.documentElement.clientWidth || winWidth;
      docClientHeight = document.documentElement.clientHeight || winHeight;
    }

    const parallaxShifts = parallaxItems.map((item) => {
      const rect = item.getBoundingClientRect();
      const centerOffset = (rect.top + rect.height / 2 - winHeight / 2) / winHeight;
      return `${centerOffset * -42}px`;
    });

    if (heroSection) {
      heroSection.style.setProperty('--hero-scroll', String(heroProgress));
      heroSection.style.visibility = currentScrollY > winHeight * 2.5 ? 'hidden' : '';
    }
    document.body.classList.toggle('nav-hidden', isScrollingDown);
    document.body.classList.toggle('has-scrolled', currentScrollY > 8);
    lastScrollY = Math.max(currentScrollY, 0);

    if (menuBtn && winWidth <= 767) {
      const wasScrolled = menuBtn.classList.contains('is-scrolled');
      const isNowScrolled = heroProgress >= 0.4;
      if (isNowScrolled !== wasScrolled) {
        menuBtn.classList.toggle('is-scrolled', isNowScrolled);
        document.body.classList.toggle('menu-scrolled', isNowScrolled);
        resetStyles(menuBtn, ['left', 'top']);
        if (navLinks) {
          navLinks.classList.toggle('is-scrolled', isNowScrolled);
          resetStyles(navLinks, ['left', 'top', 'bottom', 'right']);
        }
      }
    }

    if (waBtn) {
      if (isWaScrolled) {
        waBtn.classList.add('is-scrolled');
      } else {
        waBtn.classList.remove('is-scrolled');
        if (waAnchorRect) {
          const b = Math.max(0, Math.round(docClientHeight - waAnchorRect.bottom));
          const right = Math.max(0, Math.round(docClientWidth - waAnchorRect.right));
          if (b > 0 && right > 0) {
            waBtn.style.setProperty('--wa-bottom', `${b}px`);
            waBtn.style.setProperty('--wa-right', `${right}px`);
          }
        }
      }
    }

    parallaxItems.forEach((item, index) => {
      item.style.setProperty('--shift', parallaxShifts[index]);
    });
  };

  const scheduleScrollState = () => {
    if (scrollRafId) return;
    scrollRafId = requestAnimationFrame(applyScrollState);
  };

  const completeIntro = () => {
    unbindIntroLockListeners();
    document.body.classList.remove('intro-enter', 'intro-hold', 'intro-ring-shrink', 'intro-exit');
    document.body.classList.add('intro-complete');
    document.documentElement.classList.remove('intro-scroll-lock');
    if (!window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      lastScrollY = 0;
    }
    applyScrollState();
  };

  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
  );

  document
    .querySelectorAll('.section-observe, .reveal-blur, .template-card, .feature-item')
    .forEach((el) => revealObserver.observe(el));

  sections.forEach((section) => revealObserver.observe(section));

  const scrollToTarget = (targetId: string, immediate = false) => {
    document.body.classList.remove('nav-hidden');

    if (targetId === '#booking') {
      updateReveal();
      const target = document.querySelector<HTMLElement>(targetId);
      if (target) {
        target.classList.add('is-visible');
        target.querySelectorAll('.reveal-blur').forEach((el) => el.classList.add('is-visible'));
      }

      const maxScroll = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      const lenis = getLenis();
      if (lenis) {
        lenis.scrollTo(maxScroll, { duration: immediate ? 0 : 1.2, immediate });
      } else {
        window.scrollTo({ top: maxScroll, behavior: immediate ? 'auto' : 'smooth' });
      }
      return;
    }

    const target = document.querySelector<HTMLElement>(targetId);
    if (!target) return;
    target.classList.add('is-visible');
    target.querySelectorAll('.reveal-blur').forEach((el) => el.classList.add('is-visible'));

    const lenis = getLenis();
    if (lenis) {
      lenis.scrollTo(target, { offset: -84, duration: immediate ? 0 : 1.2, immediate });
    } else {
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth', block: 'start' });
      });
    }
  };

  anchorLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;
      event.preventDefault();
      event.stopPropagation();
      history.pushState(null, '', targetId);
      scrollToTarget(targetId);
    });
  });

  const revealNextHeroMotionCard = (duration = HERO_REVEAL_MS) => {
    if (document.hidden || heroMotionCards.length <= 1 || isHeroMotionAnimating) return;

    const previous = heroMotionCards[activeHeroMotionCard];
    activeHeroMotionCard = (activeHeroMotionCard + 1) % heroMotionCards.length;
    const next = heroMotionCards[activeHeroMotionCard];
    if (!previous || !next) return;

    isHeroMotionAnimating = true;
    previous.classList.remove('is-revealing');
    next.classList.add('is-next');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        next.classList.add('is-revealing');
      });
    });

    window.setTimeout(() => {
      previous.classList.remove('is-active', 'is-revealing');
      next.classList.remove('is-next');
      next.classList.add('is-active', 'is-revealing');
      isHeroMotionAnimating = false;
    }, duration);
  };

  const hasPrecompletedIntro = document.body.classList.contains('intro-complete');

  if (heroMotionCards.length > 1) {
    let introRevealTimer = 0;
    const startNormalHeroReveal = () => {
      window.setTimeout(() => {
        revealNextHeroMotionCard(HERO_REVEAL_MS);
        window.setInterval(() => revealNextHeroMotionCard(HERO_REVEAL_MS), HERO_REVEAL_INTERVAL_MS);
      }, POST_INTRO_DELAY_MS);
    };

    if (!reduceMotion && !hasPrecompletedIntro) {
      window.setTimeout(() => {
        revealNextHeroMotionCard(HERO_INTRO_REVEAL_MS);
        introRevealTimer = window.setInterval(
          () => revealNextHeroMotionCard(HERO_INTRO_REVEAL_MS),
          HERO_INTRO_INTERVAL_MS
        );
      }, 260);

      window.setTimeout(
        () => window.clearInterval(introRevealTimer),
        INTRO_ENTER_MS + INTRO_HOLD_MS - 120
      );
    }

    window.setTimeout(startNormalHeroReveal, reduceMotion || hasPrecompletedIntro ? 0 : INTRO_TOTAL_MS);
  }

  if (reduceMotion || hasPrecompletedIntro || window.location.hash) {
    completeIntro();
  } else {
    window.setTimeout(() => {
      document.body.classList.remove('intro-enter');
      document.body.classList.add('intro-hold');
    }, INTRO_ENTER_MS);

    window.setTimeout(() => {
      document.body.classList.remove('intro-hold');
      document.body.classList.add('intro-ring-shrink');
    }, INTRO_ENTER_MS + INTRO_HOLD_MS);

    window.setTimeout(() => {
      document.body.classList.remove('intro-ring-shrink');
      document.body.classList.add('intro-exit');
    }, INTRO_ENTER_MS + INTRO_HOLD_MS + INTRO_RING_SHRINK_MS);

    window.setTimeout(completeIntro, INTRO_TOTAL_MS);
  }

  syncHeroFixed();
  applyScrollState();

  const templatesEl = document.getElementById('templates');
  if (templatesEl?.dataset.autoScrollTemplates === 'true') {
    const scrollToTemplates = () => {
      if (window.location.hash) return;
      const heading = templatesEl.querySelector<HTMLElement>('.section-heading');
      const nav = document.querySelector<HTMLElement>('.hero-nav');
      const navHeight = nav ? nav.offsetHeight : 54;
      const navOffset = window.innerWidth <= 768 ? 44 : 64;
      if (heading) {
        const headingTop = heading.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: Math.max(0, headingTop - navHeight - navOffset),
          behavior: 'instant' as ScrollBehavior
        });
      } else {
        templatesEl.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
      }
    };
    scrollToTemplates();
    window.addEventListener('load', scrollToTemplates);
  }

  const handleHashNavigation = (immediate = false) => {
    const hash = window.location.hash;
    if (hash && hash !== '#' && hash !== '#top') {
      updateReveal();
      scrollToTarget(hash, immediate);
    } else if (hash === '#top') {
      const lenis = getLenis();
      if (lenis) {
        lenis.scrollTo(0, { duration: immediate ? 0 : 1.2, immediate });
      } else {
        window.scrollTo({ top: 0, behavior: immediate ? 'auto' : 'smooth' });
      }
    }
  };

  if (window.location.hash) {
    requestAnimationFrame(() => {
      handleHashNavigation(true);
      window.setTimeout(() => handleHashNavigation(true), 150);
      window.setTimeout(() => handleHashNavigation(true), 400);
    });
  }

  window.addEventListener('hashchange', () => handleHashNavigation(false));
  window.addEventListener('popstate', () => handleHashNavigation(false));
  window.addEventListener('scroll', scheduleScrollState, { passive: true });
  window.addEventListener('resize', () => {
    syncHeroFixed();
    scheduleScrollState();
  });
}

function initWebMcpTools() {
  const nav = navigator as ModelContextNavigator;
  if (!('modelContext' in nav) || !nav.modelContext) return;

  const rawNames = document.getElementById('templates')?.getAttribute('data-template-names') || '';
  const templates = rawNames ? rawNames.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const controller = new AbortController();
  const tool = {
    name: 'get_templates',
    description: 'Get a list of available wedding invitation templates',
    inputSchema: { type: 'object', properties: {} },
    execute: async () => ({ success: true, templates })
  };

  if (typeof nav.modelContext.provideContext === 'function') {
    nav.modelContext.provideContext({ tools: [tool] }, { signal: controller.signal });
  } else if (typeof nav.modelContext.registerTool === 'function') {
    nav.modelContext.registerTool(tool, { signal: controller.signal });
  }
}

export function initLandingHome() {
  initLenis({ lerp: 0.1, wheelMultiplier: 1.15, offset: -84 });
  initMobileMenu();
  initLoginModal();
  initTemplateCatalog();
  initDashboardTabs();
  initFaqAccordion();
  initPromoPopup();
  initHeroAndScroll();
  initWebMcpTools();
}

initLandingHome();
