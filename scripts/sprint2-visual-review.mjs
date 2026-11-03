/** Live browser renderer evidence for the Sprint 2 Smith gate. Run with bobp make visual-review. */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { delimiter, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
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
