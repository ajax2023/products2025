import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Ensure a single, consistent manifest/service-worker is used
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: "Products 2025",
        short_name: "Products",
        description: "Product Management Application",
        id: "/",
        scope: "/",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#1976d2",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      devOptions: {
        // Enable in development mode
        enabled: true
      }
    })
  ],
  resolve: {
    alias: [],
  },
  optimizeDeps: {
    include: [
      'dexie',
      '@mui/material',
      '@mui/system',
      '@mui/icons-material',
      '@mui/utils',
      '@emotion/react',
      '@emotion/styled',
      'hast-util-whitespace',
      'unist-util-visit-parents',
    ],
  },
  define: {
    BUILD_TIME: JSON.stringify(new Date().toISOString())
  },
  server: {
    port: 3000
  },
  preview: {
    port: 3000
  },
  build: {
    // Ensure proper handling of dynamic imports
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
