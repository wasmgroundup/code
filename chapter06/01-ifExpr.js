import assert from 'node:assert';
import * as ohm from 'ohm-js';

import {
  buildModule,
  buildSymbolTable,
  defineFunctionDecls,
  funcidx,
  i32,
  instr,
  loadMod,
  localidx,
  makeTestFn,
  resolveSymbol,
  testExtractedExamples,
  u32,
  valtype,
} from '../chapter05.js';

const test = makeTestFn(import.meta.url);

const grammarDef = `
  Wafer {
    Module = FunctionDecl*

    Statement = LetStatement
              | ExprStatement

    //+ "let x = 3 + 4;", "let distance = 100 + 2;"
    //- "let y;"
    LetStatement = let identifier "=" Expr ";"

    //+ "func zero() { 0 }", "func add(x, y) { x + y }"
    //- "func x", "func x();"
    FunctionDecl = func identifier "(" Params? ")" BlockExpr

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
                | IfExpr

    CallExpr = identifier "(" Args? ")"

    Args = Expr ("," Expr)*

    //+ "if x { 42 } else { 99 }", "if x { 42 } else if y { 99 } else { 0 }"
    //- "if x { 42 }"
    IfExpr = if Expr BlockExpr else (BlockExpr|IfExpr)

    op = "+" | "-" | "*" | "/"
    number = digit+

    keyword = if | else | func | let
    if = "if" ~identPart
    else = "else" ~identPart
    func = "func" ~identPart
    let = "let" ~identPart

    //+ "x", "élan", "_", "_99"
    //- "1", "$nope"
    identifier = ~keyword identStart identPart*
    identStart = letter | "_"
    identPart = identStart | digit

    // Examples:
    //+ "func addOne(x) { x + one }", "func one() { 1 } func two() { 2 }"
    //- "42", "let x", "func x {}"
  }
`;

test('extracted examples', () => testExtractedExamples(grammarDef));

const wafer = ohm.grammar(grammarDef);
