/** Pure shared RGB lighting. Indexed palettes and truecolor data use the same formula. */
import settings from './lighting.json';
import type { RgbColor } from '../data/graphicsDatParser';

const validatedProfile = Symbol('validated lighting profile');
export interface LightingProfile {
  readonly [validatedProfile]: true;
  readonly brightnessExponent: number;
  readonly tint: readonly number[];
  readonly tintStrength: number;
  readonly depthMultipliers: readonly number[];
  readonly desaturation: number;
}

export interface LightingContext {
  readonly brightness: number;
  readonly tint: readonly number[];
  readonly desaturation: number;
}

function unit(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

/** Validate and defensively copy configuration once, before rendering any colors. */
export function validateLightingProfile(input: unknown): LightingProfile {
  if (!input || typeof input !== 'object') throw new Error('Lighting profile must be an object');
  const p = input as Record<string, unknown>;
  const tint = p.tint;
  const depths = p.depthMultipliers;
  if (typeof p.brightnessExponent !== 'number' || !Number.isFinite(p.brightnessExponent) || p.brightnessExponent <= 0
    || !unit(p.tintStrength) || !unit(p.desaturation)
    || !Array.isArray(tint) || tint.length !== 3 || !Array.from(tint).every(unit)
    || !Array.isArray(depths) || depths.length !== 4 || !Array.from(depths).every(unit)
    || depths.some((v, i) => i > 0 && v > depths[i - 1])) {
    throw new Error('Lighting profile requires positive exponent, normalized tint/strength/desaturation and four nonincreasing depth multipliers');
  }
  return Object.freeze({ [validatedProfile]: true as const, brightnessExponent: p.brightnessExponent,
    tint: Object.freeze([...tint]), tintStrength: p.tintStrength,
    depthMultipliers: Object.freeze([...depths]), desaturation: p.desaturation });
}

export const DEFAULT_LIGHTING_PROFILE = validateLightingProfile(settings);

/** Prepare a reusable depth context; no profile validation occurs per pixel. */
export function createLightingContext(effectiveLight: number, depth: number, profile: LightingProfile = DEFAULT_LIGHTING_PROFILE): LightingContext {
  if (!Number.isFinite(effectiveLight)) throw new Error('Lighting effective light must be finite');
  if (!Number.isInteger(depth) || depth < 0 || depth > 3) throw new Error('Lighting depth must be an integer from 0 to 3');
  const normalized = Math.max(0, Math.min(5, effectiveLight)) / 5;
  return Object.freeze({ brightness: normalized ** profile.brightnessExponent * profile.depthMultipliers[depth]!,
    tint: Object.freeze(profile.tint.map(c => 1 + (c - 1) * profile.tintStrength)), desaturation: profile.desaturation });
}

function validateRgb(rgb: readonly number[]): void {
  if (!Array.isArray(rgb) || rgb.length !== 3 || !Array.from(rgb).every(c => Number.isInteger(c) && c >= 0 && c <= 255)) {
    throw new Error('Lighting RGB must contain three integer bytes');
  }
}

function transform(r: number, g: number, b: number, context: LightingContext): RgbColor {
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const channel = (c: number, tint: number) => Math.max(0, Math.min(255,
    Math.round((c + (luma - c) * context.desaturation) * tint * context.brightness)));
  return [channel(r, context.tint[0]!), channel(g, context.tint[1]!), channel(b, context.tint[2]!)];
}

/** Transform a base RGB color without mutating it; black is an ordinary opaque color. */
export function lightRgb(rgb: RgbColor, context: LightingContext): RgbColor {
  validateRgb(rgb);
  return transform(rgb[0], rgb[1], rgb[2], context);
}

/** Derive colors only. Source indices and transparency remain the blitter's responsibility. */
export function lightPalette(palette: readonly RgbColor[], context: LightingContext): readonly RgbColor[] {
  return Array.from(palette, rgb => lightRgb(rgb, context));
}

/** Transform RGB through the identical formula and preserve alpha, including hidden RGB. */
export function lightRgba(rgba: Uint8Array | Uint8ClampedArray, context: LightingContext): Uint8ClampedArray {
  if (rgba.length % 4 !== 0) throw new Error('Lighting RGBA data length must be divisible by four');
  const output = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const rgb = transform(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!, context);
    output[i] = rgb[0]; output[i + 1] = rgb[1]; output[i + 2] = rgb[2]; output[i + 3] = rgba[i + 3]!;
  }
  return output;
}
