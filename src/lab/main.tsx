import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Lab } from './Lab.tsx';
import { Crash } from '../app/ui/Crash.tsx';
import '../app/theme.css';

/** 崩 arena-lab.html#crash shows the crash screen, which nothing else can make appear on purpose. */
function Boom(): never {
  throw new Error('A test error, thrown on purpose by arena-lab.html#crash');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {location.hash === '#crash' ? <Crash><Boom /></Crash> : <Lab />}
  </StrictMode>,
);
