import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relativo, porque o mesmo build é servido por um host web e de dentro do APK.
  base: './',
  build: { target: 'es2020' },
});
