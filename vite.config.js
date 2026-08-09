import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // App 100% offline: nessuna chiamata di rete a servizi esterni.
      // Precache di tutto il bundle (JS/CSS/HTML/icone) + dati clinici in data/.
      includeAssets: ['favicon.svg', 'icons.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff,woff2}'],
        // Nessun runtimeCaching verso rete esterna: tutto viene servito dalla cache
        // generata al build. Le SPA route ricadono su index.html.
        navigateFallback: 'index.html',
      },
      manifest: {
        id: '/',
        name: 'AnestEasy',
        short_name: 'AnestEasy',
        description:
          'Strumento offline di supporto in sala operatoria e rianimazione per anestesisti: dosaggi, calcolatori, presidi e algoritmi guidati dal profilo paziente.',
        lang: 'it',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      devOptions: {
        // Abilita il service worker anche in `npm run dev` per poterlo testare offline in sviluppo.
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
