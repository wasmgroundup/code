import assert from 'node:assert';
import * as ohm from 'ohm-js';
import { extractExamples } from 'ohm-js/extras';
import process from 'node:process';
import nodeTest from 'node:test';
import { fileURLToPath } from 'node:url';

function makeTestFn(url) {
  if (process.env.NODE_TEST_CONTEXT && process.argv[1] === fileURLToPath(url)) {
    return (...args) => nodeTest(...args); // register the test normally
  }
  return () => {}; // ignore the test
}

function stringToBytes(s) {
  const bytes = new TextEncoder().encode(s);
  return Array.from(bytes);
}

function int32ToBytes(v) {
  return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff];
}

function magic() {
  // [0x00, 0x61, 0x73, 0x6d]
  return stringToBytes('\0asm');
}

function version() {
  // [0x01, 0x00, 0x00, 0x00]
  return int32ToBytes(1);
}

function vec(elements) {
  return [u32(elements.length), ...elements];
}

function section(id, contents) {
  const sizeInBytes = contents.flat(Infinity).length;
  return [id, u32(sizeInBytes), contents];
}

const SECTION_ID_TYPE = 1;

const TYPE_FUNCTION = 0x60;

function functype(paramTypes, resultTypes) {
  return [TYPE_FUNCTION, vec(paramTypes), vec(resultTypes)];
}

function typesec(functypes) {
  return section(SECTION_ID_TYPE, vec(functypes));
}

const SECTION_ID_FUNCTION = 3;

const typeidx = u32;

function funcsec(typeidxs) {
  return section(SECTION_ID_FUNCTION, vec(typeidxs));
}

const SECTION_ID_CODE = 10;

const instr = {};
instr.end = 0x0b;

function code(func) {
  const sizeInBytes = func.flat(Infinity).length;
  return [u32(sizeInBytes), func];
}

function func(locals, body) {
  return [vec(locals), body];
}

function codesec(codes) {
  return section(SECTION_ID_CODE, vec(codes));
}

const SECTION_ID_EXPORT = 7;

function name(s) {
  return vec(stringToBytes(s));
}

function export_(nm, exportdesc) {
  return [name(nm), exportdesc];
}

function exportsec(exports) {
  return section(SECTION_ID_EXPORT, vec(exports));
}

const funcidx = u32;

const exportdesc = {
  func(idx) {
    return [0x00, funcidx(idx)];
  },
};

function module(sections) {
  return [magic(), version(), sections];
}

// for simplicity we include the complete implementation of u32 and i32 here
// this allows the next chapters to use all the functionality from this chapter
// without having to redefine or patch the complete definitions

const SEVEN_BIT_MASK_BIG_INT = 0b01111111n;
const CONTINUATION_BIT = 0b10000000;

function u32(v) {
  let val = BigInt(v);
  let more = true;
  const r = [];

  while (more) {
    const b = Number(val & SEVEN_BIT_MASK_BIG_INT);
    val = val >> 7n;
    more = val !== 0n;
    if (more) {
      r.push(b | CONTINUATION_BIT);
    } else {
      r.push(b);
    }
  }

  return r;
}

function i32(v) {
  let val = BigInt(v);
  const r = [];

  let more = true;
  while (more) {
    const b = Number(val & 0b01111111n);
    const signBitSet = !!(b & 0x40);

    val = val >> 7n;

    if ((val === 0n && !signBitSet) || (val === -1n && signBitSet)) {
      more = false;
      r.push(b);
    } else {
      r.push(b | CONTINUATION_BIT);
    }
  }

  return r;
}

makeTestFn(import.meta.url);

instr.i32 = { const: 0x41 };
instr.i64 = { const: 0x42 };
instr.f32 = { const: 0x43 };
instr.f64 = { const: 0x44 };

const valtype = {
  i32: 0x7f,
  i64: 0x7e,
  f32: 0x7d,
  f64: 0x7c,
};

function testExtractedExamples(grammarSource) {
  const grammar = ohm.grammar(grammarSource);
  for (const ex of extractExamples(grammarSource)) {
    const result = grammar.match(ex.example, ex.rule);
    assert.strictEqual(result.succeeded(), ex.shouldMatch, JSON.stringify(ex));
  }
}

function loadMod(bytes) {
  const mod = new WebAssembly.Module(bytes);
  return new WebAssembly.Instance(mod).exports;
}

makeTestFn(import.meta.url);

instr.i32.add = 0x6a;
instr.i32.sub = 0x6b;
instr.i32.mul = 0x6c;
instr.i32.div_s = 0x6d;

makeTestFn(import.meta.url);

instr.local = {};
instr.local.get = 0x20;
instr.local.set = 0x21;
instr.local.tee = 0x22;

function locals(n, type) {
  return [u32(n), type];
}

const localidx = u32;

function resolveSymbol(identNode, locals) {
  const identName = identNode.sourceString;
  if (locals.has(identName)) {
    return locals.get(identName);
  }
  throw new Error(`Error: undeclared identifier '${identName}'`);
}

instr.drop = 0x1a;

makeTestFn(import.meta.url);

function buildModule(functionDecls) {
  const types = functionDecls.map((f) =>
    functype(f.paramTypes, [f.resultType])
  );
  const funcs = functionDecls.map((f, i) => typeidx(i));
  const codes = functionDecls.map((f) => code(func(f.locals, f.body)));
  const exports = functionDecls.map((f, i) =>
    export_(f.name, exportdesc.func(i))
  );

  const mod = module([
    typesec(types),
    funcsec(funcs),
    exportsec(exports),
    codesec(codes),
  ]);
  return Uint8Array.from(mod.flat(Infinity));
}

instr.call = 0x10;

function buildSymbolTable(grammar, matchResult) {
  const tempSemantics = grammar.createSemantics();
  const scopes = [new Map()];
  tempSemantics.addOperation('buildSymbolTable', {
    _default(...children) {
      return children.forEach((c) => c.buildSymbolTable());
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

function defineFunctionDecls(semantics, symbols) {
  semantics.addOperation('functionDecls', {
    _default(...children) {
      return children.flatMap((c) => c.functionDecls());
    },
    FunctionDecl(_func, ident, _l, _params, _r, _blockExpr) {
      const name = ident.sourceString;
      const localVars = Array.from(symbols.get(name).values());
      const params = localVars.filter((info) => info.what === 'param');
      const paramTypes = params.map((_) => valtype.i32);
      const varsCount = localVars.filter(
        (info) => info.what === 'local'
      ).length;
      return [
        {
          name,
          paramTypes,
          resultType: valtype.i32,
          locals: [locals(varsCount, valtype.i32)],
          body: this.toWasm(),
        },
      ];
    },
  });
}

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
    LetStatement(_let, ident, _eq, expr, _) {
      const info = resolveSymbol(ident, scopes.at(-1));
      return [expr.toWasm(), instr.local.set, localidx(info.idx)];
    },
    ExprStatement(expr, _) {
      return [expr.toWasm(), instr.drop];
    },
    Expr_arithmetic(num, iterOps, iterOperands) {
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
    PrimaryExpr_var(ident) {
      const info = resolveSymbol(ident, scopes.at(-1));
      return [instr.local.get, localidx(info.idx)];
    },
    op(char) {
      const op = char.sourceString;
      const instructionByOp = {
        '+': instr.i32.add,
        '-': instr.i32.sub,
        '*': instr.i32.mul,
        '/': instr.i32.div_s,
      };
      if (!Object.hasOwn(instructionByOp, op)) {
        throw new Error(`Unhandled operator '${op}'`);
      }
      return instructionByOp[op];
    },
    number(_digits) {
      const num = parseInt(this.sourceString, 10);
      return [instr.i32.const, ...i32(num)];
    },
  });
}

export {
  SECTION_ID_CODE,
  SECTION_ID_EXPORT,
  SECTION_ID_FUNCTION,
  SECTION_ID_TYPE,
  buildModule,
  buildSymbolTable,
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
  int32ToBytes,
  loadMod,
  localidx,
  locals,
  magic,
  makeTestFn,
  module,
  name,
  resolveSymbol,
  section,
  stringToBytes,
  testExtractedExamples,
  typeidx,
  typesec,
  u32,
  valtype,
  vec,
  version,
};
