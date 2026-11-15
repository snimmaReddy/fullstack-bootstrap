import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// /api/* is proxied to the .NET API, so the UI never hard-codes the API URL.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5080' },
  },
});
