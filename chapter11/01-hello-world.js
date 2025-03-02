import assert from 'node:assert';
import {mock} from 'node:test';

import {
  buildModule,
  buildStringTable,
  buildSymbolTable,
  defineFunctionDecls,
  defineImportDecls,
  defineToWasm,
  int32ToBytes,
  makeTestFn,
  wafer,
} from '../chapter10.js';

const test = makeTestFn(import.meta.url);

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
