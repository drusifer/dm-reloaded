/** Live browser renderer evidence for the Sprint 2 Smith gate. Run with bobp make visual-review. */
import { existsSync } from 'node:fs';
import { lstat, mkdir, realpath, writeFile } from 'node:fs/promises';
import { delimiter, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
if (process.argv.includes('--catalog')) {
  const { runCatalogReview } = await import('./sprite-catalog-review.mjs');
  await runCatalogReview();
} else if (process.argv.includes('--lighting')) {
  await runLightingReview();
} else {
const modulePath = process.env.PLAYWRIGHT_MODULE ?? process.env.PATH.split(delimiter)
  .map(bin => resolve(bin, '../playwright/index.mjs')).find(path => existsSync(path));
if (!modulePath) throw new Error('Run through bobp make visual-review to provide Playwright.');
const { chromium } = await import(pathToFileURL(modulePath).href);
const out = resolve('build/visual-review');
await mkdir(out, { recursive: true });
const port = 5197;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let browser;
try {
  for (let attempt = 0; ; attempt++) {
    try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) break; } catch { /* Vite is starting. */ }
    if (attempt > 80) throw new Error('Vite did not start');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForSelector('canvas');
  await page.screenshot({ path: `${out}/runtime.png` });
  const captures = await page.evaluate(async () => {
    const data = await import('/src/data/index.ts');
    const render = await import('/src/render/index.ts');
    const fixture = await import('/tests/engine/testkit.ts');
    const response = await fetch('/assets/extracted/dm1/graphics.dat');
    const real = response.ok && !(response.headers.get('content-type') ?? '').includes('text/html')
      ? data.parseGraphicsDat(new Uint8Array(await response.arrayBuffer())) : null;
    const result = [];
    const capture = (name, framebuffer) => {
      const canvas = document.createElement('canvas');
      canvas.width = framebuffer.width; canvas.height = framebuffer.height;
      canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(framebuffer.rgba), canvas.width, canvas.height), 0, 0);
      result.push({ name, png: canvas.toDataURL('image/png') });
    };
    if (real) for (const id of [17, 23, 25, 27]) {
      const sprite = real.sprites.get(id);
      if (!sprite) continue;
      const fb = new render.Framebuffer();
      fb.blitSprite(sprite, 0, 0, real.lightPalettes[5]);
      capture(`panel-${id}`, fb);
    }
    if (real) {
      const fb = new render.Framebuffer();
      const source = render.createSpriteSource(real);
      for (let icon = 4; icon <= 7; icon++) fb.blitSprite(source.getSprite(`item.icon.${icon}`), (icon - 4) * 76, 40, real.lightPalettes[5], { dstWidth: 64, dstHeight: 64 });
      capture('torch-stages', fb);
    }
    for (const [mode, graphics] of [['fallback', data.createCleanRoomGraphicsBundle()], ...(real ? [['amiga', real]] : [])]) {
      let state = fixture.partyOf('iaido', 'zed');
      for (const scene of ['inventory', 'chest', 'scroll', 'floor', 'alcove', 'sleep', 'side-left', 'side-right', 'torch-cursor']) {
        let sample = { ...state, openInventoryChampionIndex: 0 };
        if (scene === 'chest') sample.openContainerId = 'cr_chest_1';
        if (scene === 'scroll') sample.openContainerId = 'cr_scroll_1';
        if (scene === 'floor') sample = fixture.placeAt({ ...state, handItem: 'cr_dagger_1' }, 0, 2, 2, 1);
        if (scene === 'alcove') sample = fixture.placeAt(state, 1, 5, 4, 3);
        if (scene === 'sleep') sample = { ...state, party: { ...state.party, sleeping: true } };
        if (scene==='torch-cursor') sample={...fixture.withItem(state,'review-torch','TORCH',{charges:15}),handItem:'review-torch'};
        if (scene.startsWith('side-')) {
          sample=fixture.placeAt(state,0,3,3,0);
          const left=scene==='side-left', face=left?1:3, wx=left?2:4;
          const floor={type:'FLOOR',rawFlags:0,wallFeatures:[],actuators:[],itemNames:[]};
          sample={...sample,levels:sample.levels.map((level,i)=>i===0?{...level,tiles:Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>x===wx&&y===3?{...floor,type:'WALL',wallFeatures:[{face,kind:'ALCOVE'}],wallItems:{0:[],1:[],2:[],3:[],[face]:['cr_key_iron','cr_scroll_1']}}:floor))}:level)};
        }
        const fb = new render.Framebuffer();
        render.renderFrame(fb, sample, { graphics, pointer: scene==='torch-cursor'?{x:185,y:75}:null });
        capture(`${mode}-${scene}`, fb);
      }
    }
    return result;
  });
  for (const capture of captures) await writeFile(`${out}/${capture.name}.png`, Buffer.from(capture.png.split(',')[1], 'base64'));
  const interactions = [];
  if (process.argv.includes('--interactions')) {
    await page.evaluate(async () => {
      const { createCleanRoomBundle, createCleanRoomGraphicsBundle } = await import('/src/data/index.ts');
      const { startDungeonMasterApp } = await import('/src/main.ts');
      window.__DM_APP__?.destroy();
      window.__DM_APP__ = startDungeonMasterApp(document.getElementById('amiga-screen'), {
        campaign: createCleanRoomBundle(), graphics: createCleanRoomGraphicsBundle()
      });
    });
    const state = () => page.evaluate(() => window.__DM_APP__.getState());
    const check = (condition, label) => { if (!condition) throw new Error(`Live interaction failed: ${label}`); interactions.push(label); };
    const point = async (x,y) => {
      const box = await page.locator('#amiga-screen').boundingBox();
      return { x: box.x + (x + .5) * box.width / 320, y: box.y + (y + .5) * box.height / 200 };
    };
    const click = async (x,y,button='left') => { const p=await point(x,y); await page.mouse.click(p.x,p.y,{button}); };
    const snapshot = async name => { await page.waitForTimeout(60); await page.screenshot({path:`${out}/live-${name}.png`}); };
    const layout = await page.evaluate(async () => { const r=await import('/src/render/index.ts'); return { ...r.LAYOUT_RECTS, chest:r.CHEST_SLOT_RECTS, backpack:r.BACKPACK_SLOT_RECTS, equip:r.EQUIP_SLOT_RECTS }; });
    const center = rect => [rect.x + rect.w/2,rect.y + rect.h/2];
    await click(270,130); // Clean-room (1,2) east -> (2,2).
    await click(240,130); // Turn north toward Iaido's mirror.
    await click(112,90);
    check((await state()).activeMirror !== null,'mirror opens through actual viewport click');
    await snapshot('mirror');
    await click(...center(layout.MIRROR_BTN_RESURRECT));
    check((await state()).party.champions.length===1,'mirror button recruits champion');
    await click(10,4);
    check((await state()).openInventoryChampionIndex===0,'left header opens inventory');
    await snapshot('inventory');
    await click(30,100,'right');
    check((await state()).openInventoryChampionIndex===null,'right click closes inventory once');
    await click(...center(layout.FLOOR_RIGHT_HIT));
    check((await state()).handItem==='cr_chest_1','front-right floor click picks up chest');
    await click(10,4);
    await click(...center(layout.INVENTORY_EYE));
    check((await state()).openContainerId==='cr_chest_1','Eye opens held chest');
    await snapshot('chest');
    await click(...center(layout.backpack[0])); // Store chest; free cursor for contents.
    check((await state()).handItem===null,'backpack stores chest and preserves inspection');
    await click(...center(layout.chest[0]));
    check((await state()).handItem==='cr_apple_1','chest slot picks up apple');
    await click(...center(layout.INVENTORY_MOUTH));
    check((await state()).handItem===null,'Mouth consumes apple');
    check((await page.evaluate(()=>window.__DM_APP__.getAudio().getHistory())).some(c=>c.cue==='GULP'),'consume emits routed GULP sound');
    await click(30,100,'right');
    await click(...center(layout.SLEEP_PILL));
    check((await state()).party.sleeping,'ZZZ pill starts sleep');
    await snapshot('sleep');
    const facing=(await state()).party.facing;
    await page.keyboard.press('e');
    check(!(await state()).party.sleeping && (await state()).party.facing===facing,'arbitrary key wakes without turning');
    await click(...center(layout.QOL_PILL));
    await page.keyboard.press('m');
    check((await state()).settings.automapOpen,'QoL map shortcut opens automap');
    await click(100,90,'right');
    check(!(await state()).settings.automapOpen && (await state()).openInventoryChampionIndex===null,'right click dismisses automap before inventory');
    await page.keyboard.press('1');
    check((await state()).openInventoryChampionIndex===0,'QoL numeric shortcut opens inventory');
    await page.keyboard.press('Escape');
    check((await state()).openInventoryChampionIndex===null,'Escape closes inventory');
    await click(302,130); // Turn east: dagger lies on front-right quadrant.
    await click(...center(layout.FLOOR_RIGHT_HIT));
    check((await state()).handItem==='cr_dagger_1','rotated floor click picks up dagger');
    const cursor=await point(185,75); await page.mouse.move(cursor.x,cursor.y);
    await snapshot('cursor');
    await click(170,65);
    check((await state()).handItem===null,'upper corridor click throws held dagger');
    await page.keyboard.press('b');
    check((await page.locator('body').innerText()).includes('THROW_SWOOSH'),'soundboard exposes new survival cues');
    await snapshot('soundboard');
    const gulpSelect=page.locator('.sfx-cue-chip').filter({has:page.locator('.sfx-cue-name',{hasText:'GULP'})}).locator('select');
    await gulpSelect.selectOption('');
    check(await page.evaluate(()=>window.__DM_APP__.getAudio().getCueMapping().GULP===null),'explicit silent audio selection remains null');
    await gulpSelect.selectOption('-1');
    await page.keyboard.press('Escape');
    // Isolated deterministic scenario setup. Subsequent actions use real runtime event handlers.
    await page.evaluate(async()=>{
      const f=await import('/tests/engine/testkit.ts');
      const sample=f.placeAt(f.hold(f.partyOf('iaido'),'cr_scroll_1'),1,5,4,3);
      Object.assign(window.__DM_APP__.getState(),sample);
    });
    await click(10,4); await click(...center(layout.INVENTORY_EYE));
    check((await state()).openContainerId==='cr_scroll_1','Eye opens scroll parchment in running app fixture');
    await snapshot('scroll');
    await page.evaluate(async()=>{
      const f=await import('/tests/engine/testkit.ts');
      Object.assign(window.__DM_APP__.getState(),f.placeAt(f.hold(f.partyOf('iaido'),'cr_key_iron'),1,5,4,1));
    });
    await click(112,90);
    const unlocked=await state();
    check(unlocked.handItem===null && unlocked.projectiles.length===0 && unlocked.levels[1].tiles[4][6].wallFeatures.some(f=>f.kind==='KEYHOLE'&&f.unlocked),'facing keyhole consumes matching key instead of throwing');
    await snapshot('keyhole');
    await page.evaluate(async()=>{
      const f=await import('/tests/engine/testkit.ts');
      const {findItemDefByLegacyName}=await import('/src/data/itemCatalog.ts');
      let sample=f.placeAt(f.partyOf('iaido','zed'),1,5,5,2);
      const champion=sample.party.champions[0], def=findItemDefByLegacyName('BONES');
      sample={...sample,handItem:'review-bones',items:{...sample.items,'review-bones':{instanceId:'review-bones',defId:def.defId,iconIndex:def.iconIndex,name:'IAIDO BONES',bonesChampionId:champion.id}},
        party:{...sample.party,leaderIndex:1,champions:sample.party.champions.map((c,i)=>i===0?{...c,alive:false,health:0}:c)}};
      Object.assign(window.__DM_APP__.getState(),sample);
    });
    await snapshot('altar-before');
    await click(112,90);
    check((await state()).party.champions[0].alive && (await state()).handItem===null,'Vi altar click revives fallen champion and consumes bones');
    await snapshot('altar-after');
    const originalDex=await page.evaluate(async()=>{
      const f=await import('/tests/engine/testkit.ts');
      const sample={...f.hold(f.withItem(f.partyOf('iaido'),'review-helm','DEXHELM'),'review-helm'),openInventoryChampionIndex:0};
      Object.assign(window.__DM_APP__.getState(),sample);
      return sample.party.champions[0].attributes.dexterity;
    });
    await click(...center(layout.equip.head));
    check(await page.evaluate(async(base)=>{const {effectiveChampionAttributes}=await import('/src/engine/inventory.ts');const s=window.__DM_APP__.getState();return s.party.champions[0].inventory.slots.head==='review-helm'&&effectiveChampionAttributes(s,s.party.champions[0]).dexterity===base+10;},originalDex),'equipping Dexhelm updates effective DEX by10');
    await snapshot('equipment-bonus');
    await click(...center(layout.equip.head));
    check(await page.evaluate(async(base)=>{const {effectiveChampionAttributes}=await import('/src/engine/inventory.ts');const s=window.__DM_APP__.getState();return s.handItem==='review-helm'&&effectiveChampionAttributes(s,s.party.champions[0]).dexterity===base;},originalDex),'unequipping Dexhelm reverses bonus without mutating base');
    await page.evaluate(async()=>{
      const f=await import('/tests/engine/testkit.ts');
      const sample={...f.patchChampion(f.partyOf('iaido'),0,{food:-1,water:200}),openInventoryChampionIndex:0};
      Object.assign(window.__DM_APP__.getState(),sample);
    });
    await snapshot('vital-warnings');
    await page.evaluate(async()=>{
      const f=await import('/tests/engine/testkit.ts');
      const data=await import('/src/data/index.ts');
      const {startDungeonMasterApp}=await import('/src/main.ts');
      const response=await fetch('/assets/extracted/dm1/graphics.dat');
      if(response.ok && !(response.headers.get('content-type')??'').includes('text/html')) {
        const graphics=data.parseGraphicsDat(new Uint8Array(await response.arrayBuffer()));
        window.__DM_APP__.destroy();
        window.__DM_APP__=startDungeonMasterApp(document.getElementById('amiga-screen'),{campaign:data.createCleanRoomBundle(),graphics});
      }
      Object.assign(window.__DM_APP__.getState(),{...f.partyOf('zed'),openInventoryChampionIndex:0});
    });
    await click(...center(layout.equip.rightHand));
    check((await state()).items[(await state()).handItem].name==='TORCH','picking up torch keeps its complete lit item');
    const torchPointer=await point(185,75); await page.mouse.move(torchPointer.x,torchPointer.y);
    await snapshot('torch-cursor');
    check(await page.locator('#amiga-screen').evaluate(canvas=>getComputedStyle(canvas).cursor==='none'),'held object replaces native arrow at centered hotspot');

    await page.evaluate(()=>{window.__DM_APP__.getState().gameOver=true;});
    await snapshot('game-over');
    await page.keyboard.press('Enter');
    check(!(await state()).gameOver && (await state()).party.champions.length===0,'Enter restarts wiped party from original campaign');
    await page.evaluate(()=>{window.__DM_APP__.getState().gameOver=true;});
    await click(120,90);
    check(!(await state()).gameOver && (await state()).party.x===1,'click restarts wiped party without extra movement');
  }
  await writeFile(`${out}/report.json`, JSON.stringify({ errors, captures: captures.map(c => c.name), interactions }, null, 2));
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Saved runtime and ${captures.length} rendered scenes to ${out}; ${interactions.length} live interaction checks passed; no browser exceptions.`);
} finally {
  await browser?.close();
  server.kill();
}

}

/** Lighting-only mode keeps legacy scenes/interactions unchanged and owns separate evidence. */
async function lightingEvidenceFile(name) {
  const project = await realpath(fileURLToPath(new URL('../', import.meta.url)));
  let current = project;
  for (const part of ['build', 'lighting-review']) {
    current = resolve(current, part);
    let info;
    try { info = await lstat(current); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (info && (info.isSymbolicLink() || !info.isDirectory())) throw new Error('Lighting evidence directories must be real project directories.');
    if (!info) await mkdir(current);
  }
  const destination = resolve(current, name);
  if (dirname(destination) !== current || name.includes(':')) throw new Error('Lighting evidence filenames must be portable direct children.');
  let info;
  try { info = await lstat(destination); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (info && (info.isSymbolicLink() || !info.isFile())) throw new Error('Lighting evidence files must not be symlinks or non-files.');
  return destination;
}
async function lightingReport(value) {
  await writeFile(await lightingEvidenceFile('report.json'), JSON.stringify(value, null, 2) + '\n');
}
async function runLightingReview() {
  let server, browser;
  const errors = [];
  try {
    await lightingReport({ passed: false, status: 'running', browserErrors: [] });
    const modulePath = process.env.PLAYWRIGHT_MODULE ?? (process.env.PATH ?? '').split(delimiter)
      .map(bin => resolve(bin, '../playwright/index.mjs')).find(path => existsSync(path));
    if (!modulePath) throw new Error('Use bobp make visual-review ARGS=--lighting to provide Playwright.');
    const { chromium } = await import(pathToFileURL(modulePath).href);
    const port = 5197;
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
    let startupLog = '';
    for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { startupLog = (startupLog + chunk.toString()).slice(-2048); });
    for (let attempt = 0; ; attempt++) {
      if (server.exitCode !== null) throw new Error(`Lighting Vite server stopped; port ${port} must be free. ${startupLog.trim()}`);
      try {
        if ((await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(1000) })).ok) {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (server.exitCode !== null) throw new Error(`Lighting Vite server could not own port ${port}: ${startupLog.trim()}`);
          break;
        }
      } catch (error) { if (server.exitCode !== null) throw error; }
      if (attempt > 80) throw new Error('Lighting Vite server did not start.');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}`);
    const result = await page.evaluate(async () => {
      const data = await import('/src/data/index.ts');
      const render = await import('/src/render/index.ts');
      const fixture = await import('/tests/engine/testkit.ts');
      const inventory = await import('/src/engine/inventory.ts');
      const cases = [], captures = [], checks = [];
      const check = (condition, message) => { if (!condition) throw new Error(message); checks.push(message); };
      let original = null, absence = null;
      try {
        const response = await fetch('/assets/extracted/dm1/graphics.dat');
        if (!response.ok || (response.headers.get('content-type') ?? '').includes('text/html')) absence = 'Original graphics.dat is unavailable.';
        else {
          original = data.parseGraphicsDat(new Uint8Array(await response.arrayBuffer()));
          if (!original.sprites.size) { original = null; absence = 'Original source contained no decoded sprites.'; }
        }
      } catch (error) { absence = `Original graphics.dat could not be parsed: ${error.message}`; }
      const modes = [['fallback', data.createCleanRoomGraphicsBundle()], ...(original ? [['original', original]] : [])];
      const base = fixture.withItem(fixture.withItem(fixture.partyOf('iaido'), 'lighting-world-torch', 'TORCH', { charges: 15 }), 'lighting-cursor-torch', 'TORCH', { charges: 15 });
      const champion = base.party.champions[0];
      const cleanHero = { ...champion, inventory: { slots: Object.fromEntries(Object.keys(champion.inventory.slots).map(slot => [slot, null])), backpack: champion.inventory.backpack.map(() => null) } };
      const makeState = (ambient, depth, kind = 'world') => {
        const tile = type => ({ type, rawFlags: 0, wallFeatures: [], actuators: [], itemNames: [] });
        const tiles = Array.from({ length: 9 }, (_, y) => Array.from({ length: 9 }, (_, x) => tile(x === 4 && y >= 1 && y <= 7 ? 'FLOOR' : 'WALL')));
        tiles[7 - depth][4] = { ...tile('WALL'), wallFeatures: [{ face: 2, kind: 'ALCOVE' }], wallItems: { 0: [], 1: [], 2: ['cr_dagger_1'], 3: [] } };
        tiles[7][4] = { ...tile('FLOOR'), floorItems: { 0: ['lighting-world-torch'], 1: [], 2: [], 3: [] } };
        return { ...base, messages: ['LIGHTING REVIEW FIXTURE'], activeMirror: null, gameOver: false,
          handItem: kind === 'world' ? null : 'lighting-cursor-torch', openInventoryChampionIndex: kind === 'inventory' ? 0 : null,
          party: { ...base.party, level: 0, x: 4, y: 7, facing: 0, torchLight: 0, sleeping: false, champions: [cleanHero] },
          levels: [{ ...base.levels[0], id: 0, width: 9, height: 9, ambientLight: ambient, tiles }] };
      };
      const frame = (state, graphics, pointer = null) => {
        const fb = new render.Framebuffer(); render.renderFrame(fb, state, { graphics, pointer }); return fb;
      };
      const viewportMetrics = fb => {
        let intensity = 0, colored = 0;
        for (let y = 33; y < 169; y++) for (let x = 0; x < 224; x++) {
          const sum = fb.getPixel(x, y).reduce((a, b) => a + b, 0); intensity += sum; if (sum) colored++;
        }
        return { intensity, colored };
      };
      const different = (a, b, rect) => {
        let count = 0;
        for (let y = rect.y; y < rect.y + rect.h; y++) for (let x = rect.x; x < rect.x + rect.w; x++) if (a.getPixel(x, y).some((value, i) => value !== b.getPixel(x, y)[i])) count++;
        return count;
      };
      const sameUi = (a, b) => {
        for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) {
          if (x < 224 && y >= 33 && y < 169) continue;
          if (x >= 224 && y >= 55 && y < 70) continue; // LIGHT status text legitimately changes.
          if (a.getPixel(x, y).some((value, i) => value !== b.getPixel(x, y)[i])) return false;
        }
        return true;
      };
      const capture = (name, fb) => {
        const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 200;
        canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(fb.rgba), 320, 200), 0, 0);
        captures.push({ name, png: canvas.toDataURL('image/png') });
      };
      for (const [mode, graphics] of modes) {
        for (const depth of [1, 2, 3]) {
          const frames = [], energies = [];
          for (const ambient of [0, 1, 5]) {
            const state = makeState(ambient, depth), snapshot = JSON.stringify(state);
            const effective = Math.max(0, Math.min(5, ambient + inventory.partyLightBonus(state)));
            check(effective === ambient, `${mode} world matrix has no equipment/cursor/base torch contribution at light${ambient},depth${depth}`);
            const fb = frame(state, graphics), metrics = viewportMetrics(fb), repeated = frame(state, graphics);
            check(fb.rgba.every((value, i) => value === repeated.rgba[i]) && snapshot === JSON.stringify(state), `${mode} light${ambient},depth${depth} frame deterministic/state immutable`);
            check(ambient === 0 ? metrics.colored === 0 : metrics.colored > 0, `${mode} light${ambient},depth${depth} world darkness/visibility`);
            const noTorch = { ...state, levels: [{ ...state.levels[0], tiles: state.levels[0].tiles.map((row, y) => row.map((tile, x) => x === 4 && y === 7 ? { ...tile, floorItems: { 0: [], 1: [], 2: [], 3: [] } } : tile)) }] };
            const torchPixels = different(fb, frame(noTorch, graphics), { x: 0, y: 33, w: 224, h: 136 });
            check(ambient === 0 ? torchPixels === 0 : torchPixels > 0, `${mode} light${ambient},depth${depth} complete world torch participates in world lighting`);
            const name = `${mode}-world-light${ambient}-depth${depth}`;
            cases.push({ name, mode, kind: 'world', ambientLight: ambient, effectiveLight: effective, featureDepth: depth, worldIntensity: metrics.intensity, worldTorchPixels: torchPixels });
            capture(name, fb); frames.push(fb); energies.push(metrics.intensity);
          }
          check(energies[0] === 0 && energies[1] > 0 && energies[2] > energies[1], `${mode} depth${depth} actual rendered light response`);
          check(sameUi(frames[0], frames[1]) && sameUi(frames[1], frames[2]), `${mode} depth${depth} UI colors stable except dynamic LIGHT text`);
        }
        for (const kind of ['inventory', 'cursor']) {
          const frames = [];
          for (const ambient of [0, 5]) {
            const state = makeState(ambient, 1, kind), pointer = { x: 290, y: 95 };
            const effective = Math.max(0, Math.min(5, ambient + inventory.partyLightBonus(state)));
            const fb = frame(state, graphics, pointer);
            check(different(fb, frame(state, graphics), { x: 282, y: 87, w: 16, h: 16 }) > 0, `${mode} ${kind} ambient${ambient} full-bright complete torch cursor visible`);
            const name = `${mode}-${kind}-ambient${ambient}-effective${effective}`;
            cases.push({ name, mode, kind, ambientLight: ambient, effectiveLight: effective, featureDepth: 1 });
            capture(name, fb); frames.push(fb);
          }
          check(sameUi(frames[0], frames[1]), `${mode} ${kind} outside-viewport UI unchanged`);
          if (kind === 'inventory') check(different(frames[0], frames[1], { x: 0, y: 33, w: 224, h: 136 }) === 0, `${mode} inventory stays full-bright independent of dungeon light`);
        }
      }
      return { cases, captures, checks, sourceAvailability: { fallback: true, original: Boolean(original), originalSpriteCount: original?.sprites.size ?? 0, originalUnavailableReason: absence } };
    });
    for (const capture of result.captures) await writeFile(await lightingEvidenceFile(`${capture.name}.png`), Buffer.from(capture.png.split(',')[1], 'base64'));
    if (errors.length) throw new Error(errors.join('; '));
    const complete = result.sourceAvailability.original;
    await lightingReport({ passed: complete, status: complete ? 'passed' : 'partial', browserErrors: errors,
      sourceAvailability: result.sourceAvailability, cases: result.cases, checks: result.checks,
      captureCount: result.captures.length, note: 'UI comparison excludes only dynamic LIGHT status text; world matrix clears party/equipment/cursor torch contributions. Original absence is not a full LT5 pass.' });
    console.log(`Lighting review: ${result.cases.length} cases/${result.checks.length} measured checks; original=${complete ? 'available' : 'unavailable'}; evidence build/lighting-review/report.json.`);
    if (!complete) process.exitCode = 1;
  } catch (error) {
    try { await lightingReport({ passed: false, status: 'failed', error: error.message, browserErrors: errors }); }
    catch (reportError) { console.error(`Lighting failure evidence could not be updated safely: ${reportError.message}`); }
    console.error(`Lighting review failed: ${error.message}`); process.exitCode = 1;
  } finally { await browser?.close(); server?.kill(); }
}
