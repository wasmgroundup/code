import assert from 'node:assert';
import * as ohm from 'ohm-js';

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
  loadMod,
  makeTestFn,
  module,
  testExtractedExamples,
  typeidx,
  typesec,
  u32,
  valtype,
} from './chapter03.js';

const test = makeTestFn(import.meta.url);

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
            [instr.i32.const, i32(42)],
            [instr.local.set, localidx(1)],
            [instr.local.get, localidx(0)],
            [instr.local.get, localidx(1)],
            instr.i32.add,
            instr.end,
          ]
        )
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileLocals', () => {
  assert.strictEqual(loadMod(compileLocals()).f1(10), 52);
});

function buildSymbolTable(grammar, matchResult) {
  const tempSemantics = grammar.createSemantics();
  const symbols = new Map();
  symbols.set('main', new Map());
  tempSemantics.addOperation('buildSymbolTable', {
    _default(...children) {
      return children.forEach((c) => c.buildSymbolTable());
    },
    LetStatement(_let, id, _eq, _expr, _) {
      const name = id.sourceString;
      const idx = symbols.get('main').size;
      const info = { name, idx, what: 'local' };
      symbols.get('main').set(name, info);
    },
  });
  tempSemantics(matchResult).buildSymbolTable();
  return symbols;
}

function resolveSymbol(identNode, locals) {
  const identName = identNode.sourceString;
  if (locals.has(identName)) {
    return locals.get(identName);
  }
  throw new Error(`Error: undeclared identifier '${identName}'`);
}

const wafer = ohm.grammar(grammarDef);

test('symbol table', () => {
  const getVarNames = (str) => {
    const symbols = buildSymbolTable(wafer, wafer.match(str));
    return Array.from(symbols.get('main').keys());
  };

  assert.deepEqual(getVarNames('42'), []);
  assert.deepEqual(getVarNames('let x = 0; 42'), ['x']);
  assert.deepEqual(getVarNames('let x = 0; let y = 1; 42'), ['x', 'y']);

  const symbols = buildSymbolTable(
    wafer,
    wafer.match('let x = 0; let y = 1; 42')
  );
  const localVars = symbols.get('main');
  assert.strictEqual(resolveSymbol({ sourceString: 'x' }, localVars).idx, 0);
  assert.strictEqual(resolveSymbol({ sourceString: 'y' }, localVars).idx, 1);
  assert.throws(() => resolveSymbol({ sourceString: 'z' }, localVars));
});

function defineToWasm(semantics, localVars) {
  semantics.addOperation('toWasm', {
    Main(statementIter, expr) {
      return [
        statementIter.children.map((c) => c.toWasm()),
        expr.toWasm(),
        instr.end,
      ];
    },
    LetStatement(_let, ident, _eq, expr, _) {
      const info = resolveSymbol(ident, localVars);
      return [expr.toWasm(), instr.local.set, localidx(info.idx)];
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
      const info = resolveSymbol(ident, localVars);
      return [expr.toWasm(), instr.local.tee, localidx(info.idx)];
    },
    PrimaryExpr_var(ident) {
      const info = resolveSymbol(ident, localVars);
      return [instr.local.get, localidx(info.idx)];
    },
    op(char) {
      return [char.sourceString === '+' ? instr.i32.add : instr.i32.sub];
    },
    number(_digits) {
      const num = parseInt(this.sourceString, 10);
      return [instr.i32.const, ...i32(num)];
    },
  });
}

function toWasmFlat(input) {
  const matchResult = wafer.match(input);
  const symbols = buildSymbolTable(wafer, matchResult);
  const semantics = wafer.createSemantics();
  defineToWasm(semantics, symbols.get('main'));
  return semantics(matchResult).toWasm().flat(Infinity);
}

test('toWasm bytecodes - locals & assignment', () => {
  assert.deepEqual(toWasmFlat('42'), [instr.i32.const, 42, instr.end]);
  assert.deepEqual(
    toWasmFlat('let x = 10; 42'),
    [
      [instr.i32.const, 10, instr.local.set, 0], // let x = 10;
      [instr.i32.const, 42],
      instr.end,
    ].flat()
  );
  assert.deepEqual(
    toWasmFlat('let x = 10; x'),
    [
      [instr.i32.const, 10, instr.local.set, 0], // let x = 10;
      [instr.local.get, 0],
      instr.end,
    ].flat()
  );
  assert.deepEqual(
    toWasmFlat('let x = 10; x := 9; x'),
    [
      [instr.i32.const, 10, instr.local.set, 0], // let x = 10;
      [instr.i32.const, 9, instr.local.tee, 0, instr.drop], // x := 9;
      [instr.local.get, 0], // x
      instr.end,
    ].flat()
  );
});

instr.drop = 0x1a;
