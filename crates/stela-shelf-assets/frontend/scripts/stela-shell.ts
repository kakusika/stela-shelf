/**
 * Stela Shelf Core Client Script
 *
 * Shared book-shell runtime for HTMX, Leptos, Svelte, and SolidJS variants:
 * - Theme & shell contrast switching with localStorage persistence
 * - Sticky Tabs (付箋ヘッダー) scroll-spy, smooth heading jumps, edge buttons, and wheel glide
 * - Navigation pane (#pane-nav) desktop collapse & mobile drawer controller
 * - Code-block copy button handler (.code-copy-btn)
 * - Seamless HTMX partial swap re-initialization (htmx:afterSwap)
 * - Non-conflicting keyboard shortcuts (t: theme, /: search when no island, Esc: mobile drawer)
 */

export {};

declare global {
  interface Window {
    __STELA_SHELL_INITIALIZED__?: boolean;
    tmtBasePath?: string;
  }
}

(() => {
  if (typeof window === 'undefined' || window.__STELA_SHELL_INITIALIZED__) return;
  window.__STELA_SHELL_INITIALIZED__ = true;

  document.documentElement.classList.remove('no-js');

  function storageGet(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function storageSet(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage quota / privacy mode errors
    }
  }

  // ===========================================================================
  // 1. Theme & Shell Contrast Controller
  // ===========================================================================

  function getSystemTheme(): 'dark' | 'light' {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getEffectiveTheme(): 'dark' | 'light' {
    const forced = document.documentElement.getAttribute('data-theme');
    if (forced === 'dark' || forced === 'light') return forced;
    const stored = storageGet('shelf-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return getSystemTheme();
  }

  function updateThemeUI(theme: 'dark' | 'light'): void {
    const isDark = theme === 'dark';
    const label = isDark ? 'ライトモードに切替 (t)' : 'ダークモードに切替 (t)';
    document.querySelectorAll<HTMLElement>('.theme-toggle-btn, #btn-rail-theme').forEach((btn) => {
      btn.setAttribute('aria-label', label);
      btn.title = label;
    });
  }

  function applyTheme(theme: 'dark' | 'light', persist = true): void {
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) storageSet('shelf-theme', theme);
    updateThemeUI(theme);
  }

  function toggleTheme(): void {
    applyTheme(getEffectiveTheme() === 'dark' ? 'light' : 'dark', true);
  }

  function getEffectiveContrast(): 'normal' | 'high' {
    if (document.documentElement.getAttribute('data-shell-contrast') === 'high') return 'high';
    return storageGet('shelf-shell-contrast') === 'high' ? 'high' : 'normal';
  }

  function applyContrast(contrast: 'normal' | 'high', persist = true): void {
    if (contrast === 'high') {
      document.documentElement.setAttribute('data-shell-contrast', 'high');
    } else {
      document.documentElement.removeAttribute('data-shell-contrast');
    }
    if (persist) storageSet('shelf-shell-contrast', contrast);
  }

  function toggleContrast(): void {
    applyContrast(getEffectiveContrast() === 'high' ? 'normal' : 'high', true);
  }

  function initTheme(): void {
    const theme = getEffectiveTheme();
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeUI(theme);

    if (getEffectiveContrast() === 'high') {
      document.documentElement.setAttribute('data-shell-contrast', 'high');
    }

    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!storageGet('shelf-theme')) {
        applyTheme(e.matches ? 'dark' : 'light', false);
      }
    });
  }

  // ===========================================================================
  // 2. Navigation Pane (#pane-nav) & Mobile Drawer Controller
  // ===========================================================================

  function syncNavPaneState(collapsed: boolean, persist = true): void {
    const pane = document.getElementById('pane-nav');
    if (!pane) return;

    pane.classList.toggle('is-collapsed', collapsed);

    const backdrop = document.getElementById('pane-nav-backdrop');
    backdrop?.classList.toggle('is-active', !collapsed);

    const railBtn = document.getElementById('btn-rail-menu');
    railBtn?.classList.toggle('is-active', !collapsed);
    railBtn?.setAttribute('aria-expanded', String(!collapsed));

    const headerBtn = document.getElementById('header-collapse-nav');
    headerBtn?.setAttribute('aria-expanded', String(!collapsed));
    const arrow = headerBtn?.querySelector<HTMLElement>('.pane-collapse-arrow');
    if (arrow) {
      arrow.textContent = collapsed ? '▶' : '◀';
    }

    if (persist) {
      storageSet('wiki-pane-nav-collapsed', collapsed ? 'true' : 'false');
    }
  }

  function initNavPane(): void {
    const pane = document.getElementById('pane-nav');
    if (pane) {
      const stored = storageGet('wiki-pane-nav-collapsed');
      const collapsed = stored !== null ? stored === 'true' : window.innerWidth <= 900;
      syncNavPaneState(collapsed, false);
    }
    document.documentElement.removeAttribute('data-nav-collapsed');

    const bookView = document.getElementById('wiki-book-view');
    requestAnimationFrame(() => {
      bookView?.classList.add('is-ready');
    });
  }

  // ===========================================================================
  // 3. Sticky Tabs (付箋ヘッダー), Heading Scroll-Spy & Edge Jump Buttons
  // ===========================================================================

  let stickyAbortController: AbortController | null = null;
  let clickScrollUntil = 0;

  function getScrollContainer(): HTMLElement {
    return (
      document.getElementById('pane-article-scroll') ??
      document.getElementById('book-content-scroll') ??
      document.documentElement
    );
  }

  function computeScrollOffset(container: HTMLElement, target: HTMLElement, padding = 16): number {
    if (container === document.documentElement) {
      return Math.max(0, target.getBoundingClientRect().top + window.scrollY - padding);
    }
    const delta = target.getBoundingClientRect().top - container.getBoundingClientRect().top;
    return Math.max(0, container.scrollTop + delta - padding);
  }

  function initStickyTabs(): void {
    stickyAbortController?.abort();
    stickyAbortController = new AbortController();
    const { signal } = stickyAbortController;

    const tabsBar = document.getElementById('sticky-tabs-bar');
    const scrollContainer = getScrollContainer();
    if (!tabsBar) return;

    const tabNodes = Array.from(tabsBar.querySelectorAll<HTMLElement>('.sticky-tab-node'));
    if (tabNodes.length === 0) return;

    const scopeRoot = scrollContainer === document.documentElement ? document : scrollContainer;
    const articleHeadings = Array.from(
      scopeRoot.querySelectorAll<HTMLElement>(
        'article h1[id], article h2[id], article h3[id], article h4[id], article h5[id], article h6[id]'
      )
    );
    const headings =
      articleHeadings.length > 0
        ? articleHeadings
        : tabNodes
            .map((node) => node.getAttribute('data-id'))
            .filter((id): id is string => Boolean(id))
            .map((id) => document.getElementById(id))
            .filter((el): el is HTMLElement => el !== null);

    function setActiveTab(activeId: string): void {
      let activeNode = tabNodes.find((n) => n.getAttribute('data-id') === activeId);

      // If scrolled to a deeper heading (H4+) without its own tab, fall back to nearest preceding tab
      if (!activeNode && headings.length > 0) {
        const idx = headings.findIndex((h) => h.id === activeId);
        for (let i = idx - 1; i >= 0; i--) {
          const prevId = headings[i].id;
          activeNode = tabNodes.find((n) => n.getAttribute('data-id') === prevId);
          if (activeNode) break;
        }
      }

      if (!activeNode) return;
      const directBtn = Array.from(activeNode.children).find((el): el is HTMLElement =>
        el.classList.contains('sticky-tab-btn')
      );
      if (activeNode.classList.contains('is-active') && directBtn?.classList.contains('is-active')) {
        return;
      }

      tabNodes.forEach((n) => {
        n.classList.remove('is-active', 'is-active-branch');
      });
      tabsBar?.querySelectorAll<HTMLElement>('.sticky-tab-btn.is-active').forEach((btn) => {
        btn.classList.remove('is-active');
      });

      activeNode.classList.add('is-active');
      directBtn?.classList.add('is-active');

      let parent = activeNode.parentElement?.closest<HTMLElement>('.sticky-tab-node') ?? null;
      while (parent) {
        parent.classList.add('is-active-branch');
        parent = parent.parentElement?.closest<HTMLElement>('.sticky-tab-node') ?? null;
      }

      directBtn?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
    }

    tabsBar.addEventListener(
      'click',
      (e) => {
        const btn = (e.target as Element | null)?.closest<HTMLElement>('.sticky-tab-btn');
        if (!btn) return;

        const node = btn.closest<HTMLElement>('.sticky-tab-node');
        const targetId = node?.getAttribute('data-id') ?? btn.getAttribute('data-target');
        if (!targetId) return;

        const target = document.getElementById(targetId);
        if (!target) return;

        e.preventDefault();
        clickScrollUntil = performance.now() + 700;
        scrollContainer.scrollTo({
          top: computeScrollOffset(scrollContainer, target, 16),
          behavior: 'smooth',
        });

        try {
          history.replaceState(null, '', `#${encodeURIComponent(targetId)}`);
        } catch {
          // Ignore replaceState security restrictions on file:// URLs
        }

        setActiveTab(targetId);
      },
      { signal }
    );

    // Smooth wheel-to-horizontal scroll glide along sticky tabs
    let wheelTarget: number | null = null;
    let wheelFrame: number | null = null;

    const glide = () => {
      if (wheelTarget === null) return;
      const remaining = wheelTarget - tabsBar.scrollLeft;
      if (Math.abs(remaining) < 0.5) {
        tabsBar.scrollLeft = wheelTarget;
        wheelTarget = null;
        wheelFrame = null;
        return;
      }
      tabsBar.scrollLeft += remaining * 0.22;
      wheelFrame = requestAnimationFrame(glide);
    };

    tabsBar.addEventListener(
      'wheel',
      (e) => {
        if (document.documentElement.getAttribute('data-tabs') === 'right') return;
        const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        if (!delta) return;

        const maxScrollLeft = Math.max(0, tabsBar.scrollWidth - tabsBar.clientWidth);
        const from = wheelTarget ?? tabsBar.scrollLeft;
        const to = Math.max(0, Math.min(maxScrollLeft, from + delta));
        if (to === from) return;

        e.preventDefault();
        wheelTarget = to;
        if (wheelFrame === null) {
          wheelFrame = requestAnimationFrame(glide);
        }
      },
      { passive: false, signal }
    );

    // Throttled scroll-spy
    let isTicking = false;
    const syncOnScroll = () => {
      if (isTicking || performance.now() < clickScrollUntil) return;
      isTicking = true;
      requestAnimationFrame(() => {
        isTicking = false;
        if (headings.length === 0) return;

        const containerTop =
          scrollContainer === document.documentElement
            ? 0
            : scrollContainer.getBoundingClientRect().top;

        let currentId: string | null = null;
        for (const h of headings) {
          if (h.getBoundingClientRect().top - containerTop <= 72) {
            currentId = h.id;
          } else {
            break;
          }
        }

        setActiveTab(currentId ?? headings[0].id);
      });
    };

    const scrollTarget = scrollContainer === document.documentElement ? window : scrollContainer;
    scrollTarget.addEventListener('scroll', syncOnScroll, { passive: true, signal });

    // Initial hash jump & active tab sync
    const rawHash = window.location.hash.replace(/^#/, '');
    let decodedHash = rawHash;
    try {
      decodedHash = decodeURIComponent(rawHash);
    } catch {
      // Keep raw hash if malformed percent encoding
    }

    const hashTarget = decodedHash ? document.getElementById(decodedHash) : null;
    if (hashTarget) {
      scrollContainer.scrollTo({
        top: computeScrollOffset(scrollContainer, hashTarget, 16),
        behavior: 'auto',
      });
      setActiveTab(decodedHash);
    } else {
      const firstId = tabNodes[0]?.getAttribute('data-id');
      if (firstId) setActiveTab(firstId);
      syncOnScroll();
    }
  }

  // ===========================================================================
  // 4. Delegated Clicks (Theme, Nav Pane, Edge Jump, Code Copy)
  // ===========================================================================

  const copyResetTimers = new WeakMap<HTMLElement, number>();

  async function copyCodeBlock(btn: HTMLElement): Promise<void> {
    const wrapper = btn.closest('.code-block-wrapper');
    const code = wrapper?.querySelector('pre code') ?? wrapper?.querySelector('pre');
    if (!code) return;

    const text = code.textContent ?? '';
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      const icon = btn.querySelector('tmt-icon');
      const use = btn.querySelector('use') ?? icon?.shadowRoot?.querySelector('use') ?? null;
      const currentHref = use?.getAttribute('href') ?? '';
      const spriteBase = currentHref.includes('#')
        ? currentHref.slice(0, currentHref.indexOf('#'))
        : `${window.tmtBasePath ?? ''}/icons/lucide.svg`;

      use?.setAttribute('href', `${spriteBase}#check`);
      icon?.setAttribute('name', 'check');
      btn.classList.add('is-copied');
      btn.setAttribute('title', 'コピーしました');
      btn.setAttribute('aria-label', 'コピーしました');

      const prevTimer = copyResetTimers.get(btn);
      if (prevTimer !== undefined) window.clearTimeout(prevTimer);

      const timer = window.setTimeout(() => {
        use?.setAttribute('href', `${spriteBase}#copy`);
        icon?.setAttribute('name', 'copy');
        btn.classList.remove('is-copied');
        btn.setAttribute('title', 'コードをコピー');
        btn.setAttribute('aria-label', 'コードをコピー');
        copyResetTimers.delete(btn);
      }, 2000);
      copyResetTimers.set(btn, timer);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }

  function initDelegatedEvents(): void {
    document.addEventListener('click', (e) => {
      const target = e.target as Element | null;
      if (!target) return;

      // 1. Theme & contrast buttons
      const themeBtn = target.closest('.theme-toggle-btn, #btn-rail-theme');
      if (themeBtn) {
        e.preventDefault();
        toggleTheme();
        return;
      }

      const contrastBtn = target.closest('.contrast-toggle-btn, #btn-rail-contrast');
      if (contrastBtn) {
        e.preventDefault();
        toggleContrast();
        return;
      }

      // 2. Navigation pane controls & mobile backdrop
      if (target.closest('#pane-nav-backdrop')) {
        e.preventDefault();
        syncNavPaneState(true, window.innerWidth > 768);
        return;
      }

      if (target.closest('#btn-rail-menu')) {
        e.preventDefault();
        const pane = document.getElementById('pane-nav');
        if (!pane) return;
        const nextCollapsed = !pane.classList.contains('is-collapsed');
        syncNavPaneState(nextCollapsed, window.innerWidth > 768);
        return;
      }

      if (target.closest('#header-collapse-nav')) {
        e.preventDefault();
        syncNavPaneState(true, window.innerWidth > 768);
        return;
      }

      if (target.closest('#pane-nav a') && window.innerWidth <= 768) {
        syncNavPaneState(true, false);
      }

      // 3. Sticky-tab edge jump buttons (top / bottom)
      const edgeBtn = target.closest<HTMLElement>(
        '#btn-sticky-top, #btn-sticky-bottom, .sticky-edge-btn'
      );
      if (edgeBtn) {
        e.preventDefault();
        const direction =
          edgeBtn.getAttribute('data-direction') ??
          (edgeBtn.id === 'btn-sticky-bottom' ? 'bottom' : 'top');
        const container = getScrollContainer();
        container.scrollTo({
          top: direction === 'bottom' ? container.scrollHeight : 0,
          behavior: 'smooth',
        });
        return;
      }

      // 4. Code-block copy button
      const copyBtn = target.closest<HTMLElement>('.code-copy-btn');
      if (copyBtn) {
        e.preventDefault();
        void copyCodeBlock(copyBtn);
      }
    });
  }

  // ===========================================================================
  // 5. HTMX Partial Swap Synchronization
  // ===========================================================================

  function normalizePathname(urlOrPath: string): string {
    try {
      const parsed = new URL(urlOrPath, window.location.origin);
      return parsed.pathname.replace(/\/+$/, '') || '/';
    } catch {
      return urlOrPath.replace(/\/+$/, '') || '/';
    }
  }

  function syncActiveCatalogLinks(): void {
    const currentPath = normalizePathname(window.location.pathname);
    document.querySelectorAll<HTMLAnchorElement>('#pane-nav .pane-scroll a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;
      const isCurrent = normalizePathname(href) === currentPath;
      if (isCurrent) {
        link.setAttribute('aria-current', 'page');
        link.classList.add('font-bold', 'text-link', 'bg-surface');
      } else {
        link.removeAttribute('aria-current');
        link.classList.remove('font-bold', 'text-link', 'bg-surface');
      }
    });
  }

  function upgradeDeclarativeShadowRoots(root: ParentNode): void {
    root.querySelectorAll<HTMLTemplateElement>('template[shadowrootmode]').forEach((tmpl) => {
      const host = tmpl.parentElement;
      if (!host || host.shadowRoot) return;
      const mode = tmpl.getAttribute('shadowrootmode') === 'closed' ? 'closed' : 'open';
      try {
        const shadow = host.attachShadow({ mode });
        shadow.appendChild(tmpl.content);
        tmpl.remove();
      } catch {
        // Ignore elements that disallow attachShadow
      }
    });
  }

  function initHtmxBridge(): void {
    const onHtmxDomUpdated = (resetScroll: boolean) => {
      upgradeDeclarativeShadowRoots(document);

      const bookView = document.getElementById('wiki-book-view');
      if (bookView && !bookView.classList.contains('is-ready')) {
        initNavPane();
      }

      const contentPane = document.getElementById('pane-content');
      const nextTitle = contentPane?.getAttribute('data-page-title');
      if (nextTitle) {
        document.title = nextTitle;
      }

      syncActiveCatalogLinks();

      if (resetScroll && !window.location.hash) {
        const container = getScrollContainer();
        container.scrollTo({ top: 0, behavior: 'auto' });
      }

      initStickyTabs();

      if (resetScroll && window.innerWidth <= 768) {
        syncNavPaneState(true, false);
      }
    };

    document.addEventListener('htmx:afterSwap', () => onHtmxDomUpdated(true));
    document.addEventListener('htmx:historyRestore', () => onHtmxDomUpdated(false));
  }

  // ===========================================================================
  // 6. Keyboard Shortcuts
  // ===========================================================================

  function initKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement | null;

      if ((e.key === 'Enter' || e.key === ' ') && target?.closest('#header-collapse-nav')) {
        e.preventDefault();
        syncNavPaneState(true, window.innerWidth > 768);
        return;
      }

      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if (e.key === 't' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleTheme();
      } else if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Defer '/' to Svelte / Solid Search Island when mounted
        if (document.getElementById('search-island')) return;
        const searchInput = document.querySelector<HTMLInputElement>(
          '.wiki-search-input, input[type="search"], .search-input'
        );
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
      } else if (e.key === 'Escape' && window.innerWidth <= 900) {
        const pane = document.getElementById('pane-nav');
        if (pane && !pane.classList.contains('is-collapsed')) {
          syncNavPaneState(true, false);
        }
      }
    });
  }

  // ===========================================================================
  // Bootstrap
  // ===========================================================================

  function init(): void {
    upgradeDeclarativeShadowRoots(document);
    initTheme();
    initNavPane();
    initStickyTabs();
    initDelegatedEvents();
    initHtmxBridge();
    initKeyboard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
