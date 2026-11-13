/** Actual-browser Sprint 6 gate: export a veteran party, import it in a fresh game, recruit it at the mirror. */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { delimiter, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const modulePath = process.env.PLAYWRIGHT_MODULE ?? (process.env.PATH ?? '').split(delimiter)
  .map(bin => resolve(bin, '../playwright/index.mjs')).find(path => existsSync(path));
if (!modulePath) throw new Error('Run through bobp make sprint6-visual-review.');
const { chromium } = await import(pathToFileURL(modulePath).href);
const output = resolve('build/sprint6-visual-review');
await mkdir(output, { recursive: true });
const port = 5201;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let browser;
try {
  for (let attempt = 0; ; attempt += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) break; } catch { /* starting */ }
    if (attempt > 80) throw new Error('Sprint 6 review Vite server did not start.');
    await new Promise(r => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const errors = [];
  const failures = [];
  const checks = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForSelector('#export-roster-btn');
  const hasAmiga = existsSync(resolve('public/assets/extracted/dm1/graphics.dat'));
  const sources = hasAmiga ? ['CLEAN_ROOM', 'AMIGA_GRAPHICS_DAT'] : ['CLEAN_ROOM'];
  const state = () => page.evaluate(() => window.__DM_APP__.getState());
  const status = () => page.locator('#game-menu-status').innerText();

  const boot = (selectedSource, veteran) => page.evaluate(async ([src, vet]) => {
    const data = await import('/src/data/index.ts');
    const fixture = await import('/tests/engine/testkit.ts');
    const main = await import('/src/main.ts');
    let graphics = data.createCleanRoomGraphicsBundle();
    if (src === 'AMIGA_GRAPHICS_DAT') {
      const response = await fetch('/assets/extracted/dm1/graphics.dat');
      graphics = data.parseGraphicsDat(new Uint8Array(await response.arrayBuffer()));
    }
    window.__DM_APP__?.destroy();
    window.__DM_APP__ = main.startDungeonMasterApp(document.getElementById('amiga-screen'), {
      campaign: data.createCleanRoomBundle(), graphics
    });
    if (vet) {
      let s = fixture.withItem(fixture.partyOf('iaido', 'zed'), 'vet-sword', 'SWORD');
      const c = s.party.champions[0];
      s = fixture.patchChampion(s, 0, {
        attributes: { ...c.attributes, strength: 77 },
        progression: { experience: c.progression.experience.map((_, i) => (i === 2 ? 5000 : 0)) },
        inventory: { ...c.inventory, slots: { ...c.inventory.slots, rightHand: 'vet-sword' } }
      });
      s = fixture.patchChampion(s, 1, { alive: false, health: 0 });
      Object.assign(window.__DM_APP__.getState(), s);
    }
  }, [selectedSource, veteran]);

  for (const source of sources) {
    // --- Export a veteran party through the real button ---
    await boot(source, true);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-roster-btn')]);
    const rosterPath = `${output}/${source.toLowerCase()}.roster.json`;
    await download.saveAs(rosterPath);
    if (!/ROSTER EXPORTED: 1 CHAMPIONS.*LEFT BEHIND: 1 DEAD/.test(await status())) failures.push(`${source}: export status wrong (${await status()})`);
    if (!(await state()).messages.some(m => /ROSTER EXPORTED/.test(m))) failures.push(`${source}: export not logged`);
    checks.push(`${source}:export`);

    // --- Fresh game: import the roster through the real file input ---
    await boot(source, false);
    const before = await page.evaluate(() => {
      const s = window.__DM_APP__.getState();
      return s.levels.find(l => l.id === s.party.level).tiles.flat().flatMap(t => t.wallFeatures).filter(f => f.kind === 'CHAMPION_MIRROR').map(f => f.championId);
    });
    await page.setInputFiles('#import-roster-input', rosterPath);
    await page.waitForFunction(() => /NOW WAIT AT THE MIRRORS/.test(document.getElementById('game-menu-status')?.textContent ?? ''));
    const after = await page.evaluate(() => {
      const s = window.__DM_APP__.getState();
      return s.levels.find(l => l.id === s.party.level).tiles.flat().flatMap(t => t.wallFeatures).filter(f => f.kind === 'CHAMPION_MIRROR').map(f => f.championId);
    });
    if (after.filter(id => id.startsWith('roster_')).length !== 1) failures.push(`${source}: mirror not re-pointed`);
    if (after.length !== before.length) failures.push(`${source}: mirror count changed`);
    if (!/REPLACING/.test(await status())) failures.push(`${source}: replaced champion not named`);
    const gearLine = await page.evaluate(() => (window.__DM_APP__.getState().championsCatalog[Object.keys(window.__DM_APP__.getState().championsCatalog).find(k => k.startsWith('roster_'))].startingItems || []).join(','));
    if (!/SWORD/.test(gearLine)) failures.push(`${source}: imported champion gear not shown to the mirror (${gearLine})`);
    await page.setInputFiles('#import-roster-input', rosterPath);
    await page.waitForFunction(() => /ALREADY IMPORTED/.test(document.getElementById('game-menu-status')?.textContent ?? ''));
    checks.push(`${source}:import-idempotent`);

    // --- Walk to the re-pointed mirror, look at it, recruit with Resurrect ---
    await page.evaluate(async () => {
      const engine = await import('/src/engine/index.ts');
      const app = window.__DM_APP__;
      const s = app.getState();
      const level = s.levels.find(l => l.id === s.party.level);
      let spot = null;
      level.tiles.forEach((row, y) => row.forEach((t, x) => t.wallFeatures.forEach(f => {
        if (f.kind === 'CHAMPION_MIRROR' && f.championId?.startsWith('roster_') && !spot) spot = { x, y, face: f.face };
      })));
      const d = engine.DIRECTION_DELTAS[spot.face];
      Object.assign(s.party, { x: spot.x + d.dx, y: spot.y + d.dy, facing: (spot.face + 2) & 3, moveCooldownTicks: 0 });
      app.dispatch({ type: 'INTERACT_AHEAD' });
    });
    const mirror = await state();
    if (!mirror.activeMirror || !mirror.activeMirror.champion.id.startsWith('roster_')) failures.push(`${source}: mirror did not open on the imported champion`);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${output}/${source.toLowerCase()}-mirror.png` });
    await page.evaluate(() => window.__DM_APP__.dispatch({ type: 'RECRUIT_CHAMPION', mode: 'RESURRECT' }));
    const recruited = (await state()).party.champions[0];
    if (!recruited || recruited.attributes.strength !== 77 || recruited.progression.experience[2] < 1) failures.push(`${source}: recruited veteran lost stats/skills`);
    const hasSword = await page.evaluate(() => {
      const st = window.__DM_APP__.getState();
      return Object.values(st.party.champions[0].inventory.slots).some(id => id && st.items[id]?.name === 'SWORD');
    });
    if (!hasSword) failures.push(`${source}: recruited veteran has no gear`);
    await page.screenshot({ path: `${output}/${source.toLowerCase()}-recruited.png` });
    checks.push(`${source}:recruit-veteran`);

    // --- Bad files are refused and change nothing ---
    const bad = `${output}/bad.roster.json`;
    await writeFile(bad, '{"format":"dm-reloaded-roster","version":1,"checksum":"00000000","champions":[{}]}');
    const levelsBefore = JSON.stringify((await state()).levels);
    await page.setInputFiles('#import-roster-input', bad);
    await page.waitForFunction(() => /CORRUPT/.test(document.getElementById('game-menu-status')?.textContent ?? ''));
    await writeFile(bad, '{"hello":1}');
    await page.setInputFiles('#import-roster-input', bad);
    await page.waitForFunction(() => /NOT A DM RELOADED ROSTER/.test(document.getElementById('game-menu-status')?.textContent ?? ''));
    if (JSON.stringify((await state()).levels) !== levelsBefore) failures.push(`${source}: bad roster changed the dungeon`);
    // Nobody alive: export refused visibly.
    await boot(source, false);
    await page.click('#export-roster-btn');
    if (!/NO LIVING CHAMPIONS/.test(await status())) failures.push(`${source}: empty export not refused visibly`);
    checks.push(`${source}:refusals`);
  }
  if (errors.length) failures.push(`uncaught errors: ${errors.join(' | ')}`);
  await writeFile(`${output}/report.json`, JSON.stringify({ checks, failures, errors }, null, 2));
  console.log(`Sprint 6 browser smoke ${failures.length ? 'FAILED' : 'passed'}: ${checks.length} checks across ${sources.join(', ')}.`);
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
} finally {
  await browser?.close();
  server.kill();
}
