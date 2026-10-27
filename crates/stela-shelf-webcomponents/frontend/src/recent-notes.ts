/**
 * Visited note tracking and bookshelf-spine recent notes shelf (#pane-recent-section).
 */

import { storage } from './dom';
import { isHomePath, isInAppHref, normalizePath } from './env';

interface RecentNoteEntry {
  path: string;
  title: string;
}

let clickListenerBound = false;

export function markVisited(path: string | null | undefined): void {
  const p = normalizePath(path);
  if (!p || isHomePath(p)) return;
  try {
    const list = JSON.parse(storage.get('wiki-visited-notes') || '[]') as string[];
    const set = new Set(list);
    set.add(p);
    storage.set('wiki-visited-notes', JSON.stringify([...set]));
  } catch {
    // Ignore corrupted storage entries
  }
}

export function isVisited(path: string | null | undefined): boolean {
  const p = normalizePath(path);
  if (!p) return false;
  try {
    const list = JSON.parse(storage.get('wiki-visited-notes') || '[]') as string[];
    return list.includes(p);
  } catch {
    return false;
  }
}

export function syncVisitedClasses(): void {
  try {
    const list = JSON.parse(storage.get('wiki-visited-notes') || '[]') as string[];
    if (list.length === 0) return;
    const set = new Set(list);
    document
      .querySelectorAll<HTMLAnchorElement>('.book-index-link, .search-result-item')
      .forEach((a) => {
        const href = normalizePath(a.getAttribute('href'));
        if (href && set.has(href)) {
          a.classList.add('is-visited');
        }
      });
  } catch {
    // Ignore storage errors
  }

  if (!clickListenerBound) {
    clickListenerBound = true;
    document.addEventListener('click', (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const a = target?.closest('a');
      const href = a?.getAttribute('href');
      if (a && href && isInAppHref(href) && !isHomePath(href)) {
        markVisited(href);
        a.classList.add('is-visited');
      }
    });
  }
}

function spineHeightFor(title: string): number {
  const BASE_HEIGHT = 150;
  const VARIANCE = 5;
  const MIN_LEN = 4;
  const MAX_LEN = 18;
  const ratio = Math.min(1, Math.max(0, (title.length - MIN_LEN) / (MAX_LEN - MIN_LEN)));
  return Math.round(BASE_HEIGHT - VARIANCE + ratio * VARIANCE * 2);
}

export function updateRecentNotes(): void {
  const currentPath = normalizePath(window.location.pathname);
  const titleEl =
    document.querySelector('.content-title') ?? document.querySelector('.article-header h1');
  const currentTitle = titleEl?.textContent?.trim() || document.title.replace(/\s*\|.*$/, '');

  if (!currentPath || !currentTitle || isHomePath(currentPath)) return;

  markVisited(currentPath);

  let recents: RecentNoteEntry[] = [];
  try {
    const raw = JSON.parse(storage.get('wiki-recent-notes') || '[]') as RecentNoteEntry[];
    if (Array.isArray(raw)) recents = raw;
  } catch {
    recents = [];
  }

  recents = recents
    .filter((r) => r && typeof r.path === 'string' && typeof r.title === 'string')
    .map((r) => ({ path: normalizePath(r.path), title: r.title }))
    .filter((r) => r.path && r.path !== currentPath);

  recents.unshift({ path: currentPath, title: currentTitle });
  if (recents.length > 8) recents = recents.slice(0, 8);

  storage.set('wiki-recent-notes', JSON.stringify(recents));

  const recentSection = document.getElementById('pane-recent-section');
  const recentList = document.getElementById('pane-recent-list');
  const itemTemplate = document.getElementById(
    'recent-note-item-template'
  ) as HTMLTemplateElement | null;

  if (recentSection && recentList && itemTemplate && recents.length > 0) {
    const CURRENT_HEIGHT_BONUS = 20;
    const items = recents
      .map((r) => {
        const isCurrent = r.path === currentPath;
        const height = spineHeightFor(r.title) + (isCurrent ? CURRENT_HEIGHT_BONUS : 0);
        const li = itemTemplate.content.firstElementChild?.cloneNode(true) as HTMLElement | null;
        if (!li) return null;
        const link = li.querySelector<HTMLAnchorElement>('.recent-link');
        if (link) {
          link.href = r.path;
          link.classList.toggle('is-current', isCurrent);
          link.style.height = `${height}px`;
          const title = link.querySelector('.recent-title');
          if (title) title.textContent = r.title;
        }
        return li;
      })
      .filter((el): el is HTMLElement => el !== null);

    recentList.replaceChildren(...items);
    recentSection.hidden = false;
  }
}
