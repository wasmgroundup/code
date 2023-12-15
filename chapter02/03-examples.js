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

test.run();
