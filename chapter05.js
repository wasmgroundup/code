import assert from 'node:assert';
import * as ohm from 'ohm-js';

import {
  // buildSymbolTable,
  code,
  codesec,
  export_,
  exportdesc,
  exportsec,
  func,
  funcidx,
  funcsec,
  functype,
  i32,
  instr,
  loadMod,
  localidx,
  locals,
  makeTestFn,
  module,
  resolveSymbol,
  testExtractedExamples,
  typeidx,
  typesec,
  valtype,
} from './chapter04.js';

const test = makeTestFn(import.meta.url);

function buildModule(functionDecls) {
  const types = functionDecls.map((f) =>
    functype(f.paramTypes, [f.resultType]),
  );
  const funcs = functionDecls.map((f, i) => typeidx(i));
  const codes = functionDecls.map((f) => code(func(f.locals, f.body)));
  const exports = functionDecls.map((f, i) =>
    export_(f.name, exportdesc.func(i)),
  );

  const mod = module([
    typesec(types),
    funcsec(funcs),
    exportsec(exports),
    codesec(codes),
  ]);
  return Uint8Array.from(mod.flat(Infinity));
}

test('buildModule', () => {
  const functionDecls = [
    {
      name: 'main',
      paramTypes: [],
      resultType: valtype.i32,
      locals: [locals(1, valtype.i32)],
      body: [instr.i32.const, i32(42), instr.call, funcidx(1), instr.end],
    },
    {
      name: 'backup',
      paramTypes: [valtype.i32],
      resultType: valtype.i32,
      locals: [],
      body: [instr.i32.const, i32(43), instr.end],
    },
  ];
  const exports = loadMod(buildModule(functionDecls));
  assert.strictEqual(exports.main(), 43);
  assert.strictEqual(exports.backup(), 43);
});

instr.call = 0x10;

const grammarDef = `
  Wafer {
    Module = FunctionDecl*

    Statement = LetStatement
              | ExprStatement

    //+ "let x = 3 + 4;", "let distance = 100 + 2;"
    //- "let y;"
    LetStatement = "let" identifier "=" Expr ";"

    //+ "func zero() { 0 }", "func add(x, y) { x + y }"
    //- "func x", "func x();"
    FunctionDecl = "func" identifier "(" Params? ")" BlockExpr

    Params = identifier ("," identifier)*

    //+ "{ 42 }", "{ 66 + 99 }", "{ 1 + 2 - 3 }"
    //+ "{ let x = 3; 42 }"
    //- "{ 3abc }"
    BlockExpr = "{" Statement* Expr "}"

    ExprStatement = Expr ";"

    Expr = AssignmentExpr  -- assignment
          | PrimaryExpr (op PrimaryExpr)*  -- arithmetic

    //+ "x := 3", "y := 2 + 1"
    AssignmentExpr = identifier ":=" Expr

    PrimaryExpr = "(" Expr ")"  -- paren
                | number
                | CallExpr
                | identifier  -- var

    CallExpr = identifier "(" Args? ")"

    Args = Expr ("," Expr)*

    op = "+" | "-" | "*" | "/"
    number = digit+

    //+ "x", "élan", "_", "_99"
    //- "1", "$nope"
    identifier = identStart identPart*
    identStart = letter | "_"
    identPart = identStart | digit

    // Examples:
    //+ "func addOne(x) { x + one }", "func one() { 1 } func two() { 2 }"
    //- "42", "let x", "func x {}"
  }
`;

test('extracted examples', () => testExtractedExamples(grammarDef));

const wafer = ohm.grammar(grammarDef);

function defineToWasm(semantics, symbols) {
  const scopes = [symbols];
  semantics.addOperation('toWasm', {
    FunctionDecl(_func, ident, _lparen, optParams, _rparen, blockExpr) {
      scopes.push(symbols.get(ident.sourceString));
      const result = [blockExpr.toWasm(), instr.end];
      scopes.pop();
      return result;
    },
    BlockExpr(_lbrace, iterStatement, expr, _rbrace) {
      return [...iterStatement.children, expr].map((c) => c.toWasm());
    },
    LetStatement(_let, ident, _eq, expr, _) {
      const info = resolveSymbol(ident, scopes.at(-1));
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
      const info = resolveSymbol(ident, scopes.at(-1));
      return [expr.toWasm(), instr.local.tee, localidx(info.idx)];
    },
    PrimaryExpr_paren(_lparen, expr, _rparen) {
      return expr.toWasm();
    },
    CallExpr(ident, _lparen, optArgs, _rparen) {
      const name = ident.sourceString;
      const funcNames = Array.from(scopes[0].keys());
      const idx = funcNames.indexOf(name);
      return [
        optArgs.children.map((c) => c.toWasm()),
        [instr.call, funcidx(idx)],
      ];
    },
    Args(exp, _, iterExp) {
      return [exp, ...iterExp.children].map((c) => c.toWasm());
    },
    PrimaryExpr_var(ident) {
      const info = resolveSymbol(ident, scopes.at(-1));
      return [instr.local.get, localidx(info.idx)];
    },
    op(char) {
      const op = char.sourceString;
      const instructionByOp = {
        '+': instr.i32.add,
        '-': instr.i32.sub,
        '*': instr.i32.mul,
        '/': instr.i32.div_s,
      };
      if (!Object.hasOwn(instructionByOp, op)) {
        throw new Error(`Unhandled operator '${op}'`);
      }
      return instructionByOp[op];
    },
    number(_digits) {
      const num = parseInt(this.sourceString, 10);
      return [instr.i32.const, ...i32(num)];
    },
  });
}

test('toWasm bytecodes - locals & assignment', () => {
  assert.deepEqual(
    toWasmFlat('func main() { 42 }'),
    [[instr.i32.const, 42], instr.end].flat(),
  );
  assert.deepEqual(
    toWasmFlat('func main() { let x = 0; 42 }'),
    [
      [instr.i32.const, 0],
      [instr.local.set, 0],
      [instr.i32.const, 42],
      instr.end,
    ].flat(),
  );
  assert.deepEqual(
    toWasmFlat('func main() { let x = 0; x }'),
    [
      [instr.i32.const, 0],
      [instr.local.set, 0],
      [instr.local.get, 0],
      instr.end,
    ].flat(),
  );
  assert.deepEqual(
    toWasmFlat('func f1(a) { let x = 12; x }'),
    [
      [instr.i32.const, 12],
      [instr.local.set, 1], // set `x`
      [instr.local.get, 1], // get `x`
      instr.end,
    ].flat(),
  );
  assert.deepEqual(
    toWasmFlat('func f2(a, b) { let x = 12; b }'),
    [
      [instr.i32.const, 12],
      [instr.local.set, 2], // set `x`
      [instr.local.get, 1], // get `b`
      instr.end,
    ].flat(),
  );
});

function toWasmFlat(input) {
  const matchResult = wafer.match(input, 'FunctionDecl');
  const symbols = buildSymbolTable(wafer, matchResult);
  const semantics = wafer.createSemantics();
  defineToWasm(semantics, symbols);
  return semantics(matchResult).toWasm().flat(Infinity);
}

function buildSymbolTable(grammar, matchResult) {
  const tempSemantics = grammar.createSemantics();
  const scopes = [new Map()];
  tempSemantics.addOperation('buildSymbolTable', {
    _default(...children) {
      return children.forEach((c) => c.buildSymbolTable());
    },
    FunctionDecl(_func, ident, _lparen, optParams, _rparen, blockExpr) {
      const name = ident.sourceString;
      const locals = new Map();
      scopes.at(-1).set(name, locals);
      scopes.push(locals);
      optParams.child(0)?.buildSymbolTable();
      blockExpr.buildSymbolTable();
      scopes.pop();
    },
    Params(ident, _, iterIdent) {
      for (const id of [ident, ...iterIdent.children]) {
        const name = id.sourceString;
        const idx = scopes.at(-1).size;
        const info = {name, idx, what: 'param'};
        scopes.at(-1).set(name, info);
      }
    },
    LetStatement(_let, id, _eq, _expr, _) {
      const name = id.sourceString;
      const idx = scopes.at(-1).size;
      const info = {name, idx, what: 'local'};
      scopes.at(-1).set(name, info);
    },
  });
  tempSemantics(matchResult).buildSymbolTable();
  return scopes[0];
}

function compile(source) {
  const matchResult = wafer.match(source);
  if (!matchResult.succeeded()) {
    throw new Error(matchResult.message);
  }

  const symbols = buildSymbolTable(wafer, matchResult);
  const semantics = wafer.createSemantics();
  defineToWasm(semantics, symbols);
  defineFunctionDecls(semantics, symbols);

  const functionDecls = semantics(matchResult).functionDecls();
  return buildModule(functionDecls);
}

function defineFunctionDecls(semantics, symbols) {
  semantics.addOperation('functionDecls', {
    _default(...children) {
      return children.flatMap((c) => c.functionDecls());
    },
    FunctionDecl(_func, ident, _l, _params, _r, _blockExpr) {
      const name = ident.sourceString;
      const localVars = Array.from(symbols.get(name).values());
      const params = localVars.filter((info) => info.what === 'param');
      const paramTypes = params.map((_) => valtype.i32);
      const varsCount = localVars.filter(
        (info) => info.what === 'local',
      ).length;
      return [
        {
          name,
          paramTypes,
          resultType: valtype.i32,
          locals: [locals(varsCount, valtype.i32)],
          body: this.toWasm(),
        },
      ];
    },
  });
}

test('module with multiple functions', () => {
  assert.deepEqual(
    loadMod(compile('func main() { let x = 42; x }')).main(),
    42,
  );
  assert.deepEqual(
    loadMod(
      compile('func doIt() { add(1, 2) } func add(x, y) { x + y }'),
    ).doIt(),
    3,
  );
});

export * from './chapter04.js';
export {buildModule, buildSymbolTable, defineFunctionDecls, defineToWasm};
