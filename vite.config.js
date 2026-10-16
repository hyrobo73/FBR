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
        gwacheon: resolve(process.cwd(), 'resto_gwacheon.html'),
        gapyung: resolve(process.cwd(), 'resto_gapyung.html'),
        yp: resolve(process.cwd(), 'resto_yp.html'),
        yc: resolve(process.cwd(), 'resto_yc.html'),
        ujb: resolve(process.cwd(), 'resto_ujb.html'),
        pj: resolve(process.cwd(), 'resto_pj.html'),
        pt: resolve(process.cwd(), 'resto_pt.html'),
        ansan: resolve(process.cwd(), 'resto_ansan.html'),
        goyang: resolve(process.cwd(), 'resto_goyang.html'),
        sh: resolve(process.cwd(), 'resto_sh.html'),
        ay: resolve(process.cwd(), 'resto_ay.html'),
        yj: resolve(process.cwd(), 'resto_yj.html'),
        gr: resolve(process.cwd(), 'resto_gr.html'),
        ddc: resolve(process.cwd(), 'resto_ddc.html'),
        ans: resolve(process.cwd(), 'resto_ans.html'),
        yaj: resolve(process.cwd(), 'resto_yaj.html'),
        os: resolve(process.cwd(), 'resto_os.html'),
        uw: resolve(process.cwd(), 'resto_uw.html'),
        pc: resolve(process.cwd(), 'resto_pc.html'),
        gup: resolve(process.cwd(), 'resto_gup.html'),
      },
    },
  },
});
