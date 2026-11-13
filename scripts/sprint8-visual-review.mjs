/** Actual-browser Sprint 8 check: import real DM2 Dungeon.dat + GRAPHICS.DAT; honest message, generated art, no errors. */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { delimiter, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const modulePath = process.env.PLAYWRIGHT_MODULE ?? (process.env.PATH ?? '').split(delimiter)
  .map(bin => resolve(bin, '../playwright/index.mjs')).find(path => existsSync(path));
if (!modulePath) throw new Error('Run through bobp make sprint8-visual-review.');
const { chromium } = await import(pathToFileURL(modulePath).href);
const output = resolve('build/sprint8-visual-review');
await mkdir(output, { recursive: true });
const dungeon = resolve('public/assets/extracted/dm2/DUNGEON.DAT');
const graphics = resolve('public/assets/extracted/dm2/GRAPHICS.DAT');
if (!existsSync(dungeon) || !existsSync(graphics)) {
  console.log('Sprint 8 browser check skipped: run bobp make extract-dm2 first.');
  process.exit(0);
}
const port = 5203;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let browser;
try {
  for (let attempt = 0; ; attempt += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) break; } catch { /* starting */ }
    if (attempt > 80) throw new Error('Sprint 8 review Vite server did not start.');
    await new Promise(r => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  const failures = [];
  const checks = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForSelector('#import-files-btn');
  const state = () => page.evaluate(() => window.__DM_APP__.getState());
  const status = () => page.locator('#game-menu-status').innerText();

  // Graphics alone (valid DM2 GDAT) with a DM1 dungeon-less request must still require a dungeon.
  await page.click('#import-files-btn');
  await page.setInputFiles('#import-graphics-input', graphics);
  await page.click('#import-go');
  await page.waitForFunction(() => /PICK A DUNGEON\.DAT/.test(document.getElementById('import-status')?.textContent ?? ''));
  checks.push('graphics-alone-refused');

  await page.setInputFiles('#import-dungeon-input', dungeon);
  await page.click('#import-go');
  await page.waitForFunction(() => /DM2 ART NOT USED YET/.test(document.getElementById('game-menu-status')?.textContent ?? ''));
  const s = await state();
  const text = await status();
  if (s.levels.length !== 44) failures.push(`expected 44 levels, got ${s.levels.length}`);
  if (!/DM2 GRAPHICS: 3011 IMAGES, 77 CREATURES\./.test(text)) failures.push(`graphics recognition message missing (${text})`);
  if (/YOUR GRAPHICS/.test(text)) failures.push('message falsely claims the user graphics are used');
  if (!s.messages.some(m => /DM2 ART NOT USED YET/.test(m))) failures.push('honest note not logged');
  if (!/UNRECOGNIZED, NO PARTY/.test(text)) failures.push('unrecognized-campaign message missing');
  checks.push('dm2-import-honest-message');

  // The generated-art game still renders and the sprite catalog overlay opens without errors.
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${output}/dm2-graphics-imported.png` });
  await page.keyboard.press('g');
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  checks.push('catalog-overlay-opens');

  if (errors.length) failures.push(`uncaught errors: ${errors.join(' | ')}`);
  await writeFile(`${output}/report.json`, JSON.stringify({ checks, failures, errors }, null, 2));
  console.log(`Sprint 8 browser check ${failures.length ? 'FAILED' : 'passed'}: ${checks.length} checks.`);
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
} finally {
  await browser?.close();
  server.kill();
}
