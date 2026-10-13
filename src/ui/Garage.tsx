import {useEffect, useRef, useState} from 'react';
import type {Go} from '../App';
import {sfx} from '../game/audio';
import {CARS, PAINTS, carById, paintById, rating, type Stats} from '../game/cars';
import {levelOf, money, save, useSave} from '../lib/save';
import {dirOf, setKeyCapture} from '../lib/spatial';
import CarSide from './CarSide';
import {Back, Check, Lock} from './icons';

const STAT_ROWS: {k: keyof Stats; label: string; max: number; min: number; unit?: string}[] = [
  {k: 'top', label: 'Top speed', min: 120, max: 280, unit: 'mph'},
  {k: 'accel', label: 'Acceleration', min: 0, max: 100},
  {k: 'handling', label: 'Handling', min: 0, max: 100},
  {k: 'nitro', label: 'Nitro', min: 0, max: 100},
];

export default function Garage({go}: {go: Go}) {
  const s = useSave();
  const lv = levelOf(s.xp).level;
  const [idx, setIdx] = useState(() => Math.max(0, CARS.findIndex(c => c.id === s.car)));
  const [dir, setDir] = useState<1 | -1>(1);
  const [flash, setFlash] = useState(0);
  const stageRef = useRef<HTMLButtonElement>(null);
  const car = CARS[idx];
  const owned = s.owned.includes(car.id);
  const current = carById(s.car);
  const paintId = save.paintFor(car.id);
  const paint = paintById(paintId);
  const locked = lv < car.level;
  const short = car.price - s.cash;

  const step = (d: 1 | -1) => {
    setDir(d);
    setIdx(i => (i + d + CARS.length) % CARS.length);
  };

  // While the showroom stage has focus, left/right flip through the cars.
  useEffect(() => {
    setKeyCapture(e => {
      if (document.activeElement !== stageRef.current) return false;
      const d = dirOf(e);
      if (d === 'left' || d === 'right') {
        step(d === 'left' ? -1 : 1);
        return true;
      }
      return false;
    });
    return () => setKeyCapture(null);
  }, []);

  const act = () => {
    if (owned) {
      if (s.car === car.id) go('drive');
      else {
        save.selectCar(car.id);
        sfx.select();
        setFlash(f => f + 1);
      }
      return;
    }
    if (locked || short > 0) {
      sfx.deny();
      return;
    }
    if (save.buyCar(car.id)) {
      sfx.buy();
      setFlash(f => f + 1);
    }
  };

  const label = owned
    ? s.car === car.id
      ? 'Drive this car'
      : 'Select'
    : locked
      ? `Unlocks at level ${car.level}`
      : short > 0
        ? `Need ${money(short)} more`
        : `Buy for ${money(car.price)}`;

  return (
    <div className="garage">
      <header className="screen-head">
        <button type="button" className="back-btn" onClick={() => history.back()} aria-label="Back">
          <Back />
          Garage
        </button>
        <span className="head-cash">{money(s.cash)}</span>
      </header>

      <button
        ref={stageRef}
        type="button"
        className={`stage${locked ? ' is-locked' : ''}`}
        data-autofocus
        onClick={() => step(1)}
        aria-label={`${car.name}. Swipe left or right for other cars`}
      >
        <span className="stage-spot" />
        <span className="stage-arrow is-left" aria-hidden="true">
          ‹
        </span>
        <div className="stage-car" key={`${car.id}-${paint.id}`} data-dir={dir}>
          <CarSide car={car} paint={paint} width={470} />
          <CarSide car={car} paint={paint} width={470} className="reflection" />
        </div>
        <span className="stage-arrow is-right" aria-hidden="true">
          ›
        </span>
        <span className="stage-count">
          {idx + 1} / {CARS.length}
        </span>
        {flash > 0 && <span className="stage-flash" key={flash} />}
      </button>

      <div className="car-info">
        <div className="car-title">
          <span className={`tier tier-${car.tier.toLowerCase()}`}>{car.tier}</span>
          <h2>{car.name}</h2>
          <span className="car-rating" title="Rating">
            {rating(car.stats)}
          </span>
          {owned && (
            <span className="owned">
              <Check size={12} /> {s.car === car.id ? 'Driving' : 'Owned'}
            </span>
          )}
        </div>
        <p className="car-blurb">{car.blurb}</p>
      </div>

      <div className="stats">
        {STAT_ROWS.map(r => {
          const v = car.stats[r.k];
          const c = current.stats[r.k];
          const pct = ((v - r.min) / (r.max - r.min)) * 100;
          const cpct = ((c - r.min) / (r.max - r.min)) * 100;
          const delta = v - c;
          return (
            <div key={r.k} className="stat">
              <span className="stat-label">{r.label}</span>
              <span className="stat-bar">
                <i className="stat-cur" style={{width: `${cpct}%`}} />
                <i className={`stat-val${delta > 0 ? ' is-up' : delta < 0 ? ' is-down' : ''}`} style={{width: `${pct}%`}} />
              </span>
              <span className="stat-num">
                {v}
                {r.unit ? ` ${r.unit}` : ''}
                {delta !== 0 && car.id !== current.id && <em className={delta > 0 ? 'up' : 'down'}>{delta > 0 ? `+${delta}` : delta}</em>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="paints" role="group" aria-label="Paint">
        {PAINTS.map(p => {
          const pl = lv < p.level;
          return (
            <button
              key={p.id}
              type="button"
              className={`swatch${p.id === paintId ? ' is-on' : ''}${pl ? ' is-locked' : ''}`}
              style={{'--c': p.base, '--l': p.light} as React.CSSProperties}
              onClick={() => {
                if (pl) return sfx.deny();
                save.setPaint(car.id, p.id);
                sfx.select();
              }}
              aria-label={pl ? `${p.name}, unlocks at level ${p.level}` : p.name}
              aria-pressed={p.id === paintId}
            >
              {pl && <Lock size={11} />}
            </button>
          );
        })}
        <span className="paint-name">{paint.name}</span>
      </div>

      <button
        type="button"
        className={`action-btn${owned ? (s.car === car.id ? ' is-go' : '') : locked || short > 0 ? ' is-off' : ' is-buy'}`}
        onClick={act}
        aria-disabled={!owned && (locked || short > 0)}
      >
        {!owned && locked && <Lock size={14} />}
        {label}
      </button>
    </div>
  );
}
