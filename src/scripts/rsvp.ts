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
  nameEl.textContent = name;

  const badge = document.createElement('span');
  const isAttending = attendance === 'attending';
  badge.className = `wish-card__badge ${isAttending ? 'wish-card__badge--attend' : 'wish-card__badge--absent'}`;
  badge.textContent = isAttending ? 'Hadir' : 'Absen';

  const date = document.createElement('span');
  date.className = 'wish-card__date';
  date.textContent = new Date(createdAt || Date.now()).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const messageEl = document.createElement('p');
  messageEl.className = 'wish-card__message';
  messageEl.textContent = message;

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

export async function syncWishesFromServer({ weddingId, wishesContainer, emptyState, loadMoreBtn, limit, submittedItem = null }: any) {
  const response = await fetch(`/api/wishes?weddingId=${encodeURIComponent(weddingId)}&offset=0&limit=${limit}&_=${Date.now()}`, {
    cache: 'no-store'
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Gagal menyinkronkan ucapan.');

  const items = submittedItem ? [submittedItem, ...(result.items || [])] : (result.items || []);
  const renderedCount = renderWishItems(wishesContainer, items, emptyState);

  if (loadMoreBtn instanceof HTMLButtonElement) {
    loadMoreBtn.dataset.offset = String(renderedCount);
    loadMoreBtn.dataset.loading = 'false';
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Load More';
    if (!result.hasMore && renderedCount <= (result.items?.length || 0)) loadMoreBtn.remove();
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
  const loadMoreBtn = root.querySelector('[data-wishes-load-more]');

  if (!(form instanceof HTMLFormElement) || !(successState instanceof HTMLElement) || !(submitBtn instanceof HTMLButtonElement)) return;
  if (form.dataset.rsvpBound === 'true') return;
  form.dataset.rsvpBound = 'true';
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
      
      // Handle templates that use grid or block for success state
      const isGrid = window.getComputedStyle(successState).display === 'grid' || successState.classList.contains('rsvp-success--grid');
      successState.style.display = isGrid ? 'grid' : 'block';

      if (wishesContainer && result.item?.message) {
        const currentRendered = wishesContainer.querySelectorAll('.wish-card').length;
        await syncWishesFromServer({
          weddingId: String(payload.weddingId),
          wishesContainer,
          emptyState,
          loadMoreBtn,
          limit: Math.max(currentRendered + 1, 4),
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

export function initWishesLoadMore(root: Element | Document = document) {
  const button = root.querySelector('[data-wishes-load-more]');
  const wishesContainer = root.querySelector('[data-wishes-list]');
  if (!(button instanceof HTMLButtonElement) || !wishesContainer) return;
  if (button.dataset.wishesBound === 'true') return;
  button.dataset.wishesBound = 'true';

  button.addEventListener('click', async () => {
    if (button.dataset.loading === 'true') return;

    const weddingId = button.dataset.weddingId;
    const offset = parseInt(button.dataset.offset || '0', 10);
    if (!weddingId) return;

    button.dataset.loading = 'true';
    button.disabled = true;
    button.textContent = 'Loading...';

    try {
      const response = await fetch(`/api/wishes?weddingId=${encodeURIComponent(weddingId)}&offset=${offset}&limit=4`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal memuat ucapan.');

      const existingWishKeys = getRenderedWishKeys(wishesContainer);
      result.items.forEach((wish: any) => {
        const wishKey = getWishKey({
          id: wish.id,
          name: wish.guest_name,
          message: wish.message || '',
          createdAt: wish.created_at
        });
        if (existingWishKeys.has(wishKey)) return;

        wishesContainer.append(createWishCard({
          id: wish.id,
          name: wish.guest_name,
          attendance: wish.attendance_status,
          message: wish.message || '',
          createdAt: wish.created_at
        }));
        existingWishKeys.add(wishKey);
      });

      const nextOffset = offset + result.items.length;
      button.dataset.offset = String(nextOffset);

      if (!result.hasMore || result.items.length === 0) {
        button.remove();
      } else {
        button.disabled = false;
        button.dataset.loading = 'false';
        button.textContent = 'Load More';
      }
    } catch (error) {
      button.disabled = false;
      button.dataset.loading = 'false';
      button.textContent = 'Load More';
      console.error(error);
    }
  });
}
