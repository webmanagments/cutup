// Dev-only: freeze the game at the instant of each crash and screenshot it, to confirm real contact.
import {chromium} from 'playwright';
const [base = 'http://127.0.0.1:4174/', out = '.', n = '6'] = process.argv.slice(2);
const browser = await chromium.launch({headless: true, executablePath: '/opt/google/chrome/chrome'});
for (let k = 0; k < Number(n); k++) {
  const page = await browser.newPage({viewport: {width: 600, height: 600}});
  await page.goto(`${base}?drive&car=${['pocket', 'kaiju', 'zero'][k % 3]}`, {waitUntil: 'load'});
  await page.waitForFunction(() => window.game);
  await page.evaluate(() => {
    const g = window.game;
    const orig = g.crash.bind(g);
    g.crash = c => {
      window.__hit = {kind: c.spr.kind, carX: +c.x.toFixed(2), px: +g.x.toFixed(2), dz: Math.round(c.z - c.spr.length / 2 - (g.pos + 1180)), changing: g.laneT < 1};
      g.setPaused(true); // freeze the frame of contact
      setTimeout(() => window.__shot = true, 60);
    };
  });
  await page.waitForTimeout(3600);
  for (let i = 0; i < 400 && !(await page.evaluate(() => window.__shot)); i++) {
    // swerve a lot, including right after passing cars
    if (i % 3 === 0) await page.keyboard.press(Math.random() < 0.5 ? 'ArrowLeft' : 'ArrowRight');
    await page.waitForTimeout(90);
  }
  const hit = await page.evaluate(() => window.__hit);
  await page.screenshot({path: `${out}/hit${k}.png`});
  console.log(k, JSON.stringify(hit));
  await page.close();
}
await browser.close();
