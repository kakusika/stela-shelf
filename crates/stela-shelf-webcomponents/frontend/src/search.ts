/**
 * Client-side search engine for WebComponents UI:
 * Native `search-index.json` primary engine with `Intl.Segmenter` tokenization,
 * 4-tier boost ranking, lazy `<mark>` excerpt highlighting, and Pagefind fallback.
 */

import { isEditableTarget } from './dom';
import { getFullUrlPrefix, t, withBasePath } from './env';

export interface NativeSearchDocument {
  id: number;
  slug: string;
  title: string;
  url: string;
  path: string;
  aliases?: string[];
  kind?: string;
  section?: string;
  image?: string;
  headings?: string[];
  text: string;
}

export interface NativeSearchIndex {
  docs: NativeSearchDocument[];
}

export interface SearchCandidate {
  url: string;
  rawScore: number;
  boost?: number;
  excerpt?: string;
  meta?: {
    title?: string;
    path?: string;
    aliases?: string;
    image?: string;
  };
  filters?: {
    kind?: string;
    section?: string;
  };
}

interface PagefindResultData {
  url: string;
  excerpt?: string;
  meta?: {
    title?: string;
    path?: string;
    aliases?: string;
    image?: string;
  };
  filters?: {
    kind?: string | string[];
    section?: string | string[];
  };
}

export interface PagefindResultRef {
  score: number;
  data(): Promise<PagefindResultData>;
}

export interface PagefindModule {
  options(opts: Record<string, unknown>): Promise<void>;
  init(): Promise<void>;
  search(
    query: string | null,
    opts?: { filters?: Record<string, string[]> }
  ): Promise<{ results: PagefindResultRef[] } | null>;
}

interface SegmenterLike {
  segment(input: string): Iterable<{ segment: string; isWordLike?: boolean }>;
}

interface CompiledQuery {
  qStrict: string;
  qFuzzy: string;
  wordPattern: RegExp | null;
}

interface CachedDocTarget {
  tStrict: string;
  tFuzzy: string;
  weight: number;
}

interface CachedSearchDocument extends NativeSearchDocument {
  _metaHaystack?: string;
  _textLower?: string;
  _fullHaystack?: string;
  _targets?: CachedDocTarget[];
}

let pagefindInstance: PagefindModule | null = null;
let nativeIndexPromise: Promise<NativeSearchIndex | null> | null = null;
let searchShortcutBound = false;
let searchOutsideClickBound = false;

export function invalidateSearchCache(): void {
  nativeIndexPromise = null;
}

export async function getPagefind(): Promise<PagefindModule | null> {
  if (!pagefindInstance) {
    try {
      const pagefindUrl = withBasePath('/pagefind/pagefind.js');
      const pf = (await import(pagefindUrl)) as PagefindModule;
      await pf.options({ ranking: { pageLength: 0.1 } });
      await pf.init();
      pagefindInstance = pf;
    } catch {
      return null;
    }
  }
  return pagefindInstance;
}

export async function getNativeIndex(): Promise<NativeSearchIndex | null> {
  if (!nativeIndexPromise) {
    nativeIndexPromise = fetch(withBasePath('/search-index.json'))
      .then((res) => (res.ok ? (res.json() as Promise<NativeSearchIndex>) : null))
      .catch(() => null);
  }
  return nativeIndexPromise;
}

function tokenizeQuery(query: string): string[] {
  const q = query.trim();
  if (!q) return [];

  const SegmenterCtor = (
    Intl as unknown as {
      Segmenter?: new (locales?: string, options?: { granularity: string }) => SegmenterLike;
    }
  ).Segmenter;

  if (typeof SegmenterCtor === 'function') {
    const segmenter = new SegmenterCtor(undefined, { granularity: 'word' });
    const tokens: string[] = [];
    for (const { segment, isWordLike } of segmenter.segment(q)) {
      if (isWordLike) tokens.push(segment.toLowerCase());
    }
    if (tokens.length > 0) return tokens;
  }

  return q
    .toLowerCase()
    .split(/[\s、,，.。]+/)
    .filter(Boolean);
}

function normalizeStrict(s: string): string {
  return (s || '').toLowerCase().trim();
}

function normalizeFuzzy(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[@#\-_/\\.()[\]{}:;,+*~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compileQuery(query: string): CompiledQuery {
  const qStrict = normalizeStrict(query);
  const qFuzzy = normalizeFuzzy(query);
  let wordPattern: RegExp | null = null;
  if (qFuzzy) {
    const escaped = qFuzzy.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    wordPattern = new RegExp(`(^|\\s)${escaped}($|\\s)`);
  }
  return { qStrict, qFuzzy, wordPattern };
}

function scoreTargets(
  compiled: CompiledQuery,
  targets: CachedDocTarget[]
): number {
  if (!compiled.qStrict) return 0;
  let maxBoost = 0;

  for (const { tStrict, tFuzzy, weight } of targets) {
    if (tStrict === compiled.qStrict || (compiled.qFuzzy && tFuzzy === compiled.qFuzzy)) {
      maxBoost = Math.max(maxBoost, 100000 * weight);
      continue;
    }
    if (
      tStrict.startsWith(compiled.qStrict) ||
      (compiled.qFuzzy && tFuzzy.startsWith(compiled.qFuzzy))
    ) {
      maxBoost = Math.max(maxBoost, 50000 * weight);
      continue;
    }
    if (compiled.wordPattern && compiled.wordPattern.test(tFuzzy)) {
      maxBoost = Math.max(maxBoost, 20000 * weight);
      continue;
    }
    if (
      tStrict.includes(compiled.qStrict) ||
      (compiled.qFuzzy && tFuzzy.includes(compiled.qFuzzy))
    ) {
      maxBoost = Math.max(maxBoost, 10000 * weight);
    }
  }

  return maxBoost;
}

function calculateCandidateBoost(
  query: string,
  item: SearchCandidate,
  compiled?: CompiledQuery
): number {
  const q = compiled ?? compileQuery(query);
  if (!q.qStrict) return 0;

  const title = item.meta?.title ?? '';
  const path = item.meta?.path ?? '';
  const filename = path ? path.split('/').pop()?.replace(/\.tmt$/, '') ?? '' : '';
  const urlStem = (item.url || '').replace(/\/+$/, '').split('/').pop() ?? '';
  const rawAliases = item.meta?.aliases
    ? item.meta.aliases
        .split(/[,、]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const targets: CachedDocTarget[] = [
    { text: title, weight: 1.0 },
    { text: filename, weight: 1.0 },
    { text: urlStem, weight: 0.9 },
    { text: path, weight: 0.8 },
    ...rawAliases.map((a) => ({ text: a, weight: 0.98 })),
  ]
    .filter((entry) => Boolean(entry.text))
    .map((entry) => ({
      tStrict: normalizeStrict(entry.text),
      tFuzzy: normalizeFuzzy(entry.text),
      weight: entry.weight,
    }));

  return scoreTargets(q, targets);
}

function getDocTargets(doc: CachedSearchDocument): CachedDocTarget[] {
  if (doc._targets) return doc._targets;

  const title = doc.title || '';
  const path = doc.path || '';
  const filename = path ? path.split('/').pop()?.replace(/\.tmt$/, '') ?? '' : '';
  const urlStem = (doc.url || '').replace(/\/+$/, '').split('/').pop() ?? '';
  const rawAliases = doc.aliases ?? [];

  doc._targets = [
    { text: title, weight: 1.0 },
    { text: filename, weight: 1.0 },
    { text: urlStem, weight: 0.9 },
    { text: path, weight: 0.8 },
    ...rawAliases.map((a) => ({ text: a, weight: 0.98 })),
  ]
    .filter((entry) => Boolean(entry.text))
    .map((entry) => ({
      tStrict: normalizeStrict(entry.text),
      tFuzzy: normalizeFuzzy(entry.text),
      weight: entry.weight,
    }));

  return doc._targets;
}

function getDocHaystack(doc: CachedSearchDocument, includeFullText: boolean): string {
  if (doc._metaHaystack === undefined) {
    doc._metaHaystack = [doc.title, ...(doc.aliases ?? []), ...(doc.headings ?? []), doc.path]
      .join(' ')
      .toLowerCase();
  }
  if (!includeFullText) return doc._metaHaystack;

  if (doc._fullHaystack === undefined) {
    if (doc._textLower === undefined) {
      doc._textLower = (doc.text || '').toLowerCase();
    }
    doc._fullHaystack = `${doc._metaHaystack} ${doc._textLower}`;
  }
  return doc._fullHaystack;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHighlightedExcerpt(text: string, tokens: string[], maxLen = 160): string {
  if (!text) return '';
  const lowerText = text.toLowerCase();

  let matchIndex = -1;
  for (const tok of tokens) {
    const idx = lowerText.indexOf(tok);
    if (idx !== -1 && (matchIndex === -1 || idx < matchIndex)) matchIndex = idx;
  }

  const anchor = matchIndex === -1 ? 0 : matchIndex;
  const start = Math.max(0, anchor - Math.floor(maxLen / 3));
  const end = Math.min(text.length, start + maxLen);
  const slice = text.slice(start, end);

  const uniqueTokens = Array.from(new Set(tokens.filter(Boolean))).sort(
    (a, b) => b.length - a.length
  );
  let highlighted = escapeHtml(slice);
  if (uniqueTokens.length > 0) {
    const pattern = uniqueTokens
      .map((tok) => tok.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
      .join('|');
    const re = new RegExp(`(${pattern})`, 'gi');
    highlighted = highlighted.replace(re, '<mark>$1</mark>');
  }

  return `${start > 0 ? '…' : ''}${highlighted}${end < text.length ? '…' : ''}`;
}

function toSearchCandidate(
  doc: NativeSearchDocument,
  rawScore: number,
  excerpt?: string
): SearchCandidate {
  return {
    url: doc.url,
    rawScore,
    excerpt,
    meta: {
      title: doc.title,
      path: doc.path,
      aliases: (doc.aliases ?? []).join(', '),
      image: doc.image,
    },
    filters: {
      kind: doc.kind,
      section: doc.section,
    },
  };
}

function toLazySearchCandidate(
  doc: CachedSearchDocument,
  boost: number,
  rawScore: number,
  tokens: string[]
): SearchCandidate {
  let cachedExcerpt: string | undefined;
  let excerptComputed = false;

  return {
    url: doc.url,
    boost,
    rawScore,
    meta: {
      title: doc.title,
      path: doc.path,
      aliases: (doc.aliases ?? []).join(', '),
      image: doc.image,
    },
    filters: {
      kind: doc.kind,
      section: doc.section,
    },
    get excerpt(): string | undefined {
      if (!excerptComputed) {
        excerptComputed = true;
        cachedExcerpt = doc.text ? buildHighlightedExcerpt(doc.text, tokens) : '';
      }
      return cachedExcerpt;
    },
    set excerpt(val: string | undefined) {
      cachedExcerpt = val;
      excerptComputed = true;
    },
  };
}

export function normalizePagefindData(data: PagefindResultData, rawScore = 0): SearchCandidate {
  const firstStr = (val?: string | string[]): string | undefined =>
    Array.isArray(val) ? val[0] : val;
  return {
    url: data.url,
    rawScore,
    excerpt: data.excerpt,
    meta: data.meta,
    filters: data.filters
      ? {
          kind: firstStr(data.filters.kind),
          section: firstStr(data.filters.section),
        }
      : undefined,
  };
}

export function nativeSearchDocuments(
  query: string,
  index: NativeSearchIndex,
  opts: { sections?: Set<string> | null } = {}
): SearchCandidate[] {
  const sections = opts.sections;
  const docs =
    sections && sections.size > 0
      ? index.docs.filter((d) => d.section && sections.has(d.section))
      : index.docs;

  const trimmedQuery = query.trim();
  const tokens = tokenizeQuery(trimmedQuery);
  if (tokens.length === 0) {
    return docs.map((doc) => toSearchCandidate(doc, 0));
  }

  const searchFullText = trimmedQuery.length >= 2;
  const compiled = compileQuery(trimmedQuery);
  const sortedTokens = [...tokens].sort((a, b) => b.length - a.length);

  const matches: SearchCandidate[] = [];
  for (const rawDoc of docs) {
    const doc = rawDoc as CachedSearchDocument;
    const haystack = getDocHaystack(doc, searchFullText);

    let allMatch = true;
    for (const tok of sortedTokens) {
      if (!haystack.includes(tok)) {
        allMatch = false;
        break;
      }
    }
    if (!allMatch) continue;

    const boost = scoreTargets(compiled, getDocTargets(doc));

    let textScore = 0;
    if (searchFullText && doc.text) {
      if (doc._textLower === undefined) {
        doc._textLower = doc.text.toLowerCase();
      }
      const textLower = doc._textLower;
      for (const tok of tokens) {
        let from = 0;
        for (;;) {
          const idx = textLower.indexOf(tok, from);
          if (idx === -1) break;
          textScore += 1;
          from = idx + tok.length;
        }
      }
    }

    matches.push(toLazySearchCandidate(doc, boost, textScore, tokens));
  }

  matches.sort((a, b) => {
    const boostDiff = (b.boost ?? 0) - (a.boost ?? 0);
    if (boostDiff !== 0) return boostDiff;
    return b.rawScore - a.rawScore;
  });

  return matches;
}

export function setupSearch(): void {
  const input = document.getElementById('wiki-search-input') as HTMLInputElement | null;
  const resultsContainer = document.getElementById('wiki-search-results');

  if (!searchShortcutBound) {
    searchShortcutBound = true;
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('wiki-search-input') as HTMLInputElement | null;
        searchInput?.focus();
        searchInput?.select();
      } else if (e.key === '/' && !isEditableTarget(e.target)) {
        e.preventDefault();
        const searchInput = document.getElementById('wiki-search-input') as HTMLInputElement | null;
        searchInput?.focus();
        searchInput?.select();
      }
    });
  }

  if (!input || !resultsContainer) return;
  if (input.dataset.searchInitialized === 'true') return;
  input.dataset.searchInitialized = 'true';

  let searchDebounceTimer: number | null = null;
  let selectedIndex = -1;

  const adjustPosition = (): void => {
    if (window.innerWidth <= 768) {
      resultsContainer.style.left = '';
      return;
    }
    resultsContainer.style.left = '0';
    const rect = resultsContainer.getBoundingClientRect();
    const maxRight = window.innerWidth - 10;
    if (rect.right > maxRight) {
      resultsContainer.style.left = `-${rect.right - maxRight}px`;
    }
  };

  const showResults = (): void => {
    resultsContainer.hidden = false;
    adjustPosition();
  };

  window.addEventListener('resize', () => {
    if (!resultsContainer.hidden) adjustPosition();
  });

  const showStatus = (message: string): void => {
    const status = document.createElement('div');
    status.className = 'search-status';
    status.textContent = message;
    resultsContainer.replaceChildren(status);
  };

  const renderResults = (results: SearchCandidate[]): void => {
    const itemTemplate = document.getElementById(
      'search-result-item-template'
    ) as HTMLTemplateElement | null;
    if (!itemTemplate) return;

    const prefix = getFullUrlPrefix();
    const cleanPrefixRegex = prefix
      ? new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?`)
      : /^\/+/;

    const items = results
      .map((res, idx) => {
        const item = itemTemplate.content.firstElementChild?.cloneNode(
          true
        ) as HTMLAnchorElement | null;
        if (!item) return null;

        item.href = res.url;
        item.dataset.index = String(idx);

        const thumb = item.querySelector<HTMLImageElement>('.search-result-thumb');
        if (res.meta?.image && thumb) {
          thumb.src = res.meta.image;
          thumb.hidden = false;
          thumb.addEventListener('error', () => thumb.remove(), { once: true });
        } else {
          thumb?.remove();
        }

        const titleText = item.querySelector('.result-title-text');
        if (titleText) titleText.textContent = res.meta?.title || 'No title';

        const kind = item.querySelector<HTMLElement>('.search-result-kind');
        if (res.filters?.kind && kind) {
          kind.textContent = res.filters.kind;
          kind.hidden = false;
        } else {
          kind?.remove();
        }

        const section = item.querySelector<HTMLElement>('.search-result-section');
        if (res.filters?.section && section) {
          section.textContent = res.filters.section;
          section.hidden = false;
        } else {
          section?.remove();
        }

        const pathEl = item.querySelector<HTMLElement>('.search-result-path');
        const displayPath =
          res.meta?.path ||
          (res.url ? res.url.replace(cleanPrefixRegex, '').replace(/\/+$/, '') : '');
        if (displayPath && pathEl) {
          pathEl.textContent = displayPath;
          pathEl.hidden = false;
        } else {
          pathEl?.remove();
        }

        const aliases = item.querySelector<HTMLElement>('.search-result-aliases');
        if (res.meta?.aliases && aliases) {
          const label = aliases.querySelector('.alias-label');
          const text = aliases.querySelector('.alias-text');
          if (label) label.textContent = t('search.aliases', '別名:');
          if (text) text.textContent = res.meta.aliases;
          aliases.hidden = false;
        } else {
          aliases?.remove();
        }

        const excerpt = item.querySelector<HTMLElement>('.search-result-excerpt');
        if (res.excerpt && excerpt) {
          const cleanExcerptText = res.excerpt.replace(/<[^>]+>/g, '').trim();
          const cleanPath = displayPath.trim();
          if (
            cleanExcerptText &&
            cleanPath &&
            (cleanExcerptText === cleanPath || cleanExcerptText.startsWith(cleanPath))
          ) {
            excerpt.remove();
          } else {
            excerpt.innerHTML = res.excerpt;
            excerpt.hidden = false;
          }
        } else {
          excerpt?.remove();
        }

        return item;
      })
      .filter((el): el is HTMLAnchorElement => el !== null);

    resultsContainer.replaceChildren(...items);
  };

  input.addEventListener('focus', () => {
    void getNativeIndex();
    if (input.value.trim().length > 0 && resultsContainer.children.length > 0) {
      showResults();
    }
  });

  input.addEventListener('input', () => {
    if (searchDebounceTimer !== null) window.clearTimeout(searchDebounceTimer);
    const query = input.value.trim();
    if (!query) {
      resultsContainer.replaceChildren();
      resultsContainer.hidden = true;
      selectedIndex = -1;
      return;
    }

    searchDebounceTimer = window.setTimeout(async () => {
      const nativeIndex = await getNativeIndex();
      if (nativeIndex) {
        const topResults = nativeSearchDocuments(query, nativeIndex).slice(0, 10);
        selectedIndex = -1;
        if (topResults.length === 0) {
          showStatus(t('search.empty', '一致するノートが見つかりませんでした'));
          showResults();
          return;
        }
        renderResults(topResults);
        showResults();
        return;
      }

      const pf = await getPagefind();
      if (!pf) {
        showStatus(t('search.loading', '検索インデックスを読み込み中...'));
        showResults();
        return;
      }

      const search = await pf.search(query);
      if (!search || search.results.length === 0) {
        showStatus(t('search.empty', '一致するノートが見つかりませんでした'));
        showResults();
        selectedIndex = -1;
        return;
      }

      const candidateCount = Math.min(search.results.length, 30);
      const candidates = await Promise.all(
        search.results.slice(0, candidateCount).map(async (r) => {
          const data = await r.data();
          return normalizePagefindData(data, r.score);
        })
      );

      const compiled = compileQuery(query);
      for (const candidate of candidates) {
        candidate.boost = calculateCandidateBoost(query, candidate, compiled);
      }

      candidates.sort((a, b) => {
        const boostDiff = (b.boost ?? 0) - (a.boost ?? 0);
        if (boostDiff !== 0) return boostDiff;
        return b.rawScore - a.rawScore;
      });

      selectedIndex = -1;
      renderResults(candidates.slice(0, 10));
      showResults();
    }, 180);
  });

  const updateSelected = (items: NodeListOf<HTMLAnchorElement>): void => {
    items.forEach((item, idx) => {
      if (idx === selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  };

  input.addEventListener('keydown', (e) => {
    const items = resultsContainer.querySelectorAll<HTMLAnchorElement>('.search-result-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length > 0) {
        selectedIndex = (selectedIndex + 1) % items.length;
        updateSelected(items);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length > 0) {
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        updateSelected(items);
      }
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && items[selectedIndex]) {
        e.preventDefault();
        items[selectedIndex].click();
      } else if (items.length > 0) {
        e.preventDefault();
        items[0].click();
      }
    } else if (e.key === 'Escape') {
      resultsContainer.hidden = true;
      input.blur();
    }
  });

  resultsContainer.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest('a')) {
      resultsContainer.hidden = true;
      input.blur();
    }
  });

  if (!searchOutsideClickBound) {
    searchOutsideClickBound = true;
    document.addEventListener('click', (e) => {
      const searchInput = document.getElementById('wiki-search-input');
      const box = document.getElementById('wiki-search-results');
      const targetNode = e.target instanceof Node ? e.target : null;
      if (box && searchInput && !searchInput.contains(targetNode) && !box.contains(targetNode)) {
        box.hidden = true;
      }
    });
  }
}
