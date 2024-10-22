import assert from 'node:assert';
import * as ohm from 'ohm-js';

import {
  buildSymbolTable,
  code,
  codesec,
  export_,
  exportdesc,
  exportsec,
  func,
  funcidx,
  funcsec,
  functype,
  i32,
  instr,
  loadMod,
  localidx,
  locals,
  makeTestFn,
  module,
  resolveSymbol,
  testExtractedExamples,
  typeidx,
  typesec,
  valtype,
} from '../chapter04.js';

const test = makeTestFn(import.meta.url);

function buildModule() {
  const functionDecls = [
    {
      name: 'main',
      locals: [locals(1, valtype.i32)],
      body: [instr.i32.const, i32(42), instr.end],
    },
    {
      name: 'backup',
      locals: [],
      body: [instr.i32.const, i32(43), instr.end],
    },
  ];
  const funcs = functionDecls.map((f) => typeidx(0));
  const codes = functionDecls.map((f) => code(func(f.locals, f.body)));
  const exports = functionDecls.map((f, i) =>
    export_(f.name, exportdesc.func(i)),
  );

  const mod = module([
    typesec([functype([], [valtype.i32])]),
    funcsec(funcs),
    exportsec(exports),
    codesec(codes),
  ]);
  return Uint8Array.from(mod.flat(Infinity));
}

test('buildModule', () => {
  const exports = loadMod(buildModule());
  assert.strictEqual(exports.main(), 42);
  assert.strictEqual(exports.backup(), 43);
});
