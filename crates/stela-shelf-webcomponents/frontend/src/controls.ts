/**
 * View mode switcher, sticky-tabs side switcher, draggable/collapsible floating controls,
 * and top page-load progress bar.
 */

import { isEditableTarget, rafThrottle, storage } from './dom';
import { t } from './env';

export function startPageProgress(): void {
  const bar = document.getElementById('page-progress-bar');
  if (!bar) return;
  bar.classList.remove('is-done', 'is-loading');
  void bar.offsetWidth;
  bar.classList.add('is-loading');
}

export function finishPageProgress(): void {
  const bar = document.getElementById('page-progress-bar');
  if (!bar) return;
  bar.classList.remove('is-loading');
  bar.classList.add('is-done');
  window.setTimeout(() => {
    bar.classList.remove('is-done');
  }, 450);
}

export function syncViewMode(doc: Document = document): void {
  const savedView = storage.get('wiki-view-mode');
  if (savedView === 'classic' || savedView === 'book') {
    doc.documentElement.setAttribute('data-view', savedView);
  } else if (window.innerWidth < 768) {
    doc.documentElement.setAttribute('data-view', 'classic');
  }
}

const dragBoundElements = new WeakSet<HTMLElement>();
let viewSwitcherKeyBound = false;
const collapseBoundButtons = new WeakSet<HTMLElement>();

export function setupDraggableFloatingControls(): void {
  const floating =
    document.getElementById('floating-controls') ??
    document.querySelector<HTMLElement>('.floating-controls');
  if (!floating) return;

  const handle = floating.querySelector<HTMLElement>('.floating-drag-handle');
  if (!handle) return;

  const isNarrowViewport = () => window.innerWidth <= 768;

  const restorePosition = () => {
    if (isNarrowViewport()) return;
    try {
      const saved = storage.get('wiki-floating-controls-pos');
      if (!saved) return;
      const parsed = JSON.parse(saved) as { x?: number; y?: number };
      if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return;
      const width = floating.offsetWidth || 280;
      const height = floating.offsetHeight || 38;
      const maxX = Math.max(8, window.innerWidth - width - 8);
      const maxY = Math.max(8, window.innerHeight - height - 8);
      const clampedX = Math.max(8, Math.min(maxX, parsed.x));
      const clampedY = Math.max(8, Math.min(maxY, parsed.y));
      floating.style.left = `${clampedX}px`;
      floating.style.top = `${clampedY}px`;
      floating.style.right = 'auto';
    } catch {
      // Ignore malformed stored coordinates
    }
  };

  restorePosition();
  requestAnimationFrame(restorePosition);

  if (dragBoundElements.has(floating)) return;
  dragBoundElements.add(floating);

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let dragWidth = 0;
  let dragHeight = 0;
  let offsetLeft = 0;
  let offsetTop = 0;

  const applyDragTransform = rafThrottle(() => {
    floating.style.transform = `translate3d(${offsetLeft}px, ${offsetTop}px, 0)`;
  });

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || isNarrowViewport()) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = floating.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    dragWidth = rect.width;
    dragHeight = rect.height;
    offsetLeft = 0;
    offsetTop = 0;

    floating.style.left = `${startLeft}px`;
    floating.style.top = `${startTop}px`;
    floating.style.right = 'auto';
    floating.classList.add('is-dragging');

    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture errors
    }
    e.preventDefault();
    e.stopPropagation();
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!isDragging) return;
    const maxX = Math.max(8, window.innerWidth - dragWidth - 8);
    const maxY = Math.max(8, window.innerHeight - dragHeight - 8);
    const left = Math.max(8, Math.min(maxX, startLeft + (e.clientX - startX)));
    const top = Math.max(8, Math.min(maxY, startTop + (e.clientY - startY)));
    offsetLeft = left - startLeft;
    offsetTop = top - startTop;
    applyDragTransform();
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!isDragging) return;
    isDragging = false;
    floating.classList.remove('is-dragging');
    try {
      handle.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture errors
    }

    applyDragTransform.cancel();
    const finalLeft = Math.round(startLeft + offsetLeft);
    const finalTop = Math.round(startTop + offsetTop);
    floating.style.transform = '';
    floating.style.left = `${finalLeft}px`;
    floating.style.top = `${finalTop}px`;

    storage.set('wiki-floating-controls-pos', JSON.stringify({ x: finalLeft, y: finalTop }));
  };

  handle.addEventListener('pointerdown', onPointerDown);
  handle.addEventListener('pointermove', onPointerMove);
  handle.addEventListener('pointerup', onPointerUp);
  handle.addEventListener('pointercancel', onPointerUp);

  window.addEventListener('resize', () => {
    if (isNarrowViewport()) return;
    if (floating.style.left && floating.style.left !== 'auto') {
      const rect = floating.getBoundingClientRect();
      const maxX = Math.max(8, window.innerWidth - floating.offsetWidth - 8);
      const maxY = Math.max(8, window.innerHeight - floating.offsetHeight - 8);
      floating.style.left = `${Math.max(8, Math.min(maxX, rect.left))}px`;
      floating.style.top = `${Math.max(8, Math.min(maxY, rect.top))}px`;
    }
  });
}

export function setupViewSwitcher(): void {
  const btnBook = document.getElementById('btn-view-book');
  const btnClassic = document.getElementById('btn-view-classic');
  if (!btnBook || !btnClassic) return;

  const setView = (mode: 'book' | 'classic') => {
    document.documentElement.setAttribute('data-view', mode);
    storage.set('wiki-view-mode', mode);
    document.dispatchEvent(new CustomEvent('tmt:view-mode-changed', { detail: { view: mode } }));
  };

  btnBook.onclick = () => setView('book');
  btnClassic.onclick = () => setView('classic');

  if (!viewSwitcherKeyBound) {
    viewSwitcherKeyBound = true;
    window.addEventListener('keydown', (e) => {
      if (isEditableTarget(e.target)) return;
      if (e.key.toLowerCase() === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const current = document.documentElement.getAttribute('data-view');
        setView(current === 'book' ? 'classic' : 'book');
      }
    });
  }
}

export function setupTabsSideSwitcher(): void {
  const btnTop = document.getElementById('btn-tabs-top');
  const btnRight = document.getElementById('btn-tabs-right');
  if (!btnTop || !btnRight) return;

  const sync = () => {
    const side = document.documentElement.getAttribute('data-tabs') === 'right' ? 'right' : 'top';
    btnTop.classList.toggle('is-active', side === 'top');
    btnRight.classList.toggle('is-active', side === 'right');
  };

  const setSide = (side: 'top' | 'right') => {
    document.documentElement.setAttribute('data-tabs', side);
    storage.set('wiki-tabs-side', side);
    sync();
  };

  btnTop.onclick = () => setSide('top');
  btnRight.onclick = () => setSide('right');
  sync();
}

export function setupFloatingCollapse(): void {
  const floating = document.getElementById('floating-controls');
  const collapseBtn = document.getElementById('btn-floating-collapse');
  if (!floating || !collapseBtn) return;

  const syncCollapsed = (collapsed: boolean) => {
    floating.classList.toggle('is-collapsed', collapsed);
    const label = collapsed
      ? t('floating.expand', 'バーを展開')
      : t('floating.collapse', '折りたたむ');
    collapseBtn.setAttribute('title', label);
    collapseBtn.setAttribute('aria-label', label);
    storage.set('wiki-floating-controls-collapsed', collapsed ? 'true' : 'false');
  };

  if (storage.get('wiki-floating-controls-collapsed') === 'true') {
    syncCollapsed(true);
  }

  if (collapseBoundButtons.has(collapseBtn)) return;
  collapseBoundButtons.add(collapseBtn);

  collapseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    syncCollapsed(!floating.classList.contains('is-collapsed'));
  });

  floating.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (floating.classList.contains('is-collapsed') && !target?.closest('.floating-drag-handle')) {
      syncCollapsed(false);
      document.getElementById('wiki-search-input')?.focus();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (
      ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') ||
      (e.key === '/' && !isEditableTarget(e.target))
    ) {
      if (floating.classList.contains('is-collapsed')) {
        syncCollapsed(false);
      }
    }
  });

  const badge = floating.querySelector('.search-shortcut-badge');
  badge?.addEventListener('click', () => {
    document.getElementById('wiki-search-input')?.focus();
  });
}
