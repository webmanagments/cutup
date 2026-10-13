import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root mount element');

// The design is a 600×600 canvas. If the host reports a smaller viewport, scale down to fit.
function fit() {
  const s = Math.min(window.innerWidth, window.innerHeight) / 600;
  root!.style.zoom = s > 0 && s < 0.999 ? String(Math.round(s * 1000) / 1000) : '';
}
fit();
window.addEventListener('resize', fit);

if (/[?&]debug\b/.test(location.search)) void import('./lib/debug').then(m => m.installDebug());
const Lineup = lazy(() => import('./dev/Lineup'));
const DriveTest = lazy(() => import('./dev/DriveTest'));
const lineup = /[?&]lineup\b/.test(location.search);
const drive = /[?&]drive\b/.test(location.search);

createRoot(root).render(
  <StrictMode>
    {lineup || drive ? (
      <Suspense fallback={null}>{drive ? <DriveTest /> : <Lineup />}</Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
