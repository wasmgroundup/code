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

const wafer = ohm.grammar(grammarDef);

const semantics = wafer.createSemantics();
semantics.addOperation('jsValue', {
  Main(num) {
    // To evaluate a program, we need to evaluate the number.
    return num.jsValue();
  },
  number(digits) {
    // Evaluate the number with JavaScript's built in `parseInt` function.
    return parseInt(this.sourceString, 10);
  },
});

test('jsValue', () => {
  const getJsValue = (input) => semantics(wafer.match(input)).jsValue();
  assert.equal(getJsValue('42'), 42);
  assert.equal(getJsValue('0'), 0);
  assert.equal(getJsValue('99'), 99);
});
