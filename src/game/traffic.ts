// Traffic vehicles (rear views) and roadside scenery sprites, pre-rendered once.
import {SPRITE_W} from './cars';

export type TrafficKind = 'sedan' | 'hatch' | 'suv' | 'pickup' | 'van' | 'box' | 'semi';

export interface TrafficSprite {
  kind: TrafficKind;
  canvas: HTMLCanvasElement;
  glow: HTMLCanvasElement; // taillights
  h: number; // canvas height (width is SPRITE_W)
  sigL: [number, number]; // turn-signal lamp positions in sprite pixels
  sigR: [number, number];
  length: number; // world length (units)
  slow: boolean; // trucks cruise slower
  bodyW: number; // body width in sprite pixels (for collisions)
}

const COLORS = ['#c9d1da', '#8e99a6', '#4b5563', '#2f5aa8', '#a3282f', '#e5e7eb', '#1f6f5c', '#b8862b', '#6b4fa0', '#d6d0c4', '#3b4652', '#8c2f39'];

const SPEC: Record<TrafficKind, {w: number; body: number; cab: number; glass: number; h: number; len: number; slow: boolean}> = {
  sedan: {w: 172, body: 52, cab: 34, glass: 26, h: 150, len: 950, slow: false},
  hatch: {w: 162, body: 56, cab: 40, glass: 30, h: 150, len: 850, slow: false},
  suv: {w: 186, body: 68, cab: 44, glass: 30, h: 170, len: 1050, slow: false},
  pickup: {w: 190, body: 54, cab: 40, glass: 26, h: 160, len: 1150, slow: false},
  van: {w: 184, body: 112, cab: 0, glass: 0, h: 180, len: 1250, slow: true},
  box: {w: 204, body: 160, cab: 0, glass: 0, h: 220, len: 1900, slow: true},
  semi: {w: 212, body: 176, cab: 0, glass: 0, h: 236, len: 2700, slow: true},
};

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function makeTrafficSprite(kind: TrafficKind, color: string): TrafficSprite {
  const s = SPEC[kind];
  const W = SPRITE_W;
  const H = s.h;
  const cx = W / 2;
  const ground = H - 12;
  const half = s.w / 2;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  // shadow + tyres
  g.fillStyle = 'rgba(0,0,0,.75)';
  g.beginPath();
  g.ellipse(cx, ground, half + 12, 9, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#0c0e11';
  for (const x of [cx - half + 4, cx + half - 30]) {
    rr(g, x, ground - 26, 26, 28, 5);
    g.fill();
  }
  const bodyTop = ground - 20 - s.body;
  const grad = g.createLinearGradient(0, bodyTop, 0, ground - 20);
  grad.addColorStop(0, shade(color, 1.15));
  grad.addColorStop(1, shade(color, 0.55));
  // bumper
  g.fillStyle = '#16191e';
  rr(g, cx - half + 2, ground - 28, s.w - 4, 20, 6);
  g.fill();
  let lightY: number;
  if (kind === 'van' || kind === 'box' || kind === 'semi') {
    // tall box body with rear doors
    g.fillStyle = grad;
    rr(g, cx - half, bodyTop, s.w, s.body, kind === 'van' ? 12 : 4);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,.35)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx, bodyTop + 8);
    g.lineTo(cx, ground - 24);
    g.stroke();
    if (kind !== 'van') {
      for (let y = bodyTop + 20; y < ground - 30; y += 26) {
        g.beginPath();
        g.moveTo(cx - half + 8, y);
        g.lineTo(cx + half - 8, y);
        g.strokeStyle = 'rgba(0,0,0,.18)';
        g.stroke();
      }
      // reflective strip and under-ride bar
      g.fillStyle = 'rgba(255,60,60,.6)';
      for (let x = cx - half + 6; x < cx + half - 12; x += 24) g.fillRect(x, ground - 34, 12, 4);
      g.fillStyle = '#2b3038';
      g.fillRect(cx - half + 10, ground - 22, s.w - 20, 6);
    } else {
      g.fillStyle = '#0d1218';
      rr(g, cx - half + 14, bodyTop + 10, s.w / 2 - 20, 34, 5);
      g.fill();
      rr(g, cx + 6, bodyTop + 10, s.w / 2 - 20, 34, 5);
      g.fill();
    }
    lightY = ground - (kind === 'van' ? 52 : 46);
  } else {
    // car body
    g.fillStyle = grad;
    rr(g, cx - half, bodyTop, s.w, s.body, 12);
    g.fill();
    // cabin
    const cabW = s.w * (kind === 'pickup' ? 0.66 : 0.72);
    const cabTop = bodyTop - s.cab;
    g.fillStyle = shade(color, 0.95);
    g.beginPath();
    g.moveTo(cx - cabW / 2 - 8, bodyTop + 2);
    g.lineTo(cx - cabW / 2 + 6, cabTop + 6);
    g.quadraticCurveTo(cx - cabW / 2 + 10, cabTop, cx - cabW / 2 + 18, cabTop);
    g.lineTo(cx + cabW / 2 - 18, cabTop);
    g.quadraticCurveTo(cx + cabW / 2 - 10, cabTop, cx + cabW / 2 - 6, cabTop + 6);
    g.lineTo(cx + cabW / 2 + 8, bodyTop + 2);
    g.closePath();
    g.fill();
    g.fillStyle = '#0c1118';
    g.beginPath();
    g.moveTo(cx - cabW / 2 - 1, bodyTop);
    g.lineTo(cx - cabW / 2 + 10, cabTop + 7);
    g.lineTo(cx + cabW / 2 - 10, cabTop + 7);
    g.lineTo(cx + cabW / 2 + 1, bodyTop);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(160,200,240,.18)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cx - cabW / 5, cabTop + 10);
    g.lineTo(cx - cabW / 5 - 8, bodyTop - 3);
    g.stroke();
    if (kind === 'pickup') {
      g.fillStyle = shade(color, 0.7);
      g.fillRect(cx - half + 8, bodyTop + 6, s.w - 16, 4);
    }
    // plate
    g.fillStyle = '#d9dde3';
    rr(g, cx - 15, ground - 46, 30, 11, 2);
    g.fill();
    lightY = bodyTop + 12;
  }
  // taillight housings (unlit)
  const lw = kind === 'box' || kind === 'semi' ? 16 : 26;
  const lh = kind === 'box' || kind === 'semi' ? 12 : 11;
  g.fillStyle = '#4a0d17';
  rr(g, cx - half + 8, lightY, lw, lh, 3);
  g.fill();
  rr(g, cx + half - 8 - lw, lightY, lw, lh, 3);
  g.fill();

  const glow = document.createElement('canvas');
  glow.width = W;
  glow.height = H;
  const l = glow.getContext('2d')!;
  l.shadowColor = '#ff2e4d';
  l.shadowBlur = 12;
  l.fillStyle = '#ff2e4d';
  rr(l, cx - half + 8, lightY, lw, lh, 3);
  l.fill();
  rr(l, cx + half - 8 - lw, lightY, lw, lh, 3);
  l.fill();
  if (kind === 'box' || kind === 'semi') {
    // clearance lights along the top edge
    l.fillStyle = '#ffae2b';
    l.shadowColor = '#ffae2b';
    for (const x of [cx - half + 10, cx - 20, cx, cx + 20, cx + half - 14]) l.fillRect(x, bodyTop + 4, 6, 4);
  }
  return {
    kind,
    canvas: c,
    glow,
    h: H,
    sigL: [cx - half + 8 + lw / 2, lightY + lh / 2],
    sigR: [cx + half - 8 - lw / 2, lightY + lh / 2],
    length: s.len,
    slow: s.slow,
    bodyW: s.w,
  };
}

const KINDS: TrafficKind[] = ['sedan', 'sedan', 'sedan', 'hatch', 'hatch', 'suv', 'suv', 'pickup', 'van', 'box', 'semi'];

let pool: TrafficSprite[] | null = null;
/** A varied pool of pre-rendered traffic (built once, reused every run). */
export function trafficPool(): TrafficSprite[] {
  if (pool) return pool;
  pool = [];
  let ci = 0;
  for (const k of KINDS) {
    const n = k === 'box' || k === 'semi' ? 2 : 3;
    for (let i = 0; i < n; i++) pool.push(makeTrafficSprite(k, k === 'box' || k === 'semi' ? ['#e8ebee', '#c7ccd3', '#b9c2cc'][i % 3] : COLORS[ci++ % COLORS.length]));
  }
  return pool;
}

// ---- Scenery --------------------------------------------------------------------
export function lampSprite(side: -1 | 1): HTMLCanvasElement {
  // Pole stands at the left edge of the canvas (side 1 = right of road, arm reaching left).
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 400;
  const g = c.getContext('2d')!;
  const px = side === 1 ? 140 : 20;
  const dir = side === 1 ? -1 : 1;
  g.strokeStyle = '#2b333d';
  g.lineWidth = 9;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(px, 400);
  g.lineTo(px, 40);
  g.quadraticCurveTo(px, 14, px + dir * 30, 14);
  g.lineTo(px + dir * 120, 14);
  g.stroke();
  g.fillStyle = '#1e252d';
  g.fillRect(side === 1 ? px - 128 : px + 100, 10, 30, 12);
  g.fillStyle = '#fff3d6';
  g.fillRect(side === 1 ? px - 124 : px + 104, 20, 22, 4);
  return c;
}

export function glowSprite(color: string, size = 128): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  r.addColorStop(0, color);
  r.addColorStop(0.25, color.replace(/[\d.]+\)$/, '0.35)'));
  r.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  g.fillStyle = r;
  g.fillRect(0, 0, size, size);
  return c;
}

/** A wide strip of city skyline with lit windows, tiled behind the horizon. */
export function skylineSprite(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 2000;
  c.height = 170;
  const g = c.getContext('2d')!;
  let seed = 11;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let layer = 0; layer < 2; layer++) {
    let x = 0;
    while (x < 2000) {
      const w = 30 + r() * 70;
      const h = (layer === 0 ? 40 : 70) + r() * (layer === 0 ? 70 : 95);
      const top = 170 - h;
      g.fillStyle = layer === 0 ? '#070b14' : '#0a1020';
      g.fillRect(x, top, w, h);
      // windows
      for (let wy = top + 6; wy < 166; wy += 7) {
        for (let wx = x + 4; wx < x + w - 4; wx += 6) {
          if (r() < (layer === 0 ? 0.16 : 0.24)) {
            const pick = r();
            g.fillStyle = pick < 0.7 ? `rgba(255,190,110,${0.35 + r() * 0.45})` : pick < 0.9 ? `rgba(140,220,255,${0.3 + r() * 0.4})` : 'rgba(255,255,255,.6)';
            g.fillRect(wx, wy, 2.5, 3);
          }
        }
      }
      if (layer === 1 && r() < 0.35) {
        g.fillStyle = '#ff2e4d';
        g.fillRect(x + w / 2 - 1, top - 10, 2, 10);
        g.beginPath();
        g.arc(x + w / 2, top - 11, 2.2, 0, Math.PI * 2);
        g.fill();
      }
      if (layer === 1 && r() < 0.12) {
        // a neon sign on the roof
        g.fillStyle = r() < 0.5 ? 'rgba(255,58,209,.85)' : 'rgba(53,242,255,.85)';
        g.fillRect(x + 6, top + 8, Math.min(40, w - 12), 4);
      }
      x += w + (layer === 0 ? 2 : 10 + r() * 30);
    }
  }
  return c;
}
