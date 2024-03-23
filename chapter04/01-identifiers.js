import assert from 'node:assert';
import * as ohm from 'ohm-js';

import {
  code,
  codesec,
  export_,
  exportdesc,
  exportsec,
  func,
  funcsec,
  functype,
  i32,
  instr,
  loadMod,
  makeTestFn,
  module,
  testExtractedExamples,
  typeidx,
  typesec,
  u32,
  valtype,
} from './chapter03.js';

const test = makeTestFn(import.meta.url);

const grammarDef = `
  Wafer {
    Main = Expr
    Expr = number (op number)*

    op = "+" | "-"
    number = digit+

    //+ "x", "élan", "_", "_99"
    //- "1", "$nope"
    identifier = identStart identPart*
    identStart = letter | "_"
    identPart = letter | "_" | digit

    // Examples:
    //+ "42", "1"
    //- "abc"
  }
`;

test('Extracted examples', () => testExtractedExamples(grammarDef));
