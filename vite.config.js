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
        seongnam: resolve(process.cwd(), 'resto_seongnam.html'),
        hanam: resolve(process.cwd(), 'resto_hanam.html'),
        suwon: resolve(process.cwd(), 'resto_suwon.html'),
        hs: resolve(process.cwd(), 'resto_hs.html'),
        gm: resolve(process.cwd(), 'resto_gm.html'),
        gimpo: resolve(process.cwd(), 'resto_gimpo.html'),
        bucheon: resolve(process.cwd(), 'resto_bucheon.html'),
        nyj: resolve(process.cwd(), 'resto_nyj.html'),
        icheon: resolve(process.cwd(), 'resto_icheon.html'),
      },
    },
  },
});
