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
  instr,
  makeTestFn,
  module,
  typeidx,
  typesec,
  valtype,
} from './chapter02.js';

const test = makeTestFn(import.meta.url);

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

instr.i64 ??= {};
instr.i64.const = 0x42;

async function buildSLEB128Body(v) {
  const mod = module([
    typesec([functype([], [valtype.i64])]),
    funcsec([typeidx(0)]),
    exportsec([export_('main', exportdesc.func(0))]),
    codesec([code(func([], [[instr.i64.const, i64(v)], instr.end]))]),
  ]);
  const bin = Uint8Array.from(mod.flat(Infinity));

  return (await WebAssembly.instantiate(bin)).instance.exports.main();
}

test('test sleb128 encoder', async () => {
  async function test(v) {
    const r = await buildSLEB128Body(v);
    assert.strictEqual(v, r);
  }

  for (let i = 0n; i < 62n; i++) {
    const v = 2n << i;
    await test(-v - 1n);
    await test(-v);
    await test(-v + 1n);

    await test(v - 1n);
    await test(v);
    await test(v + 1n);
  }
});

async function buildLEB128Body(bodyLenBytes) {
  if (bodyLenBytes < 2) {
    throw new Error("Can't generate body that small");
  }

  let bytesRemaining = bodyLenBytes - 3;
  const adds = [];
  const oneAdd = [[instr.i64.const, 1], instr.i64.add];
  // 3 bytes per increment
  for (; bytesRemaining >= 3; bytesRemaining -= 3) {
    adds.push(oneAdd);
  }

  // Add nops to match expected body length
  for (let i = 0; i < bytesRemaining; i++) {
    adds.push(instr.nop);
  }

  const mod = module([
    typesec([functype([], [valtype.i64])]),
    funcsec([typeidx(0)]),
    exportsec([export_('main', exportdesc.func(0))]),
    codesec([code(func([], [[instr.i64.const, 0], adds, instr.end]))]),
  ]);
  const bin = Uint8Array.from(mod.flat(Infinity));

  return (await WebAssembly.instantiate(bin)).instance.exports.main();
}

instr.i64.add = 0x7c;
instr.nop = 0x01;

test('test leb128 encoder', async () => {
  function getIncrResultForBytes(len) {
    return BigInt(Math.floor((len - 3) / 3));
  }

  async function test(bodyLenBytes) {
    const expected = getIncrResultForBytes(bodyLenBytes);
    const result = await buildLEB128Body(bodyLenBytes);
    assert.strictEqual(expected, result);
  }

  await test(3);
  await test(6);
  await test(2 ** 7);
  await test(2 ** 14);
  await test(2 ** 21);
});

const MIN_U32 = 0;
const MAX_U32 = 2 ** 32 - 1;
function u32(v) {
  if (v < MIN_U32 || v > MAX_U32) {
    throw Error(`Value out of range for u32: ${v}`);
  }

  return leb128(v);
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

test('i32/u32 encode difference for numbers with most significant bit set', () => {
  assert.deepEqual(i32(MIN_I32), i32(2 ** 31));
  assert.deepEqual(i32(-1), i32(MAX_U32));
  assert.throws(() => i32(MAX_U32 + 1));
  assert.throws(() => i32(MIN_I32 - 1));
});

const MIN_U64 = 0n;
const MAX_U64 = 2n ** 64n - 1n;
function u64(v) {
  if (v < MIN_U64 || v > MAX_U64) {
    throw Error(`Value out of range for u64: ${v}`);
  }

  return leb128(v);
}

const MIN_I64 = -(2n ** 64n / 2n);
const MAX_I64 = 2n ** 64n / 2n - 1n;
const I64_NEG_OFFSET = 2n ** 64n;
function i64(v0) {
  const v = BigInt(v0);

  if (v < MIN_I64 || v > MAX_U64) {
    throw Error(`Value out of range for i64: ${v}`);
  }

  if (v > MAX_I64) {
    return sleb128(v - I64_NEG_OFFSET);
  }

  return sleb128(v);
}

test('i64/u64 encode difference for numbers with most significant bit set', () => {
  assert.deepEqual(i64(MIN_I64), i64(2n ** 63n));
  assert.deepEqual(i64(-1n), i64(MAX_U64));
  assert.throws(() => i64(MAX_U64 + 1n));
  assert.throws(() => i64(MIN_I64 - 1n));
});
