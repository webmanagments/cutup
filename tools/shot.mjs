// Dev-only: screenshot a URL at 600×600. Usage: node tools/shot.mjs <url> <out.png> [waitMs]
import {chromium} from 'playwright';
const [url, out, wait = '800'] = process.argv.slice(2);
const browser = await chromium.launch({headless: true, executablePath: '/opt/google/chrome/chrome'});
const page = await browser.newPage({viewport: {width: 600, height: 600}});
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => m.type() === 'error' && errors.push(m.text()));
await page.goto(url, {waitUntil: 'load'});
await page.waitForTimeout(Number(wait));
await page.screenshot({path: out});
if (errors.length) console.log('ERRORS', errors.join(' | '));
await browser.close();
