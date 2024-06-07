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
  u32,
  valtype,
  vec,
} from './chapter06.js';

const test = makeTestFn(import.meta.url);

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
    functype(f.paramTypes, [f.resultType])
  );
  const imports = importDecls.map((f, i) =>
    import_(f.module, f.name, importdesc.func(i))
  );
  const funcs = functionDecls.map((f, i) => typeidx(i + importDecls.length));
  const codes = functionDecls.map((f) => code(func(f.locals, f.body)));
  const exports = functionDecls.map((f, i) =>
    export_(f.name, exportdesc.func(i + importDecls.length))
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
    basicMath: { addOne: (x) => x + 1 },
  });
  assert.strictEqual(exports.main(), 43);
});

function loadMod(bytes, imports) {
  const mod = new WebAssembly.Module(bytes);
  return new WebAssembly.Instance(mod, imports).exports;
}

const SECTION_ID_START = 8;

const start = funcidx;

// st:start
function startsec(st) {
  return section(SECTION_ID_START, st);
}

function compileStartFunction() {
  const mod = module([
    typesec([functype([], [])]),
    funcsec([typeidx(0)]),
    globalsec([
      global(globaltype(valtype.i32, mut.var), [
        [instr.i32.const, i32(0)],
        instr.end,
      ]),
    ]),
    exportsec([export_('g', exportdesc.global(0))]),
    startsec(start(0)),
    codesec([
      code(
        func(
          [],
          [
            // g = 42
            [instr.i32.const, i32(42)],
            [instr.global.set, globalidx(0)],
            instr.end,
          ]
        )
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileStartFunction works', async () => {
  const { instance } = await WebAssembly.instantiate(compileStartFunction());

  assert.strictEqual(instance.exports.g.value, 42);
});

instr.global = {};
instr.global.get = 0x23;
instr.global.set = 0x24;

const globalidx = u32;

exportdesc.global = (idx) => [0x03, globalidx(idx)];

const SECTION_ID_GLOBAL = 6;

const mut = {
  const: 0x00,
  var: 0x01,
};

// t:valtype  m:mut
function globaltype(t, m) {
  return [t, m];
}

// gt:globaltype  e:expr
function global(gt, e) {
  return [gt, e];
}

// glob*:vec(global)
function globalsec(globs) {
  return section(SECTION_ID_GLOBAL, vec(globs));
}

function compileGlobals() {
  const mod = module([
    typesec([functype([], [valtype.i32])]),
    funcsec([typeidx(0)]),
    globalsec([
      // V = 10
      global(globaltype(valtype.i32, mut.var), [
        instr.i32.const,
        i32(10),
        instr.end,
      ]),
      // C = 20
      global(globaltype(valtype.i32, mut.const), [
        instr.i32.const,
        i32(20),
        instr.end,
      ]),
    ]),
    exportsec([export_('main', exportdesc.func(0))]),
    codesec([
      code(
        func(
          [],
          [
            // C + V
            [instr.global.get, globalidx(0)],
            [instr.global.get, globalidx(1)],
            instr.i32.add,
            // V = 12
            [instr.i32.const, i32(12)],
            [instr.global.set, globalidx(0)],
            // (result of C + V in stack) + V
            [instr.global.get, globalidx(0)],
            instr.i32.add,
            instr.end,
          ]
        )
      ),
    ]),
  ]);

  return Uint8Array.from(mod.flat(Infinity));
}

test('compileGlobals works', async () => {
  const { instance } = await WebAssembly.instantiate(compileGlobals());

  assert.strictEqual(instance.exports.main(), 42);
});

const grammarDef = `
  Wafer {
    Module = DeclareStatement* FunctionDecl*

    //+ "declare func sqrt(n);", "declare func x();"
    //- "declare func sqrt;", "declare func x()"
    DeclareStatement = "declare" "func" identifier "(" Params? ")" ";"

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

    PrimaryExpr = number  -- num
                | CallExpr  -- call
                | identifier  -- var

    CallExpr = identifier "(" Args? ")"

    Args = Expr ("," Expr)*

    op = "+" | "-"
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
    Module(iterDeclareStatements, _) {
      return iterDeclareStatements.children.flatMap((c) => c.importDecls());
    },
    DeclareStatement(_declare, _func, ident, _l, optParams, _r, _) {
      const name = ident.sourceString;
      const paramTypes = getParamTypes(optParams.child(0));
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
  if (node == null) {
    return [];
  }
  assert.strictEqual(node.ctorName, 'Params', 'Wrong node type');
  assert.strictEqual(node.numChildren, 3, 'Wrong number of children');
  const [first, _, iterRest] = node.children;
  return [first, ...iterRest.children].map((_) => valtype.i32);
}

function buildSymbolTable(grammar, matchResult) {
  const tempSemantics = grammar.createSemantics();
  const scopes = [new Map()];
  tempSemantics.addOperation('buildSymbolTable', {
    _default(...children) {
      return children.forEach((c) => c.buildSymbolTable());
    },
    DeclareStatement(_declare, _func, ident, _l, optParams, _r, _) {
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
        const info = { name, idx, what: 'param' };
        scopes.at(-1).set(name, info);
      }
    },
    LetStatement(_let, id, _eq, _expr, _) {
      const name = id.sourceString;
      const idx = scopes.at(-1).size;
      const info = { name, idx, what: 'local' };
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
      log: (x) => console.log(x),
    },
  };
  const compileAndEval = (source) => loadMod(compile(source), imports).main();

  // Make sure that code with no imports continues to work.
  assert.strictEqual(compileAndEval(`func main() { 2 + 2 }`), 4);

  // Now test some code that uses imports.
  assert.strictEqual(
    compileAndEval(`
        declare func add(a, b);
        func main() {
          let a = 42;
          add(a, 1)
        }
      `),
    43
  );
  assert.strictEqual(
    compileAndEval(`
        declare func add(a, b);
        declare func one();
        func main() {
          add(42, one())
        }
      `),
    43
  );
});

export * from './chapter06.js';
export { global, globalidx, globalsec, globaltype, mut, SECTION_ID_GLOBAL };
export { SECTION_ID_START, start, startsec };
export { import_, importdesc, importsec, SECTION_ID_IMPORT };
export { buildModule, buildSymbolTable, defineImportDecls, loadMod };
