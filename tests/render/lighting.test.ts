import { describe, expect, it } from 'vitest';
import { createLightingContext, validateLightingProfile, lightRgb, lightPalette, lightRgba, DEFAULT_LIGHTING_PROFILE } from '../../src/render/lighting';
import { getUiPalette, getViewportLightPalette } from '../../src/render/palette';
import type { GraphicsBundle } from '../../src/data/graphicsDatParser';

const config = { brightnessExponent: 1, tint: [1, 1, 1], tintStrength: 0, depthMultipliers: [1, 1, 0.8, 0.6], desaturation: 0 };

describe('parametric lighting', () => {
  it('matches independent golden RGB values and full-light identity', () => {
    expect(lightRgb([100, 150, 200], createLightingContext(2.5, 2))).toEqual([40, 60, 80]);
    expect(lightRgb([100, 150, 200], createLightingContext(5, 0))).toEqual([100, 150, 200]);
    const gray = validateLightingProfile({ ...config, desaturation: 1 });
    expect(lightRgb([100, 150, 200], createLightingContext(5, 0, gray))).toEqual([143, 143, 143]);
    const tinted = validateLightingProfile({ ...config, tint: [1, 0.5, 0], tintStrength: 0.5, brightnessExponent: 2 });
    expect(lightRgb([100, 160, 240], createLightingContext(2.5, 0, tinted))).toEqual([25, 30, 30]);
  });

  it('covers all light/depth combinations with monotonic channels and exact darkness', () => {
    for (let light = 0; light <= 5; light++) {
      for (let depth = 0; depth <= 3; depth++) {
        const value = lightRgb([100, 150, 200], createLightingContext(light, depth));
        const multiplier = [1, 1, 0.8, 0.6][depth]!;
        expect(value).toEqual([100, 150, 200].map(c => Math.round(c * light / 5 * multiplier)));
        if (light > 0) expect(value.every((c, i) => c >= lightRgb([100, 150, 200], createLightingContext(light - 1, depth))[i]!)).toBe(true);
      }
    }
    expect(lightRgb([255, 255, 255], createLightingContext(-3, 0))).toEqual([0, 0, 0]);
    expect(lightRgb([100, 150, 200], createLightingContext(100, 0))).toEqual([100, 150, 200]);
  });

  it('shares palette/RGBA color results, preserves every alpha and never mutates inputs', () => {
    const palette = [[100, 150, 200], [0, 0, 0], [255, 80, 20]] as const;
    const rgba = new Uint8ClampedArray([100,150,200,0, 0,0,0,128, 255,80,20,255]);
    const before = rgba.slice();
    const context = createLightingContext(2.5, 2);
    const colors = lightPalette(palette, context);
    const output = lightRgba(rgba, context);
    expect(Array.from(output)).toEqual([40,60,80,0, 0,0,0,128, 102,32,8,255]);
    expect(colors).toEqual([[40,60,80], [0,0,0], [102,32,8]]);
    expect(rgba).toEqual(before);
    expect(palette[0]).toEqual([100,150,200]);
    expect(lightRgba(rgba, context)).toEqual(output);
  });

  it('rejects malformed profiles, holes, nonfinite parameters and invalid data', () => {
    for (const change of [{brightnessExponent:0}, {brightnessExponent:Infinity}, {tintStrength:NaN}, {tintStrength:2}, {desaturation:-1}, {tint:[1,2,1]}, {tint:Array(3)}, {depthMultipliers:[1,0.5,0.8,0.2]}, {depthMultipliers:Array(4)}]) {
      expect(() => validateLightingProfile({...config,...change})).toThrow(/lighting/i);
    }
    expect(() => validateLightingProfile(null)).toThrow(/lighting/i);
    expect(() => createLightingContext(NaN, 0)).toThrow(/light/i);
    expect(() => createLightingContext(2, 4)).toThrow(/depth/i);
    const context = createLightingContext(5,0);
    for (const rgb of [[-1,0,0], [1.5,0,0], [Infinity,0,0], Array(3)]) expect(() => lightRgb(rgb as [number,number,number], context)).toThrow(/RGB/i);
    expect(() => lightPalette(Array(2), context)).toThrow(/RGB/i);
    expect(() => lightRgba(new Uint8ClampedArray(3), context)).toThrow(/RGBA/i);
  });

  it('copies and freezes validated profile settings', () => {
    const settings = {...config, tint:[1,1,1], depthMultipliers:[1,1,0.8,0.6]};
    const profile = validateLightingProfile(settings);
    settings.tint[0] = 0;
    settings.depthMultipliers[0] = 0;
    expect(lightRgb([100,150,200], createLightingContext(5,0,profile))).toEqual([100,150,200]);
    expect(Object.isFrozen(DEFAULT_LIGHTING_PROFILE)).toBe(true);
    expect(Object.isFrozen(profile.tint)).toBe(true);
  });

  it('ignores all dark source ramps and retains the unchanged brightest UI palette', () => {
    const brightest = Array.from({length:16}, () => [100,150,200] as const);
    const a = {lightPalettes:[Array(16).fill([255,0,0]), brightest]} as unknown as GraphicsBundle;
    const b = {lightPalettes:[Array(16).fill([0,255,0]), brightest]} as unknown as GraphicsBundle;
    expect(getUiPalette(a)).toBe(brightest);
    expect(getViewportLightPalette(2.5,2,a)).toEqual(Array(16).fill([40,60,80]));
    expect(getViewportLightPalette(2.5,2,b)).toEqual(getViewportLightPalette(2.5,2,a));
    expect(getViewportLightPalette(5,0)).toEqual(getUiPalette());
    expect(getViewportLightPalette(0,3)).toEqual(Array(16).fill([0,0,0]));
  });
});
