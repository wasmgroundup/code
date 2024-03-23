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
  mem,
  memidx,
  memsec,
  module,
  section,
  stringToBytes,
  typeidx,
  typesec,
  u32,
  valtype,
  vec,
} from './chapter07.js';

const test = makeTestFn(import.meta.url);

const SECTION_ID_TABLE = 4;

function tabletype(elemtype, limits) {
  return [elemtype, limits];
}

function table(tabletype) {
  return tabletype;
}

function tablesec(tables) {
  return section(SECTION_ID_TABLE, vec(tables));
}

const elemtype = { funcref: 0x70 };

const tableidx = u32;

exportdesc.table = (idx) => [0x01, tableidx(idx)];

instr.call_indirect = 0x11;

function compileTable() {
  const mod = module([
    typesec([functype([], [valtype.i32])]),
    funcsec([typeidx(0), typeidx(0), typeidx(0)]),
    tablesec([table(tabletype(elemtype.funcref, limits.min(64, 1024)))]),
    exportsec([
      export_('main', exportdesc.func(0)),
      export_('f1', exportdesc.func(1)),
      export_('f2', exportdesc.func(2)),
      export_('mytable', exportdesc.table(0)),
    ]),
    codesec([
      code(
        func(
          [],
          [
            // 0 in stack is index of table entry
            instr.i32.const,
            i32(0),
            // call function in index 0 (in stack above) that has
            // to have type specified in typeindex 0 in type table (below)
            instr.call_indirect,
            typeidx(0),
            tableidx(0x00),
            instr.end,
          ]
        )
      ),
      code(func([], [instr.i32.const, u32(42), instr.end])),
      code(func([], [instr.i32.const, u32(43), instr.end])),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileTable works', async () => {
  const { instance } = await WebAssembly.instantiate(compileTable());

  assert.ok(instance.exports.mytable instanceof WebAssembly.Table);
  instance.exports.mytable.set(0, instance.exports.f1);
  assert.strictEqual(instance.exports.main(), 42);
  instance.exports.mytable.set(0, instance.exports.f2);
  assert.strictEqual(instance.exports.main(), 43);
});

const SECTION_ID_DATA = 11;

// x:memidx  e:expr  b∗:vec(byte)
function data(x, e, bs) {
  return [x, e, vec(bs)];
}

function datasec(segs) {
  return section(SECTION_ID_DATA, vec(segs));
}

function compileDataSection() {
  const mod = module([
    memsec([mem(limits.minmax(16, 32))]),
    exportsec([export_('mem', exportdesc.mem(0))]),
    datasec([
      data(
        memidx(0),
        [instr.i32.const, i32(0), instr.end],
        stringToBytes('hello ')
      ),
      data(
        memidx(0),
        [instr.i32.const, i32(6), instr.end],
        stringToBytes('world!')
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileDataSection works', async () => {
  const { instance } = await WebAssembly.instantiate(compileDataSection());

  const mem = new Uint8Array(instance.exports.mem.buffer);
  const expected = 'hello world!';
  const bytes = mem.slice(0, expected.length);
  const actual = new TextDecoder().decode(bytes);

  assert.strictEqual(actual, expected);
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
    tablesec([table(tabletype(elemtype.funcref, limits.min(64, 1024)))]),
    exportsec([
      export_('f1', exportdesc.func(0)),
      export_('f2', exportdesc.func(1)),
      export_('mytable', exportdesc.table(0)),
    ]),
    elemsec([
      elem(tableidx(0), [instr.i32.const, i32(0), instr.end], [funcidx(0)]),
      elem(tableidx(0), [instr.i32.const, i32(1), instr.end], [funcidx(1)]),
    ]),
    codesec([
      code(func([], [instr.i32.const, u32(42), instr.end])),
      code(func([], [instr.i32.const, u32(43), instr.end])),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileElementSection works', async () => {
  const { instance } = await WebAssembly.instantiate(compileElementSection());

  assert.strictEqual(
    instance.exports.mytable instanceof WebAssembly.Table,
    true
  );
  assert.strictEqual(instance.exports.mytable.get(0), instance.exports.f1);
  assert.strictEqual(instance.exports.mytable.get(1), instance.exports.f2);
});

export * from './chapter07.js';
export { elemtype, SECTION_ID_TABLE, table, tableidx, tablesec, tabletype };
