import * as ohm from 'ohm-js';
import {extractExamples} from 'ohm-js/extras';
import {suite} from 'uvu';
import * as assert from 'uvu/assert';

export function setup(chapterName) {
  const test = suite(chapterName);
  return {assert, extractExamples, ohm, test};
}
