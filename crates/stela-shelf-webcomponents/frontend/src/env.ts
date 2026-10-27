/**
 * Runtime environment, URL normalization, base-path resolution, and i18n lookup.
 */

declare global {
  interface Window {
    tmtBasePath?: string;
    tmtUrlPrefix?: string;
    tmtFullUrlPrefix?: string;
    tmtHomeUrl?: string;
    tmtPageUrl?: string;
    tmtStrings?: Record<string, string>;
  }
}

export function t(key: string, fallback = ''): string {
  return window.tmtStrings?.[key] ?? fallback;
}

export function getBasePath(): string {
  return (window.tmtBasePath ?? '').replace(/\/+$/, '');
}

export function withBasePath(path: string): string {
  const base = getBasePath();
  if (!path) return base || '/';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}

export function getFullUrlPrefix(): string {
  return window.tmtFullUrlPrefix ?? window.tmtUrlPrefix ?? '';
}

export function getHomeUrl(): string {
  if (window.tmtHomeUrl) return window.tmtHomeUrl;
  const prefix = getFullUrlPrefix();
  if (prefix) return prefix;
  const base = getBasePath();
  return base ? `${base}/` : '/';
}

export function getPageUrl(): string {
  return window.tmtPageUrl ?? normalizePath(window.location.pathname);
}

export function setPageUrl(url: string): void {
  window.tmtPageUrl = url;
}

/**
 * Strips `#hash`, `/index.html`, and trailing slashes (except root `/`) so
 * every internal URL compares and deduplicates canonically.
 */
export function normalizePath(urlOrPath: string | null | undefined): string {
  if (!urlOrPath) return '';
  let pathname = urlOrPath;
  try {
    if (
      urlOrPath.startsWith('http://') ||
      urlOrPath.startsWith('https://') ||
      urlOrPath.startsWith('/')
    ) {
      pathname = new URL(urlOrPath, window.location.origin).pathname;
    } else {
      pathname = urlOrPath.split('#')[0].split('?')[0];
    }
  } catch {
    pathname = urlOrPath.split('#')[0].split('?')[0];
  }
  return pathname.replace(/\/index\.html$/i, '').replace(/(.)\/+$/, '$1');
}

export function isHomePath(urlOrPath: string | null | undefined): boolean {
  const norm = normalizePath(urlOrPath);
  if (!norm || norm === '/') return true;
  const homeNorm = normalizePath(getHomeUrl());
  const baseNorm = normalizePath(getBasePath());
  return norm === homeNorm || (Boolean(baseNorm) && norm === baseNorm);
}

const STATIC_EXT_RE = /\.(?:css|js|mjs|json|svg|png|jpe?g|webp|gif|avif|ico|pdf|xml|txt|woff2?)$/i;

/**
 * Returns true if `href` points to an internal page within this vault
 * (eligible for PJAX navigation and visited-note tracking).
 */
export function isInAppHref(href: string | null | undefined): boolean {
  if (!href) return false;
  if (
    href.startsWith('#') ||
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('//') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('javascript:') ||
    href.startsWith('vscode://') ||
    href.startsWith('cursor://')
  ) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(href, window.location.href);
  } catch {
    return false;
  }

  if (parsed.origin !== window.location.origin) return false;
  if (STATIC_EXT_RE.test(parsed.pathname)) return false;

  const base = getBasePath();
  const relFromBase =
    base && parsed.pathname.startsWith(base)
      ? parsed.pathname.slice(base.length) || '/'
      : parsed.pathname;

  if (
    relFromBase.startsWith('/__shelf/') ||
    relFromBase.startsWith('/icons/') ||
    relFromBase.startsWith('/components/') ||
    relFromBase.startsWith('/lookup/') ||
    relFromBase.startsWith('/pagefind/') ||
    relFromBase === '/live-reload'
  ) {
    return false;
  }

  const prefix = getFullUrlPrefix();
  if (!prefix) {
    return !base || parsed.pathname === base || parsed.pathname.startsWith(`${base}/`);
  }
  return parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`);
}
