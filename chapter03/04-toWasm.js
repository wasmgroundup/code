import { setup } from '../book.js';

const { test, assert, ohm, extractExamples } = setup('chapter03');

import { i32, instr } from './chapter02.js';

instr.i32.add = 0x6a;
instr.i32.sub = 0x6b;

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

const wafer = ohm.grammar(grammarDef);

test('Arithmetic examples', () => {
  for (const ex of extractExamples(grammarDef)) {
    const matchResult = wafer.match(ex.example, ex.rule);
    assert.is(matchResult.succeeded(), ex.shouldMatch);
  }
});

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

function exprToWasm(input) {
  // Explicitly match the input as an `Expr`. By default, Ohm tries to
  // match the first rule in the grammar, which is `Main`.
  const matchResult = wafer.match(input, 'Expr');
  const bytes = semantics(matchResult).toWasm();

  // Flatten nested arrays, just like our `instantiateModule` function.
  return bytes.flat(Infinity);
}

test('toWasm bytecodes', async () => {
  const { i32 } = instr;
  assert.equal(exprToWasm('1'), [i32.const, 1]);
  assert.equal(exprToWasm('1 + 2'), [i32.const, 1, i32.const, 2, i32.add]);
  assert.equal(exprToWasm('7 - 3 + 11'), [
    i32.const,
    7,
    i32.const,
    3,
    i32.sub,
    i32.const,
    11,
    i32.add,
  ]);
});

test.run();
