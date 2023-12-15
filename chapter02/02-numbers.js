import { setup } from '../book.js';

const { test, assert, ohm } = setup('chapter02');

const grammarDef = `
  Wafer {
    Main = number
    number = digit+
  }
`;

const wafer = ohm.grammar(grammarDef);

test('Wafer', () => {
  assert.ok(wafer.match('42').succeeded());
  assert.ok(wafer.match('1').succeeded());
  assert.not(wafer.match('abc').succeeded());
});

test.run();
