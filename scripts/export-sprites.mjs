/** Offline original-sprite exporter. Run through bobp make export-sprites. */
import { relative } from 'node:path';
import { loadSpriteExport, parseExportArguments, projectRoot } from './sprite-export-runtime.mjs';
try {
  const options=parseExportArguments(process.argv.slice(2));
  if(options.help)console.log(`Export original graphics.dat sprites as indexed PNGs and a manifest.
Usage: bobp make export-sprites [SPRITE_INPUT=path] [SPRITE_OUTPUT=build/path] [ARGS=--help]
Defaults: public/assets/extracted/dm1/graphics.dat -> build/sprites
Options: --input PATH, --output PATH, --help
Output must stay inside ignored build/. Unrelated or modified files are never overwritten.
One raw sprite per PNG; index0 alpha0 is an export policy, not a runtime mask migration.
Original archives and generated art stay local; no clean-room substitution.`);
  else {
    const {result,publish}=await loadSpriteExport(options.input);
    const output=await publish(result,{projectRoot,outputDirectory:options.output});
    console.log(`Exported ${result.manifest.sprites.length} indexed PNG sprites to ${relative(projectRoot,output)}.
Manifest: ${relative(projectRoot,output)}/manifest.json
Transparency: raw palette index 0 is transparent; no lighting variants.`);
  }
}catch(error){console.error(`Sprite export failed: ${error.message}`);process.exitCode=1;}
