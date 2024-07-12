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

instr.if = 0x04;
instr.else = 0x05;

const blocktype = { empty: 0x40, ...valtype };

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
    IfStatement(_if, expr, thenBlock, _else, iterElseBlock) {
      const elseFrag = iterElseBlock.child(0)
        ? [instr.else, iterElseBlock.child(0).toWasm()]
        : [];
      return [
        expr.toWasm(),
        [instr.if, blocktype.empty],
        thenBlock.toWasm(),
        elseFrag,
        instr.end,
      ];
    },
    WhileStatement(_while, cond, body) {
      return [
        [instr.loop, blocktype.empty],
        cond.toWasm(),
        [instr.if, blocktype.empty],
        body.toWasm(),
        [instr.br, labelidx(1)],
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
        '*': instr.i32.mul,
        '/': instr.i32.div_s,
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

export * from './chapter05.js';
export { blocktype, defineToWasm };
