import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Enable PWA unconditionally instead of using environment variable
      enabled: true,
      manifest: {
        name: "Products 2025",
        short_name: "Products",
        description: "Product Management Application",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#1976d2",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },
      devOptions: {
        // Enable in development mode
        enabled: true
      }
    })
  ],
  define: {
    BUILD_TIME: JSON.stringify(new Date().toISOString())
  },
  server: {
    port: 3000,
    // Add history API fallback for client-side routing
    historyApiFallback: true,
  },
  preview: {
    port: 3000,
    // Also add for preview mode
    historyApiFallback: true,
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
