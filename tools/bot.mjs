// Dev-only: a bot plays CUT UP in fast-forward (no rendering) to measure difficulty and earnings.
import {chromium} from 'playwright';
const [base = 'http://127.0.0.1:4174/', runs = '6', skill = '0.8'] = process.argv.slice(2);
const browser = await chromium.launch({headless: true, executablePath: '/opt/google/chrome/chrome'});
for (const car of (process.env.CARS ?? 'pocket,kaiju,zero').split(',')) {
  const page = await browser.newPage({viewport: {width: 600, height: 600}});
  await page.goto(`${base}?drive&car=${car}`, {waitUntil: 'load'});
  await page.waitForTimeout(500);
  const out = await page.evaluate(
    async ({runs, skill}) => {
      const LANES = [-0.75, -0.25, 0.25, 0.75];
      const results = [];
      const G = window.game.constructor;
      window.game.stop();
      for (let r = 0; r < runs; r++) {
        let res = null;
        const c = document.createElement('canvas');
        const g = new G(c, {car: window.game.opts.car, paint: window.game.opts.paint, mode: 'play', units: 'mph', onEnd: x => (res = x)});
        g.setPaused(false);
        const why = [];
        const origCrash = g.crash.bind(g);
        g.crash = c => {
          why.push({kind: c.spr.kind, dz: Math.round(c.z - (g.pos + 1180)), carX: +c.x.toFixed(2), carChanging: c.changeT >= 0, signal: c.signal, px: +g.x.toFixed(2), playerChanging: g.laneT < 1, speed: Math.round(g.speed), carSpeed: Math.round(c.speed)});
          origCrash(c);
        };
        let t = 0;
        let think = 0;
        while (!res && t < 900) {
          g.update(1 / 60);
          t += 1 / 60;
          think -= 1 / 60;
          if (think > 0 || g.state !== 'run') continue;
          think = 0.08 + (1 - skill) * 0.25; // reaction time
          const pz = g.pos + 1180;
          const look = 3000 + g.speed * 30;
          const clear = l => {
            let d = Infinity;
            for (const c of g.cars) {
              const inLane = Math.abs(c.x - LANES[l]) < 0.32 || (c.signal && c.lane + c.signal === l);
              if (!inLane) continue;
              const dz = c.z - pz;
              if (dz > -1500 && dz < d) d = dz;
            }
            return d;
          };
          const here = clear(g.lane);
          if (here < look) {
            // Pick the clearest lane reachable through an open neighbour (up to two lanes over).
            let best = g.lane;
            let bestD = here;
            for (const d of [-1, 1, -2, 2]) {
              const l = g.lane + d;
              if (l < 0 || l > 3) continue;
              if (Math.abs(d) === 2 && clear(g.lane + Math.sign(d)) < 1400) continue;
              const cd = clear(l);
              if (cd > bestD + 600 && cd > 1300) {
                best = l;
                bestD = cd;
              }
            }
            if (best !== g.lane) g.steer(best > g.lane ? 1 : -1);
            else if (here < look * 0.7 && g.brakeT <= 0 && Math.random() < skill) g.brake();
          }
          if (g.nitroTank >= g.t.nitroSecs * 0.95 && here > look * 1.5) g.nitro();
        }
        if (why.length) window.__why = [...(window.__why ?? []), why[0]];
        results.push(res ?? {score: g.score, distance: g.res.distance, nearMisses: g.res.nearMisses, time: t, timeout: true});
      }
      const avg = k => Math.round(results.reduce((s, x) => s + x[k], 0) / results.length * 100) / 100;
      return {why: window.__why, score: avg('score'), time: avg('time'), distance: avg('distance'), nearMisses: avg('nearMisses'), bestCombo: avg('bestCombo'), cash: Math.round(avg('score') / 10), timeouts: results.filter(x => x.timeout).length};
    },
    {runs: Number(runs), skill: Number(skill)},
  );
  console.log(car.padEnd(8), JSON.stringify(out));
  await page.close();
}
await browser.close();
