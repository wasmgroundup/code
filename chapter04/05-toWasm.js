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

// mark(11[12:22],11[28:38],13:14)
const grammarDef = `
  Wafer {
    Main = Statement* Expr

    Statement = LetStatement

    //+ "let x = 3 + 4;", "let distance = 100 + 2;"
    //- "let y;"
    LetStatement = "let" identifier "=" Expr ";"

    Expr = PrimaryExpr (op PrimaryExpr)*

    PrimaryExpr = number
                | identifier

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

// mark(11:14)
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
      const idx = locals.findIndex(([name]) => ident.sourceString === name);
      return [expr.toWasm(), instr.local.set, idx];
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
    number(_digits) {
      const num = parseInt(this.sourceString, 10);
      return [instr.i32.const, ...i32(num)];
    },
  });
  return semantics(matchResult).toWasm();
}

// mark(9:14)
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
      [instr.i32.const, 0],
      [instr.local.set, 0],
      [instr.i32.const, 42],
      instr.end,
    ].flat()
  );
});

test.run();
