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

const SECTION_ID_DATA = 11;

// x:memidx  e:expr  b∗:vec(byte)
function data(x, e, bs) {
  return [x, e, vec(bs)];
}

function datasec(segs) {
  return section(SECTION_ID_DATA, vec(segs));
}

const SECTION_ID_ELEMENT = 9;

// x:tableidx  e:expr  y∗:vec(funcidx)
function elem(x, e, ys) {
  return [x, e, vec(ys)];
}

function elemsec(segs) {
  return section(SECTION_ID_ELEMENT, vec(segs));
}

export * from './chapter07.js';
export { elemtype, SECTION_ID_TABLE, table, tableidx, tablesec, tabletype };
