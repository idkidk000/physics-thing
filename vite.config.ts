import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src/'),
      '@root': __dirname,
    },
  },
  server: {
    allowedHosts: true,
  },
  base: './',
});
