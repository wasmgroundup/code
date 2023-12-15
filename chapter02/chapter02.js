import {
  code,
  codesec,
  export_,
  exportdesc,
  exportsec,
  func,
  funcsec,
  functype,
  instr,
  module,
  typeidx,
  typesec,
  i32,
} from './chapter01.js';

instr.i32 = { const: 0x41 };
instr.i64 = { const: 0x42 };
instr.f32 = { const: 0x43 };
instr.f64 = { const: 0x44 };

const valtype = {
  i32: 0x7f,
  i64: 0x7e,
  f32: 0x7d,
  f64: 0x7c,
};

import * as ohm from 'ohm-js';
import { extractExamples } from 'ohm-js/extras';
import * as assert from 'uvu/assert';

function testExtractedExamples(grammarSource) {
  const grammar = ohm.grammar(grammarSource);
  for (const ex of extractExamples(grammarSource)) {
    const result = grammar.match(ex.example, ex.rule);
    assert.is(result.succeeded(), ex.shouldMatch, JSON.stringify(ex));
  }
}

export * from './chapter01.js';
export { testExtractedExamples, valtype };
