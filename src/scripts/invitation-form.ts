import { createOgImageBlob } from '../utils/og-generator';
import { bindAutoMediaCompression } from './media-compressor';

declare global {
  interface Window {
    showConfirm?: (opts: {
      title: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
      variant?: string;
      icon?: string;
    }) => Promise<boolean>;
  }
}

export interface RepeaterConfig {
  containerId: string;
  btnId: string;
  templateId: string;
}

export interface InvitationFormOptions {
  formId: string;
  confirmDelete?: boolean;
  enableCollapsibles?: boolean;
  enableSaveShortcut?: boolean;
  enablePurchasePriceSync?: boolean;
}

const DEFAULT_REPEATERS: readonly RepeaterConfig[] = [
  { containerId: 'slider_container', btnId: 'add_slider_btn', templateId: 'slider_template' },
  { containerId: 'events_container', btnId: 'add_event_btn', templateId: 'event_template' },
  { containerId: 'stories_container', btnId: 'add_story_btn', templateId: 'story_template' },
  { containerId: 'gallery_container', btnId: 'add_gallery_btn', templateId: 'gallery_template' },
  { containerId: 'gallery_videos_container', btnId: 'add_gallery_video_btn', templateId: 'gallery_video_template' },
  { containerId: 'gifts_container', btnId: 'add_gift_btn', templateId: 'gift_template' }
];

function setupRepeater(
  { containerId, btnId, templateId }: RepeaterConfig,
  confirmDelete: boolean
) {
  const container = document.getElementById(containerId);
  const btn = document.getElementById(btnId);
  const template = document.getElementById(templateId) as HTMLTemplateElement | null;
  if (!container || !btn || !template) return;

  const updateIndexes = () => {
    container.querySelectorAll('.repeater-item').forEach((item, index) => {
      const idxSpan = item.querySelector('.idx');
      if (idxSpan) idxSpan.textContent = String(index + 1);
    });
  };

  btn.addEventListener('click', () => {
    container.appendChild(template.content.cloneNode(true));
    updateIndexes();
  });

  container.addEventListener('click', async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.closest('.remove-btn')) return;

    if (confirmDelete && typeof window.showConfirm === 'function') {
      const confirmed = await window.showConfirm({
        title: 'Delete Item',
        message: 'Are you sure you want to delete this item?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger',
        icon: 'delete'
      });
      if (!confirmed) return;
    }

    const item = target.closest('.repeater-item');
    if (item) {
      item.remove();
      updateIndexes();
    }
  });
}

function initSettingToggles() {
  const settingTargets = document.querySelectorAll<HTMLElement>('[data-setting-target]');

  const syncSettingTargets = () => {
    settingTargets.forEach((target) => {
      const toggleName = target.getAttribute('data-setting-target');
      const toggle = toggleName ? document.querySelector(`input[name="${toggleName}"]`) : null;
      if (toggle instanceof HTMLInputElement) {
        target.hidden = !toggle.checked;
      }
    });
  };

  document
    .querySelectorAll<HTMLInputElement>('.toggle-grid input[type="checkbox"]')
    .forEach((toggle) => toggle.addEventListener('change', syncSettingTargets));
  syncSettingTargets();

  const accessPasswordInput = document.getElementById('accessPasswordInput') as HTMLInputElement | null;
  const passwordProtectionToggle = document.getElementById('passwordProtectionToggle') as HTMLInputElement | null;
  if (accessPasswordInput && passwordProtectionToggle) {
    accessPasswordInput.addEventListener('input', () => {
      if (accessPasswordInput.value.trim().length > 0 && !passwordProtectionToggle.checked) {
        passwordProtectionToggle.checked = true;
      }
    });
  }
}

function initPurchasePriceSync() {
  const templateSelect = document.querySelector('select[name="template"]') as HTMLSelectElement | null;
  const purchasePriceInput = document.getElementById('purchase-price-input') as HTMLInputElement | null;
  if (!templateSelect || !purchasePriceInput) return;

  let halfPrices: Record<string, number> = {};
  try {
    halfPrices = JSON.parse(purchasePriceInput.getAttribute('data-half-prices') || '{}');
  } catch {
    halfPrices = {};
  }

  const getAutoPrice = (tpl: string): string => {
    const val = halfPrices[String(tpl || '').trim().toLowerCase()];
    return typeof val === 'number' ? String(val) : '';
  };

  let isManualPrice =
    purchasePriceInput.value.trim() !== '' &&
    purchasePriceInput.value.trim() !== getAutoPrice(templateSelect.value);

  purchasePriceInput.addEventListener('input', () => {
    const trimmed = purchasePriceInput.value.trim();
    isManualPrice = trimmed !== '' && trimmed !== getAutoPrice(templateSelect.value);
  });

  templateSelect.addEventListener('change', () => {
    if (!isManualPrice || purchasePriceInput.value.trim() === '') {
      purchasePriceInput.value = getAutoPrice(templateSelect.value);
      isManualPrice = false;
    }
  });
}

function initCollapsibleSections() {
  const sections = document.querySelectorAll('.collapsible-section');
  sections.forEach((section) => {
    section.querySelector('.collapsible-header')?.addEventListener('click', () => {
      section.classList.toggle('is-collapsed');
    });
  });

  const setAllCollapsed = (collapsed: boolean) => {
    sections.forEach((section) => section.classList.toggle('is-collapsed', collapsed));
  };

  document.getElementById('global-expand-btn')?.addEventListener('click', () => setAllCollapsed(false));
  document.getElementById('global-collapse-btn')?.addEventListener('click', () => setAllCollapsed(true));
  document.getElementById('sidebar-expand-btn')?.addEventListener('click', () => setAllCollapsed(false));
  document.getElementById('sidebar-collapse-btn')?.addEventListener('click', () => setAllCollapsed(true));
}

export function initInvitationForm(options: InvitationFormOptions) {
  const form = document.getElementById(options.formId) as HTMLFormElement | null;
  const confirmDelete = Boolean(options.confirmDelete);

  for (const config of DEFAULT_REPEATERS) {
    setupRepeater(config, confirmDelete);
  }

  initSettingToggles();
  if (options.enablePurchasePriceSync) initPurchasePriceSync();
  if (options.enableCollapsibles) initCollapsibleSections();

  const heroUrlInput = document.getElementById('hero-image-url-input') as HTMLInputElement | null;
  const heroFileInput = document.getElementById('hero-image-file-input') as HTMLInputElement | null;
  const ogFileInput = document.getElementById('og-image-file-input') as HTMLInputElement | null;
  const ogUrlInput = document.getElementById('og-image-url-input') as HTMLInputElement | null;

  const attachOgThumbnail = async (source: File | string) => {
    try {
      const blob = await createOgImageBlob(source);
      if (!ogFileInput) return;
      const file = new File([blob], 'og-thumbnail.jpg', { type: 'image/jpeg' });
      const dt = new DataTransfer();
      dt.items.add(file);
      ogFileInput.files = dt.files;
    } catch (err) {
      console.warn('Auto OG generation error:', err);
    }
  };

  const ensureOgImageGenerated = async () => {
    const sourceFile = heroFileInput?.files?.[0];
    const sourceUrl = heroUrlInput?.value.trim();

    if (sourceFile) {
      await attachOgThumbnail(sourceFile);
    } else if (sourceUrl && !ogUrlInput?.value) {
      await attachOgThumbnail(sourceUrl);
    }
  };

  heroFileInput?.addEventListener('change', () => {
    const file = heroFileInput.files?.[0];
    if (file) attachOgThumbnail(file);
  });

  if (form) {
    bindAutoMediaCompression(form);

    let isSubmittingAfterOg = false;
    form.addEventListener('submit', async (e) => {
      if (isSubmittingAfterOg) return;
      const hasHero = Boolean(heroFileInput?.files?.[0] || heroUrlInput?.value.trim());
      if (hasHero && !ogFileInput?.files?.length && !ogUrlInput?.value.trim()) {
        e.preventDefault();
        isSubmittingAfterOg = true;
        await ensureOgImageGenerated();
        form.submit();
      }
    });
  }

  if (options.enableSaveShortcut && form) {
    const handleSaveSubmit = async () => {
      await ensureOgImageGenerated();
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        form.submit();
      }
    };

    document.getElementById('sidebar-save-trigger')?.addEventListener('click', handleSaveSubmit);
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveSubmit();
      }
    });
  }
}
