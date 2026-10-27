/**
 * Smart WebSocket live-reload client for `stela-shelf serve`:
 * - Hot-reloads CSS (`type: "css"`) without losing scroll or open UI state
 * - Hot-swaps current note DOM (`type: "doc"`) while preserving scroll position
 * - Invalidates client document/preview/search caches on background updates
 */

import { invalidateDocumentCache } from './dom';
import { normalizePath } from './env';
import { invalidatePreviewCache } from './preview';
import { invalidateSearchCache } from './search';

interface LiveReloadMessage {
  type?: 'css' | 'doc' | 'full' | string;
  url?: string;
}

export function setupDevServerLiveReload(onReinit: () => void): void {
  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return;

  const reloadCss = (): void => {
    const timestamp = String(Date.now());
    const bustLink = (link: HTMLLinkElement): void => {
      const url = new URL(link.href, window.location.href);
      url.searchParams.set('_tmt_ts', timestamp);
      link.href = url.toString();
    };

    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach(bustLink);
    document.querySelectorAll('*').forEach((el) => {
      el.shadowRoot?.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach(bustLink);
    });
  };

  const hotSwapDocument = async (): Promise<void> => {
    try {
      const scrollBox = document.getElementById('book-content-scroll');
      const prevScrollTop = scrollBox ? scrollBox.scrollTop : 0;
      const prevWindowScrollY = window.scrollY;

      const res = await fetch(window.location.href, { cache: 'no-store' });
      if (!res.ok) {
        window.location.reload();
        return;
      }

      const htmlText = await res.text();
      const newDoc = new DOMParser().parseFromString(htmlText, 'text/html');
      document.title = newDoc.title;

      const currentNav = document.getElementById('pane-nav');
      const newNav = newDoc.getElementById('pane-nav');
      if (currentNav && newNav) {
        const prevActivePanel = currentNav.dataset.activePanel || 'toc';
        currentNav.innerHTML = newNav.innerHTML;
        currentNav.dataset.activePanel = prevActivePanel;
      }

      const currentData = document.getElementById('pane-data');
      const newData = newDoc.getElementById('pane-data');
      if (newData) {
        if (currentData) {
          currentData.innerHTML = newData.innerHTML;
        } else {
          const contentPane = document.querySelector('#wiki-book-view .pane-content');
          contentPane?.parentElement?.insertBefore(newData.cloneNode(true), contentPane);
        }
      } else if (currentData) {
        currentData.remove();
      }

      const currentContentHeader = document.querySelector('.pane-content-header');
      const newContentHeader = newDoc.querySelector('.pane-content-header');
      if (currentContentHeader) {
        currentContentHeader.innerHTML = newContentHeader ? newContentHeader.innerHTML : '';
      }

      const currentContainer = document.querySelector('.pane-article-container');
      const newContainer = newDoc.querySelector('.pane-article-container');
      if (currentContainer && newContainer) {
        currentContainer.innerHTML = newContainer.innerHTML;
      }

      const currentClassic = document.querySelector('.classic-view');
      const newClassic = newDoc.querySelector('.classic-view');
      if (currentClassic && newClassic) {
        currentClassic.innerHTML = newClassic.innerHTML;
      }

      if (scrollBox) scrollBox.scrollTop = prevScrollTop;
      window.scrollTo(0, prevWindowScrollY);

      onReinit();
    } catch {
      window.location.reload();
    }
  };

  const isViewingUrl = (targetUrl?: string): boolean => {
    if (!targetUrl) return false;
    return (
      normalizePath(window.location.pathname).toLowerCase() ===
      normalizePath(targetUrl).toLowerCase()
    );
  };

  try {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/live-reload`);

    ws.onmessage = (event) => {
      let data: LiveReloadMessage | null = null;
      if (typeof event.data === 'string') {
        try {
          data = JSON.parse(event.data) as LiveReloadMessage;
        } catch {
          if (event.data === 'reload') data = { type: 'full' };
        }
      }
      if (!data) return;

      if (data.type === 'css') {
        reloadCss();
      } else if (data.type === 'doc') {
        invalidateDocumentCache(data.url);
        invalidatePreviewCache(data.url);
        invalidateSearchCache();
        if (isViewingUrl(data.url)) {
          void hotSwapDocument();
        }
      } else {
        invalidateDocumentCache();
        invalidatePreviewCache();
        invalidateSearchCache();
        window.location.reload();
      }
    };
    ws.onerror = () => {
      // Static builds have no WebSocket endpoint; fail silently.
    };
  } catch {
    // Ignore WebSocket construction errors on restricted origins
  }
}
