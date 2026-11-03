import { describe, expect, it } from 'vitest';
import { PaulaStereoAudio, SYNTH_SOUND_ITEM } from '../../src/audio';
import { dispatchCommand } from '../../src/engine';
import type { GameState } from '../../src/engine/types';
import { resolvePointerHitCommand, resolveKeyboardCommand } from '../../src/input';
import { BACKPACK_SLOT_RECTS } from '../../src/render/layout';
import { Framebuffer, renderFrame } from '../../src/render';
import { createDefaultSoundboardPreset, parseSoundboardPreset } from '../../src/ui';
import { ALL_SOUND_CUES } from '../../src/ui/soundboard';
import { partyOf, placeAt, patchChampion } from '../engine/testkit';

function click(state:GameState,x:number,y:number): GameState {
  const command=resolvePointerHitCommand(x,y,state);
  expect(command,`interactive pixel ${x},${y}`).not.toBeNull();
  return dispatchCommand(state,command!).state;
}

describe('Sprint2 playable inventory/survival slice',()=>{
  it('picks up a floor chest, inspects it, stores the chest, consumes its apple and retains held state on close',()=>{
    let state=placeAt(patchChampion(partyOf('iaido'),0,{food:100}),0,2,2,1);
    state=click(state,40,150);
    expect(state.handItem).toBe('cr_chest_1');
    state=click(state,8,4);
    state=click(state,18,49);
    expect(state.openContainerId).toBe('cr_chest_1');
    const rect=BACKPACK_SLOT_RECTS[16]!;
    state=click(state,rect.x+1,rect.y+1);
    expect(state.handItem).toBeNull();
    expect(state.openContainerId).toBe('cr_chest_1');
    state=click(state,119,94);
    expect(state.handItem).toBe('cr_apple_1');
    state=click(state,59,49);
    expect(state.party.champions[0]!.food).toBeGreaterThan(100);
    expect(state.items.cr_apple_1).toBeUndefined();
    state=click(state,119,94);
    expect(state.handItem).toBe('cr_flask_empty');
    state=dispatchCommand(state,resolveKeyboardCommand('Escape',state)!).state;
    expect(state.openInventoryChampionIndex).toBeNull();
    expect(state.handItem).toBe('cr_flask_empty');
  });
  it('reaches the scroll subpanel via Eye, then wakes without executing the triggering input',()=>{
    let state=placeAt(partyOf('iaido'),1,5,4,3);
    state=click(state,112,90);
    expect(state.handItem).toBe('cr_scroll_1');
    state=click(state,8,4);
    state=click(state,18,49);
    expect(state.openContainerId).toBe('cr_scroll_1');
    state=click(state,280,22);
    expect(state.party.sleeping).toBe(true);
    const wake=resolveKeyboardCommand('ArrowUp',state)!;
    expect(wake).toEqual({type:'SET_SLEEPING',sleeping:false});
    state=dispatchCommand(state,wake).state;
    expect(state.party.x).toBe(5);
    expect(state.party.y).toBe(4);
    expect(state.handItem).toBe('cr_scroll_1');
  });
  it('renders held icon at logical pointer, and numeric vital rows respond to current values',()=>{
    const state={...partyOf('iaido'),handItem:'cr_dagger_1',openInventoryChampionIndex:0};
    const first=new Framebuffer(),second=new Framebuffer();
    renderFrame(first,state,{pointer:{x:20,y:175}});
    renderFrame(second,state,{pointer:{x:80,y:175}});
    expect(first.getPixel(14,169)).not.toEqual(second.getPixel(14,169));
    const changed=patchChampion(state,0,{health:1,stamina:2,mana:3});
    const third=new Framebuffer(); renderFrame(third,changed);
    let differences=0;
    for(let y=75;y<110;y++) for(let x=230;x<319;x++) if(first.getPixel(x,y).join()!==third.getPixel(x,y).join()) differences++;
    expect(differences).toBeGreaterThan(10);
  });
  it('routes five new cues to synth by default, exposes them in Soundboard and preserves chosen silence',()=>{
    const audio=new PaulaStereoAudio();
    const cues=['ITEM_PICKUP','THROW_SWOOSH','GULP','LOCK_CLICK','CHAMPION_DEATH'] as const;
    for(const cue of cues){
      expect(ALL_SOUND_CUES).toContain(cue);
      expect(audio.getCueMapping()[cue]).toBe(SYNTH_SOUND_ITEM);
      audio.playCue(cue,0,1,2,{level:0,x:1,y:2,facing:0});
    }
    expect(audio.getHistory()).toHaveLength(5);
    expect(audio.getHistory().every(entry=>!entry.usedAmigaPcm)).toBe(true);
    audio.setCueItem('GULP',null);
    audio.playCue('GULP',0,1,2,{level:0,x:1,y:2,facing:0});
    expect(audio.getHistory()).toHaveLength(5);
    const saved=createDefaultSoundboardPreset(); saved.cueMap.GULP=null;
    expect(parseSoundboardPreset(JSON.stringify(saved))!.cueMap.GULP).toBeNull();
    expect(parseSoundboardPreset(JSON.stringify({version:1,cueMap:{FOOTSTEP:null}}))!.cueMap.GULP).toBe(SYNTH_SOUND_ITEM);
  });
});
