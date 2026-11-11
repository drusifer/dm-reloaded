/** Bounded browser smoke scaffolding for the independent Sprint 3 Trin/Smith gate. */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { delimiter, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const modulePath = process.env.PLAYWRIGHT_MODULE ?? (process.env.PATH ?? '').split(delimiter)
  .map(bin => resolve(bin, '../playwright/index.mjs')).find(path => existsSync(path));
if (!modulePath) throw new Error('Run through bobp make sprint3-visual-review.');
const { chromium } = await import(pathToFileURL(modulePath).href);
const output = resolve('build/sprint3-visual-review');
await mkdir(output, { recursive: true });
const port = 5198;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let browser;
try {
  for (let attempt = 0; ; attempt += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) break; } catch { /* starting */ }
    if (attempt > 80) throw new Error('Sprint 3 review Vite server did not start.');
    await new Promise(resolveDelay => setTimeout(resolveDelay, 100));
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  const errors = [];
  const failures = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForSelector('#amiga-screen');
  const sources = await page.evaluate(async () => {
    const data = await import('/src/data/index.ts');
    const response = await fetch('/assets/extracted/dm1/graphics.dat');
    return response.ok && !(response.headers.get('content-type') ?? '').includes('text/html')
      ? ['CLEAN_ROOM', 'AMIGA_GRAPHICS_DAT'] : ['CLEAN_ROOM'];
  });
  const checks = [];
  for (const source of sources) {
    await page.evaluate(async selectedSource => {
      const data = await import('/src/data/index.ts');
      const fixture = await import('/tests/engine/testkit.ts');
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
      let sample = fixture.withItem(fixture.partyOf('iaido', 'zed'), 'review-sword', 'SWORD');
      const champion = sample.party.champions[0];
      sample = fixture.patchChampion(sample, 0, {
        mana: 99,
        progression: {
          experience: champion.progression.experience.map((xp, index) => index === 12 ? 100 : xp)
        },
        inventory: {
          ...champion.inventory, slots: { ...champion.inventory.slots, rightHand: 'review-sword' }
        }
      });
      Object.assign(window.__DM_APP__.getState(), sample);
    }, source);
    const box = await page.locator('#amiga-screen').boundingBox();
    const click = async (x, y) => page.mouse.click(box.x + (x + .5) * box.width / 320, box.y + (y + .5) * box.height / 200);
    const state = () => page.evaluate(() => window.__DM_APP__.getState());
    const previewSignature = async () => {
      await page.waitForTimeout(40);
      return page.locator('#amiga-screen').evaluate(async canvas => {
        const { RUNE_PANEL_RECTS } = await import('/src/render/layout.ts');
        const rect = RUNE_PANEL_RECTS.FORMULA;
        const data = canvas.getContext('2d').getImageData(rect.x, rect.y, rect.w, rect.h).data;
        let hash = 2166136261;
        for (const value of data) hash = Math.imul(hash ^ value, 16777619) >>> 0;
        return { hash, colored: Array.from(data).filter((value, index) => index % 4 !== 3 && value > 0).length };
      });
    };
    await click(56, 12);
    if ((await state()).interaction.kind !== 'ACTION_MENU') throw new Error(`${source}: occupied hand did not open action panel`);
    await click(270, 82);
    if ((await state()).interaction.kind !== 'RUNE_PANEL') throw new Error(`${source}: rune panel did not open by mouse`);
    const emptyPreview = await previewSignature();
    for (const [x, y] of [[227, 38], [275, 53], [275, 68]]) await click(x, y); // Lo Ful Ir
    if ((await state()).runeFormulas.iaido.join(' ') !== 'LO FUL IR') throw new Error(`${source}: rune mouse sequence leaked or reordered`);
    const fullPreview = await previewSignature();
    if (fullPreview.hash === emptyPreview.hash || fullPreview.colored <= emptyPreview.colored) {
      failures.push(`${source}: LO FUL IR state has no distinct visible formula preview`);
    }
    await click(236, 103); // DEL -> LO FUL
    const deletedPreview = await previewSignature();
    if ((await state()).runeFormulas.iaido.join(' ') !== 'LO FUL' || deletedPreview.hash === fullPreview.hash) {
      failures.push(`${source}: DEL did not update formula state and visible preview together`);
    }
    await click(275, 68); // Restore IR.
    await click(260, 103); // CLR.
    const clearedPreview = await previewSignature();
    if ((await state()).runeFormulas.iaido.length !== 0 || clearedPreview.hash !== emptyPreview.hash) {
      failures.push(`${source}: CLR did not restore the empty formula preview`);
    }
    for (const [x, y] of [[227, 38], [275, 53], [275, 68]]) await click(x, y);
    await page.keyboard.press('g');
    await page.keyboard.press('b');
    if ((await state()).runeFormulas.iaido.join(' ') !== 'LO FUL IR') {
      failures.push(`${source}: Purist B/G altered the formula`);
    }
    await page.screenshot({ path: `${output}/${source.toLowerCase()}-runes.png` });
    await page.keyboard.press('Escape');
    if ((await state()).interaction.kind !== 'NONE') {
      failures.push(`${source}: Purist B/G leaked to a global overlay before Escape focus restore`);
      await page.keyboard.press('Escape');
    }
    checks.push(`${source}:mouse-runes-focus`);

    await click(275, 4); // Enable QoL before a higher-priority interaction owner exists.
    await click(56, 12);
    await click(270, 82);
    const ownedSettings = (await state()).settings;
    for (const [x, y] of [[275, 4], [280, 13], [307, 22]]) await click(x, y);
    const capturedSettings = (await state()).settings;
    if (JSON.stringify(capturedSettings) !== JSON.stringify(ownedSettings)) {
      failures.push(`${source}: utility pointer escaped the active rune-panel owner`);
    }
    await click(260, 103); // Explicitly clear the formula preserved by the prior Escape recovery.
    await page.keyboard.press('g'); // QA rune shortcut for BRO; must not reach the catalog overlay.
    if ((await state()).runeFormulas.iaido.join(' ') !== 'BRO') {
      failures.push(`${source}: QoL rune key G leaked outside the rune-panel owner`);
    }
    await page.keyboard.press('b'); // RA; must not reach the soundboard overlay.
    if ((await state()).runeFormulas.iaido.join(' ') !== 'BRO RA') {
      failures.push(`${source}: QoL rune key B leaked outside the rune-panel owner`);
    }
    await page.keyboard.press('Escape'); // Close any leaked overlay, if present.
    if ((await state()).interaction.kind === 'RUNE_PANEL') {
      await page.keyboard.press('Escape'); // The second Escape closes the still-owned rune panel.
    }
    await click(56, 12);
    await click(270, 82);
    await click(260, 103); // Clear formula through the shared mouse rectangle.
    for (const key of ['1', 'r', 'f']) await page.keyboard.press(key); // Lo Ful Ir
    const beforeInvoke = await state();
    await click(270, 117);
    const afterInvoke = await state();
    if (afterInvoke.rngState === beforeInvoke.rngState || afterInvoke.party.champions[0].mana >= beforeInvoke.party.champions[0].mana) {
      failures.push(`${source}: committed invocation missed known RNG/mana state markers`);
    }
    if (afterInvoke.runeFormulas.iaido.length !== 0 || afterInvoke.interaction.kind !== 'NONE') {
      failures.push(`${source}: committed invocation did not clear formula and restore focus`);
    }
    await page.screenshot({ path: `${output}/${source.toLowerCase()}-invoke.png` });
    checks.push(`${source}:qol-invoke-state`);
    checks.push(`${source}:pointer-owner-priority`);

    await click(56, 12);
    await click(270, 82);
    await page.keyboard.press('1'); // Incomplete Lo formula must remain recoverable.
    const beforeRejectPreview = await previewSignature();
    const beforeReject = await state(); // Snapshot immediately before click; the live 6 Hz loop may regenerate mana.
    await click(270, 117);
    const afterReject = await state();
    const afterRejectPreview = await previewSignature();
    const rejectionMismatches = [];
    if (afterReject.rngState !== beforeReject.rngState) rejectionMismatches.push(`rng ${beforeReject.rngState}->${afterReject.rngState}`);
    if (afterReject.party.champions[0].mana !== beforeReject.party.champions[0].mana) {
      rejectionMismatches.push(`mana ${beforeReject.party.champions[0].mana}->${afterReject.party.champions[0].mana}`);
    }
    if (afterReject.runeFormulas.iaido.join(' ') !== 'LO') {
      rejectionMismatches.push(`formula ${afterReject.runeFormulas.iaido.join(' ')}`);
    }
    if (afterReject.interaction.kind !== 'RUNE_PANEL') rejectionMismatches.push(`owner ${afterReject.interaction.kind}`);
    if (afterRejectPreview.hash !== beforeRejectPreview.hash) {
      rejectionMismatches.push(`preview ${beforeRejectPreview.hash}->${afterRejectPreview.hash}`);
    }
    if (rejectionMismatches.length) {
      failures.push(`${source}: pre-validation rejection mismatch: ${rejectionMismatches.join(', ')}`);
    }
    await page.keyboard.press('Escape');
    if ((await state()).interaction.kind !== 'NONE') failures.push(`${source}: rejection recovery Escape did not restore focus`);
    checks.push(`${source}:rejection-recovery`);

    const geometryFailures = await page.evaluate(async selectedSource => {
      const data = await import('/src/data/index.ts');
      const fixture = await import('/tests/engine/testkit.ts');
      const render = await import('/src/render/index.ts');
      let graphics = data.createCleanRoomGraphicsBundle();
      if (selectedSource === 'AMIGA_GRAPHICS_DAT') {
        const response = await fetch('/assets/extracted/dm1/graphics.dat');
        graphics = data.parseGraphicsDat(new Uint8Array(await response.arrayBuffer()));
      }
      const vectors = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
      const found = [];
      for (const facing of [0, 1, 2, 3]) {
        for (const lane of ['LEFT', 'RIGHT']) {
          for (const depth of [1, 3]) {
            const vector = vectors[facing];
            const base = fixture.placeAt(fixture.partyOf('iaido'), 0, 3, 3, facing);
            const markerState = {
              ...base,
              projectiles: [],
              impactMarkers: [{
                level: 0,
                x: 3 + vector.dx * depth,
                y: 3 + vector.dy * depth,
                lane,
                expiresAtTick: base.tick + 10
              }]
            };
            const before = new render.Framebuffer();
            const after = new render.Framebuffer();
            render.renderFrame(before, { ...base, projectiles: [], impactMarkers: [] }, { graphics });
            render.renderFrame(after, markerState, { graphics });

            const size = depth === 1 ? 13 : 6;
            const laneOffset = (lane === 'LEFT' ? -1 : 1) * Math.max(3, Math.floor(18 / depth));
            const markerX = 112 + laneOffset - Math.floor(size / 2);
            const markerY = 33 + 112 - depth * 18 - Math.floor(size / 2);
            const allowed = {
              left: markerX - size - 3,
              right: markerX + size * 2 + 3,
              top: markerY - size - 3,
              bottom: markerY + size * 2 + 3
            };
            let changed = 0;
            let outside = 0;
            for (let y = 33; y < 169; y += 1) {
              for (let x = 0; x < 224; x += 1) {
                const offset = (y * 320 + x) * 4;
                let differs = false;
                for (let channel = 0; channel < 4; channel += 1) {
                  if (before.rgba[offset + channel] !== after.rgba[offset + channel]) differs = true;
                }
                if (!differs) continue;
                changed += 1;
                if (x < allowed.left || x >= allowed.right || y < allowed.top || y >= allowed.bottom) outside += 1;
              }
            }
            if (changed === 0 || outside !== 0) {
              found.push(`${selectedSource}: facing${facing}/${lane}/depth${depth} marker changed=${changed} outside=${outside}`);
            }
          }
        }
      }
      return found;
    }, source);
    failures.push(...geometryFailures);
    checks.push(`${source}:impact-geometry-16`);
  }
  const passed = errors.length === 0 && failures.length === 0;
  await writeFile(`${output}/report.json`, JSON.stringify({ passed, sources, checks, failures, browserErrors: errors }, null, 2) + '\n');
  if (!passed) throw new Error([...failures, ...errors].join('\n'));
  console.log(`Sprint 3 browser smoke prepared ${checks.length} checks across ${sources.join(', ')}.`);
} finally {
  await browser?.close();
  server.kill();
}
