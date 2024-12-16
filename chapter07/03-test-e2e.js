import assert from 'node:assert';
import * as ohm from 'ohm-js';

import {
  code,
  codesec,
  defineFunctionDecls,
  defineToWasm,
  export_,
  exportdesc,
  exportsec,
  func,
  funcidx,
  funcsec,
  functype,
  i32,
  instr,
  makeTestFn,
  module,
  name,
  section,
  testExtractedExamples,
  typeidx,
  typesec,
  valtype,
  vec,
} from '../chapter06.js';

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

const SECTION_ID_IMPORT = 2;

// mod:name  nm:name  d:importdesc
function import_(mod, nm, d) {
  return [name(mod), name(nm), d];
}

// im*:vec(import)
function importsec(ims) {
  return section(SECTION_ID_IMPORT, vec(ims));
}

const importdesc = {
  // x:typeidx
  func(x) {
    return [0x00, typeidx(x)];
  },
};

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

  const mod = module([
    typesec(types),
    importsec(imports),
    funcsec(funcs),
    exportsec(exports),
    codesec(codes),
  ]);
  return Uint8Array.from(mod.flat(Infinity));
}

test('buildModule with imports', () => {
  const importDecls = [
    {
      module: 'basicMath',
      name: 'addOne',
      paramTypes: [valtype.i32],
      resultType: valtype.i32,
    },
  ];
  const functionDecls = [
    {
      name: 'main',
      paramTypes: [],
      resultType: valtype.i32,
      locals: [],
      body: [instr.i32.const, i32(42), instr.call, funcidx(0), instr.end],
    },
  ];
  const exports = loadMod(buildModule(importDecls, functionDecls), {
    basicMath: {addOne: (x) => x + 1},
  });
  assert.strictEqual(exports.main(), 43);
});

function loadMod(bytes, imports) {
  const mod = new WebAssembly.Module(bytes);
  return new WebAssembly.Instance(mod, imports).exports;
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

function defineImportDecls(semantics) {
  semantics.addOperation('importDecls', {
    _default(...children) {
      return children.flatMap((c) => c.importDecls());
    },
    ExternFunctionDecl(_extern, _func, ident, _l, optParams, _r, _) {
      const name = ident.sourceString;
      const paramTypes =
        optParams.numChildren === 0 ? [] : getParamTypes(optParams.child(0));
      return [
        {
          module: 'waferImports',
          name,
          paramTypes,
          resultType: valtype.i32,
        },
      ];
    },
  });
}

function getParamTypes(node) {
  assert.strictEqual(node.ctorName, 'Params', 'Wrong node type');
  assert.strictEqual(node.numChildren, 3, 'Wrong number of children');
  const [first, _, iterRest] = node.children;
  return new Array(iterRest.numChildren + 1).fill(valtype.i32);
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
  });
  tempSemantics(matchResult).buildSymbolTable();
  return scopes[0];
}

test('module with imports', () => {
  const imports = {
    waferImports: {
      add: (a, b) => a + b,
      one: () => 1,
    },
  };
  const compileAndEval = (source) => loadMod(compile(source), imports).main();

  // Make sure that code with no imports continues to work.
  assert.strictEqual(compileAndEval(`func main() { 2 + 2 }`), 4);

  // Now test some code that uses imports.
  assert.strictEqual(
    compileAndEval(`
      extern func add(a, b);
      func main() {
        let a = 42;
        add(a, 1)
      }
    `),
    43,
  );
  assert.strictEqual(
    compileAndEval(`
      extern func add(a, b);
      extern func one();
      func main() {
        add(42, one())
      }
    `),
    43,
  );
});
