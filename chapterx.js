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
} from './chapterd3.js';

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

instr.nop = 0x1;
instr.br_table = 0xe;
instr.return = 0xf;
instr.select = 0x1b;
instr.i64.load = 0x29;
instr.f32.load = 0x2a;
instr.f64.load = 0x2b;
instr.i32.load8_s = 0x2c;
instr.i32.load8_u = 0x2d;
instr.i32.load16_s = 0x2e;
instr.i32.load16_u = 0x2f;
instr.i64.load8_s = 0x30;
instr.i64.load8_u = 0x31;
instr.i64.load16_s = 0x32;
instr.i64.load16_u = 0x33;
instr.i64.load32_s = 0x34;
instr.i64.load32_u = 0x35;
instr.i64.store = 0x37;
instr.f32.store = 0x38;
instr.f64.store = 0x39;
instr.i32.store8 = 0x3a;
instr.i32.store16 = 0x3b;
instr.i64.store8 = 0x3c;
instr.i64.store16 = 0x3d;
instr.i64.store32 = 0x3e;
instr.i64.eqz = 0x50;
instr.i64.eq = 0x51;
instr.i64.ne = 0x52;
instr.i64.lt_s = 0x53;
instr.i64.lt_u = 0x54;
instr.i64.gt_s = 0x55;
instr.i64.gt_u = 0x56;
instr.i64.le_s = 0x57;
instr.i64.le_u = 0x58;
instr.i64.ge_s = 0x59;
instr.i64.ge_u = 0x5a;
instr.f32.eq = 0x5b;
instr.f32.ne = 0x5c;
instr.f32.lt = 0x5d;
instr.f32.gt = 0x5e;
instr.f32.le = 0x5f;
instr.f32.ge = 0x60;
instr.f64.eq = 0x61;
instr.f64.ne = 0x62;
instr.f64.lt = 0x63;
instr.f64.gt = 0x64;
instr.f64.le = 0x65;
instr.f64.ge = 0x66;
instr.i32.clz = 0x67;
instr.i32.ctz = 0x68;
instr.i32.popcnt = 0x69;
instr.i32.div_u = 0x6e;
instr.i32.rem_s = 0x6f;
instr.i32.rem_u = 0x70;
instr.i32.xor = 0x73;
instr.i32.shl = 0x74;
instr.i32.shr_s = 0x75;
instr.i32.shr_u = 0x76;
instr.i32.rotl = 0x77;
instr.i32.rotr = 0x78;
instr.i64.clz = 0x79;
instr.i64.ctz = 0x7a;
instr.i64.popcnt = 0x7b;
instr.i64.add = 0x7c;
instr.i64.sub = 0x7d;
instr.i64.mul = 0x7e;
instr.i64.div_s = 0x7f;
instr.i64.div_u = 0x80;
instr.i64.rem_s = 0x81;
instr.i64.rem_u = 0x82;
instr.i64.and = 0x83;
instr.i64.or = 0x84;
instr.i64.xor = 0x85;
instr.i64.shl = 0x86;
instr.i64.shr_s = 0x87;
instr.i64.shr_u = 0x88;
instr.i64.rotl = 0x89;
instr.i64.rotr = 0x8a;
instr.f32.abs = 0x8b;
instr.f32.neg = 0x8c;
instr.f32.ceil = 0x8d;
instr.f32.floor = 0x8e;
instr.f32.trunc = 0x8f;
instr.f32.nearest = 0x90;
instr.f32.sqrt = 0x91;
instr.f32.add = 0x92;
instr.f32.sub = 0x93;
instr.f32.mul = 0x94;
instr.f32.div = 0x95;
instr.f32.min = 0x96;
instr.f32.max = 0x97;
instr.f32.copysign = 0x98;
instr.f64.abs = 0x99;
instr.f64.neg = 0x9a;
instr.f64.ceil = 0x9b;
instr.f64.floor = 0x9c;
instr.f64.trunc = 0x9d;
instr.f64.nearest = 0x9e;
instr.f64.sqrt = 0x9f;
instr.f64.add = 0xa0;
instr.f64.sub = 0xa1;
instr.f64.mul = 0xa2;
instr.f64.div = 0xa3;
instr.f64.min = 0xa4;
instr.f64.max = 0xa5;
instr.f64.copysign = 0xa6;
instr.i32.wrap_i64 = 0xa7;
instr.i32.trunc_f32_s = 0xa8;
instr.i32.trunc_f32_u = 0xa9;
instr.i32.trunc_f64_s = 0xaa;
instr.i32.trunc_f64_u = 0xab;
instr.i64.extend_i32_s = 0xac;
instr.i64.extend_i32_u = 0xad;
instr.i64.trunc_f32_s = 0xae;
instr.i64.trunc_f32_u = 0xaf;
instr.i64.trunc_f64_s = 0xb0;
instr.i64.trunc_f64_u = 0xb1;
instr.f32.convert_i32_s = 0xb2;
instr.f32.convert_i32_u = 0xb3;
instr.f32.convert_i64_s = 0xb4;
instr.f32.convert_i64_u = 0xb5;
instr.f32.demote_f64 = 0xb6;
instr.f64.convert_i32_s = 0xb7;
instr.f64.convert_i32_u = 0xb8;
instr.f64.convert_i64_s = 0xb9;
instr.f64.convert_i64_u = 0xba;
instr.f64.promote_f32 = 0xbb;
instr.i32.reinterpret_f32 = 0xbc;
instr.i64.reinterpret_f64 = 0xbd;
instr.f32.reinterpret_i32 = 0xbe;
instr.f64.reinterpret_i64 = 0xbf;

export * from './chapterd3.js';
export {elemtype, SECTION_ID_TABLE, table, tableidx, tablesec, tabletype};
