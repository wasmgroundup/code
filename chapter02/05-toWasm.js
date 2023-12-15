import { setup } from '../book.js';

const { test, assert, ohm, extractExamples } = setup('chapter02');

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
  module,
  typeidx,
  typesec,
  i32,
} from './chapter01.js';

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

const grammarDef = `
  Wafer {
    Main = number
    number = digit+

    // Examples:
    //+ "42", "1"
    //- "abc"
  }
`;

const wafer = ohm.grammar(grammarDef);

test('Wafer examples', () => {
  for (const ex of extractExamples(grammarDef)) {
    const matchResult = wafer.match(ex.example, ex.rule);
    assert.is(matchResult.succeeded(), ex.shouldMatch);
  }
});

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

function compile(grammar, source) {
  const matchResult = grammar.match(source);
  if (!matchResult.succeeded()) {
    throw new Error(matchResult.message);
  }

  const mod = module([
    typesec([functype([], [valtype.i32])]),
    funcsec([typeidx(0)]),
    exportsec([export_('main', exportdesc.funcidx(0))]),
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

async function compileAndEval(grammar, input) {
  const { instance } = await WebAssembly.instantiate(compile(grammar, input));
  return instance.exports.main();
}

test('toWasm', async () => {
  assert.equal(await compileAndEval(wafer, '42'), 42);
  assert.equal(await compileAndEval(wafer, '0'), 0);
  assert.equal(await compileAndEval(wafer, '31'), 31);
});

test.run();
