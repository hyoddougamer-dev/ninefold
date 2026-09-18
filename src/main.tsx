import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.tsx';
import { BONE, GOLD, JADE, CINNABAR, LACQUER, LACQUER_HI, mix } from './art/palette.ts';
import './app/theme.css';

/**
 * The palette is defined once, in TypeScript, and handed to CSS here — so a colour can
 * never be introduced by editing a stylesheet. The previous build's art fell apart
 * because there was no single place that owned this.
 */
const TOKENS: Record<string, string> = {
  '--lacquer': LACQUER,
  '--lacquerHi': LACQUER_HI,
  '--bone': BONE,
  '--jade': JADE,
  '--jadeEdge': mix(JADE, LACQUER, 0.55),
  '--gold': GOLD,
  '--cinnabar': CINNABAR,
  '--edge': mix(LACQUER_HI, BONE, 0.09),
  '--dim': mix(BONE, LACQUER, 0.52),
};
for (const [k, v] of Object.entries(TOKENS)) document.documentElement.style.setProperty(k, v);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
