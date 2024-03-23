import assert from 'node:assert';
import * as ohm from 'ohm-js';
import { extractExamples } from 'ohm-js/extras';

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
  makeTestFn,
  module,
  typeidx,
  typesec,
} from './chapter01.js';

const test = makeTestFn(import.meta.url);

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

const grammarDef = `
  Wafer {
    Main = number
    number = digit+

    // Examples:
    //+ "42", "1"
    //- "abc"
  }
`;

test('Extracted examples', () => testExtractedExamples(grammarDef));

const wafer = ohm.grammar(grammarDef);

const semantics = wafer.createSemantics();
semantics.addOperation('jsValue', {
  Main(num) {
    // To evaluate a program, we need to evaluate the number.
    return num.jsValue();
  },
  number(digits) {
    // Evaluate the number with JavaScript's built in `parseInt` function.
    return parseInt(this.sourceString, 10);
  },
});

test('jsValue', () => {
  const getJsValue = (input) => semantics(wafer.match(input)).jsValue();
  assert.equal(getJsValue('42'), 42);
  assert.equal(getJsValue('0'), 0);
  assert.equal(getJsValue('99'), 99);
});

function compile(source) {
  const matchResult = wafer.match(source);
  if (!matchResult.succeeded()) {
    throw new Error(matchResult.message);
  }

  const mod = module([
    typesec([functype([], [valtype.i32])]),
    funcsec([typeidx(0)]),
    exportsec([export_('main', exportdesc.func(0))]),
    codesec([code(func([], semantics(matchResult).toWasm()))]),
  ]);
  return Uint8Array.from(mod.flat(Infinity));
}

semantics.addOperation('toWasm', {
  Main(num) {
    return [num.toWasm(), instr.end];
  },
  number(digits) {
    const value = this.jsValue();
    return [instr.i32.const, ...i32(value)];
  },
});

function loadMod(bytes) {
  const mod = new WebAssembly.Module(bytes);
  return new WebAssembly.Instance(mod).exports;
}

test('toWasm', async () => {
  assert.equal(loadMod(compile('42')).main(), 42);
  assert.equal(loadMod(compile('0')).main(), 0);
  assert.equal(loadMod(compile('31')).main(), 31);
});
