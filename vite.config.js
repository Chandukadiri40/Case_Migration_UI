import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'security-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          res.setHeader('Content-Security-Policy', "default-src 'self' blob: data: 'unsafe-inline' 'unsafe-eval' http://localhost:8081 http://localhost:5173 http://localhost:5174; img-src 'self' blob: data: http://localhost:8081 http://localhost:5173 http://localhost:5174; frame-src 'self' blob: data: http://localhost:8081 http://localhost:5173 http://localhost:5174; object-src 'self' blob: data: http://localhost:8081; worker-src 'self' blob: data:;");
          res.setHeader('X-Frame-Options', 'SAMEORIGIN');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          next();
        });
      }
    }
  ],
  server: {
    proxy: {
      // All /api/* requests are forwarded to the backend during dev.
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
    },
  },
})
