/**
 * Notion-style Center Peek modal (`#wiki-center-peek`) with PJAX navigation
 * integration and image lightbox support.
 */

import { fetchDocument } from './dom';
import { isHomePath, isInAppHref, t } from './env';
import { openLightbox } from './lightbox';

export type NavigateHandler = (url: string) => void;

let activePeekUrl: string | null = null;
let centerPeekBound = false;
let currentNavigate: NavigateHandler = (url) => {
  window.location.href = url;
};

export function closeCenterPeek(): void {
  const overlay = document.getElementById('wiki-center-peek');
  if (!overlay || overlay.hidden) return;
  overlay.hidden = true;
  document.body.style.overflow = '';
  activePeekUrl = null;
}

function setBodyMessage(bodyEl: HTMLElement, message: string, isError = false): void {
  const div = document.createElement('div');
  div.className = 'peek-loading';
  if (isError) div.style.color = 'var(--unresolved)';
  div.textContent = message;
  bodyEl.replaceChildren(div);
}

function routeUrl(url: string): void {
  if (isInAppHref(url) && !isHomePath(url)) {
    currentNavigate(url);
  } else {
    window.location.href = url;
  }
}

export async function openCenterPeek(url: string): Promise<void> {
  const overlay = document.getElementById('wiki-center-peek');
  const crumbsEl = document.getElementById('peek-crumbs');
  const bodyEl = document.getElementById('peek-body');
  if (!overlay || !crumbsEl || !bodyEl) return;

  activePeekUrl = url;
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';

  const loadingSpan = document.createElement('span');
  loadingSpan.className = 'crumb-title';
  loadingSpan.textContent = t('search.loading', '読み込み中...');
  crumbsEl.replaceChildren(loadingSpan);
  setBodyMessage(bodyEl, t('search.loading', '読み込み中...'));

  const doc = await fetchDocument(url);
  if (activePeekUrl !== url) return;
  if (!doc) {
    setBodyMessage(bodyEl, t('peek.error', 'ページの読み込みに失敗しました'), true);
    return;
  }

  const title =
    doc.querySelector('.content-title')?.textContent?.trim() ||
    doc.querySelector('h1')?.textContent?.trim() ||
    '';
  const section =
    doc.querySelector('.crumb-val')?.textContent?.trim() ||
    doc.querySelector('.breadcrumb-section')?.textContent?.trim() ||
    '';
  const iconEl = doc.querySelector('.hero-avatar .avatar-icon, .infobox-icon');

  let iconNode: HTMLElement | null = null;
  if (iconEl) {
    const span = document.createElement('span');
    span.className = 'crumb-icon';
    if (iconEl.querySelector('svg, img, tmt-icon')) {
      span.innerHTML = iconEl.innerHTML.trim();
    } else {
      span.textContent = (iconEl.textContent || '').trim();
    }
    iconNode = span;
  }

  const crumbNodes: Node[] = [];
  if (iconNode) crumbNodes.push(iconNode);
  if (section) {
    const sectionSpan = document.createElement('span');
    sectionSpan.textContent = section;
    const sep = document.createElement('span');
    sep.style.opacity = '0.4';
    sep.textContent = '/';
    crumbNodes.push(sectionSpan, sep);
  }
  const titleSpan = document.createElement('span');
  titleSpan.className = 'crumb-title';
  titleSpan.textContent = title || url;
  crumbNodes.push(titleSpan);
  crumbsEl.replaceChildren(...crumbNodes);

  const articleContainer = doc.querySelector('.pane-article-container');
  if (!articleContainer) {
    setBodyMessage(bodyEl, t('peek.not_found', '本文が見つかりませんでした'));
    return;
  }

  const cloned = articleContainer.cloneNode(true) as HTMLElement;
  cloned.querySelectorAll('.hero-actions').forEach((el) => el.remove());

  bodyEl.replaceChildren(cloned);
  bodyEl.scrollTop = 0;

  const hashPart = url.includes('#') ? decodeURIComponent(url.split('#')[1] || '') : '';
  if (hashPart) {
    try {
      const targetEl = bodyEl.querySelector(`[id="${CSS.escape(hashPart)}"]`);
      targetEl?.scrollIntoView({ behavior: 'auto', block: 'start' });
    } catch {
      // Ignore malformed hash selectors
    }
  }

  cloned.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;

    if (href.startsWith('#')) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = decodeURIComponent(href.slice(1));
        try {
          const targetEl = bodyEl.querySelector(`[id="${CSS.escape(targetId)}"]`);
          targetEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          // Ignore malformed hash selectors
        }
      });
      return;
    }

    if (
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('//') ||
      href.startsWith('mailto:')
    ) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      return;
    }

    link.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      closeCenterPeek();
      routeUrl(href);
    });
  });

  cloned
    .querySelectorAll<HTMLElement>(
      'article img:not(.tm-link-icon):not(.tm-doc-icon-img), .hero-banner-img, .infobox-main-img'
    )
    .forEach((img) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => {
        const src = img.getAttribute('data-original') || img.getAttribute('src');
        if (src) openLightbox(src, img.getAttribute('alt') || '');
      });
    });

  cloned.querySelectorAll<HTMLElement>('.hero-zoom-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrapper = btn.closest('.hero-banner-wrapper');
      const img = wrapper?.querySelector('.hero-banner-img');
      const src = img?.getAttribute('data-original') || img?.getAttribute('src');
      if (src) openLightbox(src, img?.getAttribute('alt') || 'Banner');
    });
  });
}

export function initCenterPeek(onNavigate?: NavigateHandler): void {
  if (onNavigate) currentNavigate = onNavigate;

  const overlay = document.getElementById('wiki-center-peek');
  if (!overlay || centerPeekBound) return;
  centerPeekBound = true;

  document.getElementById('peek-btn-close')?.addEventListener('click', closeCenterPeek);

  document.getElementById('peek-btn-fullscreen')?.addEventListener('click', () => {
    if (!activePeekUrl) return;
    const targetUrl = activePeekUrl;
    closeCenterPeek();
    routeUrl(targetUrl);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCenterPeek();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) {
      const lightbox = document.getElementById('wiki-image-lightbox');
      if (lightbox && !lightbox.hidden) return;
      closeCenterPeek();
    }
  });
}
