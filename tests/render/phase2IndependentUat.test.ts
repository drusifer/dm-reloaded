/** Independent Phase 2 boundary and occlusion checks grounded in world coordinates. */
import { describe, expect, it } from 'vitest';
import { createCleanRoomBundle } from '../../src/data';
import { createInitialGameState } from '../../src/engine';
import type { Direction, GameState, Tile } from '../../src/engine/types';
import { Framebuffer, renderFrame } from '../../src/render';
import { paintDungeonViewport } from '../../src/render/viewportPainter';
import { partyOf } from '../engine/testkit';
const floor: Tile = { type: 'FLOOR', rawFlags: 0, wallFeatures: [], actuators: [], itemNames: [] };
function corridor(): GameState {
  const state = createInitialGameState(createCleanRoomBundle());
  return { ...state, party: { ...state.party, x: 3, y: 3, facing: 0 },
    levels: state.levels.map((level, i) => i === 0 ? { ...level,
      tiles: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => floor)) } : level) };
}
function setTile(state: GameState, x: number, y: number, tile: Tile): GameState {
  return { ...state, levels: state.levels.map((level, i) => i === 0 ? { ...level,
    tiles: level.tiles.map((row, ry) => ry === y ? row.map((value, rx) => rx === x ? tile : value) : row) } : level) };
}
function frame(state: GameState): Framebuffer { const fb = new Framebuffer(); paintDungeonViewport(fb, state); return fb; }
function changed(a: Framebuffer, b: Framebuffer): [number,number][] {
  const result: [number,number][] = [];
  for(let y=33;y<169;y++) for(let x=0;x<224;x++) if(a.getPixel(x,y).some((v,i)=>v!==b.getPixel(x,y)[i])) result.push([x,y]);
  return result;
}
describe('independent Phase 2 UAT', () => {
  it.each([0,1,2,3] as Direction[])('projects front-left and front-right quadrants when facing %s', facing => {
    const base = corridor(); const state={...base,party:{...base.party,facing}};
    const empty=frame(state);
    for(const [quadrant,left] of [[facing,true],[(facing+1)%4,false]] as const) {
      const loaded=setTile(state,3,3,{...floor,floorItems:{0:[],1:[],2:[],3:[],[quadrant]:['cr_dagger_1']}});
      const pixels=changed(empty,frame(loaded)); expect(pixels.length).toBeGreaterThan(0);
      expect(pixels.every(([x])=>left ? x<112 : x>112)).toBe(true);
    }
    for(const quadrant of [(facing+2)%4,(facing+3)%4]) {
      expect(frame(setTile(state,3,3,{...floor,floorItems:{0:[],1:[],2:[],3:[],[quadrant]:['cr_dagger_1']}})).rgba).toEqual(empty.rgba);
    }
  });
  it('keeps the sleep overlay visible while inventory is open',()=>{
    const base=partyOf('zed'); const sample={...base,openInventoryChampionIndex:0,party:{...base.party,sleeping:true}};
    const fb=new Framebuffer(); renderFrame(fb,sample);
    expect(fb.getPixel(100,80).every(v=>v<=12)).toBe(true);
  });
  it('mirrors a left-lane projectile approaching the viewer',()=>{
    const base=corridor();
    const flying={...base,projectiles:[{id:'approaching',itemId:'cr_dagger_1',level:0,x:3,y:2,direction:2 as const,lane:'LEFT' as const,kineticEnergy:10,stepEnergyCost:1}]};
    const pixels=changed(frame(base),frame(flying)); expect(pixels.length).toBeGreaterThan(0);
    expect(pixels.every(([x])=>x>112)).toBe(true);
  });
  it('hides objects in the far half of a shut solid door tile',()=>{
    const door: Tile={...floor,type:'DOOR',door:{orientation:'WEST_EAST',material:'WOODEN',progress:4,targetProgress:4,hasButton:false,bashable:true,fireballDestructible:true}};
    const base=setTile(corridor(),3,2,door);
    expect(frame(setTile(base,3,2,{...door,floorItems:{0:['cr_dagger_1'],1:[],2:[],3:[]}})).rgba).toEqual(frame(base).rgba);
  });
});
