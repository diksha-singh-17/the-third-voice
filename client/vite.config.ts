import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { join } from 'node:path';

export default defineConfig({
  root: __dirname,
  envDir: join(__dirname, '..'),
  plugins: [react()],
  server: {
    port: 5173,
  },
});
