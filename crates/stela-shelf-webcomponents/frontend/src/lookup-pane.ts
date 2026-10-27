/**
 * Paginated sidebar Lookup pane (#pane-panel-lookup) with lazy initialization
 * on first panel reveal, section tag filtering, and session-persisted state.
 */

import { rafThrottle, session } from './dom';
import { getPageUrl, normalizePath, t, withBasePath } from './env';
import { isVisited } from './recent-notes';
import {
  getNativeIndex,
  getPagefind,
  nativeSearchDocuments,
  normalizePagefindData,
  type SearchCandidate,
} from './search';

interface LookupSection {
  name: string;
  count: number;
}

interface LookupManifest {
  sections?: LookupSection[];
}

interface SavedLookupState {
  query?: string;
  tags?: string[];
  page?: number;
  scrollTop?: number;
}

const SEARCH_PAGE_SIZE = 20;
let manifestPromise: Promise<LookupManifest> | null = null;

function loadManifest(): Promise<LookupManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(withBasePath('/lookup/manifest.json'))
      .then((res) => (res.ok ? (res.json() as Promise<LookupManifest>) : { sections: [] }))
      .catch(() => ({ sections: [] }));
  }
  return manifestPromise;
}

function onPanelVisible(panelEl: HTMLElement | null, onFirstShow: () => void): void {
  if (!panelEl) {
    onFirstShow();
    return;
  }
  let started = false;
  const showOnce = () => {
    if (started) return;
    started = true;
    observer.disconnect();
    onFirstShow();
  };
  const observer = new MutationObserver(() => {
    if (!panelEl.hidden) showOnce();
  });
  observer.observe(panelEl, { attributes: true, attributeFilter: ['hidden'] });
  if (!panelEl.hidden) showOnce();
}

function buildBookIndexItem(data: SearchCandidate): HTMLElement | null {
  const itemTemplate = document.getElementById(
    'book-index-item-template'
  ) as HTMLTemplateElement | null;
  if (!itemTemplate) return null;

  const li = itemTemplate.content.firstElementChild?.cloneNode(true) as HTMLElement | null;
  if (!li) return null;

  const link = li.querySelector<HTMLAnchorElement>('.book-index-link');
  if (!link) return li;

  const hereNorm = normalizePath(getPageUrl());
  const dataNorm = normalizePath(data.url);
  const isHere = Boolean(hereNorm && dataNorm === hereNorm);

  link.href = data.url;
  link.classList.toggle('is-here', isHere);
  link.classList.toggle('is-visited', isVisited(data.url));
  if (isHere) link.setAttribute('aria-current', 'page');

  const bg = li.querySelector<HTMLElement>('.book-index-bg');
  const bgImg = bg?.querySelector('img');
  if (data.meta?.image && bg && bgImg) {
    bgImg.src = data.meta.image;
    bgImg.addEventListener('error', () => bg.remove(), { once: true });
    bg.hidden = false;
  } else {
    bg?.remove();
  }

  const title = li.querySelector('.book-index-title');
  if (title) title.textContent = data.meta?.title || data.url;

  const body = li.querySelector<HTMLElement>('.book-index-body');
  const hasBody = Boolean(data.filters?.section || data.meta?.aliases || data.excerpt);
  if (!hasBody || !body) {
    body?.remove();
    return li;
  }
  body.hidden = false;

  const meta = body.querySelector<HTMLElement>('.book-index-meta');
  if (data.filters?.section && meta) {
    meta.textContent = data.filters.section;
    meta.hidden = false;
  } else {
    meta?.remove();
  }

  const aliases = body.querySelector<HTMLElement>('.search-result-aliases');
  if (data.meta?.aliases && aliases) {
    const label = aliases.querySelector('.alias-label');
    const text = aliases.querySelector('.alias-text');
    if (label) label.textContent = t('search.aliases', '別名:');
    if (text) text.textContent = data.meta.aliases;
    aliases.hidden = false;
  } else {
    aliases?.remove();
  }

  const excerpt = body.querySelector<HTMLElement>('.search-result-excerpt');
  if (data.excerpt && excerpt) {
    excerpt.innerHTML = data.excerpt;
    excerpt.hidden = false;
  } else {
    excerpt?.remove();
  }

  return li;
}

export function setupLookupPane(): void {
  const input = document.getElementById('lookup-filter-input') as HTMLInputElement | null;
  const tagsBox = document.getElementById('lookup-tags');
  const results = document.getElementById('lookup-results');
  if (!input || !tagsBox || !results) return;
  if (input.dataset.lookupInitialized === 'true') return;
  input.dataset.lookupInitialized = 'true';

  const panelEl = document.getElementById('pane-panel-lookup');
  const paneScroll =
    panelEl?.closest<HTMLElement>('.pane-scroll') ??
    document.querySelector<HTMLElement>('#pane-nav .pane-scroll');

  let savedState: SavedLookupState | null = null;
  try {
    savedState = JSON.parse(session.get('wiki-lookup-state') || 'null') as SavedLookupState | null;
  } catch {
    savedState = null;
  }

  const activeTags = new Set<string>(Array.isArray(savedState?.tags) ? savedState.tags : []);
  let searchToken = 0;
  let searchPage = typeof savedState?.page === 'number' ? savedState.page : 0;
  let pendingScrollTop = typeof savedState?.scrollTop === 'number' ? savedState.scrollTop : null;

  if (savedState?.query) {
    input.value = savedState.query;
  }

  const saveLookupState = (): void => {
    const state: SavedLookupState = {
      query: input.value.trim(),
      tags: [...activeTags],
      page: searchPage,
      scrollTop: paneScroll ? paneScroll.scrollTop : 0,
    };
    session.set('wiki-lookup-state', JSON.stringify(state));
  };

  if (paneScroll) {
    const onScrollThrottled = rafThrottle(() => {
      if (panelEl && !panelEl.hidden) {
        saveLookupState();
      }
    });
    paneScroll.addEventListener('scroll', onScrollThrottled, { passive: true });
  }

  results.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest('a')) {
      saveLookupState();
    }
  });

  const showPlaceholder = (message: string): void => {
    const box = document.createElement('div');
    box.className = 'pane-placeholder-box';
    const span = document.createElement('span');
    span.className = 'placeholder-text';
    span.textContent = message;
    box.appendChild(span);
    results.replaceChildren(box);
  };

  const renderSearchPage = async (query: string): Promise<void> => {
    const myToken = ++searchToken;
    const nativeIndex = await getNativeIndex();
    if (myToken !== searchToken) return;

    let pageData: SearchCandidate[];
    let totalCount: number;

    if (nativeIndex) {
      const sections = activeTags.size > 0 ? activeTags : null;
      const allResults = nativeSearchDocuments(query, nativeIndex, { sections });
      totalCount = allResults.length;
      if (totalCount === 0) {
        showPlaceholder(t('search.empty', '一致するノートが見つかりませんでした'));
        return;
      }

      const totalPages = Math.ceil(totalCount / SEARCH_PAGE_SIZE);
      searchPage = Math.min(Math.max(0, searchPage), Math.max(0, totalPages - 1));
      pageData = allResults.slice(
        searchPage * SEARCH_PAGE_SIZE,
        (searchPage + 1) * SEARCH_PAGE_SIZE
      );
    } else {
      const pf = await getPagefind();
      if (myToken !== searchToken) return;
      if (!pf) {
        showPlaceholder(t('search.loading', '検索インデックスを読み込み中...'));
        return;
      }

      const filters = activeTags.size > 0 ? { section: [...activeTags] } : undefined;
      const search = await pf.search(query || null, filters ? { filters } : undefined);
      if (myToken !== searchToken) return;
      const searchResultRefs = search?.results ?? [];
      totalCount = searchResultRefs.length;

      if (totalCount === 0) {
        showPlaceholder(t('search.empty', '一致するノートが見つかりませんでした'));
        return;
      }

      const totalPages = Math.ceil(totalCount / SEARCH_PAGE_SIZE);
      searchPage = Math.min(Math.max(0, searchPage), Math.max(0, totalPages - 1));
      const pageRefs = searchResultRefs.slice(
        searchPage * SEARCH_PAGE_SIZE,
        (searchPage + 1) * SEARCH_PAGE_SIZE
      );
      const hydrated = await Promise.all(pageRefs.map((r) => r.data()));
      if (myToken !== searchToken) return;
      pageData = hydrated.map((d) => normalizePagefindData(d));
    }

    const totalPages = Math.ceil(totalCount / SEARCH_PAGE_SIZE);
    const list = document.createElement('ul');
    list.className = 'book-index-items';
    pageData.forEach((d) => {
      const item = buildBookIndexItem(d);
      if (item) list.appendChild(item);
    });

    let pagination: HTMLDivElement | null = null;
    if (totalPages > 1) {
      pagination = document.createElement('div');
      pagination.className = 'lookup-pagination';

      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'lookup-page-btn';
      prevBtn.dataset.dir = '-1';
      prevBtn.disabled = searchPage === 0;
      prevBtn.textContent = t('search.prev', '◀ 前へ');

      const status = document.createElement('span');
      status.className = 'lookup-page-status';
      status.textContent = `${searchPage + 1} / ${totalPages}`;

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'lookup-page-btn';
      nextBtn.dataset.dir = '1';
      nextBtn.disabled = searchPage === totalPages - 1;
      nextBtn.textContent = t('search.next', '次へ ▶');

      pagination.append(prevBtn, status, nextBtn);
    }

    results.replaceChildren(list, ...(pagination ? [pagination] : []));

    results.querySelectorAll<HTMLButtonElement>('.lookup-page-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        searchPage += Number(btn.dataset.dir || '0');
        saveLookupState();
        void renderSearchPage(query);
      });
    });

    if (pendingScrollTop !== null && paneScroll) {
      const top = pendingScrollTop;
      pendingScrollTop = null;
      requestAnimationFrame(() => {
        paneScroll.scrollTop = top;
      });
    }
  };

  const render = (resetPage = true): void => {
    if (resetPage) searchPage = 0;
    saveLookupState();
    void renderSearchPage(input.value.trim());
  };

  let inputDebounceTimer: number | null = null;
  input.addEventListener('input', () => {
    if (inputDebounceTimer !== null) window.clearTimeout(inputDebounceTimer);
    inputDebounceTimer = window.setTimeout(() => render(true), 200);
  });

  input.addEventListener('search', () => {
    if (!input.value) {
      if (inputDebounceTimer !== null) window.clearTimeout(inputDebounceTimer);
      render(true);
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && input.value) {
      e.preventDefault();
      input.value = '';
      render(true);
    }
  });

  onPanelVisible(panelEl, () => {
    void loadManifest().then((manifest) => {
      const sections = manifest.sections ?? [];
      if (sections.length > 0) {
        tagsBox.hidden = false;
        const chips = sections.map((s) => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = activeTags.has(s.name)
            ? 'lookup-tag-chip is-active'
            : 'lookup-tag-chip';
          chip.dataset.tag = s.name;
          chip.textContent = s.name;
          return chip;
        });
        tagsBox.replaceChildren(...chips);
        tagsBox.addEventListener('click', (e) => {
          const target = e.target instanceof Element ? e.target : null;
          const chip = target?.closest<HTMLElement>('.lookup-tag-chip');
          const tag = chip?.dataset.tag;
          if (!chip || !tag) return;
          if (activeTags.has(tag)) {
            activeTags.delete(tag);
            chip.classList.remove('is-active');
          } else {
            activeTags.add(tag);
            chip.classList.add('is-active');
          }
          render(true);
        });
      }
      render(false);
    });
  });
}
