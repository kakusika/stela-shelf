/**
 * Client-side PJAX router for instant note-to-note transitions with View Transitions,
 * scroll restoration, root-mounted vault support, and full component re-initialization.
 */

import { hidePopover } from './book-view';
import { closeCenterPeek } from './center-peek';
import { finishPageProgress, startPageProgress } from './controls';
import { computeScrollOffset, fetchDocument, findHeadingInView } from './dom';
import { isHomePath, isInAppHref, normalizePath, setPageUrl } from './env';
import { initPage } from './init';
import { closeLightbox } from './lightbox';
import { collapseDataPane, collapseNavPane } from './panes';
import { hidePreviewCard } from './preview';
import { markVisited } from './recent-notes';

interface RouterHistoryState {
  path?: string;
  scrollTop?: number;
}

let isNavigating = false;
let clientRouterInitialized = false;
let currentPath = '';

function decodeHashPart(url: string): string {
  const idx = url.indexOf('#');
  if (idx === -1) return '';
  const raw = url.slice(idx + 1);
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function saveCurrentScrollState(): void {
  const isClassic = document.documentElement.getAttribute('data-view') === 'classic';
  const scrollContainer = document.getElementById('book-content-scroll');
  const scrollTop =
    !isClassic && scrollContainer ? scrollContainer.scrollTop : window.scrollY;
  try {
    const prevState = (history.state as RouterHistoryState | null) ?? {};
    history.replaceState(
      {
        ...prevState,
        scrollTop,
        path: window.location.href,
      },
      document.title
    );
  } catch {
    // Ignore history state errors
  }
}

function extractPageUrlFromDoc(doc: Document, fallbackUrl: string): string {
  const scriptEl = Array.from(doc.querySelectorAll('script')).find((s) =>
    (s.textContent || '').includes('window.tmtPageUrl')
  );
  if (scriptEl?.textContent) {
    const m = scriptEl.textContent.match(/window\.tmtPageUrl\s*=\s*(".*?"|'.*?');/);
    if (m?.[1]) {
      try {
        return JSON.parse(m[1]) as string;
      } catch {
        // Fall through
      }
    }
  }
  return normalizePath(fallbackUrl) || fallbackUrl;
}

function swapContent(
  newDoc: Document,
  url: string,
  cleanUrl: string,
  hash: string,
  pushState: boolean,
  savedScrollTop: number | null
): void {
  document.title = newDoc.title;
  const resolvedPageUrl = extractPageUrlFromDoc(newDoc, cleanUrl);
  setPageUrl(resolvedPageUrl);

  if (pushState) {
    history.pushState({ path: url, scrollTop: 0 }, newDoc.title, url);
  }

  currentPath = normalizePath(cleanUrl);
  markVisited(cleanUrl);

  // 1. Breadcrumbs in TOC panel
  const currentBreadcrumb = document.querySelector('#pane-panel-toc .nav-breadcrumbs');
  const newBreadcrumb = newDoc.querySelector('#pane-panel-toc .nav-breadcrumbs');
  if (currentBreadcrumb && newBreadcrumb) {
    currentBreadcrumb.innerHTML = newBreadcrumb.innerHTML;
  }

  // 2. TOC in TOC panel (`#pane-panel-toc` holds `.nav-breadcrumbs` and `.pane-toc` directly)
  const currentToc = document.querySelector('#pane-panel-toc .pane-toc');
  const newToc = newDoc.querySelector('#pane-panel-toc .pane-toc');
  if (newToc) {
    if (currentToc) {
      currentToc.innerHTML = newToc.innerHTML;
    } else {
      document.getElementById('pane-panel-toc')?.appendChild(newToc.cloneNode(true));
    }
  } else if (currentToc) {
    currentToc.remove();
  }

  // 3. Backlinks panel
  const currentLinks = document.getElementById('pane-panel-links');
  const newLinks = newDoc.getElementById('pane-panel-links');
  if (currentLinks && newLinks) {
    currentLinks.innerHTML = newLinks.innerHTML;
  }

  // 4. Sync `.is-here` across Book Index and Lookup results in `#pane-nav`
  const targetNorm = normalizePath(resolvedPageUrl);
  document.querySelectorAll<HTMLAnchorElement>('#pane-nav .book-index-link').forEach((el) => {
    const hrefNorm = normalizePath(el.getAttribute('href'));
    const isHere = Boolean(hrefNorm && hrefNorm === targetNorm);
    el.classList.toggle('is-here', isHere);
    if (isHere) {
      el.setAttribute('aria-current', 'page');
    } else {
      el.removeAttribute('aria-current');
    }
  });

  // 5. Data pane (Infobox)
  const currentDataPane = document.getElementById('pane-data');
  const newDataPane = newDoc.getElementById('pane-data');
  if (newDataPane) {
    if (currentDataPane) {
      currentDataPane.innerHTML = newDataPane.innerHTML;
    } else {
      const contentPane = document.querySelector('.pane-content');
      contentPane?.parentNode?.insertBefore(newDataPane.cloneNode(true), contentPane);
    }
  } else if (currentDataPane) {
    currentDataPane.remove();
  }

  // 6. Sticky tabs header
  const currentHeader = document.querySelector('.pane-content-header');
  const newHeader = newDoc.querySelector('.pane-content-header');
  if (currentHeader) {
    currentHeader.innerHTML = newHeader ? newHeader.innerHTML : '';
  }

  // 7. Article container
  const currentArticle = document.querySelector('.pane-article-container');
  const newArticle = newDoc.querySelector('.pane-article-container');
  if (currentArticle && newArticle) {
    currentArticle.innerHTML = newArticle.innerHTML;
  }

  // 8. Classic view
  const currentClassic = document.querySelector('.classic-view');
  const newClassic = newDoc.querySelector('.classic-view');
  if (currentClassic && newClassic) {
    currentClassic.innerHTML = newClassic.innerHTML;
  }

  // 9. Scroll to requested heading, restored history position, or top
  const scrollContainer = document.getElementById('book-content-scroll');
  const isClassic = document.documentElement.getAttribute('data-view') === 'classic';

  if (hash) {
    const bookTarget = findHeadingInView(hash, false);
    if (scrollContainer) {
      scrollContainer.scrollTop = bookTarget
        ? computeScrollOffset(scrollContainer, bookTarget, 16)
        : 0;
    }
    if (isClassic) {
      const classicTarget = findHeadingInView(hash, true);
      window.scrollTo({
        top: classicTarget ? computeScrollOffset(window, classicTarget, 32) : 0,
        behavior: 'auto',
      });
    }
  } else if (savedScrollTop !== null) {
    if (scrollContainer) {
      scrollContainer.scrollTop = savedScrollTop;
    }
    if (isClassic) {
      window.scrollTo({ top: savedScrollTop, behavior: 'auto' });
    }
  } else {
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
    if (isClassic) {
      window.scrollTo(0, 0);
    }
  }

  // 10. Re-initialize all page-level interactions (Book/Classic view, Lightbox, Source Viewer, Infobox, etc.)
  initPage((nextUrl) => void navigateTo(nextUrl, true));
  finishPageProgress();
}

export async function navigateTo(
  url: string,
  pushState = true,
  savedScrollTop: number | null = null
): Promise<void> {
  if (isNavigating) return;

  const targetNorm = normalizePath(url);
  const hash = decodeHashPart(url);

  if (currentPath && currentPath === targetNorm) {
    const isClassic = document.documentElement.getAttribute('data-view') === 'classic';
    const scrollContainer = document.getElementById('book-content-scroll');
    if (hash) {
      const targetEl = findHeadingInView(hash, isClassic);
      if (targetEl) {
        if (isClassic) {
          window.scrollTo({
            top: computeScrollOffset(window, targetEl, 32),
            behavior: 'smooth',
          });
        } else if (scrollContainer) {
          scrollContainer.scrollTo({
            top: computeScrollOffset(scrollContainer, targetEl, 16),
            behavior: 'smooth',
          });
        }
      }
    } else if (isClassic) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (pushState) {
      history.pushState({ path: url, scrollTop: 0 }, '', url);
    }
    return;
  }

  // Home catalog page uses standalone catalog layout without `#wiki-book-view`
  if (isHomePath(url) || !document.getElementById('wiki-book-view')) {
    if (!pushState) {
      window.location.reload();
    } else {
      window.location.href = url;
    }
    return;
  }

  if (pushState) {
    saveCurrentScrollState();
  }

  isNavigating = true;
  startPageProgress();

  closeLightbox();
  closeCenterPeek();
  hidePreviewCard();
  hidePopover();
  if (window.innerWidth <= 768) {
    collapseNavPane();
    collapseDataPane();
  }
  const searchResults = document.getElementById('wiki-search-results');
  if (searchResults) searchResults.hidden = true;

  try {
    const cleanUrl = url.split('#')[0];
    const newDoc = await fetchDocument(cleanUrl);
    if (!newDoc || !newDoc.getElementById('wiki-book-view')) {
      finishPageProgress();
      if (!pushState) {
        window.location.reload();
      } else {
        window.location.href = url;
      }
      return;
    }

    const docWithVT = document as Document & {
      startViewTransition?: (cb: () => void) => unknown;
    };
    if (typeof docWithVT.startViewTransition === 'function') {
      docWithVT.startViewTransition(() => {
        swapContent(newDoc, url, cleanUrl, hash, pushState, savedScrollTop);
      });
    } else {
      swapContent(newDoc, url, cleanUrl, hash, pushState, savedScrollTop);
    }
  } catch {
    finishPageProgress();
    if (!pushState) {
      window.location.reload();
    } else {
      window.location.href = url;
    }
  } finally {
    isNavigating = false;
  }
}

export function setupClientRouter(): void {
  if (clientRouterInitialized) return;
  clientRouterInitialized = true;

  currentPath = normalizePath(window.location.href);

  try {
    const state = history.state as RouterHistoryState | null;
    if (!state || state.scrollTop === undefined) {
      const scrollContainer = document.getElementById('book-content-scroll');
      const scrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
      history.replaceState(
        { ...(state ?? {}), path: window.location.href, scrollTop },
        document.title
      );
    }
  } catch {
    // Ignore history restrictions
  }

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }

    const anchor = e
      .composedPath()
      .find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
    if (!anchor) return;
    if (anchor.hasAttribute('download') || anchor.getAttribute('target') === '_blank') return;

    const href = anchor.getAttribute('href');
    if (!href || !isInAppHref(href) || isHomePath(href)) return;
    if (!document.getElementById('wiki-book-view')) return;

    e.preventDefault();
    void navigateTo(href, true);
  });

  window.addEventListener('popstate', (e) => {
    const state = e.state as RouterHistoryState | null;
    const savedScroll = typeof state?.scrollTop === 'number' ? state.scrollTop : null;
    void navigateTo(window.location.href, false, savedScroll);
  });
}
