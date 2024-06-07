import assert from 'node:assert';
import * as ohm from 'ohm-js';

import {
  buildModule,
  buildSymbolTable,
  code,
  codesec,
  defineFunctionDecls,
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
  u32,
  valtype,
} from './chapter05.js';

const test = makeTestFn(import.meta.url);

const grammarDef = `
  Wafer {
    Module = FunctionDecl*

    Statement = LetStatement
              | WhileStatement
              | ExprStatement

    //+ "let x = 3 + 4;", "let distance = 100 + 2;"
    //- "let y;"
    LetStatement = let identifier "=" Expr ";"

    //+ "while 0 {}", "while x < 10 { x := x + 1; }"
    //- "while 1 { 42 }", "while x < 10 { x := x + 1 }"
    WhileStatement = while Expr BlockStatements

    //+ "func zero() { 0 }", "func add(x, y) { x + y }"
    //- "func x", "func x();"
    FunctionDecl = func identifier "(" Params? ")" BlockExpr

    Params = identifier ("," identifier)*

    //+ "{ 42 }", "{ 66 + 99 }", "{ 1 + 2 - 3 }"
    //+ "{ let x = 3; 42 }"
    //- "{ 3abc }"
    BlockExpr = "{" Statement* Expr "}"

    //+ "{}", "{ let x = 3; }", "{ 42; 99; }"
    //- "{ 42 }", "{ x := 1 }"
    BlockStatements = "{" Statement* "}"

    ExprStatement = Expr ";"

    Expr = AssignmentExpr  -- assignment
          | PrimaryExpr (binaryOp PrimaryExpr)*  -- binary

    //+ "x := 3", "y := 2 + 1"
    AssignmentExpr = identifier ":=" Expr

    PrimaryExpr = number  -- num
                | CallExpr
                | IfExpr
                | identifier  -- var

    CallExpr = identifier "(" Args? ")"

    Args = Expr ("," Expr)*

    //+ "if x { 42 } else { 99 }", "if x { 42 } else if y { 99 } else { 0 }"
    //- "if x { 42 }"
    IfExpr = if Expr BlockExpr else (BlockExpr|IfExpr)

    binaryOp = "+" | "-" | compareOp | logicalOp
    compareOp = "==" | "!=" | "<=" | "<" | ">=" | ">"
    logicalOp = and | or
    number = digit+

    keyword = if | else | func | let | and | or | while
    if = "if" ~identPart
    else = "else" ~identPart
    func = "func" ~identPart
    let = "let" ~identPart
    and = "and" ~identPart
    or = "or" ~identPart
    while = "while" ~identPart

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

instr.if = 0x04;
instr.else = 0x05;

const blocktype = { empty: 0x40, ...valtype };

test('if expressions', () => {
  const functionDecls = [
    {
      name: 'choose',
      paramTypes: [valtype.i32],
      resultType: valtype.i32,
      locals: [],
      body: [
        [instr.local.get, localidx(0)], // Load the argument.
        [instr.if, valtype.i32],
        [instr.i32.const, i32(42)],
        instr.else,
        [instr.i32.const, i32(43)],
        instr.end, // end if
        instr.end,
      ],
    },
  ];
  const exports = loadMod(buildModule(functionDecls));
  assert.strictEqual(exports.choose(1), 42);
  assert.strictEqual(exports.choose(0), 43);
});

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
    BlockStatements(_lbrace, iterStatement, _rbrace) {
      return iterStatement.children.map((c) => c.toWasm());
    },
    LetStatement(_let, ident, _eq, expr, _) {
      const info = resolveSymbol(ident, scopes.at(-1));
      return [expr.toWasm(), instr.local.set, localidx(info.idx)];
    },
    WhileStatement(_while, cond, body) {
      return [
        [instr.loop, blocktype.empty],
        cond.toWasm(),
        [instr.if, blocktype.empty],
        body.toWasm(),
        [instr.br, 1],
        instr.end, // end if
        instr.end, // end loop
      ];
    },
    ExprStatement(expr, _) {
      return [expr.toWasm(), instr.drop];
    },
    Expr_binary(num, iterOps, iterOperands) {
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
    IfExpr(_if, expr, thenBlock, _else, elseBlock) {
      return [
        expr.toWasm(),
        [instr.if, blocktype.i32],
        thenBlock.toWasm(),
        instr.else,
        elseBlock.toWasm(),
        instr.end,
      ];
    },
    PrimaryExpr_var(ident) {
      const info = resolveSymbol(ident, scopes.at(-1));
      return [instr.local.get, localidx(info.idx)];
    },
    binaryOp(char) {
      const op = char.sourceString;
      const instructionByOp = {
        // Arithmetic
        '+': instr.i32.add,
        '-': instr.i32.sub,
        // Comparison
        '==': instr.i32.eq,
        '!=': instr.i32.ne,
        '<': instr.i32.lt_s,
        '<=': instr.i32.le_s,
        '>': instr.i32.gt_s,
        '>=': instr.i32.ge_s,
        // Logical
        and: instr.i32.and,
        or: instr.i32.or,
      };
      if (!Object.hasOwn(instructionByOp, op)) {
        throw new Error(`Unhandle binary op '${op}'`);
      }
      return instructionByOp[op];
    },
    number(_digits) {
      const num = parseInt(this.sourceString, 10);
      return [instr.i32.const, ...i32(num)];
    },
  });
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

test('Wafer if expressions', () => {
  let mod = loadMod(compile('func choose(x) { if x { 42 } else { 43 } }'));
  assert.strictEqual(mod.choose(1), 42);
  assert.strictEqual(mod.choose(0), 43);

  mod = loadMod(
    compile(`
        func isZero(x) {
          let result = if x { 0 } else { 1 };
          result
        }
      `)
  );
  assert.strictEqual(mod.isZero(1), 0);
  assert.strictEqual(mod.isZero(0), 1);
});

instr.i32.eq = 0x46; // a == b
instr.i32.ne = 0x47; // a != b
instr.i32.lt_s = 0x48; // a < b (signed)
instr.i32.lt_u = 0x49; // a < b (unsigned)
instr.i32.gt_s = 0x4a; // a > b (signed)
instr.i32.gt_u = 0x4b; // a > b (unsigned)
instr.i32.le_s = 0x4c; // a <= b (signed)
instr.i32.le_u = 0x4d; // a <= b (unsigned)
instr.i32.ge_s = 0x4e; // a >= b (signed)
instr.i32.ge_u = 0x4f; // a >= b (unsigned)

instr.i32.eqz = 0x45; // a == 0

instr.i32.and = 0x71;
instr.i32.or = 0x72;

function compileCompAndBoolOps() {
  function binOp(instruction) {
    return code(
      func(
        [],
        [
          [instr.local.get, localidx(0)],
          [instr.local.get, localidx(1)],
          instruction,
          instr.end,
        ]
      )
    );
  }

  const mod = module([
    typesec([
      functype([valtype.i32, valtype.i32], [valtype.i32]),
      functype([valtype.i32], [valtype.i32]),
    ]),
    funcsec([
      typeidx(0),
      typeidx(0),
      typeidx(0),
      typeidx(0),
      typeidx(0),
      typeidx(0),
      typeidx(0),
      typeidx(0),
      typeidx(1),
    ]),
    exportsec([
      export_('eq', exportdesc.func(0)),
      export_('ne', exportdesc.func(1)),
      export_('lt', exportdesc.func(2)),
      export_('gt', exportdesc.func(3)),
      export_('le', exportdesc.func(4)),
      export_('ge', exportdesc.func(5)),
      export_('and', exportdesc.func(6)),
      export_('or', exportdesc.func(7)),
      export_('eqz', exportdesc.func(8)),
    ]),
    codesec([
      binOp(instr.i32.eq),
      binOp(instr.i32.ne),
      binOp(instr.i32.lt_s),
      binOp(instr.i32.gt_s),
      binOp(instr.i32.le_s),
      binOp(instr.i32.ge_s),
      binOp(instr.i32.and),
      binOp(instr.i32.or),
      code(
        func([], [[instr.local.get, localidx(0)], instr.i32.eqz, instr.end])
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileCompAndBoolOps works', async () => {
  const {
    instance: {
      exports: { eq, ne, lt, gt, le, ge, and, or, eqz },
    },
  } = await WebAssembly.instantiate(compileCompAndBoolOps());
  const TRUE = 1;
  const FALSE = 0;

  // (1 == 2) == false
  assert.strictEqual(eq(1, 2), FALSE);
  // (2 == 2) == true
  assert.strictEqual(eq(2, 2), TRUE);
  // (1 != 2) == true
  assert.strictEqual(ne(1, 2), TRUE);
  // (3 != 3) == false
  assert.strictEqual(ne(3, 3), FALSE);
  // (1 < 2) == true
  assert.strictEqual(lt(1, 2), TRUE);
  // (2 < 2) == false
  assert.strictEqual(lt(2, 2), FALSE);
  // (3 < 2) == false
  assert.strictEqual(lt(3, 2), FALSE);
  // (1 > 2) == false
  assert.strictEqual(gt(1, 2), FALSE);
  // (2 > 2) == false
  assert.strictEqual(gt(2, 2), FALSE);
  // (3 > 2) == true
  assert.strictEqual(gt(3, 2), TRUE);
  // (1 <= 2) == true
  assert.strictEqual(le(1, 2), TRUE);
  // (2 <= 2) == true
  assert.strictEqual(le(2, 2), TRUE);
  // (3 <= 2) == false
  assert.strictEqual(le(3, 2), FALSE);
  // (1 >= 2) == false
  assert.strictEqual(ge(1, 2), FALSE);
  // (2 >= 2) == true
  assert.strictEqual(ge(2, 2), TRUE);
  // (3 >= 2) == true
  assert.strictEqual(ge(3, 2), TRUE);
  // (true and true) == true
  assert.strictEqual(and(1, 1), TRUE);
  // (false and false) == false
  assert.strictEqual(and(0, 0), FALSE);
  // (false and true) == false
  assert.strictEqual(and(0, 1), FALSE);
  // (true and false) == false
  assert.strictEqual(and(1, 0), FALSE);
  // (true or true) == true
  assert.strictEqual(or(1, 1), TRUE);
  // (false or false) == false
  assert.strictEqual(or(0, 0), FALSE);
  // (false or true) == true
  assert.strictEqual(or(0, 1), TRUE);
  // (true or false) == true
  assert.strictEqual(or(1, 0), TRUE);
  // (0 === 0) == true
  // (!false) == true
  assert.strictEqual(eqz(0), TRUE);
  // (1 === 0) == false
  // (!true) == false
  assert.strictEqual(eqz(1), FALSE);
  // (2 === 0) == true
  // (!true) == true
  assert.strictEqual(eqz(2), FALSE);
});

test('Wafer comparison operators', () => {
  const mod = loadMod(
    compile(`
        func greaterThan(a, b) { a > b }
        func lessThan(a, b) { a < b }
        func greaterThanOrEq(a, b) { a >= b }
        func lessThanOrEq(a, b) { a <= b }
        func eq(a, b) { a == b }
        func and_(a, b) { a and b }
        func or_(a, b) { a or b }
      `)
  );
  assert.strictEqual(mod.greaterThan(43, 42), 1);
  assert.strictEqual(mod.greaterThan(42, 43), 0);
  assert.strictEqual(mod.lessThan(43, 42), 0);
  assert.strictEqual(mod.greaterThanOrEq(42, 42), 1);
  assert.strictEqual(mod.lessThanOrEq(42, 43), 1);
  assert.strictEqual(mod.eq(42, 42), 1);
  assert.strictEqual(mod.and_(1, 1), 1);
  assert.strictEqual(mod.and_(1, 0), 0);
  assert.strictEqual(mod.or_(1, 0), 1);
  assert.strictEqual(mod.or_(0, 1), 1);
});

const labelidx = u32;

instr.block = 0x02;
instr.loop = 0x03;
instr.br = 0x0c;
instr.br_if = 0x0d;

function compileWhile() {
  const mod = module([
    typesec([functype([valtype.i32], [valtype.i32])]),
    funcsec([typeidx(0)]),
    exportsec([export_('main', exportdesc.func(0))]),
    codesec([
      code(
        func(
          [locals(2, valtype.i32)],
          [
            // v1 = arg
            [instr.local.get, localidx(0)],
            [instr.local.set, localidx(1)],

            [
              instr.block,
              blocktype.empty,
              // 1:
              [
                instr.loop,
                blocktype.empty,

                // condition
                [instr.local.get, localidx(1)],

                instr.i32.eqz,
                [instr.br_if, labelidx(1)],

                // body
                [
                  // v1 = v1 - 1
                  [instr.local.get, localidx(1)],
                  [instr.i32.const, i32(1)],
                  instr.i32.sub,
                  [instr.local.set, localidx(1)],

                  // v2 = v2 + 1
                  [instr.local.get, localidx(2)],
                  [instr.i32.const, i32(1)],
                  [instr.i32.add],
                  [instr.local.set, localidx(2)],
                ],

                [instr.br, labelidx(0)],

                instr.end,
              ], // loop
              instr.end,
            ], // block
            // 0:

            // return v2
            [instr.local.get, localidx(2)],
            instr.end,
          ]
        )
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileWhile works', async () => {
  const {
    instance: {
      exports: { main },
    },
  } = await WebAssembly.instantiate(compileWhile());
  assert.strictEqual(main(10), 10);
});

test('Wafer while loops', () => {
  const mod = loadMod(
    compile(`
        func countTo(n) {
          let x = 0;
          while x < n {
            x := x + 1;
          }
          x
        }
      `)
  );
  assert.strictEqual(mod.countTo(10), 10);
});
