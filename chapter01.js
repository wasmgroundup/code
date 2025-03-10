import assert from 'node:assert';
import {basename} from 'node:path';
import process from 'node:process';
import {default as nodeTest} from 'node:test';
import {fileURLToPath} from 'node:url';

function makeTestFn(url) {
  const filename = fileURLToPath(url);
  // Return a function with the same interface as Node's `test` function.
  return (name, ...args) => {
    // Only register the test if the current module is on the command line.
    // All other tests are ignored.
    if (process.argv[1] === filename) {
      // Add the chapter name to the test description.
      const chapterName = basename(filename, '.js');
      nodeTest(`[${chapterName}] ${name}`, ...args);
    }
  };
}

const test = makeTestFn(import.meta.url);

test('setup', () => {
  assert(true);
});

function compileVoidLang(code) {
  if (code !== '') {
    throw new Error(`Expected empty code, got: "${code}"`);
  }
  const bytes = [magic(), version()].flat(Infinity);
  return Uint8Array.from(bytes);
}

test('compileVoidLang result compiles to a WebAssembly object', async () => {
  const {instance, module} = await WebAssembly.instantiate(compileVoidLang(''));

  assert.strictEqual(instance instanceof WebAssembly.Instance, true);
  assert.strictEqual(module instanceof WebAssembly.Module, true);
});

function stringToBytes(s) {
  const bytes = new TextEncoder().encode(s);
  return Array.from(bytes);
}

function magic() {
  // [0x00, 0x61, 0x73, 0x6d]
  return stringToBytes('\0asm');
}

function version() {
  return [0x01, 0x00, 0x00, 0x00];
}

// for simplicity we include the complete implementation of u32 and i32 here
// this allows the next chapters to use all the functionality from this chapter
// without having to redefine or patch the complete definitions

const CONTINUATION_BIT = 0b10000000;
const SEVEN_BIT_MASK_BIG_INT = 0b01111111n;

function leb128(v) {
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

const MIN_U32 = 0;
const MAX_U32 = 2 ** 32 - 1;

function u32(v) {
  if (v < MIN_U32 || v > MAX_U32) {
    throw Error(`Value out of range for u32: ${v}`);
  }

  return leb128(v);
}

function sleb128(v) {
  let val = BigInt(v);
  let more = true;
  const r = [];

  while (more) {
    const b = Number(val & SEVEN_BIT_MASK_BIG_INT);
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

const MIN_I32 = -(2 ** 32 / 2);
const MAX_I32 = 2 ** 32 / 2 - 1;
const I32_NEG_OFFSET = 2 ** 32;

function i32(v) {
  if (v < MIN_I32 || v > MAX_U32) {
    throw Error(`Value out of range for i32: ${v}`);
  }

  if (v > MAX_I32) {
    return sleb128(v - I32_NEG_OFFSET);
  }

  return sleb128(v);
}

function section(id, contents) {
  const sizeInBytes = contents.flat(Infinity).length;
  return [id, u32(sizeInBytes), contents];
}

function vec(elements) {
  return [u32(elements.length), elements];
}

const SECTION_ID_TYPE = 1;

function functype(paramTypes, resultTypes) {
  return [0x60, vec(paramTypes), vec(resultTypes)];
}

function typesec(functypes) {
  return section(SECTION_ID_TYPE, vec(functypes));
}

const SECTION_ID_FUNCTION = 3;

const typeidx = (x) => u32(x);

function funcsec(typeidxs) {
  return section(SECTION_ID_FUNCTION, vec(typeidxs));
}

const SECTION_ID_CODE = 10;

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

const instr = {
  end: 0x0b,
};

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

const funcidx = (x) => u32(x);

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
