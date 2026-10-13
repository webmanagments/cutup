// Dev-only: drive the engine test page and grab frames. Usage: node tools/drive-shots.mjs <url> <outDir> step...
// Steps: wait:<ms> key:<Key> shot:<name> eval:<js>
import {chromium} from 'playwright';
const [url, out, ...steps] = process.argv.slice(2);
const browser = await chromium.launch({headless: true, executablePath: '/opt/google/chrome/chrome', args: ['--autoplay-policy=no-user-gesture-required']});
const page = await browser.newPage({viewport: {width: 600, height: 600}});
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => m.type() === 'error' && errors.push(m.text()));
await page.goto(url, {waitUntil: 'load'});
for (const s of steps) {
  const [k, ...rest] = s.split(':');
  const v = rest.join(':');
  if (k === 'wait') await page.waitForTimeout(Number(v));
  else if (k === 'key') await page.keyboard.press(v);
  else if (k === 'shot') await page.screenshot({path: `${out}/${v}.png`});
  else if (k === 'eval') console.log(JSON.stringify(await page.evaluate(v)));
}
console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no errors');
await browser.close();
