/** Independent input-state acceptance checks for the playable inventory slice. */
import { describe, expect, it } from 'vitest';
import { dispatchCommand } from '../../src/engine';
import type { GameState } from '../../src/engine/types';
import { resolveKeyboardCommand, resolvePointerHitCommand } from '../../src/input';
import { championHandRect } from '../../src/render/layout';
import { partyOf, patchChampion } from '../engine/testkit';

describe('independent Phase3 input UAT',()=>{
  it('keeps a held item while switching living inventories and rejects a dead champion header',()=>{
    let state: GameState={...partyOf('iaido','zed'),handItem:'cr_dagger_1',openInventoryChampionIndex:0};
    state=dispatchCommand(state,resolvePointerHitCommand(72,4,state)!).state;
    expect(state.openInventoryChampionIndex).toBe(1); expect(state.handItem).toBe('cr_dagger_1');
    const dead=patchChampion(state,0,{alive:false,health:0});
    const rejected=dispatchCommand(dead,resolvePointerHitCommand(4,4,dead)!).state;
    expect(rejected.openInventoryChampionIndex).toBe(1); expect(rejected.handItem).toBe('cr_dagger_1');
    const closed=dispatchCommand(rejected,resolvePointerHitCommand(110,80,rejected,2)!).state;
    expect(closed.openInventoryChampionIndex).toBeNull(); expect(closed.handItem).toBe('cr_dagger_1');
  });
  it('maps both visible hand targets for all four champions without changing selected inventory',()=>{
    const state={...partyOf('iaido','zed','chani','elija'),openInventoryChampionIndex:2};
    for(let i=0;i<4;i++) for(const slot of ['leftHand','rightHand'] as const) {
      const rect=championHandRect(i,slot);
      expect(resolvePointerHitCommand(rect.x+rect.w-1,rect.y+rect.h-1,state)).toEqual({type:'CLICK_EQUIP_SLOT',championIndex:i,slot});
    }
  });
  it('captures a held-item throw click while a mirror is active',()=>{
    const state=partyOf('iaido');
    const modal={...state,handItem:'cr_dagger_1',activeMirror:{wallX:2,wallY:1,face:2 as const,champion:state.championsCatalog.zed!}};
    expect(resolvePointerHitCommand(30,70,modal)).toBeNull();
    expect(resolveKeyboardCommand('z',{...modal,settings:{...modal.settings,qolMode:true}})).toBeNull();
    expect(resolveKeyboardCommand('Escape',modal)).toEqual({type:'CANCEL_MIRROR'});
  });
  it('captures left and right viewport clicks with the open automap before world interactions',()=>{
    const state=partyOf('iaido'); const map={...state,handItem:'cr_dagger_1',settings:{...state.settings,qolMode:true,automapOpen:true}};
    expect(resolvePointerHitCommand(30,70,map)).toEqual({type:'TOGGLE_AUTOMAP'});
    expect(resolvePointerHitCommand(30,70,map,2)).toEqual({type:'TOGGLE_AUTOMAP'});
  });
  it('gates every inventory and sleep shortcut in Purist mode, with Escape still closing',()=>{
    const state=partyOf('iaido');
    for(const key of ['1','2','3','4','z','Z']) expect(resolveKeyboardCommand(key,state)).toBeNull();
    expect(resolveKeyboardCommand('Escape',{...state,openInventoryChampionIndex:0})).toEqual({type:'TOGGLE_INVENTORY',championIndex:null});
  });
});
