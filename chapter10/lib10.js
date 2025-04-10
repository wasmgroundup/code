function int32ToBytes(v) {
  return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff];
}

instr.unreachable = 0x00;

const SECTION_ID_DATA = 11;

// x:memidx  e:expr  bs:vec(byte)
function data(x, e, bs) {
  return [x, e, vec(bs)];
}

function datasec(segs) {
  return section(SECTION_ID_DATA, vec(segs));
}
