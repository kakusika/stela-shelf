/**
 * Infobox multi-image costume switcher (`.infobox-image-section`) and
 * per-row clipboard copy button (`.infobox-copy-btn`).
 */

import { copyTextToClipboard } from './dom';
import { t } from './env';

const costumeBoundSections = new WeakSet<HTMLElement>();
const originalBtnMarkup = new WeakMap<HTMLElement, string>();
const copyResetTimers = new WeakMap<HTMLElement, number>();
let infoboxCopyBound = false;

const CHECK_SVG = `<svg viewBox="0 0 24 24" width="12" height="12" stroke="#10b981" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

export function setupCostumeSwitchers(): void {
  document.querySelectorAll<HTMLElement>('.infobox-image-section').forEach((section) => {
    if (costumeBoundSections.has(section)) return;
    costumeBoundSections.add(section);

    const img = section.querySelector<HTMLImageElement>('.infobox-main-img');
    const switcher = section.querySelector<HTMLElement>('.infobox-costume-switcher');
    const wrapper = section.querySelector<HTMLElement>('.infobox-image-wrapper');
    if (!img) return;

    const buttons = switcher
      ? Array.from(switcher.querySelectorAll<HTMLElement>('.costume-btn'))
      : [];

    const selectCostume = (index: number): void => {
      if (buttons.length === 0) return;
      const targetBtn = buttons[(index + buttons.length) % buttons.length];
      if (!targetBtn || targetBtn.classList.contains('active')) return;
      const src = targetBtn.getAttribute('data-img-src');
      if (!src) return;

      img.style.opacity = '0.4';
      window.setTimeout(() => {
        img.src = src;
        const orig = targetBtn.getAttribute('data-original');
        if (orig) {
          img.setAttribute('data-original', orig);
        } else {
          img.removeAttribute('data-original');
        }
        img.style.opacity = '1';
      }, 80);

      // Sync both `.active` class and boolean `active` attribute so `<tmt-btn>` Shadow DOM
      // `:host([active])` highlights the selected thumbnail accurately.
      buttons.forEach((b) => {
        b.classList.remove('active');
        b.removeAttribute('active');
      });
      targetBtn.classList.add('active');
      targetBtn.setAttribute('active', '');
    };

    const getCurrentIndex = (): number => {
      const idx = buttons.findIndex(
        (b) => b.classList.contains('active') || b.hasAttribute('active')
      );
      return idx >= 0 ? idx : 0;
    };

    buttons.forEach((btn, idx) => {
      btn.addEventListener('click', () => selectCostume(idx));
    });

    section.querySelector('.costume-arrow.prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      selectCostume(getCurrentIndex() - 1);
    });
    section.querySelector('.costume-arrow.next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      selectCostume(getCurrentIndex() + 1);
    });

    if (wrapper) {
      let touchStartX = 0;
      let touchStartY = 0;
      wrapper.addEventListener(
        'touchstart',
        (e) => {
          if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
          }
        },
        { passive: true }
      );
      wrapper.addEventListener(
        'touchend',
        (e) => {
          if (e.changedTouches.length === 1 && buttons.length > 1) {
            const deltaX = e.changedTouches[0].clientX - touchStartX;
            const deltaY = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
              selectCostume(getCurrentIndex() + (deltaX > 0 ? -1 : 1));
            }
          }
        },
        { passive: true }
      );
    }
  });

  if (infoboxCopyBound) return;
  infoboxCopyBound = true;

  document.addEventListener('click', async (e) => {
    const target = e.target instanceof Element ? e.target : null;
    const btn = target?.closest<HTMLElement>('.infobox-copy-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const td = btn.closest('.infobox-data');
    if (!td) return;

    const valEl = td.querySelector('.infobox-data-val') ?? td;
    const clone = valEl.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.infobox-copy-btn').forEach((b) => b.remove());
    const text = (clone.textContent || '').trim();
    if (!text) return;

    try {
      await copyTextToClipboard(text);

      if (!originalBtnMarkup.has(btn)) {
        originalBtnMarkup.set(btn, btn.innerHTML);
      }

      btn.classList.add('is-copied');
      btn.innerHTML = CHECK_SVG;
      const copiedLabel = t('infobox.copied', 'コピーしました');
      btn.setAttribute('title', copiedLabel);
      btn.setAttribute('aria-label', copiedLabel);

      const prevTimer = copyResetTimers.get(btn);
      if (prevTimer !== undefined) window.clearTimeout(prevTimer);

      const resetTimer = window.setTimeout(() => {
        btn.classList.remove('is-copied');
        const orig = originalBtnMarkup.get(btn);
        if (orig !== undefined) btn.innerHTML = orig;
        const copyLabel = t('infobox.copy', 'コピー');
        btn.setAttribute('title', copyLabel);
        btn.setAttribute('aria-label', copyLabel);
        copyResetTimers.delete(btn);
      }, 1800);
      copyResetTimers.set(btn, resetTimer);
    } catch {
      // Ignore clipboard write errors
    }
  });
}
