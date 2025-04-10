const SECTION_ID_MEMORY = 5;

function memsec(mems) {
  return section(SECTION_ID_MEMORY, vec(mems));
}

function mem(memtype) {
  return memtype;
}

function memtype(limits) {
  return limits;
}

const limits = {
  // n:u32
  min(n) {
    return [0x00, u32(n)];
  },
  // n:u32, m:u32
  minmax(n, m) {
    return [0x01, u32(n), u32(m)];
  },
};

const memidx = u32;

exportdesc.mem = (idx) => [0x02, memidx(idx)];

instr.memory = {
  size: 0x3f, // [] -> [i32]
  grow: 0x40, // [i32] -> [i32]
};

instr.i32.load = 0x28; // [i32] -> [i32]
instr.i32.store = 0x36; // [i32, i32] -> []

// align:u32, offset:u32
function memarg(align, offset) {
  return [u32(align), u32(offset)];
}
