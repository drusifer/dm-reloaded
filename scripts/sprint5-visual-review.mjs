/** Actual-browser Sprint 5 gate: save/load through real buttons, corrupt saves, file import, victory. */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { delimiter, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const modulePath = process.env.PLAYWRIGHT_MODULE ?? (process.env.PATH ?? '').split(delimiter)
  .map(bin => resolve(bin, '../playwright/index.mjs')).find(path => existsSync(path));
if (!modulePath) throw new Error('Run through bobp make sprint5-visual-review.');
const { chromium } = await import(pathToFileURL(modulePath).href);
const output = resolve('build/sprint5-visual-review');
await mkdir(output, { recursive: true });
const port = 5200;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let browser;
try {
  for (let attempt = 0; ; attempt += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) break; } catch { /* starting */ }
    if (attempt > 80) throw new Error('Sprint 5 review Vite server did not start.');
    await new Promise(r => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  const errors = [];
  const failures = [];
  const checks = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForSelector('#amiga-screen');
  await page.waitForSelector('#save-btn');
  const dungeonDat = resolve('public/assets/extracted/dm1/Dungeon.dat');
  const hasAmiga = existsSync(dungeonDat);
  const sources = hasAmiga ? ['CLEAN_ROOM', 'AMIGA_GRAPHICS_DAT'] : ['CLEAN_ROOM'];
  const state = () => page.evaluate(() => window.__DM_APP__.getState());
  const lastMessages = async () => (await state()).messages.slice(-3).join(' | ');
  const statusText = () => page.locator('#game-menu-status').innerText();

  for (const source of sources) {
    await page.evaluate(async selectedSource => {
      localStorage.clear();
      const data = await import('/src/data/index.ts');
      const fixture = await import('/tests/engine/testkit.ts');
      const engine = await import('/src/engine/index.ts');
      const main = await import('/src/main.ts');
      let graphics = data.createCleanRoomGraphicsBundle();
      if (selectedSource === 'AMIGA_GRAPHICS_DAT') {
        const response = await fetch('/assets/extracted/dm1/graphics.dat');
        graphics = data.parseGraphicsDat(new Uint8Array(await response.arrayBuffer()));
      }
      window.__DM_APP__?.destroy();
      window.__DM_APP__ = main.startDungeonMasterApp(document.getElementById('amiga-screen'), {
        campaign: data.createCleanRoomBundle(), graphics
      });
      let sample = engine.createVictoryReviewScenario(fixture.partyOf('iaido', 'zed', 'chani', 'elija'));
      sample = fixture.withItem(sample, 'rv-sword', 'SWORD');
      sample = fixture.patchChampion(sample, 0, {
        inventory: { ...sample.party.champions[0].inventory, slots: { ...sample.party.champions[0].inventory.slots, rightHand: 'rv-sword' } }
      });
      Object.assign(window.__DM_APP__.getState(), sample);
    }, source);

    // --- The menu must not cover the game screen ---
    const canvasBox = await page.locator('#amiga-screen').boundingBox();
    const menuBox = await page.locator('#game-menu').boundingBox();
    if (menuBox.y < canvasBox.y + canvasBox.height - 1) failures.push(`${source}: game menu overlaps the game screen`);

    // --- Save / Load through the real buttons ---
    const savedTick = (await state()).tick;
    await page.click('#save-btn');
    if (!/GAME SAVED/.test(await statusText())) failures.push(`${source}: SAVE gave no visible status (${await statusText()})`);
    if (!(await page.evaluate(() => localStorage.getItem('dm_reloaded_save_slot_v1')))) failures.push(`${source}: nothing stored`);
    await page.evaluate(() => window.__DM_APP__.dispatch({ type: 'TURN', direction: 'LEFT' }));
    const turned = (await state()).party.facing;
    await page.click('#load-btn');
    const loaded = await state();
    if (loaded.party.facing === turned || !/GAME LOADED/.test(await statusText()) || loaded.tick < savedTick) {
      failures.push(`${source}: LOAD did not restore facing/status (${await statusText()})`);
    }
    if (!/GAME LOADED/.test(await lastMessages())) failures.push(`${source}: load not logged in message log`);
    await page.screenshot({ path: `${output}/${source.toLowerCase()}-saved-loaded.png` });
    checks.push(`${source}:save-load`);

    // --- Corrupt and foreign saves are refused without changing the game ---
    await page.evaluate(() => localStorage.setItem('dm_reloaded_save_slot_v1', '{"format":"dm-reloaded-save","version":1,"checksum":"00000000","state":{}}'));
    // Live vitals (mana, food, torch) tick in real time, so compare only what a wrongly accepted load would change.
    const placement = async () => { const { party } = await state(); return JSON.stringify([party.level, party.x, party.y, party.facing, party.champions.map((c) => c.id)]); };
    const before = await placement();
    await page.click('#load-btn');
    if (!/CORRUPT/.test(await statusText()) || (await placement()) !== before) {
      failures.push(`${source}: corrupt save not refused cleanly (${await statusText()})`);
    }
    await page.evaluate(() => localStorage.removeItem('dm_reloaded_save_slot_v1'));
    await page.click('#load-btn');
    if (!/NO SAVE/.test(await statusText())) failures.push(`${source}: empty slot message missing`);
    await page.evaluate(() => { window.__origSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('quota'); }; });
    await page.click('#save-btn');
    if (!/FULL OR BLOCKED/.test(await statusText())) failures.push(`${source}: storage failure not reported`);
    checks.push(`${source}:corrupt-and-failure`);

    // --- Open a save file through the real file input ---
    await page.evaluate(() => { Storage.prototype.setItem = window.__origSetItem; });
    const text = await page.evaluate(async () => (await import('/src/engine/index.ts')).serializeSave(window.__DM_APP__.getState()));
    const savePath = `${output}/${source.toLowerCase()}.save.json`;
    await writeFile(savePath, text);
    await page.setInputFiles('#import-save-input', savePath);
    await page.waitForFunction(() => /GAME LOADED/.test(document.getElementById('game-menu-status')?.textContent ?? ''));
    const junk = `${output}/junk.json`;
    await writeFile(junk, '{"hello":1}');
    await page.setInputFiles('#import-save-input', junk);
    await page.waitForFunction(() => /NOT A DM RELOADED SAVE/.test(document.getElementById('game-menu-status')?.textContent ?? ''));
    checks.push(`${source}:open-save-file`);

    // --- Victory: kill Lord Chaos with real combat commands ---
    let won = false;
    for (let i = 0; i < 80 && !won; i++) {
      await page.evaluate(() => window.__DM_APP__.dispatch({ type: 'EXECUTE_COMBAT_ACTION', championIndex: 0, hand: 'rightHand', actionId: 'SWING' }));
      await page.waitForTimeout(150);
      won = (await state()).victory;
      if ((await state()).gameOver) break;
    }
    if (!won) failures.push(`${source}: victory not reached`);
    else {
      await page.waitForTimeout(120);
      await page.screenshot({ path: `${output}/${source.toLowerCase()}-victory.png` });
      const gold = await page.locator('#amiga-screen').evaluate(canvas => {
        const d = canvas.getContext('2d').getImageData(0, 33, 224, 136).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] === 255 && d[i + 1] === 215 && d[i + 2] === 64) n++;
        return n;
      });
      if (gold < 100) failures.push(`${source}: victory screen pixels missing`);
      const box = await page.locator('#amiga-screen').boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      if ((await state()).victory) failures.push(`${source}: click did not restart after victory`);
      checks.push(`${source}:victory`);
    }
  }

  // --- Bring your own files, on the app the page bootstrapped itself ---
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForSelector('#import-files-btn');
  await page.click('#import-files-btn');
  if (!/read in this browser only/i.test(await page.locator('#import-panel').innerText())) failures.push('import panel lacks the local-only statement');
  const levelsBefore = (await state()).levels.length;
  const html = `${output}/not-a-dungeon.dat`;
  await writeFile(html, '<html>'.repeat(200));
  await page.setInputFiles('#import-dungeon-input', html);
  await page.click('#import-go');
  await page.waitForFunction(() => /IMPORT FAILED/.test(document.getElementById('import-status')?.textContent ?? ''));
  if ((await state()).levels.length !== levelsBefore) failures.push('bad import replaced the working campaign');
  await page.click('#import-go');
  checks.push('import:bad-file-refused');
  if (hasAmiga) {
    await page.setInputFiles('#import-dungeon-input', dungeonDat);
    await page.setInputFiles('#import-graphics-input', resolve('public/assets/extracted/dm1/graphics.dat'));
    await page.click('#import-go');
    await page.waitForFunction(() => /IMPORTED 14 LEVELS WITH YOUR GRAPHICS/.test(document.getElementById('game-menu-status')?.textContent ?? ''));
    const imported = await state();
    if (imported.levels.length !== 14 || !imported.messages.some(m => /IMPORTED 14 LEVELS/.test(m))) failures.push('import did not restart on the 14-level campaign');
    await page.screenshot({ path: `${output}/imported.png` });
    checks.push('import:real-files');
  }

  if (errors.length) failures.push(`uncaught errors: ${errors.join(' | ')}`);
  await writeFile(`${output}/report.json`, JSON.stringify({ checks, failures, errors }, null, 2));
  console.log(`Sprint 5 browser smoke ${failures.length ? 'FAILED' : 'passed'}: ${checks.length} checks across ${sources.join(', ')}.`);
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
} finally {
  await browser?.close();
  server.kill();
}
