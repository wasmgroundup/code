import assert from 'node:assert';
import process from 'node:process';
import {default as nodeTest} from 'node:test';
import {fileURLToPath} from 'node:url';

function compileVoidLang(code) {
  if (code === '') {
    const bytes = [magic(), version()].flat(Infinity);
    return Uint8Array.from(bytes);
  } else {
    throw new Error(`Expected empty code, got: "${code}"`);
  }
}

function makeTestFn(url) {
  if (process.env.NODE_TEST_CONTEXT && process.argv[1] === fileURLToPath(url)) {
    return (...args) => nodeTest(...args); // register the test normally
  }
  return () => {}; // ignore the test
}

const test = makeTestFn(import.meta.url);

test('compileVoidLang result compiles to a WebAssembly object', async () => {
  const {instance, module} = await WebAssembly.instantiate(compileVoidLang(''));

  assert.strictEqual(instance instanceof WebAssembly.Instance, true);
  assert.strictEqual(module instanceof WebAssembly.Module, true);
});

function stringToBytes(s) {
  const bytes = new TextEncoder().encode(s);
  return Array.from(bytes);
}

function int32ToBytes(v) {
  return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff];
}

function magic() {
  // [0x00, 0x61, 0x73, 0x6d]
  return stringToBytes('\0asm');
}

function version() {
  // [0x01, 0x00, 0x00, 0x00]
  return int32ToBytes(1);
}

// for simplicity we include the complete implementation of u32 and i32 here
// this allows the next chapters to use all the functionality from this chapter
// without having to redefine or patch the complete definitions

const SEVEN_BIT_MASK_BIG_INT = 0b01111111n;
const CONTINUATION_BIT = 0b10000000;

function u32(v) {
  let val = BigInt(v);
  let more = true;
  const r = [];

  while (more) {
    const b = Number(val & SEVEN_BIT_MASK_BIG_INT);
    val = val >> 7n;
    more = val !== 0n;
    if (more) {
      r.push(b | CONTINUATION_BIT);
    } else {
      r.push(b);
    }
  }

  return r;
}

function i32(v) {
  let val = BigInt(v);
  const r = [];

  let more = true;
  while (more) {
    const b = Number(val & 0b01111111n);
    const signBitSet = !!(b & 0x40);

    val = val >> 7n;

    if ((val === 0n && !signBitSet) || (val === -1n && signBitSet)) {
      more = false;
      r.push(b);
    } else {
      r.push(b | CONTINUATION_BIT);
    }
  }

  return r;
}

function section(id, contents) {
  const sizeInBytes = contents.flat(Infinity).length;
  return [id, u32(sizeInBytes), contents];
}

function vec(elements) {
  return [u32(elements.length), ...elements];
}

const SECTION_ID_TYPE = 1;

const TYPE_FUNCTION = 0x60;

function functype(paramTypes, resultTypes) {
  return [TYPE_FUNCTION, vec(paramTypes), vec(resultTypes)];
}

function typesec(functypes) {
  return section(SECTION_ID_TYPE, vec(functypes));
}

const SECTION_ID_FUNCTION = 3;

const typeidx = u32;

function funcsec(typeidxs) {
  return section(SECTION_ID_FUNCTION, vec(typeidxs));
}

const SECTION_ID_CODE = 10;

const instr = {};
instr.end = 0x0b;

function code(func) {
  const sizeInBytes = func.flat(Infinity).length;
  return [u32(sizeInBytes), func];
}

function func(locals, body) {
  return [vec(locals), body];
}

function codesec(codes) {
  return section(SECTION_ID_CODE, vec(codes));
}

function compileNopLang(source) {
  if (source !== '') {
    throw new Error(`Expected empty code, got: "${source}"`);
  }

  const mod = module([
    typesec([functype([], [])]),
    funcsec([typeidx(0)]),
    exportsec([export_('main', exportdesc.func(0))]),
    codesec([code(func([], [instr.end]))]),
  ]);
  return Uint8Array.from(mod.flat(Infinity));
}

test('compileNopLang compiles to a wasm module', async () => {
  const {instance, module} = await WebAssembly.instantiate(compileNopLang(''));

  assert.strictEqual(instance instanceof WebAssembly.Instance, true);
  assert.strictEqual(module instanceof WebAssembly.Module, true);
});

const SECTION_ID_EXPORT = 7;

function name(s) {
  return vec(stringToBytes(s));
}

function export_(nm, exportdesc) {
  return [name(nm), exportdesc];
}

function exportsec(exports) {
  return section(SECTION_ID_EXPORT, vec(exports));
}

const funcidx = u32;

const exportdesc = {
  func(idx) {
    return [0x00, funcidx(idx)];
  },
};

function module(sections) {
  return [magic(), version(), sections];
}

test('compileNopLang result compiles to a wasm module', async () => {
  const {instance} = await WebAssembly.instantiate(compileNopLang(''));

  assert.strictEqual(instance.exports.main(), undefined);
  assert.throws(() => compileNopLang('42'));
});

export {
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
  int32ToBytes,
  magic,
  makeTestFn,
  module,
  name,
  section,
  SECTION_ID_CODE,
  SECTION_ID_EXPORT,
  SECTION_ID_FUNCTION,
  SECTION_ID_TYPE,
  stringToBytes,
  typeidx,
  typesec,
  u32,
  vec,
  version,
};
