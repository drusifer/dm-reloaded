/** Actual catalog inspector UAT; read existing raw exports without publishing or repairing them. */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { delimiter, dirname, relative, resolve, sep, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { loadSpriteExport, projectRoot } from './sprite-export-runtime.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const originalInput = 'public/assets/extracted/dm1/graphics.dat';
const baselineManifestHash = 'd4b9555ff40ed93be4dec34dc9c1af8b071cdbe489608acbce576c26a834d083';
const report = { passed: false, status: 'running', browserErrors: [], checks: [], captures: [], sourceAvailability: {} };
function check(name, passed, details = {}) {
  report.checks.push({ name, passed: Boolean(passed), ...details });
  if (!passed) throw new Error(`Catalog review failed: ${name}`);
}
async function directory() {
  const root = await realpath(projectRoot), build = resolve(root, 'build');
  const info = await lstat(build);
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('Catalog build root must be a real directory.');
  const out = resolve(build, 'catalog-review');
  let entry;
  try { entry = await lstat(out); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (entry && (entry.isSymbolicLink() || !entry.isDirectory())) throw new Error('Catalog evidence directory must not be an alias or file.');
  if (!entry) await mkdir(out);
  if (dirname(await realpath(out)) !== build) throw new Error('Catalog evidence escapes build.');
  return out;
}
async function destination(name) {
  if (!/^[a-z0-9-]+\.(json|png)$/.test(name)) throw new Error('Invalid catalog evidence filename.');
  const out = await directory(), path = resolve(out, name);
  let entry;
  try { entry = await lstat(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (entry && (entry.isSymbolicLink() || !entry.isFile())) throw new Error(`Unsafe catalog evidence destination ${name}.`);
  return path;
}
async function saveReport() { await writeFile(await destination('report.json'), `${JSON.stringify(report, null, 2)}\n`); }
async function existingArtifact(root, name) {
  const candidate = resolve(root, name), rel = relative(root, candidate);
  if (!rel || rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel)) throw new Error('Export artifact escapes its root.');
  const actual = await realpath(candidate), realRel = relative(root, actual);
  if (!realRel || realRel.startsWith(`..${sep}`) || realRel === '..' || isAbsolute(realRel)) throw new Error('Export artifact alias escapes its root.');
  return readFile(actual);
}
async function verifyRawExport() {
  const { result, graphics } = await loadSpriteExport(originalInput);
  report.sourceAvailability.original = { available: true, decodedSprites: graphics.sprites.size };
  const root = await realpath(resolve(projectRoot, 'build/sprites'));
  const actual = await existingArtifact(root, 'manifest.json');
  check('raw manifest equals pre-catalog baseline', sha(actual) === baselineManifestHash, { sha256: sha(actual) });
  check('current producer manifest exact bytes unchanged', actual.equals(Buffer.from(result.manifestJson)));
  check('actual original source hash unchanged', result.manifest.source.sha256 === sha(await readFile(resolve(projectRoot, originalInput))));
  check('original decoded coverage535', graphics.sprites.size === 535 && result.manifest.sprites.length === 535);
  for (const entry of result.manifest.sprites) {
    const bytes = await existingArtifact(root, entry.path), produced = result.pngFiles.get(entry.path);
    check(`raw PNG ${entry.index} byte/hash compatibility`, sha(bytes) === entry.sha256 && Buffer.from(produced).equals(bytes));
  }
  report.rawExport = { manifestSha256: sha(actual), sourceSha256: result.manifest.source.sha256, pngCount: result.pngFiles.size, verified: true };
}
async function capture(page, name) {
  await page.screenshot({ path: await destination(`${name}.png`), fullPage: true });
  report.captures.push(`${name}.png`);
}

async function inspectCatalog(page) {
  await page.goto('http://127.0.0.1:5197');
  await page.waitForFunction(() => Boolean(window.__DM_APP__));
  const expected = await page.evaluate(async () => {
    const data = await import('/src/data/index.ts');
    const { buildSpriteCatalog } = await import('/src/data/spriteCatalog.ts');
    const response = await fetch('/assets/extracted/dm1/graphics.dat');
    if (!response.ok || (response.headers.get('content-type') ?? '').includes('text/html')) throw new Error('Original source unavailable in browser.');
    const graphics = data.parseGraphicsDat(new Uint8Array(await response.arrayBuffer()));
    const entries = buildSpriteCatalog(graphics);
    window.__CATALOG_REVIEW__ = { graphics, entries };
    const generated = buildSpriteCatalog({ ...data.createCleanRoomGraphicsBundle(), sprites: new Map([17,42].map(index => [index, graphics.sprites.get(index)])) });
    return { total: entries.length, verified: entries.filter(entry => entry.status === 'verified').length,
      unknown: entries.filter(entry => entry.status === 'unclassified').length,
      generatedGuard: generated.every(entry => entry.provenance === 'generated' && entry.status === 'unclassified' && !entry.semanticKeys.length && !entry.usages.length),
      unknownDungeon: entries.filter(entry => entry.status === 'unclassified' && entry.category === 'dungeon').map(entry => entry.sourceIndex) };
  });
  report.catalog = expected;
  check('original catalog complete535 with explicit identity counts', expected.total === 535 && expected.verified + expected.unknown === 535, expected);
  check('generated17and42 cannot inherit original identities', expected.generatedGuard);
  await page.locator('#contact-sheet-toggle').focus();
  await page.keyboard.press('g');
  const panel = page.locator('#contact-sheet-panel'), search = page.locator('#cs-search');
  await panel.waitFor({ state: 'visible' });
  check('keyboard G opens actual inspector', await panel.isVisible());
  const options = () => page.locator('#cs-selected option').evaluateAll(nodes => nodes.filter(node => !node.disabled && node.value !== '').map(node => node.value));
  const choose = async index => { await page.locator('#cs-selected').selectOption(String(index)); };
  const canvas = () => page.locator('#cs-preview-canvas').evaluate(node => ({ width: node.width, height: node.height, pixels: Array.from(node.getContext('2d').getImageData(0,0,node.width,node.height).data) }));
  const reset = async () => { await page.locator('#cs-reset').click(); };
  check('all535 selectable and counts name verified vs unclassified', (await options()).length === 535 && /verified/i.test(await page.locator('#cs-counts').innerText()) && /unclassified/i.test(await page.locator('#cs-counts').innerText()));
  await search.fill('inventory.panel');
  check('verified semantic key search finds17', JSON.stringify(await options()) === '["17"]');
  await search.fill('17');
  check('numeric17 search includes exact raw17', JSON.stringify(await options()) === '["17"]');
  await choose(17);
  check('selected17 persistent details include evidence and measured dimensions', /17/.test(await page.locator('#cs-details').innerText()) && /224.*136/s.test(await page.locator('#cs-details').innerText()) && /evidence/i.test(await page.locator('#cs-details').innerText()));
  await capture(page, 'panel17-details');
  await reset(); await choose(27); await page.locator('#cs-preview-mode').selectOption('raw-opaque');
  const statsAlias = await page.locator('#cs-details').innerText();
  check('stats27 is a verified adapter alias without invented runtime usage', /inventory\.stats/i.test(statsAlias) && /verified role/i.test(statsAlias) && /verified usages:\s*none/i.test(statsAlias) && await page.locator('#cs-usage option').count() === 0);
  await capture(page, 'stats27-alias-only');
  await reset(); await page.locator('#cs-status').selectOption('verified');
  check('verified-only filter uses measured identity count', (await options()).length === expected.verified);
  await page.locator('#cs-status').selectOption('unclassified');
  check('unknown-only filter uses measured unknown count', (await options()).length === expected.unknown);
  await page.locator('#cs-category').selectOption('dungeon');
  check('combined category and unknown filters intersect', JSON.stringify((await options()).map(Number)) === JSON.stringify(expected.unknownDungeon));
  await search.fill('no-such-sprite-review');
  check('explicit combined no-match state', (await options()).length === 0 && /no.*(match|sprite)|0\s*(shown|of|\/)/i.test(`${await page.locator('#cs-counts').innerText()} ${await page.locator('#cs-details').innerText()}`));
  await reset(); check('reset restores full catalog', (await options()).length === 535 && await search.inputValue() === '');
  await choose(42); await page.locator('#cs-preview-mode').selectOption('raw-opaque');
  const opaque = await canvas(); await capture(page, 'atlas42-raw-opaque');
  await page.locator('#cs-preview-mode').selectOption('raw-index-0');
  const rawZero = await canvas();
  check('atlas opaque and raw-index0 interpretations visibly differ', opaque.width === rawZero.width && opaque.height === rawZero.height && JSON.stringify(opaque.pixels) !== JSON.stringify(rawZero.pixels));
  await page.locator('#cs-preview-mode').selectOption('usage'); await page.locator('#cs-usage').selectOption('item.icon.7');
  const torch = await canvas();
  check('torch usage is exact16crop instead of full256atlas', torch.width === 16 && torch.height === 16 && opaque.width === 256 && opaque.height === 32);
  const torchPixels = await page.evaluate(({ actual }) => {
    const { graphics } = window.__CATALOG_REVIEW__, sprite = graphics.sprites.get(42), palette=graphics.lightPalettes[5];
    let colored=0, holes=0;
    for(let y=0;y<16;y++)for(let x=0;x<16;x++) {
      const index=sprite.pixels[y*256+112+x], offset=(y*16+x)*4;
      if(index===0) {
        if(actual.slice(offset,offset+4).some(value=>value!==0))return {valid:false};
        holes++;
        continue;
      }
      const color=palette[index];
      if(actual[offset]!==color[0]||actual[offset+1]!==color[1]||actual[offset+2]!==color[2]||actual[offset+3]!==255)return {valid:false};
      colored++;
    }
    return {valid:colored>0&&colored+holes===256,colored,holes};
  }, {actual:torch.pixels});
  check('actual torch crop nontransparent pixels match independent source coordinates', torchPixels.valid, torchPixels);
  await capture(page, 'atlas42-cropped-torch');
  await choose(85); await page.locator('#cs-preview-mode').selectOption('raw-opaque'); const wallOpaque = await canvas();
  await page.locator('#cs-preview-mode').selectOption('usage'); await page.locator('#cs-usage').selectOption('viewport.source.85'); const wallMasked = await canvas();
  check('wall verified index10 usage differs from opaque raw', JSON.stringify(wallOpaque.pixels) !== JSON.stringify(wallMasked.pixels) && /10/.test(await page.locator('#cs-details').innerText()));
  const wallPolicy = await page.evaluate(({opaque,masked}) => {
    const {graphics}=window.__CATALOG_REVIEW__, sprite=graphics.sprites.get(85), palette=graphics.lightPalettes[5];
    let ten=0,zero=0;
    for(let p=0;p<sprite.pixels.length;p++) {
      const index=sprite.pixels[p],offset=p*4,color=palette[index];
      if(color.some((value,c)=>opaque[offset+c]!==value)||opaque[offset+3]!==255)return {valid:false};
      if(index===10){if(masked.slice(offset,offset+4).every((value,c)=>value===opaque[offset+c]))return {valid:false};ten++;}
      else if(index===0){if(masked.slice(offset,offset+4).some((value,c)=>value!==opaque[offset+c]))return {valid:false};zero++;}
    }
    return {valid:ten>0,transparent10:ten,opaque0:zero};
  }, {opaque:wallOpaque.pixels,masked:wallMasked.pixels});
  check('actual wall index10 holes preserve source0opaque', wallOpaque.width === wallMasked.width && wallPolicy.valid, wallPolicy);
  await capture(page, 'wall85-index10-usage');
  await choose(110); await page.locator('#cs-preview-mode').selectOption('usage'); await page.locator('#cs-usage').selectOption('viewport.source.110');
  const doorPolicy = await page.locator('#cs-details').innerText();
  check('door110 discloses conditional auxiliary301 without claiming compound preview', /when bashed/i.test(doorPolicy) && /auxiliary source 301/i.test(doorPolicy) && /index 0 breach mask/i.test(doorPolicy) && /not applied.*ordinary slab preview/i.test(doorPolicy));
  await capture(page, 'door110-auxiliary301-disclosure');
  await choose(301); await page.locator('#cs-preview-mode').selectOption('usage'); await page.locator('#cs-usage').selectOption('door.breach-mask');
  const breachPolicy = await page.locator('#cs-details').innerText();
  check('source301 is disclosed as a separate index0 mask stencil', /bashed-door breach mask/i.test(breachPolicy) && /mask stencil:\s*index 0/i.test(breachPolicy) && /door\.breach-mask/i.test(breachPolicy));
  await capture(page, 'mask301-stencil-usage');
  await choose(2); await page.locator('#cs-preview-mode').selectOption('raw-opaque');
  const unknown = await page.locator('#cs-details').innerText();
  check('unknown2 raw preview never claims verified usage', /unclassified/i.test(unknown) && await page.locator('#cs-usage option').count() <= 1);
  await capture(page, 'unknown2-raw');
  await choose(42); await page.locator('#cs-preview-mode').selectOption('raw-opaque');
  await page.locator('#cs-zoom').selectOption('1'); const zoom1 = await page.locator('.cs-canvas').evaluate(node => node.width);
  await page.locator('#cs-zoom').selectOption('3'); const zoom3 = await page.locator('.cs-canvas').evaluate(node => node.width);
  check('zoom changes actual contact-sheet canvas', zoom1 !== zoom3);
  await page.locator('#cs-ramp').selectOption('5'); const bright = await canvas();
  await page.locator('#cs-ramp').selectOption('0'); const dark = await canvas();
  check('source ramp reference changes actual preview colors', JSON.stringify(bright.pixels) !== JSON.stringify(dark.pixels));
  await choose(17);
  await page.evaluate(() => {
    const original = navigator.clipboard.writeText;
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    window.__CATALOG_CLIPBOARD_RACE__ = { original, copied: '', release };
    navigator.clipboard.writeText = async value => { window.__CATALOG_CLIPBOARD_RACE__.copied = value; await pending; };
  });
  await page.locator('#cs-copy').click();
  await choose(42);
  await page.evaluate(() => window.__CATALOG_CLIPBOARD_RACE__.release());
  await page.waitForFunction(() => /copied item\[17\]/i.test(document.getElementById('contact-sheet-panel').textContent));
  check('clipboard17 result remains truthful after selection changes to42', await page.evaluate(() => window.__CATALOG_CLIPBOARD_RACE__.copied) === '17' && await page.locator('#cs-selected').inputValue() === '42');
  await page.evaluate(() => { navigator.clipboard.writeText = window.__CATALOG_CLIPBOARD_RACE__.original; delete window.__CATALOG_CLIPBOARD_RACE__; });
  await page.locator('#cs-copy').click();
  await page.waitForFunction(() => /copied/i.test(document.getElementById('cs-details').textContent + document.getElementById('contact-sheet-panel').textContent));
  check('copy writes actual selected raw index clipboard', await page.evaluate(() => navigator.clipboard.readText()) === '42');
  await page.evaluate(() => { window.__CLIPBOARD_WRITE__ = navigator.clipboard.writeText; navigator.clipboard.writeText = async () => { throw new DOMException('Review denied clipboard','NotAllowedError'); }; });
  await page.locator('#cs-copy').click();
  await page.waitForFunction(() => /could not|unable|denied|failed|unavailable|cannot/i.test(document.getElementById('contact-sheet-panel').textContent));
  check('clipboard denial gives recoverable feedback and keeps selection', await panel.isVisible() && await page.locator('#cs-selected').inputValue() === '42');
  await page.evaluate(() => { navigator.clipboard.writeText = window.__CLIPBOARD_WRITE__; });
  await search.fill(''); await search.focus();
  const before = await page.evaluate(() => { const s=window.__DM_APP__.getState(); return JSON.stringify({x:s.party.x,y:s.party.y,facing:s.party.facing,inventory:s.openInventoryChampionIndex,sleep:s.party.sleeping}); });
  await search.pressSequentially('gwasdb1234');
  const after = await page.evaluate(() => { const s=window.__DM_APP__.getState(); return JSON.stringify({x:s.party.x,y:s.party.y,facing:s.party.facing,inventory:s.openInventoryChampionIndex,sleep:s.party.sleeping}); });
  check('typing G WASD and inventory keys cannot leak to gameplay or toggle inspector', before === after && await panel.isVisible() && await search.inputValue() === 'gwasdb1234');
  await page.keyboard.press('Escape');
  check('one Escape from search closes and restores opener focus', !(await panel.isVisible()) && await page.locator('#contact-sheet-toggle').evaluate(node => document.activeElement === node));
  // Rebootstrap the real app with its actual generated bundle, not original art relabelled fallback.
  await page.evaluate(async () => {
    window.__DM_APP__.destroy();
    const data = await import('/src/data/index.ts'), main = await import('/src/main.ts');
    window.__DM_APP__ = main.startDungeonMasterApp(document.getElementById('amiga-screen'), { campaign: data.createCleanRoomBundle(), graphics: data.createCleanRoomGraphicsBundle() });
  });
  await page.locator('#contact-sheet-toggle').focus(); await page.keyboard.press('g');
  await panel.waitFor({state:'visible'});
  check('true clean-room empty catalog is honest', (await options()).length === 0 && /empty|no.*sprite|0\s*(shown|of|\/)|0.*sprite/i.test(await panel.innerText()));
  report.sourceAvailability.fallback = { available: true, decodedSprites: 0, state: 'empty-generated-source' };
  await capture(page, 'fallback-empty');
  await page.keyboard.press('Escape');
  check('fallback inspector Escape returns to game', !(await panel.isVisible()));
}

export async function runCatalogReview() {
  let browser, server;
  await saveReport();
  try {
    await verifyRawExport();
    const modulePath = process.env.PLAYWRIGHT_MODULE ?? (process.env.PATH ?? '').split(delimiter)
      .map(bin => resolve(bin, '../playwright/index.mjs')).find(path => existsSync(path));
    if (!modulePath) throw new Error('Use bobp make visual-review ARGS=--catalog to provide pinned Playwright.');
    const { chromium } = await import(pathToFileURL(modulePath).href);
    server = spawn(process.execPath, [resolve(projectRoot, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5197', '--strictPort'], { cwd: projectRoot, stdio: 'pipe' });
    let log = '';
    for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { log = `${log}${chunk}`.slice(-6000); });
    let spawnError;
    server.on('error', error => { spawnError = error; });
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      if (spawnError || server.exitCode !== null) throw new Error(`Catalog Vite startup failed: ${spawnError?.message ?? log}`);
      // Require our own strict-port listener's ready announcement before probing it.
      if (log.includes('http://127.0.0.1:5197')) {
        try { ready = (await fetch('http://127.0.0.1:5197', { signal: AbortSignal.timeout(500) })).ok; } catch { /* bounded startup */ }
        if (ready) break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!ready || server.exitCode !== null) throw new Error(`Catalog Vite did not start: ${log}`);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await context.newPage();
    page.on('pageerror', error => report.browserErrors.push(error.message));
    await inspectCatalog(page);
    check('no browser exceptions', report.browserErrors.length === 0);
    report.status = 'passed'; report.passed = true;
    await saveReport();
    console.log(`Catalog review passed ${report.checks.length} checks; ${report.captures.length} captures.`);
  } catch (error) {
    report.status = 'failed'; report.passed = false; report.error = error.message;
    await saveReport();
    throw error;
  } finally {
    await browser?.close();
    server?.kill();
  }
}
