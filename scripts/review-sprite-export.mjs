/** Independently decode actual exported PNGs in Chromium; never publish or repair exports. */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { basename, delimiter, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadSpriteExport, parseExportArguments, projectRoot } from './sprite-export-runtime.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const within = (root, path) => {
  const rel = relative(root, path);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
};
const help = `Review existing exported sprites with the native Chromium PNG decoder.
Usage: bobp make export-sprites-review [SPRITE_INPUT=path] [SPRITE_OUTPUT=build/path]
       bobp make export-sprites-review ARGS=--help
Default source: public/assets/extracted/dm1/graphics.dat
Default export: build/sprites (run bobp make export-sprites first)
Evidence: build/sprite-export-review/report.json and representative PNGs/overview.
Original assets and generated art remain local. This command does not re-export files.
If Chromium is missing, run bobp make visual-review-setup.`;

function verifyPngMetadata(bytes, palette, path) {
  let offset = 8, sawPalette = false, sawTransparency = false, sawEnd = false;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw new Error(`Truncated PNG chunk header: ${path}.`);
    const length = bytes.readUInt32BE(offset), end = offset + length + 12;
    if (end > bytes.length) throw new Error(`Truncated PNG chunk payload: ${path}.`);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const payload = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'PLTE') {
      if (sawPalette || !payload.equals(Buffer.from(palette.flat()))) throw new Error(`PNG palette differs from the sixteen original colors: ${path}.`);
      sawPalette = true;
    } else if (type === 'tRNS') {
      if (sawTransparency || length < 1 || length > 16) throw new Error(`Invalid PNG transparency metadata: ${path}.`);
      const alpha = Buffer.alloc(16, 255); payload.copy(alpha);
      if (alpha.some((value, index) => value !== (index === 0 ? 0 : 255))) throw new Error(`PNG transparency differs from index-zero alpha policy: ${path}.`);
      sawTransparency = true;
    } else if (type === 'IEND') {
      if (length !== 0 || end !== bytes.length) throw new Error(`Invalid PNG end chunk: ${path}.`);
      sawEnd = true; break;
    }
    offset = end;
  }
  if (!sawPalette || !sawTransparency || !sawEnd) throw new Error(`PNG palette, transparency or end metadata is missing: ${path}.`);
}

async function reviewEvidenceDirectory() {
  const project = await realpath(projectRoot);
  const build = resolve(project, 'build');
  const buildInfo = await lstat(build);
  if (buildInfo.isSymbolicLink() || !buildInfo.isDirectory()) throw new Error('Review build root must be a real project directory.');
  const evidence = resolve(build, 'sprite-export-review');
  let info;
  try { info = await lstat(evidence); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (info && (info.isSymbolicLink() || !info.isDirectory())) throw new Error('Review evidence directory must not be a symlink or file.');
  // Only create the direct child after verifying its real, nonsymlink parent.
  if (!info) await mkdir(evidence);
  const actualEvidence = await realpath(evidence);
  if (!within(build, actualEvidence)) throw new Error('Review evidence escapes project build output.');
  return actualEvidence;
}

async function evidenceDestination(name) {
  const evidence = await reviewEvidenceDirectory();
  const destination = resolve(evidence, name);
  if (!name || dirname(destination) !== evidence || name.includes(':')) throw new Error('Evidence filename must be a portable direct child of the owned review directory.');
  let info;
  try { info = await lstat(destination); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (info && (info.isSymbolicLink() || !info.isFile())) throw new Error(`Review evidence file must not be a symlink or non-file: ${name}.`);
  return destination;
}

async function writeReviewReport(report) {
  const destination = await evidenceDestination('report.json');
  await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
  return dirname(destination);
}

async function main() {
  const options = parseExportArguments(process.argv.slice(2));
  if (options.help) { console.log(help); return; }
  const evidencePath = await writeReviewReport({ schemaVersion: 1, passed: false, status: 'running' });
  const sourcePath = resolve(projectRoot, options.input);
  const outputPath = resolve(projectRoot, options.output);
  let actualManifest;
  try { actualManifest = JSON.parse(await readFile(resolve(outputPath, 'manifest.json'), 'utf8')); }
  catch (error) { throw new Error(`Cannot read export manifest at ${options.output}/manifest.json. Run bobp make export-sprites first. (${error.code ?? 'invalid JSON'})`); }
  const buildRoot = await realpath(resolve(projectRoot, 'build'));
  const actualRoot = await realpath(outputPath);
  if (!within(buildRoot, actualRoot)) throw new Error('Reviewed output must resolve inside the project build directory.');
  const sourceBefore = await readFile(sourcePath);
  const sourceHash = hash(sourceBefore);
  const { result, graphics } = await loadSpriteExport(options.input);
  const palette = graphics.lightPalettes.at(-1);
  if (actualManifest.schemaVersion !== 1 || !Array.isArray(actualManifest.sprites)) throw new Error('Unsupported or invalid export manifest; run export-sprites again.');
  if (actualManifest.source?.sha256 !== sourceHash || actualManifest.source?.fileName !== basename(sourcePath)) throw new Error('Export source hash/name differs from the supplied archive; rerun export-sprites for this source.');
  if (JSON.stringify(actualManifest.palette) !== JSON.stringify(palette)) throw new Error('Export manifest palette differs from the brightest original palette.');
  if (JSON.stringify(actualManifest.transparency) !== JSON.stringify(result.manifest.transparency)) throw new Error('Export manifest must declare raw index-zero transparency.');
  if (actualManifest.sprites.length !== graphics.sprites.size) throw new Error('Manifest count differs from original decoded sprite count.');

  const expectedEntries = new Map(result.manifest.sprites.map(entry => [entry.index, entry]));
  const seen = new Set();
  const files = [];
  let lastIndex = -1;
  for (const entry of actualManifest.sprites) {
    const sprite = graphics.sprites.get(entry.index), expected = expectedEntries.get(entry.index);
    if (!sprite || seen.has(entry.index) || entry.index <= lastIndex) throw new Error(`Manifest sprite indices must be unique and numerically sorted: ${entry.index}.`);
    seen.add(entry.index); lastIndex = entry.index;
    if (entry.width !== sprite.width || entry.height !== sprite.height) throw new Error(`Manifest dimensions differ from source sprite ${entry.index}.`);
    if (entry.path !== expected.path || entry.category !== expected.category || JSON.stringify(entry.semanticKeys) !== JSON.stringify(expected.semanticKeys)) throw new Error(`Manifest path/category/semantic labels differ from verified source metadata for sprite ${entry.index}.`);
    if (!/^(ui|items|dungeon|unclassified)\/\d+_\d+x\d+\.png$/.test(entry.path)) throw new Error(`Unsafe or nonportable sprite path: ${entry.path}.`);
    const filePath = resolve(actualRoot, entry.path);
    let bytes;
    try {
      if (!within(actualRoot, await realpath(filePath))) throw new Error('path escapes export root');
      bytes = await readFile(filePath);
    } catch (error) { throw new Error(`Cannot read exported sprite ${entry.path}: ${error.code ?? error.message}. Run export-sprites again.`); }
    if (!/^[0-9a-f]{64}$/.test(entry.sha256 ?? '') || hash(bytes) !== entry.sha256) throw new Error(`Exported PNG hash mismatch: ${entry.path}.`);
    if (bytes.length < 33 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii',12,16) !== 'IHDR' || bytes[24] !== 4 || bytes[25] !== 3) throw new Error(`Expected a four-bit indexed PNG: ${entry.path}.`);
    verifyPngMetadata(bytes, palette, entry.path);
    files.push({ ...entry, filePath, png: bytes.toString('base64'), pixels: Buffer.from(sprite.pixels).toString('base64') });
  }

  const modulePath = process.env.PLAYWRIGHT_MODULE ?? (process.env.PATH ?? '').split(delimiter)
    .map(bin => resolve(bin, '../playwright/index.mjs')).find(path => existsSync(path));
  if (!modulePath) throw new Error('Playwright runner unavailable. Use bobp make export-sprites-review to provide the pinned temporary package.');
  const { chromium } = await import(pathToFileURL(modulePath).href);
  if (evidencePath === outputPath || within(outputPath, evidencePath)) throw new Error('Export output must not contain the separate build/sprite-export-review evidence directory.');
  const actualEvidence = await realpath(evidencePath);
  if (!within(buildRoot, actualEvidence)) throw new Error('Review evidence directory must remain inside project build output.');
  if (actualEvidence === actualRoot || within(actualRoot, actualEvidence)) throw new Error('Review evidence must stay separate from the exported PNG tree, including symlink paths.');
  const errors = [];
  let browser, verifiedPixels = 0;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1040, height: 740 } });
    page.on('pageerror', error => errors.push(error.message));
    for (let offset = 0; offset < files.length; offset += 24) {
      const batch = files.slice(offset, offset + 24).map(({ index, width, height, png, pixels, path }) => ({ index, width, height, png, pixels, path }));
      verifiedPixels += await page.evaluate(async ({ batch, palette }) => {
        const decode64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
        let total = 0;
        for (const entry of batch) {
          const bitmap = await createImageBitmap(new Blob([decode64(entry.png)], { type: 'image/png' }), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
          try {
            if (bitmap.width !== entry.width || bitmap.height !== entry.height) throw new Error(`Native decoded dimensions differ: ${entry.path}`);
            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
            const context = canvas.getContext('2d', { willReadFrequently: true });
            context.drawImage(bitmap, 0, 0);
            const actual = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
            const indices = decode64(entry.pixels);
            for (let p = 0; p < indices.length; p++) {
              const index = indices[p], expected = index === 0 ? [0, 0, 0, 0] : [...palette[index], 255];
              for (let channel = 0; channel < 4; channel++) if (actual[p * 4 + channel] !== expected[channel]) {
                throw new Error(`Native PNG pixel mismatch ${entry.path} at (${p % entry.width},${Math.floor(p / entry.width)}) channel ${channel}: ${actual[p * 4 + channel]} != ${expected[channel]}`);
              }
            }
            total += indices.length;
          } finally { bitmap.close(); }
        }
        return total;
      }, { batch, palette });
    }

    const representatives = [17, 42, 87].map(index => files.find(file => file.index === index)).filter(Boolean);
    for (const entry of representatives) await copyFile(entry.filePath, await evidenceDestination(`sprite-${entry.index}.png`));
    await page.setContent('<!doctype html><html><body style="margin:0;background:#20252b;color:#eee;font:16px monospace;padding:20px"><h1 style="font-size:22px">Native PNG export review</h1><p>Index 0 transparent; other indices opaque. Raw export policy does not replace runtime masks.</p><div id="samples" style="display:flex;gap:20px;flex-wrap:wrap"></div></body></html>');
    await page.evaluate(async entries => {
      for (const entry of entries) {
        const section = document.createElement('section');
        const label = document.createElement('p'); label.textContent = `Sprite ${entry.index}: ${entry.width} × ${entry.height}`;
        const image = new Image(); image.src = `data:image/png;base64,${entry.png}`; await image.decode();
        image.style.cssText = 'image-rendering:pixelated;max-width:920px;background:repeating-conic-gradient(#aaa 0 25%,#ddd 0 50%) 0/16px 16px;border:1px solid #777';
        image.width = entry.width * 2; image.height = entry.height * 2;
        section.append(label, image); document.getElementById('samples').append(section);
      }
    }, representatives.map(({ index, width, height, png }) => ({ index, width, height, png })));
    await page.screenshot({ path: await evidenceDestination('overview.png'), fullPage: true });
    if (errors.length) throw new Error(errors.join('; '));
  } finally { await browser?.close(); }
  if (hash(await readFile(sourcePath)) !== sourceHash) throw new Error('Source changed during review; verification cannot be claimed.');
  const report = {
    schemaVersion: 1, passed: true, status: 'passed', decoder: 'Chromium createImageBitmap + Canvas',
    source: { fileName: basename(sourcePath), sha256: sourceHash, unchanged: true },
    spritesVerified: files.length, manifestRecords: actualManifest.sprites.length,
    rgbaPixelsVerified: verifiedPixels, paletteVerified: true, indexedBitDepth: 4,
    transparency: 'Index 0 normalizes to RGBA(0,0,0,0); indices 1–15 match original palette at alpha 255.',
    pngHashesVerified: true, transparencyMetadataVerified: true, browserErrors: errors,
    representatives: files.filter(file => [17,42,87].includes(file.index)).map(({ index, path }) => ({ index, path }))
  };
  await writeReviewReport(report);
  console.log(`Verified ${files.length} exported indexed PNGs and ${verifiedPixels} pixels through native Chromium; source unchanged. Evidence: build/sprite-export-review/report.json and overview.png`);
}
main().catch(async error => {
  try { await writeReviewReport({ schemaVersion: 1, passed: false, status: 'failed', error: error.message }); }
  catch (reportError) { console.error(`Review failure could not be recorded safely: ${reportError.message}`); }
  console.error(`Sprite export review failed: ${error.message}`);
  process.exitCode = 1;
});
