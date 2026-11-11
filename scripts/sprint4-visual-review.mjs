/** Actual-browser Sprint 4 gate: monsters seen, approaching, injuring the party, and dying. */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { delimiter, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const modulePath = process.env.PLAYWRIGHT_MODULE ?? (process.env.PATH ?? '').split(delimiter)
  .map(bin => resolve(bin, '../playwright/index.mjs')).find(path => existsSync(path));
if (!modulePath) throw new Error('Run through bobp make sprint4-visual-review.');
const { chromium } = await import(pathToFileURL(modulePath).href);
const output = resolve('build/sprint4-visual-review');
await mkdir(output, { recursive: true });
const port = 5199;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let browser;
try {
  for (let attempt = 0; ; attempt += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) break; } catch { /* starting */ }
    if (attempt > 80) throw new Error('Sprint 4 review Vite server did not start.');
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
  const sources = await page.evaluate(async () => {
    const response = await fetch('/assets/extracted/dm1/graphics.dat');
    return response.ok && !(response.headers.get('content-type') ?? '').includes('text/html')
      ? ['CLEAN_ROOM', 'AMIGA_GRAPHICS_DAT'] : ['CLEAN_ROOM'];
  });
  for (const source of sources) {
    await page.evaluate(async selectedSource => {
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
      let sample = engine.createSprint4ReviewScenario(fixture.partyOf('iaido', 'zed', 'chani', 'elija'));
      sample = fixture.withItem(sample, 'rv-sword', 'SWORD');
      sample = fixture.patchChampion(sample, 0, {
        inventory: { ...sample.party.champions[0].inventory, slots: { ...sample.party.champions[0].inventory.slots, rightHand: 'rv-sword' } }
      });
      Object.assign(window.__DM_APP__.getState(), sample);
    }, source);
    const state = () => page.evaluate(() => window.__DM_APP__.getState());
    const canvasPixels = (rect) => page.locator('#amiga-screen').evaluate((canvas, r) => {
      const data = canvas.getContext('2d').getImageData(r.x, r.y, r.w, r.h).data;
      let colored = 0, red = 0;
      for (let i = 0; i < data.length; i += 4) { if (data[i] + data[i + 1] + data[i + 2] > 60) colored++; if (data[i] > 150 && data[i + 1] < 90 && data[i + 2] < 90) red++; }
      return { colored, red };
    }, rect);
    const viewRect = (id) => page.evaluate(async monsterId => {
      const render = await import('/src/render/index.ts');
      const s = window.__DM_APP__.getState();
      const t = s.combatTargets.find(v => v.id === monsterId);
      return t ? render.monsterViewRect(s, t) : null;
    }, id);

    // 1. Monster visible at depth, silhouette pixels present (state-correlated).
    await page.waitForTimeout(150);
    const first = await viewRect('rv_screamer_0');
    if (!first) failures.push(`${source}: screamer not projected into viewport`);
    else {
      const px = await canvasPixels({ x: first.x, y: first.y, w: first.w, h: first.h });
      if (px.colored < first.w * first.h * 0.4) failures.push(`${source}: no silhouette pixels where state says monster is`);
      await page.screenshot({ path: `${output}/${source.toLowerCase()}-seen.png` });
      checks.push(`${source}:monster-visible`);
    }

    // 2. Wait for the real 6 Hz loop to bring it adjacent and injure the party.
    let injured = false;
    for (let i = 0; i < 60 && !injured; i++) {
      await page.waitForTimeout(250);
      const s = await state();
      injured = s.party.champions.some(c => c.health < c.maxHealth);
    }
    if (!injured) failures.push(`${source}: monsters never injured the party`);
    else {
      const s = await state();
      if (!s.messages.some(m => /HITS/.test(m))) failures.push(`${source}: injury has no message`);
      const hurtIndex = s.party.champions.findIndex(c => (c.hurtUntilTick ?? 0) > s.tick - 1 || c.health < c.maxHealth);
      const box = await page.evaluate(async () => (await import('/src/render/index.ts')).championSlotRect(0));
      const hudPx = await canvasPixels({ x: box.x, y: box.y, w: box.w, h: box.h });
      if (hurtIndex < 0 || hudPx.red === 0) failures.push(`${source}: no red HUD cue for injured champion`);
      await page.screenshot({ path: `${output}/${source.toLowerCase()}-injured.png` });
      checks.push(`${source}:party-injured`);
    }

    // 3. Fight back with the real combat command until the adjacent monster dies.
    let killed = false;
    for (let i = 0; i < 120 && !killed; i++) {
      await page.evaluate(() => window.__DM_APP__.dispatch({ type: 'EXECUTE_COMBAT_ACTION', championIndex: 0, hand: 'rightHand', actionId: 'SWING' }));
      await page.waitForTimeout(200);
      const s = await state();
      killed = s.messages.some(m => /DIES\./.test(m));
      if (s.gameOver) break;
    }
    if (!killed) failures.push(`${source}: could not kill a monster through real commands`);
    else { await page.screenshot({ path: `${output}/${source.toLowerCase()}-killed.png` }); checks.push(`${source}:monster-killed`); }
  }
  if (errors.length) failures.push(`uncaught errors: ${errors.join(' | ')}`);
  await writeFile(`${output}/report.json`, JSON.stringify({ checks, failures, errors }, null, 2));
  console.log(`Sprint 4 browser smoke ${failures.length ? 'FAILED' : 'passed'}: ${checks.length} checks across ${sources.join(', ')}.`);
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
} finally {
  await browser?.close();
  server.kill();
}
