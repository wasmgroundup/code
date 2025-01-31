import assert from 'node:assert';
import * as ohm from 'ohm-js';

import {
  blocktype,
  buildModule,
  buildSymbolTable,
  code,
  codesec,
  defineFunctionDecls,
  defineImportDecls,
  export_,
  exportdesc,
  exportsec,
  func,
  funcidx,
  funcsec,
  functype,
  i32,
  import_,
  importdesc,
  importsec,
  instr,
  labelidx,
  limits,
  loadMod,
  localidx,
  makeTestFn,
  mem,
  memarg,
  memidx,
  memsec,
  memtype,
  module,
  resolveSymbol,
  section,
  testExtractedExamples,
  typeidx,
  typesec,
  vec,
} from '../chapter09.js';

const test = makeTestFn(import.meta.url);

function int32ToBytes(v) {
  return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff];
}

const grammarDef = `
  Wafer {
    Module = (FunctionDecl|ExternFunctionDecl)*

    Statement = LetStatement
              | IfStatement
              | WhileStatement
              | ExprStatement

    //+ "let x = 3 + 4;", "let distance = 100 + 2;"
    //- "let y;"
    LetStatement = let identifier "=" Expr ";"

    //+ "if x < 10 {}", "if z { 42; }", "if x {} else if y {} else { 42; }"
    //- "if x < 10 { 3 } else {}"
    IfStatement = if Expr BlockStatements (else (BlockStatements|IfStatement))?

    //+ "while 0 {}", "while x < 10 { x := x + 1; }"
    //- "while 1 { 42 }", "while x < 10 { x := x + 1 }"
    WhileStatement = while Expr BlockStatements

    //+ "func zero() { 0 }", "func add(x, y) { x + y }"
    //- "func x", "func x();"
    FunctionDecl = func identifier "(" Params? ")" BlockExpr

    //+ "extern func print(x);"
    ExternFunctionDecl = extern func identifier "(" Params? ")" ";"

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

    //+ "x := 3", "y := 2 + 1", "arr[x + 1] := 3"
    AssignmentExpr = identifier ":=" Expr  -- var
                   | identifier "[" Expr "]" ":=" Expr  -- array

    PrimaryExpr = "(" Expr ")"  -- paren
                | number
                | CallExpr
                | identifier "[" Expr "]"  -- index
                | identifier  -- var
                | IfExpr

    CallExpr = identifier "(" Args? ")"

    Args = Expr ("," Expr)*

    //+ "if x { 42 } else { 99 }", "if x { 42 } else if y { 99 } else { 0 }"
    //- "if x { 42 }"
    IfExpr = if Expr BlockExpr else (BlockExpr|IfExpr)

    binaryOp = "+" | "-" | "*" | "/" | compareOp | logicalOp
    compareOp = "==" | "!=" | "<=" | "<" | ">=" | ">"
    logicalOp = and | or
    number = digit+

    keyword = if | else | func | let | while | and | or | extern
    if = "if" ~identPart
    else = "else" ~identPart
    func = "func" ~identPart
    let = "let" ~identPart
    while = "while" ~identPart
    and = "and" ~identPart
    or = "or" ~identPart
    extern = "extern" ~identPart

    //+ "x", "élan", "_", "_99"
    //- "1", "$nope"
    identifier = ~keyword identStart identPart*
    identStart = letter | "_"
    identPart = identStart | digit

    space += singleLineComment | multiLineComment
    singleLineComment = "//" (~"\\n" any)*
    multiLineComment = "/*" (~"*/" any)* "*/"

    // Examples:
    //+ "func addOne(x) { x + one }", "func one() { 1 } func two() { 2 }"
    //- "42", "let x", "func x {}"
  }
`;

test('extracted examples', () => testExtractedExamples(grammarDef));

const wafer = ohm.grammar(grammarDef);

const waferPrelude = `
  func newInt32Array(len) {
    let freeOffset = __mem[0];

    if freeOffset == 0 {
      freeOffset := 4;
    }

    __mem[0] := freeOffset + (len * 4);
    freeOffset
  }

  func __readInt32Array(arr, idx) {
    __mem[arr + (idx * 4)]
  }

  func __writeInt32Array(arr, idx, val) {
    __mem[arr + (idx * 4)] := val
  }
`;

function compile(source) {
  const matchResult = wafer.match(waferPrelude + source);
  if (!matchResult.succeeded()) {
    throw new Error(matchResult.message);
  }

  const symbols = buildSymbolTable(wafer, matchResult);
  const semantics = wafer.createSemantics();
  defineToWasm(semantics, symbols);
  defineImportDecls(semantics);
  defineFunctionDecls(semantics, symbols);

  const importDecls = semantics(matchResult).importDecls();
  const functionDecls = semantics(matchResult).functionDecls();
  return buildModule(importDecls, functionDecls);
}

function defineToWasm(semantics, symbols) {
  const scopes = [symbols];

  const functionCall = (name) => {
    if (name === '__trap') return [instr.unreachable];

    const funcNames = Array.from(scopes[0].keys());
    const idx = funcNames.indexOf(name);
    assert(idx >= 0, `no such function '${name}'`);
    return [instr.call, funcidx(idx)];
  };

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
      const elseFrag =
        iterElseBlock.child(0) ?
          [instr.else, iterElseBlock.child(0).toWasm()]
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
    AssignmentExpr_var(ident, _, expr) {
      const info = resolveSymbol(ident, scopes.at(-1));
      return [expr.toWasm(), instr.local.tee, localidx(info.idx)];
    },
    AssignmentExpr_array(ident, _lbracket, idxExpr, _rbracket, _, expr) {
      const tempVar = scopes.at(-1).get('$temp');
      if (ident.sourceString === '__mem') {
        return [
          idxExpr.toWasm(),
          expr.toWasm(),
          [instr.local.tee, localidx(tempVar.idx)], // Save value
          [instr.i32.store, memarg(2, 0)],
          [instr.local.get, localidx(tempVar.idx)], // Load saved value
        ];
      }
      const varInfo = resolveSymbol(ident, scopes.at(-1));
      return [
        [instr.local.get, localidx(varInfo.idx)], // Arg 0: arr
        idxExpr.toWasm(), // Arg 1: idx
        expr.toWasm(), // Arg 2: val
        functionCall('__writeInt32Array'),
      ];
    },
    PrimaryExpr_paren(_lparen, expr, _rparen) {
      return expr.toWasm();
    },
    PrimaryExpr_index(ident, _lbracket, idxExpr, _rbracket) {
      if (ident.sourceString === '__mem') {
        return [idxExpr.toWasm(), instr.i32.load, memarg(2, 0)];
      }
      const varInfo = resolveSymbol(ident, scopes.at(-1));
      return [
        [instr.local.get, localidx(varInfo.idx)], // Arg 0: arr
        idxExpr.toWasm(), // Arg 1: idx
        functionCall('__readInt32Array'),
      ];
    },
    CallExpr(ident, _lparen, optArgs, _rparen) {
      const name = ident.sourceString;
      return [optArgs.children.map((c) => c.toWasm()), functionCall(name)];
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
        'and': instr.i32.and,
        'or': instr.i32.or,
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

instr.i32.unreachable = 0x00;

test('i32 arrays', () => {
  const waferSrc = `
    func write(arr, len) {
      let idx = 0;
      while idx < len {
        arr[idx] := 1;
        idx := idx + 1;
      }
      0
    }

    func sum(arr, len) {
      let idx = 0;
      let sum = 0;
      while idx < len {
        sum := sum + arr[idx];
        idx := idx + 1;
      }
      sum
    }
  `;
  const mod = loadMod(compile(waferSrc), {});
  const arr = mod.newInt32Array(64);
  assert.strictEqual(mod.sum(arr, 64), 0);
  mod.write(arr, 64);
  assert.strictEqual(mod.sum(arr, 64), 64);
});
