import { resolve } from 'node:path';
import { sites } from '@openai/sites-vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sites()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        yongin: resolve(process.cwd(), 'resto_yongin.html'),
        gwangju: resolve(process.cwd(), 'resto_gwangju.html'),
        sungnam: resolve(process.cwd(), 'resto_sungnam.html'),
      },
    },
  },
});
