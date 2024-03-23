import assert from 'node:assert';
import process from 'node:process';
import { default as nodeTest } from 'node:test';
import { fileURLToPath } from 'node:url';

function makeTestFn(url) {
  if (process.env.NODE_TEST_CONTEXT && process.argv[1] === fileURLToPath(url)) {
    return (...args) => nodeTest(...args); // register the test normally
  }
  return () => {}; // ignore the test
}

const test = makeTestFn(import.meta.url);

function compileVoidLang(code) {
  if (code === '') {
    return Uint8Array.from([0, 97, 115, 109, 1, 0, 0, 0]);
  } else {
    throw new Error(`Expected empty code, got: "${code}"`);
  }
}

test('compileVoidLang works for empty string', () => {
  const bytes = compileVoidLang('');
  assert.strictEqual(ArrayBuffer.isView(bytes), true);
  assert.throws(() => compileVoidLang('42'));
});

test('compileVoidLang result compiles to a WebAssembly object', async () => {
  const { instance, module } = await WebAssembly.instantiate(
    compileVoidLang('')
  );

  assert.strictEqual(instance instanceof WebAssembly.Instance, true);
  assert.strictEqual(module instanceof WebAssembly.Module, true);
});
