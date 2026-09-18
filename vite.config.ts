import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative, because the same build is served from a web host and from inside the APK.
  base: './',
  build: { target: 'es2020' },
});
