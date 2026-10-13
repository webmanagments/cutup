// The car lineup: stats, prices, unlocks, paints, and the rear-view renderer used on the road.
// Every design is original to CUT UP.

export interface Stats {
  top: number; // top speed, mph
  accel: number; // 0–100
  handling: number; // 0–100 (lane-change speed)
  nitro: number; // 0–100 (boost tank)
}

export type LightStyle = 'lshape' | 'roundpair' | 'bar' | 'squarequad' | 'hex' | 'chevron' | 'blade' | 'strip' | 'rings' | 'x';
export type Spoiler = 'none' | 'lip' | 'duck' | 'wing' | 'bigwing' | 'fin' | 'twinfin';
export type Exhaust = 'twin' | 'dual' | 'quadcenter' | 'center' | 'none' | 'jet' | 'triple';

export interface RearSpec {
  w: number; // body width (px at 220 sprite width)
  h: number; // body height
  roofW: number; // roof width
  glassH: number;
  lights: LightStyle;
  spoiler: Spoiler;
  exhaust: Exhaust;
  diffuser: number; // fin count
  flare: number; // widebody flare width
  accent?: string; // trim light colour
}

export interface CarDef {
  id: string;
  name: string;
  tier: 'Street' | 'Sport' | 'Muscle' | 'Track' | 'Super' | 'Hyper' | 'Legend';
  blurb: string;
  price: number;
  level: number;
  stats: Stats;
  paint: string; // default paint id
  rear: RearSpec;
}

export const CARS: CarDef[] = [
  {
    id: 'pocket',
    name: 'Pocket R',
    tier: 'Street',
    blurb: 'A hot hatch with a big heart. Light, nimble and free.',
    price: 0,
    level: 1,
    stats: {top: 142, accel: 48, handling: 72, nitro: 38},
    paint: 'volt',
    rear: {w: 168, h: 66, roofW: 132, glassH: 30, lights: 'lshape', spoiler: 'lip', exhaust: 'twin', diffuser: 0, flare: 0},
  },
  {
    id: 'ronin',
    name: 'Ronin GT',
    tier: 'Sport',
    blurb: 'Twin-turbo coupe built for midnight runs. Tall wing, round lights.',
    price: 12_000,
    level: 2,
    stats: {top: 166, accel: 58, handling: 76, nitro: 52},
    paint: 'pearl',
    rear: {w: 182, h: 60, roofW: 116, glassH: 26, lights: 'roundpair', spoiler: 'wing', exhaust: 'dual', diffuser: 2, flare: 0},
  },
  {
    id: 'vapor',
    name: 'Vapor S',
    tier: 'Sport',
    blurb: 'Clean lines and a full-width light bar. Quick off the line.',
    price: 26_000,
    level: 4,
    stats: {top: 176, accel: 70, handling: 70, nitro: 50},
    paint: 'ultra',
    rear: {w: 186, h: 58, roofW: 112, glassH: 24, lights: 'bar', spoiler: 'duck', exhaust: 'none', diffuser: 3, flare: 0, accent: '#35f2ff'},
  },
  {
    id: 'brute',
    name: 'Brute SS',
    tier: 'Muscle',
    blurb: 'Supercharged V8, wide hips, no manners. Fast but heavy.',
    price: 44_000,
    level: 6,
    stats: {top: 190, accel: 76, handling: 50, nitro: 64},
    paint: 'red',
    rear: {w: 196, h: 64, roofW: 120, glassH: 26, lights: 'squarequad', spoiler: 'duck', exhaust: 'twin', diffuser: 0, flare: 6},
  },
  {
    id: 'kaiju',
    name: 'Kaiju RX',
    tier: 'Track',
    blurb: 'Widebody track monster. Huge wing, hex lights, glued to the road.',
    price: 78_000,
    level: 9,
    stats: {top: 204, accel: 74, handling: 86, nitro: 64},
    paint: 'sun',
    rear: {w: 200, h: 60, roofW: 112, glassH: 24, lights: 'hex', spoiler: 'bigwing', exhaust: 'quadcenter', diffuser: 4, flare: 10},
  },
  {
    id: 'stiletto',
    name: 'Stiletto V12',
    tier: 'Super',
    blurb: 'A wedge with a V12 screaming behind your head.',
    price: 125_000,
    level: 12,
    stats: {top: 218, accel: 84, handling: 80, nitro: 70},
    paint: 'mint',
    rear: {w: 204, h: 50, roofW: 100, glassH: 18, lights: 'chevron', spoiler: 'wing', exhaust: 'center', diffuser: 5, flare: 6},
  },
  {
    id: 'phantom',
    name: 'Phantom E',
    tier: 'Hyper',
    blurb: 'Silent electric hypercar. Brutal launch, endless overboost.',
    price: 190_000,
    level: 15,
    stats: {top: 222, accel: 96, handling: 82, nitro: 78},
    paint: 'pearl',
    rear: {w: 202, h: 50, roofW: 104, glassH: 20, lights: 'blade', spoiler: 'none', exhaust: 'none', diffuser: 6, flare: 4, accent: '#35f2ff'},
  },
  {
    id: 'apex',
    name: 'Apex LM',
    tier: 'Hyper',
    blurb: 'A Le Mans prototype with number plates. Shark fin, endless grip.',
    price: 280_000,
    level: 20,
    stats: {top: 236, accel: 88, handling: 94, nitro: 80},
    paint: 'ultra',
    rear: {w: 208, h: 46, roofW: 92, glassH: 16, lights: 'strip', spoiler: 'fin', exhaust: 'center', diffuser: 7, flare: 8},
  },
  {
    id: 'nova',
    name: 'Nova X',
    tier: 'Legend',
    blurb: 'Concept car that escaped the motor show. Floating light rings.',
    price: 420_000,
    level: 25,
    stats: {top: 248, accel: 92, handling: 90, nitro: 90},
    paint: 'magenta',
    rear: {w: 206, h: 48, roofW: 96, glassH: 18, lights: 'rings', spoiler: 'none', exhaust: 'triple', diffuser: 6, flare: 6, accent: '#ff3ad1'},
  },
  {
    id: 'zero',
    name: 'KMR Zero',
    tier: 'Legend',
    blurb: 'A jet with wheels. Twin fins, afterburner, 275 mph.',
    price: 750_000,
    level: 30,
    stats: {top: 275, accel: 98, handling: 95, nitro: 100},
    paint: 'chrome',
    rear: {w: 210, h: 50, roofW: 84, glassH: 18, lights: 'x', spoiler: 'twinfin', exhaust: 'jet', diffuser: 8, flare: 10, accent: '#35f2ff'},
  },
];

export interface Paint {
  id: string;
  name: string;
  base: string;
  light: string;
  dark: string;
  level: number;
}

// Bright finishes read best on the see-through display; "Carbon" keeps lit trim so it never vanishes.
export const PAINTS: Paint[] = [
  {id: 'volt', name: 'Volt', base: '#22d3e6', light: '#b5fbff', dark: '#0b6d7a', level: 1},
  {id: 'red', name: 'Race red', base: '#f0243f', light: '#ff9aa9', dark: '#7a0d1d', level: 1},
  {id: 'pearl', name: 'Pearl', base: '#e8edf3', light: '#ffffff', dark: '#8b98a8', level: 1},
  {id: 'sun', name: 'Sunburst', base: '#ff8a1c', light: '#ffd29a', dark: '#8a3a00', level: 3},
  {id: 'ultra', name: 'Ultraviolet', base: '#8b5cf6', light: '#d8c7ff', dark: '#3b1d84', level: 5},
  {id: 'mint', name: 'Mint', base: '#34e39a', light: '#c4ffe4', dark: '#0d6b44', level: 8},
  {id: 'magenta', name: 'Hot magenta', base: '#ff3ad1', light: '#ffc2f2', dark: '#7d0b62', level: 11},
  {id: 'carbon', name: 'Carbon', base: '#3a4352', light: '#8a96a8', dark: '#151a22', level: 14},
  {id: 'chrome', name: 'Chrome gold', base: '#f5c84a', light: '#fff4c4', dark: '#8a5a00', level: 18},
];

export const carById = (id: string) => CARS.find(c => c.id === id) ?? CARS[0];
export const paintById = (id: string) => PAINTS.find(p => p.id === id) ?? PAINTS[0];

/** Overall rating out of 999, for the garage badge. */
export const rating = (s: Stats) => Math.round(((s.top - 120) / 160) * 400 + s.accel * 2 + s.handling * 1.8 + s.nitro * 1.2);

// ---- Gameplay numbers derived from stats ----------------------------------------
export const tune = (s: Stats) => ({
  topMph: s.top,
  accelMph: 7 + s.accel * 0.17, // mph per second
  laneTime: 0.42 - s.handling * 0.0028, // seconds per lane change
  nitroSecs: 2.2 + s.nitro * 0.04,
  nitroBoost: 1.18 + s.nitro * 0.0012,
});

// ---- Rear-view sprites ------------------------------------------------------------
export const SPRITE_W = 240;
export const SPRITE_H = 150;

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const RED = '#ff2e4d';

/** Light shapes for each style, centred at (cx, y) with the body half-width. Drawn once as body detail and once as glow. */
function lightShapes(ctx: CanvasRenderingContext2D, style: LightStyle, cx: number, y: number, half: number) {
  const L = cx - half + 10;
  const R = cx + half - 10;
  ctx.beginPath();
  switch (style) {
    case 'lshape':
      for (const s of [-1, 1]) {
        const x = s < 0 ? L : R;
        ctx.moveTo(x, y);
        ctx.lineTo(x + s * -34, y);
        ctx.lineTo(x + s * -34, y + 5);
        ctx.lineTo(x + s * -8, y + 5);
        ctx.lineTo(x + s * -8, y + 13);
        ctx.lineTo(x, y + 13);
        ctx.closePath();
      }
      break;
    case 'roundpair':
      for (const x of [L + 9, L + 31, R - 9, R - 31]) {
        ctx.moveTo(x + 9, y + 7);
        ctx.arc(x, y + 7, 9, 0, Math.PI * 2);
      }
      break;
    case 'bar':
      ctx.rect(L, y + 2, R - L, 6);
      ctx.rect(L, y, 26, 10);
      ctx.rect(R - 26, y, 26, 10);
      break;
    case 'squarequad':
      for (const x of [L, L + 24, R - 20, R - 44]) ctx.rect(x, y - 1, 20, 14);
      break;
    case 'hex':
      for (const x of [L + 14, R - 14]) {
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI / 3) * k;
          const px = x + Math.cos(a) * 13;
          const py = y + 7 + Math.sin(a) * 9;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      }
      break;
    case 'chevron':
      for (const s of [-1, 1]) {
        const x = s < 0 ? L : R;
        ctx.moveTo(x, y);
        ctx.lineTo(x - s * 40, y + 7);
        ctx.lineTo(x, y + 14);
        ctx.lineTo(x - s * 10, y + 7);
        ctx.closePath();
      }
      break;
    case 'blade':
      ctx.moveTo(L - 4, y + 4);
      ctx.lineTo(R + 4, y + 4);
      ctx.lineTo(R - 4, y + 8);
      ctx.lineTo(L + 4, y + 8);
      ctx.closePath();
      break;
    case 'strip':
      ctx.rect(L + 6, y + 3, R - L - 12, 4);
      ctx.rect(cx - 3, y - 26, 6, 16); // rain light on the fin
      break;
    case 'rings':
      for (const x of [L + 18, R - 18]) {
        ctx.moveTo(x + 15, y + 7);
        ctx.arc(x, y + 7, 15, 0, Math.PI * 2);
        ctx.moveTo(x + 9, y + 7);
        ctx.arc(x, y + 7, 9, 0, Math.PI * 2, true);
      }
      break;
    case 'x':
      for (const s of [-1, 1]) {
        const x = s < 0 ? L + 20 : R - 20;
        ctx.moveTo(x - 18, y - 4);
        ctx.lineTo(x - 13, y - 4);
        ctx.lineTo(x, y + 5);
        ctx.lineTo(x + 13, y - 4);
        ctx.lineTo(x + 18, y - 4);
        ctx.lineTo(x + 3, y + 7);
        ctx.lineTo(x + 18, y + 18);
        ctx.lineTo(x + 13, y + 18);
        ctx.lineTo(x, y + 9);
        ctx.lineTo(x - 13, y + 18);
        ctx.lineTo(x - 18, y + 18);
        ctx.lineTo(x - 3, y + 7);
        ctx.closePath();
      }
      break;
  }
}

export interface CarSprite {
  body: HTMLCanvasElement; // the car with unlit lights
  glow: HTMLCanvasElement; // lights only, for additive glow (brighter when braking)
  exhausts: {x: number; y: number}[]; // nozzle centres in sprite pixels (for flames)
  lightY: number;
}

const cache = new Map<string, CarSprite>();

export function carSprite(car: CarDef, paint: Paint): CarSprite {
  const key = `${car.id}:${paint.id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const s = car.rear;
  const W = SPRITE_W;
  const H = SPRITE_H;
  const cx = W / 2;
  const ground = H - 14;
  const half = s.w / 2;
  const bodyTop = ground - 22 - s.h;
  const lightY = bodyTop + 14;

  const body = document.createElement('canvas');
  body.width = W;
  body.height = H;
  const g = body.getContext('2d')!;

  // Shadow
  const sh = g.createRadialGradient(cx, ground + 2, 10, cx, ground + 2, half + 20);
  sh.addColorStop(0, 'rgba(0,0,0,.8)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sh;
  g.fillRect(cx - half - 24, ground - 14, s.w + 48, 26);

  // Tyres
  g.fillStyle = '#0d0f12';
  for (const x of [cx - half - s.flare + 2, cx + half + s.flare - 30]) rr(g, x, ground - 30, 28, 32, 6), g.fill();
  g.fillStyle = '#1d222a';
  for (const x of [cx - half - s.flare + 6, cx + half + s.flare - 26]) g.fillRect(x, ground - 26, 20, 3);

  // Widebody flares
  if (s.flare) {
    g.fillStyle = paint.dark;
    for (const sgn of [-1, 1]) {
      g.beginPath();
      const x0 = cx + sgn * half;
      g.moveTo(x0, bodyTop + s.h * 0.35);
      g.quadraticCurveTo(x0 + sgn * (s.flare + 6), bodyTop + s.h * 0.55, x0 + sgn * s.flare, ground - 22);
      g.lineTo(x0, ground - 22);
      g.closePath();
      g.fill();
    }
  }

  // Lower bumper + diffuser
  g.fillStyle = '#14181f';
  rr(g, cx - half + 4, ground - 30, s.w - 8, 26, 8);
  g.fill();
  g.strokeStyle = '#2a313c';
  g.lineWidth = 2;
  for (let i = 0; i < s.diffuser; i++) {
    const x = cx - (s.diffuser - 1) * 9 + i * 18;
    g.beginPath();
    g.moveTo(x, ground - 28);
    g.lineTo(x, ground - 6);
    g.stroke();
  }

  // Body shell
  const paintGrad = g.createLinearGradient(0, bodyTop, 0, ground - 22);
  paintGrad.addColorStop(0, paint.light);
  paintGrad.addColorStop(0.25, paint.base);
  paintGrad.addColorStop(1, paint.dark);
  g.fillStyle = paintGrad;
  g.beginPath();
  g.moveTo(cx - half + 6, ground - 22);
  g.lineTo(cx - half, bodyTop + 14);
  g.quadraticCurveTo(cx - half + 2, bodyTop + 2, cx - half + 16, bodyTop);
  g.lineTo(cx + half - 16, bodyTop);
  g.quadraticCurveTo(cx + half - 2, bodyTop + 2, cx + half, bodyTop + 14);
  g.lineTo(cx + half - 6, ground - 22);
  g.closePath();
  g.fill();
  // Roundness: darken toward the flanks, plus a sheen along the top edge and a crease.
  g.save();
  g.globalCompositeOperation = 'source-atop';
  const side = g.createLinearGradient(cx - half, 0, cx + half, 0);
  side.addColorStop(0, 'rgba(0,0,0,.45)');
  side.addColorStop(0.18, 'rgba(0,0,0,0)');
  side.addColorStop(0.82, 'rgba(0,0,0,0)');
  side.addColorStop(1, 'rgba(0,0,0,.45)');
  g.fillStyle = side;
  g.fillRect(cx - half - 20, bodyTop - 10, s.w + 40, s.h + 40);
  g.restore();
  g.fillStyle = 'rgba(255,255,255,.22)';
  g.fillRect(cx - half + 12, bodyTop + 3, s.w - 24, 2.5);
  g.fillStyle = 'rgba(0,0,0,.28)';
  g.fillRect(cx - half + 8, bodyTop + s.h * 0.62, s.w - 16, 2);

  // Cabin + rear glass
  const cabTop = bodyTop - s.glassH - 6;
  g.fillStyle = paint.base;
  g.beginPath();
  g.moveTo(cx - s.roofW / 2 - 14, bodyTop + 1);
  g.lineTo(cx - s.roofW / 2 + 4, cabTop + 4);
  g.quadraticCurveTo(cx - s.roofW / 2 + 8, cabTop, cx - s.roofW / 2 + 16, cabTop);
  g.lineTo(cx + s.roofW / 2 - 16, cabTop);
  g.quadraticCurveTo(cx + s.roofW / 2 - 8, cabTop, cx + s.roofW / 2 - 4, cabTop + 4);
  g.lineTo(cx + s.roofW / 2 + 14, bodyTop + 1);
  g.closePath();
  g.fill();
  const glass = g.createLinearGradient(0, cabTop, 0, bodyTop);
  glass.addColorStop(0, '#1b2735');
  glass.addColorStop(1, '#0a0f16');
  g.fillStyle = glass;
  g.beginPath();
  g.moveTo(cx - s.roofW / 2 - 6, bodyTop - 1);
  g.lineTo(cx - s.roofW / 2 + 8, cabTop + 6);
  g.lineTo(cx + s.roofW / 2 - 8, cabTop + 6);
  g.lineTo(cx + s.roofW / 2 + 6, bodyTop - 1);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(180,220,255,.25)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(cx - s.roofW / 4, cabTop + 10);
  g.lineTo(cx - s.roofW / 4 - 12, bodyTop - 4);
  g.stroke();

  // Spoilers
  g.fillStyle = paint.dark;
  if (s.spoiler === 'lip') {
    rr(g, cx - s.roofW / 2 + 4, cabTop - 4, s.roofW - 8, 6, 3);
    g.fill();
  } else if (s.spoiler === 'duck') {
    g.beginPath();
    g.moveTo(cx - half + 8, bodyTop + 2);
    g.lineTo(cx - half + 4, bodyTop - 5);
    g.lineTo(cx + half - 4, bodyTop - 5);
    g.lineTo(cx + half - 8, bodyTop + 2);
    g.closePath();
    g.fill();
  } else if (s.spoiler === 'wing' || s.spoiler === 'bigwing') {
    const big = s.spoiler === 'bigwing';
    const wy = big ? cabTop - 8 : bodyTop - 16;
    const ww = big ? s.w + 8 : s.w - 24;
    g.fillStyle = '#1a1f27';
    for (const sx of [-1, 1]) g.fillRect(cx + sx * ww * 0.28 - 3, wy, 6, bodyTop - wy + 2);
    g.fillStyle = big ? '#1a1f27' : paint.dark;
    rr(g, cx - ww / 2, wy - 6, ww, 9, 3);
    g.fill();
    if (big) {
      g.fillStyle = paint.base;
      for (const sx of [-1, 1]) g.fillRect(cx + sx * (ww / 2 - 2) - 3, wy - 14, 6, 22);
    }
  } else if (s.spoiler === 'fin') {
    g.fillStyle = paint.dark;
    g.fillRect(cx - 4, cabTop - 18, 8, bodyTop - cabTop + 18);
    g.fillStyle = '#1a1f27';
    rr(g, cx - half + 12, bodyTop - 9, s.w - 24, 7, 3);
    g.fill();
  } else if (s.spoiler === 'twinfin') {
    g.fillStyle = paint.dark;
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.moveTo(cx + sx * 40, bodyTop + 4);
      g.lineTo(cx + sx * 50, cabTop - 26);
      g.lineTo(cx + sx * 58, cabTop - 26);
      g.lineTo(cx + sx * 56, bodyTop + 4);
      g.closePath();
      g.fill();
    }
  }

  // Light housings (dark), then unlit lenses
  g.fillStyle = '#0c0e12';
  rr(g, cx - half + 6, lightY - 5, s.w - 12, 24, 6);
  g.fill();
  g.fillStyle = '#5a0f1c';
  lightShapes(g, s.lights, cx, lightY, half);
  g.fill('evenodd');

  // Plate + badge
  if (s.exhaust !== 'jet') {
    g.fillStyle = '#e9edf2';
    rr(g, cx - 18, ground - 52, 36, 13, 2);
    g.fill();
    g.fillStyle = '#0b0e13';
    g.font = '900 9px system-ui, Arial';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('CUT UP', cx, ground - 45);
  }
  if (s.accent) {
    g.fillStyle = s.accent;
    g.fillRect(cx - half + 14, ground - 23, s.w - 28, 2);
  }

  // Exhaust tips
  const exhausts: {x: number; y: number}[] = [];
  const ey = ground - 15;
  const tips: number[] =
    s.exhaust === 'twin' ? [-half + 30, half - 30]
    : s.exhaust === 'dual' ? [-half + 26, -half + 40, half - 40, half - 26]
    : s.exhaust === 'quadcenter' ? [-21, -7, 7, 21]
    : s.exhaust === 'center' ? [0]
    : s.exhaust === 'triple' ? [-16, 0, 16]
    : s.exhaust === 'jet' ? [0]
    : [];
  for (const dx of tips) {
    const x = cx + dx;
    const r = s.exhaust === 'jet' ? 13 : s.exhaust === 'center' ? 9 : 6;
    g.fillStyle = '#9aa6b5';
    g.beginPath();
    g.arc(x, ey, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#05070a';
    g.beginPath();
    g.arc(x, ey, r - 2.5, 0, Math.PI * 2);
    g.fill();
    exhausts.push({x, y: ey});
  }
  if (s.exhaust === 'jet') {
    g.fillStyle = 'rgba(53,242,255,.35)';
    g.beginPath();
    g.arc(cx, ey, 7, 0, Math.PI * 2);
    g.fill();
  }

  // Glow layer: just the lit lenses with bloom.
  const glow = document.createElement('canvas');
  glow.width = W;
  glow.height = H;
  const l = glow.getContext('2d')!;
  l.shadowColor = RED;
  l.shadowBlur = 14;
  l.fillStyle = RED;
  lightShapes(l, s.lights, cx, lightY, half);
  l.fill('evenodd');
  l.shadowBlur = 0;
  l.fillStyle = '#ffd1d8';
  lightShapes(l, s.lights, cx, lightY, half);
  l.globalAlpha = 0.55;
  l.fill('evenodd');
  l.globalAlpha = 1;
  if (s.accent) {
    l.shadowColor = s.accent;
    l.shadowBlur = 10;
    l.fillStyle = s.accent;
    l.fillRect(cx - half + 14, ground - 23, s.w - 28, 2);
  }

  const sprite = {body, glow, exhausts, lightY};
  cache.set(key, sprite);
  return sprite;
}
