(() => {
  // Theme toggle
  function initTheme() {
    const toggleBtn = document.querySelector('.theme-toggle');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('stela-theme', next);
    });
  }

  // Copy code blocks
  function initCodeCopy() {
    document.querySelectorAll('pre').forEach((pre) => {
      const code = pre.querySelector('code');
      if (!code) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-code-btn';
      btn.innerText = 'Copy';
      btn.style.position = 'absolute';
      btn.style.top = '0.5rem';
      btn.style.right = '0.5rem';
      btn.style.fontSize = '0.75rem';
      btn.style.padding = '2px 6px';
      btn.style.borderRadius = '3px';
      btn.style.cursor = 'pointer';
      btn.style.background = 'var(--surface-subtle)';
      btn.style.color = 'var(--text-muted)';
      btn.style.border = '1px solid var(--border)';

      pre.style.position = 'relative';
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code.innerText);
          btn.innerText = 'Copied!';
          setTimeout(() => {
            btn.innerText = 'Copy';
          }, 2000);
        } catch (e) {
          console.error('Failed to copy', e);
        }
      });
      pre.appendChild(btn);
    });
  }

  // LiveReload support
  function initLiveReload() {
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return;
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${wsProtocol}//${window.location.host}/live-reload`);

      ws.onmessage = (event) => {
        let data: any;
        try {
          data = JSON.parse(event.data);
        } catch {
          if (event.data === 'reload') data = { type: 'full' };
        }
        if (!data) return;

        if (data.type === 'css') {
          const links = document.querySelectorAll('link[rel="stylesheet"]');
          const ts = Date.now();
          links.forEach((el) => {
            const link = el as HTMLLinkElement;
            const url = new URL(link.href, window.location.href);
            url.searchParams.set('_stela_ts', String(ts));
            link.href = url.toString();
          });
        } else {
          window.location.reload();
        }
      };
      ws.onerror = () => {};
    } catch {}
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initCodeCopy();
    initLiveReload();
  });
})();
