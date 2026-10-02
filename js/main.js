import { App } from './app.js';
import { QUICK_EXIT_URL } from './config.js';

/**
 * Quick exit: replaces the current history entry, so "Back" does not return here.
 * Wired up first, before anything that could fail.
 */
function quickExit(event) {
  event?.preventDefault();
  window.location.replace(QUICK_EXIT_URL);
}

document.querySelector('[data-quick-exit]')?.addEventListener('click', quickExit);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') quickExit(event);
});

// The dissolve effect redraws text in a canvas, so fonts must be ready first.
document.fonts.ready.then(() => {
  document.documentElement.classList.add('is-ready');
  new App().start();
});
