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

    //+ "let x = 3 + 4;", "let distance = 100 + 2;"
    //- "let y;"
    LetStatement = "let" identifier "=" Expr ";"

    Expr = PrimaryExpr (op PrimaryExpr)*

    PrimaryExpr = "(" Expr ")"  -- paren
                | number
                | identifier

    op = "+" | "-" | "*" | "/"
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
