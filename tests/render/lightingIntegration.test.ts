/** Whole-painter lighting checks: actual procedural/projected paths, not helper mocks. */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createCleanRoomGraphicsBundle, parseGraphicsDat } from '../../src/data';
import type { GraphicsBundle, RgbColor } from '../../src/data/graphicsDatParser';
import type { GameState, Tile } from '../../src/engine/types';
import { Framebuffer, LAYOUT_RECTS, renderFrame } from '../../src/render';
import { paintDungeonViewport } from '../../src/render/viewportPainter';
import { partyOf } from '../engine/testkit';

const floor: Tile = {type:'FLOOR',rawFlags:0,wallFeatures:[],actuators:[],itemNames:[]};
const wall: Tile = {...floor,type:'WALL'};
const vp=LAYOUT_RECTS.VIEWPORT;
function scene(feature:Tile=floor, depth=1, side=false):GameState {
  const state=partyOf('iaido');
  // Clear carried torch contribution; lighting comes only from controlled ambient.
  return {...state,items:{},party:{...state.party,x:3,y:5,facing:0,torchLight:0},levels:state.levels.map((l,i)=>i===0?{...l,ambientLight:5,tiles:Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>x===(side?2:3)&&y===5-depth?feature:floor))}:l)};
}
function atLight(state:GameState,light:number):GameState {
  return {...state,levels:state.levels.map((l,i)=>i===0?{...l,ambientLight:light}:l)};
}
function frame(state:GameState,graphics?:GraphicsBundle):Framebuffer {const fb=new Framebuffer();paintDungeonViewport(fb,state,graphics);return fb;}
function uniformGraphics():GraphicsBundle {
  const colors:RgbColor[]=Array.from({length:16},(_,i)=>i===0?[0,0,0]:[200,100,50]);
  return {...createCleanRoomGraphicsBundle(),lightPalettes:[colors]};
}
const door:Tile={...floor,type:'DOOR',door:{orientation:'WEST_EAST',material:'WOODEN',progress:4,targetProgress:4,hasButton:true,bashable:true,fireballDestructible:false}};
const teleporter:Tile={...floor,type:'TELEPORTER',teleporter:{active:true,visibleHaze:true,destLevel:0,destX:1,destY:1,rotation:0,absoluteRotation:false,scope:'ALL',playSound:false}};
const sconce:Tile={...wall,wallFeatures:[{kind:'SCONCE',face:2,hasTorch:true}]};
const alcove:Tile={...wall,wallFeatures:[{kind:'ALCOVE',face:1}]};

describe('integrated dungeon lighting',()=>{
  for(const [name,tile,side] of [['stone',wall,false],['wood door',door,false],['teleporter pixels',teleporter,false],['sconce flame',sconce,false],['projected side alcove',alcove,true]] as const) {
    it(`lights ${name} exactly once at every depth`,()=>{
      for(const depth of [1,2,3]) {
        const state=scene(tile,depth,side), graphics=uniformGraphics();
        const full=frame(state,graphics),half=frame(atLight(state,2.5),graphics);
        let colored=0;
        for(let y=vp.y;y<vp.y+vp.h;y++) for(let x=vp.x;x<vp.x+vp.w;x++) {
          const original=full.getPixel(x,y),dim=half.getPixel(x,y);
          expect(dim).toEqual(original.map(c=>Math.round(c/2)));
          if(dim[0]>0) colored++;
        }
        expect(colored).toBeGreaterThan(1000);
        if(!side) {
          // Isolate the feature's known destination from near floor/ceiling.
          const xy=name==='wood door'?[depth===1?70:depth===2?82:90,depth===1?25:depth===2?30:35]
            :name==='teleporter pixels'?[depth===1?60:depth===2?74:85,depth===1?20:depth===2?25:29]
              :[112,depth===1?53:depth===2?40:42];
          const scale=[1,1,0.8,0.6][depth]!;
          expect(half.getPixel(xy[0]!,vp.y+xy[1]!)).toEqual([200,100,50].map(c=>Math.round(c*0.5*scale)));
        }
      }
    });
  }

  it('retains source-space index10 wall transparency and opaque black at full and low light',()=>{
    const graphics=uniformGraphics();
    const pixels=new Uint8Array(224*29).fill(1);
    const sidePixels=new Uint8Array(32*136).fill(10);sidePixels[0]=0;sidePixels[1]=2;
    const synthetic={...graphics,sprites:new Map([[76,{index:76,width:224,height:29,pixels}],[85,{index:85,width:32,height:136,pixels:sidePixels}]])};
    for(const light of [5,2.5]) {
      const fb=frame(atLight(scene(wall,0,true),light),synthetic);
      expect(fb.getPixel(0,vp.y)).toEqual([0,0,0]);
      expect(fb.getPixel(1,vp.y)).toEqual([200,100,50].map(c=>Math.round(c*light/5)));
      expect(fb.getPixel(2,vp.y)).toEqual([200,100,50].map(c=>Math.round(c*light/5)));
    }
  });

  const realPath='public/assets/extracted/dm1/graphics.dat';
  const graphicsCases:[string,GraphicsBundle|undefined][]=[['fallback',undefined]];
  if(existsSync(realPath)) graphicsCases.push(['original',parseGraphicsDat(readFileSync(realPath))]);
  for(const [name,graphics] of graphicsCases) it(`keeps ${name} UI, cursor, inventory and automap bright and source/state immutable`,()=>{
    const base=partyOf('iaido');
    const state={...scene(door),items:base.items,handItem:'cr_dagger_1'};
    // Iaido carries no lit torch; explicit no item contribution allows true dark.
    const snapshots=JSON.stringify(state);
    const source=graphics?Array.from(graphics.sprites,([id,s])=>[id,Buffer.from(s.pixels).toString('hex')]):null;
    const modes=[state,{...state,openInventoryChampionIndex:0},{...state,settings:{...state.settings,qolMode:true,automapOpen:true}}];
    for(const mode of modes) {
      const bright=new Framebuffer(),dark=new Framebuffer();
      renderFrame(bright,atLight(mode,5),{graphics,pointer:{x:260,y:80}});
      renderFrame(dark,atLight(mode,0),{graphics,pointer:{x:260,y:80}});
      for(let y=0;y<200;y++)for(let x=0;x<320;x++) {
        if(x>=vp.x&&x<vp.x+vp.w&&y>=vp.y&&y<vp.y+vp.h)continue;
        // The light status text intentionally changes its content/warning color.
        if(x>=230&&x<318&&y>=59&&y<66)continue;
        expect(dark.getPixel(x,y)).toEqual(bright.getPixel(x,y));
      }
      if(mode.settings.automapOpen) expect(dark.getPixel(20,vp.y+20)).toEqual(bright.getPixel(20,vp.y+20));
    }
    const black=frame(atLight(scene(sconce),0),graphics);
    for(let y=vp.y;y<vp.y+vp.h;y++)for(let x=0;x<vp.w;x++)expect(black.getPixel(x,y)).toEqual([0,0,0]);
    expect(JSON.stringify(state)).toBe(snapshots);
    if(graphics)expect(Array.from(graphics.sprites,([id,s])=>[id,Buffer.from(s.pixels).toString('hex')])).toEqual(source);
  });
});
