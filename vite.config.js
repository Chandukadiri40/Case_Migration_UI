import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'security-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: http://localhost:8081 http://localhost:5173");
          res.setHeader('X-Frame-Options', 'DENY');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          next();
        });
      }
    }
  ],
  server: {
    proxy: {
      // All /api/* requests are forwarded to the backend during dev.
      // Change the target to match your backend port.
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
    },
  },
})
