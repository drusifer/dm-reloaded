/** AC2.2.2: facing and lateral alcove items must both remain visible. */
import { describe, expect, it } from 'vitest';
import { createCleanRoomBundle } from '../../src/data';
import { createInitialGameState } from '../../src/engine';
import { DIRECTION_DELTAS, type Direction, type GameState, type Tile } from '../../src/engine/types';
import { Framebuffer } from '../../src/render';
import { paintDungeonViewport } from '../../src/render/viewportPainter';
const floor: Tile={type:'FLOOR',rawFlags:0,wallFeatures:[],actuators:[],itemNames:[]};
function scene(facing: Direction,side:'LEFT'|'RIGHT',items:boolean,visibleFace=true,depth=1): GameState {
  const state=createInitialGameState(createCleanRoomBundle());
  const fwd=DIRECTION_DELTAS[facing], lateral=DIRECTION_DELTAS[((facing+(side==='LEFT'?3:1))&3) as Direction];
  const x=3+fwd.dx*depth+lateral.dx,y=3+fwd.dy*depth+lateral.dy;
  const face=((facing+(side==='LEFT'?1:3)+(visibleFace?0:2))&3) as Direction;
  const wall: Tile={...floor,type:'WALL',wallFeatures:[{kind:'ALCOVE',face}],wallItems:{0:[],1:[],2:[],3:[],[face]:items?['cr_dagger_1']:[]}};
  return {...state,party:{...state.party,x:3,y:3,facing},levels:state.levels.map((level,i)=>i===0?{...level,tiles:Array.from({length:8},(_,ry)=>Array.from({length:8},(_,rx)=>rx===x&&ry===y?wall:floor))}:level)};
}
function frame(state:GameState): Framebuffer {const fb=new Framebuffer();paintDungeonViewport(fb,state);return fb;}
describe('side alcove acceptance',()=>{
  for(const depth of [0,1,2,3]) for(const facing of [0,1,2,3] as const) for(const side of ['LEFT','RIGHT'] as const) {
    it(`shows ${side} inward-facing alcove contents while facing ${facing} at depth${depth}`,()=>{
      const empty=frame(scene(facing,side,false,true,depth)),loaded=frame(scene(facing,side,true,true,depth));
      let changed=0;
      for(let y=33;y<169;y++)for(let x=0;x<224;x++)if(empty.getPixel(x,y).join()!==loaded.getPixel(x,y).join()) {
        changed++; expect(side==='LEFT'?x<112:x>112).toBe(true);
      }
      expect(changed).toBeGreaterThan(0);
    });
  }
  for(const side of ['LEFT','RIGHT'] as const) it(`hides ${side} back-facing alcove contents`,()=>{
    expect(frame(scene(0,side,true,false)).rgba).toEqual(frame(scene(0,side,false,false)).rgba);
  });
  for(const side of ['LEFT','RIGHT'] as const) it(`occludes farther ${side} alcove items behind a nearer center wall`,()=>{
    const block=(state:GameState):GameState=>({...state,levels:state.levels.map((level,i)=>i===0?{...level,tiles:level.tiles.map((row,y)=>y===2?row.map((tile,x)=>x===3?{...floor,type:'WALL' as const}:tile):row)}:level)});
    expect(frame(block(scene(0,side,true,true,2))).rgba).toEqual(frame(block(scene(0,side,false,true,2))).rgba);
  });

});
