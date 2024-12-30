import assert from 'node:assert';
import {basename} from 'node:path';
import process from 'node:process';
import {default as nodeTest} from 'node:test';
import {fileURLToPath} from 'node:url';

function compileVoidLang(code) {
  if (code === '') {
    return Uint8Array.from([0, 97, 115, 109, 1, 0, 0, 0]);
  } else {
    throw new Error(`Expected empty code, got: "${code}"`);
  }
}

function makeTestFn(url) {
  const runTests = process.env.NODE_TEST_CONTEXT != null;
  if (runTests && process.argv[1] === fileURLToPath(url)) {
    // Register the test normally.
    return (testName, ...args) => {
      const filename = basename(url, '.js');
      nodeTest(`[${filename}] ${testName}`, ...args);
    };
  }
  return () => {}; // Ignore the test.
}

const test = makeTestFn(import.meta.url);

test('compileVoidLang result compiles to a WebAssembly object', async () => {
  const {instance, module} = await WebAssembly.instantiate(compileVoidLang(''));

  assert.strictEqual(instance instanceof WebAssembly.Instance, true);
  assert.strictEqual(module instanceof WebAssembly.Module, true);
});
