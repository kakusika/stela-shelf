/**
 * Atomic Web Components (<tmt-btn>, <tmt-badge>, <tmt-icon>, <tmt-swatch>, <tmt-switch>).
 * Hydrates Declarative Shadow DOM cleanly without duplicate Tab stops or listener leaks.
 */

import { ensureShadowRoot } from './dom';
import { withBasePath } from './env';

export class TmtBtn extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['active', 'disabled', 'title', 'aria-label', 'href', 'class'];
  }

  private _btn: HTMLButtonElement | null = null;
  private _bound = false;

  connectedCallback(): void {
    ensureShadowRoot(this);
    this._btn = this.shadowRoot?.querySelector<HTMLButtonElement>('.tmt-btn-inner') ?? null;
    this._syncAttributes();

    if (!this._bound) {
      this._bound = true;
      this.addEventListener('click', (e) => this._handleClick(e));
    }
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
    this._syncAttributes();
  }

  private _isActive(): boolean {
    return (
      this.hasAttribute('active') ||
      this.classList.contains('active') ||
      this.classList.contains('is-active')
    );
  }

  private _handleClick(e: MouseEvent): void {
    if (this.hasAttribute('disabled')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    const href = this.getAttribute('href');
    if (href && !this._isActive() && !e.defaultPrevented) {
      window.location.href = href;
    }
  }

  private _syncAttributes(): void {
    if (!this._btn) return;

    const disabled = this.hasAttribute('disabled');
    const active = this._isActive();
    const title = this.getAttribute('title');
    const ariaLabel = this.getAttribute('aria-label');

    // Focus belongs solely to the inner <button> inside Shadow DOM so Tab never stops twice.
    if (disabled) {
      this.setAttribute('aria-disabled', 'true');
      this._btn.disabled = true;
    } else {
      this.removeAttribute('aria-disabled');
      this._btn.disabled = false;
    }

    if (active) {
      this.setAttribute('aria-pressed', 'true');
      this._btn.setAttribute('aria-pressed', 'true');
    } else {
      this.removeAttribute('aria-pressed');
      this._btn.removeAttribute('aria-pressed');
    }

    if (title !== null) this._btn.title = title;
    if (ariaLabel !== null) this._btn.setAttribute('aria-label', ariaLabel);
  }
}

export class TmtBadge extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['href', 'title', 'aria-label'];
  }

  private _bound = false;

  connectedCallback(): void {
    ensureShadowRoot(this);
    this._syncHref();

    if (!this._bound) {
      this._bound = true;
      this.addEventListener('click', (e) => this._handleClick(e));
      this.addEventListener('keydown', (e) => this._handleKeyDown(e));
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
    if (name === 'href') {
      this._syncHref();
    }
  }

  private _syncHref(): void {
    const href = this.getAttribute('href');
    const innerLink = this.shadowRoot?.querySelector<HTMLAnchorElement>('a.tmt-badge-inner');
    if (innerLink) {
      if (href) innerLink.setAttribute('href', href);
      else innerLink.removeAttribute('href');
      return;
    }

    // Only make the host focusable if there is no inner <a> element in shadow DOM.
    if (href) {
      if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
      if (!this.hasAttribute('role')) this.setAttribute('role', 'link');
    } else {
      if (this.getAttribute('role') === 'link') this.removeAttribute('role');
      if (this.getAttribute('tabindex') === '0') this.removeAttribute('tabindex');
    }
  }

  private _handleClick(e: MouseEvent): void {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (e.composedPath().some((el) => el instanceof Element && el.tagName === 'A')) return;

    const href = this.getAttribute('href');
    if (href) {
      window.location.href = href;
    }
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    const href = this.getAttribute('href');
    if (!href) return;
    if (e.key === 'Enter' && e.target === this) {
      e.preventDefault();
      window.location.href = href;
    }
  }
}

export class TmtIcon extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['name', 'size', 'pkg'];
  }

  connectedCallback(): void {
    ensureShadowRoot(this);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
    if ((name === 'name' || name === 'pkg') && this.shadowRoot) {
      const use = this.shadowRoot.querySelector('use');
      const iconName = this.getAttribute('name');
      const pkg = this.getAttribute('pkg') || 'lucide';
      if (use && iconName) {
        use.setAttribute('href', withBasePath(`/icons/${pkg}.svg#${iconName}`));
      }
    }
  }
}

export class TmtSwatch extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['checked', 'disabled', 'title'];
  }

  private _bound = false;

  connectedCallback(): void {
    ensureShadowRoot(this);
    if (!this.hasAttribute('role')) this.setAttribute('role', 'radio');
    this._syncAttributes();

    if (!this._bound) {
      this._bound = true;
      this.addEventListener('click', (e) => this._handleClick(e));
      this.addEventListener('keydown', (e) => this._handleKeyDown(e));
    }
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
    this._syncAttributes();
  }

  private _siblings(): TmtSwatch[] {
    const group = this.closest('[role="radiogroup"]');
    if (!group) return [this];
    return Array.from(group.querySelectorAll<TmtSwatch>('tmt-swatch'));
  }

  private _syncAttributes(): void {
    const checked = this.hasAttribute('checked');
    const disabled = this.hasAttribute('disabled');
    this.setAttribute('aria-checked', checked ? 'true' : 'false');

    if (disabled) {
      this.setAttribute('aria-disabled', 'true');
      this.setAttribute('tabindex', '-1');
      return;
    }
    this.removeAttribute('aria-disabled');

    const siblings = this._siblings();
    const anyChecked = siblings.some((s) => s.hasAttribute('checked'));
    const isTabStop = anyChecked ? checked : siblings[0] === this;
    this.setAttribute('tabindex', isTabStop ? '0' : '-1');
  }

  private _handleClick(e: MouseEvent): void {
    if (this.hasAttribute('disabled')) {
      e.preventDefault();
      return;
    }
    this.focus();
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (this.hasAttribute('disabled')) return;
    const moveKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!moveKeys.includes(e.key)) return;
    e.preventDefault();

    const siblings = this._siblings().filter((s) => !s.hasAttribute('disabled'));
    if (siblings.length === 0) return;
    const idx = siblings.indexOf(this);

    let nextIdx: number;
    if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = siblings.length - 1;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      nextIdx = (idx - 1 + siblings.length) % siblings.length;
    } else {
      nextIdx = (idx + 1) % siblings.length;
    }

    const next = siblings[nextIdx];
    next?.click();
    next?.focus();
  }
}

export class TmtSwitch extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['checked', 'disabled', 'title'];
  }

  private _bound = false;

  connectedCallback(): void {
    ensureShadowRoot(this);
    if (!this.hasAttribute('role')) this.setAttribute('role', 'switch');
    if (!this.hasAttribute('tabindex') && !this.hasAttribute('disabled')) {
      this.setAttribute('tabindex', '0');
    }
    this._syncAttributes();

    if (!this._bound) {
      this._bound = true;
      this.addEventListener('click', (e) => {
        if (this.hasAttribute('disabled')) e.preventDefault();
      });
      this.addEventListener('keydown', (e) => {
        if (this.hasAttribute('disabled')) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.click();
        }
      });
    }
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
    this._syncAttributes();
  }

  private _syncAttributes(): void {
    const checked = this.hasAttribute('checked');
    const disabled = this.hasAttribute('disabled');
    this.setAttribute('aria-checked', checked ? 'true' : 'false');

    if (disabled) {
      this.setAttribute('aria-disabled', 'true');
      this.setAttribute('tabindex', '-1');
    } else {
      this.removeAttribute('aria-disabled');
      if (this.getAttribute('tabindex') === '-1') this.setAttribute('tabindex', '0');
    }
  }
}

export function registerCustomElements(): void {
  if (!customElements.get('tmt-btn')) customElements.define('tmt-btn', TmtBtn);
  if (!customElements.get('tmt-badge')) customElements.define('tmt-badge', TmtBadge);
  if (!customElements.get('tmt-icon')) customElements.define('tmt-icon', TmtIcon);
  if (!customElements.get('tmt-swatch')) customElements.define('tmt-swatch', TmtSwatch);
  if (!customElements.get('tmt-switch')) customElements.define('tmt-switch', TmtSwitch);
}
