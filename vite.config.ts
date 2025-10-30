// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, 
    port: 5173,
  },
  define: {
    global: 'globalThis',
    __DEV__: true,
    'process.env': {},
  },
  resolve: {
    conditions: ['browser', 'development'],
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
    ],
  },
  optimizeDeps: {
    include: ['react-native-web'],
    exclude: [
      'react-native',
      'react-native-safe-area-context',
      'react-native-gesture-handler',
      'react-native-reanimated',
      'react-native-screens',
    ],
  },
})