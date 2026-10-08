import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const chunksDir = join(process.cwd(), 'build', 'server', 'chunks');
const files = (await readdir(chunksDir)).filter((name) => name.endsWith('.js'));

const prerenderMiddleware = /serve_prerendered\(\),\s*ssr/g;
const adapterDir = /const dir = path\.dirname\(fileURLToPath\(import\.meta\.url\)\);/g;
const rebasedDir = "const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');";

let prerenderPatches = 0;
let dirPatches = 0;

for (const file of files) {
	const path = join(chunksDir, file);
	const original = await readFile(path, 'utf8');
	const patched = original
		.replace(prerenderMiddleware, () => {
			prerenderPatches++;
			return 'ssr';
		})
		.replace(adapterDir, () => {
			dirPatches++;
			return rebasedDir;
		});

	if (patched !== original) await writeFile(path, patched);
}

// adapter-node >= 5.5.7 defines `dir` in build/env.js, which already sits at the build root.
const envDirAtBuildRoot = /const dir = path\.dirname\(fileURLToPath\(import\.meta\.url\)\);/.test(
	await readFile(join(process.cwd(), 'build', 'env.js'), 'utf8').catch(() => '')
);

if (prerenderPatches === 0 || (dirPatches === 0 && !envDirAtBuildRoot)) {
	throw new Error(
		`adapter-node patch targets not found (serve_prerendered=${prerenderPatches}, dir=${dirPatches}); adapter output changed`
	);
}

console.log(`adapter-node runtime patched (serve_prerendered=${prerenderPatches}, dir=${dirPatches})`);
