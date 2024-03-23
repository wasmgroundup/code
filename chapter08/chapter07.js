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

makeTestFn(import.meta.url);

instr.local = {};
instr.local.get = 0x20;
instr.local.set = 0x21;
instr.local.tee = 0x22;

function locals(n, type) {
  return [u32(n), type];
}

const localidx = u32;

function buildSymbolTable(grammar, matchResult) {
  const tempSemantics = grammar.createSemantics();
  const symbols = new Map();
  symbols.set('main', new Map());
  tempSemantics.addOperation('buildSymbolTable', {
    _default(...children) {
      return children.forEach((c) => c.buildSymbolTable());
    },
    LetStatement(_let, id, _eq, _expr, _) {
      const name = id.sourceString;
      const idx = symbols.get('main').size;
      const info = { name, idx, what: 'local' };
      symbols.get('main').set(name, info);
    },
  });
  tempSemantics(matchResult).buildSymbolTable();
  return symbols;
}

function resolveSymbol(identNode, locals) {
  const identName = identNode.sourceString;
  if (locals.has(identName)) {
    return locals.get(identName);
  }
  throw new Error(`Error: undeclared identifier '${identName}'`);
}

instr.drop = 0x1a;

makeTestFn(import.meta.url);

instr.call = 0x10;

instr.global = {};
instr.global.get = 0x23;
instr.global.set = 0x24;

const globalidx = u32;

exportdesc.global = (idx) => [0x03, globalidx(idx)];

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

const SECTION_ID_IMPORT = 2;

// mod:name  nm:name  d:importdesc
function import_(mod, nm, d) {
  return [name(mod), name(nm), d];
}

// im*:vec(import)
function importsec(ims) {
  return section(SECTION_ID_IMPORT, vec(ims));
}

const importdesc = {
  // x:typeidx
  func(x) {
    return [0x00, funcidx(x)];
  },
  global(globaltype) {
    return [0x03, globaltype];
  },
};

const SECTION_ID_START = 8;

const start = funcidx;

// st:start
function startsec(st) {
  return section(SECTION_ID_START, st);
}

makeTestFn(import.meta.url);

// a == 0
instr.i32.eqz = 0x45;
// a == b
instr.i32.eq = 0x46;
// a !== b
instr.i32.ne = 0x47;
// a < b
instr.i32.lt_s = 0x48;
// a < b
instr.i32.lt_u = 0x49;
// a > b
instr.i32.gt_s = 0x4a;
// a > b
instr.i32.gt_u = 0x4b;
// a <= b
instr.i32.le_s = 0x4c;
// a <= b
instr.i32.le_u = 0x4d;
// a >= b
instr.i32.ge_s = 0x4e;
// a >= b
instr.i32.ge_u = 0x4f;

instr.i32.and = 0x71;
instr.i32.or = 0x72;

const blocktype = { empty: 0x40, ...valtype };

valtype.void = 0x40;
instr.if = 0x04;
instr.else = 0x05;

instr.block = 0x02;
instr.loop = 0x03;
instr.br = 0x0c;
instr.br_if = 0x0d;

makeTestFn(import.meta.url);

const SECTION_ID_MEMORY = 5;

const memidx = u32;

exportdesc.mem = (idx) => [0x02, memidx(idx)];

function mem(memtype) {
  return memtype;
}

function memsec(mems) {
  return section(SECTION_ID_MEMORY, vec(mems));
}

const limits = {
  min(n) {
    return [0x00, u32(n)];
  },
  minmax(n, m) {
    return [0x01, u32(n), u32(m)];
  },
};

instr.i32.load = 0x28;
instr.i32.store = 0x36;

instr.i32.load8_s = 0x2c;
instr.i32.load8_u = 0x2d;
instr.i32.load16_s = 0x2e;
instr.i32.load16_u = 0x2f;

instr.memory = {};
instr.memory.size = 0x3f;
instr.memory.grow = 0x40;

instr.i32.xor = 0x73;
instr.i32.shl = 0x74;
instr.i32.shr_s = 0x75;
instr.i32.shr_u = 0x76;
instr.i32.rotl = 0x77;
instr.i32.rotr = 0x78;

export {
  SECTION_ID_CODE,
  SECTION_ID_EXPORT,
  SECTION_ID_FUNCTION,
  SECTION_ID_GLOBAL,
  SECTION_ID_IMPORT,
  SECTION_ID_MEMORY,
  SECTION_ID_START,
  SECTION_ID_TYPE,
  blocktype,
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
  global,
  globalidx,
  globalsec,
  globaltype,
  i32,
  import_,
  importdesc,
  importsec,
  instr,
  int32ToBytes,
  limits,
  loadMod,
  localidx,
  locals,
  magic,
  makeTestFn,
  mem,
  memidx,
  memsec,
  module,
  mut,
  name,
  resolveSymbol,
  section,
  start,
  startsec,
  stringToBytes,
  testExtractedExamples,
  typeidx,
  typesec,
  u32,
  valtype,
  vec,
  version,
};
