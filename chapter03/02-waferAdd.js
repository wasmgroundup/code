import assert from 'node:assert';
import * as ohm from 'ohm-js';

import {i32, instr, makeTestFn, testExtractedExamples} from '../chapter02.js';

const test = makeTestFn(import.meta.url);

const grammarDef = `
  Wafer {
    Main = Expr
    Expr = number ("+" number)*
    number = digit+

    // Examples:
    //+ "42", "1"
    //- "abc"
  }
`;

test('Extracted examples', () => testExtractedExamples(grammarDef));
