/**
 * Classic View interaction controller:
 * - Window ScrollSpy scoped strictly to `#wiki-classic-view`
 * - Auto-revealing right-margin sticky tabs (`#classic-sticky-tabs`)
 */

import {
  computeScrollOffset,
  createScrollSpy,
  findHeadingInView,
  syncHeadingHash,
  type HeadingTarget,
  type ScrollSpyInstance,
} from './dom';

let activeClassicSpy: ScrollSpyInstance | null = null;
let classicViewModeBound = false;
let currentShowTabsTemporarily: (() => void) | null = null;
let currentClearScrollFade: (() => void) | null = null;

const interactionBoundTabs = new WeakSet<HTMLElement>();
const jumpBoundClassicBtns = new WeakSet<HTMLElement>();

export function setupClassicViewInteraction(): void {
  const classicView = document.getElementById('wiki-classic-view');
  if (!classicView) return;

  const classicTocLinks = Array.from(classicView.querySelectorAll<HTMLElement>('.toc a'));
  const linkById = new Map<string, HTMLElement>();
  classicTocLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href?.startsWith('#')) {
      linkById.set(href.slice(1), link);
    }
  });

  const headingEls = Array.from(
    classicView.querySelectorAll<HTMLElement>(
      'article h1[id], article h2[id], article h3[id], article h4[id]'
    )
  );

  if (headingEls.length === 0) {
    activeClassicSpy?.destroy();
    activeClassicSpy = null;
    return;
  }

  const headingTargets: HeadingTarget[] = headingEls.map((el) => ({
    id: el.id,
    el,
    link: linkById.get(el.id) ?? null,
  }));

  const classicTabs = document.getElementById('classic-sticky-tabs');
  const tabsBar = document.getElementById('classic-sticky-tabs-bar');
  let classicTabsHelper: {
    setActiveTab: (activeId: string | null) => void;
    showTemporarily: () => void;
  } | null = null;

  if (classicTabs && tabsBar) {
    let scrollFadeTimer: number | null = null;
    let isInteracting = false;

    const clearFade = (): void => {
      if (scrollFadeTimer !== null) {
        window.clearTimeout(scrollFadeTimer);
        scrollFadeTimer = null;
      }
    };

    const showTabsTemporarily = (): void => {
      if (document.documentElement.getAttribute('data-view') !== 'classic') return;
      classicTabs.classList.add('is-scrolling');
      clearFade();
      if (!isInteracting) {
        scrollFadeTimer = window.setTimeout(() => {
          classicTabs.classList.remove('is-scrolling');
          scrollFadeTimer = null;
        }, 2000);
      }
    };

    currentShowTabsTemporarily = showTabsTemporarily;
    currentClearScrollFade = clearFade;

    const onEnter = (): void => {
      if (document.documentElement.getAttribute('data-view') !== 'classic') return;
      isInteracting = true;
      classicTabs.classList.add('is-hovered');
      clearFade();
    };

    const onLeave = (): void => {
      if (document.documentElement.getAttribute('data-view') !== 'classic') return;
      isInteracting = false;
      classicTabs.classList.remove('is-hovered');
      clearFade();
      scrollFadeTimer = window.setTimeout(() => {
        classicTabs.classList.remove('is-scrolling');
        scrollFadeTimer = null;
      }, 2000);
    };

    if (!interactionBoundTabs.has(classicTabs)) {
      interactionBoundTabs.add(classicTabs);
      classicTabs.addEventListener('mouseenter', onEnter);
      classicTabs.addEventListener('mouseleave', onLeave);
      classicTabs.addEventListener('touchstart', onEnter, { passive: true });
      classicTabs.addEventListener('touchend', onLeave, { passive: true });
    }

    const nodes = Array.from(tabsBar.querySelectorAll<HTMLElement>('.sticky-tab-node'));

    const setActiveTab = (activeId: string | null): void => {
      if (!activeId) return;
      let targetNode = nodes.find((n) => n.getAttribute('data-id') === activeId);

      if (!targetNode && headingTargets.length > 0) {
        const idx = headingTargets.findIndex((h) => h.id === activeId);
        if (idx > 0) {
          for (let i = idx - 1; i >= 0; i--) {
            const prev = nodes.find((n) => n.getAttribute('data-id') === headingTargets[i].id);
            if (prev) {
              targetNode = prev;
              break;
            }
          }
        }
      }

      if (!targetNode || targetNode.classList.contains('is-active')) return;

      nodes.forEach((n) => {
        n.classList.remove('is-active', 'is-active-branch');
        n.querySelector(':scope > .sticky-tab-btn')?.classList.remove('is-active');
      });

      targetNode.classList.add('is-active');
      targetNode.querySelector(':scope > .sticky-tab-btn')?.classList.add('is-active');

      // Only add .is-active-branch on ancestor nodes (do NOT add .is-active to parent buttons,
      // which would falsely scale parent tabs upward).
      let parent = targetNode.parentElement?.closest<HTMLElement>('.sticky-tab-node') ?? null;
      while (parent) {
        parent.classList.add('is-active-branch');
        parent = parent.parentElement?.closest<HTMLElement>('.sticky-tab-node') ?? null;
      }

      targetNode.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };

    nodes.forEach((node) => {
      const btn = node.querySelector<HTMLElement>(':scope > .sticky-tab-btn');
      const targetId = node.getAttribute('data-id');
      btn?.addEventListener('click', (e) => {
        e.preventDefault();
        if (!targetId) return;
        const targetEl = findHeadingInView(targetId, true);
        if (targetEl) {
          activeClassicSpy?.markClickScrolling();
          window.scrollTo({
            top: computeScrollOffset(window, targetEl, 32),
            behavior: 'smooth',
          });
          syncHeadingHash(targetId);
          setActiveTab(targetId);
          showTabsTemporarily();
        }
      });
    });

    classicTabs.querySelectorAll<HTMLElement>('.sticky-edge-btn').forEach((btn) => {
      if (jumpBoundClassicBtns.has(btn)) return;
      jumpBoundClassicBtns.add(btn);
      const dir = btn.getAttribute('data-direction');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({
          top: dir === 'bottom' ? document.documentElement.scrollHeight : 0,
          behavior: 'smooth',
        });
        showTabsTemporarily();
      });
    });

    if (nodes.length > 0 && !tabsBar.querySelector('.sticky-tab-node.is-active')) {
      setActiveTab(nodes[0].getAttribute('data-id'));
    }

    if (document.documentElement.getAttribute('data-view') === 'classic') {
      showTabsTemporarily();
    }

    if (!classicViewModeBound) {
      classicViewModeBound = true;
      document.addEventListener('tmt:view-mode-changed', (e) => {
        const detail = (e as CustomEvent<{ view?: string }>).detail;
        if (detail?.view === 'classic') {
          currentShowTabsTemporarily?.();
          activeClassicSpy?.update();
        } else {
          document
            .getElementById('classic-sticky-tabs')
            ?.classList.remove('is-scrolling', 'is-hovered');
          currentClearScrollFade?.();
        }
      });
    }

    classicTabsHelper = {
      setActiveTab,
      showTemporarily: showTabsTemporarily,
    };
  }

  const classicSpy = createScrollSpy({
    container: window,
    headingTargets,
    tocLinks: classicTocLinks,
    headingLine: 80,
    isActiveView: () => document.documentElement.getAttribute('data-view') === 'classic',
    onActiveChange: (currentId) => {
      syncHeadingHash(currentId);
      classicTabsHelper?.setActiveTab(currentId);
    },
    onScroll: () => {
      classicTabsHelper?.showTemporarily();
    },
  });

  activeClassicSpy?.destroy();
  activeClassicSpy = classicSpy;

  classicTocLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href?.startsWith('#')) return;
      const targetId = href.slice(1);
      const targetEl = findHeadingInView(targetId, true);
      if (targetEl) {
        e.preventDefault();
        classicSpy.markClickScrolling();
        window.scrollTo({
          top: computeScrollOffset(window, targetEl, 32),
          behavior: 'smooth',
        });
        classicTocLinks.forEach((l) => l.classList.remove('is-active'));
        link.classList.add('is-active');
        history.pushState(null, '', href);
        classicTabsHelper?.setActiveTab(targetId);
        classicTabsHelper?.showTemporarily();
      }
    });
  });

  if (document.documentElement.getAttribute('data-view') === 'classic') {
    classicSpy.update();
  }
}
