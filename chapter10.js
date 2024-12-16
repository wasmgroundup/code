import assert from 'node:assert';
import {mock} from 'node:test';
import * as ohm from 'ohm-js';

import {
  blocktype,
  buildSymbolTable,
  code,
  codesec,
  defineFunctionDecls,
  defineImportDecls,
  import_,
  importsec,
  importdesc,
  export_,
  exportdesc,
  exportsec,
  func,
  funcidx,
  funcsec,
  functype,
  i32,
  instr,
  labelidx,
  limits,
  // loadMod,
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
  stringToBytes,
  testExtractedExamples,
  typeidx,
  typesec,
  valtype,
  u32,
  vec,
  int32ToBytes,
} from './chapter09.js';

const test = makeTestFn(import.meta.url);

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
      throw new Error('Not supported yet');
    },
    PrimaryExpr_paren(_lparen, expr, _rparen) {
      return expr.toWasm();
    },
    PrimaryExpr_index(ident, _lbracket, idxExpr, _rbracket) {
      if (ident.sourceString === '__mem') {
        return [idxExpr.toWasm(), instr.i32.load, memarg(2, 0)];
      }
      throw new Error('Not supported yet');
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

function compile(source) {
  const matchResult = wafer.match(source);
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

const grammarDef = String.raw`
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
                | stringLiteral
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

    stringLiteral = quote (~quote any)* quote
    quote = "\""

    space += singleLineComment | multiLineComment
    singleLineComment = "//" (~"\n" any)*
    multiLineComment = "/*" (~"*/" any)* "*/"

    // Examples:
    //+ "func addOne(x) { x + one }", "func one() { 1 } func two() { 2 }"
    //- "42", "let x", "func x {}"
  }
`;

test('extracted examples', () => testExtractedExamples(grammarDef));

const wafer = ohm.grammar(grammarDef);

const waferPrelude = `
  extern func __consoleLog(str);

  func newInt32Array(len) {
    let freeOffset = __mem[__heap_base];
    __mem[__heap_base] := freeOffset + (len * 4) + 4;
    __mem[freeOffset] := len;
    freeOffset
  }

  func __readInt32Array(arr, idx) {
    if idx < 0 or idx >= __mem[arr] {
      __trap();
    }
    __mem[arr + 4 + (idx * 4)]
  }

  func __writeInt32Array(arr, idx, val) {
    if idx < 0 or idx >= __mem[arr] {
      __trap();
    }
    __mem[arr + 4 + (idx * 4)] := val
  }

  func print(str) {
    __consoleLog(str)
  }
`;

function compile(source) {
  const matchResult = wafer.match(waferPrelude + source);
  if (!matchResult.succeeded()) {
    throw new Error(matchResult.message);
  }

  const symbols = buildSymbolTable(wafer, matchResult);
  const strings = buildStringTable(wafer, matchResult);
  const semantics = wafer.createSemantics();
  defineToWasm(semantics, symbols, strings);
  defineImportDecls(semantics);
  defineFunctionDecls(semantics, symbols);

  const importDecls = semantics(matchResult).importDecls();
  const functionDecls = semantics(matchResult).functionDecls();
  const heapBase = strings.data.length;
  const dataSegs = [
    {offset: 0, bytes: strings.data},
    {offset: heapBase, bytes: int32ToBytes(heapBase + 4)},
  ];
  return buildModule(importDecls, functionDecls, dataSegs);
}

function defineToWasm(semantics, symbols, stringTable) {
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
      if (ident.sourceString === '__heap_base')
        return [instr.i32.const, i32(stringTable.data.length)];

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
    stringLiteral(_lquote, chars, _rquote) {
      const addr = stringTable.offsets.get(chars.sourceString);
      return [instr.i32.const, i32(addr)];
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

test('bounds checking', () => {
  const waferSrc = `
    func main() {
      let arr = newInt32Array(1);
      arr[0] := 42;
      arr[1] := 99
    }
  `;
  const mod = loadMod(compile(waferSrc), {});
  assert.throws(() => mod.main(), /unreachable/);
});

const SECTION_ID_DATA = 11;

// x:memidx  e:expr  bs:vec(byte)
function data(x, e, bs) {
  return [x, e, vec(bs)];
}

function datasec(segs) {
  return section(SECTION_ID_DATA, vec(segs));
}

function stringLiteralBytes(str) {
  const bytes = int32ToBytes(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes.push(...int32ToBytes(str.charCodeAt(i)));
  }
  assert.strictEqual(bytes.length, (str.length + 1) * 4, str);
  return bytes;
}

function buildStringTable(grammar, matchResult) {
  const tempSemantics = grammar.createSemantics();
  const table = {
    offsets: new Map(),
    data: [],
  };
  tempSemantics.addOperation('buildStringTable', {
    _default(...children) {
      return children.forEach((c) => c.buildStringTable());
    },
    stringLiteral(_lquote, chars, _rquote) {
      const str = chars.sourceString;
      const offset = table.data.length;
      table.offsets.set(str, offset);
      table.data.push(...stringLiteralBytes(str));
    },
  });
  tempSemantics(matchResult).buildStringTable();
  return table;
}

function buildModule(importDecls, functionDecls, dataSegments = []) {
  const types = [...importDecls, ...functionDecls].map((f) =>
    functype(f.paramTypes, [f.resultType]),
  );
  const imports = importDecls.map((f, i) =>
    import_(f.module, f.name, importdesc.func(i)),
  );
  const funcs = functionDecls.map((f, i) => typeidx(i + importDecls.length));
  const codes = functionDecls.map((f) => code(func(f.locals, f.body)));
  const exports = functionDecls.map((f, i) =>
    export_(f.name, exportdesc.func(i + importDecls.length)),
  );
  exports.push(export_('$waferMemory', exportdesc.mem(0)));

  const mod = module([
    typesec(types),
    importsec(imports),
    funcsec(funcs),
    memsec([mem(memtype(limits.min(1)))]),
    exportsec(exports),
    codesec(codes),
    datasec(
      dataSegments.map((seg) =>
        data(
          memidx(0),
          [[instr.i32.const, i32(seg.offset)], instr.end],
          seg.bytes,
        ),
      ),
    ),
  ]);
  return Uint8Array.from(mod.flat(Infinity));
}

function loadStaticString(mem, start, len) {
  const bytes = mem.slice(start, len);
  return new TextDecoder().decode(bytes);
}

test('buildModule with data section', async () => {
  const dataSegs = [
    {offset: 1, bytes: [0xab]},
    {offset: 2, bytes: [0x12, 0x34]},
  ];
  const exports = loadMod(buildModule([], [], dataSegs), {});
  const mem = new DataView(exports.$waferMemory.buffer);
  assert.strictEqual(mem.getUint8(0), 0x00);
  assert.strictEqual(mem.getUint8(1), 0xab);
  assert.strictEqual(mem.getUint8(2), 0x12);
  assert.strictEqual(mem.getUint8(3), 0x34);
});

test('strings', () => {
  const waferSrc = `
    func main() {
      let s = "hey";
      let arr = newInt32Array(1);
      arr[0] := 42;
      s
    }
  `;
  const exports = loadMod(compile(waferSrc), {});
  exports.main();

  const view = new DataView(exports.$waferMemory.buffer);
  const memInt32At = (idx) => view.getUint32(idx * 4, true);

  assert.strictEqual(memInt32At(0), 'hey'.length);
  assert.strictEqual(memInt32At(1), 'hey'.charCodeAt(0));
  assert.strictEqual(memInt32At(2), 'hey'.charCodeAt(1));
  assert.strictEqual(memInt32At(3), 'hey'.charCodeAt(2));
});

function loadMod(bytes, imports) {
  const mod = new WebAssembly.Module(bytes);
  let memory = undefined;
  const waferImports = {
    ...imports.waferImports,
    __consoleLog: (waferStr) => {
      console.log(waferStringToJS(memory, waferStr));
    },
  };
  const fullImports = {...imports, waferImports};
  const {exports} = new WebAssembly.Instance(mod, fullImports);
  memory = exports.$waferMemory;
  return exports;
}

function waferStringToJS(mem, waferStr) {
  const int32View = new DataView(mem.buffer);
  const chars = [];
  const len = int32View.getUint32(waferStr, true);
  for (let i = 0; i < len; i++) {
    chars.push(int32View.getUint32(waferStr + (i + 1) * 4, true));
  }
  return String.fromCharCode(...chars);
}

test('print', () => {
  const waferSrc = `
    func sayHello() {
      print("Hello from Wafer!!")
    }
  `;
  const exports = loadMod(compile(waferSrc), {});
  const consoleLog = mock.method(console, 'log');
  exports.sayHello();
  assert.strictEqual(consoleLog.mock.callCount(), 1);
  assert.deepEqual(consoleLog.mock.calls[0].arguments, ['Hello from Wafer!!']);
});

const SECTION_ID_TABLE = 4;

function tabletype(elemtype, limits) {
  return [elemtype, limits];
}

function table(tabletype) {
  return tabletype;
}

function tablesec(tables) {
  return section(SECTION_ID_TABLE, vec(tables));
}

const elemtype = {funcref: 0x70};

const tableidx = u32;

exportdesc.table = (idx) => [0x01, tableidx(idx)];

instr.call_indirect = 0x11;

function compileTable() {
  const mod = module([
    typesec([functype([], [valtype.i32])]),
    funcsec([typeidx(0), typeidx(0), typeidx(0)]),
    tablesec([table(tabletype(elemtype.funcref, limits.min(64, 1024)))]),
    exportsec([
      export_('main', exportdesc.func(0)),
      export_('f1', exportdesc.func(1)),
      export_('f2', exportdesc.func(2)),
      export_('mytable', exportdesc.table(0)),
    ]),
    codesec([
      code(
        func(
          [],
          [
            // 0 in stack is index of table entry
            [instr.i32.const, i32(0)],
            // call function in index 0 (in stack above) that has
            // to have type specified in typeindex 0 in type table (below)
            [instr.call_indirect, typeidx(0), tableidx(0)],
            instr.end,
          ],
        ),
      ),
      code(func([], [[instr.i32.const, u32(42)], instr.end])),
      code(func([], [[instr.i32.const, u32(43)], instr.end])),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileTable works', async () => {
  const {instance} = await WebAssembly.instantiate(compileTable());

  assert.ok(instance.exports.mytable instanceof WebAssembly.Table);

  instance.exports.mytable.set(0, instance.exports.f1);
  assert.strictEqual(instance.exports.main(), 42);

  instance.exports.mytable.set(0, instance.exports.f2);
  assert.strictEqual(instance.exports.main(), 43);
});

test('compileTable with uninitialized table fails', async () => {
  const {instance} = await WebAssembly.instantiate(compileTable());
  assert.throws(
    () => instance.exports.main(),
    /^RuntimeError: null function or function signature mismatch$/,
  );
});

function compileHelloWorld() {
  const mod = module([
    typesec([functype([valtype.i32, valtype.i32], []), functype([], [])]),
    importsec([import_('lib', 'print', importdesc.func(0))]),
    funcsec([typeidx(1)]),
    memsec([mem(memtype(limits.minmax(16, 32)))]),
    exportsec([
      export_('mem', exportdesc.mem(0)),
      export_('main', exportdesc.func(1)),
    ]),
    codesec([
      code(
        func(
          [],
          [
            // start
            [instr.i32.const, i32(0)],
            // len ('hello world!'.length === 12)
            [instr.i32.const, i32(12)],
            // lib.print(start, len)
            [instr.call, funcidx(0)],
            instr.end,
          ],
        ),
      ),
    ]),
    datasec([
      data(
        memidx(0),
        [[instr.i32.const, i32(0)], instr.end],
        stringToBytes('hello world!'),
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileHelloWorld works', async () => {
  let mem;
  let actual;
  const {instance} = await WebAssembly.instantiate(compileHelloWorld(), {
    lib: {
      print(start, len) {
        actual = loadStaticString(mem, start, len);
        console.log('lib.print:', actual);
      },
    },
  });

  mem = new Uint8Array(instance.exports.mem.buffer);
  instance.exports.main();

  const expected = 'hello world!';
  assert.strictEqual(actual, expected);
});

const SECTION_ID_ELEMENT = 9;

// x:tableidx  e:expr  y∗:vec(funcidx)
function elem(x, e, ys) {
  return [x, e, vec(ys)];
}

function elemsec(segs) {
  return section(SECTION_ID_ELEMENT, vec(segs));
}

function compileElementSection() {
  const mod = module([
    typesec([functype([], [valtype.i32])]),
    funcsec([typeidx(0), typeidx(0)]),
    tablesec([table(tabletype(elemtype.funcref, limits.min(64, 1024)))]),
    exportsec([
      export_('f1', exportdesc.func(0)),
      export_('f2', exportdesc.func(1)),
      export_('mytable', exportdesc.table(0)),
    ]),
    elemsec([
      elem(tableidx(0), [[instr.i32.const, i32(0)], instr.end], [funcidx(0)]),
      elem(tableidx(0), [[instr.i32.const, i32(1)], instr.end], [funcidx(1)]),
    ]),
    codesec([
      code(func([], [[instr.i32.const, i32(42)], instr.end])),
      code(func([], [[instr.i32.const, i32(43)], instr.end])),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileElementSection works', async () => {
  const {instance} = await WebAssembly.instantiate(compileElementSection());
  const {mytable, f1, f2} = instance.exports;

  assert.strictEqual(mytable instanceof WebAssembly.Table, true);
  assert.strictEqual(mytable.get(0), f1);
  assert.strictEqual(mytable.get(1), f2);
});

export * from './chapter09.js';
export {elemtype, SECTION_ID_TABLE, table, tableidx, tablesec, tabletype};
