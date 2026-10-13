import {chromium} from 'playwright';
const browser = await chromium.launch({headless: true, executablePath: '/opt/google/chrome/chrome'});
const page = await browser.newPage({viewport: {width: 600, height: 600}});
await page.goto('http://127.0.0.1:4174/?drive&car=nova', {waitUntil: 'load'});
await page.waitForTimeout(4500);
const r = await page.evaluate(async () => {
  const g = window.game;
  const proto = Object.getPrototypeOf(g);
  const names = ['render', 'drawLamps', 'drawCar', 'drawTunnel', 'drawHud', 'drawPlayer', 'drawSpeedLines', 'drawGantry', 'drawBridge', 'update'];
  const t = {};
  for (const n of names) {
    const orig = proto[n];
    t[n] = 0;
    g[n] = function (...a) {
      const s = performance.now();
      const out = orig.apply(this, a);
      t[n] += performance.now() - s;
      return out;
    };
  }
  await new Promise(r => setTimeout(r, 4000));
  const frames = 4000 / 16.7;
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, +(v / frames).toFixed(2)]));
});
console.log(JSON.stringify(r));
await browser.close();
