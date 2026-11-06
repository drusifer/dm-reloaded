/** Verified DM1 facts joined to actual raw sprites; derived IDs never establish provenance. */
import type { GraphicsBundle } from './graphicsDatParser';

export type SpriteCategory = 'ui' | 'items' | 'dungeon' | 'unclassified';
export interface SpriteCrop { readonly x:number; readonly y:number; readonly width:number; readonly height:number }
export type SpriteUsageMask = {readonly kind:'opaque'} | {readonly kind:'transparent-index'|'mask-index'; readonly index:0|10};
export interface SpriteUsage {
  readonly usageKey:string;
  readonly role:string;
  readonly rawSourceIndex:number;
  readonly mask:SpriteUsageMask;
  readonly crop?:SpriteCrop;
  readonly auxiliaryMask?:{readonly rawSourceIndex:301;readonly condition:'bashed';readonly mask:{readonly kind:'mask-index';readonly index:0}};
  readonly evidence:readonly string[];
}
export interface SpriteCatalogEntry {
  readonly sourceIndex:number;
  readonly width:number;
  readonly height:number;
  readonly provenance:'original'|'generated';
  readonly category:SpriteCategory;
  readonly status:'verified'|'unclassified';
  readonly label?:string;
  readonly semanticKeys:readonly string[];
  readonly evidence:readonly string[];
  readonly usages:readonly SpriteUsage[];
}
const PANELS:Readonly<Record<string,number>> = Object.freeze({'inventory.panel':17,'inventory.scroll':23,'inventory.chest':25,'inventory.stats':27});
const UI_SPRITES = new Set([1,13,14,17,23,25,26,27,40]);
const PANEL_EVIDENCE='src/render/spriteSource.ts:createSpriteSource';
const INVENTORY_EVIDENCE='src/render/inventoryPainter.ts:paintInventory';
const WORLD_EVIDENCE='src/render/viewportPainter.ts:paintDungeonViewport';

/** Legacy address policy only: callers must establish their own source provenance. */
export function panelSourceIndex(key:string):number|undefined {
  return Object.prototype.hasOwnProperty.call(PANELS,key)?PANELS[key]:undefined;
}

/** Address a derived16x16 icon without confusing its ID with its raw atlas index. */
export function itemIconAddress(icon:number):{readonly rawSourceIndex:number;readonly crop:SpriteCrop}|undefined {
  if(!Number.isInteger(icon)||icon<0||icon>=224)return undefined;
  return {rawSourceIndex:42+Math.floor(icon/32),crop:{x:(icon%16)*16,y:Math.floor((icon%32)/16)*16,width:16,height:16}};
}

/** Stable schema1 export metadata. This lookup alone makes no provenance claim. */
export function dm1ExportMetadata(index:number):{readonly category:SpriteCategory;readonly semanticKeys:readonly string[]} {
  const category:SpriteCategory=UI_SPRITES.has(index)?'ui':index>=42&&index<=48?'items':
    (index>=75&&index<=89)||(index>=108&&index<=119)||index===301||index===315?'dungeon':'unclassified';
  return {category,semanticKeys:Object.entries(PANELS).filter(([,i])=>i===index).map(([key])=>key)};
}

function facts(index:number,width:number,height:number):{label?:string;evidence:string[];usages:SpriteUsage[]} {
  const usages:SpriteUsage[]=[];
  const usage=(usageKey:string,role:string,mask:SpriteUsageMask,evidence:string,crop?:SpriteCrop) => usages.push({usageKey,role,rawSourceIndex:index,mask,evidence:[evidence],...(crop?{crop}:{})});
  const panel=Object.entries(PANELS).find(([,i])=>i===index)?.[0];
  if(panel) {
    // Stats27 is a verified adapter alias; the current painter draws stats procedurally.
    if(index!==27)usage(panel,'Inventory panel blit',{kind:'opaque'},INVENTORY_EVIDENCE);
    return {label:panel,evidence:[PANEL_EVIDENCE,...(index===27?[]:[INVENTORY_EVIDENCE])],usages};
  }
  if(index>=42&&index<=48) {
    if(width===256&&height===32) for(let icon=(index-42)*32;icon<(index-41)*32;icon++) {
      const address=itemIconAddress(icon)!;
      usage(`item.icon.${icon}`,'Cropped item icon',{kind:'transparent-index',index:0},PANEL_EVIDENCE,address.crop);
    }
    return {label:'Item icon atlas',evidence:['agents/oracle.docs/lessons.md:Lesson005',PANEL_EVIDENCE],usages};
  }
  if(index===75||index===76) {
    usage(`viewport.source.${index}`,index===75?'Corridor floor':'Corridor ceiling',{kind:'opaque'},WORLD_EVIDENCE);
    return {label:index===75?'Corridor floor':'Corridor ceiling',evidence:[WORLD_EVIDENCE],usages};
  }
  if((index>=77&&index<=80)||(index>=82&&index<=89)||(index>=108&&index<=119)||index===315) {
    const role=index<=80?'Doorway track or jamb':index<=83?'Door lintel':index<=89?'Stone wall atlas':index===315?'Door button':'Door slab';
    usage(`viewport.source.${index}`,role,{kind:'transparent-index',index:10},'src/render/viewportPainter.ts:source-index10 blits');
    if(index>=108&&index<=119) usages[0]={...usages[0]!,auxiliaryMask:{rawSourceIndex:301,condition:'bashed',mask:{kind:'mask-index',index:0}}};
    return {label:role,evidence:['agents/oracle.docs/lessons.md:Lesson003','agents/oracle.docs/lessons.md:Lesson004'],usages};
  }
  if(index===301) {
    usage('door.breach-mask','Separate bashed-door mask: zero skips slab pixels',{kind:'mask-index',index:0},'src/render/viewportPainter.ts:drawCenterTileContents');
    return {label:'Bashed-door breach mask',evidence:['agents/oracle.docs/lessons.md:Lesson004'],usages};
  }
  return {evidence:[],usages};
}

/** Cover exactly the supplied map; only original-source records receive DM1 facts. */
export function buildSpriteCatalog(bundle:GraphicsBundle):readonly SpriteCatalogEntry[] {
  return [...bundle.sprites].sort(([a],[b])=>a-b).map(([index,sprite])=>{
    if(!Number.isSafeInteger(index)||index<0||sprite.index!==index)throw new Error('Catalog raw source index must match its decoded map key');
    if(!Number.isSafeInteger(sprite.width)||!Number.isSafeInteger(sprite.height)||sprite.width<=0||sprite.height<=0||sprite.pixels.length!==sprite.width*sprite.height)throw new Error(`Catalog sprite ${index} has invalid dimensions or pixels`);
    const original=bundle.source==='AMIGA_GRAPHICS_DAT';
    const known=original?facts(index,sprite.width,sprite.height):{evidence:[],usages:[]};
    const metadata=original?dm1ExportMetadata(index):{category:'unclassified' as const,semanticKeys:[]};
    return {sourceIndex:index,width:sprite.width,height:sprite.height,provenance:original?'original':'generated',
      ...metadata,status:known.label?'verified':'unclassified',...known};
  });
}
