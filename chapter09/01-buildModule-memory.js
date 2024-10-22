import assert from 'node:assert';
import * as ohm from 'ohm-js';

import {
  blocktype,
  code,
  codesec,
  defineFunctionDecls,
  defineImportDecls,
  export_,
  exportdesc,
  exportsec,
  func,
  funcidx,
  funcsec,
  functype,
  i32,
  import_,
  importdesc,
  importsec,
  instr,
  labelidx,
  localidx,
  loadMod,
  makeTestFn,
  module,
  resolveSymbol,
  section,
  testExtractedExamples,
  typeidx,
  typesec,
  u32,
  valtype,
  vec,
} from '../chapter08.js';

const test = makeTestFn(import.meta.url);

const SECTION_ID_MEMORY = 5;

function memsec(mems) {
  return section(SECTION_ID_MEMORY, vec(mems));
}

function mem(memtype) {
  return memtype;
}

function memtype(limits) {
  return limits;
}

const limits = {
  // n:u32
  min(n) {
    return [0x00, u32(n)];
  },
  // n:u32, m:u32
  minmax(n, m) {
    return [0x01, u32(n), u32(m)];
  },
};

const memidx = u32;

exportdesc.mem = (idx) => [0x02, memidx(idx)];

function buildModule(importDecls, functionDecls) {
  const types = [...importDecls, ...functionDecls].map((f) =>
    functype(f.paramTypes, [f.resultType]),
  );
  const imports = importDecls.map((f, i) =>
    import_(f.module, f.name, importdesc.func(i)),
  );
  const funcs = functionDecls.map((f, i) => typeidx(i + importDecls.length));
  const codes = functionDecls.map((f) => code(func(f.locals, f.body)));
  const exports = functionDecls.map((f, i) =>
    export_(f.name, exportdesc.func(i + importDecls.length)),
  );
  exports.push(export_('$waferMemory', exportdesc.mem(0)));

  const mod = module([
    typesec(types),
    importsec(imports),
    funcsec(funcs),
    memsec([mem(limits.min(1))]),
    exportsec(exports),
    codesec(codes),
  ]);
  return Uint8Array.from(mod.flat(Infinity));
}

test('buildModule with memory', () => {
  const importDecls = [];
  const functionDecls = [
    {
      name: 'main',
      paramTypes: [],
      resultType: valtype.i32,
      locals: [],
      body: [[instr.i32.const, i32(42)], instr.end],
    },
  ];
  const exports = loadMod(buildModule(importDecls, functionDecls));
  assert.ok(exports.$waferMemory);
  assert.strictEqual(exports.main(), 42);
});
