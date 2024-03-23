import assert from 'node:assert';
import * as ohm from 'ohm-js';

import { i32, instr, makeTestFn, testExtractedExamples } from './chapter02.js';

const test = makeTestFn(import.meta.url);

instr.i32.add = 0x6a;
instr.i32.sub = 0x6b;

export * from './chapter02.js';
