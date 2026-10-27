/**
 * Navigation pane (#pane-nav: TOC, Backlinks, Index, Lookup, and Graph placeholder)
 * and Data profile pane (#pane-data: Infobox) controllers.
 */

import { session, storage } from './dom';
import { t } from './env';

let navPaneDelegated = false;
let dataPaneGlobalBound = false;
const scrollBoundNavPanes = new WeakSet<HTMLElement>();
const dataPaneBoundEls = new WeakSet<HTMLElement>();

function updateNavBackdrop(isCollapsed: boolean): void {
  const backdrop = document.getElementById('pane-nav-backdrop');
  if (!backdrop) return;
  backdrop.classList.toggle('is-active', !isCollapsed);
}

export function collapseNavPane(): void {
  const pNav = document.getElementById('pane-nav');
  if (!pNav) return;
  pNav.classList.add('is-collapsed');
  updateNavBackdrop(true);
  document.querySelectorAll('.rail-tab-nav').forEach((tab) => tab.classList.remove('is-active'));
  storage.set('wiki-pane-nav-collapsed', 'true');
}

function switchNavPanel(panelName: string, expandIfCollapsed = true): void {
  const pNav = document.getElementById('pane-nav');
  if (!pNav) return;

  pNav.dataset.activePanel = panelName;
  storage.set('wiki-pane-nav-active-panel', panelName);

  if (expandIfCollapsed) {
    pNav.classList.remove('is-collapsed');
    storage.set('wiki-pane-nav-collapsed', 'false');
  }

  const isCollapsed = pNav.classList.contains('is-collapsed');
  updateNavBackdrop(isCollapsed);

  document.querySelectorAll('.rail-tab-nav').forEach((tab) => {
    tab.classList.toggle('is-active', tab.getAttribute('data-panel') === panelName && !isCollapsed);
  });

  document.querySelectorAll<HTMLElement>('.pane-panel-view').forEach((view) => {
    const active = view.id === `pane-panel-${panelName}`;
    view.hidden = !active;
    view.classList.toggle('is-active', active);
  });

  const titles: Record<string, string> = {
    toc: t('pane.toc', '目次'),
    links: t('pane.links', '被リンク'),
    index: t('pane.index', '索引'),
    lookup: t('pane.lookup', '検索'),
    graph: t('pane.graph', 'グラフ'),
  };
  const paneTitle = document.getElementById('pane-nav-title');
  if (paneTitle && titles[panelName]) {
    paneTitle.textContent = titles[panelName];
  }
}

export function setupNavPane(): void {
  const pNav = document.getElementById('pane-nav');
  if (pNav) {
    const isNarrow = window.innerWidth <= 900;
    const navSetting = storage.get('wiki-pane-nav-collapsed');
    const isCollapsed = navSetting !== null ? navSetting === 'true' : isNarrow;
    const savedPanel = storage.get('wiki-pane-nav-active-panel');
    const currentPanel = savedPanel || pNav.dataset.activePanel || 'toc';

    if (isCollapsed) {
      collapseNavPane();
    } else {
      switchNavPanel(currentPanel, false);
    }
    document.documentElement.removeAttribute('data-nav-collapsed');

    const paneScroll = pNav.querySelector<HTMLElement>('.pane-scroll');
    if (!isCollapsed && currentPanel !== 'lookup' && paneScroll) {
      const savedScroll = session.get(`wiki-pane-nav-scroll-${currentPanel}`);
      if (savedScroll) {
        requestAnimationFrame(() => {
          paneScroll.scrollTop = parseInt(savedScroll, 10) || 0;
        });
      }
    }

    if (paneScroll && !scrollBoundNavPanes.has(paneScroll)) {
      scrollBoundNavPanes.add(paneScroll);
      let scrollTimeout: number | null = null;
      const saveScroll = () => {
        const active = pNav.dataset.activePanel || 'toc';
        if (active !== 'lookup') {
          session.set(`wiki-pane-nav-scroll-${active}`, String(paneScroll.scrollTop));
        }
      };
      paneScroll.addEventListener(
        'scroll',
        () => {
          if (scrollTimeout !== null) window.clearTimeout(scrollTimeout);
          scrollTimeout = window.setTimeout(saveScroll, 150);
        },
        { passive: true }
      );
    }
  }

  if (navPaneDelegated) return;
  navPaneDelegated = true;

  document.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;

    if (target.closest('#pane-nav-backdrop')) {
      e.stopPropagation();
      collapseNavPane();
      return;
    }

    const tab = target.closest('.rail-tab-nav');
    if (tab) {
      e.stopPropagation();
      const panel = tab.getAttribute('data-panel');
      const currentPane = document.getElementById('pane-nav');
      if (!panel || !currentPane) return;

      const isCollapsed = currentPane.classList.contains('is-collapsed');
      const active = currentPane.dataset.activePanel || 'toc';

      if (isCollapsed || active !== panel) {
        switchNavPanel(panel, true);
      } else {
        collapseNavPane();
      }
      return;
    }

    if (target.closest('#header-collapse-nav')) {
      e.stopPropagation();
      collapseNavPane();
      return;
    }

    if (target.closest('#pane-nav a')) {
      const currentPane = document.getElementById('pane-nav');
      const paneScroll = currentPane?.querySelector<HTMLElement>('.pane-scroll');
      const active = currentPane?.dataset.activePanel || 'toc';
      if (paneScroll && active !== 'lookup') {
        session.set(`wiki-pane-nav-scroll-${active}`, String(paneScroll.scrollTop));
      }
      if (window.innerWidth <= 768) {
        collapseNavPane();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (e.key === 'Escape' && window.innerWidth <= 900) {
      const currentPane = document.getElementById('pane-nav');
      if (currentPane && !currentPane.classList.contains('is-collapsed')) {
        collapseNavPane();
      }
    }
    if ((e.key === 'Enter' || e.key === ' ') && target?.closest('#header-collapse-nav')) {
      e.preventDefault();
      collapseNavPane();
    }
  });

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  document.addEventListener(
    'touchstart',
    (e) => {
      if (window.innerWidth > 768 || e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    },
    { passive: true }
  );

  document.addEventListener(
    'touchend',
    (e) => {
      if (window.innerWidth > 768 || e.changedTouches.length !== 1) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      const deltaY = e.changedTouches[0].clientY - touchStartY;
      const duration = Date.now() - touchStartTime;
      if (duration > 450 || Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.5) {
        return;
      }

      const currentPane = document.getElementById('pane-nav');
      if (!currentPane) return;
      const isCollapsed = currentPane.classList.contains('is-collapsed');

      if (deltaX > 0 && touchStartX <= 60 && isCollapsed) {
        switchNavPanel(currentPane.dataset.activePanel || 'toc', true);
      } else if (deltaX < 0 && !isCollapsed) {
        collapseNavPane();
      }
    },
    { passive: true }
  );
}

export function collapseDataPane(): void {
  const pane = document.getElementById('pane-data');
  if (!pane) return;
  pane.classList.add('is-collapsed');
  if (window.innerWidth <= 768) {
    document.getElementById('pane-nav-backdrop')?.classList.remove('is-active');
  }
  storage.set('wiki-pane-data-collapsed', 'true');
}

export function bindDataPaneToggle(): void {
  const pane = document.getElementById('pane-data');
  const btnCollapse = document.getElementById('header-collapse-data');
  const barExpand = document.getElementById('bar-expand-data');
  if (!pane) {
    document.documentElement.removeAttribute('data-data-collapsed');
    return;
  }

  const isNarrow = window.innerWidth <= 900;
  const dataSetting = storage.get('wiki-pane-data-collapsed');
  const isCollapsed = dataSetting !== null ? dataSetting === 'true' : isNarrow;
  pane.classList.toggle('is-collapsed', isCollapsed);
  document.documentElement.removeAttribute('data-data-collapsed');

  const handleCollapse = (e?: Event) => {
    e?.stopPropagation();
    collapseDataPane();
  };

  const handleExpand = (e?: Event) => {
    e?.stopPropagation();
    pane.classList.remove('is-collapsed');
    if (window.innerWidth <= 768) {
      document.getElementById('pane-nav-backdrop')?.classList.add('is-active');
    }
    storage.set('wiki-pane-data-collapsed', 'false');
  };

  if (btnCollapse && !dataPaneBoundEls.has(btnCollapse)) {
    dataPaneBoundEls.add(btnCollapse);
    btnCollapse.addEventListener('click', handleCollapse);
    btnCollapse.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCollapse(e);
      }
    });
  }

  if (barExpand && !dataPaneBoundEls.has(barExpand)) {
    dataPaneBoundEls.add(barExpand);
    barExpand.addEventListener('click', handleExpand);
    barExpand.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleExpand(e);
      }
    });
  }

  if (!dataPaneBoundEls.has(pane)) {
    dataPaneBoundEls.add(pane);
    pane.addEventListener('click', () => {
      if (pane.classList.contains('is-collapsed')) {
        handleExpand();
      }
    });
  }

  if (dataPaneGlobalBound) return;
  dataPaneGlobalBound = true;

  document.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (window.innerWidth <= 768 && target?.closest('#pane-nav-backdrop')) {
      const p = document.getElementById('pane-data');
      if (p && !p.classList.contains('is-collapsed')) {
        collapseDataPane();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.innerWidth <= 900) {
      const p = document.getElementById('pane-data');
      if (p && !p.classList.contains('is-collapsed')) {
        collapseDataPane();
      }
    }
  });

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  document.addEventListener(
    'touchstart',
    (e) => {
      if (window.innerWidth > 768 || e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    },
    { passive: true }
  );
  document.addEventListener(
    'touchend',
    (e) => {
      if (window.innerWidth > 768 || e.changedTouches.length !== 1) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      const deltaY = e.changedTouches[0].clientY - touchStartY;
      const duration = Date.now() - touchStartTime;
      if (duration > 450 || Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.5) {
        return;
      }
      const p = document.getElementById('pane-data');
      if (p && !p.classList.contains('is-collapsed') && deltaX > 0) {
        collapseDataPane();
      }
    },
    { passive: true }
  );
}
