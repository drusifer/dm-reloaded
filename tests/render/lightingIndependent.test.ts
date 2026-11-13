/** Independent lighting contract vectors and source-mask boundaries, not historical ramp matching. */
import { describe, expect, it } from 'vitest';
import { createCleanRoomGraphicsBundle } from '../../src/data/graphicsDatParser';
import type { RgbColor } from '../../src/data/graphicsDatParser';
import { Framebuffer } from '../../src/render/framebuffer';
import { getViewportLightPalette } from '../../src/render/palette';
import { createLightingContext, lightPalette, lightRgb, validateLightingProfile } from '../../src/render/lighting';
const neutral={brightnessExponent:1,tint:[1,1,1],tintStrength:0,depthMultipliers:[1,1,0.8,0.6],desaturation:0};
describe('independent parametric lighting acceptance',()=>{
  it('matches the literal neutral RGB table at all24 integer light/depth combinations',()=>{
    const expected=[
      [[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
      [[20,30,40],[20,30,40],[16,24,32],[12,18,24]],
      [[40,60,80],[40,60,80],[32,48,64],[24,36,48]],
      [[60,90,120],[60,90,120],[48,72,96],[36,54,72]],
      [[80,120,160],[80,120,160],[64,96,128],[48,72,96]],
      [[100,150,200],[100,150,200],[80,120,160],[60,90,120]]
    ];
    for(let light=0;light<6;light++)for(let depth=0;depth<4;depth++)expect(lightRgb([100,150,200],createLightingContext(light,depth))).toEqual(expected[light]![depth]);
    expect(lightRgb([100,150,200],createLightingContext(-100,0))).toEqual([0,0,0]);
    expect(lightRgb([100,150,200],createLightingContext(100,0))).toEqual([100,150,200]);
  });
  it('combines desaturation,tint,exponent anddepth with one rounding and preserves hidden RGB',()=>{
    const profile=validateLightingProfile({...neutral,brightnessExponent:2,tint:[0.2,0.6,1],tintStrength:0.5,desaturation:0.25});
    const context=createLightingContext(2.5,2,profile);
    expect(lightRgb([120,80,40],context)).toEqual([13,13,10]);
    expect(lightPalette([[120,80,40]],context)).toEqual([[13,13,10]]);
  });
  it('resolves raw0/10 masks before transformed colors collide and preserves clip/flip/scale behavior',()=>{
    const base:RgbColor[]=Array.from({length:16},()=>[255,200,100] as const);base[1]=[0,0,0];
    const palette=lightPalette(base,createLightingContext(0,0));
    const sprite={index:0,width:4,height:1,pixels:Uint8Array.from([0,1,10,2])},background=[211,17,89] as const;
    for(const mask of [0,10]) {
      const fb=new Framebuffer();fb.fillRect(0,0,8,2,background);
      fb.blitSprite(sprite,0,0,palette,{transparentIndex:mask});
      for(let x=0;x<4;x++)expect(fb.getPixel(x,0)).toEqual(sprite.pixels[x]===mask?background:[0,0,0]);
    }
    const fb=new Framebuffer();fb.fillRect(0,0,8,2,background);
    fb.blitSprite(sprite,0,0,palette,{transparentIndex:10,flipX:true,dstWidth:8,dstHeight:2},{x:2,y:0,w:4,h:2});
    for(let y=0;y<2;y++)for(let x=0;x<8;x++)expect(fb.getPixel(x,y)).toEqual(x===4||x===5?[0,0,0]:background);
  });
  it('rejects sparse arrays and nonfinite light/depth inputs at the documented boundaries',()=>{
    const tint=[1,1,1];delete tint[1];const depths=[1,1,0.8,0.6];delete depths[2];
    expect(()=>validateLightingProfile({...neutral,tint})).toThrow(/lighting/i);
    expect(()=>validateLightingProfile({...neutral,depthMultipliers:depths})).toThrow(/lighting/i);
    const rgb=Array<number>(3);rgb[0]=1;rgb[2]=1;
    expect(()=>lightRgb(rgb as unknown as RgbColor,createLightingContext(5,0))).toThrow(/RGB/i);
    const palette=Array<RgbColor>(16);palette[0]=[0,0,0];
    expect(()=>lightPalette(palette,createLightingContext(5,0))).toThrow(/RGB/i);
    for(const light of [NaN,Infinity,-Infinity])expect(()=>createLightingContext(light,0)).toThrow(/finite/i);
    for(const depth of [-1,4,0.5,NaN,Infinity])expect(()=>createLightingContext(3,depth)).toThrow(/depth/i);
  });
  it('copies input profile settings instead of retaining live aliases',()=>{
    const settings={...neutral,tint:[1,1,1],depthMultipliers:[1,1,0.8,0.6]},profile=validateLightingProfile(settings);
    settings.brightnessExponent=5;settings.desaturation=1;settings.tint[0]=0;settings.depthMultipliers[2]=0;
    expect(lightRgb([100,150,200],createLightingContext(2.5,2,profile))).toEqual([40,60,80]);
    expect(Object.isFrozen(profile)).toBe(true);expect(Object.isFrozen(profile.depthMultipliers)).toBe(true);
  });
  it('requires sixteen dense source colors at the viewport adapter boundary',()=>{
    const base=createCleanRoomGraphicsBundle();
    for(const length of [0,15,17]) {
      const palette=Array.from({length},()=>[100,150,200] as const);
      expect(()=>getViewportLightPalette(3,1,{...base,lightPalettes:[palette]})).toThrow(/palette|sixteen|16/i);
    }
  });
});
