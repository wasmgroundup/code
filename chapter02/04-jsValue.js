import { setup } from '../book.js';

const { test, assert, ohm, extractExamples } = setup('chapter02');

const grammarDef = `
  Wafer {
    Main = number
    number = digit+

    // Examples:
    //+ "42", "1"
    //- "abc"
  }
`;

const wafer = ohm.grammar(grammarDef);

test('Wafer examples', () => {
  for (const ex of extractExamples(grammarDef)) {
    const matchResult = wafer.match(ex.example, ex.rule);
    assert.is(matchResult.succeeded(), ex.shouldMatch);
  }
});

const semantics = wafer.createSemantics();
semantics.addOperation('jsValue', {
  Main(num) {
    // To evaluate a program, we need to evaluate the number.
    return num.jsValue();
  },
  number(digits) {
    // Evaluate the number with JavaScript's built in `parseInt` function.
    return parseInt(this.sourceString, 10);
  },
});

test('jsValue', () => {
  const getJsValue = (input) => semantics(wafer.match(input)).jsValue();
  assert.equal(getJsValue('42'), 42);
  assert.equal(getJsValue('0'), 0);
  assert.equal(getJsValue('99'), 99);
});

test.run();
