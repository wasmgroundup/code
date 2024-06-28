import assert from 'node:assert';

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

const PAGE_SIZE_IN_BYTES = 65536;

class Memory {
  constructor(pages) {
    const sizeInBytes = pages * PAGE_SIZE_IN_BYTES;

    this.mem = new ArrayBuffer(sizeInBytes);

    this.memS8 = new Int8Array(this.mem);
    this.memU8 = new Uint8Array(this.mem);
    this.memS16 = new Int16Array(this.mem);
    this.memU16 = new Uint16Array(this.mem);
    this.memS32 = new Int32Array(this.mem);
    this.memU32 = new Uint32Array(this.mem);
  }

  i32Load8U(i) {
    return this.memU8[i];
  }

  i32Store8(i, v) {
    this.memU8[i] = v;
  }

  i32Load8S(i) {
    return this.memS8[i];
  }

  alignedI32Load16U(i) {
    // divide by 2 to go from byte index to item index
    return this.memU16[Math.trunc(i / 2)];
  }

  alignedI32Store16(i, v) {
    this.memU16[Math.trunc(i / 2)] = v;
  }

  unalignedI32Load16U(i) {
    const b1 = this.memU8[i];
    const b2 = this.memU8[i + 1];
    return (b2 << 8) | b1;
  }

  unalignedI32Store16(i, v) {
    const b1 = v & 0xff;
    const b2 = (v & 0xff00) >> 8;

    this.memU8[i] = b1;
    this.memU8[i + 1] = b2;
  }

  warn(...msg) {
    console.warn(...msg);
  }

  static formatInvalidAlignmentError(bitWidthOfT, alignment) {
    return (
      `alignment must not be larger than the bit width of t` +
      ` (${bitWidthOfT}) divided by 8, got ${alignment}`
    );
  }

  static formatBadAlignmentHint(alignment, i, offset) {
    return (
      `alignment hint but unaligned address, alignment: ` +
      `${alignment}, address: ${i}, offset: ${offset}, ` +
      `effective address: ${i + offset}`
    );
  }

  i32Load16U(i, alignment, offset) {
    const effectiveAddress = i + offset;
    if (alignment === 1) {
      if ((effectiveAddress & 1) === 0) {
        return this.alignedI32Load16U(effectiveAddress);
      } else {
        this.warn(Memory.formatBadAlignmentHint(alignment, i, offset));
        return this.unalignedI32Load16U(effectiveAddress);
      }
    } else if (alignment === 0) {
      return this.unalignedI32Load16U(effectiveAddress);
    } else {
      throw new Error(Memory.formatInvalidAlignmentError(16, alignment));
    }
  }

  i32Store16(i, v, alignment, offset) {
    const effectiveAddress = i + offset;
    if (alignment === 1) {
      if ((effectiveAddress & 1) === 0) {
        return this.alignedI32Store16(effectiveAddress, v);
      } else {
        this.warn(Memory.formatBadAlignmentHint(alignment, i, offset));
        return this.unalignedI32Store16(effectiveAddress, v);
      }
    } else if (alignment === 0) {
      return this.unalignedI32Store16(effectiveAddress, v);
    } else {
      throw new Error(Memory.formatInvalidAlignmentError(16, alignment));
    }
  }
}

test('Memory with ArrayBuffer i32Load8U works', () => {
  const m = new Memory(1);
  assert.strictEqual(m.i32Load8U(0), 0);

  m.i32Store8(0, 42);
  assert.strictEqual(m.i32Load8U(0), 42);
});

test('Memory i32Load8S works', () => {
  const m = new Memory(1);
  m.i32Store8(0, 0xff);

  assert.strictEqual(m.i32Load8U(0), 0xff);
  assert.strictEqual(m.i32Load8S(0), -1);
});

test('Typed Array index access', () => {
  const m = new Memory(1);
  m.memU8[1] = 1;
  m.memU8[3] = 2;
  m.memU8[5] = 3;

  assert.strictEqual(m.memU8[1], 1);
  assert.strictEqual(m.memU8[3], 2);
  assert.strictEqual(m.memU8[5], 3);

  assert.strictEqual(m.memU16[1], 512); // 2 << 8
  assert.strictEqual(m.memU16[3], 0);
  assert.strictEqual(m.memU16[5], 0);

  assert.strictEqual(m.memU32[1], 768); // 3 << 8
  assert.strictEqual(m.memU32[3], 0);
  assert.strictEqual(m.memU32[5], 0);
});

test('Memory aligned/unaligned access works', () => {
  const m = new Memory(1);

  m.alignedI32Store16(4, 0xabcd);
  assert.strictEqual(m.alignedI32Load16U(4), 0xabcd);
  assert.strictEqual(m.unalignedI32Load16U(4), 0xabcd);

  m.unalignedI32Store16(7, 0x1234);
  assert.strictEqual(m.unalignedI32Load16U(7), 0x1234);
  assert.strictEqual(m.memU8[7], 0x34);
  assert.strictEqual(m.memU8[8], 0x12);
});

test('Memory aligned hint', () => {
  const m = new Memory(1);

  // aligned
  m.i32Store16(4, 0xabcd, 1, 0);
  assert.strictEqual(m.i32Load16U(4, 1, 0), 0xabcd);

  // unaligned with right hint
  m.i32Store16(9, 0x1234, 0, 0);
  assert.strictEqual(m.i32Load16U(9, 0, 0), 0x1234);

  // capture last warning message
  let msg = null;
  m.warn = (...m) => {
    msg = m;
  };

  // unaligned effective address with wrong hint
  m.i32Store16(9, 0xfedc, 1, 0);
  assert.strictEqual(msg[0], Memory.formatBadAlignmentHint(1, 9, 0));

  msg = null;
  assert.strictEqual(m.i32Load16U(9, 1, 0), 0xfedc);
  assert.strictEqual(msg[0], Memory.formatBadAlignmentHint(1, 9, 0));

  msg = null;
  // unaligned effective address (because of offset) with wrong hint
  m.i32Store16(64, 0x5678, 1, 1);
  assert.strictEqual(msg[0], Memory.formatBadAlignmentHint(1, 64, 1));

  msg = null;
  assert.strictEqual(m.i32Load16U(64, 1, 1), 0x5678);
  assert.strictEqual(msg[0], Memory.formatBadAlignmentHint(1, 64, 1));
});

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

function compileWithMemory() {
  const mod = module([
    typesec([functype([], [valtype.i32])]),
    funcsec([typeidx(0)]),
    memsec([mem(limits.min(16))]),
    exportsec([export_('main', exportdesc.func(0))]),
    codesec([
      code(
        func(
          [],
          [
            // store 42 @ 8
            [instr.i32.const, i32(8)],
            [instr.i32.const, i32(42)],
            [instr.i32.store, u32(0), u32(0)],
            // load @ 8
            [instr.i32.const, i32(8)],
            [instr.i32.load, u32(0), u32(0)],
            // end
            instr.end,
          ]
        )
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileWithMemory works', async () => {
  const { instance } = await WebAssembly.instantiate(compileWithMemory());

  assert.strictEqual(instance.exports.main(), 42);
});

instr.i32.load8_s = 0x2c;
instr.i32.load8_u = 0x2d;
instr.i32.load16_s = 0x2e;
instr.i32.load16_u = 0x2f;

function compileStore32Load8() {
  const mod = module([
    // (value, memLoc) -> (b4, b3, b2, b1)
    typesec([
      functype(
        [valtype.i32, valtype.i32],
        [valtype.i32, valtype.i32, valtype.i32, valtype.i32]
      ),
    ]),
    funcsec([typeidx(0)]),
    memsec([mem(limits.min(16))]),
    exportsec([export_('byteParts', exportdesc.func(0))]),
    codesec([
      code(
        func(
          [],
          [
            // push memory location
            [instr.local.get, localidx(1)],
            // push value to store
            [instr.local.get, localidx(0)],
            // store value @ memory location
            [instr.i32.store, u32(0), u32(0)],

            // load @ memory location + 3
            [instr.local.get, localidx(1)],
            [instr.i32.const, i32(3)],
            instr.i32.add,
            [instr.i32.load8_u, u32(0), u32(0)],

            // load @ memory location + 2
            [instr.local.get, localidx(1)],
            [instr.i32.const, i32(2)],
            instr.i32.add,
            [instr.i32.load8_u, u32(0), u32(0)],

            // load @ memory location + 1
            [instr.local.get, localidx(1)],
            [instr.i32.const, i32(1)],
            instr.i32.add,
            [instr.i32.load8_u, u32(0), u32(0)],

            // load @ memory location + 0
            [instr.local.get, localidx(1)],
            [instr.i32.load8_u, u32(0), u32(0)],

            // end
            instr.end,
          ]
        )
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileStore32Load8 works', async () => {
  const { instance } = await WebAssembly.instantiate(compileStore32Load8());

  const [b4, b3, b2, b1] = instance.exports.byteParts(0xc0dedbad, 64);
  assert.strictEqual(b4, 0xc0);
  assert.strictEqual(b3, 0xde);
  assert.strictEqual(b2, 0xdb);
  assert.strictEqual(b1, 0xad);
});

function compileStore32Load16() {
  const mod = module([
    // (value, memLoc) -> (s2, s1)
    typesec([functype([valtype.i32, valtype.i32], [valtype.i32, valtype.i32])]),
    funcsec([typeidx(0)]),
    memsec([mem(limits.min(16))]),
    exportsec([export_('shortParts', exportdesc.func(0))]),
    codesec([
      code(
        func(
          [],
          [
            // push memory location
            [instr.local.get, localidx(1)],
            // push value to store
            [instr.local.get, localidx(0)],
            // store value @ memory location
            [instr.i32.store, u32(0), u32(0)],

            // load @ memory location + 2
            [instr.local.get, localidx(1)],
            [instr.i32.const, i32(2)],
            instr.i32.add,
            [instr.i32.load16_u, u32(0), u32(0)],

            // load @ memory location + 0
            [instr.local.get, localidx(1)],
            [instr.i32.load16_u, u32(0), u32(0)],

            // end
            instr.end,
          ]
        )
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileStore32Load16 works', async () => {
  const { instance } = await WebAssembly.instantiate(compileStore32Load16());

  const [s2, s1] = instance.exports.shortParts(0xc0dedbad, 64);
  assert.strictEqual(s2, 0xc0de);
  assert.strictEqual(s1, 0xdbad);
});

function compileStore32Load16SU() {
  const mod = module([
    // (value, memLoc) -> (signed, unsigned)
    typesec([functype([valtype.i32, valtype.i32], [valtype.i32, valtype.i32])]),
    funcsec([typeidx(0)]),
    memsec([mem(limits.min(16))]),
    exportsec([export_('lowShortSU', exportdesc.func(0))]),
    codesec([
      code(
        func(
          [],
          [
            // push memory location
            [instr.local.get, localidx(1)],
            // push value to store
            [instr.local.get, localidx(0)],
            // store value @ memory location
            [instr.i32.store, u32(0), u32(0)],

            // load unsigned @ memory location
            [instr.local.get, localidx(1)],
            [instr.i32.load16_u, u32(0), u32(0)],

            // load signed @ memory location
            [instr.local.get, localidx(1)],
            [instr.i32.load16_s, u32(0), u32(0)],

            // end
            instr.end,
          ]
        )
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileStore32Load16SU works', async () => {
  const { instance } = await WebAssembly.instantiate(compileStore32Load16SU());

  {
    const [signed, unsigned] = instance.exports.lowShortSU(0xffff, 64);
    assert.strictEqual(signed, 0xffff);
    assert.strictEqual(unsigned, -1);
  }

  {
    const [signed, unsigned] = instance.exports.lowShortSU(0x7fff, 64);
    assert.strictEqual(signed, 0x7fff);
    assert.strictEqual(unsigned, 0x7fff);
  }
});

function compileStore32Load8SU() {
  const mod = module([
    // (value, memLoc) -> (signed, unsigned)
    typesec([functype([valtype.i32, valtype.i32], [valtype.i32, valtype.i32])]),
    funcsec([typeidx(0)]),
    memsec([mem(limits.min(16))]),
    exportsec([export_('lowByteSU', exportdesc.func(0))]),
    codesec([
      code(
        func(
          [],
          [
            // push memory location
            [instr.local.get, localidx(1)],
            // push value to store
            [instr.local.get, localidx(0)],
            // store value @ memory location
            [instr.i32.store, u32(0), u32(0)],

            // load unsigned @ memory location
            [instr.local.get, localidx(1)],
            [instr.i32.load8_u, u32(0), u32(0)],

            // load signed @ memory location
            [instr.local.get, localidx(1)],
            [instr.i32.load8_s, u32(0), u32(0)],

            // end
            instr.end,
          ]
        )
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileStore32Load8SU works', async () => {
  const { instance } = await WebAssembly.instantiate(compileStore32Load8SU());

  {
    const [signed, unsigned] = instance.exports.lowByteSU(0xff, 64);
    assert.strictEqual(signed, 0xff);
    assert.strictEqual(unsigned, -1);
  }

  {
    const [signed, unsigned] = instance.exports.lowByteSU(0x7f, 64);
    assert.strictEqual(signed, 0x7f);
    assert.strictEqual(unsigned, 0x7f);
  }
});

instr.memory = {};
instr.memory.size = 0x3f;
instr.memory.grow = 0x40;

instr.i32.xor = 0x73;
instr.i32.shl = 0x74;
instr.i32.shr_s = 0x75;
instr.i32.shr_u = 0x76;
instr.i32.rotl = 0x77;
instr.i32.rotr = 0x78;

function compileBinOps() {
  function binOp(instruction) {
    return code(
      func(
        [],
        [
          [instr.local.get, localidx(0)],
          [instr.local.get, localidx(1)],
          instruction,
          instr.end,
        ]
      )
    );
  }

  const mod = module([
    typesec([functype([valtype.i32, valtype.i32], [valtype.i32])]),
    funcsec([
      typeidx(0),
      typeidx(0),
      typeidx(0),
      typeidx(0),
      typeidx(0),
      typeidx(0),
    ]),
    exportsec([
      export_('xor', exportdesc.func(0)),
      export_('shl', exportdesc.func(1)),
      export_('shrS', exportdesc.func(2)),
      export_('shrU', exportdesc.func(3)),
      export_('rotl', exportdesc.func(4)),
      export_('rotr', exportdesc.func(5)),
    ]),
    codesec([
      binOp(instr.i32.xor),
      binOp(instr.i32.shl),
      binOp(instr.i32.shr_s),
      binOp(instr.i32.shr_u),
      binOp(instr.i32.rotl),
      binOp(instr.i32.rotr),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileBinOps works', async () => {
  const {
    instance: {
      exports: { xor, shl, shrS, shrU, rotl, rotr },
    },
  } = await WebAssembly.instantiate(compileBinOps());

  assert.strictEqual(xor(1, 1), 0);
  assert.strictEqual(xor(0, -1), -1);
  assert.strictEqual(xor(0xffffffff, -1), 0);
  assert.strictEqual(shl(1, 1), 2);
  assert.strictEqual(shl(1 << 31, 1), 0);
  assert.strictEqual(shl(1, 8), 256);
  assert.strictEqual(shrS(1, 1), 0);
  assert.strictEqual(shrS(-0xf0, 4), -0xf);
  assert.strictEqual(shrU(1, 1), 0);
  assert.strictEqual(rotl(1 << 31, 1), 1);
  assert.strictEqual(rotr(1, 1), 1 << 31);
});

function compileSizeAndGrow() {
  const mod = module([
    typesec([
      functype([], [valtype.i32]),
      functype([valtype.i32], [valtype.i32]),
    ]),
    funcsec([typeidx(0), typeidx(1)]),
    memsec([mem(limits.min(16))]),
    exportsec([
      export_('size', exportdesc.func(0)),
      export_('grow', exportdesc.func(1)),
    ]),
    codesec([
      code(func([], [[instr.memory.size, i32(0)], instr.end])),
      code(
        func(
          [],
          [
            // grow mem delta from function argument
            [instr.local.get, localidx(0)],
            [instr.memory.grow, i32(0)],
            instr.end,
          ]
        )
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileSizeAndGrow works', async () => {
  const { instance } = await WebAssembly.instantiate(compileSizeAndGrow());

  assert.strictEqual(instance.exports.size(), 16);
  assert.strictEqual(instance.exports.grow(2), 16);
  assert.strictEqual(instance.exports.size(), 18);
});

export * from './chapter08.js';
export { limits, mem, memidx, memsec, SECTION_ID_MEMORY };
