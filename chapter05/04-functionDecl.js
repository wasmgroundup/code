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
  resolveSymbol,
  testExtractedExamples,
  typeidx,
  typesec,
  valtype,
} from '../chapter04.js';

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
                | identifier  -- var

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
