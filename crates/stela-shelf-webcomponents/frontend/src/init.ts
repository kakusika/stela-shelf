/**
 * Unified idempotent page initializer invoked on initial load, PJAX navigation,
 * and dev-server hot DOM swaps.
 */

import { setupBookViewInteraction } from './book-view';
import { initCenterPeek, type NavigateHandler } from './center-peek';
import { setupClassicViewInteraction } from './classic-view';
import {
  setupDraggableFloatingControls,
  setupFloatingCollapse,
  setupTabsSideSwitcher,
  setupViewSwitcher,
  syncViewMode,
} from './controls';
import { setupCodeCopy, setupEditDropdown, setupSourceViewer } from './dev-tools';
import { setupCostumeSwitchers } from './infobox';
import { initKeyboardNavigation } from './keyboard';
import { initImageLightbox } from './lightbox';
import { initPagePreview } from './preview';
import { syncVisitedClasses } from './recent-notes';
import { setupSearch } from './search';
import { setupThemeToggle } from './theme';

export function initPage(onNavigate?: NavigateHandler): void {
  syncViewMode();
  setupThemeToggle();
  setupDraggableFloatingControls();
  setupFloatingCollapse();
  setupViewSwitcher();
  setupTabsSideSwitcher();
  setupBookViewInteraction();
  setupClassicViewInteraction();
  initKeyboardNavigation();
  setupSearch();
  initPagePreview();
  initCenterPeek(onNavigate);
  initImageLightbox();
  setupCostumeSwitchers();
  setupEditDropdown();
  setupSourceViewer();
  setupCodeCopy();
  syncVisitedClasses();
}
