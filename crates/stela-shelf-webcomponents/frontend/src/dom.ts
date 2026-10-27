/**
 * Shared DOM, storage, hash, scroll-spy, clipboard, and document-cache utilities.
 */

import { normalizePath } from './env';

export interface TmtStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export const storage: TmtStorage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore Safari private browsing / storage quota errors
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  },
};

export const session: TmtStorage = {
  get(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Ignore storage errors
    }
  },
  remove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  },
};

/**
 * Hydrates Declarative Shadow DOM (`<template shadowrootmode>`) when elements
 * are inserted via `.innerHTML` during PJAX or live-reload swaps.
 */
export function ensureShadowRoot(el: HTMLElement): void {
  if (el.shadowRoot) return;
  const tpl = el.querySelector<HTMLTemplateElement>(':scope > template[shadowrootmode]');
  if (!tpl) return;
  const mode = tpl.getAttribute('shadowrootmode') === 'closed' ? 'closed' : 'open';
  const shadow = el.attachShadow({ mode });
  shadow.appendChild(tpl.content.cloneNode(true));
  tpl.remove();
}

export interface ThrottledFn<T extends (...args: never[]) => void> {
  (...args: Parameters<T>): void;
  cancel(): void;
}

export function rafThrottle<T extends (...args: never[]) => void>(fn: T): ThrottledFn<T> {
  let frame: number | null = null;
  const throttled = ((...args: Parameters<T>) => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      fn(...args);
    });
  }) as ThrottledFn<T>;

  throttled.cancel = () => {
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };
  return throttled;
}

export function readHash(): string {
  const raw = (window.location.hash || '').slice(1);
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function syncHeadingHash(id: string): void {
  if (!id || readHash() === id) return;
  try {
    history.replaceState(null, '', `#${encodeURIComponent(id)}`);
  } catch {
    // Ignore file:// or sandboxed iframe history restrictions
  }
}

/**
 * Computes exact scroll offset for `target` within `container` using
 * `getBoundingClientRect()`, avoiding `offsetTop` bugs caused by intermediate
 * positioned ancestors.
 */
export function computeScrollOffset(
  container: HTMLElement | Window,
  target: Element,
  padding = 16
): number {
  if (container === window || container === document.documentElement) {
    return Math.max(0, target.getBoundingClientRect().top + window.scrollY - padding);
  }
  const el = container as HTMLElement;
  const delta = target.getBoundingClientRect().top - el.getBoundingClientRect().top;
  return Math.max(0, el.scrollTop + delta - padding);
}

/**
 * Finds a heading element by `id` scoped to the currently active view
 * (`#wiki-classic-view` vs `#wiki-book-view`), preventing duplicate IDs in the
 * hidden view from returning `0` bounding coordinates.
 */
export function findHeadingInView(id: string, classicMode?: boolean): HTMLElement | null {
  if (!id) return null;
  const isClassic =
    classicMode ?? document.documentElement.getAttribute('data-view') === 'classic';
  const root = document.getElementById(isClassic ? 'wiki-classic-view' : 'wiki-book-view');
  if (root) {
    try {
      const scoped = root.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`);
      if (scoped) return scoped;
    } catch {
      // Fall back to document.getElementById
    }
  }
  return document.getElementById(id);
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

const docCache = new Map<string, Document>();

export async function fetchDocument(url: string | null | undefined): Promise<Document | null> {
  if (!url) return null;
  const cleanUrl = url.split('#')[0];
  const key = normalizePath(cleanUrl) || cleanUrl;
  const cached = docCache.get(key);
  if (cached) return cached;

  try {
    const res = await fetch(cleanUrl);
    if (!res.ok) return null;
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    docCache.set(key, doc);
    return doc;
  } catch {
    return null;
  }
}

export function invalidateDocumentCache(url?: string): void {
  if (!url) {
    docCache.clear();
    return;
  }
  const key = normalizePath(url);
  if (key) docCache.delete(key);
}

export interface HeadingTarget {
  id: string;
  el: HTMLElement;
  link: HTMLElement | null;
}

export interface ScrollSpyOptions {
  container: HTMLElement | Window;
  headingTargets: HeadingTarget[];
  tocLinks?: HTMLElement[];
  headingLine?: number;
  isActiveView?: () => boolean;
  onActiveChange?: (currentId: string, active?: HeadingTarget) => void;
  onScroll?: () => void;
}

export interface ScrollSpyInstance {
  update(): void;
  currentHeadingId(): string | null;
  markClickScrolling(duration?: number): void;
  destroy(): void;
}

const activeScrollHandlers = new WeakMap<EventTarget, EventListener>();

export function createScrollSpy({
  container,
  headingTargets,
  tocLinks = [],
  headingLine = 80,
  isActiveView = () => true,
  onActiveChange,
  onScroll: onScrollCallback,
}: ScrollSpyOptions): ScrollSpyInstance {
  let headingCursor = 0;
  let isClickScrolling = false;
  let clickTimer: number | null = null;

  const scrollTarget: EventTarget = container !== window ? container : window;

  const markClickScrolling = (duration = 800): void => {
    isClickScrolling = true;
    if (clickTimer !== null) window.clearTimeout(clickTimer);
    clickTimer = window.setTimeout(() => {
      isClickScrolling = false;
      clickTimer = null;
    }, duration);
  };

  const currentHeadingId = (): string | null => {
    const n = headingTargets.length;
    if (n === 0) return null;

    const containerTop =
      container !== window ? (container as HTMLElement).getBoundingClientRect().top : 0;
    const line = containerTop + headingLine;

    if (headingCursor >= n) headingCursor = n - 1;

    while (
      headingCursor > 0 &&
      headingTargets[headingCursor].el.getBoundingClientRect().top > line
    ) {
      headingCursor--;
    }
    while (
      headingCursor < n - 1 &&
      headingTargets[headingCursor + 1].el.getBoundingClientRect().top <= line
    ) {
      headingCursor++;
    }

    return headingTargets[headingCursor].id;
  };

  const update = (): void => {
    if (!isActiveView() || isClickScrolling) return;

    const currentId = currentHeadingId();
    if (!currentId) return;

    const active = headingTargets.find((item) => item.id === currentId);
    if (active?.link && !active.link.classList.contains('is-active')) {
      tocLinks.forEach((l) => l.classList.remove('is-active'));
      active.link.classList.add('is-active');
      active.link.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    onActiveChange?.(currentId, active);
  };

  const throttledUpdate = rafThrottle(() => {
    if (!isActiveView()) return;
    onScrollCallback?.();
    update();
  });

  const prevHandler = activeScrollHandlers.get(scrollTarget);
  if (prevHandler) {
    scrollTarget.removeEventListener('scroll', prevHandler);
  }
  const listener: EventListener = () => throttledUpdate();
  activeScrollHandlers.set(scrollTarget, listener);
  scrollTarget.addEventListener('scroll', listener, { passive: true });

  return {
    update,
    currentHeadingId,
    markClickScrolling,
    destroy: () => {
      throttledUpdate.cancel();
      if (activeScrollHandlers.get(scrollTarget) === listener) {
        scrollTarget.removeEventListener('scroll', listener);
        activeScrollHandlers.delete(scrollTarget);
      }
      if (clickTimer !== null) {
        window.clearTimeout(clickTimer);
        clickTimer = null;
      }
    },
  };
}
