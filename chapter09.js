import assert from 'node:assert';
import * as ohm from 'ohm-js';

import {
  blocktype,
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
  localidx,
  loadMod,
  makeTestFn,
  module,
  resolveSymbol,
  section,
  testExtractedExamples,
  typeidx,
  typesec,
  u32,
  valtype,
  vec,
} from './chapter08.js';

const test = makeTestFn(import.meta.url);

const SECTION_ID_MEMORY = 5;

function memsec(mems) {
  return section(SECTION_ID_MEMORY, vec(mems));
}

function mem(memtype) {
  return memtype;
}

function memtype(limits) {
  return limits;
}

const limits = {
  // n:u32
  min(n) {
    return [0x00, u32(n)];
  },
  // n:u32, m:u32
  minmax(n, m) {
    return [0x01, u32(n), u32(m)];
  },
};

const memidx = u32;

exportdesc.mem = (idx) => [0x02, memidx(idx)];

function buildModule(importDecls, functionDecls) {
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
  ]);
  return Uint8Array.from(mod.flat(Infinity));
}

test('buildModule with memory', () => {
  const importDecls = [];
  const functionDecls = [
    {
      name: 'main',
      paramTypes: [],
      resultType: valtype.i32,
      locals: [],
      body: [
        [instr.i32.const, i32(40), [instr.memory.grow, memidx(0)]],
        [instr.memory.size, memidx(0)],
        instr.i32.add,
        instr.end,
      ],
    },
  ];
  const exports = loadMod(buildModule(importDecls, functionDecls));
  assert.ok(exports.$waferMemory);
  assert.strictEqual(exports.main(), 42);

  const PAGE_SIZE_IN_BYTES = 64 * 1024;
  assert.strictEqual(
    exports.$waferMemory.buffer.byteLength,
    PAGE_SIZE_IN_BYTES * 41,
  );
});

instr.memory = {
  size: 0x3f, // [] -> [i32]
  grow: 0x40, // [i32] -> [i32]
};

instr.i32.load = 0x28; // [i32] -> [i32]
instr.i32.store = 0x36; // [i32, i32] -> []

// align:u32, offset:u32
function memarg(align, offset) {
  return [u32(align), u32(offset)];
}

test('load and store', () => {
  const importDecls = [];
  const functionDecls = [
    {
      name: 'main',
      paramTypes: [],
      resultType: valtype.i32,
      locals: [],
      body: [
        [instr.i32.const, i32(4)], // offset (destination)
        [instr.i32.const, i32(42)], // value
        [instr.i32.store, memarg(0, 0)],
        [instr.i32.const, i32(4)],
        [instr.i32.load, memarg(0, 0)],
        instr.end,
      ],
    },
  ];
  const exports = loadMod(buildModule(importDecls, functionDecls));
  assert.equal(exports.main(), 42);

  const view = new DataView(exports.$waferMemory.buffer);
  assert.equal(view.getInt32(4, true), 42);
});

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

function buildSymbolTable(grammar, matchResult) {
  const tempSemantics = grammar.createSemantics();
  const scopes = [new Map()];
  tempSemantics.addOperation('buildSymbolTable', {
    _default(...children) {
      return children.forEach((c) => c.buildSymbolTable());
    },
    ExternFunctionDecl(_extern, _func, ident, _l, optParams, _r, _) {
      const name = ident.sourceString;
      scopes.at(-1).set(name, new Map());
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
    AssignmentExpr_array(_id, _lbracket, _idx, _rbracket, _, _expr) {
      const name = '$temp';
      if (!scopes.at(-1).has(name)) {
        const idx = scopes.at(-1).size;
        const info = {name, idx, what: 'local'};
        scopes.at(-1).set(name, info);
      }
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
  defineImportDecls(semantics);
  defineFunctionDecls(semantics, symbols);

  const importDecls = semantics(matchResult).importDecls();
  const functionDecls = semantics(matchResult).functionDecls();
  return buildModule(importDecls, functionDecls);
}

test('raw memory access', () => {
  const waferSrc = `
    func write() {
      let offset = 0;
      while offset < 256 {
        __mem[offset] := 1;
        offset := offset + 4;
      }
      0
    }

    func sum() {
      let offset = 0;
      let sum = 0;
      while offset < 256 {
        sum := sum + __mem[offset];
        offset := offset + 4;
      }
      sum
    }
  `;

  const mod = loadMod(compile(waferSrc), {});
  mod.write();
  assert.strictEqual(mod.sum(), 64);

  // Verify the count by reading the exported memory directly.
  const view = new DataView(mod.$waferMemory.buffer);
  let sum = 0;
  for (let offset = 0; offset < 256; offset += 4) {
    sum += view.getInt32(offset, true);
  }
  assert.strictEqual(sum, 64);
});

export * from './chapter08.js';
export {
  buildModule,
  buildSymbolTable,
  limits,
  mem,
  memarg,
  memidx,
  memsec,
  memtype,
  SECTION_ID_MEMORY,
};
