import {lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {setSoundEnabled, sfx, unlockAudio} from './game/audio';
import {useSave} from './lib/save';
import {focusDefault, focusEl, focusIsLost, installSpatialNav} from './lib/spatial';
import Home from './ui/Home';

const Garage = lazy(() => import('./ui/Garage'));
const Career = lazy(() => import('./ui/Career'));
const Drive = lazy(() => import('./ui/Drive'));

export type Screen = 'home' | 'garage' | 'career' | 'drive';
export type Go = (s: Screen) => void;

/** The driving screen registers how it handles Back (pause, resume, or leave). */
export const backHandler: {current: (() => boolean) | null} = {current: null};

function settleFocus(apply: () => void) {
  requestAnimationFrame(apply);
  for (const ms of [160, 450]) setTimeout(() => focusIsLost() && apply(), ms);
}

function push(s: Screen, replace = false) {
  try {
    if (replace) history.replaceState({s}, '');
    else history.pushState({s}, '');
  } catch {
    /* history can be locked down in some web views */
  }
}

export default function App() {
  const s = useSave();
  const [screen, setScreen] = useState<Screen>('home');
  const [runKey, setRunKey] = useState(0);
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const lastButton = useRef<string | null>(null);

  useEffect(() => setSoundEnabled(s.settings.sound), [s.settings.sound]);

  useEffect(() => {
    const uninstall = installSpatialNav(() => {
      // Back: the driving screen decides first (pause / resume), otherwise go back a screen.
      if (screenRef.current === 'drive' && backHandler.current?.()) return;
      if (screenRef.current !== 'home') {
        sfx.back();
        history.back();
      } else if (focusIsLost()) focusDefault();
    });
    push('home', true);
    const onPop = (e: PopStateEvent) => {
      const next = ((e.state as {s?: Screen} | null)?.s ?? 'home') as Screen;
      // The glasses shell's Back while driving pauses instead of leaving.
      if (screenRef.current === 'drive' && next !== 'drive' && backHandler.current?.()) {
        push('drive');
        return;
      }
      setScreen(next);
    };
    window.addEventListener('popstate', onPop);
    const onKey = (e: KeyboardEvent) => {
      unlockAudio();
      if (screenRef.current !== 'drive' && /^Arrow/.test(e.key)) sfx.move();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', unlockAudio, true);
    document.addEventListener('click', unlockAudio, true);
    return () => {
      uninstall();
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', unlockAudio, true);
      document.removeEventListener('click', unlockAudio, true);
    };
  }, []);

  const go = useCallback<Go>(next => {
    if (next === screenRef.current && next !== 'drive') return;
    if (screenRef.current === 'home') lastButton.current = (document.activeElement as HTMLElement | null)?.dataset.nav ?? null;
    sfx.select();
    if (next === 'drive') setRunKey(k => k + 1);
    if (next === 'home') {
      history.back();
      return;
    }
    push(next, screenRef.current !== 'home');
    setScreen(next);
  }, []);

  // Focus: land on each screen's main control; coming home, return to the button used.
  const prev = useRef<Screen>(screen);
  useLayoutEffect(() => {
    const before = prev.current;
    prev.current = screen;
    if (screen === 'home' && before !== 'home' && lastButton.current) {
      const id = lastButton.current;
      settleFocus(() => focusEl(document.querySelector<HTMLElement>(`[data-nav="${id}"]`)) || focusDefault());
    } else if (screen !== 'drive') settleFocus(() => focusDefault());
  }, [screen]);

  useEffect(() => {
    settleFocus(() => focusDefault());
  }, []);

  return (
    <div className="app">
      {screen === 'home' && <Home go={go} />}
      <Suspense fallback={<div className="loading">Loading…</div>}>
        {screen === 'garage' && <Garage go={go} />}
        {screen === 'career' && <Career go={go} />}
        {screen === 'drive' && <Drive key={runKey} go={go} restart={() => setRunKey(k => k + 1)} />}
      </Suspense>
    </div>
  );
}
