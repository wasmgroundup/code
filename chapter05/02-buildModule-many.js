import assert from 'node:assert';
import * as ohm from 'ohm-js';

import {
  buildSymbolTable,
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
  name,
  resolveSymbol,
  section,
  testExtractedExamples,
  typeidx,
  typesec,
  u32,
  valtype,
  vec,
} from './chapter04.js';

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

test('extracted examples', () => testExtractedExamples(grammarDef));

const wafer = ohm.grammar(grammarDef);

function compile(source) {
  const matchResult = wafer.match(source);
  if (!matchResult.succeeded()) {
    throw new Error(matchResult.message);
  }

  const semantics = wafer.createSemantics();
  const symbols = buildSymbolTable(wafer, matchResult);
  const localVars = symbols.get('main');
  defineToWasm(semantics, localVars);

  const mainFn = func(
    [locals(localVars.size, valtype.i32)],
    semantics(matchResult).toWasm()
  );
  const mod = module([
    typesec([functype([], [valtype.i32])]),
    funcsec([typeidx(0)]),
    exportsec([export_('main', exportdesc.func(0))]),
    codesec([code(mainFn)]),
  ]);
  return Uint8Array.from(mod.flat(Infinity));
}

function buildModule(functionDecls) {
  const types = functionDecls.map((f) =>
    functype(f.paramTypes, [f.resultType])
  );
  const funcs = functionDecls.map((f, i) => typeidx(i));
  const codes = functionDecls.map((f) => code(func(f.locals, f.body)));
  const exports = functionDecls.map((f, i) =>
    export_(f.name, exportdesc.func(i))
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
      body: [instr.i32.const, i32(42), instr.end],
    },
    {
      name: 'backup',
      paramTypes: [],
      resultType: valtype.i32,
      locals: [],
      body: [instr.i32.const, i32(43), instr.end],
    },
  ];
  const exports = loadMod(buildModule(functionDecls));
  assert.strictEqual(exports.main(), 42);
  assert.strictEqual(exports.backup(), 43);
});
