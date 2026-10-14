import {useState} from 'react';
import type {Go} from '../App';
import {sfx} from '../game/audio';
import {carById, tune} from '../game/cars';
import {HEATS} from '../game/pursuit';
import {fmt, money, save, useSave} from '../lib/save';
import {Back, Check, Lock, SirenIcon, Star} from './icons';

/** Pick a heat level (1–5) before a police pursuit. Each level unlocks by escaping the one before. */
export default function Pursuit({go}: {go: Go}) {
  const s = useSave();
  const P = s.pursuit;
  const H = HEATS[P.heat - 1];
  const car = carById(s.car);
  const top = tune(car.stats).topMph;
  const kmh = s.settings.units === 'kmh';
  const spd = (mph: number) => (kmh ? `${Math.round(mph * 1.609)} km/h` : `${Math.round(mph)} mph`);
  const boost = top * tune(car.stats).nitroBoost;
  const copTop = top * H.speed;
  const pct = Math.round(H.speed * 100);
  const [peek, setPeek] = useState(0); // a locked heat that has focus
  const w = (mph: number) => `${(mph / boost) * 100}%`;

  const start = () => {
    if (P.heat > P.unlocked) return sfx.deny();
    go('chase');
  };

  return (
    <div className={`pursuit heat-${H.level}`}>
      <div className="pursuit-bars" aria-hidden="true" />
      <header className="screen-head">
        <button type="button" className="back-btn" onClick={() => history.back()} aria-label="Back">
          <Back />
          Pursuit
        </button>
        <span className="head-cash">{money(s.cash)}</span>
      </header>

      <section className="heat-hero">
        <div className="heat-stars" aria-label={`Heat ${H.level} of 5`}>
          {HEATS.map(h => (
            <Star key={h.level} size={30} filled={h.level <= H.level} className={h.level <= H.level ? 'is-on' : ''} />
          ))}
        </div>
        <h2>{H.name}</h2>
        <p>{H.blurb}</p>
      </section>

      <div className="heat-row" role="group" aria-label="Heat level">
        {HEATS.map(h => {
          const locked = h.level > P.unlocked;
          const esc = P.escapes[h.level - 1];
          return (
            <button
              key={h.level}
              type="button"
              className={`heat-tile${h.level === P.heat ? ' is-on' : ''}${locked ? ' is-locked' : ''}`}
              data-autofocus={h.level === P.heat ? true : undefined}
              onFocus={() => {
                setPeek(locked ? h.level : 0);
                if (!locked) save.setHeat(h.level);
              }}
              onBlur={() => setPeek(0)}
              onClick={() => (locked ? sfx.deny() : start())}
              aria-label={locked ? `Heat ${h.level}, locked. Escape heat ${h.level - 1} to unlock` : `Heat ${h.level}, ${h.name}${esc ? `, escaped ${esc} times` : ''}`}
            >
              <b>{h.level}</b>
              <span className="heat-tile-stars">{'★'.repeat(h.level)}</span>
              {locked ? (
                <Lock size={12} />
              ) : esc > 0 ? (
                <small className="heat-done">
                  <Check size={10} /> {esc}
                </small>
              ) : (
                <small>New</small>
              )}
            </button>
          );
        })}
      </div>

      <div className="heat-stats">
        <div className="hs">
          <small>Units</small>
          <b>
            {H.cops}
            {H.max > H.cops ? ` → ${H.max}` : ''}
          </b>
        </div>
        <div className="hs">
          <small>Cop top speed</small>
          <b className={pct >= 100 ? 'warn' : ''}>
            {spd(copTop)} <em>{pct}%</em>
          </b>
        </div>
        <div className="hs">
          <small>To escape</small>
          <b>{H.escape}s out of sight</b>
        </div>
        <div className="hs">
          <small>Multiplier</small>
          <b className="gold">
            +×{H.rate.toFixed(3).replace(/0$/, '')}/s <em>max ×{H.cap}</em>
          </b>
        </div>
      </div>

      <div className="heat-tags">
        <span className="tag">PIT maneuvers</span>
        {H.max > 1 && <span className="tag">Backup</span>}
        {H.ahead && <span className="tag">Units ahead</span>}
        {H.roadblock > 0 && <span className="tag">Roadblocks</span>}
        {H.heli && <span className="tag is-heli">Helicopter</span>}
        <span className="tag is-gold">Escape bonus {money(H.bonus)} × multiplier</span>
      </div>

      <div className="vs" aria-label="Top speed: you versus the police">
        <div className="vs-row">
          <span>{car.name}</span>
          <div className="vs-track">
            <i className="vs-nitro" style={{width: '100%'}} />
            <i className="vs-you" style={{width: w(top)}} />
          </div>
          <b>
            {spd(top)} <em>nitro {spd(boost)}</em>
          </b>
        </div>
        <div className="vs-row">
          <span>Police</span>
          <div className="vs-track">
            <i className="vs-cop" style={{width: w(copTop)}} />
          </div>
          <b className={copTop >= top ? 'warn' : ''}>{spd(copTop)}</b>
        </div>
      </div>

      <p className="heat-record">
        {P.escapes[H.level - 1] > 0
          ? `Escaped ${P.escapes[H.level - 1]}× at this heat · best ${fmt(P.best[H.level - 1])}`
          : 'Not escaped at this heat yet'}
        {P.busts > 0 ? ` · busted ${P.busts}× in total` : ''}
      </p>

      <button type="button" className="action-btn is-chase" onClick={start}>
        <SirenIcon size={18} /> Start chase
        {P.best[H.level - 1] > 0 && <small>Best {fmt(P.best[H.level - 1])}</small>}
      </button>
      <p className={`heat-note${peek ? ' is-peek' : ''}`}>
        {peek
          ? `Heat ${peek} (${HEATS[peek - 1].name}) unlocks when you escape heat ${peek - 1}.`
          : 'Escape to keep everything. Get busted or wreck and you lose the chase payout.'}
      </p>
    </div>
  );
}
