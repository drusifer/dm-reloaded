/** Pure filtering and source-space usage previews; no inferred runtime masks. */
import type { SpriteCatalogEntry, SpriteCategory, SpriteCrop, SpriteUsageMask } from '../data/spriteCatalog';
import type { DecodedSprite, RgbColor } from '../data/graphicsDatParser';
export interface CatalogFilter {readonly query?:string;readonly category?:SpriteCategory|'all';readonly status?:'all'|'verified'|'unclassified'}
export function filterSpriteCatalog(entries:readonly SpriteCatalogEntry[],filter:CatalogFilter):readonly SpriteCatalogEntry[] {
  const query=(filter.query??'').trim().toLowerCase();
  const numeric=/^\d+$/.test(query);
  return entries.filter(e=>(!filter.category||filter.category==='all'||e.category===filter.category)
    &&(!filter.status||filter.status==='all'||e.status===filter.status)
    &&(!query||(numeric?e.sourceIndex===Number(query):[e.label??'',...e.semanticKeys,...e.usages.map(u=>u.usageKey)].some(s=>s.toLowerCase().includes(query)))));
}
export function renderSpritePreview(sprite:DecodedSprite,palette:readonly RgbColor[],mask:SpriteUsageMask,crop:SpriteCrop={x:0,y:0,width:sprite.width,height:sprite.height}):{width:number;height:number;rgba:Uint8ClampedArray} {
  if(![crop.x,crop.y,crop.width,crop.height].every(Number.isInteger)||crop.x<0||crop.y<0||crop.width<=0||crop.height<=0||crop.x+crop.width>sprite.width||crop.y+crop.height>sprite.height)throw new Error('Preview crop must lie inside its raw source sprite');
  const rgba=new Uint8ClampedArray(crop.width*crop.height*4);
  for(let y=0;y<crop.height;y++)for(let x=0;x<crop.width;x++) {
    const index=sprite.pixels[(y+crop.y)*sprite.width+x+crop.x]!;
    if(mask.kind!=='opaque'&&index===mask.index)continue;
    const rgb=mask.kind==='mask-index'?[255,255,255]:palette[index];
    if(!rgb)throw new Error('Preview source palette is missing a color');
    const offset=(y*crop.width+x)*4;
    rgba[offset]=rgb[0]!;rgba[offset+1]=rgb[1]!;rgba[offset+2]=rgb[2]!;rgba[offset+3]=255;
  }
  return {width:crop.width,height:crop.height,rgba};
}
