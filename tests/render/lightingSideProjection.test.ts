/** Prove actual side-projector participation with distinct feature and item color markers. */
import { describe, expect, it } from 'vitest';
import { createCleanRoomBundle, createCleanRoomGraphicsBundle } from '../../src/data';
import type { GraphicsBundle, RgbColor } from '../../src/data/graphicsDatParser';
import { createInitialGameState } from '../../src/engine';
import type { GameState, Tile } from '../../src/engine/types';
import { Framebuffer } from '../../src/render';
import { paintDungeonViewport } from '../../src/render/viewportPainter';
const floor:Tile={type:'FLOOR',rawFlags:0,wallFeatures:[],actuators:[],itemNames:[]};
function scene(side:'LEFT'|'RIGHT',feature:boolean,loaded:boolean):GameState {
  const base=createInitialGameState(createCleanRoomBundle()),face=side==='LEFT'?1:3,x=side==='LEFT'?2:4;
  const wall:Tile={...floor,type:'WALL',wallFeatures:feature?[{kind:'ALCOVE',face}]:[],
    wallItems:{0:[],1:[],2:[],3:[],[face]:loaded?['cr_dagger_1']:[]}};
  return {...base,party:{...base.party,x:3,y:5,facing:0,torchLight:0},
    levels:base.levels.map((level,index)=>index===0?{...level,ambientLight:2,
      tiles:Array.from({length:8},(_,y)=>Array.from({length:8},(_,xx)=>xx===x&&y===3?wall:floor))}:level)};
}
function graphics():GraphicsBundle {
  const colors:RgbColor[]=Array.from({length:16},()=>[0,0,0] as const);
  colors[13]=[200,100,50];colors[14]=[90,180,240];
  // Every raw icon sheet is a distinct nontransparent item marker; no wall art uses index14.
  const sprites=new Map(Array.from({length:7},(_,i)=>[42+i,{index:42+i,width:256,height:32,pixels:new Uint8Array(256*32).fill(14)}] as const));
  return {...createCleanRoomGraphicsBundle(),lightPalettes:[colors],sprites};
}
function frame(state:GameState,source:GraphicsBundle):Framebuffer {const fb=new Framebuffer();paintDungeonViewport(fb,state,source);return fb;}
function verifyAddedMarker(before:Framebuffer,after:Framebuffer,side:'LEFT'|'RIGHT',expected:RgbColor):void {
  let added=0;
  for(let y=33;y<169;y++)for(let x=0;x<224;x++) {
    const value=after.getPixel(x,y);
    if(value.join()===before.getPixel(x,y).join())continue;
    expect(side==='LEFT'?x<112:x>112).toBe(true);
    if(value.some(channel=>channel!==0)) {expect(value).toEqual(expected);added++;}
  }
  expect(added).toBeGreaterThan(0);
}
describe('independent side-projector lighting acceptance',()=>{
  for(const side of ['LEFT','RIGHT'] as const) it(`adds correctly lit ${side} depth2 alcove and item markers`,()=>{
    const source=graphics(),plain=frame(scene(side,false,false),source),empty=frame(scene(side,true,false),source),loaded=frame(scene(side,true,true),source);
    // Light2/5 × depth2=0.8 is0.32. Literal expected colors detect missing or double transforms.
    verifyAddedMarker(plain,empty,side,[64,32,16]);
    verifyAddedMarker(empty,loaded,side,[29,58,77]);
  });
});
