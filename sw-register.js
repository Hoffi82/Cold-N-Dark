(() => {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(reg => {
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(err => console.warn('PWA-Service-Worker konnte nicht registriert werden:', err));
  });
})();
