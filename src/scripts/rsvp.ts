import { sendAnalyticsEvent } from './analytics';

export function generatePaginationItems(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 1) return [1];
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, '...', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, '...', totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

export function getWishKey({ id, name, message, createdAt }: any) {
  return id ? String(id) : [createdAt || '', name || '', message || ''].join('|');
}

export function getRenderedWishKeys(container: Element) {
  return new Set(
    Array.from(container.querySelectorAll('[data-wish-key], [data-wish-id]'))
      .map((item) => item.getAttribute('data-wish-key') || item.getAttribute('data-wish-id'))
      .filter(Boolean)
  );
}

export function decodeHtmlEntities(str: string | undefined | null): string {
  if (!str) return '';
  let decoded = String(str);
  for (let i = 0; i < 2; i++) {
    const next = decoded
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&#x2F;/g, '/');
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

export function createWishCard({ id, name, attendance, message, createdAt }: any) {
  const wishCard = document.createElement('article');
  wishCard.className = 'wish-card';
  if (id) wishCard.dataset.wishId = String(id);
  wishCard.dataset.wishKey = getWishKey({ id, name, message, createdAt });

  const header = document.createElement('div');
  header.className = 'wish-card__header';

  const meta = document.createElement('div');
  meta.className = 'wish-card__meta';

  const nameEl = document.createElement('span');
  nameEl.className = 'wish-card__name';
  nameEl.textContent = decodeHtmlEntities(name);

  const badge = document.createElement('span');
  const isAttending = attendance === 'attending';
  const isTentative = attendance === 'tentative';
  badge.className = `wish-card__badge ${isAttending ? 'wish-card__badge--attend' : isTentative ? 'wish-card__badge--tentative' : 'wish-card__badge--absent'}`;
  badge.textContent = isAttending ? 'Hadir' : isTentative ? 'Ragu' : 'Tidak Hadir';

  const date = document.createElement('span');
  date.className = 'wish-card__date';
  date.textContent = new Date(createdAt || Date.now()).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Makassar'
  });

  const messageEl = document.createElement('p');
  messageEl.className = 'wish-card__message';
  messageEl.textContent = decodeHtmlEntities(message);

  meta.append(nameEl, badge);
  header.append(meta, date);
  wishCard.append(header, messageEl);

  return wishCard;
}

export function renderWishItems(wishesContainer: Element, items: any[], emptyState: Element | null) {
  wishesContainer.querySelectorAll('.wish-card').forEach((card) => card.remove());

  if (emptyState instanceof HTMLElement) {
    emptyState.style.display = items.length ? 'none' : '';
  }

  const renderedKeys = new Set();
  let renderedCount = 0;

  items.forEach((wish) => {
    const wishKey = getWishKey({
      id: wish.id,
      name: wish.guest_name,
      message: wish.message || '',
      createdAt: wish.created_at
    });

    if (renderedKeys.has(wishKey)) return;

    wishesContainer.append(createWishCard({
      id: wish.id,
      name: wish.guest_name,
      attendance: wish.attendance_status,
      message: wish.message || '',
      createdAt: wish.created_at
    }));
    renderedKeys.add(wishKey);
    renderedCount += 1;
  });

  return renderedCount;
}

export async function syncWishesFromServer({ weddingId, wishesContainer, emptyState, limit = 4, submittedItem = null }: any) {
  const response = await fetch(`/api/wishes?weddingId=${encodeURIComponent(weddingId)}&page=1&limit=${limit}&_=${Date.now()}`, {
    cache: 'no-store'
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Gagal menyinkronkan ucapan.');

  const items = result.items || [];
  const renderedCount = renderWishItems(wishesContainer, items, emptyState);

  const paginationContainer = wishesContainer.parentElement?.querySelector('[data-wishes-pagination]');
  if (paginationContainer instanceof HTMLElement) {
    paginationContainer.dataset.currentPage = '1';
    paginationContainer.dataset.totalPages = String(result.totalPages || 1);
    delete paginationContainer.dataset.paginationBound;
    initWishesPagination(wishesContainer.parentElement || document);
  }

  return renderedCount;
}

export function initRSVPForm(root: Element | Document = document) {
  const form = root.querySelector('[data-rsvp-form]');
  const successState = root.querySelector('[data-rsvp-success]');
  const errorEl = root.querySelector('[data-rsvp-error]');
  const submitBtn = root.querySelector('[data-rsvp-submit]');
  const wishesContainer = root.querySelector('[data-wishes-list]');
  const emptyState = root.querySelector('[data-wishes-empty]');

  if (!(form instanceof HTMLFormElement) || !(successState instanceof HTMLElement) || !(submitBtn instanceof HTMLButtonElement)) return;
  if (form.dataset.rsvpBound === 'true') return;
  form.dataset.rsvpBound = 'true';

  const nameInput = form.querySelector('input[name="name"]') as HTMLInputElement | null;
  if (nameInput && !nameInput.value) {
    const urlParams = new URLSearchParams(window.location.search);
    const toParam = urlParams.get('to');
    if (toParam) {
      nameInput.value = toParam;
    }
  }

  const submitLabel = submitBtn.textContent || 'Submit';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.dataset.submitting === 'true') return;
    form.dataset.submitting = 'true';

    if (errorEl instanceof HTMLElement) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';

    const formData = new FormData(form);
    const payload = {
      weddingId: formData.get('weddingId'),
      name: formData.get('name'),
      attendance: formData.get('attendance'),
      count: formData.get('count') || 1,
      message: formData.get('message')
    };

    if (!payload.weddingId || !payload.name || !payload.attendance) {
      form.dataset.submitting = 'false';
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
      if (errorEl instanceof HTMLElement) {
        errorEl.style.display = 'block';
        errorEl.textContent = 'Data RSVP belum lengkap. Isi nama dan konfirmasi kehadiran.';
      }
      return;
    }

    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Terjadi kesalahan sistem.');

      form.style.display = 'none';
      
      // Handle templates that use grid, flex or block for success state
      successState.style.display = '';
      if (window.getComputedStyle(successState).display === 'none') {
        const isGrid = successState.classList.contains('rsvp-success--grid');
        successState.style.display = isGrid ? 'grid' : 'flex';
      }

      if (wishesContainer && result.item?.message) {
        await syncWishesFromServer({
          weddingId: String(payload.weddingId),
          wishesContainer,
          emptyState,
          limit: 4,
          submittedItem: result.item
        });
        wishesContainer.querySelector('.wish-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      form.dataset.submitting = 'false';
    } catch (error) {
      form.dataset.submitting = 'false';
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
      if (errorEl instanceof HTMLElement) {
        errorEl.style.display = 'block';
        errorEl.textContent = error instanceof Error ? error.message : 'Gagal mengirim RSVP. Coba kembali.';
      }
    }
  });
}

export function initWishesPagination(root: Element | Document = document) {
  const paginationContainer = root.querySelector('[data-wishes-pagination]');
  const wishesContainer = root.querySelector('[data-wishes-list]');
  const emptyState = root.querySelector('[data-wishes-empty]');

  if (!(paginationContainer instanceof HTMLElement) || !wishesContainer) return;
  if (paginationContainer.dataset.paginationBound === 'true') return;
  paginationContainer.dataset.paginationBound = 'true';

  const weddingId = paginationContainer.dataset.weddingId;
  const limit = parseInt(paginationContainer.dataset.perPage || '4', 10) || 4;
  let currentPage = parseInt(paginationContainer.dataset.currentPage || '1', 10) || 1;
  let totalPages = parseInt(paginationContainer.dataset.totalPages || '1', 10) || 1;

  async function goToPage(page: number) {
    if (page < 1 || page > totalPages || !weddingId) return;

    try {
      sendAnalyticsEvent('click_wishes', {
        weddingId,
        metadata: { page, action: 'pagination' }
      });
    } catch (_) {}

    // Visual loading state
    (wishesContainer as HTMLElement).style.opacity = '0.5';
    (wishesContainer as HTMLElement).style.pointerEvents = 'none';

    try {
      const response = await fetch(`/api/wishes?weddingId=${encodeURIComponent(weddingId)}&page=${page}&limit=${limit}&_=${Date.now()}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal memuat ucapan.');

      renderWishItems(wishesContainer, result.items || [], emptyState);

      currentPage = result.page || page;
      totalPages = result.totalPages || totalPages;
      paginationContainer.dataset.currentPage = String(currentPage);
      paginationContainer.dataset.totalPages = String(totalPages);

      renderPaginationControls();

      // Smooth scroll to top of wishes list
      wishesContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      console.error('Wishes pagination error:', error);
    } finally {
      (wishesContainer as HTMLElement).style.opacity = '1';
      (wishesContainer as HTMLElement).style.pointerEvents = 'auto';
    }
  }

  function renderPaginationControls() {
    if (totalPages <= 1) {
      paginationContainer.style.display = 'none';
      return;
    }
    paginationContainer.style.display = 'flex';

    const prevBtn = paginationContainer.querySelector('[data-wishes-prev]') as HTMLButtonElement | null;
    const nextBtn = paginationContainer.querySelector('[data-wishes-next]') as HTMLButtonElement | null;
    const numbersContainer = paginationContainer.querySelector('[data-wishes-numbers]');

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;

    if (numbersContainer) {
      numbersContainer.innerHTML = '';
      const items = generatePaginationItems(currentPage, totalPages);

      items.forEach((item) => {
        if (typeof item === 'number') {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `wishes-pagination__num ${item === currentPage ? 'wishes-pagination__num--active' : ''}`;
          btn.textContent = String(item);
          btn.setAttribute('data-wishes-page', String(item));
          btn.setAttribute('aria-label', `Halaman ${item}`);
          btn.onclick = () => goToPage(item);
          numbersContainer.appendChild(btn);
        } else {
          const span = document.createElement('span');
          span.className = 'wishes-pagination__ellipsis';
          span.textContent = '...';
          numbersContainer.appendChild(span);
        }
      });
    }
  }

  // Initial event listeners for next/prev
  const prevBtn = paginationContainer.querySelector('[data-wishes-prev]');
  const nextBtn = paginationContainer.querySelector('[data-wishes-next]');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) goToPage(currentPage - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) goToPage(currentPage + 1);
    });
  }

  renderPaginationControls();
}

// Backward compatibility alias:
export function initWishesLoadMore(root: Element | Document = document) {
  initWishesPagination(root);
}
