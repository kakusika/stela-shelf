/**
 * Theme (light/dark) and Stela shell palette (color, pattern, contrast) controller.
 */

import { storage } from './dom';
import { t } from './env';

const SHELL_COLORS = ['slate', 'violet', 'indigo', 'olive'] as const;
const SHELL_PATTERNS = ['marble', 'cloud', 'seigaiha', 'flourish', 'mesh', 'none'] as const;

type ShellColor = (typeof SHELL_COLORS)[number];
type ShellPattern = (typeof SHELL_PATTERNS)[number];

let globalListenersBound = false;

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getEffectiveTheme(): 'dark' | 'light' {
  const forced = document.documentElement.getAttribute('data-theme');
  if (forced === 'dark' || forced === 'light') return forced;
  const saved = storage.get('shelf-theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return getSystemTheme();
}

function syncThemeIcons(): void {
  const isDark = getEffectiveTheme() === 'dark';
  const titleStr = isDark
    ? t('theme.to_light', 'ライトモードに切替')
    : t('theme.to_dark', 'ダークモードに切替');

  document.querySelectorAll<HTMLElement>('.theme-toggle-btn, #btn-rail-theme').forEach((btn) => {
    btn.title = titleStr;
    btn.setAttribute('aria-label', titleStr);
  });
}

export function toggleTheme(): void {
  const nextTheme = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nextTheme);
  storage.set('shelf-theme', nextTheme);
  syncThemeIcons();
}

function getShellColor(): ShellColor {
  const attr = document.documentElement.getAttribute('data-shell-color');
  return (SHELL_COLORS as readonly string[]).includes(attr ?? '')
    ? (attr as ShellColor)
    : 'slate';
}

function setShellColor(color: string): void {
  const valid: ShellColor = (SHELL_COLORS as readonly string[]).includes(color)
    ? (color as ShellColor)
    : 'slate';
  if (valid === 'slate') {
    document.documentElement.removeAttribute('data-shell-color');
  } else {
    document.documentElement.setAttribute('data-shell-color', valid);
  }
  storage.set('shelf-shell-color', valid);
  syncShellUI();
}

function getShellPattern(): ShellPattern {
  const attr = document.documentElement.getAttribute('data-shell-pattern');
  return (SHELL_PATTERNS as readonly string[]).includes(attr ?? '')
    ? (attr as ShellPattern)
    : 'marble';
}

function setShellPattern(pattern: string): void {
  const valid: ShellPattern = (SHELL_PATTERNS as readonly string[]).includes(pattern)
    ? (pattern as ShellPattern)
    : 'marble';
  if (valid === 'marble') {
    document.documentElement.removeAttribute('data-shell-pattern');
  } else {
    document.documentElement.setAttribute('data-shell-pattern', valid);
  }
  storage.set('shelf-shell-pattern', valid);
  syncShellUI();
}

function getShellContrast(): 'normal' | 'high' {
  return document.documentElement.getAttribute('data-shell-contrast') === 'high'
    ? 'high'
    : 'normal';
}

function setShellContrast(contrast: 'normal' | 'high'): void {
  if (contrast === 'high') {
    document.documentElement.setAttribute('data-shell-contrast', 'high');
    storage.set('shelf-shell-contrast', 'high');
  } else {
    document.documentElement.removeAttribute('data-shell-contrast');
    storage.set('shelf-shell-contrast', 'normal');
  }
  syncShellUI();
}

function toggleShellContrast(): void {
  setShellContrast(getShellContrast() === 'high' ? 'normal' : 'high');
}

function syncShellUI(): void {
  const currentColor = getShellColor();
  const currentPattern = getShellPattern();
  const isHighContrast = getShellContrast() === 'high';

  document.querySelectorAll<HTMLElement>('.color-btn[data-shell-color]').forEach((btn) => {
    btn.toggleAttribute('checked', btn.dataset.shellColor === currentColor);
  });

  document.querySelectorAll<HTMLElement>('.pattern-btn[data-shell-pattern]').forEach((btn) => {
    btn.toggleAttribute('checked', btn.dataset.shellPattern === currentPattern);
  });

  const contrastBtn = document.getElementById('shell-contrast-toggle');
  contrastBtn?.toggleAttribute('checked', isHighContrast);
}

function closePalettePopover(): void {
  const popover = document.getElementById('shell-palette-popover');
  const paletteBtn = document.getElementById('btn-rail-palette');
  if (popover) popover.hidden = true;
  paletteBtn?.setAttribute('aria-expanded', 'false');
}

export function setupThemeToggle(): void {
  syncThemeIcons();
  syncShellUI();

  if (globalListenersBound) return;
  globalListenersBound = true;

  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!storage.get('shelf-theme')) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      syncThemeIcons();
    }
  });

  document.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;

    if (target.closest('.theme-toggle-btn, #btn-rail-theme')) {
      e.preventDefault();
      toggleTheme();
      return;
    }

    if (target.closest('#btn-rail-palette')) {
      e.stopPropagation();
      const popover = document.getElementById('shell-palette-popover');
      const paletteBtn = document.getElementById('btn-rail-palette');
      if (!popover || !paletteBtn) return;
      const willOpen = popover.hidden;
      popover.hidden = !willOpen;
      paletteBtn.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) syncShellUI();
      return;
    }

    const popoverHit = target.closest('#shell-palette-popover');
    if (popoverHit) {
      e.stopPropagation();
      const colorBtn = target.closest<HTMLElement>('.color-btn[data-shell-color]');
      if (colorBtn?.dataset.shellColor) {
        setShellColor(colorBtn.dataset.shellColor);
        return;
      }
      const patternBtn = target.closest<HTMLElement>('.pattern-btn[data-shell-pattern]');
      if (patternBtn?.dataset.shellPattern) {
        setShellPattern(patternBtn.dataset.shellPattern);
        return;
      }
      if (target.closest('#shell-contrast-toggle')) {
        toggleShellContrast();
      }
      return;
    }

    if (!target.closest('.rail-palette-container')) {
      closePalettePopover();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePalettePopover();
    }
  });
}
