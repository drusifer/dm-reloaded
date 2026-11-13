/** Actual-browser Sprint 7 check: import the real DM2 Dungeon.dat; it must be an unrecognized, separate campaign. */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { delimiter, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const modulePath = process.env.PLAYWRIGHT_MODULE ?? (process.env.PATH ?? '').split(delimiter)
  .map(bin => resolve(bin, '../playwright/index.mjs')).find(path => existsSync(path));
if (!modulePath) throw new Error('Run through bobp make sprint7-visual-review.');
const { chromium } = await import(pathToFileURL(modulePath).href);
const output = resolve('build/sprint7-visual-review');
await mkdir(output, { recursive: true });
const dm2Dungeon = resolve('public/assets/extracted/dm2/DUNGEON.DAT');
if (!existsSync(dm2Dungeon)) {
  console.log('Sprint 7 browser check skipped: run bobp make extract-dm2 first.');
  process.exit(0);
}
const port = 5202;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let browser;
try {
  for (let attempt = 0; ; attempt += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) break; } catch { /* starting */ }
    if (attempt > 80) throw new Error('Sprint 7 review Vite server did not start.');
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

  const first = await state();
  const firstId = first.campaignId;
  await page.click('#save-btn');
  if (!/GAME SAVED/.test(await status())) failures.push(`baseline save failed (${await status()})`);

  await page.click('#import-files-btn');
  await page.setInputFiles('#import-dungeon-input', dm2Dungeon);
  await page.click('#import-go');
  await page.waitForFunction(() => /UNRECOGNIZED, NO PARTY/.test(document.getElementById('game-menu-status')?.textContent ?? ''));
  const imported = await state();
  if (imported.levels.length !== 44) failures.push(`expected 44 levels, got ${imported.levels.length}`);
  if (!/^amiga-dat-44maps-[0-9a-f]{8}$/.test(imported.campaignId) || imported.campaignId === firstId) failures.push(`campaign id not separate: ${imported.campaignId}`);
  if (imported.party.champions.length !== 0) failures.push('imported DM2 map container unexpectedly has a party');
  if (!imported.messages.some(m => /UNRECOGNIZED, NO PARTY/.test(m))) failures.push('unrecognized message not logged');
  checks.push('dm2-import-unrecognized');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${output}/dm2-imported.png` });

  // A save from the DM1 campaign must be refused here, and the game must keep running.
  await page.click('#load-btn');
  if (!/DIFFERENT CAMPAIGN/.test(await status())) failures.push(`DM1 save not refused on DM2 campaign (${await status()})`);
  if ((await state()).campaignId !== imported.campaignId) failures.push('refused load changed the campaign');
  checks.push('cross-campaign-save-refused');

  // The imported world still ticks without errors.
  await page.waitForTimeout(800);
  if ((await state()).tick <= imported.tick) failures.push('imported campaign did not advance its clock');
  checks.push('imported-campaign-runs');

  if (errors.length) failures.push(`uncaught errors: ${errors.join(' | ')}`);
  await writeFile(`${output}/report.json`, JSON.stringify({ checks, failures, errors }, null, 2));
  console.log(`Sprint 7 browser check ${failures.length ? 'FAILED' : 'passed'}: ${checks.length} checks.`);
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
} finally {
  await browser?.close();
  server.kill();
}
