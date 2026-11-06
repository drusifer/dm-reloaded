/** Searchable, source-aware sprite inspection. Raw views never imply a runtime mask. */
import type { GraphicsBundle } from '../data/graphicsDatParser';
import { buildSpriteCatalog } from '../data/spriteCatalog';
import type { SpriteCategory } from '../data/spriteCatalog';
import { hitTestContactSheet, renderContactSheet } from '../render/contactSheet';
import type { ContactSheetImage } from '../render/contactSheet';
import { filterSpriteCatalog, renderSpritePreview } from '../render/catalogInspection';

export interface ContactSheetController {isOpen():boolean;toggle():void;close():void;destroy():void}

export function mountContactSheetUI(host:HTMLElement,graphics:GraphicsBundle):ContactSheetController {
  const catalog=buildSpriteCatalog(graphics);
  let visible=catalog;
  let open=false;
  let image:ContactSheetImage|null=null;
  let previousFocus:HTMLElement|null=null;
  const toggleBtn=document.createElement('button');
  toggleBtn.id='contact-sheet-toggle';toggleBtn.type='button';toggleBtn.textContent='SPRITES [G]';
  toggleBtn.title='Inspect decoded sprites (G)';
  const panel=document.createElement('aside');
  panel.id='contact-sheet-panel';panel.hidden=true;panel.setAttribute('aria-label','Sprite catalog');
  const header=document.createElement('div');header.className='cs-header';
  const title=document.createElement('strong');title.textContent=`SPRITE CATALOG · ${graphics.source}`;
  const counts=document.createElement('div');counts.id='cs-counts';counts.setAttribute('aria-live','polite');
  const controls=document.createElement('div');controls.className='cs-actions';
  const label=(text:string,control:HTMLElement):void=>{const l=document.createElement('label');l.textContent=text;l.append(control);controls.append(l);};
  const select=(id:string,items:readonly (readonly [string,string])[]):HTMLSelectElement=>{
    const el=document.createElement('select');el.id=id;el.className='cs-select';
    for(const [value,text] of items){const option=document.createElement('option');option.value=value;option.textContent=text;el.append(option);}return el;
  };
  const button=(id:string,text:string):HTMLButtonElement=>{const el=document.createElement('button');el.id=id;el.type='button';el.className='cs-btn';el.textContent=text;return el;};
  const search=document.createElement('input');search.id='cs-search';search.type='search';search.placeholder='Index or verified name';label('Find sprite ',search);
  const category=select('cs-category',[['all','All categories'],['ui','Interface'],['items','Items'],['dungeon','Dungeon'],['unclassified','Unclassified']]);label('Category ',category);
  const status=select('cs-status',[['all','All records'],['verified','Verified role'],['unclassified','Unclassified']]);label('Knowledge ',status);
  const selected=select('cs-selected',[]);label('Selected sprite ',selected);
  const zoom=select('cs-zoom',[["1","1x"],["2","2x"],["3","3x"],["4","4x"]]);zoom.value='2';label('Zoom ',zoom);
  const ramp=select('cs-ramp',graphics.lightPalettes.map((_,i)=>[String(i),`Source ramp ${i}`] as const));ramp.value=String(Math.max(0,graphics.lightPalettes.length-1));label('Palette reference ',ramp);
  const reset=button('cs-reset','Reset filters'),copy=button('cs-copy','Copy index'),close=button('cs-close','Close [Esc]');controls.append(reset,copy,close);
  const inspector=document.createElement('div');inspector.className='cs-inspector';
  const mode=select('cs-preview-mode',[['raw-index-0','Raw export view (index 0 holes)'],['raw-opaque','Raw opaque view'],['usage','Verified usage']]);label('Preview interpretation ',mode);
  const usage=select('cs-usage',[]);label('Verified usage ',usage);
  const details=document.createElement('pre');details.id='cs-details';
  const preview=document.createElement('canvas');preview.id='cs-preview-canvas';preview.className='cs-preview';preview.setAttribute('aria-label','Selected sprite preview');
  inspector.append(details,preview);
  const readout=document.createElement('div');readout.className='cs-readout';readout.setAttribute('role','status');
  const scroller=document.createElement('div');scroller.className='cs-scroll';
  const canvas=document.createElement('canvas');canvas.className='cs-canvas';canvas.setAttribute('aria-label','Filtered raw index 0 contact sheet');scroller.append(canvas);
  header.append(title,counts,controls,readout);panel.append(header,inspector,scroller);host.append(toggleBtn,panel);

  const drawPreview=():void=>{
    const entry=visible.find(e=>String(e.sourceIndex)===selected.value);
    copy.disabled=!entry;usage.disabled=mode.value!=='usage'||!entry?.usages.length;
    const usageOption=mode.querySelector<HTMLOptionElement>('option[value="usage"]')!;
    usageOption.disabled=!entry?.usages.length;
    if(!entry){details.textContent=catalog.length?'No sprites match these filters.':'No raw sprites in this source. Generated gameplay art is not a decoded original catalog.';preview.width=1;preview.height=1;preview.style.width='';preview.style.height='';preview.hidden=true;return;}
    preview.hidden=false;
    if(mode.value==='usage'&&!entry.usages.length)mode.value='raw-index-0';
    const policy=entry.usages.find(u=>u.usageKey===usage.value);
    const interpretation=mode.value==='usage'?policy:undefined;
    const mask=interpretation?.mask??(mode.value==='raw-opaque'?{kind:'opaque' as const}:{kind:'transparent-index' as const,index:0 as const});
    const maskText=mask.kind==='opaque'?'Opaque (black remains visible)':mask.kind==='mask-index'?`Mask stencil: index ${mask.index} skips slab pixels; white marks retained pixels`:`Index ${mask.index} is transparent`;
    const auxiliary=interpretation?.auxiliaryMask;
    details.textContent=[`Source ${entry.sourceIndex} · ${entry.width}×${entry.height} · ${entry.provenance}`,
      `${entry.label??'Unclassified sprite'} · ${entry.category} · ${entry.status==='verified'?'Verified role (not complete identification)':'Unclassified'}`,
      `Keys: ${entry.semanticKeys.join(', ')||'None verified'}`,
      `View: ${mode.selectedOptions[0]?.textContent} · ${maskText}`,
      interpretation?`Usage: ${interpretation.usageKey} · raw source ${interpretation.rawSourceIndex}${interpretation.crop?` · crop ${interpretation.crop.x},${interpretation.crop.y} ${interpretation.crop.width}×${interpretation.crop.height}`:''}`:'Raw interpretation only; no runtime mask is inferred.',
      auxiliary?`When bashed: auxiliary source ${auxiliary.rawSourceIndex} index ${auxiliary.mask.index} breach mask. Not applied in this ordinary slab preview.`:'',
      `Evidence: ${[...entry.evidence,...(interpretation?.evidence??[])].join('; ')||'No verified identity or runtime usage.'}`,
      `Verified usages: ${entry.usages.map(u=>u.usageKey).join(', ')||'None'}`].filter(Boolean).join('\n');
    const palette=graphics.lightPalettes[Number(ramp.value)];
    if(!palette)return;
    const result=renderSpritePreview(graphics.sprites.get(entry.sourceIndex)!,palette,mask,interpretation?.crop);
    preview.width=result.width;preview.height=result.height;
    preview.style.width=`${result.width*Number(zoom.value)}px`;preview.style.height=`${result.height*Number(zoom.value)}px`;
    preview.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(result.rgba),result.width,result.height),0,0);
  };
  const selectEntry=():void=>{
    const previous=usage.value;usage.replaceChildren();
    const entry=visible.find(e=>String(e.sourceIndex)===selected.value);
    for(const u of entry?.usages??[]){const option=document.createElement('option');option.value=u.usageKey;option.textContent=`${u.usageKey} — ${u.role}`;usage.append(option);}
    if(entry?.usages.some(u=>u.usageKey===previous))usage.value=previous;
    if(!entry?.usages.length)mode.value='raw-index-0';
    drawPreview();
  };
  const redraw=():void=>{
    const previous=selected.value;
    visible=filterSpriteCatalog(catalog,{query:search.value,category:category.value as SpriteCategory|'all',status:status.value as 'all'|'verified'|'unclassified'});
    const verified=catalog.filter(e=>e.status==='verified').length;
    counts.textContent=`Showing ${visible.length} / ${catalog.length} raw sprites · ${verified} verified roles · ${catalog.length-verified} unclassified. Verified role does not mean every part is identified.`;
    selected.replaceChildren();
    for(const e of visible){const option=document.createElement('option');option.value=String(e.sourceIndex);option.textContent=`${e.sourceIndex} · ${e.label??'Unclassified'} (${e.width}×${e.height})`;selected.append(option);}
    selected.disabled=!visible.length;if(visible.some(e=>String(e.sourceIndex)===previous))selected.value=previous;
    const filtered={...graphics,sprites:new Map(visible.map(e=>[e.sourceIndex,graphics.sprites.get(e.sourceIndex)!]))};
    const palette=graphics.lightPalettes[Number(ramp.value)];
    if(palette){image=renderContactSheet(filtered,palette,{scale:Number(zoom.value),maxWidth:900});canvas.width=Math.max(1,image.width);canvas.height=Math.max(1,image.height);if(image.width&&image.height)canvas.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(image.rgba),image.width,image.height),0,0);}
    selectEntry();
  };
  const copyIndex=async():Promise<void>=>{
    const index=selected.value;
    if(!index)return;
    try{if(!navigator.clipboard)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(index);readout.textContent=`Copied item[${index}]`;}
    catch{readout.textContent=`Could not copy automatically. Copy this index manually: ${index}`;}
  };
  const setOpen=(next:boolean):void=>{
    if(next===open)return;
    open=next;panel.hidden=!open;toggleBtn.classList.toggle('open',open);toggleBtn.setAttribute('aria-expanded',String(open));
    if(open){previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;redraw();search.focus();}
    else (previousFocus?.isConnected?previousFocus:toggleBtn).focus();
  };
  for(const control of [search,category,status])control.addEventListener(control===search?'input':'change',redraw);
  for(const control of [zoom,ramp])control.addEventListener('change',redraw);
  selected.addEventListener('change',selectEntry);mode.addEventListener('change',drawPreview);usage.addEventListener('change',drawPreview);
  reset.addEventListener('click',()=>{search.value='';category.value='all';status.value='all';redraw();});
  copy.addEventListener('click',()=>{void copyIndex();});
  canvas.addEventListener('click',ev=>{if(!image)return;const rect=canvas.getBoundingClientRect();const cell=hitTestContactSheet(image,(ev.clientX-rect.left)*canvas.width/rect.width,(ev.clientY-rect.top)*canvas.height/rect.height);if(cell){selected.value=String(cell.index);selectEntry();void copyIndex();}});
  // Capture before the global game shortcut handler, including Escape from search.
  panel.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();setOpen(false);}else ev.stopPropagation();});
  panel.addEventListener('keyup',ev=>ev.stopPropagation());
  toggleBtn.addEventListener('click',()=>setOpen(!open));close.addEventListener('click',()=>setOpen(false));
  return {isOpen:()=>open,toggle:()=>setOpen(!open),close:()=>setOpen(false),destroy:()=>{toggleBtn.remove();panel.remove();}};
}
