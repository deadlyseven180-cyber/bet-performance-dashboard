import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// API port can be overridden with VITE_API_PORT to avoid local port clashes.
const API_PORT = process.env.VITE_API_PORT ?? '4000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: Number(process.env.CLIENT_PORT ?? 5173),
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
