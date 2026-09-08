import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from './registerServiceWorker';

// Inject global styles to eliminate double-tap gestures, page zooming, and touch callouts on WebKit/iPadOS
const globalStyles = document.createElement('style');
globalStyles.innerHTML = `
  html, body, #root {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden; /* Prevents rubber-banding on iPad */
    touch-action: none; /* Disables browser gestures like swipe-to-navigate or double-tap zoom */
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    background-color: #f5f5f5;
  }
  * {
    box-sizing: border-box;
  }
  canvas {
    touch-action: none;
  }
`;
document.head.appendChild(globalStyles);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the Service Worker to enable offline capability
registerSW();