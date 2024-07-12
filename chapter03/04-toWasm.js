import assert from 'node:assert';
import * as ohm from 'ohm-js';

import { i32, instr, makeTestFn, testExtractedExamples } from './chapter02.js';

const test = makeTestFn(import.meta.url);

const grammarDef = `
  Wafer {
    Main = Expr
    Expr = number (op number)*

    op = "+" | "-"
    number = digit+

    // Examples:
    //+ "42", "1", "66 + 99", "1 + 2 - 3"
    //- "abc"
  }
`;

test('Extracted examples', () => testExtractedExamples(grammarDef));

const wafer = ohm.grammar(grammarDef);
const semantics = wafer.createSemantics();

semantics.addOperation('jsValue', {
  Main(num) {
    // To evaluate main, we need to evaluate the number.
    return num.jsValue();
  },
  number(digits) {
    // Evaluate the number with JavaScript's built in `parseInt` function.
    return parseInt(this.sourceString, 10);
  },
});

semantics.addOperation('toWasm', {
  Main(expr) {
    return [expr.toWasm(), instr.end];
  },
  Expr(num, iterOps, iterOperands) {
    const result = [num.toWasm()];
    for (let i = 0; i < iterOps.numChildren; i++) {
      const op = iterOps.child(i);
      const operand = iterOperands.child(i);
      result.push(operand.toWasm(), op.toWasm());
    }
    return result;
  },
  op(char) {
    return [char.sourceString === '+' ? instr.i32.add : instr.i32.sub];
  },
  number(digits) {
    const num = this.jsValue();
    return [instr.i32.const, ...i32(num)];
  },
});

instr.i32.add = 0x6a;
instr.i32.sub = 0x6b;

function toWasmFlat(input) {
  const matchResult = wafer.match(input);
  const bytes = semantics(matchResult).toWasm();
  return bytes.flat(Infinity);
}

test('toWasm bytecodes', () => {
  assert.deepEqual(toWasmFlat('1'), [instr.i32.const, 1, instr.end]);
  assert.deepEqual(
    toWasmFlat('1 + 2'),
    [
      [instr.i32.const, 1],
      [instr.i32.const, 2],
      instr.i32.add,
      instr.end,
    ].flat()
  );
  assert.deepEqual(
    toWasmFlat('7 - 3 + 11'),
    [
      [instr.i32.const, 7],
      [instr.i32.const, 3],
      instr.i32.sub,
      [instr.i32.const, 11],
      instr.i32.add,
      instr.end,
    ].flat()
  );
});
