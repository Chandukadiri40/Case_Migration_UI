import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // All /api/* requests are forwarded to the backend during dev.
      // Change the target to match your backend port.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
    },
  },
})
