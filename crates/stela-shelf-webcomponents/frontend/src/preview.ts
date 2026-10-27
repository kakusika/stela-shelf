/**
 * Hover Page Preview card (`#wiki-page-preview`) with Center Peek launch trigger.
 */

import { openCenterPeek } from './center-peek';
import { fetchDocument } from './dom';
import { isHomePath, isInAppHref, normalizePath } from './env';

interface PreviewData {
  title: string;
  section: string;
  excerpt: string;
  image: string;
}

const previewCache = new Map<string, PreviewData>();
let hoverTimer: number | null = null;
let activeLink: HTMLAnchorElement | null = null;
let previewGlobalInitialized = false;
const boundPreviewCards = new WeakSet<HTMLElement>();

export function invalidatePreviewCache(url?: string): void {
  if (!url) {
    previewCache.clear();
    return;
  }
  const key = normalizePath(url);
  if (key) previewCache.delete(key);
}

export function hidePreviewCard(): void {
  const card = document.getElementById('wiki-page-preview');
  if (card) card.hidden = true;
}

export function initPagePreview(): void {
  const previewCardEl = document.getElementById('wiki-page-preview');
  if (previewCardEl && !boundPreviewCards.has(previewCardEl)) {
    boundPreviewCards.add(previewCardEl);
    previewCardEl.addEventListener('click', () => {
      const href = previewCardEl.dataset.href;
      if (href) {
        hidePreviewCard();
        void openCenterPeek(href);
      }
    });
    previewCardEl.addEventListener('mouseleave', () => {
      if (hoverTimer !== null) window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => {
        if (!previewCardEl.matches(':hover')) {
          hidePreviewCard();
        }
      }, 150);
    });
  }

  if (previewGlobalInitialized) return;
  previewGlobalInitialized = true;

  window.addEventListener('scroll', hidePreviewCard, { capture: true, passive: true });
  document.addEventListener('click', (e) => {
    const card = document.getElementById('wiki-page-preview');
    const targetNode = e.target instanceof Node ? e.target : null;
    if (card && !card.contains(targetNode)) {
      hidePreviewCard();
    }
  });

  document.addEventListener('mouseover', (e) => {
    const card = document.getElementById('wiki-page-preview');
    if (!card) return;

    const eventEl = e.target instanceof Element ? e.target : null;
    const link = eventEl?.closest('a') ?? null;
    if (!link) return;

    const validContainer = link.closest(
      'article, #pane-panel-lookup, #wiki-search-results, #pane-recent-section, .backlink-items, #pane-panel-index'
    );
    if (!validContainer) return;

    const href = link.getAttribute('href');
    if (!href || !isInAppHref(href) || isHomePath(href)) return;

    activeLink = link;
    if (hoverTimer !== null) window.clearTimeout(hoverTimer);

    hoverTimer = window.setTimeout(async () => {
      if (activeLink !== link) return;

      const cacheKey = normalizePath(href) || href;
      let data = previewCache.get(cacheKey);
      if (!data) {
        const doc = await fetchDocument(href);
        if (!doc) return;

        const title =
          doc.querySelector('.content-title')?.textContent?.trim() ||
          doc.querySelector('h1')?.textContent?.trim() ||
          '';
        const section =
          doc.querySelector('.crumb-val')?.textContent?.trim() ||
          doc.querySelector('.breadcrumb-section')?.textContent?.trim() ||
          '';
        const excerpt =
          doc.querySelector('article p, article li, article blockquote')?.textContent?.trim() || '';
        const imgEl = doc.querySelector(
          '.hero-banner-img, .infobox-main-img, .hero-avatar img, article img:not(.tm-link-icon):not(.tm-doc-icon-img)'
        );
        const image = imgEl?.getAttribute('src') || '';

        data = { title, section, excerpt, image };
        previewCache.set(cacheKey, data);
      }

      if (activeLink !== link) return;
      if (!data.excerpt && !data.title) return;

      const titleEl = card.querySelector('.preview-title');
      const sectionEl = card.querySelector('.preview-section');
      const bodyEl = card.querySelector('.preview-body');
      const thumbEl = card.querySelector<HTMLImageElement>('.preview-thumb');

      if (titleEl) titleEl.textContent = data.title;
      if (sectionEl) sectionEl.textContent = data.section ? `(${data.section})` : '';
      if (bodyEl) bodyEl.textContent = data.excerpt;

      if (thumbEl) {
        if (data.image) {
          thumbEl.src = data.image;
          thumbEl.hidden = false;
        } else {
          thumbEl.src = '';
          thumbEl.hidden = true;
        }
      }

      const rect = link.getBoundingClientRect();
      const cardWidth = 320;
      let left = rect.left;
      let top = rect.bottom + 8;

      const isSidebar = Boolean(
        link.closest('#pane-panel-lookup, #pane-recent-section, #pane-panel-links, #pane-panel-index')
      );
      if (isSidebar && rect.right + cardWidth + 24 <= window.innerWidth) {
        left = rect.right + 12;
        top = Math.max(16, Math.min(rect.top, window.innerHeight - 180));
      } else {
        if (left + cardWidth > window.innerWidth - 16) {
          left = window.innerWidth - cardWidth - 16;
        }
        if (left < 16) left = 16;
        if (top + 140 > window.innerHeight && rect.top > 150) {
          top = rect.top - 140;
        }
      }

      card.dataset.href = href;
      card.style.left = `${Math.round(left)}px`;
      card.style.top = `${Math.round(top)}px`;
      card.hidden = false;
    }, 250);
  });

  document.addEventListener('mouseout', (e) => {
    const card = document.getElementById('wiki-page-preview');
    if (!card) return;

    const eventEl = e.target instanceof Element ? e.target : null;
    const link = eventEl?.closest('a') ?? null;
    if (link && link === activeLink) {
      activeLink = null;
      if (hoverTimer !== null) window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => {
        if (!card.matches(':hover')) {
          hidePreviewCard();
        }
      }, 150);
    }
  });
}
