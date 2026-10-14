// Player save: cash, XP, garage, records, missions and settings. Stored on this pair of glasses.
import {useSyncExternalStore} from 'react';
import {CARS, PAINTS, carById} from '../game/cars';
import type {RunResult} from '../game/engine';

const KEY = 'cutup.save.v1';

export type MissionStat = 'nearMisses' | 'topSpeed' | 'score' | 'bestCombo' | 'insane' | 'distance' | 'threads' | 'nitros' | 'close' | 'heat';

export interface Mission {
  id: string;
  stat: MissionStat;
  goal: number;
  cash: number;
  xp: number;
}

export interface Save {
  cash: number;
  xp: number; // total XP earned
  owned: string[];
  car: string;
  paint: Record<string, string>;
  best: {score: number; distance: number; speed: number; combo: number; nearMisses: number};
  totals: {runs: number; nearMisses: number; miles: number; cashEarned: number};
  missions: Mission[];
  missionTier: Record<string, number>;
  settings: {sound: boolean; units: 'mph' | 'kmh'};
  seenTutorial: boolean;
  pursuit: Pursuit;
}

export interface Pursuit {
  unlocked: number; // highest heat you can start
  heat: number; // last heat picked
  escapes: number[]; // per heat
  best: number[]; // best escaped score per heat
  busts: number;
  seenTutorial: boolean;
}

// ---- Levels ----------------------------------------------------------------------
export const MAX_LEVEL = 50;
/** XP needed to go from level L to L+1. */
export const xpStep = (l: number) => Math.round(500 * Math.pow(l, 1.4));
export function levelOf(xp: number): {level: number; into: number; need: number} {
  let level = 1;
  let left = xp;
  while (level < MAX_LEVEL && left >= xpStep(level)) {
    left -= xpStep(level);
    level++;
  }
  return {level, into: left, need: xpStep(level)};
}
export const levelReward = (l: number) => 500 + l * 400;

// ---- Missions --------------------------------------------------------------------
const MISSION_DEFS: {id: string; stat: MissionStat; goals: number[]}[] = [
  {id: 'near', stat: 'nearMisses', goals: [8, 15, 25, 40, 60, 90]},
  {id: 'speed', stat: 'topSpeed', goals: [120, 140, 160, 180, 200, 230, 260]},
  {id: 'score', stat: 'score', goals: [10_000, 25_000, 50_000, 100_000, 200_000, 400_000]},
  {id: 'combo', stat: 'bestCombo', goals: [3, 5, 7, 10]},
  {id: 'insane', stat: 'insane', goals: [1, 3, 6, 10]},
  {id: 'dist', stat: 'distance', goals: [1, 2, 3.5, 5, 8]},
  {id: 'thread', stat: 'threads', goals: [1, 3, 6]},
  {id: 'nitro', stat: 'nitros', goals: [2, 4, 7]},
  {id: 'close', stat: 'close', goals: [3, 8, 15, 25]},
  {id: 'heat', stat: 'heat', goals: [1, 2, 3, 4, 5]},
];

export function missionText(m: Mission, units: 'mph' | 'kmh' = 'mph'): string {
  const n = m.goal;
  switch (m.stat) {
    case 'nearMisses':
      return `Get ${n} near misses in one run`;
    case 'topSpeed':
      return units === 'kmh' ? `Hit ${Math.round(n * 1.609)} km/h` : `Hit ${n} mph`;
    case 'score':
      return `Score ${n.toLocaleString('en-US')} in one run`;
    case 'bestCombo':
      return `Build a ×${n} combo`;
    case 'insane':
      return `Pull ${n} insane near miss${n > 1 ? 'es' : ''} in one run`;
    case 'distance':
      return units === 'kmh' ? `Drive ${(n * 1.609).toFixed(1)} km in one run` : `Drive ${n} miles in one run`;
    case 'threads':
      return `Thread the needle ${n} time${n > 1 ? 's' : ''} in one run`;
    case 'nitros':
      return `Use nitro ${n} times in one run`;
    case 'close':
      return `Get ${n} close calls in one run`;
    case 'heat':
      return `Escape the police at heat ${n} or higher`;
  }
}

function makeMission(defIdx: number, tier: number): Mission {
  const d = MISSION_DEFS[defIdx];
  const t = Math.min(tier, d.goals.length - 1);
  return {id: `${d.id}-${t}`, stat: d.stat, goal: d.goals[t], cash: 750 + t * 900, xp: 400 + t * 500};
}

function freshMission(save: Save, exclude: string[]): Mission {
  const pool = MISSION_DEFS.map((d, i) => ({d, i})).filter(({d}) => !exclude.includes(d.id));
  const {d, i} = pool[Math.floor(Math.random() * pool.length)];
  return makeMission(i, save.missionTier[d.id] ?? 0);
}

const defId = (m: Mission) => m.id.split('-')[0];

// ---- Store -----------------------------------------------------------------------
function initial(): Save {
  const s: Save = {
    cash: 2_500,
    xp: 0,
    owned: ['pocket'],
    car: 'pocket',
    paint: {},
    best: {score: 0, distance: 0, speed: 0, combo: 0, nearMisses: 0},
    totals: {runs: 0, nearMisses: 0, miles: 0, cashEarned: 0},
    missions: [],
    missionTier: {},
    settings: {sound: true, units: 'mph'},
    seenTutorial: false,
    pursuit: {unlocked: 1, heat: 1, escapes: [0, 0, 0, 0, 0], best: [0, 0, 0, 0, 0], busts: 0, seenTutorial: false},
  };
  s.missions = [makeMission(0, 0), makeMission(1, 0), makeMission(4, 0)];
  return s;
}

function load(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const base = initial();
      const s = {...base, ...JSON.parse(raw)} as Save;
      s.pursuit = {...base.pursuit, ...s.pursuit};
      if (!s.owned.includes(s.car)) s.car = s.owned[0] ?? 'pocket';
      return s;
    }
  } catch {
    /* fall through */
  }
  return initial();
}

let state: Save = load();
const listeners = new Set<() => void>();
function set(next: Save) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: keep playing in memory */
  }
  listeners.forEach(l => l());
}

export function useSave(): Save {
  return useSyncExternalStore(
    l => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export interface RunReward {
  result: RunResult;
  cash: number; // from score
  xp: number;
  missionsDone: Mission[];
  missionCash: number;
  missionXp: number;
  levelBefore: number;
  levelAfter: number;
  levelCash: number;
  xpBefore: number;
  unlocks: string[]; // car names newly available to buy
  newBest: boolean;
  lostCash: number; // pursuit: the payout lost to a bust
  heatUnlocked: number; // pursuit: a newly unlocked heat level (0 = none)
}

export const save = {
  get: () => state,

  buyCar(id: string): boolean {
    const car = carById(id);
    const lvl = levelOf(state.xp).level;
    if (state.owned.includes(id) || state.cash < car.price || lvl < car.level) return false;
    set({...state, cash: state.cash - car.price, owned: [...state.owned, id], car: id});
    return true;
  },
  selectCar(id: string) {
    if (state.owned.includes(id)) set({...state, car: id});
  },
  setPaint(carId: string, paintId: string) {
    const p = PAINTS.find(x => x.id === paintId);
    if (!p || levelOf(state.xp).level < p.level) return;
    set({...state, paint: {...state.paint, [carId]: paintId}});
  },
  paintFor(carId: string) {
    return state.paint[carId] ?? carById(carId).paint;
  },
  setSetting<K extends keyof Save['settings']>(k: K, v: Save['settings'][K]) {
    set({...state, settings: {...state.settings, [k]: v}});
  },
  seenTutorial() {
    if (!state.seenTutorial) set({...state, seenTutorial: true});
  },
  seenPursuitTutorial() {
    if (!state.pursuit.seenTutorial) set({...state, pursuit: {...state.pursuit, seenTutorial: true}});
  },
  setHeat(h: number) {
    if (h >= 1 && h <= state.pursuit.unlocked && h !== state.pursuit.heat) set({...state, pursuit: {...state.pursuit, heat: h}});
  },

  /** Apply a finished run: pay out, level up, tick missions, record bests. */
  finishRun(r: RunResult): RunReward {
    // A bust (or wreck) in a pursuit forfeits the whole chase payout; XP still counts.
    const busted = r.heat > 0 && !r.escaped;
    const earned = Math.round(r.score / 10);
    const cash = busted ? 0 : earned;
    const xp = Math.round(r.score / 7) + Math.round(r.distance * 120);
    const before = levelOf(state.xp).level;
    const stats: Record<MissionStat, number> = {
      nearMisses: r.nearMisses,
      topSpeed: r.topSpeed,
      score: r.score,
      bestCombo: r.bestCombo,
      insane: r.insane,
      distance: r.distance,
      threads: r.threads,
      nitros: r.nitros,
      close: r.close,
      heat: r.escaped ? r.heat : 0,
    };
    const done = state.missions.filter(m => stats[m.stat] >= m.goal);
    const missionCash = done.reduce((s, m) => s + m.cash, 0);
    const missionXp = done.reduce((s, m) => s + m.xp, 0);
    const tier = {...state.missionTier};
    for (const m of done) tier[defId(m)] = (tier[defId(m)] ?? 0) + 1;
    let next: Save = {...state, missionTier: tier};
    const keep = state.missions.filter(m => !done.includes(m));
    const missions = [...keep];
    while (missions.length < 3) missions.push(freshMission(next, missions.map(defId)));
    const totalXp = state.xp + xp + missionXp;
    const after = levelOf(totalXp).level;
    let levelCash = 0;
    for (let l = before + 1; l <= after; l++) levelCash += levelReward(l);
    const unlocks = CARS.filter(c => c.level > before && c.level <= after).map(c => c.name);
    const newBest = !busted && r.score > state.best.score;
    const P = state.pursuit;
    let heatUnlocked = 0;
    let pursuit = P;
    if (r.heat > 0) {
      const i = r.heat - 1;
      if (r.escaped && r.heat === P.unlocked && P.unlocked < 5) heatUnlocked = P.unlocked + 1;
      pursuit = {
        ...P,
        unlocked: Math.max(P.unlocked, heatUnlocked),
        escapes: P.escapes.map((v, k) => (k === i && r.escaped ? v + 1 : v)),
        best: P.best.map((v, k) => (k === i && r.escaped ? Math.max(v, r.score) : v)),
        busts: P.busts + (busted ? 1 : 0),
      };
    }
    next = {
      ...next,
      pursuit,
      missions,
      xp: totalXp,
      cash: state.cash + cash + missionCash + levelCash,
      best: {
        score: busted ? state.best.score : Math.max(state.best.score, r.score),
        distance: Math.max(state.best.distance, r.distance),
        speed: Math.max(state.best.speed, r.topSpeed),
        combo: Math.max(state.best.combo, r.bestCombo),
        nearMisses: Math.max(state.best.nearMisses, r.nearMisses),
      },
      totals: {
        runs: state.totals.runs + 1,
        nearMisses: state.totals.nearMisses + r.nearMisses,
        miles: Math.round((state.totals.miles + r.distance) * 100) / 100,
        cashEarned: state.totals.cashEarned + cash + missionCash + levelCash,
      },
    };
    const reward: RunReward = {result: r, cash, xp, missionsDone: done, missionCash, missionXp, levelBefore: before, levelAfter: after, levelCash, xpBefore: state.xp, unlocks, newBest, lostCash: busted ? earned : 0, heatUnlocked};
    set(next);
    return reward;
  },

  reset() {
    set(initial());
  },
};

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
export const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
