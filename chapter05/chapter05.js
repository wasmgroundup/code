import {
  // buildSymbolTable,
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
  loadMod,
  localidx,
  locals,
  makeTestFn,
  module,
  name,
  resolveSymbol,
  section,
  testExtractedExamples,
  typeidx,
  typesec,
  u32,
  valtype,
  vec,
} from './chapter04.js';

const test = makeTestFn(import.meta.url);

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

export * from './chapter04.js';
export { SECTION_ID_START, start, startsec };
export { global, globalidx, globalsec, globaltype, mut, SECTION_ID_GLOBAL };
export { import_, importdesc, importsec, SECTION_ID_IMPORT };
