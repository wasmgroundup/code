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

async function buildI32Body(v) {
  const mod = module([
    typesec([functype([], [valtype.i64])]),
    funcsec([typeidx(0)]),
    exportsec([export_('main', exportdesc.func(0))]),
    codesec([code(func([], [[instr.i64.const, i32(v)], instr.end]))]),
  ]);
  const bin = Uint8Array.from(mod.flat(Infinity));

  return (await WebAssembly.instantiate(bin)).instance.exports.main();
}

test('test i32 encoder', async () => {
  async function test(v) {
    const r = await buildI32Body(v);
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

async function buildU32Body(bodyLenBytes) {
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

test('test u32 encoder', async () => {
  function getIncrResultForBytes(len) {
    return BigInt(Math.floor((len - 3) / 3));
  }

  async function test(bodyLenBytes) {
    const expected = getIncrResultForBytes(bodyLenBytes);
    const result = await buildU32Body(bodyLenBytes);
    assert.strictEqual(expected, result);
  }

  await test(3);
  await test(6);
  await test(2 ** 7);
  await test(2 ** 14);
  await test(2 ** 21);
});
