import { copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sourceManifest = resolve(process.cwd(), 'manifest.json');
const targetManifest = resolve(process.cwd(), 'dist', 'manifest.json');

await copyFile(sourceManifest, targetManifest);
