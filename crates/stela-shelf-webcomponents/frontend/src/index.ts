/**
 * `stela-shelf-webcomponents` frontend entry point.
 * Clean, strictly-typed ES modules with zero `window.TMT` global namespace pollution.
 */

import { registerCustomElements } from './components';
import { initPage } from './init';
import { setupDevServerLiveReload } from './live-reload';
import { navigateTo, setupClientRouter } from './router';

registerCustomElements();

function bootstrap(): void {
  const handleNavigate = (url: string): void => {
    void navigateTo(url, true);
  };
  initPage(handleNavigate);
  setupClientRouter();
  setupDevServerLiveReload(() => initPage(handleNavigate));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
