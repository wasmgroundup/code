import { setup } from '../book.js';

const { test, assert } = setup('chapter01');

test('compileVoidLang works for empty string', () => {
  const bytes = compileVoidLang('');
  assert.is(ArrayBuffer.isView(bytes), true);
  assert.throws(() => compileVoidLang('42'));
});

test('compileVoidLang result compiles to a WebAssembly object', async () => {
  const { instance, module } = await WebAssembly.instantiate(
    compileVoidLang('')
  );

  assert.is(instance instanceof WebAssembly.Instance, true);
  assert.is(module instanceof WebAssembly.Module, true);
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

function compileVoidLang(code) {
  if (code === '') {
    const bytes = [magic(), version()].flat(Infinity);
    return Uint8Array.from(bytes);
  } else {
    throw new Error(`Expected empty code, got: "${code}"`);
  }
}

function u32(v) {
  if (v <= 127) {
    return [v];
  } else {
    throw new Error('Not Implemented');
  }
}

function vec(elements) {
  return [u32(elements.length), ...elements];
}

function section(id, contents) {
  const sizeInBytes = contents.flat(Infinity).length;
  return [id, u32(sizeInBytes), contents];
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

test('compileNopLang compiles to a wasm module', async () => {
  const { instance, module } = await WebAssembly.instantiate(
    compileNopLang('')
  );

  assert.is(instance instanceof WebAssembly.Instance, true);
  assert.is(module instanceof WebAssembly.Module, true);
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

test.run();
