/**
 * Developer authoring & code block utilities:
 * - Toast notifications (`#tmt-global-toast`)
 * - Dev-mode Edit dropdown (`.edit-dropdown`: VS Code / Cursor / Copy path)
 * - Read-only `.tmt` Source Viewer modal (`.btn-source-view-toggle`)
 * - Code block copy button (`.code-copy-btn`) with `withBasePath` SVG icon paths
 */

import { copyTextToClipboard } from './dom';
import { getBasePath, t, withBasePath } from './env';

let toastTimer: number | null = null;
let editDropdownOutsideBound = false;
let codeCopyBound = false;
let sourceOverlay: HTMLElement | null = null;

const hoverBoundDropdowns = new WeakSet<HTMLElement>();
const codeCopyTimers = new WeakMap<HTMLElement, number>();

export function showToast(message: string): void {
  let toast = document.getElementById('tmt-global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'tmt-global-toast';
    toast.className = 'tmt-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('is-show');
  if (toastTimer !== null) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast?.classList.remove('is-show');
    toastTimer = null;
  }, 2500);
}

function closeAllEditDropdowns(): void {
  document.querySelectorAll<HTMLElement>('.edit-dropdown.is-open').forEach((d) => {
    d.classList.remove('is-open');
    const m = d.querySelector<HTMLElement>('.edit-dropdown-menu');
    if (m) m.hidden = true;
  });
}

export function setupEditDropdown(): void {
  const editBtns = document.querySelectorAll<HTMLElement>('.btn-edit-open');
  if (editBtns.length > 0) {
    editBtns.forEach((btn) => {
      const dropdown = btn.closest<HTMLElement>('.edit-dropdown');
      const menu = dropdown?.querySelector<HTMLElement>('.edit-dropdown-menu');
      if (!dropdown || !menu) return;

      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('is-open');
        closeAllEditDropdowns();
        if (!isOpen) {
          dropdown.classList.add('is-open');
          menu.hidden = false;
        }
      };

      if (!hoverBoundDropdowns.has(dropdown)) {
        hoverBoundDropdowns.add(dropdown);
        let hoverTimer: number | null = null;
        dropdown.addEventListener('mouseenter', () => {
          if (window.matchMedia('(hover: hover)').matches) {
            if (hoverTimer !== null) window.clearTimeout(hoverTimer);
            dropdown.classList.add('is-open');
            menu.hidden = false;
          }
        });
        dropdown.addEventListener('mouseleave', () => {
          if (window.matchMedia('(hover: hover)').matches) {
            hoverTimer = window.setTimeout(() => {
              dropdown.classList.remove('is-open');
              menu.hidden = true;
            }, 180);
          }
        });
      }
    });

    document.querySelectorAll<HTMLElement>('.btn-copy-path').forEach((btn) => {
      btn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const path = btn.getAttribute('data-path');
        if (path) {
          try {
            await copyTextToClipboard(path);
            showToast(t('toast.copied', 'コピーしました'));
          } catch {
            showToast(t('toast.copy_failed', 'コピーに失敗しました'));
          }
        }
        closeAllEditDropdowns();
      };
    });
  }

  if (!editDropdownOutsideBound) {
    editDropdownOutsideBound = true;
    document.addEventListener('click', (e) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target?.closest('.edit-dropdown')) {
        closeAllEditDropdowns();
      }
    });
  }
}

async function fetchSource(path: string): Promise<string | null> {
  const query = `?path=${encodeURIComponent(path)}`;
  const candidates = getBasePath()
    ? [`${withBasePath('/__shelf/source')}${query}`, `/__shelf/source${query}`]
    : [`/__shelf/source${query}`];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) return await res.text();
    } catch {
      // Try next candidate
    }
  }
  return null;
}

function closeSourceOverlay(): void {
  sourceOverlay?.remove();
  sourceOverlay = null;
  document.removeEventListener('keydown', onSourceOverlayKeydown, true);
}

function onSourceOverlayKeydown(e: KeyboardEvent): void {
  if (!sourceOverlay) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeSourceOverlay();
  }
}

function openSourceOverlay(source: string): void {
  closeSourceOverlay();

  const overlay = document.createElement('div');
  overlay.className = 'tmt-source-viewer-overlay';

  const panel = document.createElement('div');
  panel.className = 'tmt-source-viewer-panel';

  const toolbar = document.createElement('div');
  toolbar.className = 'tmt-source-viewer-toolbar';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'tmt-source-viewer-btn';
  closeBtn.textContent = t('edit.close', '閉じる');
  closeBtn.onclick = closeSourceOverlay;

  toolbar.append(closeBtn);

  const textarea = document.createElement('textarea');
  textarea.className = 'tmt-source-viewer-textarea';
  textarea.value = source;
  textarea.readOnly = true;
  textarea.spellcheck = false;

  panel.append(toolbar, textarea);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  sourceOverlay = overlay;

  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) closeSourceOverlay();
  });
  document.addEventListener('keydown', onSourceOverlayKeydown, true);

  textarea.focus();
  textarea.setSelectionRange(0, 0);
}

export function setupSourceViewer(): void {
  document.querySelectorAll<HTMLButtonElement>('.btn-source-view-toggle').forEach((toggle) => {
    toggle.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeAllEditDropdowns();

      const path = toggle.dataset.sourcePath || '';
      if (!path) return;
      const source = await fetchSource(path);
      if (source === null) {
        showToast(t('toast.source_load_failed', 'ソースの読み込みに失敗しました'));
        return;
      }
      openSourceOverlay(source);
    };
  });
}

export function setupCodeCopy(): void {
  if (codeCopyBound) return;
  codeCopyBound = true;

  document.addEventListener('click', async (e) => {
    const target = e.target instanceof Element ? e.target : null;
    const btn = target?.closest<HTMLElement>('.code-copy-btn');
    if (!btn) return;

    const wrapper = btn.closest('.code-block-wrapper');
    const code = wrapper
      ? wrapper.querySelector('pre code') ?? wrapper.querySelector('pre')
      : null;
    if (!code) return;

    const text = code.textContent || '';
    try {
      await copyTextToClipboard(text);

      const use = btn.querySelector('use');
      use?.setAttribute('href', withBasePath('/icons/lucide.svg#check'));
      const icon = btn.querySelector('tmt-icon');
      icon?.setAttribute('name', 'check');

      btn.classList.add('is-copied');
      const copiedLabel = t('code.copied', 'コピーしました');
      btn.setAttribute('title', copiedLabel);
      btn.setAttribute('aria-label', copiedLabel);

      const prevTimer = codeCopyTimers.get(btn);
      if (prevTimer !== undefined) window.clearTimeout(prevTimer);

      const resetTimer = window.setTimeout(() => {
        use?.setAttribute('href', withBasePath('/icons/lucide.svg#copy'));
        icon?.setAttribute('name', 'copy');
        btn.classList.remove('is-copied');
        const copyLabel = t('code.copy', 'コードをコピー');
        btn.setAttribute('title', copyLabel);
        btn.setAttribute('aria-label', copyLabel);
        codeCopyTimers.delete(btn);
      }, 2000);
      codeCopyTimers.set(btn, resetTimer);
    } catch {
      // Ignore clipboard write errors
    }
  });
}
