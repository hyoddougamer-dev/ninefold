import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite marks its own script and stylesheet tags `crossorigin`, which is harmless on the
 * web and fatal behind a service worker: a request in CORS mode may not be answered with
 * a `basic` response, so every cached asset is rejected with ERR_FAILED and the game
 * opens offline as a blank page with the right title. The files are same-origin, so the
 * attribute buys nothing — out it comes.
 */
const noCrossOrigin = {
  name: 'no-crossorigin',
  transformIndexHtml(html: string) {
    return html.replace(/\s+crossorigin(?=[\s>])/g, '');
  },
};

export default defineConfig({
  plugins: [react(), noCrossOrigin],
  // Relativo, porque o mesmo build é servido por um host web e de dentro do APK.
  base: './',
  build: {
    target: 'es2020',
    // Duas entradas: o jogo, e o banco de ensaios da arena.
    rollupOptions: { input: { main: 'index.html', lab: 'arena-lab.html' } },
  },
});
