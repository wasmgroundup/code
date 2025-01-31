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
  NopLang {
    Main = ""
  }
`;

const grammar = ohm.grammar(grammarDef);

const matchResult = grammar.match('');

test('NopLang', () => {
  assert.strictEqual(matchResult.succeeded(), true);
  assert.strictEqual(grammar.match('3').succeeded(), false);
});
