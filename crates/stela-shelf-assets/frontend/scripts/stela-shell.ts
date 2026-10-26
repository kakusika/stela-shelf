/**
 * Stela Shelf Core Client Script
 *
 * Provides core Stela book shell behaviors across all engine variants:
 * - Theme & shell contrast switching with localStorage persistence
 * - Sticky Tabs (付箋ヘッダー) click scrolling, active branch accordion, and hover peek
 * - Left rail and navigation pane mobile toggles
 * - Essential keyboard shortcuts (t: theme, /: search, Esc: close)
 */

(() => {
  if (typeof window === 'undefined') return;
  const w = window as any;
  if (w.__STELA_SHELL_INITIALIZED__) return;
  w.__STELA_SHELL_INITIALIZED__ = true;

  // ===========================================================================
  // 1. Theme & Shell Contrast Controller
  // ===========================================================================

  function getSystemTheme(): 'dark' | 'light' {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function getEffectiveTheme(): 'dark' | 'light' {
    const forced = document.documentElement.getAttribute('data-theme');
    if (forced === 'dark' || forced === 'light') return forced;
    try {
      const stored = localStorage.getItem('shelf-theme');
      if (stored === 'dark' || stored === 'light') return stored;
    } catch (_) {}
    return getSystemTheme();
  }

  function applyTheme(theme: 'dark' | 'light') {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('shelf-theme', theme);
    } catch (_) {}
    updateThemeUI(theme);
  }

  function toggleTheme() {
    const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }

  function updateThemeUI(theme: 'dark' | 'light') {
    const isDark = theme === 'dark';
    const buttons = document.querySelectorAll('.theme-toggle-btn, #btn-rail-theme');
    buttons.forEach((btn) => {
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      if (btn instanceof HTMLElement) {
        btn.title = isDark ? 'Switch to light mode (t)' : 'Switch to dark mode (t)';
      }
    });
  }

  function getEffectiveContrast(): 'normal' | 'high' {
    const forced = document.documentElement.getAttribute('data-shell-contrast');
    if (forced === 'high') return 'high';
    try {
      const stored = localStorage.getItem('shelf-shell-contrast');
      if (stored === 'high') return 'high';
    } catch (_) {}
    return 'normal';
  }

  function applyContrast(contrast: 'normal' | 'high') {
    if (contrast === 'high') {
      document.documentElement.setAttribute('data-shell-contrast', 'high');
    } else {
      document.documentElement.removeAttribute('data-shell-contrast');
    }
    try {
      localStorage.setItem('shelf-shell-contrast', contrast);
    } catch (_) {}
  }

  function toggleContrast() {
    const next = getEffectiveContrast() === 'high' ? 'normal' : 'high';
    applyContrast(next);
  }

  function initTheme() {
    // 1. Initial restoration
    const theme = getEffectiveTheme();
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeUI(theme);

    const contrast = getEffectiveContrast();
    if (contrast === 'high') {
      document.documentElement.setAttribute('data-shell-contrast', 'high');
    }

    // 2. Event listeners for buttons
    document.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement | null)?.closest(
        '.theme-toggle-btn, #btn-rail-theme, .contrast-toggle-btn, #btn-rail-contrast'
      );
      if (!target) return;

      if (target.matches('.theme-toggle-btn, #btn-rail-theme')) {
        e.preventDefault();
        toggleTheme();
      } else if (target.matches('.contrast-toggle-btn, #btn-rail-contrast')) {
        e.preventDefault();
        toggleContrast();
      }
    });

    // 3. System dark mode media query listener
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        try {
          if (!localStorage.getItem('shelf-theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
          }
        } catch (_) {}
      });
    }
  }

  // ===========================================================================
  // 2. Sticky Tabs (付箋ヘッダー) & Heading Sync
  // ===========================================================================

  function initStickyTabs() {
    const tabsBar = document.getElementById('sticky-tabs-bar');
    if (!tabsBar) return;

    const scrollContainer =
      document.getElementById('book-content-scroll') || document.documentElement;
    const tabNodes = Array.from(tabsBar.querySelectorAll<HTMLElement>('.sticky-tab-node'));
    if (tabNodes.length === 0) return;

    // Collect all heading targets indicated by sticky tabs or TOC
    const headingIds = tabNodes
      .map((node) => node.getAttribute('data-id'))
      .filter((id): id is string => Boolean(id));

    const headings = headingIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    // A. Click tab to scroll to heading
    tabsBar.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement | null)?.closest<HTMLElement>('.sticky-tab-btn');
      if (!btn) return;

      const node = btn.closest<HTMLElement>('.sticky-tab-node');
      const targetId = node?.getAttribute('data-id') || btn.getAttribute('data-target');
      if (!targetId) return;

      const target = document.getElementById(targetId);
      if (!target) return;

      e.preventDefault();
      const offsetTop =
        scrollContainer === document.documentElement
          ? target.getBoundingClientRect().top + window.scrollY - 16
          : target.offsetTop - 16;

      scrollContainer.scrollTo({ top: offsetTop, behavior: 'smooth' });

      try {
        history.replaceState(null, '', `#${targetId}`);
      } catch (_) {}

      setActiveTab(targetId);
    });

    // B. Set Active Tab and open accordion branch
    function setActiveTab(activeId: string) {
      const activeNode = tabNodes.find((n) => n.getAttribute('data-id') === activeId);
      if (!activeNode) return;

      // Update active state
      tabNodes.forEach((n) => {
        n.classList.remove('is-active');
        n.classList.remove('is-active-branch');
      });

      activeNode.classList.add('is-active');

      // Expand ancestor branch chain
      let parent = activeNode.parentElement?.closest<HTMLElement>('.sticky-tab-node');
      while (parent) {
        parent.classList.add('is-active-branch');
        parent = parent.parentElement?.closest<HTMLElement>('.sticky-tab-node');
      }

      // If activeNode itself has children, also expand it
      if (activeNode.querySelector(':scope > .sticky-children-slot')) {
        activeNode.classList.add('is-active-branch');
      }
    }

    // C. Scroll listener for heading highlight (throttled)
    let isTicking = false;
    function onScroll() {
      if (isTicking) return;
      isTicking = true;
      requestAnimationFrame(() => {
        isTicking = false;
        if (headings.length === 0) return;

        const containerTop =
          scrollContainer === document.documentElement ? 0 : scrollContainer.getBoundingClientRect().top;

        // Find the topmost heading that has reached or passed the trigger line
        let currentId: string | null = null;
        for (const h of headings) {
          const rect = h.getBoundingClientRect();
          if (rect.top - containerTop <= 64) {
            currentId = h.id;
          } else {
            break;
          }
        }

        if (currentId) {
          setActiveTab(currentId);
        } else if (headings[0]) {
          setActiveTab(headings[0].id);
        }
      });
    }

    const scrollTarget = scrollContainer === document.documentElement ? window : scrollContainer;
    scrollTarget.addEventListener('scroll', onScroll, { passive: true });

    // Initial sync
    const initialHash = window.location.hash.replace(/^#/, '');
    if (initialHash && document.getElementById(initialHash)) {
      setActiveTab(initialHash);
    } else {
      onScroll();
    }
  }

  // ===========================================================================
  // 3. Panes & Mobile Navigation
  // ===========================================================================

  function initPanes() {
    document.addEventListener('click', (e) => {
      const toggle = (e.target as HTMLElement | null)?.closest(
        '#btn-rail-menu, #btn-rail-toc, .toc-mobile-toggle, .nav-mobile-toggle'
      );
      if (!toggle) return;

      e.preventDefault();
      const isToc = toggle.matches('#btn-rail-toc, .toc-mobile-toggle');
      const pane = isToc
        ? document.getElementById('book-toc-pane') || document.querySelector('.book-toc-pane')
        : document.getElementById('book-nav-pane') || document.querySelector('.book-nav-pane');

      if (!pane) return;
      const isOpen = pane.classList.contains('is-open');
      pane.classList.toggle('is-open', !isOpen);
    });
  }

  // ===========================================================================
  // 4. Keyboard Shortcuts
  // ===========================================================================

  function initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Ignore when typing inside input/textarea/editable
      const target = e.target as HTMLElement | null;
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
        const searchInput = document.querySelector<HTMLInputElement>(
          '#shelf-search-input, input[type="search"], .search-input'
        );
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
      } else if (e.key === 'Escape') {
        // Close any mobile open panes
        document.querySelectorAll('.is-open').forEach((el) => {
          if (el.matches('.book-nav-pane, .book-toc-pane')) {
            el.classList.remove('is-open');
          }
        });
      }
    });
  }

  // ===========================================================================
  // Bootstrap
  // ===========================================================================

  function init() {
    initTheme();
    initStickyTabs();
    initPanes();
    initKeyboard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
