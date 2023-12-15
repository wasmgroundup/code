import { setup } from '../book.js';

const { test, assert, ohm } = setup('chapter04');

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
  module,
  testExtractedExamples,
  typeidx,
  typesec,
  u32,
  valtype,
  vec,
} from './chapter03.js';

// mark(6:10)
const grammarDef = `
  Wafer {
    Main = Expr
    Expr = number

    //+ "x", "élan", "_", "_99"
    //- "1", "$nope"
    identifier = identStart identPart*
    identStart = letter | "_"
    identPart = letter | "_" | digit

    number = digit+

    // Examples:
    //+ "42", "1"
    //- "abc"
  }
`;

test('Extracted examples', () => testExtractedExamples(grammarDef));

test.run();
