// Dev-only: a bot runs police pursuits in fast-forward to balance the heat levels.
// Usage: node tools/chase-bot.mjs [base] [runs] [skill] [heats] [cars]
import {chromium} from 'playwright';
const [base = 'http://127.0.0.1:4174/', runs = '8', skill = '0.85', heats = '1,2,3,4,5', cars = 'pocket,kaiju,zero'] = process.argv.slice(2);
const browser = await chromium.launch({headless: true, executablePath: '/opt/google/chrome/chrome'});
for (const car of cars.split(',')) {
  const page = await browser.newPage({viewport: {width: 600, height: 600}});
  await page.goto(`${base}?drive&car=${car}`, {waitUntil: 'load'});
  await page.waitForFunction(() => window.game);
  for (const heat of heats.split(',').map(Number)) {
    const out = await page.evaluate(
      async ({runs, skill, heat}) => {
        const LANES = [-0.75, -0.25, 0.25, 0.75];
        const G = window.game.constructor;
        window.game.stop();
        const rs = [];
        for (let r = 0; r < runs; r++) {
          let res = null;
          const c = document.createElement('canvas');
          const g = new G(c, {car: window.game.opts.car, paint: window.game.opts.paint, mode: 'play', units: 'mph', heat, onEnd: x => (res = x)});
          g.setPaused(false);
          let how = '';
          const oc = g.crash.bind(g);
          g.crash = c => {
            how = c.cop ? c.cop.mode + (c.cop.swerved ? '-swerve' : '') + (Math.abs(c.x - g.x) < 0.3 ? '-inlane' : '') : (g.laneT < 1 ? 'traffic-turnin' : 'traffic');
            oc(c);
          };
          let t = 0;
          let think = 0;
          while (!res && t < 600) {
            g.update(1 / 60);
            t += 1 / 60;
            think -= 1 / 60;
            if (think > 0 || g.state !== 'run') continue;
            think = 0.08 + (1 - skill) * 0.25;
            const pz = g.pos + 1180;
            const look = 3000 + g.speed * 30;
            const clear = l => {
              let d = Infinity;
              for (const c of g.cars) {
                const inLane = Math.abs(c.x - LANES[l]) < 0.32 || (c.signal && c.lane + c.signal === l) || (c.changeT >= 0 && Math.abs(c.toX - LANES[l]) < 0.32);
                if (!inLane) continue;
                const dz = c.z - pz;
                if (dz > -1500 && dz < d) d = dz;
              }
              return d;
            };
            // A cop lining up a PIT: move away from it if that lane is clear enough.
            const pit = g.cars.find(c => c.cop && c.cop.mode === 'pit' && !c.cop.swerved);
            if (pit && Math.random() < skill) {
              const away = g.lane + (pit.x < g.x ? 1 : -1);
              if (away >= 0 && away <= 3 && clear(away) > 900) {
                g.steer(away > g.lane ? 1 : -1);
                continue;
              }
              if (g.brakeT <= 0) g.brake(); // let it swerve into empty road ahead
              continue;
            }
            // A unit on the bumper: slide over a lane.
            const pc = pz + 210;
            const bump = g.cars.find(c => c.cop && c.cop.mode !== 'wreck' && Math.abs(c.x - g.x) < 0.3 && c.z < pc && c.z > pc - 2600);
            if (bump && g.laneT >= 1 && Math.random() < skill) {
              for (const d of [-1, 1]) {
                const l = g.lane + d;
                if (l >= 0 && l <= 3 && clear(l) > 1500 && !g.cars.some(c => c.cop && Math.abs(c.x - LANES[l]) < 0.3 && Math.abs(c.z - pc) < 1500)) {
                  g.steer(d);
                  break;
                }
              }
            }
            const here = clear(g.lane);
            if (here < look) {
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
            // In a chase, burn nitro whenever a unit can see you.
            if (g.nitroTank >= 0.8 && here > look && g.seen) g.nitro();
          }
          const x = res ?? {...g.res, score: g.score, timeout: true};
          rs.push({how, esc: x.escaped ? 1 : 0, by: x.bustedBy, t: Math.round(x.chaseTime ?? g.chaseT), mult: x.peakMult, cops: x.copsWrecked, pits: x.pitsDodged, score: Math.round(x.score)});
        }
        const avg = k => Math.round((rs.reduce((s, x) => s + x[k], 0) / rs.length) * 10) / 10;
        return {escRate: avg('esc'), t: avg('t'), mult: avg('mult'), copsDown: avg('cops'), pits: avg('pits'), score: avg('score'), byCop: rs.filter(x => x.by === 'cop').length, byTraffic: rs.filter(x => x.by === 'traffic').length, escT: rs.filter(x => x.esc).map(x => x.t), how: rs.map(x => x.how).filter(Boolean).join(' ')};
      },
      {runs: Number(runs), skill: Number(skill), heat},
    );
    console.log(car.padEnd(7), 'heat', heat, JSON.stringify(out));
  }
  await page.close();
}
await browser.close();
