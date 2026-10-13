// CUT UP driving engine: pseudo-3D night highway, traffic, scoring and HUD on one canvas.
import {Engine, sfx} from './audio';
import {carSprite, SPRITE_W, tune, type CarDef, type CarSprite, type Paint} from './cars';
import {glowSprite, lampSprite, skylineSprite, trafficPool, type TrafficSprite} from './traffic';

// ---- World constants ------------------------------------------------------------
export const W = 600;
export const H = 600;
const HORIZON = 232;
const SEG = 200;
const N_SEG = 9000;
const DRAW = 150;
const ROAD_W = 2200; // half width
const CAM_H = 1150;
const DEPTH = 0.84;
const PLAYER_Z = 1180;
const UPM = 88; // world units per second per mph
const SPR_K = 3.8; // world units per sprite pixel
export const LANES = [-0.75, -0.25, 0.25, 0.75];
// From behind you can't see your own car's length, so collisions use the part of it that's
// visible on screen: a traffic car only hits when its tail reaches your car's body in the
// picture (≈ 420 units ahead of your rear bumper), never your hidden nose.
const PLAYER_LEN = 420;
// Collision boxes match what's drawn, shrunk slightly so a paint-scrape graze isn't a crash.
const HIT_W = 0.88; // fraction of the drawn width
const HIT_L = 0.9; // fraction of the drawn length
const halfWidth = (spritePx: number) => ((spritePx / 2) * SPR_K) / ROAD_W;
const WALL = 2400; // tunnel wall height
const NEAR = 60; // near clip plane, world units in front of the camera
const LOD_3D = 9000; // traffic farther than this is a flat rear view (its depth is under a pixel or two)
const OCT_C = Array.from({length: 8}, (_, k) => Math.cos((k / 8) * Math.PI * 2));
const OCT_S = Array.from({length: 8}, (_, k) => Math.sin((k / 8) * Math.PI * 2));

// ---- Random -------------------------------------------------------------------
const rnd = Math.random;
const pick = <T>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// ---- Track --------------------------------------------------------------------
interface Track {
  curve: Float32Array;
  y: Float32Array;
  tunnel: Uint8Array; // 1 = inside, 2 = entrance portal
  lamp: Uint8Array;
  sign: Uint8Array; // overhead gantry
  bridge: Uint8Array; // overpass crossing above
}

function buildTrack(): Track {
  const curve = new Float32Array(N_SEG);
  const y = new Float32Array(N_SEG + 1);
  const tunnel = new Uint8Array(N_SEG);
  const lamp = new Uint8Array(N_SEG);
  const sign = new Uint8Array(N_SEG);
  const bridge = new Uint8Array(N_SEG);
  let i = 0;
  let h = 0;
  const add = (enter: number, hold: number, leave: number, c: number, dy: number) => {
    const total = enter + hold + leave;
    const start = h;
    for (let k = 0; k < total && i < N_SEG; k++, i++) {
      const cc = k < enter ? c * ease(k / enter) : k < enter + hold ? c : c * (1 - ease((k - enter - hold) / leave));
      curve[i] = cc;
      h = start + dy * ease((k + 1) / total);
      y[i + 1] = h;
    }
  };
  add(0, 260, 0, 0, 0);
  let sinceTunnel = 0;
  while (i < N_SEG - 900) {
    const r = rnd();
    if (sinceTunnel > 900 && r < 0.18) {
      const len = 180 + Math.floor(rnd() * 140);
      const s0 = i;
      add(30, len - 60, 30, (rnd() - 0.5) * 1.6, 0);
      for (let k = s0; k < i; k++) tunnel[k] = 1;
      tunnel[s0] = 2;
      sinceTunnel = 0;
      add(0, 60, 0, 0, 0);
      continue;
    }
    const s0 = i;
    if (r < 0.32) add(0, 80 + Math.floor(rnd() * 160), 0, 0, (rnd() - 0.5) * 1600 - h * 0.4);
    else add(40, 60 + Math.floor(rnd() * 140), 40, (rnd() < 0.5 ? -1 : 1) * (0.8 + rnd() * 2.6), rnd() < 0.5 ? (rnd() - 0.5) * 1800 - h * 0.4 : 0);
    sinceTunnel += i - s0;
  }
  // Ease back to flat ground so the loop joins cleanly.
  add(60, 200, 60, 0, -h);
  while (i < N_SEG) {
    y[i + 1] = 0;
    i++;
  }
  y[0] = 0;
  for (let k = 0; k < N_SEG; k++) {
    if (!tunnel[k] && k % 12 === 0) lamp[k] = 1;
    if (!tunnel[k] && k > 300 && k % 420 === 210) sign[k] = 1;
    if (!tunnel[k] && k > 300 && k % 560 === 400) bridge[k] = 1;
  }
  return {curve, y, tunnel, lamp, sign, bridge};
}

// ---- Entities -------------------------------------------------------------------
interface Car {
  spr: TrafficSprite;
  z: number; // centre, world units (unwrapped)
  x: number; // normalised lateral position
  lane: number;
  speed: number; // mph
  baseSpeed: number;
  signal: number; // -1 left, 1 right, 0 none
  signalT: number;
  fromX: number;
  toX: number;
  changeT: number; // <0 when not changing lanes
  passed: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: 'spark' | 'shard' | 'smoke';
}

// Score callouts live in small feeds at the screen edges, never over the road ahead.
interface Popup {
  text: string;
  sub: string;
  color: string;
  side: -1 | 1; // which edge feed
  y: number; // current (eased) position in the feed
  born: number;
}
const FEED_Y = 318; // newest callout's baseline; older ones stack upward
const FEED_GAP = 38;
const FEED_MAX = 3;

export interface RunResult {
  score: number;
  distance: number; // miles
  topSpeed: number;
  nearMisses: number;
  close: number;
  insane: number;
  threads: number;
  bestCombo: number;
  nitros: number;
  passed: number;
  time: number;
  lostCombo: number;
}

export interface GameOptions {
  car: CarDef;
  paint: Paint;
  mode: 'play' | 'attract';
  units: 'mph' | 'kmh';
  hud?: HTMLCanvasElement; // separate layer for the HUD (redrawn less often)
  best?: number; // personal best, for the mid-run "New best" moment
  onEnd?: (r: RunResult) => void;
}

const STATIC = {
  pool: null as TrafficSprite[] | null,
  lampL: null as HTMLCanvasElement | null,
  lampR: null as HTMLCanvasElement | null,
  amber: null as HTMLCanvasElement | null,
  white: null as HTMLCanvasElement | null,
  red: null as HTMLCanvasElement | null,
  cyan: null as HTMLCanvasElement | null,
  skyline: null as HTMLCanvasElement | null,
  skyGlow: null as HTMLCanvasElement | null,
  beam: null as HTMLCanvasElement | null,
  flame: null as HTMLCanvasElement | null,
};

function canvasOf(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  return c;
}

function statics() {
  if (!STATIC.pool) {
    STATIC.pool = trafficPool();
    STATIC.lampL = lampSprite(-1);
    STATIC.lampR = lampSprite(1);
    STATIC.amber = glowSprite('rgba(255,174,43,1)');
    STATIC.white = glowSprite('rgba(255,244,220,1)');
    STATIC.red = glowSprite('rgba(255,46,77,1)');
    STATIC.cyan = glowSprite('rgba(53,242,255,1)');
    STATIC.skyline = skylineSprite();
    STATIC.skyGlow = canvasOf(8, 150, g => {
      const gr = g.createLinearGradient(0, 0, 0, 150);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(40,30,70,.55)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 8, 150);
    });
    STATIC.beam = canvasOf(480, 170, g => {
      g.translate(240, 160);
      g.scale(1, 0.55);
      const hl = g.createRadialGradient(0, 0, 10, 0, 0, 240);
      hl.addColorStop(0, 'rgba(255,240,210,.13)');
      hl.addColorStop(0.6, 'rgba(255,240,210,.05)');
      hl.addColorStop(1, 'rgba(255,240,210,0)');
      g.fillStyle = hl;
      g.fillRect(-240, -300, 480, 320);
    });
    STATIC.flame = canvasOf(40, 80, g => {
      const fl = g.createRadialGradient(20, 10, 1, 20, 22, 46);
      fl.addColorStop(0, 'rgba(230,250,255,1)');
      fl.addColorStop(0.35, 'rgba(53,190,255,.9)');
      fl.addColorStop(1, 'rgba(40,80,255,0)');
      g.fillStyle = fl;
      g.beginPath();
      g.ellipse(20, 30, 14, 30, 0, 0, Math.PI * 2);
      g.fill();
    });
  }
  return STATIC as {[K in keyof typeof STATIC]: NonNullable<(typeof STATIC)[K]>};
}

// Asphalt shades from dark to lamp-lit, pre-built so drawing never builds colour strings.
const ROAD = ['#0e1117', '#12151b', '#181a1e', '#201f20', '#2a2723', '#352f27'];
const ROAD_ALT = ['#0c0f14', '#101318', '#16181c', '#1e1d1e', '#272521', '#312c25'];

export class Game {
  private ctx: CanvasRenderingContext2D;
  private hud: CanvasRenderingContext2D | null = null;
  private hudFrame = 0;
  private track = buildTrack();
  private S = statics();
  private sprite: CarSprite;
  private t: ReturnType<typeof tune>;
  private engine: Engine | null = null;
  private raf = 0;
  private last = 0;
  private running = false;
  private paused = false;

  // projection buffers
  private px = new Float32Array(DRAW + 1);
  private py = new Float32Array(DRAW + 1);
  private pw = new Float32Array(DRAW + 1);
  private ps = new Float32Array(DRAW + 1);
  private pz = new Float32Array(DRAW + 1);
  private xw = new Float32Array(DRAW + 1); // road centre (world x) per segment
  private yw = new Float32Array(DRAW + 1); // road height per segment
  private zBase = 0;
  private camY = 0;
  private dfov = DEPTH;
  // polygon scratch for the 3D traffic bodies: (z, lateral, height) triples
  private pa = new Float64Array(96);
  private pb = new Float64Array(96);
  private nv = 0;
  private pt = new Float64Array(2);
  private buckets: Car[][] = Array.from({length: DRAW}, () => []);

  // state
  pos = 0;
  speed = 0; // mph
  private lane = 1;
  private x = LANES[1];
  private fromX = LANES[1];
  private toX = LANES[1];
  private laneT = 1;
  private camX = LANES[1] * ROAD_W;
  private brakeT = 0;
  private nitroOn = false;
  private nitroTank = 0;
  private cars: Car[] = [];
  private parts: Particle[] = [];
  private popups: Popup[] = [];
  private skyX = 0;
  private time = 0;
  private state: 'countdown' | 'run' | 'crash' | 'over' = 'countdown';
  private countT = 3;
  private crashT = 0;
  private spin = 0;
  private shake = 0;
  private flash = 0;
  private slow = 1;
  private lastNear = {t: -9, side: 0};
  private lean = 0;
  private fov = 1; // eases up a touch during nitro
  private bestShown = false;
  // Adaptive quality: if frames run long on the glasses, draw less of the distance.
  private draw = DRAW;
  private slowFrames = 0;
  private fastFrames = 0;

  // scoring
  score = 0;
  private pending = 0;
  private combo = 0;
  private comboT = 0;
  private bankFx = 0;
  private bankAmt = 0;
  private res: RunResult = {score: 0, distance: 0, topSpeed: 0, nearMisses: 0, close: 0, insane: 0, threads: 0, bestCombo: 0, nitros: 0, passed: 0, time: 0, lostCombo: 0};

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: GameOptions,
  ) {
    // The glasses display is 600×600: render at native size (higher densities only cost fill rate).
    const dpr = 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    this.ctx = canvas.getContext('2d', {alpha: false})!;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (opts.hud) {
      opts.hud.width = W;
      opts.hud.height = H;
      this.hud = opts.hud.getContext('2d');
    }
    this.sprite = carSprite(opts.car, opts.paint);
    this.t = tune(opts.car.stats);
    this.nitroTank = this.t.nitroSecs * 0.5;
    if (opts.mode === 'attract') {
      this.state = 'run';
      this.speed = 105;
      this.lane = 2;
      this.x = this.fromX = this.toX = LANES[2];
    } else this.speed = 30;
    this.seedTraffic();
  }

  // ---- lifecycle ----
  start() {
    if (this.running) return;
    this.running = true;
    if (this.opts.mode === 'play') {
      const electric = this.opts.car.rear.exhaust === 'none';
      const pitch = 0.75 + (this.opts.car.stats.top - 140) / 300;
      this.engine = new Engine(pitch, electric);
      this.engine.start();
      sfx.count();
    }
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const raw = now - this.last;
      const dt = Math.min(0.05, raw / 1000);
      if (raw > 26) this.slowFrames++;
      else if (raw < 18) this.fastFrames++;
      if (this.slowFrames > 45) {
        this.draw = Math.max(90, this.draw - 20);
        this.slowFrames = this.fastFrames = 0;
      } else if (this.fastFrames > 240) {
        this.draw = Math.min(DRAW, this.draw + 10);
        this.slowFrames = this.fastFrames = 0;
      }
      this.last = now;
      if (!this.paused) this.update(dt * this.slow);
      this.render(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.engine?.stop();
    this.engine = null;
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (p) this.engine?.update(0, 1, false, true);
    this.last = performance.now();
  }

  get isOver() {
    return this.state === 'over';
  }

  // ---- input ----
  steer(dir: -1 | 1) {
    if (this.state === 'crash' || this.state === 'over' || this.paused) return;
    const next = clamp(this.lane + dir, 0, 3);
    if (next === this.lane) return;
    this.lane = next;
    this.fromX = this.x;
    this.toX = LANES[next];
    this.laneT = 0;
    sfx.lane(dir);
  }

  nitro() {
    if (this.state !== 'run' || this.paused || this.nitroOn) return;
    if (this.nitroTank < 0.6) {
      sfx.deny();
      return;
    }
    this.nitroOn = true;
    this.res.nitros++;
    sfx.nitro();
  }

  brake() {
    if (this.state !== 'run' || this.paused) return;
    this.brakeT = 0.6;
    this.nitroOn = false;
  }

  // ---- world helpers ----
  private segY(z: number) {
    const i = Math.floor(z / SEG);
    const f = (z - i * SEG) / SEG;
    const a = this.track.y[((i % N_SEG) + N_SEG) % N_SEG];
    const b = this.track.y[(((i % N_SEG) + N_SEG) % N_SEG) + 1];
    return a + (b - a) * f;
  }

  // Traffic arrives in loose rows. Each row leaves at least one lane open, and when a row
  // blocks three lanes its gap is always next to (or the same as) the previous row's gap,
  // so a clean line through always exists.
  private nextRow = 0;
  private prevOpen = [0, 1, 2, 3];

  private seedTraffic() {
    this.nextRow = this.pos + 6500;
    while (this.nextRow < this.pos + DRAW * SEG) this.spawnRow();
  }

  private spawnRow() {
    const z = this.nextRow;
    const diff = this.difficulty();
    const attract = this.opts.mode === 'attract';
    // Space rows by time, not distance: every car gets the same reaction window.
    const closing = Math.max(45, (attract ? 108 : this.t.topMph) - 62) * UPM;
    const gap = Math.max(4200, closing * (attract ? 1.6 : 1.5 - diff * 0.62) * (0.8 + rnd() * 0.5));
    this.nextRow += gap;
    const r = rnd();
    const k = attract ? (r < 0.6 ? 1 : 2) : r < 0.5 - diff * 0.25 ? 1 : r < 0.88 - diff * 0.12 ? 2 : 3;
    let lanes: number[];
    if (k === 3) {
      const reachable = [0, 1, 2, 3].filter(l => this.prevOpen.some(o => Math.abs(o - l) <= 1));
      const open = pick(reachable);
      lanes = [0, 1, 2, 3].filter(l => l !== open);
    } else {
      lanes = [0, 1, 2, 3].sort(() => rnd() - 0.5).slice(0, k);
    }
    // Don't drop a car on top of slower traffic already in that lane.
    lanes = lanes.filter(l => !this.cars.some(c => c.lane === l && Math.abs(c.z - z) < 2400));
    this.prevOpen = [0, 1, 2, 3].filter(l => !lanes.includes(l));
    for (const l of lanes) this.spawnCar(z + (rnd() - 0.5) * 900, l);
  }

  private spawnCar(z: number, lane: number) {
    const pool = this.S.pool;
    let spr = pick(pool);
    // Trucks keep right, like real highways.
    if (spr.slow && lane < 2) spr = pick(pool.filter(p => !p.slow));
    const diff = this.difficulty();
    const laneBonus = (3 - lane) * 4; // left lanes run a little faster
    const base = spr.slow ? 46 + rnd() * 10 : 54 + laneBonus + rnd() * 12 + diff * 6;
    this.cars.push({spr, z, x: LANES[lane], lane, speed: base, baseSpeed: base, signal: 0, signalT: 0, fromX: LANES[lane], toX: LANES[lane], changeT: -1, passed: false});
  }

  private lanesNear(z: number, span: number, except?: Car) {
    const used = new Set<number>();
    for (const c of this.cars) {
      if (c === except || Math.abs(c.z - z) > span) continue;
      used.add(c.lane);
      if (c.changeT >= 0 || c.signal) used.add(LANES.indexOf(c.fromX) >= 0 ? LANES.indexOf(c.fromX) : c.lane);
    }
    return used;
  }

  /** 0 → 1 over the first two and a half minutes of a run. */
  private difficulty() {
    return clamp((this.res.time - 3) / 150, 0, 1);
  }

  // ---- update ----
  private update(dt: number) {
    this.time += dt;
    const play = this.opts.mode === 'play';
    const t = this.t;

    if (this.state === 'countdown') {
      const before = Math.ceil(this.countT);
      this.countT -= dt;
      const after = Math.ceil(this.countT);
      if (after !== before && after > 0) sfx.count();
      this.speed += (62 - this.speed) * Math.min(1, dt * 1.5);
      if (this.countT <= 0) {
        this.state = 'run';
        sfx.go();
      }
    }

    // Speed
    if (this.state === 'run') {
      const top = play ? t.topMph * (this.nitroOn ? t.nitroBoost : 1) : 108;
      if (this.brakeT > 0) {
        this.brakeT -= dt;
        this.speed = Math.max(35, this.speed - 95 * dt);
      } else if (this.speed < top) {
        const k = 1 - 0.65 * Math.pow(this.speed / top, 2);
        this.speed = Math.min(top, this.speed + t.accelMph * k * (this.nitroOn ? 2.4 : 1) * dt);
      } else this.speed = Math.max(top, this.speed - 18 * dt);
      if (this.nitroOn) {
        this.nitroTank -= dt;
        if (this.nitroTank <= 0) {
          this.nitroTank = 0;
          this.nitroOn = false;
        }
      } else this.nitroTank = Math.min(t.nitroSecs, this.nitroTank + dt * 0.045);
    } else if (this.state === 'crash') {
      this.speed = Math.max(0, this.speed - 160 * dt);
      this.crashT += dt;
      this.spin += dt * 5 * Math.max(0.1, this.speed / 100);
      if (this.crashT > 0.9) this.slow = Math.min(1, this.slow + dt * 2);
      if (this.crashT > 1.7 && this.state === 'crash') {
        this.state = 'over';
        this.finish();
      }
    }

    const dz = this.speed * UPM * dt;
    this.pos += dz;
    this.res.distance += (this.speed * dt) / 3600;
    this.res.time += dt;
    this.res.topSpeed = Math.max(this.res.topSpeed, this.speed);

    // Lateral
    if (this.laneT < 1) {
      this.laneT = Math.min(1, this.laneT + dt / t.laneTime);
      const nx = this.fromX + (this.toX - this.fromX) * ease(this.laneT);
      this.lean = (nx - this.x) / Math.max(dt, 0.001);
      this.x = nx;
    } else this.lean *= 0.8;
    this.camX += (this.x * ROAD_W * 0.92 - this.camX) * Math.min(1, dt * 7);
    const seg = Math.floor(this.pos / SEG) % N_SEG;
    this.skyX += this.track.curve[seg] * (this.speed / 150) * dt * 60;

    // Traffic
    const pz = this.pos + PLAYER_Z;
    const diff = this.difficulty();
    for (const c of this.cars) {
      // follow slower cars in the same lane
      let ahead = Infinity;
      for (const o of this.cars) if (o !== c && o.lane === c.lane && o.z > c.z && o.z - c.z < ahead) ahead = o.z - c.z;
      const want = ahead < 2200 ? Math.min(c.baseSpeed, this.cars.find(o => o.lane === c.lane && o.z - c.z === ahead)?.speed ?? c.baseSpeed) : c.baseSpeed;
      c.speed += (want - c.speed) * Math.min(1, dt * 2);
      c.z += c.speed * UPM * dt;
      // lane changes, always signalled first
      if (c.signal) {
        c.signalT -= dt;
        if (c.signalT <= 0 && c.changeT < 0) {
          const target = c.lane + c.signal;
          const blocked = this.cars.some(o => o !== c && o.lane === target && Math.abs(o.z - c.z) < 2000);
          if (blocked) c.signal = 0;
          else {
            c.fromX = c.x;
            c.toX = LANES[target];
            c.lane = target;
            c.changeT = 0;
          }
        }
      } else if (c.changeT < 0 && play && this.state === 'run' && this.laneChangeOk(c, pz) && rnd() < dt * (0.05 + diff * 0.1)) {
        const dir = rnd() < 0.5 ? -1 : 1;
        const target = c.lane + dir;
        if (target >= 0 && target <= 3) {
          const used = this.lanesNear(c.z, 2900, c);
          const free = !this.cars.some(o => o !== c && o.lane === target && Math.abs(o.z - c.z) < 2600);
          if (free && !(used.size >= 3 && !used.has(target) && !used.has(c.lane))) {
            c.signal = dir;
            c.signalT = 1.15;
          }
        }
      }
      if (c.changeT >= 0) {
        c.changeT += dt / 1.25;
        c.x = c.fromX + (c.toX - c.fromX) * ease(Math.min(1, c.changeT));
        if (c.changeT >= 1) {
          c.changeT = -1;
          c.signal = 0;
          c.fromX = c.toX;
        }
      }
    }

    // Collisions and near misses. Boxes are the drawn cars: the player spans from its rear
    // bumper (pz) forward; traffic spans its full length around its centre.
    if (this.state === 'run' || this.state === 'countdown') {
      const pHalf = halfWidth(this.opts.car.rear.w + this.opts.car.rear.flare * 2);
      const pRear = pz + PLAYER_LEN * (1 - HIT_L) * 0.5;
      const pFront = pz + PLAYER_LEN - PLAYER_LEN * (1 - HIT_L) * 0.5;
      for (const c of this.cars) {
        const half = c.spr.length / 2;
        const cRear = c.z - half * HIT_L;
        const cFront = c.z + half * HIT_L;
        const dx = Math.abs(c.x - this.x);
        const cHalf = halfWidth(c.spr.bodyW);
        if (cRear < pFront && cFront > pRear && dx < (pHalf + cHalf) * HIT_W) {
          if (play) this.crash(c);
          else c.z = pFront + half + 60; // attract mode: the AI never crashes
          break;
        }
        // Scored once the car has dropped back past your car.
        if (!c.passed && c.z + half < pz + PLAYER_LEN * 0.5) {
          c.passed = true;
          this.res.passed++;
          if (play && this.state === 'run') this.nearMiss(c, dx - (pHalf + cHalf));
        }
      }
    }
    if (this.opts.mode === 'attract') this.autopilot(pz);

    // Combo bank
    if (this.combo > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.bank();
    }
    if (this.state === 'run' && play && this.speed > 50) this.score += this.speed * dt * 0.6 * (this.nitroOn ? 1.5 : 1);
    const best = this.opts.best ?? 0;
    if (play && !this.bestShown && best > 0 && this.score > best) {
      this.bestShown = true;
      sfx.bank();
      this.pop('New best!', 'Keep it going', '#35f2ff', -1);
    }

    // Spawn / despawn
    this.cars = this.cars.filter(c => c.z > this.pos - 600 && c.z < this.pos + DRAW * SEG + 6000);
    if (this.nextRow < this.pos + DRAW * SEG) this.spawnRow();

    // Effects
    this.fov += ((this.nitroOn ? 1.06 : 1) - this.fov) * Math.min(1, dt * 4);
    this.shake = Math.max(0, this.shake - dt * 3);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.bankFx = Math.max(0, this.bankFx - dt);
    for (const p of this.parts) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind !== 'smoke') p.vy += 900 * dt;
    }
    this.parts = this.parts.filter(p => p.life < p.max);
    this.popups = this.popups.filter(p => this.time - p.born < 1.3);

    this.engine?.update(this.speed, t.topMph, this.nitroOn, this.brakeT > 0);
  }

  /** A car may only start a lane change if it will finish well before the player reaches it. */
  private laneChangeOk(c: Car, pz: number) {
    const closing = Math.max(1, (this.speed - c.speed) * UPM);
    const ttr = (c.z - pz) / closing;
    return ttr > 3.4 && ttr < 8;
  }

  private autopilot(pz: number) {
    if (this.laneT < 1) return;
    const danger = this.cars.find(c => c.lane === this.lane && c.z > pz && c.z - pz < 5200);
    if (!danger) return;
    const free = (l: number) => l >= 0 && l <= 3 && !this.cars.some(c => (c.lane === l || Math.abs(c.x - LANES[l]) < 0.3) && c.z > pz - 1600 && c.z - pz < 6000);
    const dirs = rnd() < 0.5 ? [-1, 1] : [1, -1];
    for (const d of dirs)
      if (free(this.lane + d)) {
        this.lane += d;
        this.fromX = this.x;
        this.toX = LANES[this.lane];
        this.laneT = 0;
        return;
      }
  }

  /** gap = clear space between the two cars' sides (normalised road units). */
  private nearMiss(c: Car, gap: number) {
    const rel = this.speed - c.speed;
    if (gap > 0.27 || rel < 12) return;
    const tier = gap < 0.07 ? 2 : gap < 0.15 ? 1 : 0;
    const label = tier === 2 ? 'Insane' : tier === 1 ? 'Close call' : 'Near miss';
    this.combo++;
    this.comboT = 3.4;
    const mult = Math.min(10, this.combo);
    const pts = Math.round((80 + rel * 3) * [1, 1.8, 3.2][tier] * (this.nitroOn ? 1.5 : 1)) * mult;
    this.pending += pts;
    this.res.nearMisses++;
    if (tier === 1) this.res.close++;
    if (tier === 2) this.res.insane++;
    this.res.bestCombo = Math.max(this.res.bestCombo, mult);
    this.nitroTank = Math.min(this.t.nitroSecs, this.nitroTank + [0.3, 0.55, 0.9][tier]);
    const side = c.x < this.x ? -1 : 1;
    sfx.near(side, tier);
    this.shake = Math.max(this.shake, 0.12 + tier * 0.12);
    // Two cars passed on opposite sides in quick succession: threading the needle.
    if (this.time - this.lastNear.t < 0.4 && this.lastNear.side === -side) {
      this.res.threads++;
      this.pending += 600 * mult;
      sfx.thread();
      this.pop('Threaded', `+${(600 * mult).toLocaleString('en-US')}`, '#35f2ff', side);
    }
    this.lastNear = {t: this.time, side};
    this.pop(label, `+${pts.toLocaleString('en-US')}`, tier === 2 ? '#ff3ad1' : tier === 1 ? '#ffcf4a' : '#ffffff', side);
  }

  private pop(text: string, sub: string, color: string, side: -1 | 1) {
    this.popups.push({text, sub, color, side, y: FEED_Y + 22, born: this.time});
  }

  private bank() {
    if (this.pending > 0) {
      this.score += this.pending;
      this.bankAmt = this.pending;
      this.bankFx = 1.4;
      sfx.bank();
    }
    this.pending = 0;
    this.combo = 0;
  }

  private crash(c: Car) {
    this.state = 'crash';
    this.crashT = 0;
    this.slow = 0.35;
    this.shake = 1;
    this.flash = 1;
    this.nitroOn = false;
    if (this.pending > 0) {
      this.res.lostCombo = this.pending;
      sfx.comboLost();
    }
    this.pending = 0;
    this.combo = 0;
    c.speed = c.baseSpeed * 0.4;
    c.baseSpeed *= 0.4;
    sfx.crash();
    const cx = W / 2 + (c.x - this.x) * 120;
    for (let i = 0; i < 46; i++) {
      const a = rnd() * Math.PI * 2;
      const v = 120 + rnd() * 420;
      const kind = i % 3 === 0 ? 'shard' : 'spark';
      this.parts.push({x: cx, y: 440, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 260, life: 0, max: 0.5 + rnd() * 0.9, size: kind === 'shard' ? 3 + rnd() * 3 : 2, color: kind === 'shard' ? '#bfeaff' : rnd() < 0.5 ? '#ffd27a' : '#ff8a2b', kind});
    }
    for (let i = 0; i < 10; i++) this.parts.push({x: cx + (rnd() - 0.5) * 80, y: 450, vx: (rnd() - 0.5) * 60, vy: -40 - rnd() * 40, life: 0, max: 1.6, size: 18 + rnd() * 20, color: 'rgba(120,130,140,.35)', kind: 'smoke'});
  }

  private finish() {
    this.res.score = Math.round(this.score);
    this.res.distance = Math.round(this.res.distance * 100) / 100;
    this.res.topSpeed = Math.round(this.res.topSpeed);
    this.engine?.stop();
    this.engine = null;
    this.opts.onEnd?.(this.res);
  }

  // ---- render ----
  private render(now: number) {
    const g = this.ctx;
    const tr = this.track;
    const S = this.S;
    g.save();
    if (this.shake > 0) g.translate((rnd() - 0.5) * this.shake * 16, (rnd() - 0.5) * this.shake * 12);
    g.fillStyle = '#000';
    g.fillRect(-20, -20, W + 40, H + 40);

    const base = Math.floor(this.pos / SEG);
    const basePct = (this.pos - base * SEG) / SEG;
    const pz = this.pos + PLAYER_Z;
    const playerY = this.segY(pz);
    const camY = playerY + CAM_H;
    const nitroFov = this.fov;
    this.zBase = base * SEG;
    this.camY = camY;
    this.dfov = DEPTH * nitroFov;

    // Sky: a soft glow over the city, the moon, then the skyline with parallax.
    g.drawImage(S.skyGlow, 0, HORIZON - 140, W, 150);
    g.globalCompositeOperation = 'lighter';
    g.drawImage(S.white, 452, 40, 70, 70);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#e9eef5';
    g.beginPath();
    g.arc(487, 75, 13, 0, Math.PI * 2);
    g.fill();
    const sky = S.skyline;
    const off = (((this.skyX * 3 + this.camX * 0.02) % sky.width) + sky.width) % sky.width;
    const skyTop = HORIZON - 150 + (camY - CAM_H) * 0.01;
    g.drawImage(sky, -off, skyTop, sky.width, 160);
    g.drawImage(sky, sky.width - off, skyTop, sky.width, 160);

    // Project the road ahead (front to back), remembering the curve offset.
    let x = 0;
    let dx = -(tr.curve[base % N_SEG] * basePct);
    const DRAWN = this.draw;
    for (let n = 0; n <= DRAWN; n++) {
      const i = (base + n) % N_SEG;
      const zw = (base + n) * SEG;
      const cz = zw - this.pos;
      const scale = (DEPTH * nitroFov) / Math.max(cz, 1);
      this.px[n] = W / 2 + scale * (x - this.camX) * (W / 2);
      this.py[n] = HORIZON - scale * (tr.y[i] - camY) * (H / 2);
      this.pw[n] = scale * ROAD_W * (W / 2);
      this.ps[n] = scale;
      this.pz[n] = cz;
      this.xw[n] = x;
      this.yw[n] = tr.y[i];
      x += dx;
      dx += tr.curve[i];
    }

    // Bucket traffic by segment so it draws in depth order with the road.
    for (const b of this.buckets) b.length = 0;
    // A car whose tail is already behind the camera (one alongside you) still shows the rest of its body.
    const nearZ = this.pos + NEAR;
    for (const c of this.cars) {
      const rear = c.z - c.spr.length / 2;
      if (rear + c.spr.length <= nearZ) continue;
      const n = Math.floor(Math.max(rear, nearZ) / SEG) - base;
      if (n >= 0 && n < DRAWN) this.buckets[n].push(c);
    }

    // Draw back to front.
    const near: [Car, number][] = [];
    const tunnelHere = tr.tunnel[Math.floor(pz / SEG) % N_SEG] > 0;
    for (let n = DRAWN - 1; n >= 0; n--) {
      const i = (base + n) % N_SEG;
      const x1 = this.px[n];
      const y1 = this.py[n];
      const w1 = this.pw[n];
      const x2 = this.px[n + 1];
      const y2 = this.py[n + 1];
      const w2 = this.pw[n + 1];
      const fog = Math.min(1, Math.pow(n / DRAWN, 1.5) * 1.15);
      const a = 1 - fog;
      if (a <= 0.02) continue;
      g.globalAlpha = a;
      const inTunnel = tr.tunnel[i] > 0;
      const roadHere = this.pz[n] > 30;
      if (roadHere && y2 < y1) {
        // lamp pools: brightest under each light
        const lampD = inTunnel ? Math.min(i % 4, 4 - (i % 4)) / 2 : Math.min(i % 12, 12 - (i % 12));
        const lit = inTunnel ? 4 - Math.round(lampD * 2) : clamp(4 - lampD, 0, 4);
        g.fillStyle = (Math.floor(i / 3) % 2 ? ROAD : ROAD_ALT)[lit];
        quad(g, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2);
        // Markings: the yellow left edge, then every white line in a single path.
        if (n < 130) {
          g.fillStyle = '#d9b64a';
          quad(g, x1 - w1, y1, x1 - w1 * 0.965, y1, x2 - w2 * 0.965, y2, x2 - w2, y2);
        }
        g.fillStyle = '#d8e0e8';
        g.beginPath();
        path4(g, x1 + w1 * 0.965, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 * 0.965, y2);
        if (i % 6 < 3 && n < 120) {
          const lw1 = w1 * 0.012;
          const lw2 = w2 * 0.012;
          for (const l of [-0.5, 0, 0.5]) path4(g, x1 + w1 * l - lw1, y1, x1 + w1 * l + lw1, y1, x2 + w2 * l + lw2, y2, x2 + w2 * l - lw2, y2);
        }
        g.fill();
        // reflectors on the edge lines catch the light
        if (i % 6 === 0 && n < 60) {
          g.fillStyle = '#ffcf4a';
          const r = Math.max(1, w1 * 0.012);
          g.fillRect(x1 - w1 * 0.95 - r, y1 - r, r * 2, r);
          g.fillStyle = '#ff2e4d';
          g.fillRect(x1 + w1 * 0.95 - r, y1 - r, r * 2, r);
        }
      }
      if (roadHere) {
        if (inTunnel) this.drawTunnel(g, i, n, x1, y1, w1, x2, y2, w2, a);
        if (tr.lamp[i] && n > 1) this.drawLamps(g, n, x1, y1, w1, a);
        if (tr.sign[i] && n > 2 && n < 140) this.drawGantry(g, n, x1, y1, w1, a, i);
        if (tr.bridge[i] && n > 1 && n < 150) this.drawBridge(g, x1, y1, w1, a);
      }
      const b = this.buckets[n];
      if (b.length) {
        b.sort((p, q) => q.z - p.z);
        for (const c of b) {
          // A car whose tail is nearer than your rear bumper is split: the part ahead of you is
          // drawn now (behind your car), the part beside/behind you after your car.
          const rear = c.z - c.spr.length / 2;
          if (rear < pz) {
            near.push([c, a]);
            if (rear + c.spr.length > pz) this.drawCar(g, c, a, now, pz, Infinity, false);
          } else this.drawCar(g, c, a, now, -Infinity, Infinity, true);
        }
      }
    }
    g.globalAlpha = 1;
    if (tunnelHere) {
      // inside a tunnel the amber light washes over everything
      g.fillStyle = 'rgba(255,150,40,.05)';
      g.fillRect(0, 0, W, H);
    }

    this.drawSpeedLines(g, now);
    this.drawPlayer(g, now);
    for (const [c, a] of near) this.drawCar(g, c, a, now, -Infinity, pz, true);
    g.globalAlpha = 1;
    this.drawParticles(g);
    if (this.opts.mode === 'play') {
      if (this.hud) {
        if (++this.hudFrame % 3 === 0 || this.state !== 'run') {
          this.hud.clearRect(0, 0, W, H);
          this.drawHud(this.hud, now);
        }
      } else this.drawHud(g, now);
    }
    if (this.flash > 0) {
      g.fillStyle = `rgba(255,255,255,${this.flash * 0.7})`;
      g.fillRect(-20, -20, W + 40, H + 40);
    }
    g.restore();
  }

  private drawTunnel(g: CanvasRenderingContext2D, i: number, n: number, x1: number, y1: number, w1: number, x2: number, y2: number, w2: number, a: number) {
    const k = WALL / ROAD_W;
    const t1 = y1 - w1 * k;
    const t2 = y2 - w2 * k;
    const e1 = w1 * 1.1;
    const e2 = w2 * 1.1;
    // walls and ceiling
    g.fillStyle = i % 2 ? '#14171c' : '#111419';
    quad(g, x1 - e1, y1, x1 - e1, t1, x2 - e2, t2, x2 - e2, y2);
    quad(g, x1 + e1, y1, x1 + e1, t1, x2 + e2, t2, x2 + e2, y2);
    g.fillStyle = '#0b0d10';
    quad(g, x1 - e1, t1, x1 + e1, t1, x2 + e2, t2, x2 - e2, t2);
    if (i % 4 === 0) {
      // amber light strips along both walls
      g.fillStyle = '#ffae2b';
      const h1 = w1 * k * 0.72;
      const h2 = w2 * k * 0.72;
      quad(g, x1 - e1, y1 - h1, x1 - e1, y1 - h1 - w1 * 0.05, x2 - e2, y2 - h2 - w2 * 0.05, x2 - e2, y2 - h2);
      quad(g, x1 + e1, y1 - h1, x1 + e1, y1 - h1 - w1 * 0.05, x2 + e2, y2 - h2 - w2 * 0.05, x2 + e2, y2 - h2);
      if (n < 110) {
        g.globalCompositeOperation = 'lighter';
        const s = w1 * 0.5;
        g.drawImage(this.S.amber, x1 - e1 - s / 2, y1 - h1 - s / 2, s, s);
        g.drawImage(this.S.amber, x1 + e1 - s / 2, y1 - h1 - s / 2, s, s);
        g.globalCompositeOperation = 'source-over';
      }
    }
    if (this.track.tunnel[i] === 2) {
      // portal face around the entrance
      g.fillStyle = '#1c2026';
      const top = t1 - w1 * 0.45;
      g.fillRect(x1 - w1 * 3.2, top, w1 * 3.2 - e1, y1 - top);
      g.fillRect(x1 + e1, top, w1 * 3.2 - e1, y1 - top);
      g.fillRect(x1 - e1, top, e1 * 2, t1 - top);
      g.fillStyle = '#ffae2b';
      g.globalAlpha = a * 0.9;
      for (let k2 = -3; k2 <= 3; k2++) g.fillRect(x1 + k2 * e1 * 0.28 - w1 * 0.02, top + (t1 - top) * 0.45, w1 * 0.04, w1 * 0.04);
      g.globalAlpha = a;
    }
  }

  private drawLamps(g: CanvasRenderingContext2D, n: number, x1: number, y1: number, w1: number, a: number) {
    const s = this.ps[n] * (W / 2) * 10.5; // lamp design pixel → screen
    const ph = 386 * s;
    if (ph < 3) return;
    const pole = Math.max(1, 8 * s);
    const arm = 116 * s;
    const lx = x1 - w1 * 1.18;
    const rx = x1 + w1 * 1.18;
    const top = y1 - ph;
    g.fillStyle = '#2b333d';
    g.fillRect(lx - pole / 2, top, pole, ph);
    g.fillRect(rx - pole / 2, top, pole, ph);
    g.fillRect(lx, top, arm, pole * 0.8);
    g.fillRect(rx - arm, top, arm, pole * 0.8);
    g.fillStyle = '#fff3d6';
    g.fillRect(lx + arm - 26 * s, top + pole * 0.8, 24 * s, Math.max(1, 4 * s));
    g.fillRect(rx - arm + 2 * s, top + pole * 0.8, 24 * s, Math.max(1, 4 * s));
    if (n < 110) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = a * 0.9;
      const gs = 130 * s;
      g.drawImage(this.S.amber, lx + arm - 14 * s - gs / 2, top - gs / 2 + 4 * s, gs, gs);
      g.drawImage(this.S.amber, rx - arm + 14 * s - gs / 2, top - gs / 2 + 4 * s, gs, gs);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = a;
    }
  }

  private drawGantry(g: CanvasRenderingContext2D, n: number, x1: number, y1: number, w1: number, a: number, i: number) {
    const k = w1 / ROAD_W;
    const top = y1 - 3300 * k;
    const bot = y1 - 2550 * k;
    g.fillStyle = '#20262e';
    g.fillRect(x1 - w1 * 1.22, top, w1 * 0.035, y1 - top);
    g.fillRect(x1 + w1 * 1.19, top, w1 * 0.035, y1 - top);
    g.fillRect(x1 - w1 * 1.22, top + (bot - top) * 0.15, w1 * 2.44, (bot - top) * 0.1);
    const labels = [
      ['CUT UP CITY', '12'],
      ['EXIT 42', 'Harbor'],
      ['DOWNTOWN', '8'],
      ['AIRPORT', '21'],
    ];
    const [l1, l2] = labels[Math.floor(i / 420) % labels.length];
    for (const [sx, txt, sub] of [
      [-0.62, l1, l2],
      [0.42, 'KEEP LEFT', 'Lanes 1–2'],
    ] as const) {
      const px = x1 + w1 * sx;
      const pw = w1 * 0.58;
      g.fillStyle = '#0f6b3a';
      g.fillRect(px - pw / 2, top, pw, bot - top);
      g.strokeStyle = '#e9eef3';
      g.lineWidth = Math.max(1, w1 * 0.006);
      g.strokeRect(px - pw / 2 + w1 * 0.01, top + w1 * 0.01, pw - w1 * 0.02, bot - top - w1 * 0.02);
      if (n < 90) {
        g.fillStyle = '#ffffff';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `800 ${Math.max(4, w1 * 0.075)}px system-ui, Arial`;
        g.fillText(txt, px, top + (bot - top) * 0.38);
        g.font = `600 ${Math.max(3, w1 * 0.055)}px system-ui, Arial`;
        g.fillText(sub, px, top + (bot - top) * 0.72);
      }
    }
    g.globalAlpha = a;
  }

  private drawBridge(g: CanvasRenderingContext2D, x1: number, y1: number, w1: number, a: number) {
    const k = w1 / ROAD_W;
    const top = y1 - 3900 * k;
    const bot = y1 - 2900 * k;
    g.fillStyle = '#15191f';
    g.fillRect(x1 - w1 * 6, top, w1 * 12, bot - top);
    g.fillStyle = '#1d232b';
    g.fillRect(x1 - w1 * 6, top, w1 * 12, (bot - top) * 0.18);
    for (const s of [-1.45, 1.45]) g.fillRect(x1 + w1 * s - w1 * 0.08, bot, w1 * 0.16, y1 - bot);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = a * 0.9;
    const gs = w1 * 0.16;
    for (let k2 = -10; k2 <= 10; k2++) g.drawImage(this.S.amber, x1 + k2 * w1 * 0.5 - gs / 2, bot - gs * 0.3, gs, gs * 0.6);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = a;
  }

  /** Project a world point (absolute z, lateral world units from the road centre, height) into this.pt. */
  private proj(z: number, lat: number, h: number) {
    const t = (z - this.zBase) / SEG;
    let n = Math.floor(t);
    if (n < 0) n = 0;
    else if (n > this.draw - 1) n = this.draw - 1;
    const f = t - n;
    const xw = this.xw[n] + (this.xw[n + 1] - this.xw[n]) * f;
    const yw = this.yw[n] + (this.yw[n + 1] - this.yw[n]) * f;
    const s = this.dfov / Math.max(z - this.pos, NEAR * 0.5);
    this.pt[0] = W / 2 + s * (xw + lat - this.camX) * (W / 2);
    this.pt[1] = HORIZON - s * (yw + h - this.camY) * (H / 2);
  }

  /** Add a polygon vertex: absolute z, lateral world x, height (world units). */
  private v(z: number, lat: number, h: number) {
    const i = this.nv * 3;
    this.pa[i] = z;
    this.pa[i + 1] = lat;
    this.pa[i + 2] = h;
    this.nv++;
  }

  private clipZ(src: Float64Array, n: number, dst: Float64Array, lim: number, keepAbove: boolean): number {
    let m = 0;
    for (let i = 0; i < n; i++) {
      const j = i + 1 === n ? 0 : i + 1;
      const az = src[i * 3];
      const bz = src[j * 3];
      const ain = keepAbove ? az >= lim : az <= lim;
      const bin = keepAbove ? bz >= lim : bz <= lim;
      if (ain) {
        dst[m * 3] = az;
        dst[m * 3 + 1] = src[i * 3 + 1];
        dst[m * 3 + 2] = src[i * 3 + 2];
        m++;
      }
      if (ain !== bin) {
        const t = (lim - az) / (bz - az);
        dst[m * 3] = lim;
        dst[m * 3 + 1] = src[i * 3 + 1] + (src[j * 3 + 1] - src[i * 3 + 1]) * t;
        dst[m * 3 + 2] = src[i * 3 + 2] + (src[j * 3 + 2] - src[i * 3 + 2]) * t;
        m++;
      }
    }
    return m;
  }

  /** Clip the polygon built with v() to lo ≤ z ≤ hi, project it and fill it. */
  private fillPoly(g: CanvasRenderingContext2D, lo: number, hi: number, fill: string) {
    let n = this.nv;
    this.nv = 0;
    n = this.clipZ(this.pa, n, this.pb, lo, true);
    if (n < 3) return;
    n = this.clipZ(this.pb, n, this.pa, hi, false);
    if (n < 3) return;
    const a = this.pa;
    g.fillStyle = fill;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      this.proj(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]);
      if (i === 0) g.moveTo(this.pt[0], this.pt[1]);
      else g.lineTo(this.pt[0], this.pt[1]);
    }
    g.closePath();
    g.fill();
  }

  /** A wheel on the side of a body: an octagon in the side plane. */
  private wheel(g: CanvasRenderingContext2D, zc: number, lat: number, r: number, lo: number, hi: number) {
    for (let k = 0; k < 8; k++) this.v(zc + r * OCT_C[k], lat, r + r * OCT_S[k]);
    this.fillPoly(g, lo, hi, '#06070a');
    const rr = r * 0.56;
    for (let k = 0; k < 8; k++) this.v(zc + rr * OCT_C[k], lat, r + rr * OCT_S[k]);
    this.fillPoly(g, lo, hi, '#4a535e');
    const hr = r * 0.2;
    for (let k = 0; k < 8; k++) this.v(zc + hr * OCT_C[k], lat, r + hr * OCT_S[k]);
    this.fillPoly(g, lo, hi, '#1a1e24');
  }

  /**
   * Traffic is drawn as a real 3D body: the side facing you, the roof and glass, the hood, the
   * wheels, then the rear face on top. Its full length is visible, so if it's beside you, you see it.
   * zlo/zhi clip the body (cars alongside you are split around your car for correct overlap).
   */
  private drawCar(g: CanvasRenderingContext2D, c: Car, a: number, now: number, zlo: number, zhi: number, rearFace: boolean) {
    g.globalAlpha = a;
    const L = c.spr.length;
    const rear = c.z - L / 2;
    const cz = rear - this.pos;
    const flat = cz > LOD_3D;
    if (!flat) {
      const lo = Math.max(zlo, rear, this.pos + NEAR);
      const hi = Math.min(zhi, rear + L);
      if (hi > lo) this.drawBody(g, c, lo, hi, a);
    }
    if (!rearFace || cz < NEAR) return;
    const s = this.dfov / cz;
    const k = SPR_K * s * (W / 2);
    const dw = SPRITE_W * k;
    if (dw < 2) return;
    this.proj(rear, c.x * ROAD_W, 0);
    const sx = this.pt[0];
    const sy = this.pt[1];
    const dh = c.spr.h * k;
    const top = sy - (c.spr.h - 12) * k;
    g.drawImage(flat ? c.spr.canvas : c.spr.base, sx - dw / 2, top, dw, dh);
    g.drawImage(c.spr.glow, sx - dw / 2, top, dw, dh);
    if (c.signal && Math.floor(now / 280) % 2 === 0) {
      g.globalCompositeOperation = 'lighter';
      const [lx, ly] = c.signal < 0 ? c.spr.sigL : c.spr.sigR;
      const gs = 70 * k;
      g.drawImage(this.S.amber, sx - dw / 2 + lx * k - gs / 2, top + ly * k - gs / 2, gs, gs);
      g.drawImage(this.S.amber, sx - dw / 2 + lx * k - gs / 4, top + ly * k - gs / 4, gs / 2, gs / 2);
    }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = a;
  }

  /** Which side of a body at lateral X with half width hw faces the camera: -1 left, 1 right, 0 neither. */
  private sideFacing(z: number, X: number, hw: number): number {
    this.proj(z, X + hw, 0);
    if (this.pt[0] < W / 2) return 1;
    this.proj(z, X - hw, 0);
    if (this.pt[0] > W / 2) return -1;
    return 0;
  }

  private drawBody(g: CanvasRenderingContext2D, c: Car, lo: number, hi: number, a: number) {
    const b = c.spr.body;
    const K = SPR_K;
    const L = c.spr.length;
    const r0 = c.z - L / 2;
    const X = c.x * ROAD_W;
    const Z = (f: number) => r0 + f * L;
    const hw = b.hw * K;
    const lo3 = b.lo * K;
    const belt = b.belt * K;
    const near = r0 - this.pos < 5200; // small details only where they're big enough to see
    const sg = this.sideFacing(lo, X, hw);
    const sl = X + sg * hw;
    const v = (f: number, lat: number, h: number) => this.v(Z(f), lat, h);

    // contact shadow
    const sh = hw + 10 * K;
    v(-0.015, X - sh, 0);
    v(-0.015, X + sh, 0);
    v(1.02, X + sh, 0);
    v(1.02, X - sh, 0);
    this.fillPoly(g, lo, hi, 'rgba(0,0,0,.5)');

    if (b.group === 'car') {
      const roof = b.roof * K;
      const nose = belt * 0.8;
      if (sg) {
        const sn = X + sg * hw * 0.9;
        v(0, sl, lo3);
        v(0, sl, belt);
        v(0.86, sl, belt);
        v(1, sn, nose);
        v(1, sn, lo3);
        this.fillPoly(g, lo, hi, b.side);
        // darker rocker panel, bright shoulder line where the lamps catch it
        const rk = lo3 + (belt - lo3) * 0.32;
        v(0, sl, lo3);
        v(0, sl, rk);
        v(1, sn, rk);
        v(1, sn, lo3);
        this.fillPoly(g, lo, hi, b.sideLo);
        v(0, sl, belt - 4 * K);
        v(0, sl, belt);
        v(0.86, sl, belt);
        v(0.86, sl, belt - 4 * K);
        this.fillPoly(g, lo, hi, b.top);
        for (const wf of b.wheels) this.wheel(g, Z(wf), sl + sg * 2, b.wr * K, lo, hi);
      }
      // deck: trunk, shoulders and hood
      v(0, X - hw, belt);
      v(0, X + hw, belt);
      v(0.86, X + hw, belt);
      v(1, X + hw * 0.9, nose);
      v(1, X - hw * 0.9, nose);
      v(0.86, X - hw, belt);
      this.fillPoly(g, lo, hi, b.top);
      if (c.spr.kind === 'pickup') {
        const bi = hw - 9 * K;
        v(0.03, X - bi, belt + 1);
        v(0.03, X + bi, belt + 1);
        v(b.g0 - 0.02, X + bi, belt + 1);
        v(b.g0 - 0.02, X - bi, belt + 1);
        this.fillPoly(g, lo, hi, '#101216');
      }
      const cb = b.cb * K;
      const ct = b.ct * K;
      if (sg) {
        // cabin side: painted pillars around dark side glass
        const lb = X + sg * cb;
        const lt = X + sg * ct;
        v(b.g0, lb, belt);
        v(b.g1, lt, roof);
        v(b.r1, lt, roof);
        v(b.c1, lb, belt);
        this.fillPoly(g, lo, hi, b.side);
        const gl = X + sg * (cb * 0.82 + ct * 0.18);
        const gt = X + sg * (cb * 0.12 + ct * 0.88);
        const h1 = belt + (roof - belt) * 0.14;
        const h2 = roof - (roof - belt) * 0.14;
        const ga = b.g0 + (b.g1 - b.g0) * 0.6 + 0.03;
        const gb = b.g1 + 0.02;
        const gc = b.r1 - 0.015;
        const gd = b.c1 - (b.c1 - b.r1) * 0.35;
        v(ga, gl, h1);
        v(gb, gt, h2);
        v(gc, gt, h2);
        v(gd, gl, h1);
        this.fillPoly(g, lo, hi, '#0a0f16');
        // B-pillar
        const m = (gb + gc) / 2;
        v(m - 0.012, gl, h1);
        v(m - 0.012, gt, h2);
        v(m + 0.012, gt, h2);
        v(m + 0.012, gl, h1);
        this.fillPoly(g, lo, hi, b.side);
      }
      // rear glass, with a streak of reflected light
      v(b.g0, X - cb, belt);
      v(b.g0, X + cb, belt);
      v(b.g1, X + ct, roof);
      v(b.g1, X - ct, roof);
      this.fillPoly(g, lo, hi, '#0c121a');
      if (near) {
        v(b.g0, X - cb * 0.56, belt);
        v(b.g0, X - cb * 0.4, belt);
        v(b.g1, X - ct * 0.16, roof);
        v(b.g1, X - ct * 0.32, roof);
        this.fillPoly(g, lo, hi, 'rgba(160,200,240,.16)');
      }
      // roof and its sheen
      v(b.g1, X - ct, roof);
      v(b.g1, X + ct, roof);
      v(b.r1, X + ct, roof);
      v(b.r1, X - ct, roof);
      this.fillPoly(g, lo, hi, b.roofC);
      if (near) {
        g.globalAlpha = a * 0.45;
        v(b.g1 + 0.02, X - ct * 0.42, roof);
        v(b.g1 + 0.02, X - ct * 0.18, roof);
        v(b.r1 - 0.03, X - ct * 0.18, roof);
        v(b.r1 - 0.03, X - ct * 0.42, roof);
        this.fillPoly(g, lo, hi, b.sheen);
        g.globalAlpha = a;
      }
      if (near && sg) this.markers(g, Z(0.03), Z(0.95), sl, belt * 0.72, lo, hi, a);
      return;
    }

    if (b.group === 'van') {
      const bx = b.box1;
      if (sg) {
        const sn = X + sg * hw * 0.92;
        v(0, sl, lo3);
        v(0, sl, belt);
        v(bx, sl, belt);
        v(0.88, X + sg * hw * 0.96, belt * 0.58);
        v(1, sn, belt * 0.5);
        v(1, sn, lo3);
        this.fillPoly(g, lo, hi, b.side);
        v(0, sl, lo3);
        v(0, sl, lo3 + (belt - lo3) * 0.2);
        v(1, sn, lo3 + (belt - lo3) * 0.2);
        v(1, sn, lo3);
        this.fillPoly(g, lo, hi, b.sideLo);
        // side windows: passenger glass and the cab door
        for (const [z0, z1] of [
          [0.1, 0.56],
          [0.6, bx - 0.02],
        ]) {
          v(z0, sl, belt * 0.64);
          v(z0, sl, belt * 0.9);
          v(z1, sl, belt * 0.9);
          v(z1, sl, belt * 0.64);
          this.fillPoly(g, lo, hi, '#0a0f16');
        }
        for (const wf of b.wheels) this.wheel(g, Z(wf), sl + sg * 2, b.wr * K, lo, hi);
      }
      // hood, then the tall roof
      v(0.88, X - hw * 0.96, belt * 0.58);
      v(0.88, X + hw * 0.96, belt * 0.58);
      v(1, X + hw * 0.9, belt * 0.5);
      v(1, X - hw * 0.9, belt * 0.5);
      this.fillPoly(g, lo, hi, b.top);
      v(0, X - hw, belt);
      v(0, X + hw, belt);
      v(bx, X + hw, belt);
      v(bx, X - hw, belt);
      this.fillPoly(g, lo, hi, b.roofC);
      if (near) {
        g.globalAlpha = a * 0.4;
        v(0.04, X - hw * 0.5, belt);
        v(0.04, X - hw * 0.3, belt);
        v(bx - 0.04, X - hw * 0.3, belt);
        v(bx - 0.04, X - hw * 0.5, belt);
        this.fillPoly(g, lo, hi, b.sheen);
        g.globalAlpha = a;
      }
      if (near && sg) this.markers(g, Z(0.03), Z(0.95), sl, belt * 0.5, lo, hi, a);
      return;
    }

    // Trucks: the cab (farther away) first, then the box over it.
    const semi = c.spr.kind === 'semi';
    const cabH = b.cabH * K;
    const chw = b.cabHW * K;
    const nz = semi ? 0.9 : 0.93;
    const noseH = cabH * (semi ? 0.55 : 0.66);
    const sc = this.sideFacing(Math.max(lo, Z(b.cab0)), X, chw);
    if (sc) {
      const cl = X + sc * chw;
      v(b.cab0, cl, lo3 * 0.6);
      v(b.cab0, cl, cabH);
      v(nz - 0.015, cl, cabH);
      v(nz + 0.01, cl, cabH * 0.86);
      v(1, cl, noseH);
      v(1, cl, lo3 * 0.6);
      this.fillPoly(g, lo, hi, b.cabSide);
      v(nz - 0.075, cl, cabH * 0.56);
      v(nz - 0.075, cl, cabH * 0.86);
      v(nz - 0.02, cl, cabH * 0.86);
      v(nz + 0.002, cl, cabH * 0.56);
      this.fillPoly(g, lo, hi, '#0a0f16');
      for (const wf of b.wheels) if (wf > b.cab0) this.wheel(g, Z(wf), cl + sc * 2, b.wr * K, lo, hi);
    }
    v(b.cab0, X - chw, cabH);
    v(b.cab0, X + chw, cabH);
    v(nz - 0.015, X + chw, cabH);
    v(nz - 0.015, X - chw, cabH);
    this.fillPoly(g, lo, hi, b.cabTop);
    v(nz + 0.01, X - chw, cabH * 0.86);
    v(nz + 0.01, X + chw, cabH * 0.86);
    v(1, X + chw, noseH);
    v(1, X - chw, noseH);
    this.fillPoly(g, lo, hi, b.cabTop);

    const bx = b.box1;
    if (sg) {
      v(0, sl, lo3);
      v(0, sl, belt);
      v(bx, sl, belt);
      v(bx, sl, lo3);
      this.fillPoly(g, lo, hi, b.side);
      if (near) {
        // panel seams, the red-and-white conspicuity tape, and the under-run rail
        for (let f = 0.1; f < bx - 0.04; f += 0.1) {
          v(f, sl, lo3);
          v(f, sl, belt);
          v(f + 0.004, sl, belt);
          v(f + 0.004, sl, lo3);
          this.fillPoly(g, lo, hi, b.sideLo);
        }
        v(0.005, sl, lo3 + 5 * K);
        v(0.005, sl, lo3 + 9 * K);
        v(bx - 0.005, sl, lo3 + 9 * K);
        v(bx - 0.005, sl, lo3 + 5 * K);
        this.fillPoly(g, lo, hi, 'rgba(255,70,80,.8)');
      }
      for (const wf of b.wheels) if (wf < bx) this.wheel(g, Z(wf), sl + sg * 2, b.wr * K, lo, hi);
    }
    v(0, X - hw, belt);
    v(0, X + hw, belt);
    v(bx, X + hw, belt);
    v(bx, X - hw, belt);
    this.fillPoly(g, lo, hi, b.top);
    if (near && sg) {
      // amber side marker lights along the trailer
      g.globalCompositeOperation = 'lighter';
      for (const f of [0.02, bx / 2, bx - 0.02]) {
        const z = Z(f);
        if (z < lo || z > hi) continue;
        this.proj(z, sl, belt - 8 * K);
        const gs = (this.dfov / (z - this.pos)) * 260 * (W / 2);
        g.drawImage(this.S.amber, this.pt[0] - gs / 2, this.pt[1] - gs / 2, gs, gs);
      }
      g.globalCompositeOperation = 'source-over';
    }
  }

  /** Side marker lights: red at the back corner, amber at the front. */
  private markers(g: CanvasRenderingContext2D, zr: number, zf: number, lat: number, h: number, lo: number, hi: number, a: number) {
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = a * 0.85;
    for (const [z, spr] of [
      [zr, this.S.red],
      [zf, this.S.amber],
    ] as const) {
      if (z < lo || z > hi) continue;
      this.proj(z, lat, h);
      const gs = (this.dfov / Math.max(z - this.pos, NEAR)) * 200 * (W / 2);
      g.drawImage(spr, this.pt[0] - gs / 2, this.pt[1] - gs / 2, gs, gs);
    }

    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = a;
  }

  private drawSpeedLines(g: CanvasRenderingContext2D, now: number) {
    const f = this.speed / 160;
    if (f < 0.7 && !this.nitroOn) return;
    // Thin streaks rushing past the edges of view (never across the road ahead).
    const n = this.nitroOn ? 18 : 10;
    const alpha = Math.min(0.35, (f - 0.6) * 0.45) + (this.nitroOn ? 0.2 : 0);
    g.strokeStyle = this.nitroOn ? 'rgba(53,242,255,1)' : 'rgba(255,255,255,1)';
    g.lineWidth = 1.2;
    for (let i = 0; i < n; i++) {
      const seed = (i * 97.13) % 1;
      const side = i % 2 ? 1 : -1;
      const ang = side > 0 ? -0.55 + seed * 1.25 : Math.PI + 0.55 - seed * 1.25;
      const phase = ((now / 1000) * (1.4 + f) + seed * 7 + i * 0.37) % 1;
      const r0 = 230 + phase * 300;
      const len = 20 + phase * 90 * f;
      g.globalAlpha = alpha * phase * phase;
      g.beginPath();
      g.moveTo(W / 2 + Math.cos(ang) * r0, HORIZON + 40 + Math.sin(ang) * r0 * 0.75);
      g.lineTo(W / 2 + Math.cos(ang) * (r0 + len), HORIZON + 40 + Math.sin(ang) * (r0 + len) * 0.75);
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  private drawPlayer(g: CanvasRenderingContext2D, now: number) {
    const scale = (DEPTH * this.fov) / PLAYER_Z;
    const k = SPR_K * scale * (W / 2);
    // Placed on the road exactly like traffic (curve included), so what you see lines up with what you hit.
    this.proj(this.pos + PLAYER_Z, this.x * ROAD_W, 0);
    const sx = this.pt[0];
    const sy = HORIZON + scale * CAM_H * (H / 2);
    const spr = this.sprite;
    const dw = SPRITE_W * k;
    const dh = 150 * k;
    const bounce = this.state === 'run' ? Math.sin(now / 60) * 0.6 * (this.speed / 150) : 0;
    // On a crash the car fishtails and slides instead of flipping around.
    const tilt = this.state === 'crash' ? Math.sin(this.spin * 1.6) * 0.42 * Math.max(0.25, 1 - this.crashT * 0.5) : clamp(this.lean * 0.05, -0.12, 0.12);
    const slide = this.state === 'crash' ? Math.sin(this.spin * 0.8) * 46 : 0;

    // Headlight wash on the road ahead
    g.globalCompositeOperation = 'lighter';
    // A soft elliptical beam reaching up the road toward the horizon.
    g.globalCompositeOperation = 'source-over';
    g.drawImage(this.S.beam, sx * 0.6 + (W / 2) * 0.4 - 240, sy - dh * 0.75 - 160, 480, 170);
    // Underglow for cars with accent lighting
    const accent = this.opts.car.rear.accent;
    if (accent) {
      g.globalCompositeOperation = 'lighter';
      const ug = accent === '#ff3ad1' ? this.S.red : this.S.cyan;
      g.globalAlpha = 0.5;
      g.drawImage(ug, sx - dw * 0.55, sy - dh * 0.15, dw * 1.1, dh * 0.35);
      g.globalAlpha = 1;
    }
    g.globalCompositeOperation = 'source-over';

    g.save();
    g.translate(sx + slide, sy + bounce);
    g.rotate(tilt);
    const ox = -dw / 2;
    const oy = -(150 - 14) * k;
    g.drawImage(spr.body, ox, oy, dw, dh);
    g.globalCompositeOperation = 'lighter';
    const braking = this.brakeT > 0 || this.state === 'crash';
    g.globalAlpha = braking ? 1 : 0.6;
    g.drawImage(spr.glow, ox, oy, dw, dh);
    if (braking) g.drawImage(spr.glow, ox, oy, dw, dh);
    g.globalAlpha = 1;
    // Exhaust flames on nitro (EVs get a cyan shimmer instead)
    // The jet car's afterburner always glows; nitro lights it up fully.
    if (!this.nitroOn && this.opts.car.rear.exhaust === 'jet' && this.state === 'run') {
      const e = spr.exhausts[0];
      const len = (14 + Math.sin(now / 30) * 4) * k * 1.6;
      g.globalAlpha = 0.75;
      g.drawImage(this.S.flame, ox + e.x * k - len * 0.35, oy + e.y * k - len * 0.1, len * 0.7, len * 1.3);
      g.globalAlpha = 1;
    }
    if (this.nitroOn) {
      const tips = spr.exhausts.length ? spr.exhausts : [{x: SPRITE_W / 2, y: 125}];
      for (const e of tips) {
        const jet = this.opts.car.rear.exhaust === 'jet' ? 2.1 : 1;
        const len = (26 + Math.sin(now / 25 + e.x) * 8) * k * 1.6 * jet;
        const fx = ox + e.x * k;
        const fy = oy + e.y * k;
        g.drawImage(this.S.flame, fx - len * 0.35, fy - len * 0.1, len * 0.7, len * 1.3);
      }
    }
    g.globalCompositeOperation = 'source-over';
    g.restore();
  }

  private drawParticles(g: CanvasRenderingContext2D) {
    for (const p of this.parts) {
      const k = 1 - p.life / p.max;
      g.globalAlpha = Math.max(0, k);
      g.fillStyle = p.color;
      if (p.kind === 'smoke') {
        g.beginPath();
        g.arc(p.x, p.y, p.size * (1.5 - k * 0.5), 0, Math.PI * 2);
        g.fill();
      } else if (p.kind === 'shard') {
        g.fillRect(p.x, p.y, p.size, p.size * 0.6);
      } else {
        g.fillRect(p.x, p.y, 2, 2 + Math.abs(p.vy) * 0.01);
      }
    }
    g.globalAlpha = 1;
  }

  private drawHud(g: CanvasRenderingContext2D, now: number) {
    const kmh = this.opts.units === 'kmh';
    g.textBaseline = 'alphabetic';
    // Score, top left
    g.textAlign = 'left';
    g.fillStyle = 'rgba(244,247,251,.6)';
    g.font = '700 12px system-ui, Arial';
    g.fillText('Score', 22, 34);
    g.fillStyle = '#f4f7fb';
    g.font = 'italic 900 34px system-ui, Arial';
    g.fillText(Math.round(this.score).toLocaleString('en-US'), 20, 68);
    if (this.bankFx > 0) {
      g.globalAlpha = Math.min(1, this.bankFx);
      g.fillStyle = '#35f2ff';
      g.font = 'italic 900 18px system-ui, Arial';
      g.fillText(`+${this.bankAmt.toLocaleString('en-US')} banked`, 22, 92 - (1.4 - this.bankFx) * 12);
      g.globalAlpha = 1;
    }

    // Distance, top right
    g.textAlign = 'right';
    g.fillStyle = 'rgba(244,247,251,.6)';
    g.font = '700 12px system-ui, Arial';
    g.fillText('Distance', W - 22, 34);
    g.fillStyle = '#f4f7fb';
    g.font = 'italic 900 22px system-ui, Arial';
    const dist = kmh ? this.res.distance * 1.609 : this.res.distance;
    g.fillText(`${dist.toFixed(2)} ${kmh ? 'km' : 'mi'}`, W - 20, 60);

    // Combo meter, top centre
    if (this.combo > 0) {
      const mult = Math.min(10, this.combo);
      const pulse = 1 + Math.max(0, 0.25 - (3.4 - this.comboT)) * 0.8;
      g.textAlign = 'center';
      g.save();
      g.translate(W / 2, 54);
      g.scale(pulse, pulse);
      g.fillStyle = '#ff3ad1';
      g.font = 'italic 900 38px system-ui, Arial';
      g.shadowColor = 'rgba(255,58,209,.7)';
      g.shadowBlur = 14;
      g.fillText(`×${mult}`, 0, 0);
      g.restore();
      g.shadowBlur = 0;
      g.fillStyle = '#ffffff';
      g.font = 'italic 800 15px system-ui, Arial';
      g.textAlign = 'center';
      g.fillText(`${this.pending.toLocaleString('en-US')} at risk`, W / 2, 76);
      // combo timer
      g.fillStyle = 'rgba(255,255,255,.18)';
      g.fillRect(W / 2 - 60, 84, 120, 4);
      g.fillStyle = '#ff3ad1';
      g.fillRect(W / 2 - 60, 84, 120 * clamp(this.comboT / 3.4, 0, 1), 4);
    }

    // Callout feeds: small, at the left and right edges, newest at the bottom, sliding in from the side.
    for (const side of [-1, 1] as const) {
      let slot = 0;
      for (let i = this.popups.length - 1; i >= 0; i--) {
        const p = this.popups[i];
        if (p.side !== side) continue;
        const target = FEED_Y - slot * FEED_GAP;
        p.y += (target - p.y) * 0.45;
        const age = this.time - p.born;
        const k = age / 1.3;
        const fade = slot >= FEED_MAX ? 0 : Math.max(0, 1 - k * k * k);
        slot++;
        if (fade <= 0) continue;
        const slide = (1 - Math.min(1, age / 0.14)) * 26 * side;
        const edge = side < 0 ? 16 + slide : W - 16 + slide;
        g.globalAlpha = fade;
        g.fillStyle = p.color;
        g.fillRect(side < 0 ? edge : edge - 3, p.y - 15, 3, 30);
        g.textAlign = side < 0 ? 'left' : 'right';
        const tx = side < 0 ? edge + 9 : edge - 9;
        g.font = 'italic 900 15px system-ui, Arial';
        g.fillText(p.text, tx, p.y - 1);
        g.fillStyle = 'rgba(255,255,255,.85)';
        g.font = 'italic 800 12px system-ui, Arial';
        g.fillText(p.sub, tx, p.y + 13);
      }
    }
    g.globalAlpha = 1;

    // Speedometer, bottom right
    const cx = W - 78;
    const cy = H - 66;
    const r = 50;
    const a0 = Math.PI * 0.75;
    const a1 = Math.PI * 2.25;
    const top = this.t.topMph * this.t.nitroBoost;
    const frac = clamp(this.speed / top, 0, 1);
    g.lineCap = 'round';
    g.lineWidth = 6;
    g.strokeStyle = 'rgba(255,255,255,.14)';
    g.beginPath();
    g.arc(cx, cy, r, a0, a1);
    g.stroke();
    g.strokeStyle = this.nitroOn ? '#35f2ff' : frac > 0.85 ? '#ff2e4d' : '#f4f7fb';
    g.beginPath();
    g.arc(cx, cy, r, a0, a0 + (a1 - a0) * frac);
    g.stroke();
    // nitro ring
    g.lineWidth = 4;
    g.strokeStyle = 'rgba(53,242,255,.18)';
    g.beginPath();
    g.arc(cx, cy, r - 11, a0, a1);
    g.stroke();
    g.strokeStyle = '#35f2ff';
    g.beginPath();
    g.arc(cx, cy, r - 11, a0, a0 + (a1 - a0) * (this.nitroTank / this.t.nitroSecs));
    g.stroke();
    g.lineCap = 'butt';
    g.textAlign = 'center';
    g.fillStyle = '#f4f7fb';
    g.font = 'italic 900 30px system-ui, Arial';
    g.fillText(String(Math.round(kmh ? this.speed * 1.609 : this.speed)), cx, cy + 9);
    g.fillStyle = 'rgba(244,247,251,.6)';
    g.font = '800 10px system-ui, Arial';
    g.fillText(kmh ? 'km/h' : 'mph', cx, cy + 24);
    g.fillStyle = this.nitroTank >= 0.6 ? '#35f2ff' : 'rgba(53,242,255,.4)';
    g.font = '800 10px system-ui, Arial';
    g.fillText(this.nitroOn ? 'NITRO' : 'Nitro ↑', cx, cy + 46);

    // Countdown
    if (this.state === 'countdown') {
      const n = Math.ceil(this.countT);
      const k = this.countT - Math.floor(this.countT);
      g.textAlign = 'center';
      g.save();
      g.translate(W / 2, 250);
      g.scale(1 + k * 0.4, 1 + k * 0.4);
      g.globalAlpha = 0.4 + (1 - k) * 0.6;
      g.fillStyle = '#ffffff';
      g.font = 'italic 900 96px system-ui, Arial';
      g.fillText(String(n), 0, 30);
      g.restore();
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(244,247,251,.75)';
      g.font = '700 14px system-ui, Arial';
      g.fillText('Swipe left and right to change lanes', W / 2, 320);
    } else if (this.time < 4.4 && this.state === 'run') {
      g.globalAlpha = Math.max(0, 1 - (this.time - 3) / 1.4);
      g.textAlign = 'center';
      g.fillStyle = '#35f2ff';
      g.font = 'italic 900 64px system-ui, Arial';
      g.fillText('GO', W / 2, 280);
      g.globalAlpha = 1;
    }
    if (this.state === 'crash' || this.state === 'over') {
      g.textAlign = 'center';
      g.globalAlpha = Math.min(1, this.crashT * 2);
      g.fillStyle = '#ff2e4d';
      g.font = 'italic 900 58px system-ui, Arial';
      g.shadowColor = 'rgba(255,46,77,.6)';
      g.shadowBlur = 18;
      g.fillText('Wrecked', W / 2, 250);
      g.shadowBlur = 0;
      if (this.res.lostCombo > 0) {
        g.fillStyle = '#ffffff';
        g.font = 'italic 800 16px system-ui, Arial';
        g.fillText(`Combo lost: −${this.res.lostCombo.toLocaleString('en-US')}`, W / 2, 280);
      }
      g.globalAlpha = 1;
    }
  }
}

function quad(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.lineTo(x3, y3);
  g.lineTo(x4, y4);
  g.closePath();
  g.fill();
}

function path4(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.lineTo(x3, y3);
  g.lineTo(x4, y4);
  g.closePath();
}
