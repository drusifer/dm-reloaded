/** Load the existing TypeScript parser/exporter without a network listener or new dependency. */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createServer } from 'vite';
export const projectRoot=fileURLToPath(new URL('../',import.meta.url));
export async function loadSpriteExport(inputPath) {
  const absolute=resolve(projectRoot,inputPath);
  let bytes;
  try{bytes=await readFile(absolute);}catch(error){throw new Error(`Cannot read graphics source ${inputPath}. Supply the original extracted graphics.dat or run bobp make extract-assets when local disk archives are available. (${error.code??'read error'})`);}
  const server=await createServer({root:projectRoot,configFile:false,logLevel:'error',server:{middlewareMode:true,hmr:false,watch:null},appType:'custom',optimizeDeps:{noDiscovery:true}});
  try {
    const parser=await server.ssrLoadModule('/src/data/graphicsDatParser.ts');
    const exporter=await server.ssrLoadModule('/src/tools/spriteExport.ts');
    const writer=await server.ssrLoadModule('/src/tools/spriteExportWriter.ts');
    const expected=writer.validateGraphicsContainer(bytes),graphics=parser.parseGraphicsDat(bytes);
    writer.assertDecodedSpriteCompleteness(expected,graphics.sprites);
    const result=exporter.createSpriteExport(graphics,{fileName:inputPath,bytes});
    return {result,graphics,publish:writer.publishSpriteExport};
  }finally{await server.close();}
}
export function parseExportArguments(argv) {
  const options={input:'public/assets/extracted/dm1/graphics.dat',output:'build/sprites',help:false};
  for(let i=0;i<argv.length;i++) {
    const arg=argv[i];if(arg==='--help'||arg==='-h'){options.help=true;continue;}
    if(arg!=='--input'&&arg!=='--output')throw new Error(`Unknown option ${arg}; use --help.`);
    const value=argv[++i];if(!value||value.startsWith('--'))throw new Error(`${arg} needs a path; use --help.`);
    options[arg==='--input'?'input':'output']=value;
  }
  return options;
}
