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
  }
`;

const wafer = ohm.grammar(grammarDef);

test('Wafer', () => {
  assert.ok(wafer.match('42').succeeded());
  assert.ok(wafer.match('1').succeeded());
  assert.ok(wafer.match('abc').failed());
});
