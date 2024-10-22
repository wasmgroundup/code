import assert from 'node:assert';
import * as ohm from 'ohm-js';
import {extractExamples} from 'ohm-js/extras';

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
  makeTestFn,
  module,
  typeidx,
  typesec,
} from '../chapter01.js';

const test = makeTestFn(import.meta.url);

const grammarDef = `
    Wafer {
      Main = number
      number = digit+

      // Examples:
      //+ "42", "1"
      //- "abc"
    }
  `;

function testExtractedExamples(grammarSource) {
  const grammar = ohm.grammar(grammarSource);
  for (const ex of extractExamples(grammarSource)) {
    const result = grammar.match(ex.example, ex.rule);
    assert.strictEqual(result.succeeded(), ex.shouldMatch, JSON.stringify(ex));
  }
}

test('Extracted examples', () => testExtractedExamples(grammarDef));
