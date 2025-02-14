import assert from 'node:assert';

import {
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
  limits,
  makeTestFn,
  memidx,
  module,
  section,
  typeidx,
  typesec,
  u32,
  valtype,
  vec,
} from './chapter11.js';

const test = makeTestFn(import.meta.url);

exportdesc.table = (idx) => [0x01, tableidx(idx)];
exportdesc.mem = (idx) => [0x02, memidx(idx)];
exportdesc.global = (idx) => [0x03, globalidx(idx)];

const SECTION_ID_START = 8;

const start = (x) => funcidx(x);

// st:start
function startsec(st) {
  return section(SECTION_ID_START, st);
}

function compileStartFunction() {
  const mod = module([
    typesec([functype([], [])]),
    funcsec([typeidx(0)]),
    globalsec([
      global(globaltype(valtype.i32, mut.var), [
        [instr.i32.const, i32(0), instr.end],
      ]),
    ]),
    exportsec([export_('g', exportdesc.global(0))]),
    startsec(start(0)),
    codesec([
      code(
        func(
          [],
          [
            // g = 42
            [instr.i32.const, i32(42)],
            [instr.global.set, globalidx(0)],
            instr.end,
          ],
        ),
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileStartFunction works', async () => {
  const {instance} = await WebAssembly.instantiate(compileStartFunction());

  assert.strictEqual(instance.exports.g.value, 42);
});

instr.global = {};
instr.global.get = 0x23;
instr.global.set = 0x24;

const globalidx = (x) => u32(x);

const SECTION_ID_GLOBAL = 6;

const mut = {
  const: 0x00,
  var: 0x01,
};

// t:valtype  m:mut
function globaltype(t, m) {
  return [t, m];
}

// gt:globaltype  e:expr
function global(gt, e) {
  return [gt, e];
}

// glob*:vec(global)
function globalsec(globs) {
  return section(SECTION_ID_GLOBAL, vec(globs));
}

function compileGlobals() {
  const mod = module([
    typesec([functype([], [valtype.i32])]),
    funcsec([typeidx(0)]),
    globalsec([
      // var a = 10
      global(globaltype(valtype.i32, mut.var), [
        [instr.i32.const, i32(10), instr.end],
      ]),
      // const b = 30
      global(globaltype(valtype.i32, mut.const), [
        [instr.i32.const, i32(30), instr.end],
      ]),
    ]),
    exportsec([export_('main', exportdesc.func(0))]),
    codesec([
      code(
        func(
          [],
          [
            // a = 12
            [instr.i32.const, i32(12)],
            [instr.global.set, globalidx(0)],

            // return a + b
            [instr.global.get, globalidx(0)],
            [instr.global.get, globalidx(1)],
            instr.i32.add,
            instr.end,
          ],
        ),
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileGlobals works', async () => {
  const {instance} = await WebAssembly.instantiate(compileGlobals());

  assert.strictEqual(instance.exports.main(), 42);
});

const SECTION_ID_TABLE = 4;

const elemtype = {funcref: 0x70};

// et:elemtype  lim:limits
function tabletype(et, lim) {
  return [et, lim];
}

// tt:tabletype
function table(tt) {
  return tt;
}

function tablesec(tables) {
  return section(SECTION_ID_TABLE, vec(tables));
}

const tableidx = (x) => u32(x);

instr.call_indirect = 0x11; // [i32] -> []

function compileTable() {
  const mod = module([
    typesec([functype([], [valtype.i32])]),
    funcsec([typeidx(0), typeidx(0), typeidx(0)]),
    tablesec([table(tabletype(elemtype.funcref, limits.min(64)))]),
    exportsec([
      export_('doCall', exportdesc.func(0)),
      export_('fourtyTwo', exportdesc.func(1)),
      export_('fourtyThree', exportdesc.func(2)),
      export_('mytable', exportdesc.table(0)),
    ]),
    codesec([
      // main
      code(
        func(
          [],
          [
            [instr.i32.const, i32(13)], // Index of table entry
            [instr.call_indirect, typeidx(0), tableidx(0)],
            instr.end,
          ],
        ),
      ),
      // fourtyTwo
      code(func([], [[instr.i32.const, i32(42)], instr.end])),
      // fourtyThree
      code(func([], [[instr.i32.const, i32(43)], instr.end])),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileTable works', async () => {
  const {instance} = await WebAssembly.instantiate(compileTable());

  assert.ok(instance.exports.mytable instanceof WebAssembly.Table);

  instance.exports.mytable.set(13, instance.exports.fourtyTwo);
  assert.strictEqual(instance.exports.doCall(), 42);

  instance.exports.mytable.set(13, instance.exports.fourtyThree);
  assert.strictEqual(instance.exports.doCall(), 43);
});

test('compileTable with uninitialized table fails', async () => {
  const {instance} = await WebAssembly.instantiate(compileTable());
  assert.throws(
    () => instance.exports.doCall(),
    /^RuntimeError: null function or function signature mismatch$/,
  );
});

const SECTION_ID_ELEMENT = 9;

// x:tableidx  e:expr  y∗:vec(funcidx)
function elem(x, e, ys) {
  return [x, e, vec(ys)];
}

function elemsec(segs) {
  return section(SECTION_ID_ELEMENT, vec(segs));
}

function compileElementSection() {
  const mod = module([
    typesec([functype([], [valtype.i32])]),
    funcsec([typeidx(0), typeidx(0)]),
    tablesec([table(tabletype(elemtype.funcref, limits.min(64)))]),
    exportsec([
      export_('fourtyTwo', exportdesc.func(0)),
      export_('fourtyThree', exportdesc.func(1)),
      export_('mytable', exportdesc.table(0)),
    ]),
    elemsec([
      elem(tableidx(0), [[instr.i32.const, i32(0)], instr.end], [funcidx(0)]),
      elem(tableidx(0), [[instr.i32.const, i32(1)], instr.end], [funcidx(1)]),
    ]),
    codesec([
      code(func([], [[instr.i32.const, i32(42)], instr.end])),
      code(func([], [[instr.i32.const, i32(43)], instr.end])),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileElementSection works', async () => {
  const {instance} = await WebAssembly.instantiate(compileElementSection());
  const {mytable, fourtyTwo, fourtyThree} = instance.exports;

  assert.strictEqual(mytable instanceof WebAssembly.Table, true);
  assert.strictEqual(mytable.get(0), fourtyTwo);
  assert.strictEqual(mytable.get(1), fourtyThree);
});

export * from './chapter11.js';
export {elemtype, SECTION_ID_TABLE, table, tableidx, tablesec, tabletype};
