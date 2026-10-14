// Pursuit mode tuning: five heat levels. Cop speed is relative to your car's top speed, so every
// car in the garage can run from the law; what changes with heat is how hard they are to shake.

export interface Heat {
  level: number;
  name: string;
  blurb: string;
  cops: number; // units at the start of the chase
  max: number; // most units chasing at once
  speed: number; // cop top speed as a fraction of your car's (no nitro)
  sight: number; // how far (world units) a cop can see you
  escape: number; // seconds out of sight to escape
  rate: number; // chase multiplier growth per second
  cap: number; // multiplier ceiling
  react: number; // seconds of warning a cop needs to dodge traffic
  miss: number; // chance a cop reacts late to a car (and wrecks)
  pitTell: number; // how long a cop lines up before a PIT
  pitCool: number; // seconds between PIT attempts
  backup: number; // seconds between backup calls while they can see you
  ahead: boolean; // backup can arrive from ahead and try to cut you off
  roadblock: number; // seconds between rolling roadblocks (0 = none)
  heli: boolean; // helicopter: the escape meter fills slower unless you're in a tunnel
  bonus: number; // escape bonus (before the multiplier)
}

export const HEATS: Heat[] = [
  {level: 1, name: 'Patrol', blurb: 'One cruiser on your tail. Slower than you and easy to lose.', cops: 1, max: 1, speed: 0.83, sight: 12000, escape: 15, rate: 0.025, cap: 5, react: 0.9, miss: 0.32, pitTell: 0.8, pitCool: 3.4, backup: 18, ahead: false, roadblock: 0, heli: false, bonus: 2500},
  {level: 2, name: 'Interceptors', blurb: 'Two units that call for backup. Close to your pace.', cops: 2, max: 2, speed: 0.92, sight: 16000, escape: 15, rate: 0.035, cap: 8, react: 1.1, miss: 0.24, pitTell: 0.7, pitCool: 2.8, backup: 14, ahead: false, roadblock: 0, heli: false, bonus: 6000},
  {level: 3, name: 'Task force', blurb: 'As fast as you. Units cut in from ahead to box you in.', cops: 2, max: 3, speed: 0.99, sight: 21000, escape: 17, rate: 0.045, cap: 12, react: 1.25, miss: 0.17, pitTell: 0.6, pitCool: 2.3, backup: 12, ahead: true, roadblock: 0, heli: false, bonus: 12000},
  {level: 4, name: 'Rapid response', blurb: 'Faster than you. Rolling roadblocks across the lanes.', cops: 3, max: 4, speed: 1.02, sight: 24000, escape: 19, rate: 0.06, cap: 16, react: 1.4, miss: 0.12, pitTell: 0.52, pitCool: 1.9, backup: 10, ahead: true, roadblock: 24, heli: false, bonus: 22000},
  {level: 5, name: 'Most wanted', blurb: 'Everything they have, plus a helicopter. Hide in tunnels.', cops: 3, max: 5, speed: 1.05, sight: 27000, escape: 22, rate: 0.08, cap: 25, react: 1.55, miss: 0.08, pitTell: 0.45, pitCool: 1.6, backup: 8, ahead: true, roadblock: 18, heli: true, bonus: 40000},
];

export const heatOf = (n: number) => HEATS[Math.max(1, Math.min(5, n)) - 1];
