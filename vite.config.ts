import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // keep port stable so OAuth callback matches
    proxy: {
      // Forward frontend /api calls to backend during development to avoid CORS
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        // Remove the /api prefix when forwarding to the backend if the backend
        // mounts routes at the root (e.g. /auth/login). Without this rewrite
        // the backend will receive /api/auth/login which can cause 404.
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
