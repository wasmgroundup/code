import { setup } from '../book.js';

const { test, assert, ohm } = setup('chapter04');

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
  module,
  testExtractedExamples,
  typeidx,
  typesec,
  u32,
  valtype,
  vec,
} from './chapter03.js';

// mark(11:15)
const grammarDef = `
  Wafer {
    Main = Statement* Expr

    Statement = LetStatement
              | ExprStatement

    //+ "let x = 3 + 4;", "let distance = 100 + 2;"
    //- "let y;"
    LetStatement = "let" identifier "=" Expr ";"

    ExprStatement = Expr ";"

    Expr = AssignmentExpr  -- assignment
          | PrimaryExpr (op PrimaryExpr)*  -- arithmetic

    //+ "x := 3", "y := 2 + 1"
    AssignmentExpr = identifier ":=" Expr

    PrimaryExpr = number  -- num
                | identifier  -- var

    op = "+" | "-"
    number = digit+

    //+ "x", "élan", "_", "_99"
    //- "1", "$nope"
    identifier = identStart identPart*
    identStart = letter | "_"
    identPart = identStart | digit

    // Examples:
    //+ "42", "1", "66 + 99", "1 + 2 - 3"
    //+ "let x = 3; 42"
    //- "3abc"
    //- "let x = 3;"
  }
`;

test('Extracted examples', () => testExtractedExamples(grammarDef));

instr.local = {};
instr.local.get = 0x20;
instr.local.set = 0x21;
instr.local.tee = 0x22;

function locals(n, type) {
  return [u32(n), type];
}

const localidx = u32;

function compileLocals() {
  const mod = module([
    typesec([functype([valtype.i32], [valtype.i32])]),
    funcsec([typeidx(0)]),
    exportsec([export_('f1', exportdesc.func(0))]),
    codesec([
      code(
        func(
          [locals(1, valtype.i32)],
          [
            [instr.i32.const, i32(1)],
            [instr.local.set, localidx(1)],
            [instr.local.get, localidx(0)],
            [instr.local.get, localidx(1)],
            instr.i32.sub,
            instr.end,
          ]
        )
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileLocals', async () => {
  const { instance } = await WebAssembly.instantiate(compileLocals());

  assert.is(instance.exports.f1(10), 9);
});

// mark(6:8)
const wafer = ohm.grammar(grammarDef);

function localVars(matchResult) {
  const tempSemantics = wafer.createSemantics();
  tempSemantics.addOperation('localVars', {
    _default(...children) {
      return children.flatMap((c) => c.localVars());
    },
    LetStatement(_let, id, _eq, _expr, _) {
      const name = id.sourceString;
      // Return a list of pairs of [variableName, variableInfo].
      return [[name, { interval: id.source }]];
    },
  });
  return tempSemantics(matchResult).localVars();
}

test('localVars', () => {
  const varName = (pair) => pair[0];
  const getLocalVarNames = (str) => localVars(wafer.match(str)).map(varName);

  assert.equal(getLocalVarNames('42'), []);
  assert.equal(getLocalVarNames('let x = 0; 42'), ['x']);
  assert.equal(getLocalVarNames('let x = 0; let y = 1; 42'), ['x', 'y']);
});

function findIndexInLocals(identNode, localsArr) {
  const identName = identNode.sourceString;
  const refInterval = identNode.source;

  const idx = localsArr.findIndex(([name]) => identName === name);

  // Ensure that the variable has been declared.
  if (idx === -1) {
    const msg =
      refInterval.getLineAndColumnMessage() +
      `Error: undeclared identifier '${identName}`;
    throw new Error(msg);
  }

  const declInfo = localsArr[idx][1];

  // Ensure that the declaration appears before this usage.
  if (refInterval.startIdx < declInfo.interval.startIdx) {
    const msg =
      refInterval.getLineAndColumnMessage() +
      `Error: Cannot access '${identName}' before initialization`;
    throw new Error(msg);
  }

  return idx;
}

instr.drop = 0x1a;

// mark(16:18)
function toWasm(matchResult, locals) {
  const semantics = wafer.createSemantics();

  semantics.addOperation('toWasm', {
    Main(statementIter, expr) {
      return [
        statementIter.children.map((c) => c.toWasm()),
        expr.toWasm(),
        instr.end,
      ];
    },
    LetStatement(_let, ident, _eq, expr, _) {
      const idx = findIndexInLocals(ident, locals);
      return [expr.toWasm(), instr.local.set, idx];
    },
    ExprStatement(expr, _) {
      return [expr.toWasm(), instr.drop];
    },
    Expr_arithmetic(num, iterOps, iterOperands) {
      const result = [num.toWasm()];
      for (let i = 0; i < iterOps.numChildren; i++) {
        const op = iterOps.child(i);
        const operand = iterOperands.child(i);
        result.push(operand.toWasm(), op.toWasm());
      }
      return result;
    },
    AssignmentExpr(ident, _, expr) {
      const idx = findIndexInLocals(ident, locals);
      return [expr.toWasm(), instr.local.tee, idx];
    },
    PrimaryExpr_var(ident) {
      const idx = findIndexInLocals(ident, locals);
      return [instr.local.get, idx];
    },
    op(char) {
      return [char.sourceString === '+' ? instr.i32.add : instr.i32.sub];
    },
    number(_digits) {
      const num = parseInt(this.sourceString, 10);
      return [instr.i32.const, ...i32(num)];
    },
  });
  return semantics(matchResult).toWasm();
}

// mark(19:24)
test('toWasm bytecodes - locals & assignment', () => {
  const getWasmBytecode = (input) => {
    const matchResult = wafer.match(input);
    const locals = localVars(matchResult);
    return toWasm(matchResult, locals).flat(Infinity);
  };

  assert.equal(getWasmBytecode('42'), [instr.i32.const, 42, instr.end]);
  assert.equal(
    getWasmBytecode('let x = 0; 42'),
    [
      [instr.i32.const, 0, instr.local.set, 0], // let x = 0;
      [instr.i32.const, 42],
      instr.end,
    ].flat()
  );
  assert.equal(
    getWasmBytecode('let x = 0; x'),
    [
      [instr.i32.const, 0, instr.local.set, 0], // let x = 0;
      [instr.local.get, 0],
      instr.end,
    ].flat()
  );
  assert.equal(
    getWasmBytecode('let x = 0; x := 1; x'),
    [
      [instr.i32.const, 0, instr.local.set, 0], // let x = 0;
      [instr.i32.const, 1, instr.local.tee, 0, instr.drop], // x := 1;
      [instr.local.get, 0], // x
      instr.end,
    ].flat()
  );
});

test.run();
