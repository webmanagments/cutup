import type {Go} from '../App';
import {CARS, paintById} from '../game/cars';
import {fmt, levelOf, levelReward, missionText, money, useSave} from '../lib/save';
import CarSide from './CarSide';
import {Back, Check, Play} from './icons';

export default function Career({go}: {go: Go}) {
  const s = useSave();
  const lv = levelOf(s.xp);
  const next = CARS.find(c => c.level > lv.level);
  const units = s.settings.units;
  const speed = (mph: number) => (units === 'kmh' ? `${Math.round(mph * 1.609)} km/h` : `${Math.round(mph)} mph`);
  const dist = (mi: number) => (units === 'kmh' ? `${(mi * 1.609).toFixed(1)} km` : `${mi.toFixed(1)} mi`);
  return (
    <div className="career">
      <header className="screen-head">
        <button type="button" className="back-btn" onClick={() => history.back()} aria-label="Back">
          <Back />
          Career
        </button>
        <span className="head-cash">{money(s.cash)}</span>
      </header>

      <section className="level-card">
        <div className="level-num">
          <small>Level</small>
          <b>{lv.level}</b>
        </div>
        <div className="level-body">
          <div className="xp-bar">
            <i style={{width: `${(lv.into / lv.need) * 100}%`}} />
          </div>
          <div className="xp-text">
            <span>
              {fmt(lv.into)} / {fmt(lv.need)} XP
            </span>
            <span>Next level pays {money(levelReward(lv.level + 1))}</span>
          </div>
          {next && (
            <div className="next-unlock">
              <CarSide car={next} paint={paintById(next.paint)} width={96} />
              <span>
                <b>{next.name}</b> unlocks at level {next.level}
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="missions" aria-label="Missions">
        <h3>Missions</h3>
        {s.missions.map(m => (
          <div key={m.id} className="mission">
            <span className="mission-dot" />
            <span className="mission-text">{missionText(m, units)}</span>
            <span className="mission-reward">
              {money(m.cash)} · {fmt(m.xp)} XP
            </span>
          </div>
        ))}
        <p className="missions-note">Complete them in a single run. Finished missions are replaced with harder ones.</p>
      </section>

      <section className="records" aria-label="Records">
        <Rec label="Best score" value={fmt(s.best.score)} />
        <Rec label="Top speed" value={speed(s.best.speed)} />
        <Rec label="Longest run" value={dist(s.best.distance)} />
        <Rec label="Best combo" value={s.best.combo ? `×${s.best.combo}` : '—'} />
        <Rec label="Near misses" value={fmt(s.totals.nearMisses)} />
        <Rec label="Total distance" value={dist(s.totals.miles)} />
      </section>

      <div className="road-map" aria-label="Car unlocks">
        {CARS.map(c => {
          const open = lv.level >= c.level;
          return (
            <span key={c.id} className={`rm-stop${open ? ' is-open' : ''}${s.owned.includes(c.id) ? ' is-owned' : ''}`}>
              {s.owned.includes(c.id) ? <Check size={10} /> : <b>{c.level}</b>}
            </span>
          );
        })}
      </div>

      <button type="button" className="action-btn is-go" data-autofocus onClick={() => go('drive')}>
        <Play size={18} /> Drive
      </button>
    </div>
  );
}

function Rec({label, value}: {label: string; value: string}) {
  return (
    <div className="rec">
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}
