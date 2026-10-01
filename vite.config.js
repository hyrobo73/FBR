import { resolve } from 'node:path';
import { sites } from '@openai/sites-vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sites()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        gwangju: resolve(process.cwd(), 'gwangju.html'),
      },
    },
  },
});
