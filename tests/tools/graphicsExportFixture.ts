/** Complete tiny DM1-format fixture with explicit original-palette record; no fallback colors. */
export function createGraphicsExportFixture(overrides:Readonly<Record<number,Uint8Array>>={}):Buffer {
  const count=563,sprite=Buffer.from([0,2,0,1,0,1]),palette=Buffer.alloc(1470);
  for(let level=0;level<6;level++) for(let color=0;color<16;color++) {
    const word=((color%8)<<8)|(((color>>1)%8)<<4)|((color>>2)%8);
    palette.writeUInt16BE(word,1438-level*32+color*2);
  }
  const records=Array.from({length:count},(_,index)=>overrides[index]??
    (index<=532||index===538||index===548?sprite:index===562?palette:new Uint8Array()));
  const header=Buffer.alloc(2+count*4);header.writeUInt16BE(count,0);
  records.forEach((bytes,index)=>{header.writeUInt16BE(bytes.length,2+index*2);header.writeUInt16BE(bytes.length,2+count*2+index*2);});
  return Buffer.concat([header,...records]);
}

/** Intentionally corrupt both size-table declarations without changing the fixture payload. */
export function withDeclaredRecordSize(bytes:Uint8Array,index:number,size:number):Buffer {
  const raw=Buffer.from(bytes),count=raw.readUInt16BE(0);
  raw.writeUInt16BE(size,2+index*2);raw.writeUInt16BE(size,2+count*2+index*2);return raw;
}
