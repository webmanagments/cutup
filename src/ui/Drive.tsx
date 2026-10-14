import {useEffect, useRef, useState} from 'react';
import {backHandler, type Go} from '../App';
import {sfx} from '../game/audio';
import {carById, paintById} from '../game/cars';
import {Game, type RunResult} from '../game/engine';
import {heatOf} from '../game/pursuit';
import {fmt, levelOf, missionText, money, save, useSave, type RunReward} from '../lib/save';
import {dirOf, focusDefault, focusEl, isEnter, setKeyCapture} from '../lib/spatial';
import {Check, GarageIcon, Play, SirenIcon} from './icons';

export default function Drive({go, restart, heat = 0}: {go: Go; restart: () => void; heat?: number}) {
  const s = useSave();
  const H = heat ? heatOf(heat) : null;
  const canvas = useRef<HTMLCanvasElement>(null);
  const hud = useRef<HTMLCanvasElement>(null);
  const surface = useRef<HTMLButtonElement>(null);
  const lastNitro = useRef(0);
  const game = useRef<Game | null>(null);
  const [phase, setPhase] = useState<'tutorial' | 'run' | 'paused' | 'results'>(() => ((heat ? save.get().pursuit.seenTutorial : save.get().seenTutorial) ? 'run' : 'tutorial'));
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [reward, setReward] = useState<RunReward | null>(null);
  const leaving = useRef(false);
  const leave = (to: 'home' | 'garage' | 'pursuit') => {
    leaving.current = true;
    go(to);
  };

  // Build the run once; start driving straight away unless the tutorial is showing.
  useEffect(() => {
    const st = save.get();
    const car = carById(st.car);
    const g = new Game(canvas.current!, {
      car,
      paint: paintById(save.paintFor(car.id)),
      mode: 'play',
      units: st.settings.units,
      hud: hud.current!,
      best: heat ? undefined : st.best.score,
      heat: heat || undefined,
      onEnd: (r: RunResult) => {
        const rw = save.finishRun(r);
        setReward(rw);
        setTimeout(() => {
          setPhase('results');
          if (rw.levelAfter > rw.levelBefore) sfx.levelUp();
          else sfx.cash();
        }, 350);
      },
    });
    game.current = g;
    if (/[?&]dev\b/.test(location.search)) (window as unknown as {__game: Game}).__game = g;
    if (phaseRef.current === 'run') g.start();
    else g.start(), g.setPaused(true);
    return () => {
      g.stop();
      game.current = null;
    };
  }, []);

  // Back pauses a run, resumes from pause, and leaves from the results.
  useEffect(() => {
    backHandler.current = () => {
      if (leaving.current) return false;
      const p = phaseRef.current;
      if (p === 'run') {
        game.current?.setPaused(true);
        setPhase('paused');
        sfx.back();
        return true;
      }
      if (p === 'paused') {
        resume();
        return true;
      }
      return false; // tutorial or results: Back goes to the menu
    };
    return () => {
      backHandler.current = null;
    };
  });

  // Raw driving input: swipes steer, up or pinch for nitro, down to brake.
  useEffect(() => {
    if (phase !== 'run') return;
    setKeyCapture(e => {
      const g = game.current;
      if (!g) return false;
      const d = dirOf(e);
      if (d === 'left') g.steer(-1);
      else if (d === 'right') g.steer(1);
      else if (d === 'up') g.nitro();
      else if (d === 'down') g.brake();
      else if (isEnter(e) || e.key === ' ') g.nitro();
      else return false;
      return true;
    });
    // Focus rests on the driving surface, so the glasses always have a focused control.
    requestAnimationFrame(() => focusEl(surface.current));
    return () => setKeyCapture(null);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'run') requestAnimationFrame(() => focusDefault());
  }, [phase]);

  function begin() {
    if (heat) save.seenPursuitTutorial();
    save.seenTutorial();
    sfx.select();
    game.current?.setPaused(false);
    setPhase('run');
  }

  function resume() {
    sfx.select();
    game.current?.setPaused(false);
    setPhase('run');
  }

  return (
    <div className="drive">
      <canvas ref={canvas} className="drive-canvas" aria-label="Highway" />
      <canvas ref={hud} className="drive-canvas" aria-hidden="true" />
      {phase === 'run' && (
        <button
          ref={surface}
          type="button"
          className="drive-surface"
          aria-label="Driving: swipe to change lanes, pinch for nitro"
          onClick={() => {
            // A pinch arrives as a click: nitro (once, even if the host also sends Enter).
            const now = performance.now();
            if (now - lastNitro.current < 250) return;
            lastNitro.current = now;
            game.current?.nitro();
          }}
        />
      )}

      {phase === 'tutorial' && H && (
        <div className="overlay">
          <div className="card tutorial">
            <h2>Lose the cops</h2>
            <ul className="controls">
              <li>
                <kbd>Radar</kbd>
                <span>Bottom left: units behind you. Red and blue glow = one is close.</span>
              </li>
              <li>
                <kbd>PIT</kbd>
                <span>A cop lines up beside you: swerve away or brake.</span>
              </li>
              <li>
                <kbd>Nitro</kbd>
                <span>Near misses refill it. Use it to break away.</span>
              </li>
            </ul>
            <p>
              Stay out of sight for <b>{H.escape} seconds</b> to escape and keep everything. The chase multiplier grows the longer you last. Get busted or wreck and you lose
              the chase payout.
            </p>
            <p className="tip">Lead cops into traffic: they crash too.</p>
            <button type="button" className="action-btn is-chase" data-autofocus onClick={begin}>
              <Play size={18} /> Start chase
            </button>
          </div>
        </div>
      )}

      {phase === 'tutorial' && !H && (
        <div className="overlay">
          <div className="card tutorial">
            <h2>How to cut up</h2>
            <ul className="controls">
              <li>
                <kbd>← →</kbd>
                <span>Swipe to change lanes</span>
              </li>
              <li>
                <kbd>↑</kbd>
                <span>Swipe up or pinch for nitro</span>
              </li>
              <li>
                <kbd>↓</kbd>
                <span>Swipe down to brake</span>
              </li>
            </ul>
            <p>
              Pass traffic close to build a combo. Your combo points are <b>at risk</b> until the combo timer runs out. Crash first and you lose them.
            </p>
            <p className="tip">Watch for blinkers: cars signal before they change lanes.</p>
            <button type="button" className="action-btn is-go" data-autofocus onClick={begin}>
              <Play size={18} /> Let's go
            </button>
          </div>
        </div>
      )}

      {phase === 'paused' && (
        <div className="overlay">
          <div className="card pause">
            <h2>Paused</h2>
            <button type="button" className="action-btn is-go" data-autofocus onClick={resume}>
              <Play size={18} /> Resume
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                game.current?.stop();
                restart();
              }}
            >
              Restart run
            </button>
            <button type="button" className="ghost-btn" onClick={() => leave('home')}>
              Quit to menu
            </button>
          </div>
        </div>
      )}

      {phase === 'results' && reward && <Results r={reward} units={s.settings.units} onAgain={restart} onGarage={() => leave(heat ? 'pursuit' : 'garage')} onHome={() => leave('home')} />}
    </div>
  );
}

function useCountUp(target: number, ms = 900, delay = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0) / ms));
      setV(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, delay]);
  return v;
}

function Results({r, units, onAgain, onGarage, onHome}: {r: RunReward; units: 'mph' | 'kmh'; onAgain: () => void; onGarage: () => void; onHome: () => void}) {
  const res = r.result;
  const score = useCountUp(res.score, 1100);
  const cash = useCountUp(r.cash + r.missionCash + r.levelCash, 900, 500);
  const before = levelOf(r.xpBefore);
  const after = levelOf(save.get().xp);
  const leveled = r.levelAfter > r.levelBefore;
  const [bar, setBar] = useState((before.into / before.need) * 100);
  useEffect(() => {
    const t = setTimeout(() => setBar(leveled ? 100 : (after.into / after.need) * 100), 400);
    const t2 = leveled ? setTimeout(() => setBar((after.into / after.need) * 100), 1300) : 0;
    return () => {
      clearTimeout(t);
      if (t2) clearTimeout(t2);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const kmh = units === 'kmh';
  const chase = res.heat > 0;
  const busted = chase && !res.escaped;
  return (
    <div className="overlay results">
      <div className="card res">
        <div className="res-head">
          {chase ? (
            <span className={`res-outcome ${res.escaped ? 'is-escaped' : 'is-busted'}`}>
              {res.escaped ? 'ESCAPED' : 'BUSTED'} · HEAT {res.heat} {'★'.repeat(res.heat)}
            </span>
          ) : (
            <span>{r.newBest ? 'New best score' : 'Run over'}</span>
          )}
          <b className={chase ? (res.escaped ? 'is-escaped' : '') : r.newBest ? 'is-best' : ''}>{fmt(score)}</b>
        </div>
        {chase ? (
          <div className="res-grid">
            <Cell label="Chase time" value={`${Math.round(res.chaseTime)}s`} />
            <Cell label="Multiplier" value={`×${res.peakMult.toFixed(2)}`} />
            <Cell label="Escape bonus" value={res.escaped ? fmt(res.escapeBonus) : '—'} />
            <Cell label="Cops wrecked" value={String(res.copsWrecked)} />
            <Cell label="PITs dodged" value={String(res.pitsDodged)} />
            <Cell label="Near misses" value={String(res.nearMisses)} />
          </div>
        ) : (
        <div className="res-grid">
          <Cell label="Distance" value={kmh ? `${(res.distance * 1.609).toFixed(2)} km` : `${res.distance.toFixed(2)} mi`} />
          <Cell label="Top speed" value={kmh ? `${Math.round(res.topSpeed * 1.609)} km/h` : `${res.topSpeed} mph`} />
          <Cell label="Near misses" value={String(res.nearMisses)} />
          <Cell label="Best combo" value={res.bestCombo ? `×${res.bestCombo}` : '—'} />
          <Cell label="Insane" value={String(res.insane)} />
          <Cell label="Threaded" value={String(res.threads)} />
        </div>
        )}
        {chase && !res.escaped && <p className="res-lost">{res.bustedBy === 'cop' ? 'Busted' : 'Wrecked in the chase'}: lost {money(r.lostCash)} payout</p>}
        {!chase && res.lostCombo > 0 && <p className="res-lost">Lost in the crash: {fmt(res.lostCombo)} combo points</p>}
        <div className="res-rewards">
          <div className="res-cash">
            <small>{busted ? 'Payout lost' : 'Earned'}</small>
            <b className={busted ? 'is-lost' : ''}>+{money(busted ? r.lostCash : cash)}</b>
            {busted && r.missionCash + r.levelCash > 0 && <small>Missions still paid {money(r.missionCash + r.levelCash)}</small>}
          </div>
          <div className="res-xp">
            <div className="res-xp-top">
              <span>{leveled ? `Level up! ${r.levelBefore} → ${r.levelAfter}` : `Level ${after.level}`}</span>
              <span>+{fmt(r.xp + r.missionXp)} XP</span>
            </div>
            <div className="xp-bar">
              <i style={{width: `${bar}%`}} />
            </div>
          </div>
        </div>
        {(r.missionsDone.length > 0 || r.unlocks.length > 0 || r.heatUnlocked > 0 || leveled) && (
          <ul className="res-list">
            {r.missionsDone.map(m => (
              <li key={m.id}>
                <Check size={12} /> {missionText(m, units)} <em>+{money(m.cash)}</em>
              </li>
            ))}
            {r.unlocks.map(u => (
              <li key={u} className="is-unlock">
                New car for sale: <b>{u}</b>
              </li>
            ))}
            {leveled && <li className="is-unlock">Level reward +{money(r.levelCash)}</li>}
            {r.heatUnlocked > 0 && <li className="is-unlock">Heat {r.heatUnlocked} unlocked: {heatOf(r.heatUnlocked).name}</li>}
          </ul>
        )}
        <div className="res-actions">
          <button type="button" className={`action-btn ${chase ? 'is-chase' : 'is-go'}`} data-autofocus onClick={onAgain}>
            <Play size={18} /> {chase ? 'Chase again' : 'Drive again'}
          </button>
          <button type="button" className="ghost-btn" onClick={onGarage}>
            {chase ? (
              <>
                <SirenIcon size={16} /> Heat
              </>
            ) : (
              <>
                <GarageIcon size={16} /> Garage
              </>
            )}
          </button>
          <button type="button" className="ghost-btn" onClick={onHome}>
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}

function Cell({label, value}: {label: string; value: string}) {
  return (
    <div className="cell">
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}
