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
    memsec([mem(memtype(limits.min(1)))]),
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
      body: [
        [instr.i32.const, i32(40), [instr.memory.grow, memidx(0)]],
        [instr.memory.size, memidx(0)],
        instr.i32.add,
        instr.end,
      ],
    },
  ];
  const exports = loadMod(buildModule(importDecls, functionDecls));
  assert.ok(exports.$waferMemory);
  assert.strictEqual(exports.main(), 42);

  const PAGE_SIZE_IN_BYTES = 64 * 1024;
  assert.strictEqual(
    exports.$waferMemory.buffer.byteLength,
    PAGE_SIZE_IN_BYTES * 41,
  );
});

instr.memory = {
  size: 0x3f, // [] -> [i32]
  grow: 0x40, // [i32] -> [i32]
};

instr.i32.load = 0x28; // [i32] -> [i32]
instr.i32.store = 0x36; // [i32, i32] -> []

// align:u32, offset:u32
function memarg(align, offset) {
  return [u32(align), u32(offset)];
}

test('load and store', () => {
  const importDecls = [];
  const functionDecls = [
    {
      name: 'main',
      paramTypes: [],
      resultType: valtype.i32,
      locals: [],
      body: [
        [instr.i32.const, i32(4)], // offset (destination)
        [instr.i32.const, i32(42)], // value
        [instr.i32.store, memarg(0, 0)],
        [instr.i32.const, i32(4)],
        [instr.i32.load, memarg(0, 0)],
        instr.end,
      ],
    },
  ];
  const exports = loadMod(buildModule(importDecls, functionDecls));
  assert.equal(exports.main(), 42);

  const view = new DataView(exports.$waferMemory.buffer);
  assert.equal(view.getInt32(4, true), 42);
});
