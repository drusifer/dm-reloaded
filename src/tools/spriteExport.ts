/** Deterministic raw indexed PNG/manifest construction, without filesystem or browser effects. */
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import type { DecodedSprite, GraphicsBundle, RgbColor } from '../data/graphicsDatParser';

const PNG_SIGNATURE = Buffer.from([137,80,78,71,13,10,26,10]);
const SEMANTIC_KEYS: Readonly<Record<number,readonly string[]>> = {
  17:['inventory.panel'],23:['inventory.scroll'],25:['inventory.chest'],27:['inventory.stats']
};
const UI_SPRITES = new Set([1,13,14,17,23,25,26,27,40]);
const CRC_TABLE = Uint32Array.from({length:256},(_,value)=>{
  let crc=value;
  for(let bit=0;bit<8;bit++) crc=(crc&1)!==0?0xedb88320^(crc>>>1):crc>>>1;
  return crc>>>0;
});

export interface SpriteManifestEntry {
  readonly index:number;
  readonly width:number;
  readonly height:number;
  readonly category:'ui'|'items'|'dungeon'|'unclassified';
  readonly path:string;
  readonly semanticKeys:readonly string[];
  readonly sha256:string;
}
export interface SpriteManifest {
  readonly schemaVersion:1;
  readonly source:{readonly fileName:string;readonly sha256:string};
  readonly palette:readonly RgbColor[];
  readonly transparency:{readonly policy:'raw-index-0';readonly transparentIndex:0;readonly opaqueIndices:readonly number[]};
  readonly sprites:readonly SpriteManifestEntry[];
}
export interface SpriteExport {
  readonly manifest:SpriteManifest;
  readonly manifestJson:string;
  readonly pngFiles:ReadonlyMap<string,Uint8Array>;
}

function hash(bytes:Uint8Array):string { return createHash('sha256').update(bytes).digest('hex'); }
function chunk(type:string,data:Uint8Array):Buffer {
  const name=Buffer.from(type,'ascii'), payload=Buffer.from(data);
  const output=Buffer.alloc(payload.length+12);
  output.writeUInt32BE(payload.length,0);name.copy(output,4);payload.copy(output,8);
  let crc=0xffffffff;
  for(const byte of output.subarray(4,8+payload.length)) crc=CRC_TABLE[(crc^byte)&255]!^(crc>>>8);
  output.writeUInt32BE((crc^0xffffffff)>>>0,payload.length+8);
  return output;
}
function validatePalette(palette:readonly RgbColor[]):void {
  if(palette.length!==16 || Array.from(palette).some(color=>!color || color.length!==3 || Array.from(color).some(value=>!Number.isInteger(value)||value<0||value>255))) {
    throw new Error('PNG palette must contain exactly sixteen RGB colors with byte-valued channels.');
  }
}
function validateSprite(sprite:DecodedSprite):void {
  if(!Number.isInteger(sprite.width)||!Number.isInteger(sprite.height)||sprite.width<=0||sprite.height<=0||sprite.width>0x7fffffff||sprite.height>0x7fffffff) {
    throw new Error('PNG dimensions must be positive integers within the PNG size limit.');
  }
  if(!Number.isSafeInteger(sprite.width*sprite.height)||sprite.pixels.length!==sprite.width*sprite.height) {
    throw new Error('Sprite pixel buffer does not match its dimensions.');
  }
  if(sprite.pixels.some(index=>index>15)) throw new Error('Sprite palette index must be between 0 and 15.');
}

/** Preserve original pixel indices in a 4-bit indexed PNG; only index zero is transparent. */
export function encodeIndexedPng(sprite:DecodedSprite,palette:readonly RgbColor[]):Uint8Array {
  validateSprite(sprite);validatePalette(palette);
  const header=Buffer.alloc(13);
  header.writeUInt32BE(sprite.width,0);header.writeUInt32BE(sprite.height,4);
  header[8]=4;header[9]=3; // 4-bit indexed color, standard compression/filter, no interlace.
  const rowBytes=Math.ceil(sprite.width/2),rows=Buffer.alloc((rowBytes+1)*sprite.height);
  for(let y=0;y<sprite.height;y++) for(let x=0;x<sprite.width;x++) {
    const index=sprite.pixels[y*sprite.width+x]!;
    rows[y*(rowBytes+1)+1+Math.floor(x/2)]!|=index<<(x%2===0?4:0);
  }
  const transparency=Buffer.alloc(16,255);transparency[0]=0;
  return Buffer.concat([PNG_SIGNATURE,chunk('IHDR',header),chunk('PLTE',Uint8Array.from(palette.flat())),
    chunk('tRNS',transparency),chunk('IDAT',deflateSync(rows)),chunk('IEND',new Uint8Array())]);
}

function category(index:number):SpriteManifestEntry['category'] {
  if(UI_SPRITES.has(index)) return 'ui';
  if(index>=42&&index<=48) return 'items';
  if((index>=75&&index<=89)||(index>=108&&index<=119)||index===301||index===315) return 'dungeon';
  return 'unclassified';
}

/** Build sorted portable artifacts; raw export transparency is not a runtime masking migration. */
export function createSpriteExport(graphics:GraphicsBundle,source:{readonly fileName:string;readonly bytes:Uint8Array}):SpriteExport {
  if(graphics.source!=='AMIGA_GRAPHICS_DAT') throw new Error('Original graphics.dat sprites are required; clean-room fallback is not an export source.');
  if(graphics.sprites.size===0) throw new Error('No decoded sprites were found in the original graphics data.');
  const palette=graphics.lightPalettes.at(-1);
  if(!palette) throw new Error('The original graphics palette is missing.');
  validatePalette(palette);
  const fileName=source.fileName.split(/[\\/]/).filter(Boolean).at(-1);
  if(!fileName||fileName==='.'||fileName==='..') throw new Error('A source filename is required for the export manifest.');
  const pngFiles=new Map<string,Uint8Array>(),sprites:SpriteManifestEntry[]=[];
  for(const [index,sprite] of [...graphics.sprites].sort(([a],[b])=>a-b)) {
    if(!Number.isSafeInteger(index)||index<0||index!==sprite.index) throw new Error('Decoded sprite map keys must match unique non-negative source indices.');
    const group=category(index),path=`${group}/${index}_${sprite.width}x${sprite.height}.png`;
    const png=encodeIndexedPng(sprite,palette);
    pngFiles.set(path,png);
    sprites.push({index,width:sprite.width,height:sprite.height,category:group,path,semanticKeys:[...(SEMANTIC_KEYS[index]??[])],sha256:hash(png)});
  }
  const manifest:SpriteManifest={schemaVersion:1,source:{fileName,sha256:hash(source.bytes)},
    palette:palette.map(color=>[...color] as RgbColor),
    transparency:{policy:'raw-index-0',transparentIndex:0,opaqueIndices:Array.from({length:15},(_,i)=>i+1)},sprites};
  return {manifest,manifestJson:JSON.stringify(manifest,null,2)+'\n',pngFiles};
}
