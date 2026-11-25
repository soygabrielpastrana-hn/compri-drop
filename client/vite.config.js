import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// En desarrollo, /api se reenvía al backend (puerto 4000): no hay problemas de CORS.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173,
  proxy: { '/api': 'http://localhost:4000' },
  headers: { 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups' } },
});
