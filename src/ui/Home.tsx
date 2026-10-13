import {useEffect, useRef} from 'react';
import type {Go} from '../App';
import {setSoundEnabled} from '../game/audio';
import {carById, paintById, rating} from '../game/cars';
import {Game} from '../game/engine';
import {levelOf, money, save, useSave, fmt} from '../lib/save';
import {Flag, GarageIcon, Gauge, Logo, Play, Sound} from './icons';

/** The live highway behind the menus: your car cruising through traffic on autopilot. */
export function AttractRoad({carId, paintId}: {carId: string; paintId: string}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const car = carById(carId);
    const g = new Game(ref.current!, {car, paint: paintById(paintId), mode: 'attract', units: 'mph'});
    g.start();
    return () => g.stop();
  }, [carId, paintId]);
  return <canvas ref={ref} className="attract" aria-hidden="true" />;
}

export default function Home({go}: {go: Go}) {
  const s = useSave();
  const car = carById(s.car);
  const paintId = save.paintFor(car.id);
  const lv = levelOf(s.xp);
  return (
    <div className="home">
      <AttractRoad carId={car.id} paintId={paintId} />
      <div className="home-shade" />
      <header className="home-top">
        <div className="home-brand">
          <Logo size={0.82} />
          <span>Night highway. No brakes.</span>
        </div>
        <div className="player">
          <div className="player-lv" style={{'--p': `${(lv.into / lv.need) * 100}%`} as React.CSSProperties}>
            <b>{lv.level}</b>
          </div>
          <div className="player-meta">
            <span className="player-cash">{money(s.cash)}</span>
            <span className="player-xp">
              Level {lv.level} · {fmt(lv.into)}/{fmt(lv.need)} XP
            </span>
          </div>
        </div>
      </header>

      <nav className="home-menu" aria-label="Main menu">
        <button type="button" className="menu-btn is-primary" data-nav="drive" data-autofocus onClick={() => go('drive')}>
          <Play size={22} />
          <span>
            <b>Drive</b>
            <small>{s.best.score ? `Best ${fmt(s.best.score)}` : 'Hit the highway'}</small>
          </span>
        </button>
        <button type="button" className="menu-btn" data-nav="garage" onClick={() => go('garage')}>
          <GarageIcon size={20} />
          <span>
            <b>Garage</b>
            <small>
              {s.owned.length} of 10 cars
            </small>
          </span>
        </button>
        <button type="button" className="menu-btn" data-nav="career" onClick={() => go('career')}>
          <Flag size={20} />
          <span>
            <b>Career</b>
            <small>{s.missions.length} missions live</small>
          </span>
        </button>
        <div className="menu-row">
          <button
            type="button"
            className="chip-btn"
            data-nav="sound"
            onClick={() => {
              save.setSetting('sound', !s.settings.sound);
              setSoundEnabled(!s.settings.sound);
            }}
            aria-pressed={s.settings.sound}
            aria-label={s.settings.sound ? 'Sound on' : 'Sound off'}
          >
            <Sound off={!s.settings.sound} />
            {s.settings.sound ? 'Sound' : 'Muted'}
          </button>
          <button type="button" className="chip-btn" data-nav="units" onClick={() => save.setSetting('units', s.settings.units === 'mph' ? 'kmh' : 'mph')} aria-label={`Units ${s.settings.units}`}>
            <Gauge />
            {s.settings.units === 'mph' ? 'mph' : 'km/h'}
          </button>
        </div>
      </nav>

      <div className="home-car">
        <span className="home-car-tier">{car.tier}</span>
        <b>{car.name}</b>
        <span className="home-car-rating">{rating(car.stats)}</span>
      </div>
    </div>
  );
}
