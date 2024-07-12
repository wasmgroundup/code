import assert from 'node:assert';
import * as ohm from 'ohm-js';
import { extractExamples } from 'ohm-js/extras';
import process from 'node:process';
import nodeTest from 'node:test';
import { fileURLToPath } from 'node:url';

function makeTestFn(url) {
  if (process.env.NODE_TEST_CONTEXT && process.argv[1] === fileURLToPath(url)) {
    return (...args) => nodeTest(...args); // register the test normally
  }
  return () => {}; // ignore the test
}

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

makeTestFn(import.meta.url);

instr.i32 = { const: 0x41 };
instr.i64 = { const: 0x42 };
instr.f32 = { const: 0x43 };
instr.f64 = { const: 0x44 };

const valtype = {
  i32: 0x7f,
  i64: 0x7e,
  f32: 0x7d,
  f64: 0x7c,
};

function testExtractedExamples(grammarSource) {
  const grammar = ohm.grammar(grammarSource);
  for (const ex of extractExamples(grammarSource)) {
    const result = grammar.match(ex.example, ex.rule);
    assert.strictEqual(result.succeeded(), ex.shouldMatch, JSON.stringify(ex));
  }
}

function loadMod(bytes) {
  const mod = new WebAssembly.Module(bytes);
  return new WebAssembly.Instance(mod).exports;
}

makeTestFn(import.meta.url);

instr.i32.add = 0x6a;
instr.i32.sub = 0x6b;
instr.i32.mul = 0x6c;
instr.i32.div_s = 0x6d;

export {
  SECTION_ID_CODE,
  SECTION_ID_EXPORT,
  SECTION_ID_FUNCTION,
  SECTION_ID_TYPE,
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
  loadMod,
  magic,
  makeTestFn,
  module,
  name,
  section,
  stringToBytes,
  testExtractedExamples,
  typeidx,
  typesec,
  u32,
  valtype,
  vec,
  version,
};
