import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // IMPORTANT: Change this to match your exact GitHub repository name
  base: '/abstrak-notes/', 
  
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true // Allows testing offline features in localhost
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'] // Caches these files for offline mode
      },
      manifest: {
        name: 'Abstrak Notes',
        short_name: 'Abstrak',
        description: 'Offline-first iPad note-taking application',
        theme_color: '#f5f5f5',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});