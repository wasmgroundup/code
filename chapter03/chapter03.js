import assert from 'node:assert';
import * as ohm from 'ohm-js';

import { i32, instr, makeTestFn, testExtractedExamples } from './chapter02.js';

const test = makeTestFn(import.meta.url);

instr.i32.add = 0x6a;
instr.i32.sub = 0x6b;
instr.i32.mul = 0x6c;
instr.i32.div_s = 0x6d;

export * from './chapter02.js';
