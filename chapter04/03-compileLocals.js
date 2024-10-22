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
} from '../chapter03.js';

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
                | identifier  -- var

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
          ],
        ),
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileLocals', () => {
  assert.strictEqual(loadMod(compileLocals()).f1(10), 52);
});
