/**
 * Book-view keyboard shortcuts (`[` / `]` / `Alt+Arrow` horizontal pane scroll,
 * `t` TOC toggle, `d` data-pane toggle).
 */

import { isEditableTarget } from './dom';

let keyNavInitialized = false;

export function initKeyboardNavigation(): void {
  if (keyNavInitialized) return;
  keyNavInitialized = true;

  window.addEventListener('keydown', (e) => {
    if (isEditableTarget(e.target)) return;
    if (document.documentElement.getAttribute('data-view') !== 'book') return;

    const bookView = document.getElementById('wiki-book-view');
    if (e.key === ']' || (e.key === 'ArrowRight' && e.altKey)) {
      bookView?.scrollBy({ left: 360, behavior: 'smooth' });
    } else if (e.key === '[' || (e.key === 'ArrowLeft' && e.altKey)) {
      bookView?.scrollBy({ left: -360, behavior: 'smooth' });
    } else if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      document.getElementById('btn-rail-toc')?.click();
    } else if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const paneData = document.getElementById('pane-data');
      if (paneData) {
        if (paneData.classList.contains('is-collapsed')) {
          document.getElementById('bar-expand-data')?.click();
        } else {
          document.getElementById('header-collapse-data')?.click();
        }
      }
    }
  });
}
