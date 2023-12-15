import { setup } from '../book.js';

const { test, assert, ohm, extractExamples } = setup('chapter02');

function testExtractedExamples(grammarSource) {
  const grammar = ohm.grammar(grammarSource);
  for (const ex of extractExamples(grammarSource)) {
    const result = grammar.match(ex.example, ex.rule);
    assert.is(result.succeeded(), ex.shouldMatch, JSON.stringify(ex));
  }
}

const grammarDef = `
  Wafer {
    Main = number
    number = digit+

    // Examples:
    //+ "42", "1"
    //- "abc"
  }
`;

test('Extracted examples', () => testExtractedExamples(grammarDef));

test.run();
