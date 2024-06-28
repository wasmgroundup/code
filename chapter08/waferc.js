import fs from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';

import { compile } from './chapter07.js';

const filePath = process.argv[2];
const ext = extname(filePath);
if (!filePath || ext !== '.wafer') {
  console.error('Usage: node waferc.js </path/to/file.wafer>');
  process.exit(1);
}

const source = fs.readFileSync(filePath, 'utf8');
const wasmBytes = compile(source);
const outputPath = join(dirname(filePath), basename(filePath, ext) + '.wasm');
fs.writeFileSync(outputPath, wasmBytes);
