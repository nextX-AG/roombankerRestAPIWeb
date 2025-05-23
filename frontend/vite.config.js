import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'evalarm.nextxiot.com'
    ],
    proxy: {
      '/api': {
        target: 'http://gateway:8000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
