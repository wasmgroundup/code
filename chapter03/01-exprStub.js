import { setup } from '../book.js';

const { test, assert, ohm } = setup('chapter03');

import { i32, instr, testExtractedExamples } from './chapter02.js';

const grammarDef = `
  Wafer {
    Main = Expr
    Expr = number
    number = digit+

    // Examples:
    //+ "42", "1"
    //- "abc"
  }
`;

test('Extracted examples', () => testExtractedExamples(grammarDef));

test.run();
