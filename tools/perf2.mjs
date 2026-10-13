import {chromium} from 'playwright';
const variants = [[], ['drawLamps'], ['drawCar'], ['drawHud'], ['drawPlayer'], ['drawLamps', 'drawCar', 'drawHud', 'drawPlayer', 'drawSpeedLines', 'drawBridge', 'drawGantry']];
const browser = await chromium.launch({headless: true, executablePath: '/opt/google/chrome/chrome'});
for (const off of variants) {
  const page = await browser.newPage({viewport: {width: 600, height: 600}});
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
  await page.goto('http://127.0.0.1:4174/?drive&car=nova', {waitUntil: 'load'});
  await page.waitForTimeout(4000);
  const fps = await page.evaluate(async off => {
    for (const n of off) window.game[n] = () => {};
    let frames = 0;
    const t0 = performance.now();
    await new Promise(r => {
      const f = () => (++frames, performance.now() - t0 < 3000 ? requestAnimationFrame(f) : r());
      requestAnimationFrame(f);
    });
    return Math.round(frames / 3);
  }, off);
  console.log(off.join('+') || 'all on', fps);
  await page.close();
}
await browser.close();
