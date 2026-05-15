import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    },
    headers: {
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https://images.evetech.net; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    }
  }
})
