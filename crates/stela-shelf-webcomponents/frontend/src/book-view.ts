/**
 * Book View interaction controller:
 * - Cursor-based ScrollSpy on `#book-content-scroll`
 * - Inline expanding Sticky Tabs (`#sticky-tabs-bar`) with batched FLIP slide animation
 * - Seamless L-shaped child heading hover popover (`#sticky-hover-popover`)
 * - Smooth wheel-to-horizontal tab glide and edge jump buttons
 */

import {
  computeScrollOffset,
  createScrollSpy,
  findHeadingInView,
  readHash,
  syncHeadingHash,
  type HeadingTarget,
  type ScrollSpyInstance,
} from './dom';
import { setupLookupPane } from './lookup-pane';
import { bindDataPaneToggle, setupNavPane } from './panes';
import { updateRecentNotes } from './recent-notes';

let activeBookSpy: ScrollSpyInstance | null = null;
let popoverHoverTimer: number | null = null;
let popoverCloseTimer: number | null = null;
let currentRemeasureStickyTabs: (() => void) | null = null;
let stickyResizeBound = false;
let stickyResizeTimer: number | null = null;

const popoverHoverBound = new WeakSet<HTMLElement>();
const scrollCloseBound = new WeakSet<HTMLElement>();
const wheelBoundBars = new WeakSet<HTMLElement>();
const jumpBoundButtons = new WeakSet<HTMLElement>();

function isVerticalTabs(): boolean {
  return document.documentElement.getAttribute('data-tabs') === 'right';
}

function requestedHeadingId(): string | null {
  const id = readHash();
  return id && findHeadingInView(id, false) ? id : null;
}

function setStickyLevelState(el: HTMLElement, level: string, isActive: boolean): void {
  el.classList.remove('level-1', 'level-2', 'level-3', 'level-4', 'level-5', 'level-6');
  el.classList.add(`level-${level}`);
  el.classList.toggle('is-active', isActive);
}

export function hidePopover(): void {
  if (popoverHoverTimer !== null) {
    window.clearTimeout(popoverHoverTimer);
    popoverHoverTimer = null;
  }
  if (popoverCloseTimer !== null) {
    window.clearTimeout(popoverCloseTimer);
    popoverCloseTimer = null;
  }
  const popover = document.getElementById('sticky-hover-popover');
  if (popover) {
    popover.hidden = true;
  }
  document
    .querySelectorAll('.sticky-tab-btn.is-popover-open')
    .forEach((el) => el.classList.remove('is-popover-open'));
}

function setupStickyTabs(
  scrollContainer: HTMLElement,
  headingTargets: HeadingTarget[],
  markClickScrolling: () => void
): ((currentId: string) => void) | null {
  const tabsBar = document.getElementById('sticky-tabs-bar');
  if (!tabsBar) return null;

  hidePopover();

  const nodes = Array.from(tabsBar.querySelectorAll<HTMLElement>('.sticky-tab-node'));
  if (nodes.length === 0) return null;

  const topLevelNodes = Array.from(
    tabsBar.querySelectorAll<HTMLElement>(':scope > .sticky-tabs-list > .sticky-tab-node')
  );
  const nodesWithSlots = nodes.filter((n) => n.querySelector(':scope > .sticky-children-slot'));

  let expandDeltaByNode = new Map<HTMLElement, number>();
  const measureExpandDeltas = (): void => {
    const reallyOpen = nodesWithSlots.filter((n) => n.classList.contains('is-active-branch'));
    const vertical = isVerticalTabs();

    nodesWithSlots.forEach((n) => n.classList.remove('is-active-branch'));
    const collapsedSizes = nodesWithSlots.map((n) => (vertical ? n.offsetHeight : n.offsetWidth));

    nodesWithSlots.forEach((n) => n.classList.add('is-active-branch'));
    const expandedSizes = nodesWithSlots.map((n) => (vertical ? n.offsetHeight : n.offsetWidth));

    nodesWithSlots.forEach((n) => n.classList.remove('is-active-branch'));
    reallyOpen.forEach((n) => n.classList.add('is-active-branch'));

    expandDeltaByNode = new Map();
    nodesWithSlots.forEach((n, i) => {
      expandDeltaByNode.set(n, expandedSizes[i] - collapsedSizes[i]);
    });
  };

  measureExpandDeltas();
  window.setTimeout(measureExpandDeltas, 150);

  currentRemeasureStickyTabs = measureExpandDeltas;
  if (!stickyResizeBound) {
    stickyResizeBound = true;
    window.addEventListener('resize', () => {
      if (stickyResizeTimer !== null) window.clearTimeout(stickyResizeTimer);
      stickyResizeTimer = window.setTimeout(() => currentRemeasureStickyTabs?.(), 150);
    });
  }

  const chainOf = (node: HTMLElement): HTMLElement[] => {
    const chain: HTMLElement[] = [];
    let current: HTMLElement | null = node;
    while (current) {
      chain.unshift(current);
      current = current.parentElement?.closest<HTMLElement>('.sticky-tab-node') ?? null;
    }
    return chain;
  };

  const slideAtDivergence = <T>(
    oldChain: HTMLElement[],
    newChain: HTMLElement[],
    apply: () => T,
    onSettled: (applied: T) => void
  ): void => {
    const axis = isVerticalTabs() ? 'translateY' : 'translateX';

    let k = 0;
    while (k < oldChain.length && k < newChain.length && oldChain[k] === newChain[k]) k++;

    const siblingNodes =
      k === 0
        ? topLevelNodes
        : Array.from(
            oldChain[k - 1].querySelectorAll<HTMLElement>(
              ':scope > .sticky-children-slot > .sticky-tab-node'
            )
          );

    const fromIdx = oldChain[k] ? siblingNodes.indexOf(oldChain[k]) : -1;
    const toIdx = newChain[k] ? siblingNodes.indexOf(newChain[k]) : -1;
    const fromDelta = fromIdx >= 0 ? expandDeltaByNode.get(siblingNodes[fromIdx]) ?? 0 : 0;
    const toDelta = toIdx >= 0 ? expandDeltaByNode.get(siblingNodes[toIdx]) ?? 0 : 0;

    const affected: Array<{ node: HTMLElement; delta: number }> = [];
    if (fromIdx !== toIdx) {
      siblingNodes.forEach((node, j) => {
        const oldShift = fromIdx >= 0 && j > fromIdx ? fromDelta : 0;
        const newShift = toIdx >= 0 && j > toIdx ? toDelta : 0;
        if (oldShift !== newShift) affected.push({ node, delta: oldShift - newShift });
      });
    }

    affected.forEach(({ node, delta }) => {
      node.style.transition = 'none';
      node.style.transform = `${axis}(${delta}px)`;
    });

    const applied = apply();

    if (affected.length === 0) {
      onSettled(applied);
      return;
    }

    requestAnimationFrame(() => {
      let remaining = affected.length;
      const settleOne = () => {
        remaining -= 1;
        if (remaining <= 0) onSettled(applied);
      };
      affected.forEach(({ node }) => {
        node.style.transition = 'transform 0.28s cubic-bezier(0.2, 0, 0, 1)';
        node.addEventListener(
          'transitionend',
          () => {
            node.style.transition = '';
            node.style.transform = '';
            settleOne();
          },
          { once: true }
        );
        node.style.transform = '';
      });
    });
  };

  const scrollToHeading = (id: string | null): void => {
    if (!id) return;
    const target = findHeadingInView(id, false);
    if (!target) return;
    scrollContainer.scrollTo({
      top: computeScrollOffset(scrollContainer, target, 16),
      behavior: 'smooth',
    });
    syncHeadingHash(id);
  };

  const setActiveHeading = (currentId: string | null): void => {
    if (!currentId) return;

    let targetNode = nodes.find((n) => n.getAttribute('data-id') === currentId);
    if (!targetNode && headingTargets.length > 0) {
      const idx = headingTargets.findIndex((h) => h.id === currentId);
      if (idx > 0) {
        for (let i = idx - 1; i >= 0; i--) {
          const prevId = headingTargets[i].id;
          targetNode = nodes.find((n) => n.getAttribute('data-id') === prevId);
          if (targetNode) break;
        }
      }
    }

    if (!targetNode || targetNode.classList.contains('is-active')) return;
    const activeTarget = targetNode;

    const oldActiveNode = nodes.find((n) => n.classList.contains('is-active')) ?? null;
    const oldChain = oldActiveNode ? chainOf(oldActiveNode) : [];
    const newChain = chainOf(activeTarget);

    const applyActiveState = (): HTMLElement | undefined => {
      nodes.forEach((n) => n.classList.remove('is-active', 'is-active-branch'));
      tabsBar
        .querySelectorAll('.sticky-tab-btn.is-active')
        .forEach((btn) => btn.classList.remove('is-active'));

      activeTarget.classList.add('is-active');
      const directBtn = Array.from(activeTarget.children).find((el): el is HTMLElement =>
        el.classList.contains('sticky-tab-btn')
      );
      directBtn?.classList.add('is-active');

      let parent = activeTarget.parentElement?.closest<HTMLElement>('.sticky-tab-node') ?? null;
      while (parent) {
        parent.classList.add('is-active-branch');
        parent = parent.parentElement?.closest<HTMLElement>('.sticky-tab-node') ?? null;
      }

      return directBtn;
    };

    slideAtDivergence(oldChain, newChain, applyActiveState, (directBtn) => {
      directBtn?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
    });
  };

  const popover = document.getElementById('sticky-hover-popover');
  const popoverTab = popover?.querySelector<HTMLElement>('.sticky-popover-tab') ?? null;
  const popoverList = popover?.querySelector<HTMLElement>('.sticky-hover-popover-list') ?? null;

  const showPopoverForNode = (node: HTMLElement, btn: HTMLElement): void => {
    if (!popover || !popoverList) return;
    const childrenSlot = node.querySelector(':scope > .sticky-children-slot');
    if (!childrenSlot) {
      hidePopover();
      return;
    }

    const childNodes = Array.from(
      childrenSlot.querySelectorAll<HTMLElement>(':scope > .sticky-tab-node')
    );
    if (childNodes.length === 0) {
      hidePopover();
      return;
    }

    popoverList.replaceChildren();
    const itemTemplate = document.getElementById(
      'sticky-hover-item-template'
    ) as HTMLTemplateElement | null;
    if (!itemTemplate) return;

    childNodes.forEach((child) => {
      const childId = child.getAttribute('data-id');
      if (!childId) return;
      const childLevel = child.getAttribute('data-level') || '2';
      const childBtn = child.querySelector(':scope > .sticky-tab-btn');
      const childText = childBtn?.querySelector('.sticky-tab-text')?.textContent || childId;
      const isActive = child.classList.contains('is-active');

      const item = itemTemplate.content.firstElementChild?.cloneNode(
        true
      ) as HTMLAnchorElement | null;
      if (!item) return;

      item.href = `#${childId}`;
      item.classList.add(`level-${childLevel}`);
      if (isActive) item.classList.add('is-active');
      item.setAttribute('data-target', childId);

      const badge = item.querySelector('.sticky-level-badge');
      if (badge) {
        badge.classList.add(`level-${childLevel}`);
        badge.textContent = `H${childLevel}`;
      }
      const textEl = item.querySelector('.item-text');
      if (textEl) textEl.textContent = childText;

      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hidePopover();
        markClickScrolling();
        setActiveHeading(childId);
        scrollToHeading(childId);
      });

      popoverList.appendChild(item);
    });

    popover.hidden = false;

    tabsBar
      .querySelectorAll('.sticky-tab-btn.is-popover-open')
      .forEach((el) => el.classList.remove('is-popover-open'));
    btn.classList.add('is-popover-open');

    const parentLevel =
      node.getAttribute('data-level') ||
      (btn.classList.contains('level-1')
        ? '1'
        : btn.classList.contains('level-2')
          ? '2'
          : btn.classList.contains('level-3')
            ? '3'
            : '4');
    const isParentActive =
      node.classList.contains('is-active') || node.classList.contains('is-active-branch');
    setStickyLevelState(popover, parentLevel, isParentActive);

    if (popoverTab) {
      setStickyLevelState(popoverTab, parentLevel, isParentActive);
      popoverTab.innerHTML = btn.innerHTML;
      popoverTab.title = btn.title || '';
      popoverTab.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        hidePopover();
        btn.click();
      };
    }

    const rect = btn.getBoundingClientRect();
    popover.style.width = '';
    const popoverWidth = Math.min(320, Math.max(220, popover.offsetWidth || 220));

    if (isVerticalTabs()) {
      popover.style.width = `${popoverWidth}px`;
      const targetHeight = Math.min(280, popoverList.scrollHeight || 200);
      let popoverTop = rect.top;
      if (popoverTop + targetHeight > window.innerHeight - 16) {
        popoverTop = Math.max(12, window.innerHeight - targetHeight - 16);
      }
      popoverList.style.maxHeight = `${Math.min(
        280,
        Math.max(120, window.innerHeight - popoverTop - 24)
      )}px`;
      popover.style.top = `${popoverTop}px`;
      popover.style.left = `${Math.max(12, rect.left - popoverWidth)}px`;

      if (popoverTab) {
        popoverTab.style.top = `${rect.top - popoverTop}px`;
        popoverTab.style.width = `${rect.width + 1}px`;
        popoverTab.style.height = `${rect.height}px`;
      }
    } else {
      popover.style.width = '';
      popoverList.style.maxHeight = '280px';
      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - popoverWidth - 12);
      }
      popover.style.top = `${rect.bottom}px`;
      popover.style.left = `${left}px`;
    }
  };

  if (popover && !popoverHoverBound.has(popover)) {
    popoverHoverBound.add(popover);
    popover.addEventListener('mouseenter', () => {
      if (popoverCloseTimer !== null) {
        window.clearTimeout(popoverCloseTimer);
        popoverCloseTimer = null;
      }
    });
    popover.addEventListener('mouseleave', (e) => {
      const toEl = e.relatedTarget instanceof Element ? e.relatedTarget : null;
      if (toEl?.closest('.sticky-tab-btn')) return;
      if (popoverCloseTimer !== null) window.clearTimeout(popoverCloseTimer);
      popoverCloseTimer = window.setTimeout(hidePopover, 180);
    });
  }

  nodes.forEach((node) => {
    const btn = Array.from(node.children).find((el): el is HTMLElement =>
      el.classList.contains('sticky-tab-btn')
    );
    const targetId = node.getAttribute('data-id');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      hidePopover();
      markClickScrolling();
      setActiveHeading(targetId);
      scrollToHeading(targetId);
    });

    btn.addEventListener('mouseenter', () => {
      if (popoverCloseTimer !== null) {
        window.clearTimeout(popoverCloseTimer);
        popoverCloseTimer = null;
      }
      if (popoverHoverTimer !== null) window.clearTimeout(popoverHoverTimer);
      popoverHoverTimer = window.setTimeout(() => showPopoverForNode(node, btn), 120);
    });

    btn.addEventListener('mouseleave', (e) => {
      if (popoverHoverTimer !== null) {
        window.clearTimeout(popoverHoverTimer);
        popoverHoverTimer = null;
      }
      const toEl = e.relatedTarget instanceof Node ? e.relatedTarget : null;
      if (popover && toEl && popover.contains(toEl)) return;
      if (popoverCloseTimer !== null) window.clearTimeout(popoverCloseTimer);
      popoverCloseTimer = window.setTimeout(hidePopover, 180);
    });
  });

  if (!scrollCloseBound.has(scrollContainer)) {
    scrollCloseBound.add(scrollContainer);
    scrollContainer.addEventListener('scroll', hidePopover, { passive: true });
  }

  if (!wheelBoundBars.has(tabsBar)) {
    wheelBoundBars.add(tabsBar);
    let wheelTarget: number | null = null;
    let wheelFrame: number | null = null;
    const maxScrollLeft = () => Math.max(0, tabsBar.scrollWidth - tabsBar.clientWidth);

    const glide = () => {
      if (wheelTarget === null) {
        wheelFrame = null;
        return;
      }
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
        if (isVerticalTabs()) return;
        const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        if (!delta) return;

        const from = wheelTarget ?? tabsBar.scrollLeft;
        const to = Math.max(0, Math.min(maxScrollLeft(), from + delta));
        if (to === from) return;

        e.preventDefault();
        wheelTarget = to;
        if (wheelFrame === null) wheelFrame = requestAnimationFrame(glide);
      },
      { passive: false }
    );
  }

  const jumpTo = (position: 'start' | 'end'): void => {
    hidePopover();
    scrollContainer.scrollTo({
      top: position === 'end' ? scrollContainer.scrollHeight : 0,
      behavior: 'smooth',
    });
  };

  (
    [
      ['btn-sticky-top', 'start'],
      ['btn-sticky-bottom', 'end'],
    ] as const
  ).forEach(([id, position]) => {
    const button = document.getElementById(id);
    if (!button || jumpBoundButtons.has(button)) return;
    jumpBoundButtons.add(button);
    button.addEventListener('click', (e) => {
      e.preventDefault();
      jumpTo(position);
    });
  });

  const firstNode = nodes[0];
  if (firstNode && !tabsBar.querySelector('.sticky-tab-node.is-active')) {
    setActiveHeading(firstNode.getAttribute('data-id'));
  }

  return (currentId: string) => setActiveHeading(currentId);
}

export function setupBookViewInteraction(): void {
  const tocLinks = Array.from(document.querySelectorAll<HTMLElement>('.book-toc-link'));
  const scrollContainer = document.getElementById('book-content-scroll');
  const hasTabs = Boolean(document.getElementById('sticky-tabs-bar'));

  if (scrollContainer && (tocLinks.length > 0 || hasTabs)) {
    let headingTargets: HeadingTarget[] = tocLinks
      .map((link): HeadingTarget | null => {
        const id = link.getAttribute('data-target');
        const el = id ? findHeadingInView(id, false) : null;
        return id && el ? { id, el, link } : null;
      })
      .filter((item): item is HeadingTarget => item !== null);

    if (headingTargets.length === 0) {
      const headingEls = Array.from(
        scrollContainer.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id]')
      );
      headingTargets = headingEls.map((el) => ({
        id: el.id,
        el,
        link: null,
      }));
    }

    let updateStickyTabs: ((currentId: string) => void) | null = null;

    const spy = createScrollSpy({
      container: scrollContainer,
      headingTargets,
      tocLinks,
      headingLine: 80,
      isActiveView: () => document.documentElement.getAttribute('data-view') !== 'classic',
      onActiveChange: (currentId) => {
        updateStickyTabs?.(currentId);
        syncHeadingHash(currentId);
      },
    });

    activeBookSpy?.destroy();
    activeBookSpy = spy;

    tocLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-target');
        if (!targetId) return;
        const targetEl = findHeadingInView(targetId, false);
        if (targetEl) {
          spy.markClickScrolling(800);
          scrollContainer.scrollTo({
            top: computeScrollOffset(scrollContainer, targetEl, 16),
            behavior: 'smooth',
          });
          tocLinks.forEach((l) => l.classList.remove('is-active'));
          link.classList.add('is-active');
          syncHeadingHash(targetId);
        }
      });
    });

    updateStickyTabs = setupStickyTabs(scrollContainer, headingTargets, () => {
      spy.markClickScrolling(800);
    });

    const requested = requestedHeadingId();
    const settle = (): void => {
      if (requested) {
        const target = findHeadingInView(requested, false);
        if (target) {
          scrollContainer.scrollTo({
            top: computeScrollOffset(scrollContainer, target, 16),
            behavior: 'auto',
          });
        }
      }
      spy.update();
    };
    settle();
    window.setTimeout(settle, 80);
  }

  setupNavPane();
  setupLookupPane();
  bindDataPaneToggle();

  const container = document.getElementById('wiki-book-view');
  requestAnimationFrame(() => {
    container?.classList.add('is-ready');
  });

  updateRecentNotes();
}
