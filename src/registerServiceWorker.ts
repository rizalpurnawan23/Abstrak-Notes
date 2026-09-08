export const registerSW = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js') // Points to the service worker file at the root of your built public directory
        .then((registration) => {
          console.log('Service Worker registered successfully with scope:', registration.scope);
          
          // Optional: Check for updates to the service worker
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New content is available; please refresh.');
                }
              };
            }
          };
        })
        .catch((error) => {
          console.error('Error during service worker registration:', error);
        });
    });
  } else {
    console.warn('Service workers are not supported in this browser.');
  }
};