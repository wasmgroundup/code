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

instr.local = {};
instr.local.get = 0x20;
instr.local.set = 0x21;
instr.local.tee = 0x22;

function locals(n, type) {
  return [u32(n), type];
}

const localidx = u32;

function buildSymbolTable(grammar, matchResult) {
  const tempSemantics = grammar.createSemantics();
  const symbols = new Map();
  symbols.set('main', new Map());
  tempSemantics.addOperation('buildSymbolTable', {
    _default(...children) {
      return children.forEach((c) => c.buildSymbolTable());
    },
    LetStatement(_let, id, _eq, _expr, _) {
      const name = id.sourceString;
      const idx = symbols.get('main').size;
      const info = { name, idx, what: 'local' };
      symbols.get('main').set(name, info);
    },
  });
  tempSemantics(matchResult).buildSymbolTable();
  return symbols;
}

function resolveSymbol(identNode, locals) {
  const identName = identNode.sourceString;
  if (locals.has(identName)) {
    return locals.get(identName);
  }
  throw new Error(`Error: undeclared identifier '${identName}'`);
}

instr.drop = 0x1a;

export * from './chapter03.js';
export { buildSymbolTable, resolveSymbol, locals, localidx };
