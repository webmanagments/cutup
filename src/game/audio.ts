// All sound is synthesized with Web Audio: no files to download.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let enabled = true;

function ac(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const C = window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.7;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 5;
    master.connect(comp).connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null;
  }
  return ctx;
}

export function unlockAudio() {
  const c = ac();
  if (c && c.state === 'suspended') void c.resume().catch(() => {});
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (master && ctx) master.gain.setTargetAtTime(on ? 0.7 : 0, ctx.currentTime, 0.05);
}

const ready = () => enabled && !!ctx && ctx.state === 'running' && !!master;

function tone(freq: number, dur: number, type: OscillatorType, gain: number, to?: number, at = 0, pan = 0) {
  if (!ready()) return;
  const c = ctx!;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  const p = c.createStereoPanner();
  p.pan.value = pan;
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(p).connect(master!);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function hiss(dur: number, f0: number, f1: number, gain: number, q = 1, pan = 0, at = 0, attack = 0.01) {
  if (!ready() || !noise) return;
  const c = ctx!;
  const t = c.currentTime + at;
  const s = c.createBufferSource();
  s.buffer = noise;
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const p = c.createStereoPanner();
  p.pan.value = pan;
  s.connect(f).connect(g).connect(p).connect(master!);
  s.start(t, Math.random());
  s.stop(t + dur + 0.02);
}

export const sfx = {
  move: () => tone(1700, 0.03, 'triangle', 0.03),
  select: () => {
    tone(660, 0.06, 'triangle', 0.08);
    tone(990, 0.08, 'triangle', 0.07, undefined, 0.05);
  },
  back: () => tone(520, 0.08, 'triangle', 0.06, 380),
  buy: () => [880, 1320, 1760].forEach((f, i) => tone(f, 0.16, 'triangle', 0.08, undefined, i * 0.06)),
  deny: () => tone(200, 0.18, 'square', 0.04, 150),
  count: () => tone(660, 0.12, 'square', 0.05),
  go: () => tone(1320, 0.3, 'square', 0.05),
  lane: (pan: number) => hiss(0.16, 900, 2400, 0.05, 1.2, pan * 0.6),
  near: (pan: number, tier: number) => {
    hiss(0.32, 2600, 500, 0.22 + tier * 0.06, 0.9, pan, 0, 0.02);
    tone(1200 + tier * 300, 0.12, 'triangle', 0.05, 1800 + tier * 400, 0.03);
  },
  thread: () => [1047, 1568, 2093].forEach((f, i) => tone(f, 0.18, 'triangle', 0.07, undefined, i * 0.05)),
  bank: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.2, 'triangle', 0.07, undefined, i * 0.07)),
  comboLost: () => tone(440, 0.4, 'sawtooth', 0.04, 160),
  nitro: () => {
    hiss(0.9, 600, 3200, 0.2, 0.6, 0, 0, 0.05);
    tone(90, 0.5, 'sawtooth', 0.08, 180);
  },
  crash: () => {
    hiss(1.2, 1800, 120, 0.7, 0.5);
    hiss(0.5, 5000, 2500, 0.25, 2, 0, 0.05);
    tone(80, 0.8, 'sine', 0.5, 30);
    [0.08, 0.17, 0.3].forEach(at => tone(2000 + Math.random() * 2000, 0.06, 'square', 0.03, 900, at));
  },
  levelUp: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, 'triangle', 0.08, undefined, i * 0.08)),
  cash: () => {
    tone(1976, 0.08, 'square', 0.035);
    tone(2637, 0.3, 'square', 0.035, undefined, 0.07);
  },
  // ---- pursuit ----
  pitWarn: () => {
    tone(880, 0.09, 'square', 0.05);
    tone(880, 0.09, 'square', 0.05, undefined, 0.13);
  },
  screech: (pan: number) => hiss(0.55, 3200, 2400, 0.16, 6, pan, 0, 0.02),
  copDown: (pan: number, vol: number) => {
    hiss(0.9, 1600, 140, 0.5 * vol, 0.5, pan);
    tone(70, 0.6, 'sine', 0.35 * vol, 30);
  },
  radio: () => {
    hiss(0.12, 2600, 2600, 0.05, 3);
    tone(1400, 0.05, 'square', 0.03, undefined, 0.02);
    tone(1900, 0.05, 'square', 0.03, undefined, 0.09);
  },
  escape: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.3, 'triangle', 0.08, undefined, i * 0.07)),
  busted: () => {
    tone(330, 0.5, 'sawtooth', 0.05, 110);
    [0, 0.18, 0.36].forEach(at => tone(988, 0.12, 'square', 0.04, 740, at));
  },
};

// ---- Siren -------------------------------------------------------------------
// A wail (slow sweep) that switches to a yelp (fast sweep) when a unit is right on you.
export class Siren {
  private o: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private pan: StereoPannerNode | null = null;

  start() {
    const c = ac();
    if (!c || !master) return;
    this.o = c.createOscillator();
    this.o.type = 'sawtooth';
    this.o.frequency.value = 1000;
    this.lfo = c.createOscillator();
    this.lfo.type = 'triangle';
    this.lfo.frequency.value = 0.3;
    const depth = c.createGain();
    depth.gain.value = 380;
    this.lfo.connect(depth).connect(this.o.frequency);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1900;
    this.gain = c.createGain();
    this.gain.gain.value = 0;
    this.pan = c.createStereoPanner();
    this.o.connect(f).connect(this.gain).connect(this.pan).connect(master);
    this.o.start();
    this.lfo.start();
  }

  /** level 0..1, pan −1..1, yelp when a unit is close. */
  update(level: number, pan: number, yelp: boolean) {
    if (!ctx || !this.gain || !this.pan || !this.lfo) return;
    const t = ctx.currentTime;
    this.gain.gain.setTargetAtTime(enabled ? level * 0.045 : 0, t, 0.15);
    this.pan.pan.setTargetAtTime(pan * 0.8, t, 0.2);
    this.lfo.frequency.setTargetAtTime(yelp ? 3.4 : 0.3, t, 0.1);
  }

  stop() {
    if (!ctx || !this.gain) return;
    this.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    const o = this.o;
    const l = this.lfo;
    setTimeout(() => {
      try {
        o?.stop();
        l?.stop();
      } catch {
        /* already stopped */
      }
    }, 500);
    this.o = this.lfo = null;
    this.gain = null;
  }
}

// ---- Engine ------------------------------------------------------------------
// Two detuned oscillators through a low-pass filter; pitch follows RPM through six gears.
export class Engine {
  private osc: OscillatorNode[] = [];
  private gain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private wind: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private lastGear = 0;

  constructor(
    private pitch: number,
    private electric: boolean,
  ) {}

  start() {
    const c = ac();
    if (!c || !master || !noise) return;
    this.gain = c.createGain();
    this.gain.gain.value = 0;
    this.filter = c.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 900;
    this.filter.Q.value = 3;
    const types: OscillatorType[] = this.electric ? ['sine', 'triangle'] : ['sawtooth', 'square'];
    for (let i = 0; i < 2; i++) {
      const o = c.createOscillator();
      o.type = types[i];
      o.frequency.value = 60;
      o.detune.value = i ? -1200 + 8 : 0;
      o.connect(this.filter);
      o.start();
      this.osc.push(o);
    }
    this.filter.connect(this.gain).connect(master);
    this.wind = c.createBufferSource();
    this.wind.buffer = noise;
    this.wind.loop = true;
    this.windFilter = c.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 700;
    this.windFilter.Q.value = 0.4;
    this.windGain = c.createGain();
    this.windGain.gain.value = 0;
    this.wind.connect(this.windFilter).connect(this.windGain).connect(master);
    this.wind.start();
  }

  /** speed and top in mph; nitro boosts the note; throttle 0..1. */
  update(speed: number, top: number, nitro: boolean, braking: boolean) {
    if (!ctx || !this.gain || !this.filter) return;
    const t = ctx.currentTime;
    const frac = Math.min(1.2, speed / top);
    let freq: number;
    if (this.electric) {
      freq = 70 + frac * 520;
    } else {
      const gears = [0, 0.2, 0.36, 0.52, 0.67, 0.83, 1.25];
      let g = 0;
      while (g < 5 && frac > gears[g + 1]) g++;
      const lo = gears[g];
      const hi = gears[g + 1];
      const rpm = 0.38 + ((frac - lo) / (hi - lo)) * 0.62;
      if (g !== this.lastGear) {
        this.lastGear = g;
        if (g > 0) tone(160, 0.06, 'square', 0.03); // shift blip
      }
      freq = (34 + rpm * 120) * this.pitch;
    }
    if (nitro) freq *= 1.08;
    for (const o of this.osc) o.frequency.setTargetAtTime(freq, t, 0.05);
    this.filter.frequency.setTargetAtTime(500 + frac * 2400 + (nitro ? 900 : 0), t, 0.08);
    this.gain.gain.setTargetAtTime(enabled ? (braking ? 0.05 : 0.09) + frac * 0.05 : 0, t, 0.1);
    if (this.windGain && this.windFilter) {
      this.windGain.gain.setTargetAtTime(enabled ? Math.pow(frac, 2) * 0.12 : 0, t, 0.2);
      this.windFilter.frequency.setTargetAtTime(500 + frac * 1500, t, 0.2);
    }
  }

  stop() {
    if (!ctx) return;
    const t = ctx.currentTime;
    this.gain?.gain.setTargetAtTime(0, t, 0.08);
    this.windGain?.gain.setTargetAtTime(0, t, 0.08);
    const osc = this.osc;
    const wind = this.wind;
    setTimeout(() => {
      osc.forEach(o => {
        try {
          o.stop();
        } catch {
          /* already stopped */
        }
      });
      try {
        wind?.stop();
      } catch {
        /* already stopped */
      }
    }, 400);
    this.osc = [];
    this.wind = null;
  }
}
