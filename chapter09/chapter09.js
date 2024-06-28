import {
  code,
  codesec,
  export_,
  exportdesc,
  exportsec,
  func,
  funcsec,
  functype,
  i32,
  instr,
  localidx,
  makeTestFn,
  module,
  section,
  typeidx,
  typesec,
  u32,
  valtype,
  vec,
} from './chapter08.js';

const test = makeTestFn(import.meta.url);

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

export * from './chapter08.js';
export { limits, mem, memidx, memsec, SECTION_ID_MEMORY };
