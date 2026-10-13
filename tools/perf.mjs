// Dev-only: frame rate of the driving screen under CPU throttling (glasses are much slower than a laptop).
import {chromium} from 'playwright';
const [url = 'http://127.0.0.1:4174/?drive&car=nova', rate = '4'] = process.argv.slice(2);
const browser = await chromium.launch({headless: true, executablePath: '/opt/google/chrome/chrome'});
const page = await browser.newPage({viewport: {width: 600, height: 600}});
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', {rate: Number(rate)});
await page.goto(url, {waitUntil: 'load'});
await page.waitForTimeout(4500);
const r = await page.evaluate(
  () =>
    new Promise(res => {
      const times = [];
      let last = performance.now();
      const end = last + 5000;
      const tick = now => {
        times.push(now - last);
        last = now;
        // keep steering so traffic and lane changes are exercised
        if (Math.random() < 0.02) window.game?.steer(Math.random() < 0.5 ? -1 : 1);
        if (now < end) requestAnimationFrame(tick);
        else {
          times.sort((a, b) => a - b);
          res({fps: Math.round(1000 / (times.reduce((a, b) => a + b, 0) / times.length)), p95: Math.round(times[Math.floor(times.length * 0.95)])});
        }
      };
      requestAnimationFrame(tick);
    }),
);
console.log(`CPU ×${rate}:`, JSON.stringify(r));
await browser.close();
