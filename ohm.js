(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ohm = {}));
})(this, (function (exports) { 'use strict';

  // --------------------------------------------------------------------

  // --------------------------------------------------------------------
  // Exports
  // --------------------------------------------------------------------

  function abstract(optMethodName) {
    const methodName = optMethodName || '';
    return function() {
      throw new Error(
          'this method ' +
          methodName +
          ' is abstract! ' +
          '(it has no implementation in class ' +
          this.constructor.name +
          ')',
      );
    };
  }

  function assert(cond, message) {
    if (!cond) {
      throw new Error(message || 'Assertion failed');
    }
  }

  // Define a lazily-computed, non-enumerable property named `propName`
  // on the object `obj`. `getterFn` will be called to compute the value the
  // first time the property is accessed.
  function defineLazyProperty(obj, propName, getterFn) {
    let memo;
    Object.defineProperty(obj, propName, {
      get() {
        if (!memo) {
          memo = getterFn.call(this);
        }
        return memo;
      },
    });
  }

  function clone(obj) {
    if (obj) {
      return Object.assign({}, obj);
    }
    return obj;
  }

  function repeatFn(fn, n) {
    const arr = [];
    while (n-- > 0) {
      arr.push(fn());
    }
    return arr;
  }

  function repeatStr(str, n) {
    return new Array(n + 1).join(str);
  }

  function repeat(x, n) {
    return repeatFn(() => x, n);
  }

  function getDuplicates(array) {
    const duplicates = [];
    for (let idx = 0; idx < array.length; idx++) {
      const x = array[idx];
      if (array.lastIndexOf(x) !== idx && duplicates.indexOf(x) < 0) {
        duplicates.push(x);
      }
    }
    return duplicates;
  }

  function copyWithoutDuplicates(array) {
    const noDuplicates = [];
    array.forEach(entry => {
      if (noDuplicates.indexOf(entry) < 0) {
        noDuplicates.push(entry);
      }
    });
    return noDuplicates;
  }

  function isSyntactic(ruleName) {
    const firstChar = ruleName[0];
    return firstChar === firstChar.toUpperCase();
  }

  function isLexical(ruleName) {
    return !isSyntactic(ruleName);
  }

  function padLeft(str, len, optChar) {
    const ch = optChar || ' ';
    if (str.length < len) {
      return repeatStr(ch, len - str.length) + str;
    }
    return str;
  }

  // StringBuffer

  function StringBuffer() {
    this.strings = [];
  }

  StringBuffer.prototype.append = function(str) {
    this.strings.push(str);
  };

  StringBuffer.prototype.contents = function() {
    return this.strings.join('');
  };

  const escapeUnicode = str => String.fromCodePoint(parseInt(str, 16));

  function unescapeCodePoint(s) {
    if (s.charAt(0) === '\\') {
      switch (s.charAt(1)) {
        case 'b':
          return '\b';
        case 'f':
          return '\f';
        case 'n':
          return '\n';
        case 'r':
          return '\r';
        case 't':
          return '\t';
        case 'v':
          return '\v';
        case 'x':
          return escapeUnicode(s.slice(2, 4));
        case 'u':
          return s.charAt(2) === '{' ?
            escapeUnicode(s.slice(3, -1)) :
            escapeUnicode(s.slice(2, 6));
        default:
          return s.charAt(1);
      }
    } else {
      return s;
    }
  }

  // Helper for producing a description of an unknown object in a safe way.
  // Especially useful for error messages where an unexpected type of object was encountered.
  function unexpectedObjToString(obj) {
    if (obj == null) {
      return String(obj);
    }
    const baseToString = Object.prototype.toString.call(obj);
    try {
      let typeName;
      if (obj.constructor && obj.constructor.name) {
        typeName = obj.constructor.name;
      } else if (baseToString.indexOf('[object ') === 0) {
        typeName = baseToString.slice(8, -1); // Extract e.g. "Array" from "[object Array]".
      } else {
        typeName = typeof obj;
      }
      return typeName + ': ' + JSON.stringify(String(obj));
    } catch (e) {
      return baseToString;
    }
  }

  var common = /*#__PURE__*/Object.freeze({
    __proto__: null,
    abstract: abstract,
    assert: assert,
    defineLazyProperty: defineLazyProperty,
    clone: clone,
    repeatFn: repeatFn,
    repeatStr: repeatStr,
    repeat: repeat,
    getDuplicates: getDuplicates,
    copyWithoutDuplicates: copyWithoutDuplicates,
    isSyntactic: isSyntactic,
    isLexical: isLexical,
    padLeft: padLeft,
    StringBuffer: StringBuffer,
    unescapeCodePoint: unescapeCodePoint,
    unexpectedObjToString: unexpectedObjToString
  });

  // These are just categories that are used in ES5/ES2015.
  // The full list of Unicode categories is here: http://www.fileformat.info/info/unicode/category/index.htm.
  const UnicodeCategories = {
    // Letters
    Lu: /\p{Lu}/u,
    Ll: /\p{Ll}/u,
    Lt: /\p{Lt}/u,
    Lm: /\p{Lm}/u,
    Lo: /\p{Lo}/u,

    // Numbers
    Nl: /\p{Nl}/u,
    Nd: /\p{Nd}/u,

    // Marks
    Mn: /\p{Mn}/u,
    Mc: /\p{Mc}/u,

    // Punctuation, Connector
    Pc: /\p{Pc}/u,

    // Separator, Space
    Zs: /\p{Zs}/u,

    // These two are not real Unicode categories, but our useful for Ohm.
    // L is a combination of all the letter categories.
    // Ltmo is a combination of Lt, Lm, and Lo.
    L: /\p{Letter}/u,
    Ltmo: /\p{Lt}|\p{Lm}|\p{Lo}/u,
  };

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  // General stuff

  class PExpr {
    constructor() {
      if (this.constructor === PExpr) {
        throw new Error("PExpr cannot be instantiated -- it's abstract");
      }
    }

    // Set the `source` property to the interval containing the source for this expression.
    withSource(interval) {
      if (interval) {
        this.source = interval.trimmed();
      }
      return this;
    }
  }

  // Any

  const any = Object.create(PExpr.prototype);

  // End

  const end = Object.create(PExpr.prototype);

  // Terminals

  class Terminal extends PExpr {
    constructor(obj) {
      super();
      this.obj = obj;
    }
  }

  // Ranges

  class Range extends PExpr {
    constructor(from, to) {
      super();
      this.from = from;
      this.to = to;
      // If either `from` or `to` is made up of multiple code units, then
      // the range should consume a full code point, not a single code unit.
      this.matchCodePoint = from.length > 1 || to.length > 1;
    }
  }

  // Parameters

  class Param extends PExpr {
    constructor(index) {
      super();
      this.index = index;
    }
  }

  // Alternation

  class Alt extends PExpr {
    constructor(terms) {
      super();
      this.terms = terms;
    }
  }

  // Extend is an implementation detail of rule extension

  class Extend extends Alt {
    constructor(superGrammar, name, body) {
      const origBody = superGrammar.rules[name].body;
      super([body, origBody]);

      this.superGrammar = superGrammar;
      this.name = name;
      this.body = body;
    }
  }

  // Splice is an implementation detail of rule overriding with the `...` operator.
  class Splice extends Alt {
    constructor(superGrammar, ruleName, beforeTerms, afterTerms) {
      const origBody = superGrammar.rules[ruleName].body;
      super([...beforeTerms, origBody, ...afterTerms]);

      this.superGrammar = superGrammar;
      this.ruleName = ruleName;
      this.expansionPos = beforeTerms.length;
    }
  }

  // Sequences

  class Seq extends PExpr {
    constructor(factors) {
      super();
      this.factors = factors;
    }
  }

  // Iterators and optionals

  class Iter extends PExpr {
    constructor(expr) {
      super();
      this.expr = expr;
    }
  }

  class Star extends Iter {}
  class Plus extends Iter {}
  class Opt extends Iter {}

  Star.prototype.operator = '*';
  Plus.prototype.operator = '+';
  Opt.prototype.operator = '?';

  Star.prototype.minNumMatches = 0;
  Plus.prototype.minNumMatches = 1;
  Opt.prototype.minNumMatches = 0;

  Star.prototype.maxNumMatches = Number.POSITIVE_INFINITY;
  Plus.prototype.maxNumMatches = Number.POSITIVE_INFINITY;
  Opt.prototype.maxNumMatches = 1;

  // Predicates

  class Not extends PExpr {
    constructor(expr) {
      super();
      this.expr = expr;
    }
  }

  class Lookahead extends PExpr {
    constructor(expr) {
      super();
      this.expr = expr;
    }
  }

  // "Lexification"

  class Lex extends PExpr {
    constructor(expr) {
      super();
      this.expr = expr;
    }
  }

  // Rule application

  class Apply extends PExpr {
    constructor(ruleName, args = []) {
      super();
      this.ruleName = ruleName;
      this.args = args;
    }

    isSyntactic() {
      return isSyntactic(this.ruleName);
    }

    // This method just caches the result of `this.toString()` in a non-enumerable property.
    toMemoKey() {
      if (!this._memoKey) {
        Object.defineProperty(this, '_memoKey', {value: this.toString()});
      }
      return this._memoKey;
    }
  }

  // Unicode character

  class UnicodeChar extends PExpr {
    constructor(category) {
      super();
      this.category = category;
      this.pattern = UnicodeCategories[category];
    }
  }

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  function createError(message, optInterval) {
    let e;
    if (optInterval) {
      e = new Error(optInterval.getLineAndColumnMessage() + message);
      e.shortMessage = message;
      e.interval = optInterval;
    } else {
      e = new Error(message);
    }
    return e;
  }

  // ----------------- errors about intervals -----------------

  function intervalSourcesDontMatch() {
    return createError("Interval sources don't match");
  }

  // ----------------- errors about grammars -----------------

  // Grammar syntax error

  function grammarSyntaxError(matchFailure) {
    const e = new Error();
    Object.defineProperty(e, 'message', {
      enumerable: true,
      get() {
        return matchFailure.message;
      },
    });
    Object.defineProperty(e, 'shortMessage', {
      enumerable: true,
      get() {
        return 'Expected ' + matchFailure.getExpectedText();
      },
    });
    e.interval = matchFailure.getInterval();
    return e;
  }

  // Undeclared grammar

  function undeclaredGrammar(grammarName, namespace, interval) {
    const message = namespace ?
      `Grammar ${grammarName} is not declared in namespace '${namespace}'` :
      'Undeclared grammar ' + grammarName;
    return createError(message, interval);
  }

  // Duplicate grammar declaration

  function duplicateGrammarDeclaration(grammar, namespace) {
    return createError('Grammar ' + grammar.name + ' is already declared in this namespace');
  }

  function grammarDoesNotSupportIncrementalParsing(grammar) {
    return createError(`Grammar '${grammar.name}' does not support incremental parsing`);
  }

  // ----------------- rules -----------------

  // Undeclared rule

  function undeclaredRule(ruleName, grammarName, optInterval) {
    return createError(
        'Rule ' + ruleName + ' is not declared in grammar ' + grammarName,
        optInterval,
    );
  }

  // Cannot override undeclared rule

  function cannotOverrideUndeclaredRule(ruleName, grammarName, optSource) {
    return createError(
        'Cannot override rule ' + ruleName + ' because it is not declared in ' + grammarName,
        optSource,
    );
  }

  // Cannot extend undeclared rule

  function cannotExtendUndeclaredRule(ruleName, grammarName, optSource) {
    return createError(
        'Cannot extend rule ' + ruleName + ' because it is not declared in ' + grammarName,
        optSource,
    );
  }

  // Duplicate rule declaration

  function duplicateRuleDeclaration(ruleName, grammarName, declGrammarName, optSource) {
    let message =
      "Duplicate declaration for rule '" + ruleName + "' in grammar '" + grammarName + "'";
    if (grammarName !== declGrammarName) {
      message += " (originally declared in '" + declGrammarName + "')";
    }
    return createError(message, optSource);
  }

  // Wrong number of parameters

  function wrongNumberOfParameters(ruleName, expected, actual, source) {
    return createError(
        'Wrong number of parameters for rule ' +
        ruleName +
        ' (expected ' +
        expected +
        ', got ' +
        actual +
        ')',
        source,
    );
  }

  // Wrong number of arguments

  function wrongNumberOfArguments(ruleName, expected, actual, expr) {
    return createError(
        'Wrong number of arguments for rule ' +
        ruleName +
        ' (expected ' +
        expected +
        ', got ' +
        actual +
        ')',
        expr,
    );
  }

  // Duplicate parameter names

  function duplicateParameterNames(ruleName, duplicates, source) {
    return createError(
        'Duplicate parameter names in rule ' + ruleName + ': ' + duplicates.join(', '),
        source,
    );
  }

  // Invalid parameter expression

  function invalidParameter(ruleName, expr) {
    return createError(
        'Invalid parameter to rule ' +
        ruleName +
        ': ' +
        expr +
        ' has arity ' +
        expr.getArity() +
        ', but parameter expressions must have arity 1',
        expr.source,
    );
  }

  // Application of syntactic rule from lexical rule

  const syntacticVsLexicalNote =
    'NOTE: A _syntactic rule_ is a rule whose name begins with a capital letter. ' +
    'See https://ohmjs.org/d/svl for more details.';

  function applicationOfSyntacticRuleFromLexicalContext(ruleName, applyExpr) {
    return createError(
        'Cannot apply syntactic rule ' + ruleName + ' from here (inside a lexical context)',
        applyExpr.source,
    );
  }

  // Lexical rule application used with applySyntactic

  function applySyntacticWithLexicalRuleApplication(applyExpr) {
    const {ruleName} = applyExpr;
    return createError(
        `applySyntactic is for syntactic rules, but '${ruleName}' is a lexical rule. ` +
        syntacticVsLexicalNote,
        applyExpr.source,
    );
  }

  // Application of applySyntactic in a syntactic context

  function unnecessaryExperimentalApplySyntactic(applyExpr) {
    return createError(
        'applySyntactic is not required here (in a syntactic context)',
        applyExpr.source,
    );
  }

  // Incorrect argument type

  function incorrectArgumentType(expectedType, expr) {
    return createError('Incorrect argument type: expected ' + expectedType, expr.source);
  }

  // Multiple instances of the super-splice operator (`...`) in the rule body.

  function multipleSuperSplices(expr) {
    return createError("'...' can appear at most once in a rule body", expr.source);
  }

  // Unicode code point escapes

  function invalidCodePoint(applyWrapper) {
    const node = applyWrapper._node;
    assert(node && node.isNonterminal() && node.ctorName === 'escapeChar_unicodeCodePoint');

    // Get an interval that covers all of the hex digits.
    const digitIntervals = applyWrapper.children.slice(1, -1).map(d => d.source);
    const fullInterval = digitIntervals[0].coverageWith(...digitIntervals.slice(1));
    return createError(
        `U+${fullInterval.contents} is not a valid Unicode code point`,
        fullInterval,
    );
  }

  // ----------------- Kleene operators -----------------

  function kleeneExprHasNullableOperand(kleeneExpr, applicationStack) {
    const actuals =
      applicationStack.length > 0 ? applicationStack[applicationStack.length - 1].args : [];
    const expr = kleeneExpr.expr.substituteParams(actuals);
    let message =
      'Nullable expression ' +
      expr +
      " is not allowed inside '" +
      kleeneExpr.operator +
      "' (possible infinite loop)";
    if (applicationStack.length > 0) {
      const stackTrace = applicationStack
          .map(app => new Apply(app.ruleName, app.args))
          .join('\n');
      message += '\nApplication stack (most recent application last):\n' + stackTrace;
    }
    return createError(message, kleeneExpr.expr.source);
  }

  // ----------------- arity -----------------

  function inconsistentArity(ruleName, expected, actual, expr) {
    return createError(
        'Rule ' +
        ruleName +
        ' involves an alternation which has inconsistent arity ' +
        '(expected ' +
        expected +
        ', got ' +
        actual +
        ')',
        expr.source,
    );
  }

  // ----------------- convenience -----------------

  function multipleErrors(errors) {
    const messages = errors.map(e => e.message);
    return createError(['Errors:'].concat(messages).join('\n- '), errors[0].interval);
  }

  // ----------------- semantic -----------------

  function missingSemanticAction(ctorName, name, type, stack) {
    let stackTrace = stack
        .slice(0, -1)
        .map(info => {
          const ans = '  ' + info[0].name + ' > ' + info[1];
          return info.length === 3 ? ans + " for '" + info[2] + "'" : ans;
        })
        .join('\n');
    stackTrace += '\n  ' + name + ' > ' + ctorName;

    let moreInfo = '';
    if (ctorName === '_iter') {
      moreInfo = [
        '\nNOTE: as of Ohm v16, there is no default action for iteration nodes — see ',
        '  https://ohmjs.org/d/dsa for details.',
      ].join('\n');
    }

    const message = [
      `Missing semantic action for '${ctorName}' in ${type} '${name}'.${moreInfo}`,
      'Action stack (most recent call last):',
      stackTrace,
    ].join('\n');

    const e = createError(message);
    e.name = 'missingSemanticAction';
    return e;
  }

  function throwErrors(errors) {
    if (errors.length === 1) {
      throw errors[0];
    }
    if (errors.length > 1) {
      throw multipleErrors(errors);
    }
  }

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  // Given an array of numbers `arr`, return an array of the numbers as strings,
  // right-justified and padded to the same length.
  function padNumbersToEqualLength(arr) {
    let maxLen = 0;
    const strings = arr.map(n => {
      const str = n.toString();
      maxLen = Math.max(maxLen, str.length);
      return str;
    });
    return strings.map(s => padLeft(s, maxLen));
  }

  // Produce a new string that would be the result of copying the contents
  // of the string `src` onto `dest` at offset `offest`.
  function strcpy(dest, src, offset) {
    const origDestLen = dest.length;
    const start = dest.slice(0, offset);
    const end = dest.slice(offset + src.length);
    return (start + src + end).substr(0, origDestLen);
  }

  // Casts the underlying lineAndCol object to a formatted message string,
  // highlighting `ranges`.
  function lineAndColumnToMessage(...ranges) {
    const lineAndCol = this;
    const {offset} = lineAndCol;
    const {repeatStr} = common;

    const sb = new StringBuffer();
    sb.append('Line ' + lineAndCol.lineNum + ', col ' + lineAndCol.colNum + ':\n');

    // An array of the previous, current, and next line numbers as strings of equal length.
    const lineNumbers = padNumbersToEqualLength([
      lineAndCol.prevLine == null ? 0 : lineAndCol.lineNum - 1,
      lineAndCol.lineNum,
      lineAndCol.nextLine == null ? 0 : lineAndCol.lineNum + 1,
    ]);

    // Helper for appending formatting input lines to the buffer.
    const appendLine = (num, content, prefix) => {
      sb.append(prefix + lineNumbers[num] + ' | ' + content + '\n');
    };

    // Include the previous line for context if possible.
    if (lineAndCol.prevLine != null) {
      appendLine(0, lineAndCol.prevLine, '  ');
    }
    // Line that the error occurred on.
    appendLine(1, lineAndCol.line, '> ');

    // Build up the line that points to the offset and possible indicates one or more ranges.
    // Start with a blank line, and indicate each range by overlaying a string of `~` chars.
    const lineLen = lineAndCol.line.length;
    let indicationLine = repeatStr(' ', lineLen + 1);
    for (let i = 0; i < ranges.length; ++i) {
      let startIdx = ranges[i][0];
      let endIdx = ranges[i][1];
      assert(startIdx >= 0 && startIdx <= endIdx, 'range start must be >= 0 and <= end');

      const lineStartOffset = offset - lineAndCol.colNum + 1;
      startIdx = Math.max(0, startIdx - lineStartOffset);
      endIdx = Math.min(endIdx - lineStartOffset, lineLen);

      indicationLine = strcpy(indicationLine, repeatStr('~', endIdx - startIdx), startIdx);
    }
    const gutterWidth = 2 + lineNumbers[1].length + 3;
    sb.append(repeatStr(' ', gutterWidth));
    indicationLine = strcpy(indicationLine, '^', lineAndCol.colNum - 1);
    sb.append(indicationLine.replace(/ +$/, '') + '\n');

    // Include the next line for context if possible.
    if (lineAndCol.nextLine != null) {
      appendLine(2, lineAndCol.nextLine, '  ');
    }
    return sb.contents();
  }

  // --------------------------------------------------------------------
  // Exports
  // --------------------------------------------------------------------

  let builtInRulesCallbacks = [];

  // Since Grammar.BuiltInRules is bootstrapped, most of Ohm can't directly depend it.
  // This function allows modules that do depend on the built-in rules to register a callback
  // that will be called later in the initialization process.
  function awaitBuiltInRules(cb) {
    builtInRulesCallbacks.push(cb);
  }

  function announceBuiltInRules(grammar) {
    builtInRulesCallbacks.forEach(cb => {
      cb(grammar);
    });
    builtInRulesCallbacks = null;
  }

  // Return an object with the line and column information for the given
  // offset in `str`.
  function getLineAndColumn(str, offset) {
    let lineNum = 1;
    let colNum = 1;

    let currOffset = 0;
    let lineStartOffset = 0;

    let nextLine = null;
    let prevLine = null;
    let prevLineStartOffset = -1;

    while (currOffset < offset) {
      const c = str.charAt(currOffset++);
      if (c === '\n') {
        lineNum++;
        colNum = 1;
        prevLineStartOffset = lineStartOffset;
        lineStartOffset = currOffset;
      } else if (c !== '\r') {
        colNum++;
      }
    }

    // Find the end of the target line.
    let lineEndOffset = str.indexOf('\n', lineStartOffset);
    if (lineEndOffset === -1) {
      lineEndOffset = str.length;
    } else {
      // Get the next line.
      const nextLineEndOffset = str.indexOf('\n', lineEndOffset + 1);
      nextLine =
        nextLineEndOffset === -1 ?
          str.slice(lineEndOffset) :
          str.slice(lineEndOffset, nextLineEndOffset);
      // Strip leading and trailing EOL char(s).
      nextLine = nextLine.replace(/^\r?\n/, '').replace(/\r$/, '');
    }

    // Get the previous line.
    if (prevLineStartOffset >= 0) {
      // Strip trailing EOL char(s).
      prevLine = str.slice(prevLineStartOffset, lineStartOffset).replace(/\r?\n$/, '');
    }

    // Get the target line, stripping a trailing carriage return if necessary.
    const line = str.slice(lineStartOffset, lineEndOffset).replace(/\r$/, '');

    return {
      offset,
      lineNum,
      colNum,
      line,
      prevLine,
      nextLine,
      toString: lineAndColumnToMessage,
    };
  }

  // Return a nicely-formatted string describing the line and column for the
  // given offset in `str` highlighting `ranges`.
  function getLineAndColumnMessage(str, offset, ...ranges) {
    return getLineAndColumn(str, offset).toString(...ranges);
  }

  const uniqueId = (() => {
    let idCounter = 0;
    return prefix => '' + prefix + idCounter++;
  })();

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  class Interval {
    constructor(sourceString, startIdx, endIdx) {
      this.sourceString = sourceString;
      this.startIdx = startIdx;
      this.endIdx = endIdx;
    }

    get contents() {
      if (this._contents === undefined) {
        this._contents = this.sourceString.slice(this.startIdx, this.endIdx);
      }
      return this._contents;
    }

    get length() {
      return this.endIdx - this.startIdx;
    }

    coverageWith(...intervals) {
      return Interval.coverage(...intervals, this);
    }

    collapsedLeft() {
      return new Interval(this.sourceString, this.startIdx, this.startIdx);
    }

    collapsedRight() {
      return new Interval(this.sourceString, this.endIdx, this.endIdx);
    }

    getLineAndColumn() {
      return getLineAndColumn(this.sourceString, this.startIdx);
    }

    getLineAndColumnMessage() {
      const range = [this.startIdx, this.endIdx];
      return getLineAndColumnMessage(this.sourceString, this.startIdx, range);
    }

    // Returns an array of 0, 1, or 2 intervals that represents the result of the
    // interval difference operation.
    minus(that) {
      if (this.sourceString !== that.sourceString) {
        throw intervalSourcesDontMatch();
      } else if (this.startIdx === that.startIdx && this.endIdx === that.endIdx) {
        // `this` and `that` are the same interval!
        return [];
      } else if (this.startIdx < that.startIdx && that.endIdx < this.endIdx) {
        // `that` splits `this` into two intervals
        return [
          new Interval(this.sourceString, this.startIdx, that.startIdx),
          new Interval(this.sourceString, that.endIdx, this.endIdx),
        ];
      } else if (this.startIdx < that.endIdx && that.endIdx < this.endIdx) {
        // `that` contains a prefix of `this`
        return [new Interval(this.sourceString, that.endIdx, this.endIdx)];
      } else if (this.startIdx < that.startIdx && that.startIdx < this.endIdx) {
        // `that` contains a suffix of `this`
        return [new Interval(this.sourceString, this.startIdx, that.startIdx)];
      } else {
        // `that` and `this` do not overlap
        return [this];
      }
    }

    // Returns a new Interval that has the same extent as this one, but which is relative
    // to `that`, an Interval that fully covers this one.
    relativeTo(that) {
      if (this.sourceString !== that.sourceString) {
        throw intervalSourcesDontMatch();
      }
      assert(
          this.startIdx >= that.startIdx && this.endIdx <= that.endIdx,
          'other interval does not cover this one',
      );
      return new Interval(
          this.sourceString,
          this.startIdx - that.startIdx,
          this.endIdx - that.startIdx,
      );
    }

    // Returns a new Interval which contains the same contents as this one,
    // but with whitespace trimmed from both ends.
    trimmed() {
      const {contents} = this;
      const startIdx = this.startIdx + contents.match(/^\s*/)[0].length;
      const endIdx = this.endIdx - contents.match(/\s*$/)[0].length;
      return new Interval(this.sourceString, startIdx, endIdx);
    }

    subInterval(offset, len) {
      const newStartIdx = this.startIdx + offset;
      return new Interval(this.sourceString, newStartIdx, newStartIdx + len);
    }
  }

  Interval.coverage = function(firstInterval, ...intervals) {
    let {startIdx, endIdx} = firstInterval;
    for (const interval of intervals) {
      if (interval.sourceString !== firstInterval.sourceString) {
        throw intervalSourcesDontMatch();
      } else {
        startIdx = Math.min(startIdx, interval.startIdx);
        endIdx = Math.max(endIdx, interval.endIdx);
      }
    }
    return new Interval(firstInterval.sourceString, startIdx, endIdx);
  };

  const MAX_CHAR_CODE = 0xffff;

  class InputStream {
    constructor(source) {
      this.source = source;
      this.pos = 0;
      this.examinedLength = 0;
    }

    atEnd() {
      const ans = this.pos >= this.source.length;
      this.examinedLength = Math.max(this.examinedLength, this.pos + 1);
      return ans;
    }

    next() {
      const ans = this.source[this.pos++];
      this.examinedLength = Math.max(this.examinedLength, this.pos);
      return ans;
    }

    nextCharCode() {
      const nextChar = this.next();
      return nextChar && nextChar.charCodeAt(0);
    }

    nextCodePoint() {
      const cp = this.source.slice(this.pos++).codePointAt(0);
      // If the code point is beyond plane 0, it takes up two characters.
      if (cp > MAX_CHAR_CODE) {
        this.pos += 1;
      }
      this.examinedLength = Math.max(this.examinedLength, this.pos);
      return cp;
    }

    matchString(s, optIgnoreCase) {
      let idx;
      if (optIgnoreCase) {
        /*
          Case-insensitive comparison is a tricky business. Some notable gotchas include the
          "Turkish I" problem (http://www.i18nguy.com/unicode/turkish-i18n.html) and the fact
          that the German Esszet (ß) turns into "SS" in upper case.

          This is intended to be a locale-invariant comparison, which means it may not obey
          locale-specific expectations (e.g. "i" => "İ").
         */
        for (idx = 0; idx < s.length; idx++) {
          const actual = this.next();
          const expected = s[idx];
          if (actual == null || actual.toUpperCase() !== expected.toUpperCase()) {
            return false;
          }
        }
        return true;
      }
      // Default is case-sensitive comparison.
      for (idx = 0; idx < s.length; idx++) {
        if (this.next() !== s[idx]) {
          return false;
        }
      }
      return true;
    }

    sourceSlice(startIdx, endIdx) {
      return this.source.slice(startIdx, endIdx);
    }

    interval(startIdx, optEndIdx) {
      return new Interval(this.source, startIdx, optEndIdx ? optEndIdx : this.pos);
    }
  }

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  class MatchResult {
    constructor(
        matcher,
        input,
        startExpr,
        cst,
        cstOffset,
        rightmostFailurePosition,
        optRecordedFailures,
    ) {
      this.matcher = matcher;
      this.input = input;
      this.startExpr = startExpr;
      this._cst = cst;
      this._cstOffset = cstOffset;
      this._rightmostFailurePosition = rightmostFailurePosition;
      this._rightmostFailures = optRecordedFailures;

      if (this.failed()) {
        /* eslint-disable no-invalid-this */
        defineLazyProperty(this, 'message', function() {
          const detail = 'Expected ' + this.getExpectedText();
          return (
            getLineAndColumnMessage(this.input, this.getRightmostFailurePosition()) + detail
          );
        });
        defineLazyProperty(this, 'shortMessage', function() {
          const detail = 'expected ' + this.getExpectedText();
          const errorInfo = getLineAndColumn(
              this.input,
              this.getRightmostFailurePosition(),
          );
          return 'Line ' + errorInfo.lineNum + ', col ' + errorInfo.colNum + ': ' + detail;
        });
        /* eslint-enable no-invalid-this */
      }
    }

    succeeded() {
      return !!this._cst;
    }

    failed() {
      return !this.succeeded();
    }

    getRightmostFailurePosition() {
      return this._rightmostFailurePosition;
    }

    getRightmostFailures() {
      if (!this._rightmostFailures) {
        this.matcher.setInput(this.input);
        const matchResultWithFailures = this.matcher._match(this.startExpr, {
          tracing: false,
          positionToRecordFailures: this.getRightmostFailurePosition(),
        });
        this._rightmostFailures = matchResultWithFailures.getRightmostFailures();
      }
      return this._rightmostFailures;
    }

    toString() {
      return this.succeeded() ?
        '[match succeeded]' :
        '[match failed at position ' + this.getRightmostFailurePosition() + ']';
    }

    // Return a string summarizing the expected contents of the input stream when
    // the match failure occurred.
    getExpectedText() {
      if (this.succeeded()) {
        throw new Error('cannot get expected text of a successful MatchResult');
      }

      const sb = new StringBuffer();
      let failures = this.getRightmostFailures();

      // Filter out the fluffy failures to make the default error messages more useful
      failures = failures.filter(failure => !failure.isFluffy());

      for (let idx = 0; idx < failures.length; idx++) {
        if (idx > 0) {
          if (idx === failures.length - 1) {
            sb.append(failures.length > 2 ? ', or ' : ' or ');
          } else {
            sb.append(', ');
          }
        }
        sb.append(failures[idx].toString());
      }
      return sb.contents();
    }

    getInterval() {
      const pos = this.getRightmostFailurePosition();
      return new Interval(this.input, pos, pos);
    }
  }

  class PosInfo {
    constructor() {
      this.applicationMemoKeyStack = []; // active applications at this position
      this.memo = {};
      this.maxExaminedLength = 0;
      this.maxRightmostFailureOffset = -1;
      this.currentLeftRecursion = undefined;
    }

    isActive(application) {
      return this.applicationMemoKeyStack.indexOf(application.toMemoKey()) >= 0;
    }

    enter(application) {
      this.applicationMemoKeyStack.push(application.toMemoKey());
    }

    exit() {
      this.applicationMemoKeyStack.pop();
    }

    startLeftRecursion(headApplication, memoRec) {
      memoRec.isLeftRecursion = true;
      memoRec.headApplication = headApplication;
      memoRec.nextLeftRecursion = this.currentLeftRecursion;
      this.currentLeftRecursion = memoRec;

      const {applicationMemoKeyStack} = this;
      const indexOfFirstInvolvedRule =
        applicationMemoKeyStack.indexOf(headApplication.toMemoKey()) + 1;
      const involvedApplicationMemoKeys = applicationMemoKeyStack.slice(
          indexOfFirstInvolvedRule,
      );

      memoRec.isInvolved = function(applicationMemoKey) {
        return involvedApplicationMemoKeys.indexOf(applicationMemoKey) >= 0;
      };

      memoRec.updateInvolvedApplicationMemoKeys = function() {
        for (let idx = indexOfFirstInvolvedRule; idx < applicationMemoKeyStack.length; idx++) {
          const applicationMemoKey = applicationMemoKeyStack[idx];
          if (!this.isInvolved(applicationMemoKey)) {
            involvedApplicationMemoKeys.push(applicationMemoKey);
          }
        }
      };
    }

    endLeftRecursion() {
      this.currentLeftRecursion = this.currentLeftRecursion.nextLeftRecursion;
    }

    // Note: this method doesn't get called for the "head" of a left recursion -- for LR heads,
    // the memoized result (which starts out being a failure) is always used.
    shouldUseMemoizedResult(memoRec) {
      if (!memoRec.isLeftRecursion) {
        return true;
      }
      const {applicationMemoKeyStack} = this;
      for (let idx = 0; idx < applicationMemoKeyStack.length; idx++) {
        const applicationMemoKey = applicationMemoKeyStack[idx];
        if (memoRec.isInvolved(applicationMemoKey)) {
          return false;
        }
      }
      return true;
    }

    memoize(memoKey, memoRec) {
      this.memo[memoKey] = memoRec;
      this.maxExaminedLength = Math.max(this.maxExaminedLength, memoRec.examinedLength);
      this.maxRightmostFailureOffset = Math.max(
          this.maxRightmostFailureOffset,
          memoRec.rightmostFailureOffset,
      );
      return memoRec;
    }

    clearObsoleteEntries(pos, invalidatedIdx) {
      if (pos + this.maxExaminedLength <= invalidatedIdx) {
        // Optimization: none of the rule applications that were memoized here examined the
        // interval of the input that changed, so nothing has to be invalidated.
        return;
      }

      const {memo} = this;
      this.maxExaminedLength = 0;
      this.maxRightmostFailureOffset = -1;
      Object.keys(memo).forEach(k => {
        const memoRec = memo[k];
        if (pos + memoRec.examinedLength > invalidatedIdx) {
          delete memo[k];
        } else {
          this.maxExaminedLength = Math.max(this.maxExaminedLength, memoRec.examinedLength);
          this.maxRightmostFailureOffset = Math.max(
              this.maxRightmostFailureOffset,
              memoRec.rightmostFailureOffset,
          );
        }
      });
    }
  }

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  // Unicode characters that are used in the `toString` output.
  const BALLOT_X = '\u2717';
  const CHECK_MARK = '\u2713';
  const DOT_OPERATOR = '\u22C5';
  const RIGHTWARDS_DOUBLE_ARROW = '\u21D2';
  const SYMBOL_FOR_HORIZONTAL_TABULATION = '\u2409';
  const SYMBOL_FOR_LINE_FEED = '\u240A';
  const SYMBOL_FOR_CARRIAGE_RETURN = '\u240D';

  const Flags = {
    succeeded: 1 << 0,
    isRootNode: 1 << 1,
    isImplicitSpaces: 1 << 2,
    isMemoized: 1 << 3,
    isHeadOfLeftRecursion: 1 << 4,
    terminatesLR: 1 << 5,
  };

  function spaces(n) {
    return repeat(' ', n).join('');
  }

  // Return a string representation of a portion of `input` at offset `pos`.
  // The result will contain exactly `len` characters.
  function getInputExcerpt(input, pos, len) {
    const excerpt = asEscapedString(input.slice(pos, pos + len));

    // Pad the output if necessary.
    if (excerpt.length < len) {
      return excerpt + repeat(' ', len - excerpt.length).join('');
    }
    return excerpt;
  }

  function asEscapedString(obj) {
    if (typeof obj === 'string') {
      // Replace non-printable characters with visible symbols.
      return obj
          .replace(/ /g, DOT_OPERATOR)
          .replace(/\t/g, SYMBOL_FOR_HORIZONTAL_TABULATION)
          .replace(/\n/g, SYMBOL_FOR_LINE_FEED)
          .replace(/\r/g, SYMBOL_FOR_CARRIAGE_RETURN);
    }
    return String(obj);
  }

  // ----------------- Trace -----------------

  class Trace {
    constructor(input, pos1, pos2, expr, succeeded, bindings, optChildren) {
      this.input = input;
      this.pos = this.pos1 = pos1;
      this.pos2 = pos2;
      this.source = new Interval(input, pos1, pos2);
      this.expr = expr;
      this.bindings = bindings;
      this.children = optChildren || [];
      this.terminatingLREntry = null;

      this._flags = succeeded ? Flags.succeeded : 0;
    }

    get displayString() {
      return this.expr.toDisplayString();
    }

    clone() {
      return this.cloneWithExpr(this.expr);
    }

    cloneWithExpr(expr) {
      const ans = new Trace(
          this.input,
          this.pos,
          this.pos2,
          expr,
          this.succeeded,
          this.bindings,
          this.children,
      );

      ans.isHeadOfLeftRecursion = this.isHeadOfLeftRecursion;
      ans.isImplicitSpaces = this.isImplicitSpaces;
      ans.isMemoized = this.isMemoized;
      ans.isRootNode = this.isRootNode;
      ans.terminatesLR = this.terminatesLR;
      ans.terminatingLREntry = this.terminatingLREntry;
      return ans;
    }

    // Record the trace information for the terminating condition of the LR loop.
    recordLRTermination(ruleBodyTrace, value) {
      this.terminatingLREntry = new Trace(
          this.input,
          this.pos,
          this.pos2,
          this.expr,
          false,
          [value],
          [ruleBodyTrace],
      );
      this.terminatingLREntry.terminatesLR = true;
    }

    // Recursively traverse this trace node and all its descendents, calling a visitor function
    // for each node that is visited. If `vistorObjOrFn` is an object, then its 'enter' property
    // is a function to call before visiting the children of a node, and its 'exit' property is
    // a function to call afterwards. If `visitorObjOrFn` is a function, it represents the 'enter'
    // function.
    //
    // The functions are called with three arguments: the Trace node, its parent Trace, and a number
    // representing the depth of the node in the tree. (The root node has depth 0.) `optThisArg`, if
    // specified, is the value to use for `this` when executing the visitor functions.
    walk(visitorObjOrFn, optThisArg) {
      let visitor = visitorObjOrFn;
      if (typeof visitor === 'function') {
        visitor = {enter: visitor};
      }

      function _walk(node, parent, depth) {
        let recurse = true;
        if (visitor.enter) {
          if (visitor.enter.call(optThisArg, node, parent, depth) === Trace.prototype.SKIP) {
            recurse = false;
          }
        }
        if (recurse) {
          node.children.forEach(child => {
            _walk(child, node, depth + 1);
          });
          if (visitor.exit) {
            visitor.exit.call(optThisArg, node, parent, depth);
          }
        }
      }
      if (this.isRootNode) {
        // Don't visit the root node itself, only its children.
        this.children.forEach(c => {
          _walk(c, null, 0);
        });
      } else {
        _walk(this, null, 0);
      }
    }

    // Return a string representation of the trace.
    // Sample:
    //     12⋅+⋅2⋅*⋅3 ✓ exp ⇒  "12"
    //     12⋅+⋅2⋅*⋅3   ✓ addExp (LR) ⇒  "12"
    //     12⋅+⋅2⋅*⋅3       ✗ addExp_plus
    toString() {
      const sb = new StringBuffer();
      this.walk((node, parent, depth) => {
        if (!node) {
          return this.SKIP;
        }
        const ctorName = node.expr.constructor.name;
        // Don't print anything for Alt nodes.
        if (ctorName === 'Alt') {
          return; // eslint-disable-line consistent-return
        }
        sb.append(getInputExcerpt(node.input, node.pos, 10) + spaces(depth * 2 + 1));
        sb.append((node.succeeded ? CHECK_MARK : BALLOT_X) + ' ' + node.displayString);
        if (node.isHeadOfLeftRecursion) {
          sb.append(' (LR)');
        }
        if (node.succeeded) {
          const contents = asEscapedString(node.source.contents);
          sb.append(' ' + RIGHTWARDS_DOUBLE_ARROW + '  ');
          sb.append(typeof contents === 'string' ? '"' + contents + '"' : contents);
        }
        sb.append('\n');
      });
      return sb.contents();
    }
  }

  // A value that can be returned from visitor functions to indicate that a
  // node should not be recursed into.
  Trace.prototype.SKIP = {};

  // For convenience, create a getter and setter for the boolean flags in `Flags`.
  Object.keys(Flags).forEach(name => {
    const mask = Flags[name];
    Object.defineProperty(Trace.prototype, name, {
      get() {
        return (this._flags & mask) !== 0;
      },
      set(val) {
        if (val) {
          this._flags |= mask;
        } else {
          this._flags &= ~mask;
        }
      },
    });
  });

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  /*
    Return true if we should skip spaces preceding this expression in a syntactic context.
  */
  PExpr.prototype.allowsSkippingPrecedingSpace = abstract('allowsSkippingPrecedingSpace');

  /*
    Generally, these are all first-order expressions and (with the exception of Apply)
    directly read from the input stream.
  */
  any.allowsSkippingPrecedingSpace =
    end.allowsSkippingPrecedingSpace =
    Apply.prototype.allowsSkippingPrecedingSpace =
    Terminal.prototype.allowsSkippingPrecedingSpace =
    Range.prototype.allowsSkippingPrecedingSpace =
    UnicodeChar.prototype.allowsSkippingPrecedingSpace =
      function() {
        return true;
      };

  /*
    Higher-order expressions that don't directly consume input.
  */
  Alt.prototype.allowsSkippingPrecedingSpace =
    Iter.prototype.allowsSkippingPrecedingSpace =
    Lex.prototype.allowsSkippingPrecedingSpace =
    Lookahead.prototype.allowsSkippingPrecedingSpace =
    Not.prototype.allowsSkippingPrecedingSpace =
    Param.prototype.allowsSkippingPrecedingSpace =
    Seq.prototype.allowsSkippingPrecedingSpace =
      function() {
        return false;
      };

  let BuiltInRules$1;

  awaitBuiltInRules(g => {
    BuiltInRules$1 = g;
  });

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  let lexifyCount;

  PExpr.prototype.assertAllApplicationsAreValid = function(ruleName, grammar) {
    lexifyCount = 0;
    this._assertAllApplicationsAreValid(ruleName, grammar);
  };

  PExpr.prototype._assertAllApplicationsAreValid = abstract(
      '_assertAllApplicationsAreValid',
  );

  any._assertAllApplicationsAreValid =
    end._assertAllApplicationsAreValid =
    Terminal.prototype._assertAllApplicationsAreValid =
    Range.prototype._assertAllApplicationsAreValid =
    Param.prototype._assertAllApplicationsAreValid =
    UnicodeChar.prototype._assertAllApplicationsAreValid =
      function(ruleName, grammar) {
        // no-op
      };

  Lex.prototype._assertAllApplicationsAreValid = function(ruleName, grammar) {
    lexifyCount++;
    this.expr._assertAllApplicationsAreValid(ruleName, grammar);
    lexifyCount--;
  };

  Alt.prototype._assertAllApplicationsAreValid = function(ruleName, grammar) {
    for (let idx = 0; idx < this.terms.length; idx++) {
      this.terms[idx]._assertAllApplicationsAreValid(ruleName, grammar);
    }
  };

  Seq.prototype._assertAllApplicationsAreValid = function(ruleName, grammar) {
    for (let idx = 0; idx < this.factors.length; idx++) {
      this.factors[idx]._assertAllApplicationsAreValid(ruleName, grammar);
    }
  };

  Iter.prototype._assertAllApplicationsAreValid =
    Not.prototype._assertAllApplicationsAreValid =
    Lookahead.prototype._assertAllApplicationsAreValid =
      function(ruleName, grammar) {
        this.expr._assertAllApplicationsAreValid(ruleName, grammar);
      };

  Apply.prototype._assertAllApplicationsAreValid = function(
      ruleName,
      grammar,
      skipSyntacticCheck = false,
  ) {
    const ruleInfo = grammar.rules[this.ruleName];
    const isContextSyntactic = isSyntactic(ruleName) && lexifyCount === 0;

    // Make sure that the rule exists...
    if (!ruleInfo) {
      throw undeclaredRule(this.ruleName, grammar.name, this.source);
    }

    // ...and that this application is allowed
    if (!skipSyntacticCheck && isSyntactic(this.ruleName) && !isContextSyntactic) {
      throw applicationOfSyntacticRuleFromLexicalContext(this.ruleName, this);
    }

    // ...and that this application has the correct number of arguments.
    const actual = this.args.length;
    const expected = ruleInfo.formals.length;
    if (actual !== expected) {
      throw wrongNumberOfArguments(this.ruleName, expected, actual, this.source);
    }

    const isBuiltInApplySyntactic =
      BuiltInRules$1 && ruleInfo === BuiltInRules$1.rules.applySyntactic;
    const isBuiltInCaseInsensitive =
      BuiltInRules$1 && ruleInfo === BuiltInRules$1.rules.caseInsensitive;

    // If it's an application of 'caseInsensitive', ensure that the argument is a Terminal.
    if (isBuiltInCaseInsensitive) {
      if (!(this.args[0] instanceof Terminal)) {
        throw incorrectArgumentType('a Terminal (e.g. "abc")', this.args[0]);
      }
    }

    if (isBuiltInApplySyntactic) {
      const arg = this.args[0];
      if (!(arg instanceof Apply)) {
        throw incorrectArgumentType('a syntactic rule application', arg);
      }
      if (!isSyntactic(arg.ruleName)) {
        throw applySyntacticWithLexicalRuleApplication(arg);
      }
      if (isContextSyntactic) {
        throw unnecessaryExperimentalApplySyntactic(this);
      }
    }

    // ...and that all of the argument expressions only have valid applications and have arity 1.
    // If `this` is an application of the built-in applySyntactic rule, then its arg is
    // allowed (and expected) to be a syntactic rule, even if we're in a lexical context.
    this.args.forEach(arg => {
      arg._assertAllApplicationsAreValid(ruleName, grammar, isBuiltInApplySyntactic);
      if (arg.getArity() !== 1) {
        throw invalidParameter(this.ruleName, arg);
      }
    });
  };

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  PExpr.prototype.assertChoicesHaveUniformArity = abstract(
      'assertChoicesHaveUniformArity',
  );

  any.assertChoicesHaveUniformArity =
    end.assertChoicesHaveUniformArity =
    Terminal.prototype.assertChoicesHaveUniformArity =
    Range.prototype.assertChoicesHaveUniformArity =
    Param.prototype.assertChoicesHaveUniformArity =
    Lex.prototype.assertChoicesHaveUniformArity =
    UnicodeChar.prototype.assertChoicesHaveUniformArity =
      function(ruleName) {
        // no-op
      };

  Alt.prototype.assertChoicesHaveUniformArity = function(ruleName) {
    if (this.terms.length === 0) {
      return;
    }
    const arity = this.terms[0].getArity();
    for (let idx = 0; idx < this.terms.length; idx++) {
      const term = this.terms[idx];
      term.assertChoicesHaveUniformArity();
      const otherArity = term.getArity();
      if (arity !== otherArity) {
        throw inconsistentArity(ruleName, arity, otherArity, term);
      }
    }
  };

  Extend.prototype.assertChoicesHaveUniformArity = function(ruleName) {
    // Extend is a special case of Alt that's guaranteed to have exactly two
    // cases: [extensions, origBody].
    const actualArity = this.terms[0].getArity();
    const expectedArity = this.terms[1].getArity();
    if (actualArity !== expectedArity) {
      throw inconsistentArity(ruleName, expectedArity, actualArity, this.terms[0]);
    }
  };

  Seq.prototype.assertChoicesHaveUniformArity = function(ruleName) {
    for (let idx = 0; idx < this.factors.length; idx++) {
      this.factors[idx].assertChoicesHaveUniformArity(ruleName);
    }
  };

  Iter.prototype.assertChoicesHaveUniformArity = function(ruleName) {
    this.expr.assertChoicesHaveUniformArity(ruleName);
  };

  Not.prototype.assertChoicesHaveUniformArity = function(ruleName) {
    // no-op (not required b/c the nested expr doesn't show up in the CST)
  };

  Lookahead.prototype.assertChoicesHaveUniformArity = function(ruleName) {
    this.expr.assertChoicesHaveUniformArity(ruleName);
  };

  Apply.prototype.assertChoicesHaveUniformArity = function(ruleName) {
    // The arities of the parameter expressions is required to be 1 by
    // `assertAllApplicationsAreValid()`.
  };

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  PExpr.prototype.assertIteratedExprsAreNotNullable = abstract(
      'assertIteratedExprsAreNotNullable',
  );

  any.assertIteratedExprsAreNotNullable =
    end.assertIteratedExprsAreNotNullable =
    Terminal.prototype.assertIteratedExprsAreNotNullable =
    Range.prototype.assertIteratedExprsAreNotNullable =
    Param.prototype.assertIteratedExprsAreNotNullable =
    UnicodeChar.prototype.assertIteratedExprsAreNotNullable =
      function(grammar) {
        // no-op
      };

  Alt.prototype.assertIteratedExprsAreNotNullable = function(grammar) {
    for (let idx = 0; idx < this.terms.length; idx++) {
      this.terms[idx].assertIteratedExprsAreNotNullable(grammar);
    }
  };

  Seq.prototype.assertIteratedExprsAreNotNullable = function(grammar) {
    for (let idx = 0; idx < this.factors.length; idx++) {
      this.factors[idx].assertIteratedExprsAreNotNullable(grammar);
    }
  };

  Iter.prototype.assertIteratedExprsAreNotNullable = function(grammar) {
    // Note: this is the implementation of this method for `Star` and `Plus` expressions.
    // It is overridden for `Opt` below.
    this.expr.assertIteratedExprsAreNotNullable(grammar);
    if (this.expr.isNullable(grammar)) {
      throw kleeneExprHasNullableOperand(this, []);
    }
  };

  Opt.prototype.assertIteratedExprsAreNotNullable =
    Not.prototype.assertIteratedExprsAreNotNullable =
    Lookahead.prototype.assertIteratedExprsAreNotNullable =
    Lex.prototype.assertIteratedExprsAreNotNullable =
      function(grammar) {
        this.expr.assertIteratedExprsAreNotNullable(grammar);
      };

  Apply.prototype.assertIteratedExprsAreNotNullable = function(grammar) {
    this.args.forEach(arg => {
      arg.assertIteratedExprsAreNotNullable(grammar);
    });
  };

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  class Node {
    constructor(matchLength) {
      this.matchLength = matchLength;
    }

    get ctorName() {
      throw new Error('subclass responsibility');
    }

    numChildren() {
      return this.children ? this.children.length : 0;
    }

    childAt(idx) {
      if (this.children) {
        return this.children[idx];
      }
    }

    indexOfChild(arg) {
      return this.children.indexOf(arg);
    }

    hasChildren() {
      return this.numChildren() > 0;
    }

    hasNoChildren() {
      return !this.hasChildren();
    }

    onlyChild() {
      if (this.numChildren() !== 1) {
        throw new Error(
            'cannot get only child of a node of type ' +
            this.ctorName +
            ' (it has ' +
            this.numChildren() +
            ' children)',
        );
      } else {
        return this.firstChild();
      }
    }

    firstChild() {
      if (this.hasNoChildren()) {
        throw new Error(
            'cannot get first child of a ' + this.ctorName + ' node, which has no children',
        );
      } else {
        return this.childAt(0);
      }
    }

    lastChild() {
      if (this.hasNoChildren()) {
        throw new Error(
            'cannot get last child of a ' + this.ctorName + ' node, which has no children',
        );
      } else {
        return this.childAt(this.numChildren() - 1);
      }
    }

    childBefore(child) {
      const childIdx = this.indexOfChild(child);
      if (childIdx < 0) {
        throw new Error('Node.childBefore() called w/ an argument that is not a child');
      } else if (childIdx === 0) {
        throw new Error('cannot get child before first child');
      } else {
        return this.childAt(childIdx - 1);
      }
    }

    childAfter(child) {
      const childIdx = this.indexOfChild(child);
      if (childIdx < 0) {
        throw new Error('Node.childAfter() called w/ an argument that is not a child');
      } else if (childIdx === this.numChildren() - 1) {
        throw new Error('cannot get child after last child');
      } else {
        return this.childAt(childIdx + 1);
      }
    }

    isTerminal() {
      return false;
    }

    isNonterminal() {
      return false;
    }

    isIteration() {
      return false;
    }

    isOptional() {
      return false;
    }
  }

  // Terminals

  class TerminalNode extends Node {
    get ctorName() {
      return '_terminal';
    }

    isTerminal() {
      return true;
    }

    get primitiveValue() {
      throw new Error('The `primitiveValue` property was removed in Ohm v17.');
    }
  }

  // Nonterminals

  class NonterminalNode extends Node {
    constructor(ruleName, children, childOffsets, matchLength) {
      super(matchLength);
      this.ruleName = ruleName;
      this.children = children;
      this.childOffsets = childOffsets;
    }

    get ctorName() {
      return this.ruleName;
    }

    isNonterminal() {
      return true;
    }

    isLexical() {
      return isLexical(this.ctorName);
    }

    isSyntactic() {
      return isSyntactic(this.ctorName);
    }
  }

  // Iterations

  class IterationNode extends Node {
    constructor(children, childOffsets, matchLength, isOptional) {
      super(matchLength);
      this.children = children;
      this.childOffsets = childOffsets;
      this.optional = isOptional;
    }

    get ctorName() {
      return '_iter';
    }

    isIteration() {
      return true;
    }

    isOptional() {
      return this.optional;
    }
  }

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  /*
    Evaluate the expression and return `true` if it succeeds, `false` otherwise. This method should
    only be called directly by `State.prototype.eval(expr)`, which also updates the data structures
    that are used for tracing. (Making those updates in a method of `State` enables the trace-specific
    data structures to be "secrets" of that class, which is good for modularity.)

    The contract of this method is as follows:
    * When the return value is `true`,
      - the state object will have `expr.getArity()` more bindings than it did before the call.
    * When the return value is `false`,
      - the state object may have more bindings than it did before the call, and
      - its input stream's position may be anywhere.

    Note that `State.prototype.eval(expr)`, unlike this method, guarantees that neither the state
    object's bindings nor its input stream's position will change if the expression fails to match.
  */
  PExpr.prototype.eval = abstract('eval'); // function(state) { ... }

  any.eval = function(state) {
    const {inputStream} = state;
    const origPos = inputStream.pos;
    const cp = inputStream.nextCodePoint();
    if (cp !== undefined) {
      state.pushBinding(new TerminalNode(String.fromCodePoint(cp).length), origPos);
      return true;
    } else {
      state.processFailure(origPos, this);
      return false;
    }
  };

  end.eval = function(state) {
    const {inputStream} = state;
    const origPos = inputStream.pos;
    if (inputStream.atEnd()) {
      state.pushBinding(new TerminalNode(0), origPos);
      return true;
    } else {
      state.processFailure(origPos, this);
      return false;
    }
  };

  Terminal.prototype.eval = function(state) {
    const {inputStream} = state;
    const origPos = inputStream.pos;
    if (!inputStream.matchString(this.obj)) {
      state.processFailure(origPos, this);
      return false;
    } else {
      state.pushBinding(new TerminalNode(this.obj.length), origPos);
      return true;
    }
  };

  Range.prototype.eval = function(state) {
    const {inputStream} = state;
    const origPos = inputStream.pos;

    // A range can operate in one of two modes: matching a single, 16-bit _code unit_,
    // or matching a _code point_. (Code points over 0xFFFF take up two 16-bit code units.)
    const cp = this.matchCodePoint ? inputStream.nextCodePoint() : inputStream.nextCharCode();

    // Always compare by code point value to get the correct result in all scenarios.
    // Note that for strings of length 1, codePointAt(0) and charPointAt(0) are equivalent.
    if (cp !== undefined && this.from.codePointAt(0) <= cp && cp <= this.to.codePointAt(0)) {
      state.pushBinding(new TerminalNode(String.fromCodePoint(cp).length), origPos);
      return true;
    } else {
      state.processFailure(origPos, this);
      return false;
    }
  };

  Param.prototype.eval = function(state) {
    return state.eval(state.currentApplication().args[this.index]);
  };

  Lex.prototype.eval = function(state) {
    state.enterLexifiedContext();
    const ans = state.eval(this.expr);
    state.exitLexifiedContext();
    return ans;
  };

  Alt.prototype.eval = function(state) {
    for (let idx = 0; idx < this.terms.length; idx++) {
      if (state.eval(this.terms[idx])) {
        return true;
      }
    }
    return false;
  };

  Seq.prototype.eval = function(state) {
    for (let idx = 0; idx < this.factors.length; idx++) {
      const factor = this.factors[idx];
      if (!state.eval(factor)) {
        return false;
      }
    }
    return true;
  };

  Iter.prototype.eval = function(state) {
    const {inputStream} = state;
    const origPos = inputStream.pos;
    const arity = this.getArity();
    const cols = [];
    const colOffsets = [];
    while (cols.length < arity) {
      cols.push([]);
      colOffsets.push([]);
    }

    let numMatches = 0;
    let prevPos = origPos;
    let idx;
    while (numMatches < this.maxNumMatches && state.eval(this.expr)) {
      if (inputStream.pos === prevPos) {
        throw kleeneExprHasNullableOperand(this, state._applicationStack);
      }
      prevPos = inputStream.pos;
      numMatches++;
      const row = state._bindings.splice(state._bindings.length - arity, arity);
      const rowOffsets = state._bindingOffsets.splice(
          state._bindingOffsets.length - arity,
          arity,
      );
      for (idx = 0; idx < row.length; idx++) {
        cols[idx].push(row[idx]);
        colOffsets[idx].push(rowOffsets[idx]);
      }
    }
    if (numMatches < this.minNumMatches) {
      return false;
    }
    let offset = state.posToOffset(origPos);
    let matchLength = 0;
    if (numMatches > 0) {
      const lastCol = cols[arity - 1];
      const lastColOffsets = colOffsets[arity - 1];

      const endOffset =
        lastColOffsets[lastColOffsets.length - 1] + lastCol[lastCol.length - 1].matchLength;
      offset = colOffsets[0][0];
      matchLength = endOffset - offset;
    }
    const isOptional = this instanceof Opt;
    for (idx = 0; idx < cols.length; idx++) {
      state._bindings.push(
          new IterationNode(cols[idx], colOffsets[idx], matchLength, isOptional),
      );
      state._bindingOffsets.push(offset);
    }
    return true;
  };

  Not.prototype.eval = function(state) {
    /*
      TODO:
      - Right now we're just throwing away all of the failures that happen inside a `not`, and
        recording `this` as a failed expression.
      - Double negation should be equivalent to lookahead, but that's not the case right now wrt
        failures. E.g., ~~'foo' produces a failure for ~~'foo', but maybe it should produce
        a failure for 'foo' instead.
    */

    const {inputStream} = state;
    const origPos = inputStream.pos;
    state.pushFailuresInfo();

    const ans = state.eval(this.expr);

    state.popFailuresInfo();
    if (ans) {
      state.processFailure(origPos, this);
      return false;
    }

    inputStream.pos = origPos;
    return true;
  };

  Lookahead.prototype.eval = function(state) {
    const {inputStream} = state;
    const origPos = inputStream.pos;
    if (state.eval(this.expr)) {
      inputStream.pos = origPos;
      return true;
    } else {
      return false;
    }
  };

  Apply.prototype.eval = function(state) {
    const caller = state.currentApplication();
    const actuals = caller ? caller.args : [];
    const app = this.substituteParams(actuals);

    const posInfo = state.getCurrentPosInfo();
    if (posInfo.isActive(app)) {
      // This rule is already active at this position, i.e., it is left-recursive.
      return app.handleCycle(state);
    }

    const memoKey = app.toMemoKey();
    const memoRec = posInfo.memo[memoKey];

    if (memoRec && posInfo.shouldUseMemoizedResult(memoRec)) {
      if (state.hasNecessaryInfo(memoRec)) {
        return state.useMemoizedResult(state.inputStream.pos, memoRec);
      }
      delete posInfo.memo[memoKey];
    }
    return app.reallyEval(state);
  };

  Apply.prototype.handleCycle = function(state) {
    const posInfo = state.getCurrentPosInfo();
    const {currentLeftRecursion} = posInfo;
    const memoKey = this.toMemoKey();
    let memoRec = posInfo.memo[memoKey];

    if (currentLeftRecursion && currentLeftRecursion.headApplication.toMemoKey() === memoKey) {
      // We already know about this left recursion, but it's possible there are "involved
      // applications" that we don't already know about, so...
      memoRec.updateInvolvedApplicationMemoKeys();
    } else if (!memoRec) {
      // New left recursion detected! Memoize a failure to try to get a seed parse.
      memoRec = posInfo.memoize(memoKey, {
        matchLength: 0,
        examinedLength: 0,
        value: false,
        rightmostFailureOffset: -1,
      });
      posInfo.startLeftRecursion(this, memoRec);
    }
    return state.useMemoizedResult(state.inputStream.pos, memoRec);
  };

  Apply.prototype.reallyEval = function(state) {
    const {inputStream} = state;
    const origPos = inputStream.pos;
    const origPosInfo = state.getCurrentPosInfo();
    const ruleInfo = state.grammar.rules[this.ruleName];
    const {body} = ruleInfo;
    const {description} = ruleInfo;

    state.enterApplication(origPosInfo, this);

    if (description) {
      state.pushFailuresInfo();
    }

    // Reset the input stream's examinedLength property so that we can track
    // the examined length of this particular application.
    const origInputStreamExaminedLength = inputStream.examinedLength;
    inputStream.examinedLength = 0;

    let value = this.evalOnce(body, state);
    const currentLR = origPosInfo.currentLeftRecursion;
    const memoKey = this.toMemoKey();
    const isHeadOfLeftRecursion = currentLR && currentLR.headApplication.toMemoKey() === memoKey;
    let memoRec;

    if (state.doNotMemoize) {
      state.doNotMemoize = false;
    } else if (isHeadOfLeftRecursion) {
      value = this.growSeedResult(body, state, origPos, currentLR, value);
      origPosInfo.endLeftRecursion();
      memoRec = currentLR;
      memoRec.examinedLength = inputStream.examinedLength - origPos;
      memoRec.rightmostFailureOffset = state._getRightmostFailureOffset();
      origPosInfo.memoize(memoKey, memoRec); // updates origPosInfo's maxExaminedLength
    } else if (!currentLR || !currentLR.isInvolved(memoKey)) {
      // This application is not involved in left recursion, so it's ok to memoize it.
      memoRec = origPosInfo.memoize(memoKey, {
        matchLength: inputStream.pos - origPos,
        examinedLength: inputStream.examinedLength - origPos,
        value,
        failuresAtRightmostPosition: state.cloneRecordedFailures(),
        rightmostFailureOffset: state._getRightmostFailureOffset(),
      });
    }
    const succeeded = !!value;

    if (description) {
      state.popFailuresInfo();
      if (!succeeded) {
        state.processFailure(origPos, this);
      }
      if (memoRec) {
        memoRec.failuresAtRightmostPosition = state.cloneRecordedFailures();
      }
    }

    // Record trace information in the memo table, so that it is available if the memoized result
    // is used later.
    if (state.isTracing() && memoRec) {
      const entry = state.getTraceEntry(origPos, this, succeeded, succeeded ? [value] : []);
      if (isHeadOfLeftRecursion) {
        assert(entry.terminatingLREntry != null || !succeeded);
        entry.isHeadOfLeftRecursion = true;
      }
      memoRec.traceEntry = entry;
    }

    // Fix the input stream's examinedLength -- it should be the maximum examined length
    // across all applications, not just this one.
    inputStream.examinedLength = Math.max(
        inputStream.examinedLength,
        origInputStreamExaminedLength,
    );

    state.exitApplication(origPosInfo, value);

    return succeeded;
  };

  Apply.prototype.evalOnce = function(expr, state) {
    const {inputStream} = state;
    const origPos = inputStream.pos;

    if (state.eval(expr)) {
      const arity = expr.getArity();
      const bindings = state._bindings.splice(state._bindings.length - arity, arity);
      const offsets = state._bindingOffsets.splice(state._bindingOffsets.length - arity, arity);
      const matchLength = inputStream.pos - origPos;
      return new NonterminalNode(this.ruleName, bindings, offsets, matchLength);
    } else {
      return false;
    }
  };

  Apply.prototype.growSeedResult = function(body, state, origPos, lrMemoRec, newValue) {
    if (!newValue) {
      return false;
    }

    const {inputStream} = state;

    while (true) {
      lrMemoRec.matchLength = inputStream.pos - origPos;
      lrMemoRec.value = newValue;
      lrMemoRec.failuresAtRightmostPosition = state.cloneRecordedFailures();

      if (state.isTracing()) {
        // Before evaluating the body again, add a trace node for this application to the memo entry.
        // Its only child is a copy of the trace node from `newValue`, which will always be the last
        // element in `state.trace`.
        const seedTrace = state.trace[state.trace.length - 1];
        lrMemoRec.traceEntry = new Trace(
            state.input,
            origPos,
            inputStream.pos,
            this,
            true,
            [newValue],
            [seedTrace.clone()],
        );
      }
      inputStream.pos = origPos;
      newValue = this.evalOnce(body, state);
      if (inputStream.pos - origPos <= lrMemoRec.matchLength) {
        break;
      }
      if (state.isTracing()) {
        state.trace.splice(-2, 1); // Drop the trace for the old seed.
      }
    }
    if (state.isTracing()) {
      // The last entry is for an unused result -- pop it and save it in the "real" entry.
      lrMemoRec.traceEntry.recordLRTermination(state.trace.pop(), newValue);
    }
    inputStream.pos = origPos + lrMemoRec.matchLength;
    return lrMemoRec.value;
  };

  UnicodeChar.prototype.eval = function(state) {
    const {inputStream} = state;
    const origPos = inputStream.pos;
    const ch = inputStream.next();
    if (ch && this.pattern.test(ch)) {
      state.pushBinding(new TerminalNode(ch.length), origPos);
      return true;
    } else {
      state.processFailure(origPos, this);
      return false;
    }
  };

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  PExpr.prototype.getArity = abstract('getArity');

  any.getArity =
    end.getArity =
    Terminal.prototype.getArity =
    Range.prototype.getArity =
    Param.prototype.getArity =
    Apply.prototype.getArity =
    UnicodeChar.prototype.getArity =
      function() {
        return 1;
      };

  Alt.prototype.getArity = function() {
    // This is ok b/c all terms must have the same arity -- this property is
    // checked by the Grammar constructor.
    return this.terms.length === 0 ? 0 : this.terms[0].getArity();
  };

  Seq.prototype.getArity = function() {
    let arity = 0;
    for (let idx = 0; idx < this.factors.length; idx++) {
      arity += this.factors[idx].getArity();
    }
    return arity;
  };

  Iter.prototype.getArity = function() {
    return this.expr.getArity();
  };

  Not.prototype.getArity = function() {
    return 0;
  };

  Lookahead.prototype.getArity = Lex.prototype.getArity = function() {
    return this.expr.getArity();
  };

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  function getMetaInfo(expr, grammarInterval) {
    const metaInfo = {};
    if (expr.source && grammarInterval) {
      const adjusted = expr.source.relativeTo(grammarInterval);
      metaInfo.sourceInterval = [adjusted.startIdx, adjusted.endIdx];
    }
    return metaInfo;
  }

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  PExpr.prototype.outputRecipe = abstract('outputRecipe');

  any.outputRecipe = function(formals, grammarInterval) {
    return ['any', getMetaInfo(this, grammarInterval)];
  };

  end.outputRecipe = function(formals, grammarInterval) {
    return ['end', getMetaInfo(this, grammarInterval)];
  };

  Terminal.prototype.outputRecipe = function(formals, grammarInterval) {
    return ['terminal', getMetaInfo(this, grammarInterval), this.obj];
  };

  Range.prototype.outputRecipe = function(formals, grammarInterval) {
    return ['range', getMetaInfo(this, grammarInterval), this.from, this.to];
  };

  Param.prototype.outputRecipe = function(formals, grammarInterval) {
    return ['param', getMetaInfo(this, grammarInterval), this.index];
  };

  Alt.prototype.outputRecipe = function(formals, grammarInterval) {
    return ['alt', getMetaInfo(this, grammarInterval)].concat(
        this.terms.map(term => term.outputRecipe(formals, grammarInterval)),
    );
  };

  Extend.prototype.outputRecipe = function(formals, grammarInterval) {
    const extension = this.terms[0]; // [extension, original]
    return extension.outputRecipe(formals, grammarInterval);
  };

  Splice.prototype.outputRecipe = function(formals, grammarInterval) {
    const beforeTerms = this.terms.slice(0, this.expansionPos);
    const afterTerms = this.terms.slice(this.expansionPos + 1);
    return [
      'splice',
      getMetaInfo(this, grammarInterval),
      beforeTerms.map(term => term.outputRecipe(formals, grammarInterval)),
      afterTerms.map(term => term.outputRecipe(formals, grammarInterval)),
    ];
  };

  Seq.prototype.outputRecipe = function(formals, grammarInterval) {
    return ['seq', getMetaInfo(this, grammarInterval)].concat(
        this.factors.map(factor => factor.outputRecipe(formals, grammarInterval)),
    );
  };

  Star.prototype.outputRecipe =
    Plus.prototype.outputRecipe =
    Opt.prototype.outputRecipe =
    Not.prototype.outputRecipe =
    Lookahead.prototype.outputRecipe =
    Lex.prototype.outputRecipe =
      function(formals, grammarInterval) {
        return [
          this.constructor.name.toLowerCase(),
          getMetaInfo(this, grammarInterval),
          this.expr.outputRecipe(formals, grammarInterval),
        ];
      };

  Apply.prototype.outputRecipe = function(formals, grammarInterval) {
    return [
      'app',
      getMetaInfo(this, grammarInterval),
      this.ruleName,
      this.args.map(arg => arg.outputRecipe(formals, grammarInterval)),
    ];
  };

  UnicodeChar.prototype.outputRecipe = function(formals, grammarInterval) {
    return ['unicodeChar', getMetaInfo(this, grammarInterval), this.category];
  };

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  /*
    Called at grammar creation time to rewrite a rule body, replacing each reference to a formal
    parameter with a `Param` node. Returns a PExpr -- either a new one, or the original one if
    it was modified in place.
  */
  PExpr.prototype.introduceParams = abstract('introduceParams');

  any.introduceParams =
    end.introduceParams =
    Terminal.prototype.introduceParams =
    Range.prototype.introduceParams =
    Param.prototype.introduceParams =
    UnicodeChar.prototype.introduceParams =
      function(formals) {
        return this;
      };

  Alt.prototype.introduceParams = function(formals) {
    this.terms.forEach((term, idx, terms) => {
      terms[idx] = term.introduceParams(formals);
    });
    return this;
  };

  Seq.prototype.introduceParams = function(formals) {
    this.factors.forEach((factor, idx, factors) => {
      factors[idx] = factor.introduceParams(formals);
    });
    return this;
  };

  Iter.prototype.introduceParams =
    Not.prototype.introduceParams =
    Lookahead.prototype.introduceParams =
    Lex.prototype.introduceParams =
      function(formals) {
        this.expr = this.expr.introduceParams(formals);
        return this;
      };

  Apply.prototype.introduceParams = function(formals) {
    const index = formals.indexOf(this.ruleName);
    if (index >= 0) {
      if (this.args.length > 0) {
        // TODO: Should this be supported? See issue #64.
        throw new Error('Parameterized rules cannot be passed as arguments to another rule.');
      }
      return new Param(index).withSource(this.source);
    } else {
      this.args.forEach((arg, idx, args) => {
        args[idx] = arg.introduceParams(formals);
      });
      return this;
    }
  };

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  // Returns `true` if this parsing expression may accept without consuming any input.
  PExpr.prototype.isNullable = function(grammar) {
    return this._isNullable(grammar, Object.create(null));
  };

  PExpr.prototype._isNullable = abstract('_isNullable');

  any._isNullable =
    Range.prototype._isNullable =
    Param.prototype._isNullable =
    Plus.prototype._isNullable =
    UnicodeChar.prototype._isNullable =
      function(grammar, memo) {
        return false;
      };

  end._isNullable = function(grammar, memo) {
    return true;
  };

  Terminal.prototype._isNullable = function(grammar, memo) {
    if (typeof this.obj === 'string') {
      // This is an over-simplification: it's only correct if the input is a string. If it's an array
      // or an object, then the empty string parsing expression is not nullable.
      return this.obj === '';
    } else {
      return false;
    }
  };

  Alt.prototype._isNullable = function(grammar, memo) {
    return this.terms.length === 0 || this.terms.some(term => term._isNullable(grammar, memo));
  };

  Seq.prototype._isNullable = function(grammar, memo) {
    return this.factors.every(factor => factor._isNullable(grammar, memo));
  };

  Star.prototype._isNullable =
    Opt.prototype._isNullable =
    Not.prototype._isNullable =
    Lookahead.prototype._isNullable =
      function(grammar, memo) {
        return true;
      };

  Lex.prototype._isNullable = function(grammar, memo) {
    return this.expr._isNullable(grammar, memo);
  };

  Apply.prototype._isNullable = function(grammar, memo) {
    const key = this.toMemoKey();
    if (!Object.prototype.hasOwnProperty.call(memo, key)) {
      const {body} = grammar.rules[this.ruleName];
      const inlined = body.substituteParams(this.args);
      memo[key] = false; // Prevent infinite recursion for recursive rules.
      memo[key] = inlined._isNullable(grammar, memo);
    }
    return memo[key];
  };

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  /*
    Returns a PExpr that results from recursively replacing every formal parameter (i.e., instance
    of `Param`) inside this PExpr with its actual value from `actuals` (an Array).

    The receiver must not be modified; a new PExpr must be returned if any replacement is necessary.
  */
  // function(actuals) { ... }
  PExpr.prototype.substituteParams = abstract('substituteParams');

  any.substituteParams =
    end.substituteParams =
    Terminal.prototype.substituteParams =
    Range.prototype.substituteParams =
    UnicodeChar.prototype.substituteParams =
      function(actuals) {
        return this;
      };

  Param.prototype.substituteParams = function(actuals) {
    return actuals[this.index];
  };

  Alt.prototype.substituteParams = function(actuals) {
    return new Alt(this.terms.map(term => term.substituteParams(actuals)));
  };

  Seq.prototype.substituteParams = function(actuals) {
    return new Seq(this.factors.map(factor => factor.substituteParams(actuals)));
  };

  Iter.prototype.substituteParams =
    Not.prototype.substituteParams =
    Lookahead.prototype.substituteParams =
    Lex.prototype.substituteParams =
      function(actuals) {
        return new this.constructor(this.expr.substituteParams(actuals));
      };

  Apply.prototype.substituteParams = function(actuals) {
    if (this.args.length === 0) {
      // Avoid making a copy of this application, as an optimization
      return this;
    } else {
      const args = this.args.map(arg => arg.substituteParams(actuals));
      return new Apply(this.ruleName, args);
    }
  };

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  function isRestrictedJSIdentifier(str) {
    return /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(str);
  }

  function resolveDuplicatedNames(argumentNameList) {
    // `count` is used to record the number of times each argument name occurs in the list,
    // this is useful for checking duplicated argument name. It maps argument names to ints.
    const count = Object.create(null);
    argumentNameList.forEach(argName => {
      count[argName] = (count[argName] || 0) + 1;
    });

    // Append subscripts ('_1', '_2', ...) to duplicate argument names.
    Object.keys(count).forEach(dupArgName => {
      if (count[dupArgName] <= 1) {
        return;
      }

      // This name shows up more than once, so add subscripts.
      let subscript = 1;
      argumentNameList.forEach((argName, idx) => {
        if (argName === dupArgName) {
          argumentNameList[idx] = argName + '_' + subscript++;
        }
      });
    });
  }

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  /*
    Returns a list of strings that will be used as the default argument names for its receiver
    (a pexpr) in a semantic action. This is used exclusively by the Semantics Editor.

    `firstArgIndex` is the 1-based index of the first argument name that will be generated for this
    pexpr. It enables us to name arguments positionally, e.g., if the second argument is a
    non-alphanumeric terminal like "+", it will be named '$2'.

    `noDupCheck` is true if the caller of `toArgumentNameList` is not a top level caller. It enables
    us to avoid nested duplication subscripts appending, e.g., '_1_1', '_1_2', by only checking
    duplicates at the top level.

    Here is a more elaborate example that illustrates how this method works:
    `(a "+" b).toArgumentNameList(1)` evaluates to `['a', '$2', 'b']` with the following recursive
    calls:

      (a).toArgumentNameList(1) -> ['a'],
      ("+").toArgumentNameList(2) -> ['$2'],
      (b).toArgumentNameList(3) -> ['b']

    Notes:
    * This method must only be called on well-formed expressions, e.g., the receiver must
      not have any Alt sub-expressions with inconsistent arities.
    * e.getArity() === e.toArgumentNameList(1).length
  */
  // function(firstArgIndex, noDupCheck) { ... }
  PExpr.prototype.toArgumentNameList = abstract('toArgumentNameList');

  any.toArgumentNameList = function(firstArgIndex, noDupCheck) {
    return ['any'];
  };

  end.toArgumentNameList = function(firstArgIndex, noDupCheck) {
    return ['end'];
  };

  Terminal.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
    if (typeof this.obj === 'string' && /^[_a-zA-Z0-9]+$/.test(this.obj)) {
      // If this terminal is a valid suffix for a JS identifier, just prepend it with '_'
      return ['_' + this.obj];
    } else {
      // Otherwise, name it positionally.
      return ['$' + firstArgIndex];
    }
  };

  Range.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
    let argName = this.from + '_to_' + this.to;
    // If the `argName` is not valid then try to prepend a `_`.
    if (!isRestrictedJSIdentifier(argName)) {
      argName = '_' + argName;
    }
    // If the `argName` still not valid after prepending a `_`, then name it positionally.
    if (!isRestrictedJSIdentifier(argName)) {
      argName = '$' + firstArgIndex;
    }
    return [argName];
  };

  Alt.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
    // `termArgNameLists` is an array of arrays where each row is the
    // argument name list that corresponds to a term in this alternation.
    const termArgNameLists = this.terms.map(term =>
      term.toArgumentNameList(firstArgIndex, true),
    );

    const argumentNameList = [];
    const numArgs = termArgNameLists[0].length;
    for (let colIdx = 0; colIdx < numArgs; colIdx++) {
      const col = [];
      for (let rowIdx = 0; rowIdx < this.terms.length; rowIdx++) {
        col.push(termArgNameLists[rowIdx][colIdx]);
      }
      const uniqueNames = copyWithoutDuplicates(col);
      argumentNameList.push(uniqueNames.join('_or_'));
    }

    if (!noDupCheck) {
      resolveDuplicatedNames(argumentNameList);
    }
    return argumentNameList;
  };

  Seq.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
    // Generate the argument name list, without worrying about duplicates.
    let argumentNameList = [];
    this.factors.forEach(factor => {
      const factorArgumentNameList = factor.toArgumentNameList(firstArgIndex, true);
      argumentNameList = argumentNameList.concat(factorArgumentNameList);

      // Shift the firstArgIndex to take this factor's argument names into account.
      firstArgIndex += factorArgumentNameList.length;
    });
    if (!noDupCheck) {
      resolveDuplicatedNames(argumentNameList);
    }
    return argumentNameList;
  };

  Iter.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
    const argumentNameList = this.expr
        .toArgumentNameList(firstArgIndex, noDupCheck)
        .map(exprArgumentString =>
        exprArgumentString[exprArgumentString.length - 1] === 's' ?
          exprArgumentString + 'es' :
          exprArgumentString + 's',
        );
    if (!noDupCheck) {
      resolveDuplicatedNames(argumentNameList);
    }
    return argumentNameList;
  };

  Opt.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
    return this.expr.toArgumentNameList(firstArgIndex, noDupCheck).map(argName => {
      return 'opt' + argName[0].toUpperCase() + argName.slice(1);
    });
  };

  Not.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
    return [];
  };

  Lookahead.prototype.toArgumentNameList = Lex.prototype.toArgumentNameList =
    function(firstArgIndex, noDupCheck) {
      return this.expr.toArgumentNameList(firstArgIndex, noDupCheck);
    };

  Apply.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
    return [this.ruleName];
  };

  UnicodeChar.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
    return ['$' + firstArgIndex];
  };

  Param.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
    return ['param' + this.index];
  };

  // "Value pexprs" (Value, Str, Arr, Obj) are going away soon, so we don't worry about them here.

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  // Returns a string representing the PExpr, for use as a UI label, etc.
  PExpr.prototype.toDisplayString = abstract('toDisplayString');

  Alt.prototype.toDisplayString = Seq.prototype.toDisplayString = function() {
    if (this.source) {
      return this.source.trimmed().contents;
    }
    return '[' + this.constructor.name + ']';
  };

  any.toDisplayString =
    end.toDisplayString =
    Iter.prototype.toDisplayString =
    Not.prototype.toDisplayString =
    Lookahead.prototype.toDisplayString =
    Lex.prototype.toDisplayString =
    Terminal.prototype.toDisplayString =
    Range.prototype.toDisplayString =
    Param.prototype.toDisplayString =
      function() {
        return this.toString();
      };

  Apply.prototype.toDisplayString = function() {
    if (this.args.length > 0) {
      const ps = this.args.map(arg => arg.toDisplayString());
      return this.ruleName + '<' + ps.join(',') + '>';
    } else {
      return this.ruleName;
    }
  };

  UnicodeChar.prototype.toDisplayString = function() {
    return 'Unicode [' + this.category + '] character';
  };

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  /*
    `Failure`s represent expressions that weren't matched while parsing. They are used to generate
    error messages automatically. The interface of `Failure`s includes the collowing methods:

    - getText() : String
    - getType() : String  (one of {"description", "string", "code"})
    - isDescription() : bool
    - isStringTerminal() : bool
    - isCode() : bool
    - isFluffy() : bool
    - makeFluffy() : void
    - subsumes(Failure) : bool
  */

  function isValidType(type) {
    return type === 'description' || type === 'string' || type === 'code';
  }

  class Failure {
    constructor(pexpr, text, type) {
      if (!isValidType(type)) {
        throw new Error('invalid Failure type: ' + type);
      }
      this.pexpr = pexpr;
      this.text = text;
      this.type = type;
      this.fluffy = false;
    }

    getPExpr() {
      return this.pexpr;
    }

    getText() {
      return this.text;
    }

    getType() {
      return this.type;
    }

    isDescription() {
      return this.type === 'description';
    }

    isStringTerminal() {
      return this.type === 'string';
    }

    isCode() {
      return this.type === 'code';
    }

    isFluffy() {
      return this.fluffy;
    }

    makeFluffy() {
      this.fluffy = true;
    }

    clearFluffy() {
      this.fluffy = false;
    }

    subsumes(that) {
      return (
        this.getText() === that.getText() &&
        this.type === that.type &&
        (!this.isFluffy() || (this.isFluffy() && that.isFluffy()))
      );
    }

    toString() {
      return this.type === 'string' ? JSON.stringify(this.getText()) : this.getText();
    }

    clone() {
      const failure = new Failure(this.pexpr, this.text, this.type);
      if (this.isFluffy()) {
        failure.makeFluffy();
      }
      return failure;
    }

    toKey() {
      return this.toString() + '#' + this.type;
    }
  }

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  PExpr.prototype.toFailure = abstract('toFailure');

  any.toFailure = function(grammar) {
    return new Failure(this, 'any object', 'description');
  };

  end.toFailure = function(grammar) {
    return new Failure(this, 'end of input', 'description');
  };

  Terminal.prototype.toFailure = function(grammar) {
    return new Failure(this, this.obj, 'string');
  };

  Range.prototype.toFailure = function(grammar) {
    // TODO: come up with something better
    return new Failure(this, JSON.stringify(this.from) + '..' + JSON.stringify(this.to), 'code');
  };

  Not.prototype.toFailure = function(grammar) {
    const description =
      this.expr === any ? 'nothing' : 'not ' + this.expr.toFailure(grammar);
    return new Failure(this, description, 'description');
  };

  Lookahead.prototype.toFailure = function(grammar) {
    return this.expr.toFailure(grammar);
  };

  Apply.prototype.toFailure = function(grammar) {
    let {description} = grammar.rules[this.ruleName];
    if (!description) {
      const article = /^[aeiouAEIOU]/.test(this.ruleName) ? 'an' : 'a';
      description = article + ' ' + this.ruleName;
    }
    return new Failure(this, description, 'description');
  };

  UnicodeChar.prototype.toFailure = function(grammar) {
    return new Failure(this, 'a Unicode [' + this.category + '] character', 'description');
  };

  Alt.prototype.toFailure = function(grammar) {
    const fs = this.terms.map(t => t.toFailure(grammar));
    const description = '(' + fs.join(' or ') + ')';
    return new Failure(this, description, 'description');
  };

  Seq.prototype.toFailure = function(grammar) {
    const fs = this.factors.map(f => f.toFailure(grammar));
    const description = '(' + fs.join(' ') + ')';
    return new Failure(this, description, 'description');
  };

  Iter.prototype.toFailure = function(grammar) {
    const description = '(' + this.expr.toFailure(grammar) + this.operator + ')';
    return new Failure(this, description, 'description');
  };

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  /*
    e1.toString() === e2.toString() ==> e1 and e2 are semantically equivalent.
    Note that this is not an iff (<==>): e.g.,
    (~"b" "a").toString() !== ("a").toString(), even though
    ~"b" "a" and "a" are interchangeable in any grammar,
    both in terms of the languages they accept and their arities.
  */
  PExpr.prototype.toString = abstract('toString');

  any.toString = function() {
    return 'any';
  };

  end.toString = function() {
    return 'end';
  };

  Terminal.prototype.toString = function() {
    return JSON.stringify(this.obj);
  };

  Range.prototype.toString = function() {
    return JSON.stringify(this.from) + '..' + JSON.stringify(this.to);
  };

  Param.prototype.toString = function() {
    return '$' + this.index;
  };

  Lex.prototype.toString = function() {
    return '#(' + this.expr.toString() + ')';
  };

  Alt.prototype.toString = function() {
    return this.terms.length === 1 ?
      this.terms[0].toString() :
      '(' + this.terms.map(term => term.toString()).join(' | ') + ')';
  };

  Seq.prototype.toString = function() {
    return this.factors.length === 1 ?
      this.factors[0].toString() :
      '(' + this.factors.map(factor => factor.toString()).join(' ') + ')';
  };

  Iter.prototype.toString = function() {
    return this.expr + this.operator;
  };

  Not.prototype.toString = function() {
    return '~' + this.expr;
  };

  Lookahead.prototype.toString = function() {
    return '&' + this.expr;
  };

  Apply.prototype.toString = function() {
    if (this.args.length > 0) {
      const ps = this.args.map(arg => arg.toString());
      return this.ruleName + '<' + ps.join(',') + '>';
    } else {
      return this.ruleName;
    }
  };

  UnicodeChar.prototype.toString = function() {
    return '\\p{' + this.category + '}';
  };

  class CaseInsensitiveTerminal extends PExpr {
    constructor(param) {
      super();
      this.obj = param;
    }

    _getString(state) {
      const terminal = state.currentApplication().args[this.obj.index];
      assert(terminal instanceof Terminal, 'expected a Terminal expression');
      return terminal.obj;
    }

    // Implementation of the PExpr API

    allowsSkippingPrecedingSpace() {
      return true;
    }

    eval(state) {
      const {inputStream} = state;
      const origPos = inputStream.pos;
      const matchStr = this._getString(state);
      if (!inputStream.matchString(matchStr, true)) {
        state.processFailure(origPos, this);
        return false;
      } else {
        state.pushBinding(new TerminalNode(matchStr.length), origPos);
        return true;
      }
    }

    getArity() {
      return 1;
    }

    substituteParams(actuals) {
      return new CaseInsensitiveTerminal(this.obj.substituteParams(actuals));
    }

    toDisplayString() {
      return this.obj.toDisplayString() + ' (case-insensitive)';
    }

    toFailure(grammar) {
      return new Failure(
          this,
          this.obj.toFailure(grammar) + ' (case-insensitive)',
          'description',
      );
    }

    _isNullable(grammar, memo) {
      return this.obj._isNullable(grammar, memo);
    }
  }

  // --------------------------------------------------------------------

  var pexprs = /*#__PURE__*/Object.freeze({
    __proto__: null,
    CaseInsensitiveTerminal: CaseInsensitiveTerminal,
    PExpr: PExpr,
    any: any,
    end: end,
    Terminal: Terminal,
    Range: Range,
    Param: Param,
    Alt: Alt,
    Extend: Extend,
    Splice: Splice,
    Seq: Seq,
    Iter: Iter,
    Star: Star,
    Plus: Plus,
    Opt: Opt,
    Not: Not,
    Lookahead: Lookahead,
    Lex: Lex,
    Apply: Apply,
    UnicodeChar: UnicodeChar
  });

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  let builtInApplySyntacticBody;

  awaitBuiltInRules(builtInRules => {
    builtInApplySyntacticBody = builtInRules.rules.applySyntactic.body;
  });

  const applySpaces = new Apply('spaces');

  class MatchState {
    constructor(matcher, startExpr, optPositionToRecordFailures) {
      this.matcher = matcher;
      this.startExpr = startExpr;

      this.grammar = matcher.grammar;
      this.input = matcher.getInput();
      this.inputStream = new InputStream(this.input);
      this.memoTable = matcher._memoTable;

      this.userData = undefined;
      this.doNotMemoize = false;

      this._bindings = [];
      this._bindingOffsets = [];
      this._applicationStack = [];
      this._posStack = [0];
      this.inLexifiedContextStack = [false];

      this.rightmostFailurePosition = -1;
      this._rightmostFailurePositionStack = [];
      this._recordedFailuresStack = [];

      if (optPositionToRecordFailures !== undefined) {
        this.positionToRecordFailures = optPositionToRecordFailures;
        this.recordedFailures = Object.create(null);
      }
    }

    posToOffset(pos) {
      return pos - this._posStack[this._posStack.length - 1];
    }

    enterApplication(posInfo, app) {
      this._posStack.push(this.inputStream.pos);
      this._applicationStack.push(app);
      this.inLexifiedContextStack.push(false);
      posInfo.enter(app);
      this._rightmostFailurePositionStack.push(this.rightmostFailurePosition);
      this.rightmostFailurePosition = -1;
    }

    exitApplication(posInfo, optNode) {
      const origPos = this._posStack.pop();
      this._applicationStack.pop();
      this.inLexifiedContextStack.pop();
      posInfo.exit();

      this.rightmostFailurePosition = Math.max(
          this.rightmostFailurePosition,
          this._rightmostFailurePositionStack.pop(),
      );

      if (optNode) {
        this.pushBinding(optNode, origPos);
      }
    }

    enterLexifiedContext() {
      this.inLexifiedContextStack.push(true);
    }

    exitLexifiedContext() {
      this.inLexifiedContextStack.pop();
    }

    currentApplication() {
      return this._applicationStack[this._applicationStack.length - 1];
    }

    inSyntacticContext() {
      const currentApplication = this.currentApplication();
      if (currentApplication) {
        return currentApplication.isSyntactic() && !this.inLexifiedContext();
      } else {
        // The top-level context is syntactic if the start application is.
        return this.startExpr.factors[0].isSyntactic();
      }
    }

    inLexifiedContext() {
      return this.inLexifiedContextStack[this.inLexifiedContextStack.length - 1];
    }

    skipSpaces() {
      this.pushFailuresInfo();
      this.eval(applySpaces);
      this.popBinding();
      this.popFailuresInfo();
      return this.inputStream.pos;
    }

    skipSpacesIfInSyntacticContext() {
      return this.inSyntacticContext() ? this.skipSpaces() : this.inputStream.pos;
    }

    maybeSkipSpacesBefore(expr) {
      if (expr.allowsSkippingPrecedingSpace() && expr !== applySpaces) {
        return this.skipSpacesIfInSyntacticContext();
      } else {
        return this.inputStream.pos;
      }
    }

    pushBinding(node, origPos) {
      this._bindings.push(node);
      this._bindingOffsets.push(this.posToOffset(origPos));
    }

    popBinding() {
      this._bindings.pop();
      this._bindingOffsets.pop();
    }

    numBindings() {
      return this._bindings.length;
    }

    truncateBindings(newLength) {
      // Yes, this is this really faster than setting the `length` property (tested with
      // bin/es5bench on Node v6.1.0).
      // Update 2021-10-25: still true on v14.15.5 — it's ~20% speedup on es5bench.
      while (this._bindings.length > newLength) {
        this.popBinding();
      }
    }

    getCurrentPosInfo() {
      return this.getPosInfo(this.inputStream.pos);
    }

    getPosInfo(pos) {
      let posInfo = this.memoTable[pos];
      if (!posInfo) {
        posInfo = this.memoTable[pos] = new PosInfo();
      }
      return posInfo;
    }

    processFailure(pos, expr) {
      this.rightmostFailurePosition = Math.max(this.rightmostFailurePosition, pos);

      if (this.recordedFailures && pos === this.positionToRecordFailures) {
        const app = this.currentApplication();
        if (app) {
          // Substitute parameters with the actual pexprs that were passed to
          // the current rule.
          expr = expr.substituteParams(app.args);
        }

        this.recordFailure(expr.toFailure(this.grammar), false);
      }
    }

    recordFailure(failure, shouldCloneIfNew) {
      const key = failure.toKey();
      if (!this.recordedFailures[key]) {
        this.recordedFailures[key] = shouldCloneIfNew ? failure.clone() : failure;
      } else if (this.recordedFailures[key].isFluffy() && !failure.isFluffy()) {
        this.recordedFailures[key].clearFluffy();
      }
    }

    recordFailures(failures, shouldCloneIfNew) {
      Object.keys(failures).forEach(key => {
        this.recordFailure(failures[key], shouldCloneIfNew);
      });
    }

    cloneRecordedFailures() {
      if (!this.recordedFailures) {
        return undefined;
      }

      const ans = Object.create(null);
      Object.keys(this.recordedFailures).forEach(key => {
        ans[key] = this.recordedFailures[key].clone();
      });
      return ans;
    }

    getRightmostFailurePosition() {
      return this.rightmostFailurePosition;
    }

    _getRightmostFailureOffset() {
      return this.rightmostFailurePosition >= 0 ?
        this.posToOffset(this.rightmostFailurePosition) :
        -1;
    }

    // Returns the memoized trace entry for `expr` at `pos`, if one exists, `null` otherwise.
    getMemoizedTraceEntry(pos, expr) {
      const posInfo = this.memoTable[pos];
      if (posInfo && expr instanceof Apply) {
        const memoRec = posInfo.memo[expr.toMemoKey()];
        if (memoRec && memoRec.traceEntry) {
          const entry = memoRec.traceEntry.cloneWithExpr(expr);
          entry.isMemoized = true;
          return entry;
        }
      }
      return null;
    }

    // Returns a new trace entry, with the currently active trace array as its children.
    getTraceEntry(pos, expr, succeeded, bindings) {
      if (expr instanceof Apply) {
        const app = this.currentApplication();
        const actuals = app ? app.args : [];
        expr = expr.substituteParams(actuals);
      }
      return (
        this.getMemoizedTraceEntry(pos, expr) ||
        new Trace(this.input, pos, this.inputStream.pos, expr, succeeded, bindings, this.trace)
      );
    }

    isTracing() {
      return !!this.trace;
    }

    hasNecessaryInfo(memoRec) {
      if (this.trace && !memoRec.traceEntry) {
        return false;
      }

      if (
        this.recordedFailures &&
        this.inputStream.pos + memoRec.rightmostFailureOffset === this.positionToRecordFailures
      ) {
        return !!memoRec.failuresAtRightmostPosition;
      }

      return true;
    }

    useMemoizedResult(origPos, memoRec) {
      if (this.trace) {
        this.trace.push(memoRec.traceEntry);
      }

      const memoRecRightmostFailurePosition =
        this.inputStream.pos + memoRec.rightmostFailureOffset;
      this.rightmostFailurePosition = Math.max(
          this.rightmostFailurePosition,
          memoRecRightmostFailurePosition,
      );
      if (
        this.recordedFailures &&
        this.positionToRecordFailures === memoRecRightmostFailurePosition &&
        memoRec.failuresAtRightmostPosition
      ) {
        this.recordFailures(memoRec.failuresAtRightmostPosition, true);
      }

      this.inputStream.examinedLength = Math.max(
          this.inputStream.examinedLength,
          memoRec.examinedLength + origPos,
      );

      if (memoRec.value) {
        this.inputStream.pos += memoRec.matchLength;
        this.pushBinding(memoRec.value, origPos);
        return true;
      }
      return false;
    }

    // Evaluate `expr` and return `true` if it succeeded, `false` otherwise. On success, `bindings`
    // will have `expr.getArity()` more elements than before, and the input stream's position may
    // have increased. On failure, `bindings` and position will be unchanged.
    eval(expr) {
      const {inputStream} = this;
      const origNumBindings = this._bindings.length;
      const origUserData = this.userData;

      let origRecordedFailures;
      if (this.recordedFailures) {
        origRecordedFailures = this.recordedFailures;
        this.recordedFailures = Object.create(null);
      }

      const origPos = inputStream.pos;
      const memoPos = this.maybeSkipSpacesBefore(expr);

      let origTrace;
      if (this.trace) {
        origTrace = this.trace;
        this.trace = [];
      }

      // Do the actual evaluation.
      const ans = expr.eval(this);

      if (this.trace) {
        const bindings = this._bindings.slice(origNumBindings);
        const traceEntry = this.getTraceEntry(memoPos, expr, ans, bindings);
        traceEntry.isImplicitSpaces = expr === applySpaces;
        traceEntry.isRootNode = expr === this.startExpr;
        origTrace.push(traceEntry);
        this.trace = origTrace;
      }

      if (ans) {
        if (this.recordedFailures && inputStream.pos === this.positionToRecordFailures) {
          Object.keys(this.recordedFailures).forEach(key => {
            this.recordedFailures[key].makeFluffy();
          });
        }
      } else {
        // Reset the position, bindings, and userData.
        inputStream.pos = origPos;
        this.truncateBindings(origNumBindings);
        this.userData = origUserData;
      }

      if (this.recordedFailures) {
        this.recordFailures(origRecordedFailures, false);
      }

      // The built-in applySyntactic rule needs special handling: we want to skip
      // trailing spaces, just as with the top-level application of a syntactic rule.
      if (expr === builtInApplySyntacticBody) {
        this.skipSpaces();
      }

      return ans;
    }

    getMatchResult() {
      this.grammar._setUpMatchState(this);
      this.eval(this.startExpr);
      let rightmostFailures;
      if (this.recordedFailures) {
        rightmostFailures = Object.keys(this.recordedFailures).map(
            key => this.recordedFailures[key],
        );
      }
      const cst = this._bindings[0];
      if (cst) {
        cst.grammar = this.grammar;
      }
      return new MatchResult(
          this.matcher,
          this.input,
          this.startExpr,
          cst,
          this._bindingOffsets[0],
          this.rightmostFailurePosition,
          rightmostFailures,
      );
    }

    getTrace() {
      this.trace = [];
      const matchResult = this.getMatchResult();

      // The trace node for the start rule is always the last entry. If it is a syntactic rule,
      // the first entry is for an application of 'spaces'.
      // TODO(pdubroy): Clean this up by introducing a special `Match<startAppl>` rule, which will
      // ensure that there is always a single root trace node.
      const rootTrace = this.trace[this.trace.length - 1];
      rootTrace.result = matchResult;
      return rootTrace;
    }

    pushFailuresInfo() {
      this._rightmostFailurePositionStack.push(this.rightmostFailurePosition);
      this._recordedFailuresStack.push(this.recordedFailures);
    }

    popFailuresInfo() {
      this.rightmostFailurePosition = this._rightmostFailurePositionStack.pop();
      this.recordedFailures = this._recordedFailuresStack.pop();
    }
  }

  class Matcher {
    constructor(grammar) {
      this.grammar = grammar;
      this._memoTable = [];
      this._input = '';
      this._isMemoTableStale = false;
    }

    _resetMemoTable() {
      this._memoTable = [];
      this._isMemoTableStale = false;
    }

    getInput() {
      return this._input;
    }

    setInput(str) {
      if (this._input !== str) {
        this.replaceInputRange(0, this._input.length, str);
      }
      return this;
    }

    replaceInputRange(startIdx, endIdx, str) {
      const prevInput = this._input;
      const memoTable = this._memoTable;
      if (
        startIdx < 0 ||
        startIdx > prevInput.length ||
        endIdx < 0 ||
        endIdx > prevInput.length ||
        startIdx > endIdx
      ) {
        throw new Error('Invalid indices: ' + startIdx + ' and ' + endIdx);
      }

      // update input
      this._input = prevInput.slice(0, startIdx) + str + prevInput.slice(endIdx);
      if (this._input !== prevInput && memoTable.length > 0) {
        this._isMemoTableStale = true;
      }

      // update memo table (similar to the above)
      const restOfMemoTable = memoTable.slice(endIdx);
      memoTable.length = startIdx;
      for (let idx = 0; idx < str.length; idx++) {
        memoTable.push(undefined);
      }
      for (const posInfo of restOfMemoTable) {
        memoTable.push(posInfo);
      }

      // Invalidate memoRecs
      for (let pos = 0; pos < startIdx; pos++) {
        const posInfo = memoTable[pos];
        if (posInfo) {
          posInfo.clearObsoleteEntries(pos, startIdx);
        }
      }

      return this;
    }

    match(optStartApplicationStr, options = {incremental: true}) {
      return this._match(this._getStartExpr(optStartApplicationStr), {
        incremental: options.incremental,
        tracing: false,
      });
    }

    trace(optStartApplicationStr, options = {incremental: true}) {
      return this._match(this._getStartExpr(optStartApplicationStr), {
        incremental: options.incremental,
        tracing: true,
      });
    }

    _match(startExpr, options = {}) {
      const opts = {
        tracing: false,
        incremental: true,
        positionToRecordFailures: undefined,
        ...options,
      };
      if (!opts.incremental) {
        this._resetMemoTable();
      } else if (this._isMemoTableStale && !this.grammar.supportsIncrementalParsing) {
        throw grammarDoesNotSupportIncrementalParsing(this.grammar);
      }

      const state = new MatchState(this, startExpr, opts.positionToRecordFailures);
      return opts.tracing ? state.getTrace() : state.getMatchResult();
    }

    /*
      Returns the starting expression for this Matcher's associated grammar. If
      `optStartApplicationStr` is specified, it is a string expressing a rule application in the
      grammar. If not specified, the grammar's default start rule will be used.
    */
    _getStartExpr(optStartApplicationStr) {
      const applicationStr = optStartApplicationStr || this.grammar.defaultStartRule;
      if (!applicationStr) {
        throw new Error('Missing start rule argument -- the grammar has no default start rule.');
      }

      const startApp = this.grammar.parseApplication(applicationStr);
      return new Seq([startApp, end]);
    }
  }

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  const globalActionStack = [];

  const hasOwnProperty = (x, prop) => Object.prototype.hasOwnProperty.call(x, prop);

  // ----------------- Wrappers -----------------

  // Wrappers decorate CST nodes with all of the functionality (i.e., operations and attributes)
  // provided by a Semantics (see below). `Wrapper` is the abstract superclass of all wrappers. A
  // `Wrapper` must have `_node` and `_semantics` instance variables, which refer to the CST node and
  // Semantics (resp.) for which it was created, and a `_childWrappers` instance variable which is
  // used to cache the wrapper instances that are created for its child nodes. Setting these instance
  // variables is the responsibility of the constructor of each Semantics-specific subclass of
  // `Wrapper`.
  class Wrapper {
    constructor(node, sourceInterval, baseInterval) {
      this._node = node;
      this.source = sourceInterval;

      // The interval that the childOffsets of `node` are relative to. It should be the source
      // of the closest Nonterminal node.
      this._baseInterval = baseInterval;

      if (node.isNonterminal()) {
        assert(sourceInterval === baseInterval);
      }
      this._childWrappers = [];
    }

    _forgetMemoizedResultFor(attributeName) {
      // Remove the memoized attribute from the cstNode and all its children.
      delete this._node[this._semantics.attributeKeys[attributeName]];
      this.children.forEach(child => {
        child._forgetMemoizedResultFor(attributeName);
      });
    }

    // Returns the wrapper of the specified child node. Child wrappers are created lazily and
    // cached in the parent wrapper's `_childWrappers` instance variable.
    child(idx) {
      if (!(0 <= idx && idx < this._node.numChildren())) {
        // TODO: Consider throwing an exception here.
        return undefined;
      }
      let childWrapper = this._childWrappers[idx];
      if (!childWrapper) {
        const childNode = this._node.childAt(idx);
        const offset = this._node.childOffsets[idx];

        const source = this._baseInterval.subInterval(offset, childNode.matchLength);
        const base = childNode.isNonterminal() ? source : this._baseInterval;
        childWrapper = this._childWrappers[idx] = this._semantics.wrap(childNode, source, base);
      }
      return childWrapper;
    }

    // Returns an array containing the wrappers of all of the children of the node associated
    // with this wrapper.
    _children() {
      // Force the creation of all child wrappers
      for (let idx = 0; idx < this._node.numChildren(); idx++) {
        this.child(idx);
      }
      return this._childWrappers;
    }

    // Returns `true` if the CST node associated with this wrapper corresponds to an iteration
    // expression, i.e., a Kleene-*, Kleene-+, or an optional. Returns `false` otherwise.
    isIteration() {
      return this._node.isIteration();
    }

    // Returns `true` if the CST node associated with this wrapper is a terminal node, `false`
    // otherwise.
    isTerminal() {
      return this._node.isTerminal();
    }

    // Returns `true` if the CST node associated with this wrapper is a nonterminal node, `false`
    // otherwise.
    isNonterminal() {
      return this._node.isNonterminal();
    }

    // Returns `true` if the CST node associated with this wrapper is a nonterminal node
    // corresponding to a syntactic rule, `false` otherwise.
    isSyntactic() {
      return this.isNonterminal() && this._node.isSyntactic();
    }

    // Returns `true` if the CST node associated with this wrapper is a nonterminal node
    // corresponding to a lexical rule, `false` otherwise.
    isLexical() {
      return this.isNonterminal() && this._node.isLexical();
    }

    // Returns `true` if the CST node associated with this wrapper is an iterator node
    // having either one or no child (? operator), `false` otherwise.
    // Otherwise, throws an exception.
    isOptional() {
      return this._node.isOptional();
    }

    // Create a new _iter wrapper in the same semantics as this wrapper.
    iteration(optChildWrappers) {
      const childWrappers = optChildWrappers || [];

      const childNodes = childWrappers.map(c => c._node);
      const iter = new IterationNode(childNodes, [], -1, false);

      const wrapper = this._semantics.wrap(iter, null, null);
      wrapper._childWrappers = childWrappers;
      return wrapper;
    }

    // Returns an array containing the children of this CST node.
    get children() {
      return this._children();
    }

    // Returns the name of grammar rule that created this CST node.
    get ctorName() {
      return this._node.ctorName;
    }

    // Returns the number of children of this CST node.
    get numChildren() {
      return this._node.numChildren();
    }

    // Returns the contents of the input stream consumed by this CST node.
    get sourceString() {
      return this.source.contents;
    }
  }

  // ----------------- Semantics -----------------

  // A Semantics is a container for a family of Operations and Attributes for a given grammar.
  // Semantics enable modularity (different clients of a grammar can create their set of operations
  // and attributes in isolation) and extensibility even when operations and attributes are mutually-
  // recursive. This constructor should not be called directly except from
  // `Semantics.createSemantics`. The normal ways to create a Semantics, given a grammar 'g', are
  // `g.createSemantics()` and `g.extendSemantics(parentSemantics)`.
  class Semantics {
    constructor(grammar, superSemantics) {
      const self = this;
      this.grammar = grammar;
      this.checkedActionDicts = false;

      // Constructor for wrapper instances, which are passed as the arguments to the semantic actions
      // of an operation or attribute. Operations and attributes require double dispatch: the semantic
      // action is chosen based on both the node's type and the semantics. Wrappers ensure that
      // the `execute` method is called with the correct (most specific) semantics object as an
      // argument.
      this.Wrapper = class extends (superSemantics ? superSemantics.Wrapper : Wrapper) {
        constructor(node, sourceInterval, baseInterval) {
          super(node, sourceInterval, baseInterval);
          self.checkActionDictsIfHaventAlready();
          this._semantics = self;
        }

        toString() {
          return '[semantics wrapper for ' + self.grammar.name + ']';
        }
      };

      this.super = superSemantics;
      if (superSemantics) {
        if (!(grammar.equals(this.super.grammar) || grammar._inheritsFrom(this.super.grammar))) {
          throw new Error(
              "Cannot extend a semantics for grammar '" +
              this.super.grammar.name +
              "' for use with grammar '" +
              grammar.name +
              "' (not a sub-grammar)",
          );
        }
        this.operations = Object.create(this.super.operations);
        this.attributes = Object.create(this.super.attributes);
        this.attributeKeys = Object.create(null);

        // Assign unique symbols for each of the attributes inherited from the super-semantics so that
        // they are memoized independently.
        // eslint-disable-next-line guard-for-in
        for (const attributeName in this.attributes) {
          Object.defineProperty(this.attributeKeys, attributeName, {
            value: uniqueId(attributeName),
          });
        }
      } else {
        this.operations = Object.create(null);
        this.attributes = Object.create(null);
        this.attributeKeys = Object.create(null);
      }
    }

    toString() {
      return '[semantics for ' + this.grammar.name + ']';
    }

    checkActionDictsIfHaventAlready() {
      if (!this.checkedActionDicts) {
        this.checkActionDicts();
        this.checkedActionDicts = true;
      }
    }

    // Checks that the action dictionaries for all operations and attributes in this semantics,
    // including the ones that were inherited from the super-semantics, agree with the grammar.
    // Throws an exception if one or more of them doesn't.
    checkActionDicts() {
      let name;
      // eslint-disable-next-line guard-for-in
      for (name in this.operations) {
        this.operations[name].checkActionDict(this.grammar);
      }
      // eslint-disable-next-line guard-for-in
      for (name in this.attributes) {
        this.attributes[name].checkActionDict(this.grammar);
      }
    }

    toRecipe(semanticsOnly) {
      function hasSuperSemantics(s) {
        return s.super !== Semantics.BuiltInSemantics._getSemantics();
      }

      let str = '(function(g) {\n';
      if (hasSuperSemantics(this)) {
        str += '  var semantics = ' + this.super.toRecipe(true) + '(g';

        const superSemanticsGrammar = this.super.grammar;
        let relatedGrammar = this.grammar;
        while (relatedGrammar !== superSemanticsGrammar) {
          str += '.superGrammar';
          relatedGrammar = relatedGrammar.superGrammar;
        }

        str += ');\n';
        str += '  return g.extendSemantics(semantics)';
      } else {
        str += '  return g.createSemantics()';
      }
      ['Operation', 'Attribute'].forEach(type => {
        const semanticOperations = this[type.toLowerCase() + 's'];
        Object.keys(semanticOperations).forEach(name => {
          const {actionDict, formals, builtInDefault} = semanticOperations[name];

          let signature = name;
          if (formals.length > 0) {
            signature += '(' + formals.join(', ') + ')';
          }

          let method;
          if (hasSuperSemantics(this) && this.super[type.toLowerCase() + 's'][name]) {
            method = 'extend' + type;
          } else {
            method = 'add' + type;
          }
          str += '\n    .' + method + '(' + JSON.stringify(signature) + ', {';

          const srcArray = [];
          Object.keys(actionDict).forEach(actionName => {
            if (actionDict[actionName] !== builtInDefault) {
              let source = actionDict[actionName].toString().trim();

              // Convert method shorthand to plain old function syntax.
              // https://github.com/ohmjs/ohm/issues/263
              source = source.replace(/^.*\(/, 'function(');

              srcArray.push('\n      ' + JSON.stringify(actionName) + ': ' + source);
            }
          });
          str += srcArray.join(',') + '\n    })';
        });
      });
      str += ';\n  })';

      if (!semanticsOnly) {
        str =
          '(function() {\n' +
          '  var grammar = this.fromRecipe(' +
          this.grammar.toRecipe() +
          ');\n' +
          '  var semantics = ' +
          str +
          '(grammar);\n' +
          '  return semantics;\n' +
          '});\n';
      }

      return str;
    }

    addOperationOrAttribute(type, signature, actionDict) {
      const typePlural = type + 's';

      const parsedNameAndFormalArgs = parseSignature(signature, type);
      const {name} = parsedNameAndFormalArgs;
      const {formals} = parsedNameAndFormalArgs;

      // TODO: check that there are no duplicate formal arguments

      this.assertNewName(name, type);

      // Create the action dictionary for this operation / attribute that contains a `_default` action
      // which defines the default behavior of iteration, terminal, and non-terminal nodes...
      const builtInDefault = newDefaultAction(type, name, doIt);
      const realActionDict = {_default: builtInDefault};
      // ... and add in the actions supplied by the programmer, which may override some or all of the
      // default ones.
      Object.keys(actionDict).forEach(name => {
        realActionDict[name] = actionDict[name];
      });

      const entry =
        type === 'operation' ?
          new Operation(name, formals, realActionDict, builtInDefault) :
          new Attribute(name, realActionDict, builtInDefault);

      // The following check is not strictly necessary (it will happen later anyway) but it's better
      // to catch errors early.
      entry.checkActionDict(this.grammar);

      this[typePlural][name] = entry;

      function doIt(...args) {
        // Dispatch to most specific version of this operation / attribute -- it may have been
        // overridden by a sub-semantics.
        const thisThing = this._semantics[typePlural][name];

        // Check that the caller passed the correct number of arguments.
        if (arguments.length !== thisThing.formals.length) {
          throw new Error(
              'Invalid number of arguments passed to ' +
              name +
              ' ' +
              type +
              ' (expected ' +
              thisThing.formals.length +
              ', got ' +
              arguments.length +
              ')',
          );
        }

        // Create an "arguments object" from the arguments that were passed to this
        // operation / attribute.
        const argsObj = Object.create(null);
        for (const [idx, val] of Object.entries(args)) {
          const formal = thisThing.formals[idx];
          argsObj[formal] = val;
        }

        const oldArgs = this.args;
        this.args = argsObj;
        const ans = thisThing.execute(this._semantics, this);
        this.args = oldArgs;
        return ans;
      }

      if (type === 'operation') {
        this.Wrapper.prototype[name] = doIt;
        this.Wrapper.prototype[name].toString = function() {
          return '[' + name + ' operation]';
        };
      } else {
        Object.defineProperty(this.Wrapper.prototype, name, {
          get: doIt,
          configurable: true, // So the property can be deleted.
        });
        Object.defineProperty(this.attributeKeys, name, {
          value: uniqueId(name),
        });
      }
    }

    extendOperationOrAttribute(type, name, actionDict) {
      const typePlural = type + 's';

      // Make sure that `name` really is just a name, i.e., that it doesn't also contain formals.
      parseSignature(name, 'attribute');

      if (!(this.super && name in this.super[typePlural])) {
        throw new Error(
            'Cannot extend ' +
            type +
            " '" +
            name +
            "': did not inherit an " +
            type +
            ' with that name',
        );
      }
      if (hasOwnProperty(this[typePlural], name)) {
        throw new Error('Cannot extend ' + type + " '" + name + "' again");
      }

      // Create a new operation / attribute whose actionDict delegates to the super operation /
      // attribute's actionDict, and which has all the keys from `inheritedActionDict`.
      const inheritedFormals = this[typePlural][name].formals;
      const inheritedActionDict = this[typePlural][name].actionDict;
      const newActionDict = Object.create(inheritedActionDict);
      Object.keys(actionDict).forEach(name => {
        newActionDict[name] = actionDict[name];
      });

      this[typePlural][name] =
        type === 'operation' ?
          new Operation(name, inheritedFormals, newActionDict) :
          new Attribute(name, newActionDict);

      // The following check is not strictly necessary (it will happen later anyway) but it's better
      // to catch errors early.
      this[typePlural][name].checkActionDict(this.grammar);
    }

    assertNewName(name, type) {
      if (hasOwnProperty(Wrapper.prototype, name)) {
        throw new Error('Cannot add ' + type + " '" + name + "': that's a reserved name");
      }
      if (name in this.operations) {
        throw new Error(
            'Cannot add ' + type + " '" + name + "': an operation with that name already exists",
        );
      }
      if (name in this.attributes) {
        throw new Error(
            'Cannot add ' + type + " '" + name + "': an attribute with that name already exists",
        );
      }
    }

    // Returns a wrapper for the given CST `node` in this semantics.
    // If `node` is already a wrapper, returns `node` itself.  // TODO: why is this needed?
    wrap(node, source, optBaseInterval) {
      const baseInterval = optBaseInterval || source;
      return node instanceof this.Wrapper ? node : new this.Wrapper(node, source, baseInterval);
    }
  }

  function parseSignature(signature, type) {
    if (!Semantics.prototypeGrammar) {
      // The Operations and Attributes grammar won't be available while Ohm is loading,
      // but we can get away the following simplification b/c none of the operations
      // that are used while loading take arguments.
      assert(signature.indexOf('(') === -1);
      return {
        name: signature,
        formals: [],
      };
    }

    const r = Semantics.prototypeGrammar.match(
        signature,
      type === 'operation' ? 'OperationSignature' : 'AttributeSignature',
    );
    if (r.failed()) {
      throw new Error(r.message);
    }

    return Semantics.prototypeGrammarSemantics(r).parse();
  }

  function newDefaultAction(type, name, doIt) {
    return function(...children) {
      const thisThing = this._semantics.operations[name] || this._semantics.attributes[name];
      const args = thisThing.formals.map(formal => this.args[formal]);

      if (!this.isIteration() && children.length === 1) {
        // This CST node corresponds to a non-terminal in the grammar (e.g., AddExpr). The fact that
        // we got here means that this action dictionary doesn't have an action for this particular
        // non-terminal or a generic `_nonterminal` action.
        // As a convenience, if this node only has one child, we just return the result of applying
        // this operation / attribute to the child node.
        return doIt.apply(children[0], args);
      } else {
        // Otherwise, we throw an exception to let the programmer know that we don't know what
        // to do with this node.
        throw missingSemanticAction(this.ctorName, name, type, globalActionStack);
      }
    };
  }

  // Creates a new Semantics instance for `grammar`, inheriting operations and attributes from
  // `optSuperSemantics`, if it is specified. Returns a function that acts as a proxy for the new
  // Semantics instance. When that function is invoked with a CST node as an argument, it returns
  // a wrapper for that node which gives access to the operations and attributes provided by this
  // semantics.
  Semantics.createSemantics = function(grammar, optSuperSemantics) {
    const s = new Semantics(
        grammar,
      optSuperSemantics !== undefined ?
        optSuperSemantics :
        Semantics.BuiltInSemantics._getSemantics(),
    );

    // To enable clients to invoke a semantics like a function, return a function that acts as a proxy
    // for `s`, which is the real `Semantics` instance.
    const proxy = function ASemantics(matchResult) {
      if (!(matchResult instanceof MatchResult)) {
        throw new TypeError(
            'Semantics expected a MatchResult, but got ' +
            unexpectedObjToString(matchResult),
        );
      }
      if (matchResult.failed()) {
        throw new TypeError('cannot apply Semantics to ' + matchResult.toString());
      }

      const cst = matchResult._cst;
      if (cst.grammar !== grammar) {
        throw new Error(
            "Cannot use a MatchResult from grammar '" +
            cst.grammar.name +
            "' with a semantics for '" +
            grammar.name +
            "'",
        );
      }
      const inputStream = new InputStream(matchResult.input);
      return s.wrap(cst, inputStream.interval(matchResult._cstOffset, matchResult.input.length));
    };

    // Forward public methods from the proxy to the semantics instance.
    proxy.addOperation = function(signature, actionDict) {
      s.addOperationOrAttribute('operation', signature, actionDict);
      return proxy;
    };
    proxy.extendOperation = function(name, actionDict) {
      s.extendOperationOrAttribute('operation', name, actionDict);
      return proxy;
    };
    proxy.addAttribute = function(name, actionDict) {
      s.addOperationOrAttribute('attribute', name, actionDict);
      return proxy;
    };
    proxy.extendAttribute = function(name, actionDict) {
      s.extendOperationOrAttribute('attribute', name, actionDict);
      return proxy;
    };
    proxy._getActionDict = function(operationOrAttributeName) {
      const action =
        s.operations[operationOrAttributeName] || s.attributes[operationOrAttributeName];
      if (!action) {
        throw new Error(
            '"' +
            operationOrAttributeName +
            '" is not a valid operation or attribute ' +
            'name in this semantics for "' +
            grammar.name +
            '"',
        );
      }
      return action.actionDict;
    };
    proxy._remove = function(operationOrAttributeName) {
      let semantic;
      if (operationOrAttributeName in s.operations) {
        semantic = s.operations[operationOrAttributeName];
        delete s.operations[operationOrAttributeName];
      } else if (operationOrAttributeName in s.attributes) {
        semantic = s.attributes[operationOrAttributeName];
        delete s.attributes[operationOrAttributeName];
      }
      delete s.Wrapper.prototype[operationOrAttributeName];
      return semantic;
    };
    proxy.getOperationNames = function() {
      return Object.keys(s.operations);
    };
    proxy.getAttributeNames = function() {
      return Object.keys(s.attributes);
    };
    proxy.getGrammar = function() {
      return s.grammar;
    };
    proxy.toRecipe = function(semanticsOnly) {
      return s.toRecipe(semanticsOnly);
    };

    // Make the proxy's toString() work.
    proxy.toString = s.toString.bind(s);

    // Returns the semantics for the proxy.
    proxy._getSemantics = function() {
      return s;
    };

    return proxy;
  };

  // ----------------- Operation -----------------

  // An Operation represents a function to be applied to a concrete syntax tree (CST) -- it's very
  // similar to a Visitor (http://en.wikipedia.org/wiki/Visitor_pattern). An operation is executed by
  // recursively walking the CST, and at each node, invoking the matching semantic action from
  // `actionDict`. See `Operation.prototype.execute` for details of how a CST node's matching semantic
  // action is found.
  class Operation {
    constructor(name, formals, actionDict, builtInDefault) {
      this.name = name;
      this.formals = formals;
      this.actionDict = actionDict;
      this.builtInDefault = builtInDefault;
    }

    checkActionDict(grammar) {
      grammar._checkTopDownActionDict(this.typeName, this.name, this.actionDict);
    }

    // Execute this operation on the CST node associated with `nodeWrapper` in the context of the
    // given Semantics instance.
    execute(semantics, nodeWrapper) {
      try {
        // Look for a semantic action whose name matches the node's constructor name, which is either
        // the name of a rule in the grammar, or '_terminal' (for a terminal node), or '_iter' (for an
        // iteration node).
        const {ctorName} = nodeWrapper._node;
        let actionFn = this.actionDict[ctorName];
        if (actionFn) {
          globalActionStack.push([this, ctorName]);
          return actionFn.apply(nodeWrapper, nodeWrapper._children());
        }

        // The action dictionary does not contain a semantic action for this specific type of node.
        // If this is a nonterminal node and the programmer has provided a `_nonterminal` semantic
        // action, we invoke it:
        if (nodeWrapper.isNonterminal()) {
          actionFn = this.actionDict._nonterminal;
          if (actionFn) {
            globalActionStack.push([this, '_nonterminal', ctorName]);
            return actionFn.apply(nodeWrapper, nodeWrapper._children());
          }
        }

        // Otherwise, we invoke the '_default' semantic action.
        globalActionStack.push([this, 'default action', ctorName]);
        return this.actionDict._default.apply(nodeWrapper, nodeWrapper._children());
      } finally {
        globalActionStack.pop();
      }
    }
  }

  Operation.prototype.typeName = 'operation';

  // ----------------- Attribute -----------------

  // Attributes are Operations whose results are memoized. This means that, for any given semantics,
  // the semantic action for a CST node will be invoked no more than once.
  class Attribute extends Operation {
    constructor(name, actionDict, builtInDefault) {
      super(name, [], actionDict, builtInDefault);
    }

    execute(semantics, nodeWrapper) {
      const node = nodeWrapper._node;
      const key = semantics.attributeKeys[this.name];
      if (!hasOwnProperty(node, key)) {
        // The following is a super-send -- isn't JS beautiful? :/
        node[key] = Operation.prototype.execute.call(this, semantics, nodeWrapper);
      }
      return node[key];
    }
  }

  Attribute.prototype.typeName = 'attribute';

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  const SPECIAL_ACTION_NAMES = ['_iter', '_terminal', '_nonterminal', '_default'];

  function getSortedRuleValues(grammar) {
    return Object.keys(grammar.rules)
        .sort()
        .map(name => grammar.rules[name]);
  }

  // Until ES2019, JSON was not a valid subset of JavaScript because U+2028 (line separator)
  // and U+2029 (paragraph separator) are allowed in JSON string literals, but not in JS.
  // This function properly encodes those two characters so that the resulting string is
  // represents both valid JSON, and valid JavaScript (for ES2018 and below).
  // See https://v8.dev/features/subsume-json for more details.
  const jsonToJS = str => str.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

  let ohmGrammar$1;
  let buildGrammar$1;

  class Grammar {
    constructor(name, superGrammar, rules, optDefaultStartRule) {
      this.name = name;
      this.superGrammar = superGrammar;
      this.rules = rules;
      if (optDefaultStartRule) {
        if (!(optDefaultStartRule in rules)) {
          throw new Error(
              "Invalid start rule: '" +
              optDefaultStartRule +
              "' is not a rule in grammar '" +
              name +
              "'",
          );
        }
        this.defaultStartRule = optDefaultStartRule;
      }
      this._matchStateInitializer = undefined;
      this.supportsIncrementalParsing = true;
    }

    matcher() {
      return new Matcher(this);
    }

    // Return true if the grammar is a built-in grammar, otherwise false.
    // NOTE: This might give an unexpected result if called before BuiltInRules is defined!
    isBuiltIn() {
      return this === Grammar.ProtoBuiltInRules || this === Grammar.BuiltInRules;
    }

    equals(g) {
      if (this === g) {
        return true;
      }
      // Do the cheapest comparisons first.
      if (
        g == null ||
        this.name !== g.name ||
        this.defaultStartRule !== g.defaultStartRule ||
        !(this.superGrammar === g.superGrammar || this.superGrammar.equals(g.superGrammar))
      ) {
        return false;
      }
      const myRules = getSortedRuleValues(this);
      const otherRules = getSortedRuleValues(g);
      return (
        myRules.length === otherRules.length &&
        myRules.every((rule, i) => {
          return (
            rule.description === otherRules[i].description &&
            rule.formals.join(',') === otherRules[i].formals.join(',') &&
            rule.body.toString() === otherRules[i].body.toString()
          );
        })
      );
    }

    match(input, optStartApplication) {
      const m = this.matcher();
      m.replaceInputRange(0, 0, input);
      return m.match(optStartApplication);
    }

    trace(input, optStartApplication) {
      const m = this.matcher();
      m.replaceInputRange(0, 0, input);
      return m.trace(optStartApplication);
    }

    createSemantics() {
      return Semantics.createSemantics(this);
    }

    extendSemantics(superSemantics) {
      return Semantics.createSemantics(this, superSemantics._getSemantics());
    }

    // Check that every key in `actionDict` corresponds to a semantic action, and that it maps to
    // a function of the correct arity. If not, throw an exception.
    _checkTopDownActionDict(what, name, actionDict) {
      const problems = [];

      // eslint-disable-next-line guard-for-in
      for (const k in actionDict) {
        const v = actionDict[k];
        const isSpecialAction = SPECIAL_ACTION_NAMES.includes(k);

        if (!isSpecialAction && !(k in this.rules)) {
          problems.push(`'${k}' is not a valid semantic action for '${this.name}'`);
          continue;
        }
        if (typeof v !== 'function') {
          problems.push(`'${k}' must be a function in an action dictionary for '${this.name}'`);
          continue;
        }
        const actual = v.length;
        const expected = this._topDownActionArity(k);
        if (actual !== expected) {
          let details;
          if (k === '_iter' || k === '_nonterminal') {
            details =
              `it should use a rest parameter, e.g. \`${k}(...children) {}\`. ` +
              'NOTE: this is new in Ohm v16 — see https://ohmjs.org/d/ati for details.';
          } else {
            details = `expected ${expected}, got ${actual}`;
          }
          problems.push(`Semantic action '${k}' has the wrong arity: ${details}`);
        }
      }
      if (problems.length > 0) {
        const prettyProblems = problems.map(problem => '- ' + problem);
        const error = new Error(
            [
              `Found errors in the action dictionary of the '${name}' ${what}:`,
              ...prettyProblems,
            ].join('\n'),
        );
        error.problems = problems;
        throw error;
      }
    }

    // Return the expected arity for a semantic action named `actionName`, which
    // is either a rule name or a special action name like '_nonterminal'.
    _topDownActionArity(actionName) {
      // All special actions have an expected arity of 0, though all but _terminal
      // are expected to use the rest parameter syntax (e.g. `_iter(...children)`).
      // This is considered to have arity 0, i.e. `((...args) => {}).length` is 0.
      return SPECIAL_ACTION_NAMES.includes(actionName) ?
        0 :
        this.rules[actionName].body.getArity();
    }

    _inheritsFrom(grammar) {
      let g = this.superGrammar;
      while (g) {
        if (g.equals(grammar, true)) {
          return true;
        }
        g = g.superGrammar;
      }
      return false;
    }

    toRecipe(superGrammarExpr = undefined) {
      const metaInfo = {};
      // Include the grammar source if it is available.
      if (this.source) {
        metaInfo.source = this.source.contents;
      }

      let startRule = null;
      if (this.defaultStartRule) {
        startRule = this.defaultStartRule;
      }

      const rules = {};
      Object.keys(this.rules).forEach(ruleName => {
        const ruleInfo = this.rules[ruleName];
        const {body} = ruleInfo;
        const isDefinition = !this.superGrammar || !this.superGrammar.rules[ruleName];

        let operation;
        if (isDefinition) {
          operation = 'define';
        } else {
          operation = body instanceof Extend ? 'extend' : 'override';
        }

        const metaInfo = {};
        if (ruleInfo.source && this.source) {
          const adjusted = ruleInfo.source.relativeTo(this.source);
          metaInfo.sourceInterval = [adjusted.startIdx, adjusted.endIdx];
        }

        const description = isDefinition ? ruleInfo.description : null;
        const bodyRecipe = body.outputRecipe(ruleInfo.formals, this.source);

        rules[ruleName] = [
          operation, // "define"/"extend"/"override"
          metaInfo,
          description,
          ruleInfo.formals,
          bodyRecipe,
        ];
      });

      // If the caller provided an expression to use for the supergrammar, use that.
      // Otherwise, if the supergrammar is a user grammar, use its recipe inline.
      let superGrammarOutput = 'null';
      if (superGrammarExpr) {
        superGrammarOutput = superGrammarExpr;
      } else if (this.superGrammar && !this.superGrammar.isBuiltIn()) {
        superGrammarOutput = this.superGrammar.toRecipe();
      }

      const recipeElements = [
        ...['grammar', metaInfo, this.name].map(JSON.stringify),
        superGrammarOutput,
        ...[startRule, rules].map(JSON.stringify),
      ];
      return jsonToJS(`[${recipeElements.join(',')}]`);
    }

    // TODO: Come up with better names for these methods.
    // TODO: Write the analog of these methods for inherited attributes.
    toOperationActionDictionaryTemplate() {
      return this._toOperationOrAttributeActionDictionaryTemplate();
    }
    toAttributeActionDictionaryTemplate() {
      return this._toOperationOrAttributeActionDictionaryTemplate();
    }

    _toOperationOrAttributeActionDictionaryTemplate() {
      // TODO: add the super-grammar's templates at the right place, e.g., a case for AddExpr_plus
      // should appear next to other cases of AddExpr.

      const sb = new StringBuffer();
      sb.append('{');

      let first = true;
      // eslint-disable-next-line guard-for-in
      for (const ruleName in this.rules) {
        const {body} = this.rules[ruleName];
        if (first) {
          first = false;
        } else {
          sb.append(',');
        }
        sb.append('\n');
        sb.append('  ');
        this.addSemanticActionTemplate(ruleName, body, sb);
      }

      sb.append('\n}');
      return sb.contents();
    }

    addSemanticActionTemplate(ruleName, body, sb) {
      sb.append(ruleName);
      sb.append(': function(');
      const arity = this._topDownActionArity(ruleName);
      sb.append(repeat('_', arity).join(', '));
      sb.append(') {\n');
      sb.append('  }');
    }

    // Parse a string which expresses a rule application in this grammar, and return the
    // resulting Apply node.
    parseApplication(str) {
      let app;
      if (str.indexOf('<') === -1) {
        // simple application
        app = new Apply(str);
      } else {
        // parameterized application
        const cst = ohmGrammar$1.match(str, 'Base_application');
        app = buildGrammar$1(cst, {});
      }

      // Ensure that the application is valid.
      if (!(app.ruleName in this.rules)) {
        throw undeclaredRule(app.ruleName, this.name);
      }
      const {formals} = this.rules[app.ruleName];
      if (formals.length !== app.args.length) {
        const {source} = this.rules[app.ruleName];
        throw wrongNumberOfParameters(
            app.ruleName,
            formals.length,
            app.args.length,
            source,
        );
      }
      return app;
    }

    _setUpMatchState(state) {
      if (this._matchStateInitializer) {
        this._matchStateInitializer(state);
      }
    }
  }

  // The following grammar contains a few rules that couldn't be written  in "userland".
  // At the bottom of src/main.js, we create a sub-grammar of this grammar that's called
  // `BuiltInRules`. That grammar contains several convenience rules, e.g., `letter` and
  // `digit`, and is implicitly the super-grammar of any grammar whose super-grammar
  // isn't specified.
  Grammar.ProtoBuiltInRules = new Grammar(
      'ProtoBuiltInRules', // name
      undefined, // supergrammar
      {
        any: {
          body: any,
          formals: [],
          description: 'any character',
          primitive: true,
        },
        end: {
          body: end,
          formals: [],
          description: 'end of input',
          primitive: true,
        },

        caseInsensitive: {
          body: new CaseInsensitiveTerminal(new Param(0)),
          formals: ['str'],
          primitive: true,
        },
        lower: {
          body: new UnicodeChar('Ll'),
          formals: [],
          description: 'a lowercase letter',
          primitive: true,
        },
        upper: {
          body: new UnicodeChar('Lu'),
          formals: [],
          description: 'an uppercase letter',
          primitive: true,
        },
        // Union of Lt (titlecase), Lm (modifier), and Lo (other), i.e. any letter not in Ll or Lu.
        unicodeLtmo: {
          body: new UnicodeChar('Ltmo'),
          formals: [],
          description: 'a Unicode character in Lt, Lm, or Lo',
          primitive: true,
        },

        // These rules are not truly primitive (they could be written in userland) but are defined
        // here for bootstrapping purposes.
        spaces: {
          body: new Star(new Apply('space')),
          formals: [],
        },
        space: {
          body: new Range('\x00', ' '),
          formals: [],
          description: 'a space',
        },
      },
  );

  // This method is called from main.js once Ohm has loaded.
  Grammar.initApplicationParser = function(grammar, builderFn) {
    ohmGrammar$1 = grammar;
    buildGrammar$1 = builderFn;
  };

  // --------------------------------------------------------------------
  // Private Stuff
  // --------------------------------------------------------------------

  // Constructors

  class GrammarDecl {
    constructor(name) {
      this.name = name;
    }

    // Helpers

    sourceInterval(startIdx, endIdx) {
      return this.source.subInterval(startIdx, endIdx - startIdx);
    }

    ensureSuperGrammar() {
      if (!this.superGrammar) {
        this.withSuperGrammar(
          // TODO: The conditional expression below is an ugly hack. It's kind of ok because
          // I doubt anyone will ever try to declare a grammar called `BuiltInRules`. Still,
          // we should try to find a better way to do this.
          this.name === 'BuiltInRules' ? Grammar.ProtoBuiltInRules : Grammar.BuiltInRules,
        );
      }
      return this.superGrammar;
    }

    ensureSuperGrammarRuleForOverriding(name, source) {
      const ruleInfo = this.ensureSuperGrammar().rules[name];
      if (!ruleInfo) {
        throw cannotOverrideUndeclaredRule(name, this.superGrammar.name, source);
      }
      return ruleInfo;
    }

    installOverriddenOrExtendedRule(name, formals, body, source) {
      const duplicateParameterNames$1 = getDuplicates(formals);
      if (duplicateParameterNames$1.length > 0) {
        throw duplicateParameterNames(name, duplicateParameterNames$1, source);
      }
      const ruleInfo = this.ensureSuperGrammar().rules[name];
      const expectedFormals = ruleInfo.formals;
      const expectedNumFormals = expectedFormals ? expectedFormals.length : 0;
      if (formals.length !== expectedNumFormals) {
        throw wrongNumberOfParameters(name, expectedNumFormals, formals.length, source);
      }
      return this.install(name, formals, body, ruleInfo.description, source);
    }

    install(name, formals, body, description, source, primitive = false) {
      this.rules[name] = {
        body: body.introduceParams(formals),
        formals,
        description,
        source,
        primitive,
      };
      return this;
    }

    // Stuff that you should only do once

    withSuperGrammar(superGrammar) {
      if (this.superGrammar) {
        throw new Error('the super grammar of a GrammarDecl cannot be set more than once');
      }
      this.superGrammar = superGrammar;
      this.rules = Object.create(superGrammar.rules);

      // Grammars with an explicit supergrammar inherit a default start rule.
      if (!superGrammar.isBuiltIn()) {
        this.defaultStartRule = superGrammar.defaultStartRule;
      }
      return this;
    }

    withDefaultStartRule(ruleName) {
      this.defaultStartRule = ruleName;
      return this;
    }

    withSource(source) {
      this.source = new InputStream(source).interval(0, source.length);
      return this;
    }

    // Creates a Grammar instance, and if it passes the sanity checks, returns it.
    build() {
      const grammar = new Grammar(
          this.name,
          this.ensureSuperGrammar(),
          this.rules,
          this.defaultStartRule,
      );
      // Initialize internal props that are inherited from the super grammar.
      grammar._matchStateInitializer = grammar.superGrammar._matchStateInitializer;
      grammar.supportsIncrementalParsing = grammar.superGrammar.supportsIncrementalParsing;

      // TODO: change the pexpr.prototype.assert... methods to make them add
      // exceptions to an array that's provided as an arg. Then we'll be able to
      // show more than one error of the same type at a time.
      // TODO: include the offending pexpr in the errors, that way we can show
      // the part of the source that caused it.
      const grammarErrors = [];
      let grammarHasInvalidApplications = false;
      Object.keys(grammar.rules).forEach(ruleName => {
        const {body} = grammar.rules[ruleName];
        try {
          body.assertChoicesHaveUniformArity(ruleName);
        } catch (e) {
          grammarErrors.push(e);
        }
        try {
          body.assertAllApplicationsAreValid(ruleName, grammar);
        } catch (e) {
          grammarErrors.push(e);
          grammarHasInvalidApplications = true;
        }
      });
      if (!grammarHasInvalidApplications) {
        // The following check can only be done if the grammar has no invalid applications.
        Object.keys(grammar.rules).forEach(ruleName => {
          const {body} = grammar.rules[ruleName];
          try {
            body.assertIteratedExprsAreNotNullable(grammar, []);
          } catch (e) {
            grammarErrors.push(e);
          }
        });
      }
      if (grammarErrors.length > 0) {
        throwErrors(grammarErrors);
      }
      if (this.source) {
        grammar.source = this.source;
      }

      return grammar;
    }

    // Rule declarations

    define(name, formals, body, description, source, primitive) {
      this.ensureSuperGrammar();
      if (this.superGrammar.rules[name]) {
        throw duplicateRuleDeclaration(name, this.name, this.superGrammar.name, source);
      } else if (this.rules[name]) {
        throw duplicateRuleDeclaration(name, this.name, this.name, source);
      }
      const duplicateParameterNames$1 = getDuplicates(formals);
      if (duplicateParameterNames$1.length > 0) {
        throw duplicateParameterNames(name, duplicateParameterNames$1, source);
      }
      return this.install(name, formals, body, description, source, primitive);
    }

    override(name, formals, body, descIgnored, source) {
      this.ensureSuperGrammarRuleForOverriding(name, source);
      this.installOverriddenOrExtendedRule(name, formals, body, source);
      return this;
    }

    extend(name, formals, fragment, descIgnored, source) {
      const ruleInfo = this.ensureSuperGrammar().rules[name];
      if (!ruleInfo) {
        throw cannotExtendUndeclaredRule(name, this.superGrammar.name, source);
      }
      const body = new Extend(this.superGrammar, name, fragment);
      body.source = fragment.source;
      this.installOverriddenOrExtendedRule(name, formals, body, source);
      return this;
    }
  }

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  class Builder {
    constructor() {
      this.currentDecl = null;
      this.currentRuleName = null;
    }

    newGrammar(name) {
      return new GrammarDecl(name);
    }

    grammar(metaInfo, name, superGrammar, defaultStartRule, rules) {
      const gDecl = new GrammarDecl(name);
      if (superGrammar) {
        // `superGrammar` may be a recipe (i.e. an Array), or an actual grammar instance.
        gDecl.withSuperGrammar(
          superGrammar instanceof Grammar ? superGrammar : this.fromRecipe(superGrammar),
        );
      }
      if (defaultStartRule) {
        gDecl.withDefaultStartRule(defaultStartRule);
      }
      if (metaInfo && metaInfo.source) {
        gDecl.withSource(metaInfo.source);
      }

      this.currentDecl = gDecl;
      Object.keys(rules).forEach(ruleName => {
        this.currentRuleName = ruleName;
        const ruleRecipe = rules[ruleName];

        const action = ruleRecipe[0]; // define/extend/override
        const metaInfo = ruleRecipe[1];
        const description = ruleRecipe[2];
        const formals = ruleRecipe[3];
        const body = this.fromRecipe(ruleRecipe[4]);

        let source;
        if (gDecl.source && metaInfo && metaInfo.sourceInterval) {
          source = gDecl.source.subInterval(
              metaInfo.sourceInterval[0],
              metaInfo.sourceInterval[1] - metaInfo.sourceInterval[0],
          );
        }
        gDecl[action](ruleName, formals, body, description, source);
      });
      this.currentRuleName = this.currentDecl = null;
      return gDecl.build();
    }

    terminal(x) {
      return new Terminal(x);
    }

    range(from, to) {
      return new Range(from, to);
    }

    param(index) {
      return new Param(index);
    }

    alt(...termArgs) {
      let terms = [];
      for (let arg of termArgs) {
        if (!(arg instanceof PExpr)) {
          arg = this.fromRecipe(arg);
        }
        if (arg instanceof Alt) {
          terms = terms.concat(arg.terms);
        } else {
          terms.push(arg);
        }
      }
      return terms.length === 1 ? terms[0] : new Alt(terms);
    }

    seq(...factorArgs) {
      let factors = [];
      for (let arg of factorArgs) {
        if (!(arg instanceof PExpr)) {
          arg = this.fromRecipe(arg);
        }
        if (arg instanceof Seq) {
          factors = factors.concat(arg.factors);
        } else {
          factors.push(arg);
        }
      }
      return factors.length === 1 ? factors[0] : new Seq(factors);
    }

    star(expr) {
      if (!(expr instanceof PExpr)) {
        expr = this.fromRecipe(expr);
      }
      return new Star(expr);
    }

    plus(expr) {
      if (!(expr instanceof PExpr)) {
        expr = this.fromRecipe(expr);
      }
      return new Plus(expr);
    }

    opt(expr) {
      if (!(expr instanceof PExpr)) {
        expr = this.fromRecipe(expr);
      }
      return new Opt(expr);
    }

    not(expr) {
      if (!(expr instanceof PExpr)) {
        expr = this.fromRecipe(expr);
      }
      return new Not(expr);
    }

    lookahead(expr) {
      if (!(expr instanceof PExpr)) {
        expr = this.fromRecipe(expr);
      }
      return new Lookahead(expr);
    }

    lex(expr) {
      if (!(expr instanceof PExpr)) {
        expr = this.fromRecipe(expr);
      }
      return new Lex(expr);
    }

    app(ruleName, optParams) {
      if (optParams && optParams.length > 0) {
        optParams = optParams.map(function(param) {
          return param instanceof PExpr ? param : this.fromRecipe(param);
        }, this);
      }
      return new Apply(ruleName, optParams);
    }

    // Note that unlike other methods in this class, this method cannot be used as a
    // convenience constructor. It only works with recipes, because it relies on
    // `this.currentDecl` and `this.currentRuleName` being set.
    splice(beforeTerms, afterTerms) {
      return new Splice(
          this.currentDecl.superGrammar,
          this.currentRuleName,
          beforeTerms.map(term => this.fromRecipe(term)),
          afterTerms.map(term => this.fromRecipe(term)),
      );
    }

    fromRecipe(recipe) {
      // the meta-info of 'grammar' is processed in Builder.grammar
      const args = recipe[0] === 'grammar' ? recipe.slice(1) : recipe.slice(2);
      const result = this[recipe[0]](...args);

      const metaInfo = recipe[1];
      if (metaInfo) {
        if (metaInfo.sourceInterval && this.currentDecl) {
          result.withSource(this.currentDecl.sourceInterval(...metaInfo.sourceInterval));
        }
      }
      return result;
    }
  }

  function makeRecipe(recipe) {
    if (typeof recipe === 'function') {
      return recipe.call(new Builder());
    } else {
      if (typeof recipe === 'string') {
        // stringified JSON recipe
        recipe = JSON.parse(recipe);
      }
      return new Builder().fromRecipe(recipe);
    }
  }

  var BuiltInRules = makeRecipe(["grammar",{"source":"BuiltInRules {\n\n  alnum  (an alpha-numeric character)\n    = letter\n    | digit\n\n  letter  (a letter)\n    = lower\n    | upper\n    | unicodeLtmo\n\n  digit  (a digit)\n    = \"0\"..\"9\"\n\n  hexDigit  (a hexadecimal digit)\n    = digit\n    | \"a\"..\"f\"\n    | \"A\"..\"F\"\n\n  ListOf<elem, sep>\n    = NonemptyListOf<elem, sep>\n    | EmptyListOf<elem, sep>\n\n  NonemptyListOf<elem, sep>\n    = elem (sep elem)*\n\n  EmptyListOf<elem, sep>\n    = /* nothing */\n\n  listOf<elem, sep>\n    = nonemptyListOf<elem, sep>\n    | emptyListOf<elem, sep>\n\n  nonemptyListOf<elem, sep>\n    = elem (sep elem)*\n\n  emptyListOf<elem, sep>\n    = /* nothing */\n\n  // Allows a syntactic rule application within a lexical context.\n  applySyntactic<app> = app\n}"},"BuiltInRules",null,null,{"alnum":["define",{"sourceInterval":[18,78]},"an alpha-numeric character",[],["alt",{"sourceInterval":[60,78]},["app",{"sourceInterval":[60,66]},"letter",[]],["app",{"sourceInterval":[73,78]},"digit",[]]]],"letter":["define",{"sourceInterval":[82,142]},"a letter",[],["alt",{"sourceInterval":[107,142]},["app",{"sourceInterval":[107,112]},"lower",[]],["app",{"sourceInterval":[119,124]},"upper",[]],["app",{"sourceInterval":[131,142]},"unicodeLtmo",[]]]],"digit":["define",{"sourceInterval":[146,177]},"a digit",[],["range",{"sourceInterval":[169,177]},"0","9"]],"hexDigit":["define",{"sourceInterval":[181,254]},"a hexadecimal digit",[],["alt",{"sourceInterval":[219,254]},["app",{"sourceInterval":[219,224]},"digit",[]],["range",{"sourceInterval":[231,239]},"a","f"],["range",{"sourceInterval":[246,254]},"A","F"]]],"ListOf":["define",{"sourceInterval":[258,336]},null,["elem","sep"],["alt",{"sourceInterval":[282,336]},["app",{"sourceInterval":[282,307]},"NonemptyListOf",[["param",{"sourceInterval":[297,301]},0],["param",{"sourceInterval":[303,306]},1]]],["app",{"sourceInterval":[314,336]},"EmptyListOf",[["param",{"sourceInterval":[326,330]},0],["param",{"sourceInterval":[332,335]},1]]]]],"NonemptyListOf":["define",{"sourceInterval":[340,388]},null,["elem","sep"],["seq",{"sourceInterval":[372,388]},["param",{"sourceInterval":[372,376]},0],["star",{"sourceInterval":[377,388]},["seq",{"sourceInterval":[378,386]},["param",{"sourceInterval":[378,381]},1],["param",{"sourceInterval":[382,386]},0]]]]],"EmptyListOf":["define",{"sourceInterval":[392,434]},null,["elem","sep"],["seq",{"sourceInterval":[438,438]}]],"listOf":["define",{"sourceInterval":[438,516]},null,["elem","sep"],["alt",{"sourceInterval":[462,516]},["app",{"sourceInterval":[462,487]},"nonemptyListOf",[["param",{"sourceInterval":[477,481]},0],["param",{"sourceInterval":[483,486]},1]]],["app",{"sourceInterval":[494,516]},"emptyListOf",[["param",{"sourceInterval":[506,510]},0],["param",{"sourceInterval":[512,515]},1]]]]],"nonemptyListOf":["define",{"sourceInterval":[520,568]},null,["elem","sep"],["seq",{"sourceInterval":[552,568]},["param",{"sourceInterval":[552,556]},0],["star",{"sourceInterval":[557,568]},["seq",{"sourceInterval":[558,566]},["param",{"sourceInterval":[558,561]},1],["param",{"sourceInterval":[562,566]},0]]]]],"emptyListOf":["define",{"sourceInterval":[572,682]},null,["elem","sep"],["seq",{"sourceInterval":[685,685]}]],"applySyntactic":["define",{"sourceInterval":[685,710]},null,["app"],["param",{"sourceInterval":[707,710]},0]]}]);

  Grammar.BuiltInRules = BuiltInRules;
  announceBuiltInRules(Grammar.BuiltInRules);

  var ohmGrammar = makeRecipe(["grammar",{"source":"Ohm {\n\n  Grammars\n    = Grammar*\n\n  Grammar\n    = ident SuperGrammar? \"{\" Rule* \"}\"\n\n  SuperGrammar\n    = \"<:\" ident\n\n  Rule\n    = ident Formals? ruleDescr? \"=\"  RuleBody  -- define\n    | ident Formals?            \":=\" OverrideRuleBody  -- override\n    | ident Formals?            \"+=\" RuleBody  -- extend\n\n  RuleBody\n    = \"|\"? NonemptyListOf<TopLevelTerm, \"|\">\n\n  TopLevelTerm\n    = Seq caseName  -- inline\n    | Seq\n\n  OverrideRuleBody\n    = \"|\"? NonemptyListOf<OverrideTopLevelTerm, \"|\">\n\n  OverrideTopLevelTerm\n    = \"...\"  -- superSplice\n    | TopLevelTerm\n\n  Formals\n    = \"<\" ListOf<ident, \",\"> \">\"\n\n  Params\n    = \"<\" ListOf<Seq, \",\"> \">\"\n\n  Alt\n    = NonemptyListOf<Seq, \"|\">\n\n  Seq\n    = Iter*\n\n  Iter\n    = Pred \"*\"  -- star\n    | Pred \"+\"  -- plus\n    | Pred \"?\"  -- opt\n    | Pred\n\n  Pred\n    = \"~\" Lex  -- not\n    | \"&\" Lex  -- lookahead\n    | Lex\n\n  Lex\n    = \"#\" Base  -- lex\n    | Base\n\n  Base\n    = ident Params? ~(ruleDescr? \"=\" | \":=\" | \"+=\")  -- application\n    | oneCharTerminal \"..\" oneCharTerminal           -- range\n    | terminal                                       -- terminal\n    | \"(\" Alt \")\"                                    -- paren\n\n  ruleDescr  (a rule description)\n    = \"(\" ruleDescrText \")\"\n\n  ruleDescrText\n    = (~\")\" any)*\n\n  caseName\n    = \"--\" (~\"\\n\" space)* name (~\"\\n\" space)* (\"\\n\" | &\"}\")\n\n  name  (a name)\n    = nameFirst nameRest*\n\n  nameFirst\n    = \"_\"\n    | letter\n\n  nameRest\n    = \"_\"\n    | alnum\n\n  ident  (an identifier)\n    = name\n\n  terminal\n    = \"\\\"\" terminalChar* \"\\\"\"\n\n  oneCharTerminal\n    = \"\\\"\" terminalChar \"\\\"\"\n\n  terminalChar\n    = escapeChar\n      | ~\"\\\\\" ~\"\\\"\" ~\"\\n\" \"\\u{0}\"..\"\\u{10FFFF}\"\n\n  escapeChar  (an escape sequence)\n    = \"\\\\\\\\\"                                     -- backslash\n    | \"\\\\\\\"\"                                     -- doubleQuote\n    | \"\\\\\\'\"                                     -- singleQuote\n    | \"\\\\b\"                                      -- backspace\n    | \"\\\\n\"                                      -- lineFeed\n    | \"\\\\r\"                                      -- carriageReturn\n    | \"\\\\t\"                                      -- tab\n    | \"\\\\u{\" hexDigit hexDigit? hexDigit?\n             hexDigit? hexDigit? hexDigit? \"}\"   -- unicodeCodePoint\n    | \"\\\\u\" hexDigit hexDigit hexDigit hexDigit  -- unicodeEscape\n    | \"\\\\x\" hexDigit hexDigit                    -- hexEscape\n\n  space\n   += comment\n\n  comment\n    = \"//\" (~\"\\n\" any)* &(\"\\n\" | end)  -- singleLine\n    | \"/*\" (~\"*/\" any)* \"*/\"  -- multiLine\n\n  tokens = token*\n\n  token = caseName | comment | ident | operator | punctuation | terminal | any\n\n  operator = \"<:\" | \"=\" | \":=\" | \"+=\" | \"*\" | \"+\" | \"?\" | \"~\" | \"&\"\n\n  punctuation = \"<\" | \">\" | \",\" | \"--\"\n}"},"Ohm",null,"Grammars",{"Grammars":["define",{"sourceInterval":[9,32]},null,[],["star",{"sourceInterval":[24,32]},["app",{"sourceInterval":[24,31]},"Grammar",[]]]],"Grammar":["define",{"sourceInterval":[36,83]},null,[],["seq",{"sourceInterval":[50,83]},["app",{"sourceInterval":[50,55]},"ident",[]],["opt",{"sourceInterval":[56,69]},["app",{"sourceInterval":[56,68]},"SuperGrammar",[]]],["terminal",{"sourceInterval":[70,73]},"{"],["star",{"sourceInterval":[74,79]},["app",{"sourceInterval":[74,78]},"Rule",[]]],["terminal",{"sourceInterval":[80,83]},"}"]]],"SuperGrammar":["define",{"sourceInterval":[87,116]},null,[],["seq",{"sourceInterval":[106,116]},["terminal",{"sourceInterval":[106,110]},"<:"],["app",{"sourceInterval":[111,116]},"ident",[]]]],"Rule_define":["define",{"sourceInterval":[131,181]},null,[],["seq",{"sourceInterval":[131,170]},["app",{"sourceInterval":[131,136]},"ident",[]],["opt",{"sourceInterval":[137,145]},["app",{"sourceInterval":[137,144]},"Formals",[]]],["opt",{"sourceInterval":[146,156]},["app",{"sourceInterval":[146,155]},"ruleDescr",[]]],["terminal",{"sourceInterval":[157,160]},"="],["app",{"sourceInterval":[162,170]},"RuleBody",[]]]],"Rule_override":["define",{"sourceInterval":[188,248]},null,[],["seq",{"sourceInterval":[188,235]},["app",{"sourceInterval":[188,193]},"ident",[]],["opt",{"sourceInterval":[194,202]},["app",{"sourceInterval":[194,201]},"Formals",[]]],["terminal",{"sourceInterval":[214,218]},":="],["app",{"sourceInterval":[219,235]},"OverrideRuleBody",[]]]],"Rule_extend":["define",{"sourceInterval":[255,305]},null,[],["seq",{"sourceInterval":[255,294]},["app",{"sourceInterval":[255,260]},"ident",[]],["opt",{"sourceInterval":[261,269]},["app",{"sourceInterval":[261,268]},"Formals",[]]],["terminal",{"sourceInterval":[281,285]},"+="],["app",{"sourceInterval":[286,294]},"RuleBody",[]]]],"Rule":["define",{"sourceInterval":[120,305]},null,[],["alt",{"sourceInterval":[131,305]},["app",{"sourceInterval":[131,170]},"Rule_define",[]],["app",{"sourceInterval":[188,235]},"Rule_override",[]],["app",{"sourceInterval":[255,294]},"Rule_extend",[]]]],"RuleBody":["define",{"sourceInterval":[309,362]},null,[],["seq",{"sourceInterval":[324,362]},["opt",{"sourceInterval":[324,328]},["terminal",{"sourceInterval":[324,327]},"|"]],["app",{"sourceInterval":[329,362]},"NonemptyListOf",[["app",{"sourceInterval":[344,356]},"TopLevelTerm",[]],["terminal",{"sourceInterval":[358,361]},"|"]]]]],"TopLevelTerm_inline":["define",{"sourceInterval":[385,408]},null,[],["seq",{"sourceInterval":[385,397]},["app",{"sourceInterval":[385,388]},"Seq",[]],["app",{"sourceInterval":[389,397]},"caseName",[]]]],"TopLevelTerm":["define",{"sourceInterval":[366,418]},null,[],["alt",{"sourceInterval":[385,418]},["app",{"sourceInterval":[385,397]},"TopLevelTerm_inline",[]],["app",{"sourceInterval":[415,418]},"Seq",[]]]],"OverrideRuleBody":["define",{"sourceInterval":[422,491]},null,[],["seq",{"sourceInterval":[445,491]},["opt",{"sourceInterval":[445,449]},["terminal",{"sourceInterval":[445,448]},"|"]],["app",{"sourceInterval":[450,491]},"NonemptyListOf",[["app",{"sourceInterval":[465,485]},"OverrideTopLevelTerm",[]],["terminal",{"sourceInterval":[487,490]},"|"]]]]],"OverrideTopLevelTerm_superSplice":["define",{"sourceInterval":[522,543]},null,[],["terminal",{"sourceInterval":[522,527]},"..."]],"OverrideTopLevelTerm":["define",{"sourceInterval":[495,562]},null,[],["alt",{"sourceInterval":[522,562]},["app",{"sourceInterval":[522,527]},"OverrideTopLevelTerm_superSplice",[]],["app",{"sourceInterval":[550,562]},"TopLevelTerm",[]]]],"Formals":["define",{"sourceInterval":[566,606]},null,[],["seq",{"sourceInterval":[580,606]},["terminal",{"sourceInterval":[580,583]},"<"],["app",{"sourceInterval":[584,602]},"ListOf",[["app",{"sourceInterval":[591,596]},"ident",[]],["terminal",{"sourceInterval":[598,601]},","]]],["terminal",{"sourceInterval":[603,606]},">"]]],"Params":["define",{"sourceInterval":[610,647]},null,[],["seq",{"sourceInterval":[623,647]},["terminal",{"sourceInterval":[623,626]},"<"],["app",{"sourceInterval":[627,643]},"ListOf",[["app",{"sourceInterval":[634,637]},"Seq",[]],["terminal",{"sourceInterval":[639,642]},","]]],["terminal",{"sourceInterval":[644,647]},">"]]],"Alt":["define",{"sourceInterval":[651,685]},null,[],["app",{"sourceInterval":[661,685]},"NonemptyListOf",[["app",{"sourceInterval":[676,679]},"Seq",[]],["terminal",{"sourceInterval":[681,684]},"|"]]]],"Seq":["define",{"sourceInterval":[689,704]},null,[],["star",{"sourceInterval":[699,704]},["app",{"sourceInterval":[699,703]},"Iter",[]]]],"Iter_star":["define",{"sourceInterval":[719,736]},null,[],["seq",{"sourceInterval":[719,727]},["app",{"sourceInterval":[719,723]},"Pred",[]],["terminal",{"sourceInterval":[724,727]},"*"]]],"Iter_plus":["define",{"sourceInterval":[743,760]},null,[],["seq",{"sourceInterval":[743,751]},["app",{"sourceInterval":[743,747]},"Pred",[]],["terminal",{"sourceInterval":[748,751]},"+"]]],"Iter_opt":["define",{"sourceInterval":[767,783]},null,[],["seq",{"sourceInterval":[767,775]},["app",{"sourceInterval":[767,771]},"Pred",[]],["terminal",{"sourceInterval":[772,775]},"?"]]],"Iter":["define",{"sourceInterval":[708,794]},null,[],["alt",{"sourceInterval":[719,794]},["app",{"sourceInterval":[719,727]},"Iter_star",[]],["app",{"sourceInterval":[743,751]},"Iter_plus",[]],["app",{"sourceInterval":[767,775]},"Iter_opt",[]],["app",{"sourceInterval":[790,794]},"Pred",[]]]],"Pred_not":["define",{"sourceInterval":[809,824]},null,[],["seq",{"sourceInterval":[809,816]},["terminal",{"sourceInterval":[809,812]},"~"],["app",{"sourceInterval":[813,816]},"Lex",[]]]],"Pred_lookahead":["define",{"sourceInterval":[831,852]},null,[],["seq",{"sourceInterval":[831,838]},["terminal",{"sourceInterval":[831,834]},"&"],["app",{"sourceInterval":[835,838]},"Lex",[]]]],"Pred":["define",{"sourceInterval":[798,862]},null,[],["alt",{"sourceInterval":[809,862]},["app",{"sourceInterval":[809,816]},"Pred_not",[]],["app",{"sourceInterval":[831,838]},"Pred_lookahead",[]],["app",{"sourceInterval":[859,862]},"Lex",[]]]],"Lex_lex":["define",{"sourceInterval":[876,892]},null,[],["seq",{"sourceInterval":[876,884]},["terminal",{"sourceInterval":[876,879]},"#"],["app",{"sourceInterval":[880,884]},"Base",[]]]],"Lex":["define",{"sourceInterval":[866,903]},null,[],["alt",{"sourceInterval":[876,903]},["app",{"sourceInterval":[876,884]},"Lex_lex",[]],["app",{"sourceInterval":[899,903]},"Base",[]]]],"Base_application":["define",{"sourceInterval":[918,979]},null,[],["seq",{"sourceInterval":[918,963]},["app",{"sourceInterval":[918,923]},"ident",[]],["opt",{"sourceInterval":[924,931]},["app",{"sourceInterval":[924,930]},"Params",[]]],["not",{"sourceInterval":[932,963]},["alt",{"sourceInterval":[934,962]},["seq",{"sourceInterval":[934,948]},["opt",{"sourceInterval":[934,944]},["app",{"sourceInterval":[934,943]},"ruleDescr",[]]],["terminal",{"sourceInterval":[945,948]},"="]],["terminal",{"sourceInterval":[951,955]},":="],["terminal",{"sourceInterval":[958,962]},"+="]]]]],"Base_range":["define",{"sourceInterval":[986,1041]},null,[],["seq",{"sourceInterval":[986,1022]},["app",{"sourceInterval":[986,1001]},"oneCharTerminal",[]],["terminal",{"sourceInterval":[1002,1006]},".."],["app",{"sourceInterval":[1007,1022]},"oneCharTerminal",[]]]],"Base_terminal":["define",{"sourceInterval":[1048,1106]},null,[],["app",{"sourceInterval":[1048,1056]},"terminal",[]]],"Base_paren":["define",{"sourceInterval":[1113,1168]},null,[],["seq",{"sourceInterval":[1113,1124]},["terminal",{"sourceInterval":[1113,1116]},"("],["app",{"sourceInterval":[1117,1120]},"Alt",[]],["terminal",{"sourceInterval":[1121,1124]},")"]]],"Base":["define",{"sourceInterval":[907,1168]},null,[],["alt",{"sourceInterval":[918,1168]},["app",{"sourceInterval":[918,963]},"Base_application",[]],["app",{"sourceInterval":[986,1022]},"Base_range",[]],["app",{"sourceInterval":[1048,1056]},"Base_terminal",[]],["app",{"sourceInterval":[1113,1124]},"Base_paren",[]]]],"ruleDescr":["define",{"sourceInterval":[1172,1231]},"a rule description",[],["seq",{"sourceInterval":[1210,1231]},["terminal",{"sourceInterval":[1210,1213]},"("],["app",{"sourceInterval":[1214,1227]},"ruleDescrText",[]],["terminal",{"sourceInterval":[1228,1231]},")"]]],"ruleDescrText":["define",{"sourceInterval":[1235,1266]},null,[],["star",{"sourceInterval":[1255,1266]},["seq",{"sourceInterval":[1256,1264]},["not",{"sourceInterval":[1256,1260]},["terminal",{"sourceInterval":[1257,1260]},")"]],["app",{"sourceInterval":[1261,1264]},"any",[]]]]],"caseName":["define",{"sourceInterval":[1270,1338]},null,[],["seq",{"sourceInterval":[1285,1338]},["terminal",{"sourceInterval":[1285,1289]},"--"],["star",{"sourceInterval":[1290,1304]},["seq",{"sourceInterval":[1291,1302]},["not",{"sourceInterval":[1291,1296]},["terminal",{"sourceInterval":[1292,1296]},"\n"]],["app",{"sourceInterval":[1297,1302]},"space",[]]]],["app",{"sourceInterval":[1305,1309]},"name",[]],["star",{"sourceInterval":[1310,1324]},["seq",{"sourceInterval":[1311,1322]},["not",{"sourceInterval":[1311,1316]},["terminal",{"sourceInterval":[1312,1316]},"\n"]],["app",{"sourceInterval":[1317,1322]},"space",[]]]],["alt",{"sourceInterval":[1326,1337]},["terminal",{"sourceInterval":[1326,1330]},"\n"],["lookahead",{"sourceInterval":[1333,1337]},["terminal",{"sourceInterval":[1334,1337]},"}"]]]]],"name":["define",{"sourceInterval":[1342,1382]},"a name",[],["seq",{"sourceInterval":[1363,1382]},["app",{"sourceInterval":[1363,1372]},"nameFirst",[]],["star",{"sourceInterval":[1373,1382]},["app",{"sourceInterval":[1373,1381]},"nameRest",[]]]]],"nameFirst":["define",{"sourceInterval":[1386,1418]},null,[],["alt",{"sourceInterval":[1402,1418]},["terminal",{"sourceInterval":[1402,1405]},"_"],["app",{"sourceInterval":[1412,1418]},"letter",[]]]],"nameRest":["define",{"sourceInterval":[1422,1452]},null,[],["alt",{"sourceInterval":[1437,1452]},["terminal",{"sourceInterval":[1437,1440]},"_"],["app",{"sourceInterval":[1447,1452]},"alnum",[]]]],"ident":["define",{"sourceInterval":[1456,1489]},"an identifier",[],["app",{"sourceInterval":[1485,1489]},"name",[]]],"terminal":["define",{"sourceInterval":[1493,1531]},null,[],["seq",{"sourceInterval":[1508,1531]},["terminal",{"sourceInterval":[1508,1512]},"\""],["star",{"sourceInterval":[1513,1526]},["app",{"sourceInterval":[1513,1525]},"terminalChar",[]]],["terminal",{"sourceInterval":[1527,1531]},"\""]]],"oneCharTerminal":["define",{"sourceInterval":[1535,1579]},null,[],["seq",{"sourceInterval":[1557,1579]},["terminal",{"sourceInterval":[1557,1561]},"\""],["app",{"sourceInterval":[1562,1574]},"terminalChar",[]],["terminal",{"sourceInterval":[1575,1579]},"\""]]],"terminalChar":["define",{"sourceInterval":[1583,1660]},null,[],["alt",{"sourceInterval":[1602,1660]},["app",{"sourceInterval":[1602,1612]},"escapeChar",[]],["seq",{"sourceInterval":[1621,1660]},["not",{"sourceInterval":[1621,1626]},["terminal",{"sourceInterval":[1622,1626]},"\\"]],["not",{"sourceInterval":[1627,1632]},["terminal",{"sourceInterval":[1628,1632]},"\""]],["not",{"sourceInterval":[1633,1638]},["terminal",{"sourceInterval":[1634,1638]},"\n"]],["range",{"sourceInterval":[1639,1660]},"\u0000","􏿿"]]]],"escapeChar_backslash":["define",{"sourceInterval":[1703,1758]},null,[],["terminal",{"sourceInterval":[1703,1709]},"\\\\"]],"escapeChar_doubleQuote":["define",{"sourceInterval":[1765,1822]},null,[],["terminal",{"sourceInterval":[1765,1771]},"\\\""]],"escapeChar_singleQuote":["define",{"sourceInterval":[1829,1886]},null,[],["terminal",{"sourceInterval":[1829,1835]},"\\'"]],"escapeChar_backspace":["define",{"sourceInterval":[1893,1948]},null,[],["terminal",{"sourceInterval":[1893,1898]},"\\b"]],"escapeChar_lineFeed":["define",{"sourceInterval":[1955,2009]},null,[],["terminal",{"sourceInterval":[1955,1960]},"\\n"]],"escapeChar_carriageReturn":["define",{"sourceInterval":[2016,2076]},null,[],["terminal",{"sourceInterval":[2016,2021]},"\\r"]],"escapeChar_tab":["define",{"sourceInterval":[2083,2132]},null,[],["terminal",{"sourceInterval":[2083,2088]},"\\t"]],"escapeChar_unicodeCodePoint":["define",{"sourceInterval":[2139,2243]},null,[],["seq",{"sourceInterval":[2139,2221]},["terminal",{"sourceInterval":[2139,2145]},"\\u{"],["app",{"sourceInterval":[2146,2154]},"hexDigit",[]],["opt",{"sourceInterval":[2155,2164]},["app",{"sourceInterval":[2155,2163]},"hexDigit",[]]],["opt",{"sourceInterval":[2165,2174]},["app",{"sourceInterval":[2165,2173]},"hexDigit",[]]],["opt",{"sourceInterval":[2188,2197]},["app",{"sourceInterval":[2188,2196]},"hexDigit",[]]],["opt",{"sourceInterval":[2198,2207]},["app",{"sourceInterval":[2198,2206]},"hexDigit",[]]],["opt",{"sourceInterval":[2208,2217]},["app",{"sourceInterval":[2208,2216]},"hexDigit",[]]],["terminal",{"sourceInterval":[2218,2221]},"}"]]],"escapeChar_unicodeEscape":["define",{"sourceInterval":[2250,2309]},null,[],["seq",{"sourceInterval":[2250,2291]},["terminal",{"sourceInterval":[2250,2255]},"\\u"],["app",{"sourceInterval":[2256,2264]},"hexDigit",[]],["app",{"sourceInterval":[2265,2273]},"hexDigit",[]],["app",{"sourceInterval":[2274,2282]},"hexDigit",[]],["app",{"sourceInterval":[2283,2291]},"hexDigit",[]]]],"escapeChar_hexEscape":["define",{"sourceInterval":[2316,2371]},null,[],["seq",{"sourceInterval":[2316,2339]},["terminal",{"sourceInterval":[2316,2321]},"\\x"],["app",{"sourceInterval":[2322,2330]},"hexDigit",[]],["app",{"sourceInterval":[2331,2339]},"hexDigit",[]]]],"escapeChar":["define",{"sourceInterval":[1664,2371]},"an escape sequence",[],["alt",{"sourceInterval":[1703,2371]},["app",{"sourceInterval":[1703,1709]},"escapeChar_backslash",[]],["app",{"sourceInterval":[1765,1771]},"escapeChar_doubleQuote",[]],["app",{"sourceInterval":[1829,1835]},"escapeChar_singleQuote",[]],["app",{"sourceInterval":[1893,1898]},"escapeChar_backspace",[]],["app",{"sourceInterval":[1955,1960]},"escapeChar_lineFeed",[]],["app",{"sourceInterval":[2016,2021]},"escapeChar_carriageReturn",[]],["app",{"sourceInterval":[2083,2088]},"escapeChar_tab",[]],["app",{"sourceInterval":[2139,2221]},"escapeChar_unicodeCodePoint",[]],["app",{"sourceInterval":[2250,2291]},"escapeChar_unicodeEscape",[]],["app",{"sourceInterval":[2316,2339]},"escapeChar_hexEscape",[]]]],"space":["extend",{"sourceInterval":[2375,2394]},null,[],["app",{"sourceInterval":[2387,2394]},"comment",[]]],"comment_singleLine":["define",{"sourceInterval":[2412,2458]},null,[],["seq",{"sourceInterval":[2412,2443]},["terminal",{"sourceInterval":[2412,2416]},"//"],["star",{"sourceInterval":[2417,2429]},["seq",{"sourceInterval":[2418,2427]},["not",{"sourceInterval":[2418,2423]},["terminal",{"sourceInterval":[2419,2423]},"\n"]],["app",{"sourceInterval":[2424,2427]},"any",[]]]],["lookahead",{"sourceInterval":[2430,2443]},["alt",{"sourceInterval":[2432,2442]},["terminal",{"sourceInterval":[2432,2436]},"\n"],["app",{"sourceInterval":[2439,2442]},"end",[]]]]]],"comment_multiLine":["define",{"sourceInterval":[2465,2501]},null,[],["seq",{"sourceInterval":[2465,2487]},["terminal",{"sourceInterval":[2465,2469]},"/*"],["star",{"sourceInterval":[2470,2482]},["seq",{"sourceInterval":[2471,2480]},["not",{"sourceInterval":[2471,2476]},["terminal",{"sourceInterval":[2472,2476]},"*/"]],["app",{"sourceInterval":[2477,2480]},"any",[]]]],["terminal",{"sourceInterval":[2483,2487]},"*/"]]],"comment":["define",{"sourceInterval":[2398,2501]},null,[],["alt",{"sourceInterval":[2412,2501]},["app",{"sourceInterval":[2412,2443]},"comment_singleLine",[]],["app",{"sourceInterval":[2465,2487]},"comment_multiLine",[]]]],"tokens":["define",{"sourceInterval":[2505,2520]},null,[],["star",{"sourceInterval":[2514,2520]},["app",{"sourceInterval":[2514,2519]},"token",[]]]],"token":["define",{"sourceInterval":[2524,2600]},null,[],["alt",{"sourceInterval":[2532,2600]},["app",{"sourceInterval":[2532,2540]},"caseName",[]],["app",{"sourceInterval":[2543,2550]},"comment",[]],["app",{"sourceInterval":[2553,2558]},"ident",[]],["app",{"sourceInterval":[2561,2569]},"operator",[]],["app",{"sourceInterval":[2572,2583]},"punctuation",[]],["app",{"sourceInterval":[2586,2594]},"terminal",[]],["app",{"sourceInterval":[2597,2600]},"any",[]]]],"operator":["define",{"sourceInterval":[2604,2669]},null,[],["alt",{"sourceInterval":[2615,2669]},["terminal",{"sourceInterval":[2615,2619]},"<:"],["terminal",{"sourceInterval":[2622,2625]},"="],["terminal",{"sourceInterval":[2628,2632]},":="],["terminal",{"sourceInterval":[2635,2639]},"+="],["terminal",{"sourceInterval":[2642,2645]},"*"],["terminal",{"sourceInterval":[2648,2651]},"+"],["terminal",{"sourceInterval":[2654,2657]},"?"],["terminal",{"sourceInterval":[2660,2663]},"~"],["terminal",{"sourceInterval":[2666,2669]},"&"]]],"punctuation":["define",{"sourceInterval":[2673,2709]},null,[],["alt",{"sourceInterval":[2687,2709]},["terminal",{"sourceInterval":[2687,2690]},"<"],["terminal",{"sourceInterval":[2693,2696]},">"],["terminal",{"sourceInterval":[2699,2702]},","],["terminal",{"sourceInterval":[2705,2709]},"--"]]]}]);

  const superSplicePlaceholder = Object.create(PExpr.prototype);

  function namespaceHas(ns, name) {
    // Look for an enumerable property, anywhere in the prototype chain.
    for (const prop in ns) {
      if (prop === name) return true;
    }
    return false;
  }

  // Returns a Grammar instance (i.e., an object with a `match` method) for
  // `tree`, which is the concrete syntax tree of a user-written grammar.
  // The grammar will be assigned into `namespace` under the name of the grammar
  // as specified in the source.
  function buildGrammar(match, namespace, optOhmGrammarForTesting) {
    const builder = new Builder();
    let decl;
    let currentRuleName;
    let currentRuleFormals;
    let overriding = false;
    const metaGrammar = optOhmGrammarForTesting || ohmGrammar;

    // A visitor that produces a Grammar instance from the CST.
    const helpers = metaGrammar.createSemantics().addOperation('visit', {
      Grammars(grammarIter) {
        return grammarIter.children.map(c => c.visit());
      },
      Grammar(id, s, _open, rules, _close) {
        const grammarName = id.visit();
        decl = builder.newGrammar(grammarName);
        s.child(0) && s.child(0).visit();
        rules.children.map(c => c.visit());
        const g = decl.build();
        g.source = this.source.trimmed();
        if (namespaceHas(namespace, grammarName)) {
          throw duplicateGrammarDeclaration(g);
        }
        namespace[grammarName] = g;
        return g;
      },

      SuperGrammar(_, n) {
        const superGrammarName = n.visit();
        if (superGrammarName === 'null') {
          decl.withSuperGrammar(null);
        } else {
          if (!namespace || !namespaceHas(namespace, superGrammarName)) {
            throw undeclaredGrammar(superGrammarName, namespace, n.source);
          }
          decl.withSuperGrammar(namespace[superGrammarName]);
        }
      },

      Rule_define(n, fs, d, _, b) {
        currentRuleName = n.visit();
        currentRuleFormals = fs.children.map(c => c.visit())[0] || [];
        // If there is no default start rule yet, set it now. This must be done before visiting
        // the body, because it might contain an inline rule definition.
        if (!decl.defaultStartRule && decl.ensureSuperGrammar() !== Grammar.ProtoBuiltInRules) {
          decl.withDefaultStartRule(currentRuleName);
        }
        const body = b.visit();
        const description = d.children.map(c => c.visit())[0];
        const source = this.source.trimmed();
        return decl.define(currentRuleName, currentRuleFormals, body, description, source);
      },
      Rule_override(n, fs, _, b) {
        currentRuleName = n.visit();
        currentRuleFormals = fs.children.map(c => c.visit())[0] || [];

        const source = this.source.trimmed();
        decl.ensureSuperGrammarRuleForOverriding(currentRuleName, source);

        overriding = true;
        const body = b.visit();
        overriding = false;
        return decl.override(currentRuleName, currentRuleFormals, body, null, source);
      },
      Rule_extend(n, fs, _, b) {
        currentRuleName = n.visit();
        currentRuleFormals = fs.children.map(c => c.visit())[0] || [];
        const body = b.visit();
        const source = this.source.trimmed();
        return decl.extend(currentRuleName, currentRuleFormals, body, null, source);
      },
      RuleBody(_, terms) {
        return builder.alt(...terms.visit()).withSource(this.source);
      },
      OverrideRuleBody(_, terms) {
        const args = terms.visit();

        // Check if the super-splice operator (`...`) appears in the terms.
        const expansionPos = args.indexOf(superSplicePlaceholder);
        if (expansionPos >= 0) {
          const beforeTerms = args.slice(0, expansionPos);
          const afterTerms = args.slice(expansionPos + 1);

          // Ensure it appears no more than once.
          afterTerms.forEach(t => {
            if (t === superSplicePlaceholder) throw multipleSuperSplices(t);
          });

          return new Splice(
              decl.superGrammar,
              currentRuleName,
              beforeTerms,
              afterTerms,
          ).withSource(this.source);
        } else {
          return builder.alt(...args).withSource(this.source);
        }
      },
      Formals(opointy, fs, cpointy) {
        return fs.visit();
      },

      Params(opointy, ps, cpointy) {
        return ps.visit();
      },

      Alt(seqs) {
        return builder.alt(...seqs.visit()).withSource(this.source);
      },

      TopLevelTerm_inline(b, n) {
        const inlineRuleName = currentRuleName + '_' + n.visit();
        const body = b.visit();
        const source = this.source.trimmed();
        const isNewRuleDeclaration = !(
          decl.superGrammar && decl.superGrammar.rules[inlineRuleName]
        );
        if (overriding && !isNewRuleDeclaration) {
          decl.override(inlineRuleName, currentRuleFormals, body, null, source);
        } else {
          decl.define(inlineRuleName, currentRuleFormals, body, null, source);
        }
        const params = currentRuleFormals.map(formal => builder.app(formal));
        return builder.app(inlineRuleName, params).withSource(body.source);
      },
      OverrideTopLevelTerm_superSplice(_) {
        return superSplicePlaceholder;
      },

      Seq(expr) {
        return builder.seq(...expr.children.map(c => c.visit())).withSource(this.source);
      },

      Iter_star(x, _) {
        return builder.star(x.visit()).withSource(this.source);
      },
      Iter_plus(x, _) {
        return builder.plus(x.visit()).withSource(this.source);
      },
      Iter_opt(x, _) {
        return builder.opt(x.visit()).withSource(this.source);
      },

      Pred_not(_, x) {
        return builder.not(x.visit()).withSource(this.source);
      },
      Pred_lookahead(_, x) {
        return builder.lookahead(x.visit()).withSource(this.source);
      },

      Lex_lex(_, x) {
        return builder.lex(x.visit()).withSource(this.source);
      },

      Base_application(rule, ps) {
        const params = ps.children.map(c => c.visit())[0] || [];
        return builder.app(rule.visit(), params).withSource(this.source);
      },
      Base_range(from, _, to) {
        return builder.range(from.visit(), to.visit()).withSource(this.source);
      },
      Base_terminal(expr) {
        return builder.terminal(expr.visit()).withSource(this.source);
      },
      Base_paren(open, x, close) {
        return x.visit();
      },

      ruleDescr(open, t, close) {
        return t.visit();
      },
      ruleDescrText(_) {
        return this.sourceString.trim();
      },

      caseName(_, space1, n, space2, end) {
        return n.visit();
      },

      name(first, rest) {
        return this.sourceString;
      },
      nameFirst(expr) {},
      nameRest(expr) {},

      terminal(open, cs, close) {
        return cs.children.map(c => c.visit()).join('');
      },

      oneCharTerminal(open, c, close) {
        return c.visit();
      },

      escapeChar(c) {
        try {
          return unescapeCodePoint(this.sourceString);
        } catch (err) {
          if (err instanceof RangeError && err.message.startsWith('Invalid code point ')) {
            throw invalidCodePoint(c);
          }
          throw err; // Rethrow
        }
      },

      NonemptyListOf(x, _, xs) {
        return [x.visit()].concat(xs.children.map(c => c.visit()));
      },
      EmptyListOf() {
        return [];
      },

      _terminal() {
        return this.sourceString;
      },
    });
    return helpers(match).visit();
  }

  var operationsAndAttributesGrammar = makeRecipe(["grammar",{"source":"OperationsAndAttributes {\n\n  AttributeSignature =\n    name\n\n  OperationSignature =\n    name Formals?\n\n  Formals\n    = \"(\" ListOf<name, \",\"> \")\"\n\n  name  (a name)\n    = nameFirst nameRest*\n\n  nameFirst\n    = \"_\"\n    | letter\n\n  nameRest\n    = \"_\"\n    | alnum\n\n}"},"OperationsAndAttributes",null,"AttributeSignature",{"AttributeSignature":["define",{"sourceInterval":[29,58]},null,[],["app",{"sourceInterval":[54,58]},"name",[]]],"OperationSignature":["define",{"sourceInterval":[62,100]},null,[],["seq",{"sourceInterval":[87,100]},["app",{"sourceInterval":[87,91]},"name",[]],["opt",{"sourceInterval":[92,100]},["app",{"sourceInterval":[92,99]},"Formals",[]]]]],"Formals":["define",{"sourceInterval":[104,143]},null,[],["seq",{"sourceInterval":[118,143]},["terminal",{"sourceInterval":[118,121]},"("],["app",{"sourceInterval":[122,139]},"ListOf",[["app",{"sourceInterval":[129,133]},"name",[]],["terminal",{"sourceInterval":[135,138]},","]]],["terminal",{"sourceInterval":[140,143]},")"]]],"name":["define",{"sourceInterval":[147,187]},"a name",[],["seq",{"sourceInterval":[168,187]},["app",{"sourceInterval":[168,177]},"nameFirst",[]],["star",{"sourceInterval":[178,187]},["app",{"sourceInterval":[178,186]},"nameRest",[]]]]],"nameFirst":["define",{"sourceInterval":[191,223]},null,[],["alt",{"sourceInterval":[207,223]},["terminal",{"sourceInterval":[207,210]},"_"],["app",{"sourceInterval":[217,223]},"letter",[]]]],"nameRest":["define",{"sourceInterval":[227,257]},null,[],["alt",{"sourceInterval":[242,257]},["terminal",{"sourceInterval":[242,245]},"_"],["app",{"sourceInterval":[252,257]},"alnum",[]]]]}]);

  initBuiltInSemantics(Grammar.BuiltInRules);
  initPrototypeParser(operationsAndAttributesGrammar); // requires BuiltInSemantics

  function initBuiltInSemantics(builtInRules) {
    const actions = {
      empty() {
        return this.iteration();
      },
      nonEmpty(first, _, rest) {
        return this.iteration([first].concat(rest.children));
      },
    };

    Semantics.BuiltInSemantics = Semantics.createSemantics(builtInRules, null).addOperation(
        'asIteration',
        {
          emptyListOf: actions.empty,
          nonemptyListOf: actions.nonEmpty,
          EmptyListOf: actions.empty,
          NonemptyListOf: actions.nonEmpty,
        },
    );
  }

  function initPrototypeParser(grammar) {
    Semantics.prototypeGrammarSemantics = grammar.createSemantics().addOperation('parse', {
      AttributeSignature(name) {
        return {
          name: name.parse(),
          formals: [],
        };
      },
      OperationSignature(name, optFormals) {
        return {
          name: name.parse(),
          formals: optFormals.children.map(c => c.parse())[0] || [],
        };
      },
      Formals(oparen, fs, cparen) {
        return fs.asIteration().children.map(c => c.parse());
      },
      name(first, rest) {
        return this.sourceString;
      },
    });
    Semantics.prototypeGrammar = grammar;
  }

  function findIndentation(input) {
    let pos = 0;
    const stack = [0];
    const topOfStack = () => stack[stack.length - 1];

    const result = {};

    const regex = /( *).*(?:$|\r?\n|\r)/g;
    let match;
    while ((match = regex.exec(input)) != null) {
      const [line, indent] = match;

      // The last match will always have length 0. In every other case, some
      // characters will be matched (possibly only the end of line chars).
      if (line.length === 0) break;

      const indentSize = indent.length;
      const prevSize = topOfStack();

      const indentPos = pos + indentSize;

      if (indentSize > prevSize) {
        // Indent -- always only 1.
        stack.push(indentSize);
        result[indentPos] = 1;
      } else if (indentSize < prevSize) {
        // Dedent -- can be multiple levels.
        const prevLength = stack.length;
        while (topOfStack() !== indentSize) {
          stack.pop();
        }
        result[indentPos] = -1 * (prevLength - stack.length);
      }
      pos += line.length;
    }
    // Ensure that there is a matching DEDENT for every remaining INDENT.
    if (stack.length > 1) {
      result[pos] = 1 - stack.length;
    }
    return result;
  }

  const INDENT_DESCRIPTION = 'an indented block';
  const DEDENT_DESCRIPTION = 'a dedent';

  // A sentinel value that is out of range for both charCodeAt() and codePointAt().
  const INVALID_CODE_POINT = 0x10ffff + 1;

  class InputStreamWithIndentation extends InputStream {
    constructor(state) {
      super(state.input);
      this.state = state;
    }

    _indentationAt(pos) {
      return this.state.userData[pos] || 0;
    }

    atEnd() {
      return super.atEnd() && this._indentationAt(this.pos) === 0;
    }

    next() {
      if (this._indentationAt(this.pos) !== 0) {
        this.examinedLength = Math.max(this.examinedLength, this.pos);
        return undefined;
      }
      return super.next();
    }

    nextCharCode() {
      if (this._indentationAt(this.pos) !== 0) {
        this.examinedLength = Math.max(this.examinedLength, this.pos);
        return INVALID_CODE_POINT;
      }
      return super.nextCharCode();
    }

    nextCodePoint() {
      if (this._indentationAt(this.pos) !== 0) {
        this.examinedLength = Math.max(this.examinedLength, this.pos);
        return INVALID_CODE_POINT;
      }
      return super.nextCodePoint();
    }
  }

  class Indentation extends PExpr {
    constructor(isIndent = true) {
      super();
      this.isIndent = isIndent;
    }

    allowsSkippingPrecedingSpace() {
      return true;
    }

    eval(state) {
      const {inputStream} = state;
      const pseudoTokens = state.userData;
      state.doNotMemoize = true;

      const origPos = inputStream.pos;

      const sign = this.isIndent ? 1 : -1;
      const count = (pseudoTokens[origPos] || 0) * sign;
      if (count > 0) {
        // Update the count to consume the pseudotoken.
        state.userData = Object.create(pseudoTokens);
        state.userData[origPos] -= sign;

        state.pushBinding(new TerminalNode(0), origPos);
        return true;
      } else {
        state.processFailure(origPos, this);
        return false;
      }
    }

    getArity() {
      return 1;
    }

    _assertAllApplicationsAreValid(ruleName, grammar) {}

    _isNullable(grammar, memo) {
      return false;
    }

    assertChoicesHaveUniformArity(ruleName) {}

    assertIteratedExprsAreNotNullable(grammar) {}

    introduceParams(formals) {
      return this;
    }

    substituteParams(actuals) {
      return this;
    }

    toString() {
      return this.isIndent ? 'indent' : 'dedent';
    }

    toDisplayString() {
      return this.toString();
    }

    toFailure(grammar) {
      const description = this.isIndent ? INDENT_DESCRIPTION : DEDENT_DESCRIPTION;
      return new Failure(this, description, 'description');
    }
  }

  // Create a new definition for `any` that can consume indent & dedent.
  const applyIndent = new Apply('indent');
  const applyDedent = new Apply('dedent');
  const newAnyBody = new Splice(BuiltInRules, 'any', [applyIndent, applyDedent], []);

  const IndentationSensitive = new Builder()
      .newGrammar('IndentationSensitive')
      .withSuperGrammar(BuiltInRules)
      .define('indent', [], new Indentation(true), INDENT_DESCRIPTION, undefined, true)
      .define('dedent', [], new Indentation(false), DEDENT_DESCRIPTION, undefined, true)
      .extend('any', [], newAnyBody, 'any character', undefined)
      .build();

  Object.assign(IndentationSensitive, {
    _matchStateInitializer(state) {
      state.userData = findIndentation(state.input);
      state.inputStream = new InputStreamWithIndentation(state);
    },
    supportsIncrementalParsing: false,
  });

  // Generated by scripts/prebuild.js
  const version = '17.1.0';

  Grammar.initApplicationParser(ohmGrammar, buildGrammar);

  const isBuffer = obj =>
    !!obj.constructor &&
    typeof obj.constructor.isBuffer === 'function' &&
    obj.constructor.isBuffer(obj);

  function compileAndLoad(source, namespace) {
    const m = ohmGrammar.match(source, 'Grammars');
    if (m.failed()) {
      throw grammarSyntaxError(m);
    }
    return buildGrammar(m, namespace);
  }

  function grammar(source, optNamespace) {
    const ns = grammars(source, optNamespace);

    // Ensure that the source contained no more than one grammar definition.
    const grammarNames = Object.keys(ns);
    if (grammarNames.length === 0) {
      throw new Error('Missing grammar definition');
    } else if (grammarNames.length > 1) {
      const secondGrammar = ns[grammarNames[1]];
      const interval = secondGrammar.source;
      throw new Error(
          getLineAndColumnMessage(interval.sourceString, interval.startIdx) +
          'Found more than one grammar definition -- use ohm.grammars() instead.',
      );
    }
    return ns[grammarNames[0]]; // Return the one and only grammar.
  }

  function grammars(source, optNamespace) {
    const ns = Object.create(optNamespace || {});
    if (typeof source !== 'string') {
      // For convenience, detect Node.js Buffer objects and automatically call toString().
      if (isBuffer(source)) {
        source = source.toString();
      } else {
        throw new TypeError(
            'Expected string as first argument, got ' + unexpectedObjToString(source),
        );
      }
    }
    compileAndLoad(source, ns);
    return ns;
  }

  exports.ExperimentalIndentationSensitive = IndentationSensitive;
  exports._buildGrammar = buildGrammar;
  exports.grammar = grammar;
  exports.grammars = grammars;
  exports.makeRecipe = makeRecipe;
  exports.ohmGrammar = ohmGrammar;
  exports.pexprs = pexprs;
  exports.version = version;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2htLmpzIiwic291cmNlcyI6WyIuLi9zcmMvY29tbW9uLmpzIiwiLi4vc3JjL1VuaWNvZGVDYXRlZ29yaWVzLmpzIiwiLi4vc3JjL3BleHBycy1tYWluLmpzIiwiLi4vc3JjL2Vycm9ycy5qcyIsIi4uL3NyYy91dGlsLmpzIiwiLi4vc3JjL0ludGVydmFsLmpzIiwiLi4vc3JjL0lucHV0U3RyZWFtLmpzIiwiLi4vc3JjL01hdGNoUmVzdWx0LmpzIiwiLi4vc3JjL1Bvc0luZm8uanMiLCIuLi9zcmMvVHJhY2UuanMiLCIuLi9zcmMvcGV4cHJzLWFsbG93c1NraXBwaW5nUHJlY2VkaW5nU3BhY2UuanMiLCIuLi9zcmMvcGV4cHJzLWFzc2VydEFsbEFwcGxpY2F0aW9uc0FyZVZhbGlkLmpzIiwiLi4vc3JjL3BleHBycy1hc3NlcnRDaG9pY2VzSGF2ZVVuaWZvcm1Bcml0eS5qcyIsIi4uL3NyYy9wZXhwcnMtYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlLmpzIiwiLi4vc3JjL25vZGVzLmpzIiwiLi4vc3JjL3BleHBycy1ldmFsLmpzIiwiLi4vc3JjL3BleHBycy1nZXRBcml0eS5qcyIsIi4uL3NyYy9wZXhwcnMtb3V0cHV0UmVjaXBlLmpzIiwiLi4vc3JjL3BleHBycy1pbnRyb2R1Y2VQYXJhbXMuanMiLCIuLi9zcmMvcGV4cHJzLWlzTnVsbGFibGUuanMiLCIuLi9zcmMvcGV4cHJzLXN1YnN0aXR1dGVQYXJhbXMuanMiLCIuLi9zcmMvcGV4cHJzLXRvQXJndW1lbnROYW1lTGlzdC5qcyIsIi4uL3NyYy9wZXhwcnMtdG9EaXNwbGF5U3RyaW5nLmpzIiwiLi4vc3JjL0ZhaWx1cmUuanMiLCIuLi9zcmMvcGV4cHJzLXRvRmFpbHVyZS5qcyIsIi4uL3NyYy9wZXhwcnMtdG9TdHJpbmcuanMiLCIuLi9zcmMvQ2FzZUluc2Vuc2l0aXZlVGVybWluYWwuanMiLCIuLi9zcmMvcGV4cHJzLmpzIiwiLi4vc3JjL01hdGNoU3RhdGUuanMiLCIuLi9zcmMvTWF0Y2hlci5qcyIsIi4uL3NyYy9TZW1hbnRpY3MuanMiLCIuLi9zcmMvR3JhbW1hci5qcyIsIi4uL3NyYy9HcmFtbWFyRGVjbC5qcyIsIi4uL3NyYy9CdWlsZGVyLmpzIiwiLi4vc3JjL21ha2VSZWNpcGUuanMiLCJidWlsdC1pbi1ydWxlcy5qcyIsIi4uL3NyYy9tYWluLWtlcm5lbC5qcyIsIm9obS1ncmFtbWFyLmpzIiwiLi4vc3JjL2J1aWxkR3JhbW1hci5qcyIsIm9wZXJhdGlvbnMtYW5kLWF0dHJpYnV0ZXMuanMiLCIuLi9zcmMvc2VtYW50aWNzRGVmZXJyZWRJbml0LmpzIiwiLi4vc3JjL2ZpbmRJbmRlbnRhdGlvbi5qcyIsIi4uL3NyYy9JbmRlbnRhdGlvblNlbnNpdGl2ZS5qcyIsIi4uL3NyYy92ZXJzaW9uLmpzIiwiLi4vc3JjL21haW4uanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFByaXZhdGUgU3R1ZmZcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIEhlbHBlcnNcblxuY29uc3QgZXNjYXBlU3RyaW5nRm9yID0ge307XG5mb3IgKGxldCBjID0gMDsgYyA8IDEyODsgYysrKSB7XG4gIGVzY2FwZVN0cmluZ0ZvcltjXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoYyk7XG59XG5lc2NhcGVTdHJpbmdGb3JbXCInXCIuY2hhckNvZGVBdCgwKV0gPSBcIlxcXFwnXCI7XG5lc2NhcGVTdHJpbmdGb3JbJ1wiJy5jaGFyQ29kZUF0KDApXSA9ICdcXFxcXCInO1xuZXNjYXBlU3RyaW5nRm9yWydcXFxcJy5jaGFyQ29kZUF0KDApXSA9ICdcXFxcXFxcXCc7XG5lc2NhcGVTdHJpbmdGb3JbJ1xcYicuY2hhckNvZGVBdCgwKV0gPSAnXFxcXGInO1xuZXNjYXBlU3RyaW5nRm9yWydcXGYnLmNoYXJDb2RlQXQoMCldID0gJ1xcXFxmJztcbmVzY2FwZVN0cmluZ0ZvclsnXFxuJy5jaGFyQ29kZUF0KDApXSA9ICdcXFxcbic7XG5lc2NhcGVTdHJpbmdGb3JbJ1xccicuY2hhckNvZGVBdCgwKV0gPSAnXFxcXHInO1xuZXNjYXBlU3RyaW5nRm9yWydcXHQnLmNoYXJDb2RlQXQoMCldID0gJ1xcXFx0JztcbmVzY2FwZVN0cmluZ0ZvclsnXFx1MDAwYicuY2hhckNvZGVBdCgwKV0gPSAnXFxcXHYnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gRXhwb3J0c1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGZ1bmN0aW9uIGFic3RyYWN0KG9wdE1ldGhvZE5hbWUpIHtcbiAgY29uc3QgbWV0aG9kTmFtZSA9IG9wdE1ldGhvZE5hbWUgfHwgJyc7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICd0aGlzIG1ldGhvZCAnICtcbiAgICAgICAgbWV0aG9kTmFtZSArXG4gICAgICAgICcgaXMgYWJzdHJhY3QhICcgK1xuICAgICAgICAnKGl0IGhhcyBubyBpbXBsZW1lbnRhdGlvbiBpbiBjbGFzcyAnICtcbiAgICAgICAgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lICtcbiAgICAgICAgJyknLFxuICAgICk7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnQoY29uZCwgbWVzc2FnZSkge1xuICBpZiAoIWNvbmQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSB8fCAnQXNzZXJ0aW9uIGZhaWxlZCcpO1xuICB9XG59XG5cbi8vIERlZmluZSBhIGxhemlseS1jb21wdXRlZCwgbm9uLWVudW1lcmFibGUgcHJvcGVydHkgbmFtZWQgYHByb3BOYW1lYFxuLy8gb24gdGhlIG9iamVjdCBgb2JqYC4gYGdldHRlckZuYCB3aWxsIGJlIGNhbGxlZCB0byBjb21wdXRlIHRoZSB2YWx1ZSB0aGVcbi8vIGZpcnN0IHRpbWUgdGhlIHByb3BlcnR5IGlzIGFjY2Vzc2VkLlxuZXhwb3J0IGZ1bmN0aW9uIGRlZmluZUxhenlQcm9wZXJ0eShvYmosIHByb3BOYW1lLCBnZXR0ZXJGbikge1xuICBsZXQgbWVtbztcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwgcHJvcE5hbWUsIHtcbiAgICBnZXQoKSB7XG4gICAgICBpZiAoIW1lbW8pIHtcbiAgICAgICAgbWVtbyA9IGdldHRlckZuLmNhbGwodGhpcyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVtbztcbiAgICB9LFxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsb25lKG9iaikge1xuICBpZiAob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIG9iaik7XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlcGVhdEZuKGZuLCBuKSB7XG4gIGNvbnN0IGFyciA9IFtdO1xuICB3aGlsZSAobi0tID4gMCkge1xuICAgIGFyci5wdXNoKGZuKCkpO1xuICB9XG4gIHJldHVybiBhcnI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXBlYXRTdHIoc3RyLCBuKSB7XG4gIHJldHVybiBuZXcgQXJyYXkobiArIDEpLmpvaW4oc3RyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlcGVhdCh4LCBuKSB7XG4gIHJldHVybiByZXBlYXRGbigoKSA9PiB4LCBuKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldER1cGxpY2F0ZXMoYXJyYXkpIHtcbiAgY29uc3QgZHVwbGljYXRlcyA9IFtdO1xuICBmb3IgKGxldCBpZHggPSAwOyBpZHggPCBhcnJheS5sZW5ndGg7IGlkeCsrKSB7XG4gICAgY29uc3QgeCA9IGFycmF5W2lkeF07XG4gICAgaWYgKGFycmF5Lmxhc3RJbmRleE9mKHgpICE9PSBpZHggJiYgZHVwbGljYXRlcy5pbmRleE9mKHgpIDwgMCkge1xuICAgICAgZHVwbGljYXRlcy5wdXNoKHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZHVwbGljYXRlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvcHlXaXRob3V0RHVwbGljYXRlcyhhcnJheSkge1xuICBjb25zdCBub0R1cGxpY2F0ZXMgPSBbXTtcbiAgYXJyYXkuZm9yRWFjaChlbnRyeSA9PiB7XG4gICAgaWYgKG5vRHVwbGljYXRlcy5pbmRleE9mKGVudHJ5KSA8IDApIHtcbiAgICAgIG5vRHVwbGljYXRlcy5wdXNoKGVudHJ5KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gbm9EdXBsaWNhdGVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNTeW50YWN0aWMocnVsZU5hbWUpIHtcbiAgY29uc3QgZmlyc3RDaGFyID0gcnVsZU5hbWVbMF07XG4gIHJldHVybiBmaXJzdENoYXIgPT09IGZpcnN0Q2hhci50b1VwcGVyQ2FzZSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNMZXhpY2FsKHJ1bGVOYW1lKSB7XG4gIHJldHVybiAhaXNTeW50YWN0aWMocnVsZU5hbWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFkTGVmdChzdHIsIGxlbiwgb3B0Q2hhcikge1xuICBjb25zdCBjaCA9IG9wdENoYXIgfHwgJyAnO1xuICBpZiAoc3RyLmxlbmd0aCA8IGxlbikge1xuICAgIHJldHVybiByZXBlYXRTdHIoY2gsIGxlbiAtIHN0ci5sZW5ndGgpICsgc3RyO1xuICB9XG4gIHJldHVybiBzdHI7XG59XG5cbi8vIFN0cmluZ0J1ZmZlclxuXG5leHBvcnQgZnVuY3Rpb24gU3RyaW5nQnVmZmVyKCkge1xuICB0aGlzLnN0cmluZ3MgPSBbXTtcbn1cblxuU3RyaW5nQnVmZmVyLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihzdHIpIHtcbiAgdGhpcy5zdHJpbmdzLnB1c2goc3RyKTtcbn07XG5cblN0cmluZ0J1ZmZlci5wcm90b3R5cGUuY29udGVudHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuc3RyaW5ncy5qb2luKCcnKTtcbn07XG5cbmNvbnN0IGVzY2FwZVVuaWNvZGUgPSBzdHIgPT4gU3RyaW5nLmZyb21Db2RlUG9pbnQocGFyc2VJbnQoc3RyLCAxNikpO1xuXG5leHBvcnQgZnVuY3Rpb24gdW5lc2NhcGVDb2RlUG9pbnQocykge1xuICBpZiAocy5jaGFyQXQoMCkgPT09ICdcXFxcJykge1xuICAgIHN3aXRjaCAocy5jaGFyQXQoMSkpIHtcbiAgICAgIGNhc2UgJ2InOlxuICAgICAgICByZXR1cm4gJ1xcYic7XG4gICAgICBjYXNlICdmJzpcbiAgICAgICAgcmV0dXJuICdcXGYnO1xuICAgICAgY2FzZSAnbic6XG4gICAgICAgIHJldHVybiAnXFxuJztcbiAgICAgIGNhc2UgJ3InOlxuICAgICAgICByZXR1cm4gJ1xccic7XG4gICAgICBjYXNlICd0JzpcbiAgICAgICAgcmV0dXJuICdcXHQnO1xuICAgICAgY2FzZSAndic6XG4gICAgICAgIHJldHVybiAnXFx2JztcbiAgICAgIGNhc2UgJ3gnOlxuICAgICAgICByZXR1cm4gZXNjYXBlVW5pY29kZShzLnNsaWNlKDIsIDQpKTtcbiAgICAgIGNhc2UgJ3UnOlxuICAgICAgICByZXR1cm4gcy5jaGFyQXQoMikgPT09ICd7JyA/XG4gICAgICAgICAgZXNjYXBlVW5pY29kZShzLnNsaWNlKDMsIC0xKSkgOlxuICAgICAgICAgIGVzY2FwZVVuaWNvZGUocy5zbGljZSgyLCA2KSk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gcy5jaGFyQXQoMSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBzO1xuICB9XG59XG5cbi8vIEhlbHBlciBmb3IgcHJvZHVjaW5nIGEgZGVzY3JpcHRpb24gb2YgYW4gdW5rbm93biBvYmplY3QgaW4gYSBzYWZlIHdheS5cbi8vIEVzcGVjaWFsbHkgdXNlZnVsIGZvciBlcnJvciBtZXNzYWdlcyB3aGVyZSBhbiB1bmV4cGVjdGVkIHR5cGUgb2Ygb2JqZWN0IHdhcyBlbmNvdW50ZXJlZC5cbmV4cG9ydCBmdW5jdGlvbiB1bmV4cGVjdGVkT2JqVG9TdHJpbmcob2JqKSB7XG4gIGlmIChvYmogPT0gbnVsbCkge1xuICAgIHJldHVybiBTdHJpbmcob2JqKTtcbiAgfVxuICBjb25zdCBiYXNlVG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKTtcbiAgdHJ5IHtcbiAgICBsZXQgdHlwZU5hbWU7XG4gICAgaWYgKG9iai5jb25zdHJ1Y3RvciAmJiBvYmouY29uc3RydWN0b3IubmFtZSkge1xuICAgICAgdHlwZU5hbWUgPSBvYmouY29uc3RydWN0b3IubmFtZTtcbiAgICB9IGVsc2UgaWYgKGJhc2VUb1N0cmluZy5pbmRleE9mKCdbb2JqZWN0ICcpID09PSAwKSB7XG4gICAgICB0eXBlTmFtZSA9IGJhc2VUb1N0cmluZy5zbGljZSg4LCAtMSk7IC8vIEV4dHJhY3QgZS5nLiBcIkFycmF5XCIgZnJvbSBcIltvYmplY3QgQXJyYXldXCIuXG4gICAgfSBlbHNlIHtcbiAgICAgIHR5cGVOYW1lID0gdHlwZW9mIG9iajtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVOYW1lICsgJzogJyArIEpTT04uc3RyaW5naWZ5KFN0cmluZyhvYmopKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBiYXNlVG9TdHJpbmc7XG4gIH1cbn1cbiIsIi8vIFRoZXNlIGFyZSBqdXN0IGNhdGVnb3JpZXMgdGhhdCBhcmUgdXNlZCBpbiBFUzUvRVMyMDE1LlxuLy8gVGhlIGZ1bGwgbGlzdCBvZiBVbmljb2RlIGNhdGVnb3JpZXMgaXMgaGVyZTogaHR0cDovL3d3dy5maWxlZm9ybWF0LmluZm8vaW5mby91bmljb2RlL2NhdGVnb3J5L2luZGV4Lmh0bS5cbmV4cG9ydCBjb25zdCBVbmljb2RlQ2F0ZWdvcmllcyA9IHtcbiAgLy8gTGV0dGVyc1xuICBMdTogL1xccHtMdX0vdSxcbiAgTGw6IC9cXHB7TGx9L3UsXG4gIEx0OiAvXFxwe0x0fS91LFxuICBMbTogL1xccHtMbX0vdSxcbiAgTG86IC9cXHB7TG99L3UsXG5cbiAgLy8gTnVtYmVyc1xuICBObDogL1xccHtObH0vdSxcbiAgTmQ6IC9cXHB7TmR9L3UsXG5cbiAgLy8gTWFya3NcbiAgTW46IC9cXHB7TW59L3UsXG4gIE1jOiAvXFxwe01jfS91LFxuXG4gIC8vIFB1bmN0dWF0aW9uLCBDb25uZWN0b3JcbiAgUGM6IC9cXHB7UGN9L3UsXG5cbiAgLy8gU2VwYXJhdG9yLCBTcGFjZVxuICBaczogL1xccHtac30vdSxcblxuICAvLyBUaGVzZSB0d28gYXJlIG5vdCByZWFsIFVuaWNvZGUgY2F0ZWdvcmllcywgYnV0IG91ciB1c2VmdWwgZm9yIE9obS5cbiAgLy8gTCBpcyBhIGNvbWJpbmF0aW9uIG9mIGFsbCB0aGUgbGV0dGVyIGNhdGVnb3JpZXMuXG4gIC8vIEx0bW8gaXMgYSBjb21iaW5hdGlvbiBvZiBMdCwgTG0sIGFuZCBMby5cbiAgTDogL1xccHtMZXR0ZXJ9L3UsXG4gIEx0bW86IC9cXHB7THR9fFxccHtMbX18XFxwe0xvfS91LFxufTtcbiIsImltcG9ydCB7VW5pY29kZUNhdGVnb3JpZXN9IGZyb20gJy4vVW5pY29kZUNhdGVnb3JpZXMuanMnO1xuaW1wb3J0ICogYXMgY29tbW9uIGZyb20gJy4vY29tbW9uLmpzJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFByaXZhdGUgc3R1ZmZcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIEdlbmVyYWwgc3R1ZmZcblxuZXhwb3J0IGNsYXNzIFBFeHByIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgaWYgKHRoaXMuY29uc3RydWN0b3IgPT09IFBFeHByKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQRXhwciBjYW5ub3QgYmUgaW5zdGFudGlhdGVkIC0tIGl0J3MgYWJzdHJhY3RcIik7XG4gICAgfVxuICB9XG5cbiAgLy8gU2V0IHRoZSBgc291cmNlYCBwcm9wZXJ0eSB0byB0aGUgaW50ZXJ2YWwgY29udGFpbmluZyB0aGUgc291cmNlIGZvciB0aGlzIGV4cHJlc3Npb24uXG4gIHdpdGhTb3VyY2UoaW50ZXJ2YWwpIHtcbiAgICBpZiAoaW50ZXJ2YWwpIHtcbiAgICAgIHRoaXMuc291cmNlID0gaW50ZXJ2YWwudHJpbW1lZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxufVxuXG4vLyBBbnlcblxuZXhwb3J0IGNvbnN0IGFueSA9IE9iamVjdC5jcmVhdGUoUEV4cHIucHJvdG90eXBlKTtcblxuLy8gRW5kXG5cbmV4cG9ydCBjb25zdCBlbmQgPSBPYmplY3QuY3JlYXRlKFBFeHByLnByb3RvdHlwZSk7XG5cbi8vIFRlcm1pbmFsc1xuXG5leHBvcnQgY2xhc3MgVGVybWluYWwgZXh0ZW5kcyBQRXhwciB7XG4gIGNvbnN0cnVjdG9yKG9iaikge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5vYmogPSBvYmo7XG4gIH1cbn1cblxuLy8gUmFuZ2VzXG5cbmV4cG9ydCBjbGFzcyBSYW5nZSBleHRlbmRzIFBFeHByIHtcbiAgY29uc3RydWN0b3IoZnJvbSwgdG8pIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMuZnJvbSA9IGZyb207XG4gICAgdGhpcy50byA9IHRvO1xuICAgIC8vIElmIGVpdGhlciBgZnJvbWAgb3IgYHRvYCBpcyBtYWRlIHVwIG9mIG11bHRpcGxlIGNvZGUgdW5pdHMsIHRoZW5cbiAgICAvLyB0aGUgcmFuZ2Ugc2hvdWxkIGNvbnN1bWUgYSBmdWxsIGNvZGUgcG9pbnQsIG5vdCBhIHNpbmdsZSBjb2RlIHVuaXQuXG4gICAgdGhpcy5tYXRjaENvZGVQb2ludCA9IGZyb20ubGVuZ3RoID4gMSB8fCB0by5sZW5ndGggPiAxO1xuICB9XG59XG5cbi8vIFBhcmFtZXRlcnNcblxuZXhwb3J0IGNsYXNzIFBhcmFtIGV4dGVuZHMgUEV4cHIge1xuICBjb25zdHJ1Y3RvcihpbmRleCkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5pbmRleCA9IGluZGV4O1xuICB9XG59XG5cbi8vIEFsdGVybmF0aW9uXG5cbmV4cG9ydCBjbGFzcyBBbHQgZXh0ZW5kcyBQRXhwciB7XG4gIGNvbnN0cnVjdG9yKHRlcm1zKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLnRlcm1zID0gdGVybXM7XG4gIH1cbn1cblxuLy8gRXh0ZW5kIGlzIGFuIGltcGxlbWVudGF0aW9uIGRldGFpbCBvZiBydWxlIGV4dGVuc2lvblxuXG5leHBvcnQgY2xhc3MgRXh0ZW5kIGV4dGVuZHMgQWx0IHtcbiAgY29uc3RydWN0b3Ioc3VwZXJHcmFtbWFyLCBuYW1lLCBib2R5KSB7XG4gICAgY29uc3Qgb3JpZ0JvZHkgPSBzdXBlckdyYW1tYXIucnVsZXNbbmFtZV0uYm9keTtcbiAgICBzdXBlcihbYm9keSwgb3JpZ0JvZHldKTtcblxuICAgIHRoaXMuc3VwZXJHcmFtbWFyID0gc3VwZXJHcmFtbWFyO1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5ib2R5ID0gYm9keTtcbiAgfVxufVxuXG4vLyBTcGxpY2UgaXMgYW4gaW1wbGVtZW50YXRpb24gZGV0YWlsIG9mIHJ1bGUgb3ZlcnJpZGluZyB3aXRoIHRoZSBgLi4uYCBvcGVyYXRvci5cbmV4cG9ydCBjbGFzcyBTcGxpY2UgZXh0ZW5kcyBBbHQge1xuICBjb25zdHJ1Y3RvcihzdXBlckdyYW1tYXIsIHJ1bGVOYW1lLCBiZWZvcmVUZXJtcywgYWZ0ZXJUZXJtcykge1xuICAgIGNvbnN0IG9yaWdCb2R5ID0gc3VwZXJHcmFtbWFyLnJ1bGVzW3J1bGVOYW1lXS5ib2R5O1xuICAgIHN1cGVyKFsuLi5iZWZvcmVUZXJtcywgb3JpZ0JvZHksIC4uLmFmdGVyVGVybXNdKTtcblxuICAgIHRoaXMuc3VwZXJHcmFtbWFyID0gc3VwZXJHcmFtbWFyO1xuICAgIHRoaXMucnVsZU5hbWUgPSBydWxlTmFtZTtcbiAgICB0aGlzLmV4cGFuc2lvblBvcyA9IGJlZm9yZVRlcm1zLmxlbmd0aDtcbiAgfVxufVxuXG4vLyBTZXF1ZW5jZXNcblxuZXhwb3J0IGNsYXNzIFNlcSBleHRlbmRzIFBFeHByIHtcbiAgY29uc3RydWN0b3IoZmFjdG9ycykge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5mYWN0b3JzID0gZmFjdG9ycztcbiAgfVxufVxuXG4vLyBJdGVyYXRvcnMgYW5kIG9wdGlvbmFsc1xuXG5leHBvcnQgY2xhc3MgSXRlciBleHRlbmRzIFBFeHByIHtcbiAgY29uc3RydWN0b3IoZXhwcikge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5leHByID0gZXhwcjtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgU3RhciBleHRlbmRzIEl0ZXIge31cbmV4cG9ydCBjbGFzcyBQbHVzIGV4dGVuZHMgSXRlciB7fVxuZXhwb3J0IGNsYXNzIE9wdCBleHRlbmRzIEl0ZXIge31cblxuU3Rhci5wcm90b3R5cGUub3BlcmF0b3IgPSAnKic7XG5QbHVzLnByb3RvdHlwZS5vcGVyYXRvciA9ICcrJztcbk9wdC5wcm90b3R5cGUub3BlcmF0b3IgPSAnPyc7XG5cblN0YXIucHJvdG90eXBlLm1pbk51bU1hdGNoZXMgPSAwO1xuUGx1cy5wcm90b3R5cGUubWluTnVtTWF0Y2hlcyA9IDE7XG5PcHQucHJvdG90eXBlLm1pbk51bU1hdGNoZXMgPSAwO1xuXG5TdGFyLnByb3RvdHlwZS5tYXhOdW1NYXRjaGVzID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xuUGx1cy5wcm90b3R5cGUubWF4TnVtTWF0Y2hlcyA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcbk9wdC5wcm90b3R5cGUubWF4TnVtTWF0Y2hlcyA9IDE7XG5cbi8vIFByZWRpY2F0ZXNcblxuZXhwb3J0IGNsYXNzIE5vdCBleHRlbmRzIFBFeHByIHtcbiAgY29uc3RydWN0b3IoZXhwcikge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5leHByID0gZXhwcjtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgTG9va2FoZWFkIGV4dGVuZHMgUEV4cHIge1xuICBjb25zdHJ1Y3RvcihleHByKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmV4cHIgPSBleHByO1xuICB9XG59XG5cbi8vIFwiTGV4aWZpY2F0aW9uXCJcblxuZXhwb3J0IGNsYXNzIExleCBleHRlbmRzIFBFeHByIHtcbiAgY29uc3RydWN0b3IoZXhwcikge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5leHByID0gZXhwcjtcbiAgfVxufVxuXG4vLyBSdWxlIGFwcGxpY2F0aW9uXG5cbmV4cG9ydCBjbGFzcyBBcHBseSBleHRlbmRzIFBFeHByIHtcbiAgY29uc3RydWN0b3IocnVsZU5hbWUsIGFyZ3MgPSBbXSkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5ydWxlTmFtZSA9IHJ1bGVOYW1lO1xuICAgIHRoaXMuYXJncyA9IGFyZ3M7XG4gIH1cblxuICBpc1N5bnRhY3RpYygpIHtcbiAgICByZXR1cm4gY29tbW9uLmlzU3ludGFjdGljKHRoaXMucnVsZU5hbWUpO1xuICB9XG5cbiAgLy8gVGhpcyBtZXRob2QganVzdCBjYWNoZXMgdGhlIHJlc3VsdCBvZiBgdGhpcy50b1N0cmluZygpYCBpbiBhIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5LlxuICB0b01lbW9LZXkoKSB7XG4gICAgaWYgKCF0aGlzLl9tZW1vS2V5KSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19tZW1vS2V5Jywge3ZhbHVlOiB0aGlzLnRvU3RyaW5nKCl9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX21lbW9LZXk7XG4gIH1cbn1cblxuLy8gVW5pY29kZSBjaGFyYWN0ZXJcblxuZXhwb3J0IGNsYXNzIFVuaWNvZGVDaGFyIGV4dGVuZHMgUEV4cHIge1xuICBjb25zdHJ1Y3RvcihjYXRlZ29yeSkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5jYXRlZ29yeSA9IGNhdGVnb3J5O1xuICAgIHRoaXMucGF0dGVybiA9IFVuaWNvZGVDYXRlZ29yaWVzW2NhdGVnb3J5XTtcbiAgfVxufVxuIiwiaW1wb3J0IHthc3NlcnR9IGZyb20gJy4vY29tbW9uLmpzJztcbmltcG9ydCAqIGFzIHBleHBycyBmcm9tICcuL3BleHBycy1tYWluLmpzJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFByaXZhdGUgc3R1ZmZcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFcnJvcihtZXNzYWdlLCBvcHRJbnRlcnZhbCkge1xuICBsZXQgZTtcbiAgaWYgKG9wdEludGVydmFsKSB7XG4gICAgZSA9IG5ldyBFcnJvcihvcHRJbnRlcnZhbC5nZXRMaW5lQW5kQ29sdW1uTWVzc2FnZSgpICsgbWVzc2FnZSk7XG4gICAgZS5zaG9ydE1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgIGUuaW50ZXJ2YWwgPSBvcHRJbnRlcnZhbDtcbiAgfSBlbHNlIHtcbiAgICBlID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuICB9XG4gIHJldHVybiBlO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLSBlcnJvcnMgYWJvdXQgaW50ZXJ2YWxzIC0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBmdW5jdGlvbiBpbnRlcnZhbFNvdXJjZXNEb250TWF0Y2goKSB7XG4gIHJldHVybiBjcmVhdGVFcnJvcihcIkludGVydmFsIHNvdXJjZXMgZG9uJ3QgbWF0Y2hcIik7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tIGVycm9ycyBhYm91dCBncmFtbWFycyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBHcmFtbWFyIHN5bnRheCBlcnJvclxuXG5leHBvcnQgZnVuY3Rpb24gZ3JhbW1hclN5bnRheEVycm9yKG1hdGNoRmFpbHVyZSkge1xuICBjb25zdCBlID0gbmV3IEVycm9yKCk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLCAnbWVzc2FnZScsIHtcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGdldCgpIHtcbiAgICAgIHJldHVybiBtYXRjaEZhaWx1cmUubWVzc2FnZTtcbiAgICB9LFxuICB9KTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGUsICdzaG9ydE1lc3NhZ2UnLCB7XG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICBnZXQoKSB7XG4gICAgICByZXR1cm4gJ0V4cGVjdGVkICcgKyBtYXRjaEZhaWx1cmUuZ2V0RXhwZWN0ZWRUZXh0KCk7XG4gICAgfSxcbiAgfSk7XG4gIGUuaW50ZXJ2YWwgPSBtYXRjaEZhaWx1cmUuZ2V0SW50ZXJ2YWwoKTtcbiAgcmV0dXJuIGU7XG59XG5cbi8vIFVuZGVjbGFyZWQgZ3JhbW1hclxuXG5leHBvcnQgZnVuY3Rpb24gdW5kZWNsYXJlZEdyYW1tYXIoZ3JhbW1hck5hbWUsIG5hbWVzcGFjZSwgaW50ZXJ2YWwpIHtcbiAgY29uc3QgbWVzc2FnZSA9IG5hbWVzcGFjZSA/XG4gICAgYEdyYW1tYXIgJHtncmFtbWFyTmFtZX0gaXMgbm90IGRlY2xhcmVkIGluIG5hbWVzcGFjZSAnJHtuYW1lc3BhY2V9J2AgOlxuICAgICdVbmRlY2xhcmVkIGdyYW1tYXIgJyArIGdyYW1tYXJOYW1lO1xuICByZXR1cm4gY3JlYXRlRXJyb3IobWVzc2FnZSwgaW50ZXJ2YWwpO1xufVxuXG4vLyBEdXBsaWNhdGUgZ3JhbW1hciBkZWNsYXJhdGlvblxuXG5leHBvcnQgZnVuY3Rpb24gZHVwbGljYXRlR3JhbW1hckRlY2xhcmF0aW9uKGdyYW1tYXIsIG5hbWVzcGFjZSkge1xuICByZXR1cm4gY3JlYXRlRXJyb3IoJ0dyYW1tYXIgJyArIGdyYW1tYXIubmFtZSArICcgaXMgYWxyZWFkeSBkZWNsYXJlZCBpbiB0aGlzIG5hbWVzcGFjZScpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ3JhbW1hckRvZXNOb3RTdXBwb3J0SW5jcmVtZW50YWxQYXJzaW5nKGdyYW1tYXIpIHtcbiAgcmV0dXJuIGNyZWF0ZUVycm9yKGBHcmFtbWFyICcke2dyYW1tYXIubmFtZX0nIGRvZXMgbm90IHN1cHBvcnQgaW5jcmVtZW50YWwgcGFyc2luZ2ApO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLSBydWxlcyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBVbmRlY2xhcmVkIHJ1bGVcblxuZXhwb3J0IGZ1bmN0aW9uIHVuZGVjbGFyZWRSdWxlKHJ1bGVOYW1lLCBncmFtbWFyTmFtZSwgb3B0SW50ZXJ2YWwpIHtcbiAgcmV0dXJuIGNyZWF0ZUVycm9yKFxuICAgICAgJ1J1bGUgJyArIHJ1bGVOYW1lICsgJyBpcyBub3QgZGVjbGFyZWQgaW4gZ3JhbW1hciAnICsgZ3JhbW1hck5hbWUsXG4gICAgICBvcHRJbnRlcnZhbCxcbiAgKTtcbn1cblxuLy8gQ2Fubm90IG92ZXJyaWRlIHVuZGVjbGFyZWQgcnVsZVxuXG5leHBvcnQgZnVuY3Rpb24gY2Fubm90T3ZlcnJpZGVVbmRlY2xhcmVkUnVsZShydWxlTmFtZSwgZ3JhbW1hck5hbWUsIG9wdFNvdXJjZSkge1xuICByZXR1cm4gY3JlYXRlRXJyb3IoXG4gICAgICAnQ2Fubm90IG92ZXJyaWRlIHJ1bGUgJyArIHJ1bGVOYW1lICsgJyBiZWNhdXNlIGl0IGlzIG5vdCBkZWNsYXJlZCBpbiAnICsgZ3JhbW1hck5hbWUsXG4gICAgICBvcHRTb3VyY2UsXG4gICk7XG59XG5cbi8vIENhbm5vdCBleHRlbmQgdW5kZWNsYXJlZCBydWxlXG5cbmV4cG9ydCBmdW5jdGlvbiBjYW5ub3RFeHRlbmRVbmRlY2xhcmVkUnVsZShydWxlTmFtZSwgZ3JhbW1hck5hbWUsIG9wdFNvdXJjZSkge1xuICByZXR1cm4gY3JlYXRlRXJyb3IoXG4gICAgICAnQ2Fubm90IGV4dGVuZCBydWxlICcgKyBydWxlTmFtZSArICcgYmVjYXVzZSBpdCBpcyBub3QgZGVjbGFyZWQgaW4gJyArIGdyYW1tYXJOYW1lLFxuICAgICAgb3B0U291cmNlLFxuICApO1xufVxuXG4vLyBEdXBsaWNhdGUgcnVsZSBkZWNsYXJhdGlvblxuXG5leHBvcnQgZnVuY3Rpb24gZHVwbGljYXRlUnVsZURlY2xhcmF0aW9uKHJ1bGVOYW1lLCBncmFtbWFyTmFtZSwgZGVjbEdyYW1tYXJOYW1lLCBvcHRTb3VyY2UpIHtcbiAgbGV0IG1lc3NhZ2UgPVxuICAgIFwiRHVwbGljYXRlIGRlY2xhcmF0aW9uIGZvciBydWxlICdcIiArIHJ1bGVOYW1lICsgXCInIGluIGdyYW1tYXIgJ1wiICsgZ3JhbW1hck5hbWUgKyBcIidcIjtcbiAgaWYgKGdyYW1tYXJOYW1lICE9PSBkZWNsR3JhbW1hck5hbWUpIHtcbiAgICBtZXNzYWdlICs9IFwiIChvcmlnaW5hbGx5IGRlY2xhcmVkIGluICdcIiArIGRlY2xHcmFtbWFyTmFtZSArIFwiJylcIjtcbiAgfVxuICByZXR1cm4gY3JlYXRlRXJyb3IobWVzc2FnZSwgb3B0U291cmNlKTtcbn1cblxuLy8gV3JvbmcgbnVtYmVyIG9mIHBhcmFtZXRlcnNcblxuZXhwb3J0IGZ1bmN0aW9uIHdyb25nTnVtYmVyT2ZQYXJhbWV0ZXJzKHJ1bGVOYW1lLCBleHBlY3RlZCwgYWN0dWFsLCBzb3VyY2UpIHtcbiAgcmV0dXJuIGNyZWF0ZUVycm9yKFxuICAgICAgJ1dyb25nIG51bWJlciBvZiBwYXJhbWV0ZXJzIGZvciBydWxlICcgK1xuICAgICAgcnVsZU5hbWUgK1xuICAgICAgJyAoZXhwZWN0ZWQgJyArXG4gICAgICBleHBlY3RlZCArXG4gICAgICAnLCBnb3QgJyArXG4gICAgICBhY3R1YWwgK1xuICAgICAgJyknLFxuICAgICAgc291cmNlLFxuICApO1xufVxuXG4vLyBXcm9uZyBudW1iZXIgb2YgYXJndW1lbnRzXG5cbmV4cG9ydCBmdW5jdGlvbiB3cm9uZ051bWJlck9mQXJndW1lbnRzKHJ1bGVOYW1lLCBleHBlY3RlZCwgYWN0dWFsLCBleHByKSB7XG4gIHJldHVybiBjcmVhdGVFcnJvcihcbiAgICAgICdXcm9uZyBudW1iZXIgb2YgYXJndW1lbnRzIGZvciBydWxlICcgK1xuICAgICAgcnVsZU5hbWUgK1xuICAgICAgJyAoZXhwZWN0ZWQgJyArXG4gICAgICBleHBlY3RlZCArXG4gICAgICAnLCBnb3QgJyArXG4gICAgICBhY3R1YWwgK1xuICAgICAgJyknLFxuICAgICAgZXhwcixcbiAgKTtcbn1cblxuLy8gRHVwbGljYXRlIHBhcmFtZXRlciBuYW1lc1xuXG5leHBvcnQgZnVuY3Rpb24gZHVwbGljYXRlUGFyYW1ldGVyTmFtZXMocnVsZU5hbWUsIGR1cGxpY2F0ZXMsIHNvdXJjZSkge1xuICByZXR1cm4gY3JlYXRlRXJyb3IoXG4gICAgICAnRHVwbGljYXRlIHBhcmFtZXRlciBuYW1lcyBpbiBydWxlICcgKyBydWxlTmFtZSArICc6ICcgKyBkdXBsaWNhdGVzLmpvaW4oJywgJyksXG4gICAgICBzb3VyY2UsXG4gICk7XG59XG5cbi8vIEludmFsaWQgcGFyYW1ldGVyIGV4cHJlc3Npb25cblxuZXhwb3J0IGZ1bmN0aW9uIGludmFsaWRQYXJhbWV0ZXIocnVsZU5hbWUsIGV4cHIpIHtcbiAgcmV0dXJuIGNyZWF0ZUVycm9yKFxuICAgICAgJ0ludmFsaWQgcGFyYW1ldGVyIHRvIHJ1bGUgJyArXG4gICAgICBydWxlTmFtZSArXG4gICAgICAnOiAnICtcbiAgICAgIGV4cHIgK1xuICAgICAgJyBoYXMgYXJpdHkgJyArXG4gICAgICBleHByLmdldEFyaXR5KCkgK1xuICAgICAgJywgYnV0IHBhcmFtZXRlciBleHByZXNzaW9ucyBtdXN0IGhhdmUgYXJpdHkgMScsXG4gICAgICBleHByLnNvdXJjZSxcbiAgKTtcbn1cblxuLy8gQXBwbGljYXRpb24gb2Ygc3ludGFjdGljIHJ1bGUgZnJvbSBsZXhpY2FsIHJ1bGVcblxuY29uc3Qgc3ludGFjdGljVnNMZXhpY2FsTm90ZSA9XG4gICdOT1RFOiBBIF9zeW50YWN0aWMgcnVsZV8gaXMgYSBydWxlIHdob3NlIG5hbWUgYmVnaW5zIHdpdGggYSBjYXBpdGFsIGxldHRlci4gJyArXG4gICdTZWUgaHR0cHM6Ly9vaG1qcy5vcmcvZC9zdmwgZm9yIG1vcmUgZGV0YWlscy4nO1xuXG5leHBvcnQgZnVuY3Rpb24gYXBwbGljYXRpb25PZlN5bnRhY3RpY1J1bGVGcm9tTGV4aWNhbENvbnRleHQocnVsZU5hbWUsIGFwcGx5RXhwcikge1xuICByZXR1cm4gY3JlYXRlRXJyb3IoXG4gICAgICAnQ2Fubm90IGFwcGx5IHN5bnRhY3RpYyBydWxlICcgKyBydWxlTmFtZSArICcgZnJvbSBoZXJlIChpbnNpZGUgYSBsZXhpY2FsIGNvbnRleHQpJyxcbiAgICAgIGFwcGx5RXhwci5zb3VyY2UsXG4gICk7XG59XG5cbi8vIExleGljYWwgcnVsZSBhcHBsaWNhdGlvbiB1c2VkIHdpdGggYXBwbHlTeW50YWN0aWNcblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5U3ludGFjdGljV2l0aExleGljYWxSdWxlQXBwbGljYXRpb24oYXBwbHlFeHByKSB7XG4gIGNvbnN0IHtydWxlTmFtZX0gPSBhcHBseUV4cHI7XG4gIHJldHVybiBjcmVhdGVFcnJvcihcbiAgICAgIGBhcHBseVN5bnRhY3RpYyBpcyBmb3Igc3ludGFjdGljIHJ1bGVzLCBidXQgJyR7cnVsZU5hbWV9JyBpcyBhIGxleGljYWwgcnVsZS4gYCArXG4gICAgICBzeW50YWN0aWNWc0xleGljYWxOb3RlLFxuICAgICAgYXBwbHlFeHByLnNvdXJjZSxcbiAgKTtcbn1cblxuLy8gQXBwbGljYXRpb24gb2YgYXBwbHlTeW50YWN0aWMgaW4gYSBzeW50YWN0aWMgY29udGV4dFxuXG5leHBvcnQgZnVuY3Rpb24gdW5uZWNlc3NhcnlFeHBlcmltZW50YWxBcHBseVN5bnRhY3RpYyhhcHBseUV4cHIpIHtcbiAgcmV0dXJuIGNyZWF0ZUVycm9yKFxuICAgICAgJ2FwcGx5U3ludGFjdGljIGlzIG5vdCByZXF1aXJlZCBoZXJlIChpbiBhIHN5bnRhY3RpYyBjb250ZXh0KScsXG4gICAgICBhcHBseUV4cHIuc291cmNlLFxuICApO1xufVxuXG4vLyBJbmNvcnJlY3QgYXJndW1lbnQgdHlwZVxuXG5leHBvcnQgZnVuY3Rpb24gaW5jb3JyZWN0QXJndW1lbnRUeXBlKGV4cGVjdGVkVHlwZSwgZXhwcikge1xuICByZXR1cm4gY3JlYXRlRXJyb3IoJ0luY29ycmVjdCBhcmd1bWVudCB0eXBlOiBleHBlY3RlZCAnICsgZXhwZWN0ZWRUeXBlLCBleHByLnNvdXJjZSk7XG59XG5cbi8vIE11bHRpcGxlIGluc3RhbmNlcyBvZiB0aGUgc3VwZXItc3BsaWNlIG9wZXJhdG9yIChgLi4uYCkgaW4gdGhlIHJ1bGUgYm9keS5cblxuZXhwb3J0IGZ1bmN0aW9uIG11bHRpcGxlU3VwZXJTcGxpY2VzKGV4cHIpIHtcbiAgcmV0dXJuIGNyZWF0ZUVycm9yKFwiJy4uLicgY2FuIGFwcGVhciBhdCBtb3N0IG9uY2UgaW4gYSBydWxlIGJvZHlcIiwgZXhwci5zb3VyY2UpO1xufVxuXG4vLyBVbmljb2RlIGNvZGUgcG9pbnQgZXNjYXBlc1xuXG5leHBvcnQgZnVuY3Rpb24gaW52YWxpZENvZGVQb2ludChhcHBseVdyYXBwZXIpIHtcbiAgY29uc3Qgbm9kZSA9IGFwcGx5V3JhcHBlci5fbm9kZTtcbiAgYXNzZXJ0KG5vZGUgJiYgbm9kZS5pc05vbnRlcm1pbmFsKCkgJiYgbm9kZS5jdG9yTmFtZSA9PT0gJ2VzY2FwZUNoYXJfdW5pY29kZUNvZGVQb2ludCcpO1xuXG4gIC8vIEdldCBhbiBpbnRlcnZhbCB0aGF0IGNvdmVycyBhbGwgb2YgdGhlIGhleCBkaWdpdHMuXG4gIGNvbnN0IGRpZ2l0SW50ZXJ2YWxzID0gYXBwbHlXcmFwcGVyLmNoaWxkcmVuLnNsaWNlKDEsIC0xKS5tYXAoZCA9PiBkLnNvdXJjZSk7XG4gIGNvbnN0IGZ1bGxJbnRlcnZhbCA9IGRpZ2l0SW50ZXJ2YWxzWzBdLmNvdmVyYWdlV2l0aCguLi5kaWdpdEludGVydmFscy5zbGljZSgxKSk7XG4gIHJldHVybiBjcmVhdGVFcnJvcihcbiAgICAgIGBVKyR7ZnVsbEludGVydmFsLmNvbnRlbnRzfSBpcyBub3QgYSB2YWxpZCBVbmljb2RlIGNvZGUgcG9pbnRgLFxuICAgICAgZnVsbEludGVydmFsLFxuICApO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLSBLbGVlbmUgb3BlcmF0b3JzIC0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBmdW5jdGlvbiBrbGVlbmVFeHBySGFzTnVsbGFibGVPcGVyYW5kKGtsZWVuZUV4cHIsIGFwcGxpY2F0aW9uU3RhY2spIHtcbiAgY29uc3QgYWN0dWFscyA9XG4gICAgYXBwbGljYXRpb25TdGFjay5sZW5ndGggPiAwID8gYXBwbGljYXRpb25TdGFja1thcHBsaWNhdGlvblN0YWNrLmxlbmd0aCAtIDFdLmFyZ3MgOiBbXTtcbiAgY29uc3QgZXhwciA9IGtsZWVuZUV4cHIuZXhwci5zdWJzdGl0dXRlUGFyYW1zKGFjdHVhbHMpO1xuICBsZXQgbWVzc2FnZSA9XG4gICAgJ051bGxhYmxlIGV4cHJlc3Npb24gJyArXG4gICAgZXhwciArXG4gICAgXCIgaXMgbm90IGFsbG93ZWQgaW5zaWRlICdcIiArXG4gICAga2xlZW5lRXhwci5vcGVyYXRvciArXG4gICAgXCInIChwb3NzaWJsZSBpbmZpbml0ZSBsb29wKVwiO1xuICBpZiAoYXBwbGljYXRpb25TdGFjay5sZW5ndGggPiAwKSB7XG4gICAgY29uc3Qgc3RhY2tUcmFjZSA9IGFwcGxpY2F0aW9uU3RhY2tcbiAgICAgICAgLm1hcChhcHAgPT4gbmV3IHBleHBycy5BcHBseShhcHAucnVsZU5hbWUsIGFwcC5hcmdzKSlcbiAgICAgICAgLmpvaW4oJ1xcbicpO1xuICAgIG1lc3NhZ2UgKz0gJ1xcbkFwcGxpY2F0aW9uIHN0YWNrIChtb3N0IHJlY2VudCBhcHBsaWNhdGlvbiBsYXN0KTpcXG4nICsgc3RhY2tUcmFjZTtcbiAgfVxuICByZXR1cm4gY3JlYXRlRXJyb3IobWVzc2FnZSwga2xlZW5lRXhwci5leHByLnNvdXJjZSk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tIGFyaXR5IC0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBmdW5jdGlvbiBpbmNvbnNpc3RlbnRBcml0eShydWxlTmFtZSwgZXhwZWN0ZWQsIGFjdHVhbCwgZXhwcikge1xuICByZXR1cm4gY3JlYXRlRXJyb3IoXG4gICAgICAnUnVsZSAnICtcbiAgICAgIHJ1bGVOYW1lICtcbiAgICAgICcgaW52b2x2ZXMgYW4gYWx0ZXJuYXRpb24gd2hpY2ggaGFzIGluY29uc2lzdGVudCBhcml0eSAnICtcbiAgICAgICcoZXhwZWN0ZWQgJyArXG4gICAgICBleHBlY3RlZCArXG4gICAgICAnLCBnb3QgJyArXG4gICAgICBhY3R1YWwgK1xuICAgICAgJyknLFxuICAgICAgZXhwci5zb3VyY2UsXG4gICk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tIHByb3BlcnRpZXMgLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGZ1bmN0aW9uIGR1cGxpY2F0ZVByb3BlcnR5TmFtZXMoZHVwbGljYXRlcykge1xuICByZXR1cm4gY3JlYXRlRXJyb3IoJ09iamVjdCBwYXR0ZXJuIGhhcyBkdXBsaWNhdGUgcHJvcGVydHkgbmFtZXM6ICcgKyBkdXBsaWNhdGVzLmpvaW4oJywgJykpO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLSBjb25zdHJ1Y3RvcnMgLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGZ1bmN0aW9uIGludmFsaWRDb25zdHJ1Y3RvckNhbGwoZ3JhbW1hciwgY3Rvck5hbWUsIGNoaWxkcmVuKSB7XG4gIHJldHVybiBjcmVhdGVFcnJvcihcbiAgICAgICdBdHRlbXB0IHRvIGludm9rZSBjb25zdHJ1Y3RvciAnICsgY3Rvck5hbWUgKyAnIHdpdGggaW52YWxpZCBvciB1bmV4cGVjdGVkIGFyZ3VtZW50cycsXG4gICk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tIGNvbnZlbmllbmNlIC0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBmdW5jdGlvbiBtdWx0aXBsZUVycm9ycyhlcnJvcnMpIHtcbiAgY29uc3QgbWVzc2FnZXMgPSBlcnJvcnMubWFwKGUgPT4gZS5tZXNzYWdlKTtcbiAgcmV0dXJuIGNyZWF0ZUVycm9yKFsnRXJyb3JzOiddLmNvbmNhdChtZXNzYWdlcykuam9pbignXFxuLSAnKSwgZXJyb3JzWzBdLmludGVydmFsKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0gc2VtYW50aWMgLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGZ1bmN0aW9uIG1pc3NpbmdTZW1hbnRpY0FjdGlvbihjdG9yTmFtZSwgbmFtZSwgdHlwZSwgc3RhY2spIHtcbiAgbGV0IHN0YWNrVHJhY2UgPSBzdGFja1xuICAgICAgLnNsaWNlKDAsIC0xKVxuICAgICAgLm1hcChpbmZvID0+IHtcbiAgICAgICAgY29uc3QgYW5zID0gJyAgJyArIGluZm9bMF0ubmFtZSArICcgPiAnICsgaW5mb1sxXTtcbiAgICAgICAgcmV0dXJuIGluZm8ubGVuZ3RoID09PSAzID8gYW5zICsgXCIgZm9yICdcIiArIGluZm9bMl0gKyBcIidcIiA6IGFucztcbiAgICAgIH0pXG4gICAgICAuam9pbignXFxuJyk7XG4gIHN0YWNrVHJhY2UgKz0gJ1xcbiAgJyArIG5hbWUgKyAnID4gJyArIGN0b3JOYW1lO1xuXG4gIGxldCBtb3JlSW5mbyA9ICcnO1xuICBpZiAoY3Rvck5hbWUgPT09ICdfaXRlcicpIHtcbiAgICBtb3JlSW5mbyA9IFtcbiAgICAgICdcXG5OT1RFOiBhcyBvZiBPaG0gdjE2LCB0aGVyZSBpcyBubyBkZWZhdWx0IGFjdGlvbiBmb3IgaXRlcmF0aW9uIG5vZGVzIOKAlCBzZWUgJyxcbiAgICAgICcgIGh0dHBzOi8vb2htanMub3JnL2QvZHNhIGZvciBkZXRhaWxzLicsXG4gICAgXS5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIGNvbnN0IG1lc3NhZ2UgPSBbXG4gICAgYE1pc3Npbmcgc2VtYW50aWMgYWN0aW9uIGZvciAnJHtjdG9yTmFtZX0nIGluICR7dHlwZX0gJyR7bmFtZX0nLiR7bW9yZUluZm99YCxcbiAgICAnQWN0aW9uIHN0YWNrIChtb3N0IHJlY2VudCBjYWxsIGxhc3QpOicsXG4gICAgc3RhY2tUcmFjZSxcbiAgXS5qb2luKCdcXG4nKTtcblxuICBjb25zdCBlID0gY3JlYXRlRXJyb3IobWVzc2FnZSk7XG4gIGUubmFtZSA9ICdtaXNzaW5nU2VtYW50aWNBY3Rpb24nO1xuICByZXR1cm4gZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRocm93RXJyb3JzKGVycm9ycykge1xuICBpZiAoZXJyb3JzLmxlbmd0aCA9PT0gMSkge1xuICAgIHRocm93IGVycm9yc1swXTtcbiAgfVxuICBpZiAoZXJyb3JzLmxlbmd0aCA+IDEpIHtcbiAgICB0aHJvdyBtdWx0aXBsZUVycm9ycyhlcnJvcnMpO1xuICB9XG59XG4iLCJpbXBvcnQgKiBhcyBjb21tb24gZnJvbSAnLi9jb21tb24uanMnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUHJpdmF0ZSBzdHVmZlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gR2l2ZW4gYW4gYXJyYXkgb2YgbnVtYmVycyBgYXJyYCwgcmV0dXJuIGFuIGFycmF5IG9mIHRoZSBudW1iZXJzIGFzIHN0cmluZ3MsXG4vLyByaWdodC1qdXN0aWZpZWQgYW5kIHBhZGRlZCB0byB0aGUgc2FtZSBsZW5ndGguXG5mdW5jdGlvbiBwYWROdW1iZXJzVG9FcXVhbExlbmd0aChhcnIpIHtcbiAgbGV0IG1heExlbiA9IDA7XG4gIGNvbnN0IHN0cmluZ3MgPSBhcnIubWFwKG4gPT4ge1xuICAgIGNvbnN0IHN0ciA9IG4udG9TdHJpbmcoKTtcbiAgICBtYXhMZW4gPSBNYXRoLm1heChtYXhMZW4sIHN0ci5sZW5ndGgpO1xuICAgIHJldHVybiBzdHI7XG4gIH0pO1xuICByZXR1cm4gc3RyaW5ncy5tYXAocyA9PiBjb21tb24ucGFkTGVmdChzLCBtYXhMZW4pKTtcbn1cblxuLy8gUHJvZHVjZSBhIG5ldyBzdHJpbmcgdGhhdCB3b3VsZCBiZSB0aGUgcmVzdWx0IG9mIGNvcHlpbmcgdGhlIGNvbnRlbnRzXG4vLyBvZiB0aGUgc3RyaW5nIGBzcmNgIG9udG8gYGRlc3RgIGF0IG9mZnNldCBgb2ZmZXN0YC5cbmZ1bmN0aW9uIHN0cmNweShkZXN0LCBzcmMsIG9mZnNldCkge1xuICBjb25zdCBvcmlnRGVzdExlbiA9IGRlc3QubGVuZ3RoO1xuICBjb25zdCBzdGFydCA9IGRlc3Quc2xpY2UoMCwgb2Zmc2V0KTtcbiAgY29uc3QgZW5kID0gZGVzdC5zbGljZShvZmZzZXQgKyBzcmMubGVuZ3RoKTtcbiAgcmV0dXJuIChzdGFydCArIHNyYyArIGVuZCkuc3Vic3RyKDAsIG9yaWdEZXN0TGVuKTtcbn1cblxuLy8gQ2FzdHMgdGhlIHVuZGVybHlpbmcgbGluZUFuZENvbCBvYmplY3QgdG8gYSBmb3JtYXR0ZWQgbWVzc2FnZSBzdHJpbmcsXG4vLyBoaWdobGlnaHRpbmcgYHJhbmdlc2AuXG5mdW5jdGlvbiBsaW5lQW5kQ29sdW1uVG9NZXNzYWdlKC4uLnJhbmdlcykge1xuICBjb25zdCBsaW5lQW5kQ29sID0gdGhpcztcbiAgY29uc3Qge29mZnNldH0gPSBsaW5lQW5kQ29sO1xuICBjb25zdCB7cmVwZWF0U3RyfSA9IGNvbW1vbjtcblxuICBjb25zdCBzYiA9IG5ldyBjb21tb24uU3RyaW5nQnVmZmVyKCk7XG4gIHNiLmFwcGVuZCgnTGluZSAnICsgbGluZUFuZENvbC5saW5lTnVtICsgJywgY29sICcgKyBsaW5lQW5kQ29sLmNvbE51bSArICc6XFxuJyk7XG5cbiAgLy8gQW4gYXJyYXkgb2YgdGhlIHByZXZpb3VzLCBjdXJyZW50LCBhbmQgbmV4dCBsaW5lIG51bWJlcnMgYXMgc3RyaW5ncyBvZiBlcXVhbCBsZW5ndGguXG4gIGNvbnN0IGxpbmVOdW1iZXJzID0gcGFkTnVtYmVyc1RvRXF1YWxMZW5ndGgoW1xuICAgIGxpbmVBbmRDb2wucHJldkxpbmUgPT0gbnVsbCA/IDAgOiBsaW5lQW5kQ29sLmxpbmVOdW0gLSAxLFxuICAgIGxpbmVBbmRDb2wubGluZU51bSxcbiAgICBsaW5lQW5kQ29sLm5leHRMaW5lID09IG51bGwgPyAwIDogbGluZUFuZENvbC5saW5lTnVtICsgMSxcbiAgXSk7XG5cbiAgLy8gSGVscGVyIGZvciBhcHBlbmRpbmcgZm9ybWF0dGluZyBpbnB1dCBsaW5lcyB0byB0aGUgYnVmZmVyLlxuICBjb25zdCBhcHBlbmRMaW5lID0gKG51bSwgY29udGVudCwgcHJlZml4KSA9PiB7XG4gICAgc2IuYXBwZW5kKHByZWZpeCArIGxpbmVOdW1iZXJzW251bV0gKyAnIHwgJyArIGNvbnRlbnQgKyAnXFxuJyk7XG4gIH07XG5cbiAgLy8gSW5jbHVkZSB0aGUgcHJldmlvdXMgbGluZSBmb3IgY29udGV4dCBpZiBwb3NzaWJsZS5cbiAgaWYgKGxpbmVBbmRDb2wucHJldkxpbmUgIT0gbnVsbCkge1xuICAgIGFwcGVuZExpbmUoMCwgbGluZUFuZENvbC5wcmV2TGluZSwgJyAgJyk7XG4gIH1cbiAgLy8gTGluZSB0aGF0IHRoZSBlcnJvciBvY2N1cnJlZCBvbi5cbiAgYXBwZW5kTGluZSgxLCBsaW5lQW5kQ29sLmxpbmUsICc+ICcpO1xuXG4gIC8vIEJ1aWxkIHVwIHRoZSBsaW5lIHRoYXQgcG9pbnRzIHRvIHRoZSBvZmZzZXQgYW5kIHBvc3NpYmxlIGluZGljYXRlcyBvbmUgb3IgbW9yZSByYW5nZXMuXG4gIC8vIFN0YXJ0IHdpdGggYSBibGFuayBsaW5lLCBhbmQgaW5kaWNhdGUgZWFjaCByYW5nZSBieSBvdmVybGF5aW5nIGEgc3RyaW5nIG9mIGB+YCBjaGFycy5cbiAgY29uc3QgbGluZUxlbiA9IGxpbmVBbmRDb2wubGluZS5sZW5ndGg7XG4gIGxldCBpbmRpY2F0aW9uTGluZSA9IHJlcGVhdFN0cignICcsIGxpbmVMZW4gKyAxKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCByYW5nZXMubGVuZ3RoOyArK2kpIHtcbiAgICBsZXQgc3RhcnRJZHggPSByYW5nZXNbaV1bMF07XG4gICAgbGV0IGVuZElkeCA9IHJhbmdlc1tpXVsxXTtcbiAgICBjb21tb24uYXNzZXJ0KHN0YXJ0SWR4ID49IDAgJiYgc3RhcnRJZHggPD0gZW5kSWR4LCAncmFuZ2Ugc3RhcnQgbXVzdCBiZSA+PSAwIGFuZCA8PSBlbmQnKTtcblxuICAgIGNvbnN0IGxpbmVTdGFydE9mZnNldCA9IG9mZnNldCAtIGxpbmVBbmRDb2wuY29sTnVtICsgMTtcbiAgICBzdGFydElkeCA9IE1hdGgubWF4KDAsIHN0YXJ0SWR4IC0gbGluZVN0YXJ0T2Zmc2V0KTtcbiAgICBlbmRJZHggPSBNYXRoLm1pbihlbmRJZHggLSBsaW5lU3RhcnRPZmZzZXQsIGxpbmVMZW4pO1xuXG4gICAgaW5kaWNhdGlvbkxpbmUgPSBzdHJjcHkoaW5kaWNhdGlvbkxpbmUsIHJlcGVhdFN0cignficsIGVuZElkeCAtIHN0YXJ0SWR4KSwgc3RhcnRJZHgpO1xuICB9XG4gIGNvbnN0IGd1dHRlcldpZHRoID0gMiArIGxpbmVOdW1iZXJzWzFdLmxlbmd0aCArIDM7XG4gIHNiLmFwcGVuZChyZXBlYXRTdHIoJyAnLCBndXR0ZXJXaWR0aCkpO1xuICBpbmRpY2F0aW9uTGluZSA9IHN0cmNweShpbmRpY2F0aW9uTGluZSwgJ14nLCBsaW5lQW5kQ29sLmNvbE51bSAtIDEpO1xuICBzYi5hcHBlbmQoaW5kaWNhdGlvbkxpbmUucmVwbGFjZSgvICskLywgJycpICsgJ1xcbicpO1xuXG4gIC8vIEluY2x1ZGUgdGhlIG5leHQgbGluZSBmb3IgY29udGV4dCBpZiBwb3NzaWJsZS5cbiAgaWYgKGxpbmVBbmRDb2wubmV4dExpbmUgIT0gbnVsbCkge1xuICAgIGFwcGVuZExpbmUoMiwgbGluZUFuZENvbC5uZXh0TGluZSwgJyAgJyk7XG4gIH1cbiAgcmV0dXJuIHNiLmNvbnRlbnRzKCk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBFeHBvcnRzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5sZXQgYnVpbHRJblJ1bGVzQ2FsbGJhY2tzID0gW107XG5cbi8vIFNpbmNlIEdyYW1tYXIuQnVpbHRJblJ1bGVzIGlzIGJvb3RzdHJhcHBlZCwgbW9zdCBvZiBPaG0gY2FuJ3QgZGlyZWN0bHkgZGVwZW5kIGl0LlxuLy8gVGhpcyBmdW5jdGlvbiBhbGxvd3MgbW9kdWxlcyB0aGF0IGRvIGRlcGVuZCBvbiB0aGUgYnVpbHQtaW4gcnVsZXMgdG8gcmVnaXN0ZXIgYSBjYWxsYmFja1xuLy8gdGhhdCB3aWxsIGJlIGNhbGxlZCBsYXRlciBpbiB0aGUgaW5pdGlhbGl6YXRpb24gcHJvY2Vzcy5cbmV4cG9ydCBmdW5jdGlvbiBhd2FpdEJ1aWx0SW5SdWxlcyhjYikge1xuICBidWlsdEluUnVsZXNDYWxsYmFja3MucHVzaChjYik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhbm5vdW5jZUJ1aWx0SW5SdWxlcyhncmFtbWFyKSB7XG4gIGJ1aWx0SW5SdWxlc0NhbGxiYWNrcy5mb3JFYWNoKGNiID0+IHtcbiAgICBjYihncmFtbWFyKTtcbiAgfSk7XG4gIGJ1aWx0SW5SdWxlc0NhbGxiYWNrcyA9IG51bGw7XG59XG5cbi8vIFJldHVybiBhbiBvYmplY3Qgd2l0aCB0aGUgbGluZSBhbmQgY29sdW1uIGluZm9ybWF0aW9uIGZvciB0aGUgZ2l2ZW5cbi8vIG9mZnNldCBpbiBgc3RyYC5cbmV4cG9ydCBmdW5jdGlvbiBnZXRMaW5lQW5kQ29sdW1uKHN0ciwgb2Zmc2V0KSB7XG4gIGxldCBsaW5lTnVtID0gMTtcbiAgbGV0IGNvbE51bSA9IDE7XG5cbiAgbGV0IGN1cnJPZmZzZXQgPSAwO1xuICBsZXQgbGluZVN0YXJ0T2Zmc2V0ID0gMDtcblxuICBsZXQgbmV4dExpbmUgPSBudWxsO1xuICBsZXQgcHJldkxpbmUgPSBudWxsO1xuICBsZXQgcHJldkxpbmVTdGFydE9mZnNldCA9IC0xO1xuXG4gIHdoaWxlIChjdXJyT2Zmc2V0IDwgb2Zmc2V0KSB7XG4gICAgY29uc3QgYyA9IHN0ci5jaGFyQXQoY3Vyck9mZnNldCsrKTtcbiAgICBpZiAoYyA9PT0gJ1xcbicpIHtcbiAgICAgIGxpbmVOdW0rKztcbiAgICAgIGNvbE51bSA9IDE7XG4gICAgICBwcmV2TGluZVN0YXJ0T2Zmc2V0ID0gbGluZVN0YXJ0T2Zmc2V0O1xuICAgICAgbGluZVN0YXJ0T2Zmc2V0ID0gY3Vyck9mZnNldDtcbiAgICB9IGVsc2UgaWYgKGMgIT09ICdcXHInKSB7XG4gICAgICBjb2xOdW0rKztcbiAgICB9XG4gIH1cblxuICAvLyBGaW5kIHRoZSBlbmQgb2YgdGhlIHRhcmdldCBsaW5lLlxuICBsZXQgbGluZUVuZE9mZnNldCA9IHN0ci5pbmRleE9mKCdcXG4nLCBsaW5lU3RhcnRPZmZzZXQpO1xuICBpZiAobGluZUVuZE9mZnNldCA9PT0gLTEpIHtcbiAgICBsaW5lRW5kT2Zmc2V0ID0gc3RyLmxlbmd0aDtcbiAgfSBlbHNlIHtcbiAgICAvLyBHZXQgdGhlIG5leHQgbGluZS5cbiAgICBjb25zdCBuZXh0TGluZUVuZE9mZnNldCA9IHN0ci5pbmRleE9mKCdcXG4nLCBsaW5lRW5kT2Zmc2V0ICsgMSk7XG4gICAgbmV4dExpbmUgPVxuICAgICAgbmV4dExpbmVFbmRPZmZzZXQgPT09IC0xID9cbiAgICAgICAgc3RyLnNsaWNlKGxpbmVFbmRPZmZzZXQpIDpcbiAgICAgICAgc3RyLnNsaWNlKGxpbmVFbmRPZmZzZXQsIG5leHRMaW5lRW5kT2Zmc2V0KTtcbiAgICAvLyBTdHJpcCBsZWFkaW5nIGFuZCB0cmFpbGluZyBFT0wgY2hhcihzKS5cbiAgICBuZXh0TGluZSA9IG5leHRMaW5lLnJlcGxhY2UoL15cXHI/XFxuLywgJycpLnJlcGxhY2UoL1xcciQvLCAnJyk7XG4gIH1cblxuICAvLyBHZXQgdGhlIHByZXZpb3VzIGxpbmUuXG4gIGlmIChwcmV2TGluZVN0YXJ0T2Zmc2V0ID49IDApIHtcbiAgICAvLyBTdHJpcCB0cmFpbGluZyBFT0wgY2hhcihzKS5cbiAgICBwcmV2TGluZSA9IHN0ci5zbGljZShwcmV2TGluZVN0YXJ0T2Zmc2V0LCBsaW5lU3RhcnRPZmZzZXQpLnJlcGxhY2UoL1xccj9cXG4kLywgJycpO1xuICB9XG5cbiAgLy8gR2V0IHRoZSB0YXJnZXQgbGluZSwgc3RyaXBwaW5nIGEgdHJhaWxpbmcgY2FycmlhZ2UgcmV0dXJuIGlmIG5lY2Vzc2FyeS5cbiAgY29uc3QgbGluZSA9IHN0ci5zbGljZShsaW5lU3RhcnRPZmZzZXQsIGxpbmVFbmRPZmZzZXQpLnJlcGxhY2UoL1xcciQvLCAnJyk7XG5cbiAgcmV0dXJuIHtcbiAgICBvZmZzZXQsXG4gICAgbGluZU51bSxcbiAgICBjb2xOdW0sXG4gICAgbGluZSxcbiAgICBwcmV2TGluZSxcbiAgICBuZXh0TGluZSxcbiAgICB0b1N0cmluZzogbGluZUFuZENvbHVtblRvTWVzc2FnZSxcbiAgfTtcbn1cblxuLy8gUmV0dXJuIGEgbmljZWx5LWZvcm1hdHRlZCBzdHJpbmcgZGVzY3JpYmluZyB0aGUgbGluZSBhbmQgY29sdW1uIGZvciB0aGVcbi8vIGdpdmVuIG9mZnNldCBpbiBgc3RyYCBoaWdobGlnaHRpbmcgYHJhbmdlc2AuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TGluZUFuZENvbHVtbk1lc3NhZ2Uoc3RyLCBvZmZzZXQsIC4uLnJhbmdlcykge1xuICByZXR1cm4gZ2V0TGluZUFuZENvbHVtbihzdHIsIG9mZnNldCkudG9TdHJpbmcoLi4ucmFuZ2VzKTtcbn1cblxuZXhwb3J0IGNvbnN0IHVuaXF1ZUlkID0gKCgpID0+IHtcbiAgbGV0IGlkQ291bnRlciA9IDA7XG4gIHJldHVybiBwcmVmaXggPT4gJycgKyBwcmVmaXggKyBpZENvdW50ZXIrKztcbn0pKCk7XG4iLCJpbXBvcnQge2Fzc2VydH0gZnJvbSAnLi9jb21tb24uanMnO1xuaW1wb3J0ICogYXMgZXJyb3JzIGZyb20gJy4vZXJyb3JzLmpzJztcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAnLi91dGlsLmpzJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFByaXZhdGUgc3R1ZmZcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBjbGFzcyBJbnRlcnZhbCB7XG4gIGNvbnN0cnVjdG9yKHNvdXJjZVN0cmluZywgc3RhcnRJZHgsIGVuZElkeCkge1xuICAgIHRoaXMuc291cmNlU3RyaW5nID0gc291cmNlU3RyaW5nO1xuICAgIHRoaXMuc3RhcnRJZHggPSBzdGFydElkeDtcbiAgICB0aGlzLmVuZElkeCA9IGVuZElkeDtcbiAgfVxuXG4gIGdldCBjb250ZW50cygpIHtcbiAgICBpZiAodGhpcy5fY29udGVudHMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fY29udGVudHMgPSB0aGlzLnNvdXJjZVN0cmluZy5zbGljZSh0aGlzLnN0YXJ0SWR4LCB0aGlzLmVuZElkeCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jb250ZW50cztcbiAgfVxuXG4gIGdldCBsZW5ndGgoKSB7XG4gICAgcmV0dXJuIHRoaXMuZW5kSWR4IC0gdGhpcy5zdGFydElkeDtcbiAgfVxuXG4gIGNvdmVyYWdlV2l0aCguLi5pbnRlcnZhbHMpIHtcbiAgICByZXR1cm4gSW50ZXJ2YWwuY292ZXJhZ2UoLi4uaW50ZXJ2YWxzLCB0aGlzKTtcbiAgfVxuXG4gIGNvbGxhcHNlZExlZnQoKSB7XG4gICAgcmV0dXJuIG5ldyBJbnRlcnZhbCh0aGlzLnNvdXJjZVN0cmluZywgdGhpcy5zdGFydElkeCwgdGhpcy5zdGFydElkeCk7XG4gIH1cblxuICBjb2xsYXBzZWRSaWdodCgpIHtcbiAgICByZXR1cm4gbmV3IEludGVydmFsKHRoaXMuc291cmNlU3RyaW5nLCB0aGlzLmVuZElkeCwgdGhpcy5lbmRJZHgpO1xuICB9XG5cbiAgZ2V0TGluZUFuZENvbHVtbigpIHtcbiAgICByZXR1cm4gdXRpbC5nZXRMaW5lQW5kQ29sdW1uKHRoaXMuc291cmNlU3RyaW5nLCB0aGlzLnN0YXJ0SWR4KTtcbiAgfVxuXG4gIGdldExpbmVBbmRDb2x1bW5NZXNzYWdlKCkge1xuICAgIGNvbnN0IHJhbmdlID0gW3RoaXMuc3RhcnRJZHgsIHRoaXMuZW5kSWR4XTtcbiAgICByZXR1cm4gdXRpbC5nZXRMaW5lQW5kQ29sdW1uTWVzc2FnZSh0aGlzLnNvdXJjZVN0cmluZywgdGhpcy5zdGFydElkeCwgcmFuZ2UpO1xuICB9XG5cbiAgLy8gUmV0dXJucyBhbiBhcnJheSBvZiAwLCAxLCBvciAyIGludGVydmFscyB0aGF0IHJlcHJlc2VudHMgdGhlIHJlc3VsdCBvZiB0aGVcbiAgLy8gaW50ZXJ2YWwgZGlmZmVyZW5jZSBvcGVyYXRpb24uXG4gIG1pbnVzKHRoYXQpIHtcbiAgICBpZiAodGhpcy5zb3VyY2VTdHJpbmcgIT09IHRoYXQuc291cmNlU3RyaW5nKSB7XG4gICAgICB0aHJvdyBlcnJvcnMuaW50ZXJ2YWxTb3VyY2VzRG9udE1hdGNoKCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLnN0YXJ0SWR4ID09PSB0aGF0LnN0YXJ0SWR4ICYmIHRoaXMuZW5kSWR4ID09PSB0aGF0LmVuZElkeCkge1xuICAgICAgLy8gYHRoaXNgIGFuZCBgdGhhdGAgYXJlIHRoZSBzYW1lIGludGVydmFsIVxuICAgICAgcmV0dXJuIFtdO1xuICAgIH0gZWxzZSBpZiAodGhpcy5zdGFydElkeCA8IHRoYXQuc3RhcnRJZHggJiYgdGhhdC5lbmRJZHggPCB0aGlzLmVuZElkeCkge1xuICAgICAgLy8gYHRoYXRgIHNwbGl0cyBgdGhpc2AgaW50byB0d28gaW50ZXJ2YWxzXG4gICAgICByZXR1cm4gW1xuICAgICAgICBuZXcgSW50ZXJ2YWwodGhpcy5zb3VyY2VTdHJpbmcsIHRoaXMuc3RhcnRJZHgsIHRoYXQuc3RhcnRJZHgpLFxuICAgICAgICBuZXcgSW50ZXJ2YWwodGhpcy5zb3VyY2VTdHJpbmcsIHRoYXQuZW5kSWR4LCB0aGlzLmVuZElkeCksXG4gICAgICBdO1xuICAgIH0gZWxzZSBpZiAodGhpcy5zdGFydElkeCA8IHRoYXQuZW5kSWR4ICYmIHRoYXQuZW5kSWR4IDwgdGhpcy5lbmRJZHgpIHtcbiAgICAgIC8vIGB0aGF0YCBjb250YWlucyBhIHByZWZpeCBvZiBgdGhpc2BcbiAgICAgIHJldHVybiBbbmV3IEludGVydmFsKHRoaXMuc291cmNlU3RyaW5nLCB0aGF0LmVuZElkeCwgdGhpcy5lbmRJZHgpXTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuc3RhcnRJZHggPCB0aGF0LnN0YXJ0SWR4ICYmIHRoYXQuc3RhcnRJZHggPCB0aGlzLmVuZElkeCkge1xuICAgICAgLy8gYHRoYXRgIGNvbnRhaW5zIGEgc3VmZml4IG9mIGB0aGlzYFxuICAgICAgcmV0dXJuIFtuZXcgSW50ZXJ2YWwodGhpcy5zb3VyY2VTdHJpbmcsIHRoaXMuc3RhcnRJZHgsIHRoYXQuc3RhcnRJZHgpXTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gYHRoYXRgIGFuZCBgdGhpc2AgZG8gbm90IG92ZXJsYXBcbiAgICAgIHJldHVybiBbdGhpc107XG4gICAgfVxuICB9XG5cbiAgLy8gUmV0dXJucyBhIG5ldyBJbnRlcnZhbCB0aGF0IGhhcyB0aGUgc2FtZSBleHRlbnQgYXMgdGhpcyBvbmUsIGJ1dCB3aGljaCBpcyByZWxhdGl2ZVxuICAvLyB0byBgdGhhdGAsIGFuIEludGVydmFsIHRoYXQgZnVsbHkgY292ZXJzIHRoaXMgb25lLlxuICByZWxhdGl2ZVRvKHRoYXQpIHtcbiAgICBpZiAodGhpcy5zb3VyY2VTdHJpbmcgIT09IHRoYXQuc291cmNlU3RyaW5nKSB7XG4gICAgICB0aHJvdyBlcnJvcnMuaW50ZXJ2YWxTb3VyY2VzRG9udE1hdGNoKCk7XG4gICAgfVxuICAgIGFzc2VydChcbiAgICAgICAgdGhpcy5zdGFydElkeCA+PSB0aGF0LnN0YXJ0SWR4ICYmIHRoaXMuZW5kSWR4IDw9IHRoYXQuZW5kSWR4LFxuICAgICAgICAnb3RoZXIgaW50ZXJ2YWwgZG9lcyBub3QgY292ZXIgdGhpcyBvbmUnLFxuICAgICk7XG4gICAgcmV0dXJuIG5ldyBJbnRlcnZhbChcbiAgICAgICAgdGhpcy5zb3VyY2VTdHJpbmcsXG4gICAgICAgIHRoaXMuc3RhcnRJZHggLSB0aGF0LnN0YXJ0SWR4LFxuICAgICAgICB0aGlzLmVuZElkeCAtIHRoYXQuc3RhcnRJZHgsXG4gICAgKTtcbiAgfVxuXG4gIC8vIFJldHVybnMgYSBuZXcgSW50ZXJ2YWwgd2hpY2ggY29udGFpbnMgdGhlIHNhbWUgY29udGVudHMgYXMgdGhpcyBvbmUsXG4gIC8vIGJ1dCB3aXRoIHdoaXRlc3BhY2UgdHJpbW1lZCBmcm9tIGJvdGggZW5kcy5cbiAgdHJpbW1lZCgpIHtcbiAgICBjb25zdCB7Y29udGVudHN9ID0gdGhpcztcbiAgICBjb25zdCBzdGFydElkeCA9IHRoaXMuc3RhcnRJZHggKyBjb250ZW50cy5tYXRjaCgvXlxccyovKVswXS5sZW5ndGg7XG4gICAgY29uc3QgZW5kSWR4ID0gdGhpcy5lbmRJZHggLSBjb250ZW50cy5tYXRjaCgvXFxzKiQvKVswXS5sZW5ndGg7XG4gICAgcmV0dXJuIG5ldyBJbnRlcnZhbCh0aGlzLnNvdXJjZVN0cmluZywgc3RhcnRJZHgsIGVuZElkeCk7XG4gIH1cblxuICBzdWJJbnRlcnZhbChvZmZzZXQsIGxlbikge1xuICAgIGNvbnN0IG5ld1N0YXJ0SWR4ID0gdGhpcy5zdGFydElkeCArIG9mZnNldDtcbiAgICByZXR1cm4gbmV3IEludGVydmFsKHRoaXMuc291cmNlU3RyaW5nLCBuZXdTdGFydElkeCwgbmV3U3RhcnRJZHggKyBsZW4pO1xuICB9XG59XG5cbkludGVydmFsLmNvdmVyYWdlID0gZnVuY3Rpb24oZmlyc3RJbnRlcnZhbCwgLi4uaW50ZXJ2YWxzKSB7XG4gIGxldCB7c3RhcnRJZHgsIGVuZElkeH0gPSBmaXJzdEludGVydmFsO1xuICBmb3IgKGNvbnN0IGludGVydmFsIG9mIGludGVydmFscykge1xuICAgIGlmIChpbnRlcnZhbC5zb3VyY2VTdHJpbmcgIT09IGZpcnN0SW50ZXJ2YWwuc291cmNlU3RyaW5nKSB7XG4gICAgICB0aHJvdyBlcnJvcnMuaW50ZXJ2YWxTb3VyY2VzRG9udE1hdGNoKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXJ0SWR4ID0gTWF0aC5taW4oc3RhcnRJZHgsIGludGVydmFsLnN0YXJ0SWR4KTtcbiAgICAgIGVuZElkeCA9IE1hdGgubWF4KGVuZElkeCwgaW50ZXJ2YWwuZW5kSWR4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5ldyBJbnRlcnZhbChmaXJzdEludGVydmFsLnNvdXJjZVN0cmluZywgc3RhcnRJZHgsIGVuZElkeCk7XG59O1xuIiwiaW1wb3J0IHtJbnRlcnZhbH0gZnJvbSAnLi9JbnRlcnZhbC5qcyc7XG5cbmNvbnN0IE1BWF9DSEFSX0NPREUgPSAweGZmZmY7XG5cbmV4cG9ydCBjbGFzcyBJbnB1dFN0cmVhbSB7XG4gIGNvbnN0cnVjdG9yKHNvdXJjZSkge1xuICAgIHRoaXMuc291cmNlID0gc291cmNlO1xuICAgIHRoaXMucG9zID0gMDtcbiAgICB0aGlzLmV4YW1pbmVkTGVuZ3RoID0gMDtcbiAgfVxuXG4gIGF0RW5kKCkge1xuICAgIGNvbnN0IGFucyA9IHRoaXMucG9zID49IHRoaXMuc291cmNlLmxlbmd0aDtcbiAgICB0aGlzLmV4YW1pbmVkTGVuZ3RoID0gTWF0aC5tYXgodGhpcy5leGFtaW5lZExlbmd0aCwgdGhpcy5wb3MgKyAxKTtcbiAgICByZXR1cm4gYW5zO1xuICB9XG5cbiAgbmV4dCgpIHtcbiAgICBjb25zdCBhbnMgPSB0aGlzLnNvdXJjZVt0aGlzLnBvcysrXTtcbiAgICB0aGlzLmV4YW1pbmVkTGVuZ3RoID0gTWF0aC5tYXgodGhpcy5leGFtaW5lZExlbmd0aCwgdGhpcy5wb3MpO1xuICAgIHJldHVybiBhbnM7XG4gIH1cblxuICBuZXh0Q2hhckNvZGUoKSB7XG4gICAgY29uc3QgbmV4dENoYXIgPSB0aGlzLm5leHQoKTtcbiAgICByZXR1cm4gbmV4dENoYXIgJiYgbmV4dENoYXIuY2hhckNvZGVBdCgwKTtcbiAgfVxuXG4gIG5leHRDb2RlUG9pbnQoKSB7XG4gICAgY29uc3QgY3AgPSB0aGlzLnNvdXJjZS5zbGljZSh0aGlzLnBvcysrKS5jb2RlUG9pbnRBdCgwKTtcbiAgICAvLyBJZiB0aGUgY29kZSBwb2ludCBpcyBiZXlvbmQgcGxhbmUgMCwgaXQgdGFrZXMgdXAgdHdvIGNoYXJhY3RlcnMuXG4gICAgaWYgKGNwID4gTUFYX0NIQVJfQ09ERSkge1xuICAgICAgdGhpcy5wb3MgKz0gMTtcbiAgICB9XG4gICAgdGhpcy5leGFtaW5lZExlbmd0aCA9IE1hdGgubWF4KHRoaXMuZXhhbWluZWRMZW5ndGgsIHRoaXMucG9zKTtcbiAgICByZXR1cm4gY3A7XG4gIH1cblxuICBtYXRjaFN0cmluZyhzLCBvcHRJZ25vcmVDYXNlKSB7XG4gICAgbGV0IGlkeDtcbiAgICBpZiAob3B0SWdub3JlQ2FzZSkge1xuICAgICAgLypcbiAgICAgICAgQ2FzZS1pbnNlbnNpdGl2ZSBjb21wYXJpc29uIGlzIGEgdHJpY2t5IGJ1c2luZXNzLiBTb21lIG5vdGFibGUgZ290Y2hhcyBpbmNsdWRlIHRoZVxuICAgICAgICBcIlR1cmtpc2ggSVwiIHByb2JsZW0gKGh0dHA6Ly93d3cuaTE4bmd1eS5jb20vdW5pY29kZS90dXJraXNoLWkxOG4uaHRtbCkgYW5kIHRoZSBmYWN0XG4gICAgICAgIHRoYXQgdGhlIEdlcm1hbiBFc3N6ZXQgKMOfKSB0dXJucyBpbnRvIFwiU1NcIiBpbiB1cHBlciBjYXNlLlxuXG4gICAgICAgIFRoaXMgaXMgaW50ZW5kZWQgdG8gYmUgYSBsb2NhbGUtaW52YXJpYW50IGNvbXBhcmlzb24sIHdoaWNoIG1lYW5zIGl0IG1heSBub3Qgb2JleVxuICAgICAgICBsb2NhbGUtc3BlY2lmaWMgZXhwZWN0YXRpb25zIChlLmcuIFwiaVwiID0+IFwixLBcIikuXG4gICAgICAgKi9cbiAgICAgIGZvciAoaWR4ID0gMDsgaWR4IDwgcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgICAgIGNvbnN0IGFjdHVhbCA9IHRoaXMubmV4dCgpO1xuICAgICAgICBjb25zdCBleHBlY3RlZCA9IHNbaWR4XTtcbiAgICAgICAgaWYgKGFjdHVhbCA9PSBudWxsIHx8IGFjdHVhbC50b1VwcGVyQ2FzZSgpICE9PSBleHBlY3RlZC50b1VwcGVyQ2FzZSgpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy8gRGVmYXVsdCBpcyBjYXNlLXNlbnNpdGl2ZSBjb21wYXJpc29uLlxuICAgIGZvciAoaWR4ID0gMDsgaWR4IDwgcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgICBpZiAodGhpcy5uZXh0KCkgIT09IHNbaWR4XSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgc291cmNlU2xpY2Uoc3RhcnRJZHgsIGVuZElkeCkge1xuICAgIHJldHVybiB0aGlzLnNvdXJjZS5zbGljZShzdGFydElkeCwgZW5kSWR4KTtcbiAgfVxuXG4gIGludGVydmFsKHN0YXJ0SWR4LCBvcHRFbmRJZHgpIHtcbiAgICByZXR1cm4gbmV3IEludGVydmFsKHRoaXMuc291cmNlLCBzdGFydElkeCwgb3B0RW5kSWR4ID8gb3B0RW5kSWR4IDogdGhpcy5wb3MpO1xuICB9XG59XG4iLCJpbXBvcnQgKiBhcyBjb21tb24gZnJvbSAnLi9jb21tb24uanMnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHtJbnRlcnZhbH0gZnJvbSAnLi9JbnRlcnZhbC5qcyc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBQcml2YXRlIHN0dWZmXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgY2xhc3MgTWF0Y2hSZXN1bHQge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIG1hdGNoZXIsXG4gICAgICBpbnB1dCxcbiAgICAgIHN0YXJ0RXhwcixcbiAgICAgIGNzdCxcbiAgICAgIGNzdE9mZnNldCxcbiAgICAgIHJpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvbixcbiAgICAgIG9wdFJlY29yZGVkRmFpbHVyZXMsXG4gICkge1xuICAgIHRoaXMubWF0Y2hlciA9IG1hdGNoZXI7XG4gICAgdGhpcy5pbnB1dCA9IGlucHV0O1xuICAgIHRoaXMuc3RhcnRFeHByID0gc3RhcnRFeHByO1xuICAgIHRoaXMuX2NzdCA9IGNzdDtcbiAgICB0aGlzLl9jc3RPZmZzZXQgPSBjc3RPZmZzZXQ7XG4gICAgdGhpcy5fcmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uID0gcmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uO1xuICAgIHRoaXMuX3JpZ2h0bW9zdEZhaWx1cmVzID0gb3B0UmVjb3JkZWRGYWlsdXJlcztcblxuICAgIGlmICh0aGlzLmZhaWxlZCgpKSB7XG4gICAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby1pbnZhbGlkLXRoaXMgKi9cbiAgICAgIGNvbW1vbi5kZWZpbmVMYXp5UHJvcGVydHkodGhpcywgJ21lc3NhZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgZGV0YWlsID0gJ0V4cGVjdGVkICcgKyB0aGlzLmdldEV4cGVjdGVkVGV4dCgpO1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgIHV0aWwuZ2V0TGluZUFuZENvbHVtbk1lc3NhZ2UodGhpcy5pbnB1dCwgdGhpcy5nZXRSaWdodG1vc3RGYWlsdXJlUG9zaXRpb24oKSkgKyBkZXRhaWxcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuICAgICAgY29tbW9uLmRlZmluZUxhenlQcm9wZXJ0eSh0aGlzLCAnc2hvcnRNZXNzYWdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IGRldGFpbCA9ICdleHBlY3RlZCAnICsgdGhpcy5nZXRFeHBlY3RlZFRleHQoKTtcbiAgICAgICAgY29uc3QgZXJyb3JJbmZvID0gdXRpbC5nZXRMaW5lQW5kQ29sdW1uKFxuICAgICAgICAgICAgdGhpcy5pbnB1dCxcbiAgICAgICAgICAgIHRoaXMuZ2V0UmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uKCksXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiAnTGluZSAnICsgZXJyb3JJbmZvLmxpbmVOdW0gKyAnLCBjb2wgJyArIGVycm9ySW5mby5jb2xOdW0gKyAnOiAnICsgZGV0YWlsO1xuICAgICAgfSk7XG4gICAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLWludmFsaWQtdGhpcyAqL1xuICAgIH1cbiAgfVxuXG4gIHN1Y2NlZWRlZCgpIHtcbiAgICByZXR1cm4gISF0aGlzLl9jc3Q7XG4gIH1cblxuICBmYWlsZWQoKSB7XG4gICAgcmV0dXJuICF0aGlzLnN1Y2NlZWRlZCgpO1xuICB9XG5cbiAgZ2V0UmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9yaWdodG1vc3RGYWlsdXJlUG9zaXRpb247XG4gIH1cblxuICBnZXRSaWdodG1vc3RGYWlsdXJlcygpIHtcbiAgICBpZiAoIXRoaXMuX3JpZ2h0bW9zdEZhaWx1cmVzKSB7XG4gICAgICB0aGlzLm1hdGNoZXIuc2V0SW5wdXQodGhpcy5pbnB1dCk7XG4gICAgICBjb25zdCBtYXRjaFJlc3VsdFdpdGhGYWlsdXJlcyA9IHRoaXMubWF0Y2hlci5fbWF0Y2godGhpcy5zdGFydEV4cHIsIHtcbiAgICAgICAgdHJhY2luZzogZmFsc2UsXG4gICAgICAgIHBvc2l0aW9uVG9SZWNvcmRGYWlsdXJlczogdGhpcy5nZXRSaWdodG1vc3RGYWlsdXJlUG9zaXRpb24oKSxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5fcmlnaHRtb3N0RmFpbHVyZXMgPSBtYXRjaFJlc3VsdFdpdGhGYWlsdXJlcy5nZXRSaWdodG1vc3RGYWlsdXJlcygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcmlnaHRtb3N0RmFpbHVyZXM7XG4gIH1cblxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5zdWNjZWVkZWQoKSA/XG4gICAgICAnW21hdGNoIHN1Y2NlZWRlZF0nIDpcbiAgICAgICdbbWF0Y2ggZmFpbGVkIGF0IHBvc2l0aW9uICcgKyB0aGlzLmdldFJpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvbigpICsgJ10nO1xuICB9XG5cbiAgLy8gUmV0dXJuIGEgc3RyaW5nIHN1bW1hcml6aW5nIHRoZSBleHBlY3RlZCBjb250ZW50cyBvZiB0aGUgaW5wdXQgc3RyZWFtIHdoZW5cbiAgLy8gdGhlIG1hdGNoIGZhaWx1cmUgb2NjdXJyZWQuXG4gIGdldEV4cGVjdGVkVGV4dCgpIHtcbiAgICBpZiAodGhpcy5zdWNjZWVkZWQoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgZ2V0IGV4cGVjdGVkIHRleHQgb2YgYSBzdWNjZXNzZnVsIE1hdGNoUmVzdWx0Jyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2IgPSBuZXcgY29tbW9uLlN0cmluZ0J1ZmZlcigpO1xuICAgIGxldCBmYWlsdXJlcyA9IHRoaXMuZ2V0UmlnaHRtb3N0RmFpbHVyZXMoKTtcblxuICAgIC8vIEZpbHRlciBvdXQgdGhlIGZsdWZmeSBmYWlsdXJlcyB0byBtYWtlIHRoZSBkZWZhdWx0IGVycm9yIG1lc3NhZ2VzIG1vcmUgdXNlZnVsXG4gICAgZmFpbHVyZXMgPSBmYWlsdXJlcy5maWx0ZXIoZmFpbHVyZSA9PiAhZmFpbHVyZS5pc0ZsdWZmeSgpKTtcblxuICAgIGZvciAobGV0IGlkeCA9IDA7IGlkeCA8IGZhaWx1cmVzLmxlbmd0aDsgaWR4KyspIHtcbiAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgIGlmIChpZHggPT09IGZhaWx1cmVzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICBzYi5hcHBlbmQoZmFpbHVyZXMubGVuZ3RoID4gMiA/ICcsIG9yICcgOiAnIG9yICcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNiLmFwcGVuZCgnLCAnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc2IuYXBwZW5kKGZhaWx1cmVzW2lkeF0udG9TdHJpbmcoKSk7XG4gICAgfVxuICAgIHJldHVybiBzYi5jb250ZW50cygpO1xuICB9XG5cbiAgZ2V0SW50ZXJ2YWwoKSB7XG4gICAgY29uc3QgcG9zID0gdGhpcy5nZXRSaWdodG1vc3RGYWlsdXJlUG9zaXRpb24oKTtcbiAgICByZXR1cm4gbmV3IEludGVydmFsKHRoaXMuaW5wdXQsIHBvcywgcG9zKTtcbiAgfVxufVxuIiwiZXhwb3J0IGNsYXNzIFBvc0luZm8ge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmFwcGxpY2F0aW9uTWVtb0tleVN0YWNrID0gW107IC8vIGFjdGl2ZSBhcHBsaWNhdGlvbnMgYXQgdGhpcyBwb3NpdGlvblxuICAgIHRoaXMubWVtbyA9IHt9O1xuICAgIHRoaXMubWF4RXhhbWluZWRMZW5ndGggPSAwO1xuICAgIHRoaXMubWF4UmlnaHRtb3N0RmFpbHVyZU9mZnNldCA9IC0xO1xuICAgIHRoaXMuY3VycmVudExlZnRSZWN1cnNpb24gPSB1bmRlZmluZWQ7XG4gIH1cblxuICBpc0FjdGl2ZShhcHBsaWNhdGlvbikge1xuICAgIHJldHVybiB0aGlzLmFwcGxpY2F0aW9uTWVtb0tleVN0YWNrLmluZGV4T2YoYXBwbGljYXRpb24udG9NZW1vS2V5KCkpID49IDA7XG4gIH1cblxuICBlbnRlcihhcHBsaWNhdGlvbikge1xuICAgIHRoaXMuYXBwbGljYXRpb25NZW1vS2V5U3RhY2sucHVzaChhcHBsaWNhdGlvbi50b01lbW9LZXkoKSk7XG4gIH1cblxuICBleGl0KCkge1xuICAgIHRoaXMuYXBwbGljYXRpb25NZW1vS2V5U3RhY2sucG9wKCk7XG4gIH1cblxuICBzdGFydExlZnRSZWN1cnNpb24oaGVhZEFwcGxpY2F0aW9uLCBtZW1vUmVjKSB7XG4gICAgbWVtb1JlYy5pc0xlZnRSZWN1cnNpb24gPSB0cnVlO1xuICAgIG1lbW9SZWMuaGVhZEFwcGxpY2F0aW9uID0gaGVhZEFwcGxpY2F0aW9uO1xuICAgIG1lbW9SZWMubmV4dExlZnRSZWN1cnNpb24gPSB0aGlzLmN1cnJlbnRMZWZ0UmVjdXJzaW9uO1xuICAgIHRoaXMuY3VycmVudExlZnRSZWN1cnNpb24gPSBtZW1vUmVjO1xuXG4gICAgY29uc3Qge2FwcGxpY2F0aW9uTWVtb0tleVN0YWNrfSA9IHRoaXM7XG4gICAgY29uc3QgaW5kZXhPZkZpcnN0SW52b2x2ZWRSdWxlID1cbiAgICAgIGFwcGxpY2F0aW9uTWVtb0tleVN0YWNrLmluZGV4T2YoaGVhZEFwcGxpY2F0aW9uLnRvTWVtb0tleSgpKSArIDE7XG4gICAgY29uc3QgaW52b2x2ZWRBcHBsaWNhdGlvbk1lbW9LZXlzID0gYXBwbGljYXRpb25NZW1vS2V5U3RhY2suc2xpY2UoXG4gICAgICAgIGluZGV4T2ZGaXJzdEludm9sdmVkUnVsZSxcbiAgICApO1xuXG4gICAgbWVtb1JlYy5pc0ludm9sdmVkID0gZnVuY3Rpb24oYXBwbGljYXRpb25NZW1vS2V5KSB7XG4gICAgICByZXR1cm4gaW52b2x2ZWRBcHBsaWNhdGlvbk1lbW9LZXlzLmluZGV4T2YoYXBwbGljYXRpb25NZW1vS2V5KSA+PSAwO1xuICAgIH07XG5cbiAgICBtZW1vUmVjLnVwZGF0ZUludm9sdmVkQXBwbGljYXRpb25NZW1vS2V5cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgZm9yIChsZXQgaWR4ID0gaW5kZXhPZkZpcnN0SW52b2x2ZWRSdWxlOyBpZHggPCBhcHBsaWNhdGlvbk1lbW9LZXlTdGFjay5sZW5ndGg7IGlkeCsrKSB7XG4gICAgICAgIGNvbnN0IGFwcGxpY2F0aW9uTWVtb0tleSA9IGFwcGxpY2F0aW9uTWVtb0tleVN0YWNrW2lkeF07XG4gICAgICAgIGlmICghdGhpcy5pc0ludm9sdmVkKGFwcGxpY2F0aW9uTWVtb0tleSkpIHtcbiAgICAgICAgICBpbnZvbHZlZEFwcGxpY2F0aW9uTWVtb0tleXMucHVzaChhcHBsaWNhdGlvbk1lbW9LZXkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGVuZExlZnRSZWN1cnNpb24oKSB7XG4gICAgdGhpcy5jdXJyZW50TGVmdFJlY3Vyc2lvbiA9IHRoaXMuY3VycmVudExlZnRSZWN1cnNpb24ubmV4dExlZnRSZWN1cnNpb247XG4gIH1cblxuICAvLyBOb3RlOiB0aGlzIG1ldGhvZCBkb2Vzbid0IGdldCBjYWxsZWQgZm9yIHRoZSBcImhlYWRcIiBvZiBhIGxlZnQgcmVjdXJzaW9uIC0tIGZvciBMUiBoZWFkcyxcbiAgLy8gdGhlIG1lbW9pemVkIHJlc3VsdCAod2hpY2ggc3RhcnRzIG91dCBiZWluZyBhIGZhaWx1cmUpIGlzIGFsd2F5cyB1c2VkLlxuICBzaG91bGRVc2VNZW1vaXplZFJlc3VsdChtZW1vUmVjKSB7XG4gICAgaWYgKCFtZW1vUmVjLmlzTGVmdFJlY3Vyc2lvbikge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGNvbnN0IHthcHBsaWNhdGlvbk1lbW9LZXlTdGFja30gPSB0aGlzO1xuICAgIGZvciAobGV0IGlkeCA9IDA7IGlkeCA8IGFwcGxpY2F0aW9uTWVtb0tleVN0YWNrLmxlbmd0aDsgaWR4KyspIHtcbiAgICAgIGNvbnN0IGFwcGxpY2F0aW9uTWVtb0tleSA9IGFwcGxpY2F0aW9uTWVtb0tleVN0YWNrW2lkeF07XG4gICAgICBpZiAobWVtb1JlYy5pc0ludm9sdmVkKGFwcGxpY2F0aW9uTWVtb0tleSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIG1lbW9pemUobWVtb0tleSwgbWVtb1JlYykge1xuICAgIHRoaXMubWVtb1ttZW1vS2V5XSA9IG1lbW9SZWM7XG4gICAgdGhpcy5tYXhFeGFtaW5lZExlbmd0aCA9IE1hdGgubWF4KHRoaXMubWF4RXhhbWluZWRMZW5ndGgsIG1lbW9SZWMuZXhhbWluZWRMZW5ndGgpO1xuICAgIHRoaXMubWF4UmlnaHRtb3N0RmFpbHVyZU9mZnNldCA9IE1hdGgubWF4KFxuICAgICAgICB0aGlzLm1heFJpZ2h0bW9zdEZhaWx1cmVPZmZzZXQsXG4gICAgICAgIG1lbW9SZWMucmlnaHRtb3N0RmFpbHVyZU9mZnNldCxcbiAgICApO1xuICAgIHJldHVybiBtZW1vUmVjO1xuICB9XG5cbiAgY2xlYXJPYnNvbGV0ZUVudHJpZXMocG9zLCBpbnZhbGlkYXRlZElkeCkge1xuICAgIGlmIChwb3MgKyB0aGlzLm1heEV4YW1pbmVkTGVuZ3RoIDw9IGludmFsaWRhdGVkSWR4KSB7XG4gICAgICAvLyBPcHRpbWl6YXRpb246IG5vbmUgb2YgdGhlIHJ1bGUgYXBwbGljYXRpb25zIHRoYXQgd2VyZSBtZW1vaXplZCBoZXJlIGV4YW1pbmVkIHRoZVxuICAgICAgLy8gaW50ZXJ2YWwgb2YgdGhlIGlucHV0IHRoYXQgY2hhbmdlZCwgc28gbm90aGluZyBoYXMgdG8gYmUgaW52YWxpZGF0ZWQuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qge21lbW99ID0gdGhpcztcbiAgICB0aGlzLm1heEV4YW1pbmVkTGVuZ3RoID0gMDtcbiAgICB0aGlzLm1heFJpZ2h0bW9zdEZhaWx1cmVPZmZzZXQgPSAtMTtcbiAgICBPYmplY3Qua2V5cyhtZW1vKS5mb3JFYWNoKGsgPT4ge1xuICAgICAgY29uc3QgbWVtb1JlYyA9IG1lbW9ba107XG4gICAgICBpZiAocG9zICsgbWVtb1JlYy5leGFtaW5lZExlbmd0aCA+IGludmFsaWRhdGVkSWR4KSB7XG4gICAgICAgIGRlbGV0ZSBtZW1vW2tdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5tYXhFeGFtaW5lZExlbmd0aCA9IE1hdGgubWF4KHRoaXMubWF4RXhhbWluZWRMZW5ndGgsIG1lbW9SZWMuZXhhbWluZWRMZW5ndGgpO1xuICAgICAgICB0aGlzLm1heFJpZ2h0bW9zdEZhaWx1cmVPZmZzZXQgPSBNYXRoLm1heChcbiAgICAgICAgICAgIHRoaXMubWF4UmlnaHRtb3N0RmFpbHVyZU9mZnNldCxcbiAgICAgICAgICAgIG1lbW9SZWMucmlnaHRtb3N0RmFpbHVyZU9mZnNldCxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuIiwiaW1wb3J0IHtJbnRlcnZhbH0gZnJvbSAnLi9JbnRlcnZhbC5qcyc7XG5pbXBvcnQgKiBhcyBjb21tb24gZnJvbSAnLi9jb21tb24uanMnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUHJpdmF0ZSBzdHVmZlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gVW5pY29kZSBjaGFyYWN0ZXJzIHRoYXQgYXJlIHVzZWQgaW4gdGhlIGB0b1N0cmluZ2Agb3V0cHV0LlxuY29uc3QgQkFMTE9UX1ggPSAnXFx1MjcxNyc7XG5jb25zdCBDSEVDS19NQVJLID0gJ1xcdTI3MTMnO1xuY29uc3QgRE9UX09QRVJBVE9SID0gJ1xcdTIyQzUnO1xuY29uc3QgUklHSFRXQVJEU19ET1VCTEVfQVJST1cgPSAnXFx1MjFEMic7XG5jb25zdCBTWU1CT0xfRk9SX0hPUklaT05UQUxfVEFCVUxBVElPTiA9ICdcXHUyNDA5JztcbmNvbnN0IFNZTUJPTF9GT1JfTElORV9GRUVEID0gJ1xcdTI0MEEnO1xuY29uc3QgU1lNQk9MX0ZPUl9DQVJSSUFHRV9SRVRVUk4gPSAnXFx1MjQwRCc7XG5cbmNvbnN0IEZsYWdzID0ge1xuICBzdWNjZWVkZWQ6IDEgPDwgMCxcbiAgaXNSb290Tm9kZTogMSA8PCAxLFxuICBpc0ltcGxpY2l0U3BhY2VzOiAxIDw8IDIsXG4gIGlzTWVtb2l6ZWQ6IDEgPDwgMyxcbiAgaXNIZWFkT2ZMZWZ0UmVjdXJzaW9uOiAxIDw8IDQsXG4gIHRlcm1pbmF0ZXNMUjogMSA8PCA1LFxufTtcblxuZnVuY3Rpb24gc3BhY2VzKG4pIHtcbiAgcmV0dXJuIGNvbW1vbi5yZXBlYXQoJyAnLCBuKS5qb2luKCcnKTtcbn1cblxuLy8gUmV0dXJuIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGEgcG9ydGlvbiBvZiBgaW5wdXRgIGF0IG9mZnNldCBgcG9zYC5cbi8vIFRoZSByZXN1bHQgd2lsbCBjb250YWluIGV4YWN0bHkgYGxlbmAgY2hhcmFjdGVycy5cbmZ1bmN0aW9uIGdldElucHV0RXhjZXJwdChpbnB1dCwgcG9zLCBsZW4pIHtcbiAgY29uc3QgZXhjZXJwdCA9IGFzRXNjYXBlZFN0cmluZyhpbnB1dC5zbGljZShwb3MsIHBvcyArIGxlbikpO1xuXG4gIC8vIFBhZCB0aGUgb3V0cHV0IGlmIG5lY2Vzc2FyeS5cbiAgaWYgKGV4Y2VycHQubGVuZ3RoIDwgbGVuKSB7XG4gICAgcmV0dXJuIGV4Y2VycHQgKyBjb21tb24ucmVwZWF0KCcgJywgbGVuIC0gZXhjZXJwdC5sZW5ndGgpLmpvaW4oJycpO1xuICB9XG4gIHJldHVybiBleGNlcnB0O1xufVxuXG5mdW5jdGlvbiBhc0VzY2FwZWRTdHJpbmcob2JqKSB7XG4gIGlmICh0eXBlb2Ygb2JqID09PSAnc3RyaW5nJykge1xuICAgIC8vIFJlcGxhY2Ugbm9uLXByaW50YWJsZSBjaGFyYWN0ZXJzIHdpdGggdmlzaWJsZSBzeW1ib2xzLlxuICAgIHJldHVybiBvYmpcbiAgICAgICAgLnJlcGxhY2UoLyAvZywgRE9UX09QRVJBVE9SKVxuICAgICAgICAucmVwbGFjZSgvXFx0L2csIFNZTUJPTF9GT1JfSE9SSVpPTlRBTF9UQUJVTEFUSU9OKVxuICAgICAgICAucmVwbGFjZSgvXFxuL2csIFNZTUJPTF9GT1JfTElORV9GRUVEKVxuICAgICAgICAucmVwbGFjZSgvXFxyL2csIFNZTUJPTF9GT1JfQ0FSUklBR0VfUkVUVVJOKTtcbiAgfVxuICByZXR1cm4gU3RyaW5nKG9iaik7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tIFRyYWNlIC0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBjbGFzcyBUcmFjZSB7XG4gIGNvbnN0cnVjdG9yKGlucHV0LCBwb3MxLCBwb3MyLCBleHByLCBzdWNjZWVkZWQsIGJpbmRpbmdzLCBvcHRDaGlsZHJlbikge1xuICAgIHRoaXMuaW5wdXQgPSBpbnB1dDtcbiAgICB0aGlzLnBvcyA9IHRoaXMucG9zMSA9IHBvczE7XG4gICAgdGhpcy5wb3MyID0gcG9zMjtcbiAgICB0aGlzLnNvdXJjZSA9IG5ldyBJbnRlcnZhbChpbnB1dCwgcG9zMSwgcG9zMik7XG4gICAgdGhpcy5leHByID0gZXhwcjtcbiAgICB0aGlzLmJpbmRpbmdzID0gYmluZGluZ3M7XG4gICAgdGhpcy5jaGlsZHJlbiA9IG9wdENoaWxkcmVuIHx8IFtdO1xuICAgIHRoaXMudGVybWluYXRpbmdMUkVudHJ5ID0gbnVsbDtcblxuICAgIHRoaXMuX2ZsYWdzID0gc3VjY2VlZGVkID8gRmxhZ3Muc3VjY2VlZGVkIDogMDtcbiAgfVxuXG4gIGdldCBkaXNwbGF5U3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLmV4cHIudG9EaXNwbGF5U3RyaW5nKCk7XG4gIH1cblxuICBjbG9uZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jbG9uZVdpdGhFeHByKHRoaXMuZXhwcik7XG4gIH1cblxuICBjbG9uZVdpdGhFeHByKGV4cHIpIHtcbiAgICBjb25zdCBhbnMgPSBuZXcgVHJhY2UoXG4gICAgICAgIHRoaXMuaW5wdXQsXG4gICAgICAgIHRoaXMucG9zLFxuICAgICAgICB0aGlzLnBvczIsXG4gICAgICAgIGV4cHIsXG4gICAgICAgIHRoaXMuc3VjY2VlZGVkLFxuICAgICAgICB0aGlzLmJpbmRpbmdzLFxuICAgICAgICB0aGlzLmNoaWxkcmVuLFxuICAgICk7XG5cbiAgICBhbnMuaXNIZWFkT2ZMZWZ0UmVjdXJzaW9uID0gdGhpcy5pc0hlYWRPZkxlZnRSZWN1cnNpb247XG4gICAgYW5zLmlzSW1wbGljaXRTcGFjZXMgPSB0aGlzLmlzSW1wbGljaXRTcGFjZXM7XG4gICAgYW5zLmlzTWVtb2l6ZWQgPSB0aGlzLmlzTWVtb2l6ZWQ7XG4gICAgYW5zLmlzUm9vdE5vZGUgPSB0aGlzLmlzUm9vdE5vZGU7XG4gICAgYW5zLnRlcm1pbmF0ZXNMUiA9IHRoaXMudGVybWluYXRlc0xSO1xuICAgIGFucy50ZXJtaW5hdGluZ0xSRW50cnkgPSB0aGlzLnRlcm1pbmF0aW5nTFJFbnRyeTtcbiAgICByZXR1cm4gYW5zO1xuICB9XG5cbiAgLy8gUmVjb3JkIHRoZSB0cmFjZSBpbmZvcm1hdGlvbiBmb3IgdGhlIHRlcm1pbmF0aW5nIGNvbmRpdGlvbiBvZiB0aGUgTFIgbG9vcC5cbiAgcmVjb3JkTFJUZXJtaW5hdGlvbihydWxlQm9keVRyYWNlLCB2YWx1ZSkge1xuICAgIHRoaXMudGVybWluYXRpbmdMUkVudHJ5ID0gbmV3IFRyYWNlKFxuICAgICAgICB0aGlzLmlucHV0LFxuICAgICAgICB0aGlzLnBvcyxcbiAgICAgICAgdGhpcy5wb3MyLFxuICAgICAgICB0aGlzLmV4cHIsXG4gICAgICAgIGZhbHNlLFxuICAgICAgICBbdmFsdWVdLFxuICAgICAgICBbcnVsZUJvZHlUcmFjZV0sXG4gICAgKTtcbiAgICB0aGlzLnRlcm1pbmF0aW5nTFJFbnRyeS50ZXJtaW5hdGVzTFIgPSB0cnVlO1xuICB9XG5cbiAgLy8gUmVjdXJzaXZlbHkgdHJhdmVyc2UgdGhpcyB0cmFjZSBub2RlIGFuZCBhbGwgaXRzIGRlc2NlbmRlbnRzLCBjYWxsaW5nIGEgdmlzaXRvciBmdW5jdGlvblxuICAvLyBmb3IgZWFjaCBub2RlIHRoYXQgaXMgdmlzaXRlZC4gSWYgYHZpc3Rvck9iak9yRm5gIGlzIGFuIG9iamVjdCwgdGhlbiBpdHMgJ2VudGVyJyBwcm9wZXJ0eVxuICAvLyBpcyBhIGZ1bmN0aW9uIHRvIGNhbGwgYmVmb3JlIHZpc2l0aW5nIHRoZSBjaGlsZHJlbiBvZiBhIG5vZGUsIGFuZCBpdHMgJ2V4aXQnIHByb3BlcnR5IGlzXG4gIC8vIGEgZnVuY3Rpb24gdG8gY2FsbCBhZnRlcndhcmRzLiBJZiBgdmlzaXRvck9iak9yRm5gIGlzIGEgZnVuY3Rpb24sIGl0IHJlcHJlc2VudHMgdGhlICdlbnRlcidcbiAgLy8gZnVuY3Rpb24uXG4gIC8vXG4gIC8vIFRoZSBmdW5jdGlvbnMgYXJlIGNhbGxlZCB3aXRoIHRocmVlIGFyZ3VtZW50czogdGhlIFRyYWNlIG5vZGUsIGl0cyBwYXJlbnQgVHJhY2UsIGFuZCBhIG51bWJlclxuICAvLyByZXByZXNlbnRpbmcgdGhlIGRlcHRoIG9mIHRoZSBub2RlIGluIHRoZSB0cmVlLiAoVGhlIHJvb3Qgbm9kZSBoYXMgZGVwdGggMC4pIGBvcHRUaGlzQXJnYCwgaWZcbiAgLy8gc3BlY2lmaWVkLCBpcyB0aGUgdmFsdWUgdG8gdXNlIGZvciBgdGhpc2Agd2hlbiBleGVjdXRpbmcgdGhlIHZpc2l0b3IgZnVuY3Rpb25zLlxuICB3YWxrKHZpc2l0b3JPYmpPckZuLCBvcHRUaGlzQXJnKSB7XG4gICAgbGV0IHZpc2l0b3IgPSB2aXNpdG9yT2JqT3JGbjtcbiAgICBpZiAodHlwZW9mIHZpc2l0b3IgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHZpc2l0b3IgPSB7ZW50ZXI6IHZpc2l0b3J9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF93YWxrKG5vZGUsIHBhcmVudCwgZGVwdGgpIHtcbiAgICAgIGxldCByZWN1cnNlID0gdHJ1ZTtcbiAgICAgIGlmICh2aXNpdG9yLmVudGVyKSB7XG4gICAgICAgIGlmICh2aXNpdG9yLmVudGVyLmNhbGwob3B0VGhpc0FyZywgbm9kZSwgcGFyZW50LCBkZXB0aCkgPT09IFRyYWNlLnByb3RvdHlwZS5TS0lQKSB7XG4gICAgICAgICAgcmVjdXJzZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAocmVjdXJzZSkge1xuICAgICAgICBub2RlLmNoaWxkcmVuLmZvckVhY2goY2hpbGQgPT4ge1xuICAgICAgICAgIF93YWxrKGNoaWxkLCBub2RlLCBkZXB0aCArIDEpO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHZpc2l0b3IuZXhpdCkge1xuICAgICAgICAgIHZpc2l0b3IuZXhpdC5jYWxsKG9wdFRoaXNBcmcsIG5vZGUsIHBhcmVudCwgZGVwdGgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLmlzUm9vdE5vZGUpIHtcbiAgICAgIC8vIERvbid0IHZpc2l0IHRoZSByb290IG5vZGUgaXRzZWxmLCBvbmx5IGl0cyBjaGlsZHJlbi5cbiAgICAgIHRoaXMuY2hpbGRyZW4uZm9yRWFjaChjID0+IHtcbiAgICAgICAgX3dhbGsoYywgbnVsbCwgMCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgX3dhbGsodGhpcywgbnVsbCwgMCk7XG4gICAgfVxuICB9XG5cbiAgLy8gUmV0dXJuIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSB0cmFjZS5cbiAgLy8gU2FtcGxlOlxuICAvLyAgICAgMTLii4Ur4ouFMuKLhSrii4UzIOKckyBleHAg4oeSICBcIjEyXCJcbiAgLy8gICAgIDEy4ouFK+KLhTLii4Uq4ouFMyAgIOKckyBhZGRFeHAgKExSKSDih5IgIFwiMTJcIlxuICAvLyAgICAgMTLii4Ur4ouFMuKLhSrii4UzICAgICAgIOKclyBhZGRFeHBfcGx1c1xuICB0b1N0cmluZygpIHtcbiAgICBjb25zdCBzYiA9IG5ldyBjb21tb24uU3RyaW5nQnVmZmVyKCk7XG4gICAgdGhpcy53YWxrKChub2RlLCBwYXJlbnQsIGRlcHRoKSA9PiB7XG4gICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuU0tJUDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGN0b3JOYW1lID0gbm9kZS5leHByLmNvbnN0cnVjdG9yLm5hbWU7XG4gICAgICAvLyBEb24ndCBwcmludCBhbnl0aGluZyBmb3IgQWx0IG5vZGVzLlxuICAgICAgaWYgKGN0b3JOYW1lID09PSAnQWx0Jykge1xuICAgICAgICByZXR1cm47IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgY29uc2lzdGVudC1yZXR1cm5cbiAgICAgIH1cbiAgICAgIHNiLmFwcGVuZChnZXRJbnB1dEV4Y2VycHQobm9kZS5pbnB1dCwgbm9kZS5wb3MsIDEwKSArIHNwYWNlcyhkZXB0aCAqIDIgKyAxKSk7XG4gICAgICBzYi5hcHBlbmQoKG5vZGUuc3VjY2VlZGVkID8gQ0hFQ0tfTUFSSyA6IEJBTExPVF9YKSArICcgJyArIG5vZGUuZGlzcGxheVN0cmluZyk7XG4gICAgICBpZiAobm9kZS5pc0hlYWRPZkxlZnRSZWN1cnNpb24pIHtcbiAgICAgICAgc2IuYXBwZW5kKCcgKExSKScpO1xuICAgICAgfVxuICAgICAgaWYgKG5vZGUuc3VjY2VlZGVkKSB7XG4gICAgICAgIGNvbnN0IGNvbnRlbnRzID0gYXNFc2NhcGVkU3RyaW5nKG5vZGUuc291cmNlLmNvbnRlbnRzKTtcbiAgICAgICAgc2IuYXBwZW5kKCcgJyArIFJJR0hUV0FSRFNfRE9VQkxFX0FSUk9XICsgJyAgJyk7XG4gICAgICAgIHNiLmFwcGVuZCh0eXBlb2YgY29udGVudHMgPT09ICdzdHJpbmcnID8gJ1wiJyArIGNvbnRlbnRzICsgJ1wiJyA6IGNvbnRlbnRzKTtcbiAgICAgIH1cbiAgICAgIHNiLmFwcGVuZCgnXFxuJyk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHNiLmNvbnRlbnRzKCk7XG4gIH1cbn1cblxuLy8gQSB2YWx1ZSB0aGF0IGNhbiBiZSByZXR1cm5lZCBmcm9tIHZpc2l0b3IgZnVuY3Rpb25zIHRvIGluZGljYXRlIHRoYXQgYVxuLy8gbm9kZSBzaG91bGQgbm90IGJlIHJlY3Vyc2VkIGludG8uXG5UcmFjZS5wcm90b3R5cGUuU0tJUCA9IHt9O1xuXG4vLyBGb3IgY29udmVuaWVuY2UsIGNyZWF0ZSBhIGdldHRlciBhbmQgc2V0dGVyIGZvciB0aGUgYm9vbGVhbiBmbGFncyBpbiBgRmxhZ3NgLlxuT2JqZWN0LmtleXMoRmxhZ3MpLmZvckVhY2gobmFtZSA9PiB7XG4gIGNvbnN0IG1hc2sgPSBGbGFnc1tuYW1lXTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFRyYWNlLnByb3RvdHlwZSwgbmFtZSwge1xuICAgIGdldCgpIHtcbiAgICAgIHJldHVybiAodGhpcy5fZmxhZ3MgJiBtYXNrKSAhPT0gMDtcbiAgICB9LFxuICAgIHNldCh2YWwpIHtcbiAgICAgIGlmICh2YWwpIHtcbiAgICAgICAgdGhpcy5fZmxhZ3MgfD0gbWFzaztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2ZsYWdzICY9IH5tYXNrO1xuICAgICAgfVxuICAgIH0sXG4gIH0pO1xufSk7XG4iLCJpbXBvcnQge2Fic3RyYWN0fSBmcm9tICcuL2NvbW1vbi5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMtbWFpbi5qcyc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBPcGVyYXRpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKlxuICBSZXR1cm4gdHJ1ZSBpZiB3ZSBzaG91bGQgc2tpcCBzcGFjZXMgcHJlY2VkaW5nIHRoaXMgZXhwcmVzc2lvbiBpbiBhIHN5bnRhY3RpYyBjb250ZXh0LlxuKi9cbnBleHBycy5QRXhwci5wcm90b3R5cGUuYWxsb3dzU2tpcHBpbmdQcmVjZWRpbmdTcGFjZSA9IGFic3RyYWN0KCdhbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlJyk7XG5cbi8qXG4gIEdlbmVyYWxseSwgdGhlc2UgYXJlIGFsbCBmaXJzdC1vcmRlciBleHByZXNzaW9ucyBhbmQgKHdpdGggdGhlIGV4Y2VwdGlvbiBvZiBBcHBseSlcbiAgZGlyZWN0bHkgcmVhZCBmcm9tIHRoZSBpbnB1dCBzdHJlYW0uXG4qL1xucGV4cHJzLmFueS5hbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlID1cbiAgcGV4cHJzLmVuZC5hbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlID1cbiAgcGV4cHJzLkFwcGx5LnByb3RvdHlwZS5hbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlID1cbiAgcGV4cHJzLlRlcm1pbmFsLnByb3RvdHlwZS5hbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlID1cbiAgcGV4cHJzLlJhbmdlLnByb3RvdHlwZS5hbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlID1cbiAgcGV4cHJzLlVuaWNvZGVDaGFyLnByb3RvdHlwZS5hbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlID1cbiAgICBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbi8qXG4gIEhpZ2hlci1vcmRlciBleHByZXNzaW9ucyB0aGF0IGRvbid0IGRpcmVjdGx5IGNvbnN1bWUgaW5wdXQuXG4qL1xucGV4cHJzLkFsdC5wcm90b3R5cGUuYWxsb3dzU2tpcHBpbmdQcmVjZWRpbmdTcGFjZSA9XG4gIHBleHBycy5JdGVyLnByb3RvdHlwZS5hbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlID1cbiAgcGV4cHJzLkxleC5wcm90b3R5cGUuYWxsb3dzU2tpcHBpbmdQcmVjZWRpbmdTcGFjZSA9XG4gIHBleHBycy5Mb29rYWhlYWQucHJvdG90eXBlLmFsbG93c1NraXBwaW5nUHJlY2VkaW5nU3BhY2UgPVxuICBwZXhwcnMuTm90LnByb3RvdHlwZS5hbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlID1cbiAgcGV4cHJzLlBhcmFtLnByb3RvdHlwZS5hbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlID1cbiAgcGV4cHJzLlNlcS5wcm90b3R5cGUuYWxsb3dzU2tpcHBpbmdQcmVjZWRpbmdTcGFjZSA9XG4gICAgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiIsImltcG9ydCB7YWJzdHJhY3QsIGlzU3ludGFjdGljfSBmcm9tICcuL2NvbW1vbi5qcyc7XG5pbXBvcnQgKiBhcyBlcnJvcnMgZnJvbSAnLi9lcnJvcnMuanMnO1xuaW1wb3J0ICogYXMgcGV4cHJzIGZyb20gJy4vcGV4cHJzLW1haW4uanMnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWwuanMnO1xuXG5sZXQgQnVpbHRJblJ1bGVzO1xuXG51dGlsLmF3YWl0QnVpbHRJblJ1bGVzKGcgPT4ge1xuICBCdWlsdEluUnVsZXMgPSBnO1xufSk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBPcGVyYXRpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5sZXQgbGV4aWZ5Q291bnQ7XG5cbnBleHBycy5QRXhwci5wcm90b3R5cGUuYXNzZXJ0QWxsQXBwbGljYXRpb25zQXJlVmFsaWQgPSBmdW5jdGlvbihydWxlTmFtZSwgZ3JhbW1hcikge1xuICBsZXhpZnlDb3VudCA9IDA7XG4gIHRoaXMuX2Fzc2VydEFsbEFwcGxpY2F0aW9uc0FyZVZhbGlkKHJ1bGVOYW1lLCBncmFtbWFyKTtcbn07XG5cbnBleHBycy5QRXhwci5wcm90b3R5cGUuX2Fzc2VydEFsbEFwcGxpY2F0aW9uc0FyZVZhbGlkID0gYWJzdHJhY3QoXG4gICAgJ19hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZCcsXG4pO1xuXG5wZXhwcnMuYW55Ll9hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZCA9XG4gIHBleHBycy5lbmQuX2Fzc2VydEFsbEFwcGxpY2F0aW9uc0FyZVZhbGlkID1cbiAgcGV4cHJzLlRlcm1pbmFsLnByb3RvdHlwZS5fYXNzZXJ0QWxsQXBwbGljYXRpb25zQXJlVmFsaWQgPVxuICBwZXhwcnMuUmFuZ2UucHJvdG90eXBlLl9hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZCA9XG4gIHBleHBycy5QYXJhbS5wcm90b3R5cGUuX2Fzc2VydEFsbEFwcGxpY2F0aW9uc0FyZVZhbGlkID1cbiAgcGV4cHJzLlVuaWNvZGVDaGFyLnByb3RvdHlwZS5fYXNzZXJ0QWxsQXBwbGljYXRpb25zQXJlVmFsaWQgPVxuICAgIGZ1bmN0aW9uKHJ1bGVOYW1lLCBncmFtbWFyKSB7XG4gICAgICAvLyBuby1vcFxuICAgIH07XG5cbnBleHBycy5MZXgucHJvdG90eXBlLl9hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZCA9IGZ1bmN0aW9uKHJ1bGVOYW1lLCBncmFtbWFyKSB7XG4gIGxleGlmeUNvdW50Kys7XG4gIHRoaXMuZXhwci5fYXNzZXJ0QWxsQXBwbGljYXRpb25zQXJlVmFsaWQocnVsZU5hbWUsIGdyYW1tYXIpO1xuICBsZXhpZnlDb3VudC0tO1xufTtcblxucGV4cHJzLkFsdC5wcm90b3R5cGUuX2Fzc2VydEFsbEFwcGxpY2F0aW9uc0FyZVZhbGlkID0gZnVuY3Rpb24ocnVsZU5hbWUsIGdyYW1tYXIpIHtcbiAgZm9yIChsZXQgaWR4ID0gMDsgaWR4IDwgdGhpcy50ZXJtcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdGhpcy50ZXJtc1tpZHhdLl9hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZChydWxlTmFtZSwgZ3JhbW1hcik7XG4gIH1cbn07XG5cbnBleHBycy5TZXEucHJvdG90eXBlLl9hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZCA9IGZ1bmN0aW9uKHJ1bGVOYW1lLCBncmFtbWFyKSB7XG4gIGZvciAobGV0IGlkeCA9IDA7IGlkeCA8IHRoaXMuZmFjdG9ycy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdGhpcy5mYWN0b3JzW2lkeF0uX2Fzc2VydEFsbEFwcGxpY2F0aW9uc0FyZVZhbGlkKHJ1bGVOYW1lLCBncmFtbWFyKTtcbiAgfVxufTtcblxucGV4cHJzLkl0ZXIucHJvdG90eXBlLl9hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZCA9XG4gIHBleHBycy5Ob3QucHJvdG90eXBlLl9hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZCA9XG4gIHBleHBycy5Mb29rYWhlYWQucHJvdG90eXBlLl9hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZCA9XG4gICAgZnVuY3Rpb24ocnVsZU5hbWUsIGdyYW1tYXIpIHtcbiAgICAgIHRoaXMuZXhwci5fYXNzZXJ0QWxsQXBwbGljYXRpb25zQXJlVmFsaWQocnVsZU5hbWUsIGdyYW1tYXIpO1xuICAgIH07XG5cbnBleHBycy5BcHBseS5wcm90b3R5cGUuX2Fzc2VydEFsbEFwcGxpY2F0aW9uc0FyZVZhbGlkID0gZnVuY3Rpb24oXG4gICAgcnVsZU5hbWUsXG4gICAgZ3JhbW1hcixcbiAgICBza2lwU3ludGFjdGljQ2hlY2sgPSBmYWxzZSxcbikge1xuICBjb25zdCBydWxlSW5mbyA9IGdyYW1tYXIucnVsZXNbdGhpcy5ydWxlTmFtZV07XG4gIGNvbnN0IGlzQ29udGV4dFN5bnRhY3RpYyA9IGlzU3ludGFjdGljKHJ1bGVOYW1lKSAmJiBsZXhpZnlDb3VudCA9PT0gMDtcblxuICAvLyBNYWtlIHN1cmUgdGhhdCB0aGUgcnVsZSBleGlzdHMuLi5cbiAgaWYgKCFydWxlSW5mbykge1xuICAgIHRocm93IGVycm9ycy51bmRlY2xhcmVkUnVsZSh0aGlzLnJ1bGVOYW1lLCBncmFtbWFyLm5hbWUsIHRoaXMuc291cmNlKTtcbiAgfVxuXG4gIC8vIC4uLmFuZCB0aGF0IHRoaXMgYXBwbGljYXRpb24gaXMgYWxsb3dlZFxuICBpZiAoIXNraXBTeW50YWN0aWNDaGVjayAmJiBpc1N5bnRhY3RpYyh0aGlzLnJ1bGVOYW1lKSAmJiAhaXNDb250ZXh0U3ludGFjdGljKSB7XG4gICAgdGhyb3cgZXJyb3JzLmFwcGxpY2F0aW9uT2ZTeW50YWN0aWNSdWxlRnJvbUxleGljYWxDb250ZXh0KHRoaXMucnVsZU5hbWUsIHRoaXMpO1xuICB9XG5cbiAgLy8gLi4uYW5kIHRoYXQgdGhpcyBhcHBsaWNhdGlvbiBoYXMgdGhlIGNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cy5cbiAgY29uc3QgYWN0dWFsID0gdGhpcy5hcmdzLmxlbmd0aDtcbiAgY29uc3QgZXhwZWN0ZWQgPSBydWxlSW5mby5mb3JtYWxzLmxlbmd0aDtcbiAgaWYgKGFjdHVhbCAhPT0gZXhwZWN0ZWQpIHtcbiAgICB0aHJvdyBlcnJvcnMud3JvbmdOdW1iZXJPZkFyZ3VtZW50cyh0aGlzLnJ1bGVOYW1lLCBleHBlY3RlZCwgYWN0dWFsLCB0aGlzLnNvdXJjZSk7XG4gIH1cblxuICBjb25zdCBpc0J1aWx0SW5BcHBseVN5bnRhY3RpYyA9XG4gICAgQnVpbHRJblJ1bGVzICYmIHJ1bGVJbmZvID09PSBCdWlsdEluUnVsZXMucnVsZXMuYXBwbHlTeW50YWN0aWM7XG4gIGNvbnN0IGlzQnVpbHRJbkNhc2VJbnNlbnNpdGl2ZSA9XG4gICAgQnVpbHRJblJ1bGVzICYmIHJ1bGVJbmZvID09PSBCdWlsdEluUnVsZXMucnVsZXMuY2FzZUluc2Vuc2l0aXZlO1xuXG4gIC8vIElmIGl0J3MgYW4gYXBwbGljYXRpb24gb2YgJ2Nhc2VJbnNlbnNpdGl2ZScsIGVuc3VyZSB0aGF0IHRoZSBhcmd1bWVudCBpcyBhIFRlcm1pbmFsLlxuICBpZiAoaXNCdWlsdEluQ2FzZUluc2Vuc2l0aXZlKSB7XG4gICAgaWYgKCEodGhpcy5hcmdzWzBdIGluc3RhbmNlb2YgcGV4cHJzLlRlcm1pbmFsKSkge1xuICAgICAgdGhyb3cgZXJyb3JzLmluY29ycmVjdEFyZ3VtZW50VHlwZSgnYSBUZXJtaW5hbCAoZS5nLiBcImFiY1wiKScsIHRoaXMuYXJnc1swXSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGlzQnVpbHRJbkFwcGx5U3ludGFjdGljKSB7XG4gICAgY29uc3QgYXJnID0gdGhpcy5hcmdzWzBdO1xuICAgIGlmICghKGFyZyBpbnN0YW5jZW9mIHBleHBycy5BcHBseSkpIHtcbiAgICAgIHRocm93IGVycm9ycy5pbmNvcnJlY3RBcmd1bWVudFR5cGUoJ2Egc3ludGFjdGljIHJ1bGUgYXBwbGljYXRpb24nLCBhcmcpO1xuICAgIH1cbiAgICBpZiAoIWlzU3ludGFjdGljKGFyZy5ydWxlTmFtZSkpIHtcbiAgICAgIHRocm93IGVycm9ycy5hcHBseVN5bnRhY3RpY1dpdGhMZXhpY2FsUnVsZUFwcGxpY2F0aW9uKGFyZyk7XG4gICAgfVxuICAgIGlmIChpc0NvbnRleHRTeW50YWN0aWMpIHtcbiAgICAgIHRocm93IGVycm9ycy51bm5lY2Vzc2FyeUV4cGVyaW1lbnRhbEFwcGx5U3ludGFjdGljKHRoaXMpO1xuICAgIH1cbiAgfVxuXG4gIC8vIC4uLmFuZCB0aGF0IGFsbCBvZiB0aGUgYXJndW1lbnQgZXhwcmVzc2lvbnMgb25seSBoYXZlIHZhbGlkIGFwcGxpY2F0aW9ucyBhbmQgaGF2ZSBhcml0eSAxLlxuICAvLyBJZiBgdGhpc2AgaXMgYW4gYXBwbGljYXRpb24gb2YgdGhlIGJ1aWx0LWluIGFwcGx5U3ludGFjdGljIHJ1bGUsIHRoZW4gaXRzIGFyZyBpc1xuICAvLyBhbGxvd2VkIChhbmQgZXhwZWN0ZWQpIHRvIGJlIGEgc3ludGFjdGljIHJ1bGUsIGV2ZW4gaWYgd2UncmUgaW4gYSBsZXhpY2FsIGNvbnRleHQuXG4gIHRoaXMuYXJncy5mb3JFYWNoKGFyZyA9PiB7XG4gICAgYXJnLl9hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZChydWxlTmFtZSwgZ3JhbW1hciwgaXNCdWlsdEluQXBwbHlTeW50YWN0aWMpO1xuICAgIGlmIChhcmcuZ2V0QXJpdHkoKSAhPT0gMSkge1xuICAgICAgdGhyb3cgZXJyb3JzLmludmFsaWRQYXJhbWV0ZXIodGhpcy5ydWxlTmFtZSwgYXJnKTtcbiAgICB9XG4gIH0pO1xufTtcbiIsImltcG9ydCB7YWJzdHJhY3R9IGZyb20gJy4vY29tbW9uLmpzJztcbmltcG9ydCAqIGFzIGVycm9ycyBmcm9tICcuL2Vycm9ycy5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMtbWFpbi5qcyc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBPcGVyYXRpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5wZXhwcnMuUEV4cHIucHJvdG90eXBlLmFzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5ID0gYWJzdHJhY3QoXG4gICAgJ2Fzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5Jyxcbik7XG5cbnBleHBycy5hbnkuYXNzZXJ0Q2hvaWNlc0hhdmVVbmlmb3JtQXJpdHkgPVxuICBwZXhwcnMuZW5kLmFzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5ID1cbiAgcGV4cHJzLlRlcm1pbmFsLnByb3RvdHlwZS5hc3NlcnRDaG9pY2VzSGF2ZVVuaWZvcm1Bcml0eSA9XG4gIHBleHBycy5SYW5nZS5wcm90b3R5cGUuYXNzZXJ0Q2hvaWNlc0hhdmVVbmlmb3JtQXJpdHkgPVxuICBwZXhwcnMuUGFyYW0ucHJvdG90eXBlLmFzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5ID1cbiAgcGV4cHJzLkxleC5wcm90b3R5cGUuYXNzZXJ0Q2hvaWNlc0hhdmVVbmlmb3JtQXJpdHkgPVxuICBwZXhwcnMuVW5pY29kZUNoYXIucHJvdG90eXBlLmFzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5ID1cbiAgICBmdW5jdGlvbihydWxlTmFtZSkge1xuICAgICAgLy8gbm8tb3BcbiAgICB9O1xuXG5wZXhwcnMuQWx0LnByb3RvdHlwZS5hc3NlcnRDaG9pY2VzSGF2ZVVuaWZvcm1Bcml0eSA9IGZ1bmN0aW9uKHJ1bGVOYW1lKSB7XG4gIGlmICh0aGlzLnRlcm1zLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBhcml0eSA9IHRoaXMudGVybXNbMF0uZ2V0QXJpdHkoKTtcbiAgZm9yIChsZXQgaWR4ID0gMDsgaWR4IDwgdGhpcy50ZXJtcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgY29uc3QgdGVybSA9IHRoaXMudGVybXNbaWR4XTtcbiAgICB0ZXJtLmFzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5KCk7XG4gICAgY29uc3Qgb3RoZXJBcml0eSA9IHRlcm0uZ2V0QXJpdHkoKTtcbiAgICBpZiAoYXJpdHkgIT09IG90aGVyQXJpdHkpIHtcbiAgICAgIHRocm93IGVycm9ycy5pbmNvbnNpc3RlbnRBcml0eShydWxlTmFtZSwgYXJpdHksIG90aGVyQXJpdHksIHRlcm0pO1xuICAgIH1cbiAgfVxufTtcblxucGV4cHJzLkV4dGVuZC5wcm90b3R5cGUuYXNzZXJ0Q2hvaWNlc0hhdmVVbmlmb3JtQXJpdHkgPSBmdW5jdGlvbihydWxlTmFtZSkge1xuICAvLyBFeHRlbmQgaXMgYSBzcGVjaWFsIGNhc2Ugb2YgQWx0IHRoYXQncyBndWFyYW50ZWVkIHRvIGhhdmUgZXhhY3RseSB0d29cbiAgLy8gY2FzZXM6IFtleHRlbnNpb25zLCBvcmlnQm9keV0uXG4gIGNvbnN0IGFjdHVhbEFyaXR5ID0gdGhpcy50ZXJtc1swXS5nZXRBcml0eSgpO1xuICBjb25zdCBleHBlY3RlZEFyaXR5ID0gdGhpcy50ZXJtc1sxXS5nZXRBcml0eSgpO1xuICBpZiAoYWN0dWFsQXJpdHkgIT09IGV4cGVjdGVkQXJpdHkpIHtcbiAgICB0aHJvdyBlcnJvcnMuaW5jb25zaXN0ZW50QXJpdHkocnVsZU5hbWUsIGV4cGVjdGVkQXJpdHksIGFjdHVhbEFyaXR5LCB0aGlzLnRlcm1zWzBdKTtcbiAgfVxufTtcblxucGV4cHJzLlNlcS5wcm90b3R5cGUuYXNzZXJ0Q2hvaWNlc0hhdmVVbmlmb3JtQXJpdHkgPSBmdW5jdGlvbihydWxlTmFtZSkge1xuICBmb3IgKGxldCBpZHggPSAwOyBpZHggPCB0aGlzLmZhY3RvcnMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXMuZmFjdG9yc1tpZHhdLmFzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5KHJ1bGVOYW1lKTtcbiAgfVxufTtcblxucGV4cHJzLkl0ZXIucHJvdG90eXBlLmFzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5ID0gZnVuY3Rpb24ocnVsZU5hbWUpIHtcbiAgdGhpcy5leHByLmFzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5KHJ1bGVOYW1lKTtcbn07XG5cbnBleHBycy5Ob3QucHJvdG90eXBlLmFzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5ID0gZnVuY3Rpb24ocnVsZU5hbWUpIHtcbiAgLy8gbm8tb3AgKG5vdCByZXF1aXJlZCBiL2MgdGhlIG5lc3RlZCBleHByIGRvZXNuJ3Qgc2hvdyB1cCBpbiB0aGUgQ1NUKVxufTtcblxucGV4cHJzLkxvb2thaGVhZC5wcm90b3R5cGUuYXNzZXJ0Q2hvaWNlc0hhdmVVbmlmb3JtQXJpdHkgPSBmdW5jdGlvbihydWxlTmFtZSkge1xuICB0aGlzLmV4cHIuYXNzZXJ0Q2hvaWNlc0hhdmVVbmlmb3JtQXJpdHkocnVsZU5hbWUpO1xufTtcblxucGV4cHJzLkFwcGx5LnByb3RvdHlwZS5hc3NlcnRDaG9pY2VzSGF2ZVVuaWZvcm1Bcml0eSA9IGZ1bmN0aW9uKHJ1bGVOYW1lKSB7XG4gIC8vIFRoZSBhcml0aWVzIG9mIHRoZSBwYXJhbWV0ZXIgZXhwcmVzc2lvbnMgaXMgcmVxdWlyZWQgdG8gYmUgMSBieVxuICAvLyBgYXNzZXJ0QWxsQXBwbGljYXRpb25zQXJlVmFsaWQoKWAuXG59O1xuIiwiaW1wb3J0IHthYnN0cmFjdH0gZnJvbSAnLi9jb21tb24uanMnO1xuaW1wb3J0ICogYXMgZXJyb3JzIGZyb20gJy4vZXJyb3JzLmpzJztcbmltcG9ydCAqIGFzIHBleHBycyBmcm9tICcuL3BleHBycy1tYWluLmpzJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIE9wZXJhdGlvbnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbnBleHBycy5QRXhwci5wcm90b3R5cGUuYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlID0gYWJzdHJhY3QoXG4gICAgJ2Fzc2VydEl0ZXJhdGVkRXhwcnNBcmVOb3ROdWxsYWJsZScsXG4pO1xuXG5wZXhwcnMuYW55LmFzc2VydEl0ZXJhdGVkRXhwcnNBcmVOb3ROdWxsYWJsZSA9XG4gIHBleHBycy5lbmQuYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlID1cbiAgcGV4cHJzLlRlcm1pbmFsLnByb3RvdHlwZS5hc3NlcnRJdGVyYXRlZEV4cHJzQXJlTm90TnVsbGFibGUgPVxuICBwZXhwcnMuUmFuZ2UucHJvdG90eXBlLmFzc2VydEl0ZXJhdGVkRXhwcnNBcmVOb3ROdWxsYWJsZSA9XG4gIHBleHBycy5QYXJhbS5wcm90b3R5cGUuYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlID1cbiAgcGV4cHJzLlVuaWNvZGVDaGFyLnByb3RvdHlwZS5hc3NlcnRJdGVyYXRlZEV4cHJzQXJlTm90TnVsbGFibGUgPVxuICAgIGZ1bmN0aW9uKGdyYW1tYXIpIHtcbiAgICAgIC8vIG5vLW9wXG4gICAgfTtcblxucGV4cHJzLkFsdC5wcm90b3R5cGUuYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlID0gZnVuY3Rpb24oZ3JhbW1hcikge1xuICBmb3IgKGxldCBpZHggPSAwOyBpZHggPCB0aGlzLnRlcm1zLmxlbmd0aDsgaWR4KyspIHtcbiAgICB0aGlzLnRlcm1zW2lkeF0uYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlKGdyYW1tYXIpO1xuICB9XG59O1xuXG5wZXhwcnMuU2VxLnByb3RvdHlwZS5hc3NlcnRJdGVyYXRlZEV4cHJzQXJlTm90TnVsbGFibGUgPSBmdW5jdGlvbihncmFtbWFyKSB7XG4gIGZvciAobGV0IGlkeCA9IDA7IGlkeCA8IHRoaXMuZmFjdG9ycy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdGhpcy5mYWN0b3JzW2lkeF0uYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlKGdyYW1tYXIpO1xuICB9XG59O1xuXG5wZXhwcnMuSXRlci5wcm90b3R5cGUuYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlID0gZnVuY3Rpb24oZ3JhbW1hcikge1xuICAvLyBOb3RlOiB0aGlzIGlzIHRoZSBpbXBsZW1lbnRhdGlvbiBvZiB0aGlzIG1ldGhvZCBmb3IgYFN0YXJgIGFuZCBgUGx1c2AgZXhwcmVzc2lvbnMuXG4gIC8vIEl0IGlzIG92ZXJyaWRkZW4gZm9yIGBPcHRgIGJlbG93LlxuICB0aGlzLmV4cHIuYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlKGdyYW1tYXIpO1xuICBpZiAodGhpcy5leHByLmlzTnVsbGFibGUoZ3JhbW1hcikpIHtcbiAgICB0aHJvdyBlcnJvcnMua2xlZW5lRXhwckhhc051bGxhYmxlT3BlcmFuZCh0aGlzLCBbXSk7XG4gIH1cbn07XG5cbnBleHBycy5PcHQucHJvdG90eXBlLmFzc2VydEl0ZXJhdGVkRXhwcnNBcmVOb3ROdWxsYWJsZSA9XG4gIHBleHBycy5Ob3QucHJvdG90eXBlLmFzc2VydEl0ZXJhdGVkRXhwcnNBcmVOb3ROdWxsYWJsZSA9XG4gIHBleHBycy5Mb29rYWhlYWQucHJvdG90eXBlLmFzc2VydEl0ZXJhdGVkRXhwcnNBcmVOb3ROdWxsYWJsZSA9XG4gIHBleHBycy5MZXgucHJvdG90eXBlLmFzc2VydEl0ZXJhdGVkRXhwcnNBcmVOb3ROdWxsYWJsZSA9XG4gICAgZnVuY3Rpb24oZ3JhbW1hcikge1xuICAgICAgdGhpcy5leHByLmFzc2VydEl0ZXJhdGVkRXhwcnNBcmVOb3ROdWxsYWJsZShncmFtbWFyKTtcbiAgICB9O1xuXG5wZXhwcnMuQXBwbHkucHJvdG90eXBlLmFzc2VydEl0ZXJhdGVkRXhwcnNBcmVOb3ROdWxsYWJsZSA9IGZ1bmN0aW9uKGdyYW1tYXIpIHtcbiAgdGhpcy5hcmdzLmZvckVhY2goYXJnID0+IHtcbiAgICBhcmcuYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlKGdyYW1tYXIpO1xuICB9KTtcbn07XG4iLCJpbXBvcnQgKiBhcyBjb21tb24gZnJvbSAnLi9jb21tb24uanMnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUHJpdmF0ZSBzdHVmZlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGNsYXNzIE5vZGUge1xuICBjb25zdHJ1Y3RvcihtYXRjaExlbmd0aCkge1xuICAgIHRoaXMubWF0Y2hMZW5ndGggPSBtYXRjaExlbmd0aDtcbiAgfVxuXG4gIGdldCBjdG9yTmFtZSgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3N1YmNsYXNzIHJlc3BvbnNpYmlsaXR5Jyk7XG4gIH1cblxuICBudW1DaGlsZHJlbigpIHtcbiAgICByZXR1cm4gdGhpcy5jaGlsZHJlbiA/IHRoaXMuY2hpbGRyZW4ubGVuZ3RoIDogMDtcbiAgfVxuXG4gIGNoaWxkQXQoaWR4KSB7XG4gICAgaWYgKHRoaXMuY2hpbGRyZW4pIHtcbiAgICAgIHJldHVybiB0aGlzLmNoaWxkcmVuW2lkeF07XG4gICAgfVxuICB9XG5cbiAgaW5kZXhPZkNoaWxkKGFyZykge1xuICAgIHJldHVybiB0aGlzLmNoaWxkcmVuLmluZGV4T2YoYXJnKTtcbiAgfVxuXG4gIGhhc0NoaWxkcmVuKCkge1xuICAgIHJldHVybiB0aGlzLm51bUNoaWxkcmVuKCkgPiAwO1xuICB9XG5cbiAgaGFzTm9DaGlsZHJlbigpIHtcbiAgICByZXR1cm4gIXRoaXMuaGFzQ2hpbGRyZW4oKTtcbiAgfVxuXG4gIG9ubHlDaGlsZCgpIHtcbiAgICBpZiAodGhpcy5udW1DaGlsZHJlbigpICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ2Nhbm5vdCBnZXQgb25seSBjaGlsZCBvZiBhIG5vZGUgb2YgdHlwZSAnICtcbiAgICAgICAgICB0aGlzLmN0b3JOYW1lICtcbiAgICAgICAgICAnIChpdCBoYXMgJyArXG4gICAgICAgICAgdGhpcy5udW1DaGlsZHJlbigpICtcbiAgICAgICAgICAnIGNoaWxkcmVuKScsXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5maXJzdENoaWxkKCk7XG4gICAgfVxuICB9XG5cbiAgZmlyc3RDaGlsZCgpIHtcbiAgICBpZiAodGhpcy5oYXNOb0NoaWxkcmVuKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnY2Fubm90IGdldCBmaXJzdCBjaGlsZCBvZiBhICcgKyB0aGlzLmN0b3JOYW1lICsgJyBub2RlLCB3aGljaCBoYXMgbm8gY2hpbGRyZW4nLFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuY2hpbGRBdCgwKTtcbiAgICB9XG4gIH1cblxuICBsYXN0Q2hpbGQoKSB7XG4gICAgaWYgKHRoaXMuaGFzTm9DaGlsZHJlbigpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ2Nhbm5vdCBnZXQgbGFzdCBjaGlsZCBvZiBhICcgKyB0aGlzLmN0b3JOYW1lICsgJyBub2RlLCB3aGljaCBoYXMgbm8gY2hpbGRyZW4nLFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuY2hpbGRBdCh0aGlzLm51bUNoaWxkcmVuKCkgLSAxKTtcbiAgICB9XG4gIH1cblxuICBjaGlsZEJlZm9yZShjaGlsZCkge1xuICAgIGNvbnN0IGNoaWxkSWR4ID0gdGhpcy5pbmRleE9mQ2hpbGQoY2hpbGQpO1xuICAgIGlmIChjaGlsZElkeCA8IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTm9kZS5jaGlsZEJlZm9yZSgpIGNhbGxlZCB3LyBhbiBhcmd1bWVudCB0aGF0IGlzIG5vdCBhIGNoaWxkJyk7XG4gICAgfSBlbHNlIGlmIChjaGlsZElkeCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgZ2V0IGNoaWxkIGJlZm9yZSBmaXJzdCBjaGlsZCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5jaGlsZEF0KGNoaWxkSWR4IC0gMSk7XG4gICAgfVxuICB9XG5cbiAgY2hpbGRBZnRlcihjaGlsZCkge1xuICAgIGNvbnN0IGNoaWxkSWR4ID0gdGhpcy5pbmRleE9mQ2hpbGQoY2hpbGQpO1xuICAgIGlmIChjaGlsZElkeCA8IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTm9kZS5jaGlsZEFmdGVyKCkgY2FsbGVkIHcvIGFuIGFyZ3VtZW50IHRoYXQgaXMgbm90IGEgY2hpbGQnKTtcbiAgICB9IGVsc2UgaWYgKGNoaWxkSWR4ID09PSB0aGlzLm51bUNoaWxkcmVuKCkgLSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Nhbm5vdCBnZXQgY2hpbGQgYWZ0ZXIgbGFzdCBjaGlsZCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5jaGlsZEF0KGNoaWxkSWR4ICsgMSk7XG4gICAgfVxuICB9XG5cbiAgaXNUZXJtaW5hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpc05vbnRlcm1pbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlzSXRlcmF0aW9uKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlzT3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8vIFRlcm1pbmFsc1xuXG5leHBvcnQgY2xhc3MgVGVybWluYWxOb2RlIGV4dGVuZHMgTm9kZSB7XG4gIGdldCBjdG9yTmFtZSgpIHtcbiAgICByZXR1cm4gJ190ZXJtaW5hbCc7XG4gIH1cblxuICBpc1Rlcm1pbmFsKCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgZ2V0IHByaW1pdGl2ZVZhbHVlKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignVGhlIGBwcmltaXRpdmVWYWx1ZWAgcHJvcGVydHkgd2FzIHJlbW92ZWQgaW4gT2htIHYxNy4nKTtcbiAgfVxufVxuXG4vLyBOb250ZXJtaW5hbHNcblxuZXhwb3J0IGNsYXNzIE5vbnRlcm1pbmFsTm9kZSBleHRlbmRzIE5vZGUge1xuICBjb25zdHJ1Y3RvcihydWxlTmFtZSwgY2hpbGRyZW4sIGNoaWxkT2Zmc2V0cywgbWF0Y2hMZW5ndGgpIHtcbiAgICBzdXBlcihtYXRjaExlbmd0aCk7XG4gICAgdGhpcy5ydWxlTmFtZSA9IHJ1bGVOYW1lO1xuICAgIHRoaXMuY2hpbGRyZW4gPSBjaGlsZHJlbjtcbiAgICB0aGlzLmNoaWxkT2Zmc2V0cyA9IGNoaWxkT2Zmc2V0cztcbiAgfVxuXG4gIGdldCBjdG9yTmFtZSgpIHtcbiAgICByZXR1cm4gdGhpcy5ydWxlTmFtZTtcbiAgfVxuXG4gIGlzTm9udGVybWluYWwoKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpc0xleGljYWwoKSB7XG4gICAgcmV0dXJuIGNvbW1vbi5pc0xleGljYWwodGhpcy5jdG9yTmFtZSk7XG4gIH1cblxuICBpc1N5bnRhY3RpYygpIHtcbiAgICByZXR1cm4gY29tbW9uLmlzU3ludGFjdGljKHRoaXMuY3Rvck5hbWUpO1xuICB9XG59XG5cbi8vIEl0ZXJhdGlvbnNcblxuZXhwb3J0IGNsYXNzIEl0ZXJhdGlvbk5vZGUgZXh0ZW5kcyBOb2RlIHtcbiAgY29uc3RydWN0b3IoY2hpbGRyZW4sIGNoaWxkT2Zmc2V0cywgbWF0Y2hMZW5ndGgsIGlzT3B0aW9uYWwpIHtcbiAgICBzdXBlcihtYXRjaExlbmd0aCk7XG4gICAgdGhpcy5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuICAgIHRoaXMuY2hpbGRPZmZzZXRzID0gY2hpbGRPZmZzZXRzO1xuICAgIHRoaXMub3B0aW9uYWwgPSBpc09wdGlvbmFsO1xuICB9XG5cbiAgZ2V0IGN0b3JOYW1lKCkge1xuICAgIHJldHVybiAnX2l0ZXInO1xuICB9XG5cbiAgaXNJdGVyYXRpb24oKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpc09wdGlvbmFsKCkge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbmFsO1xuICB9XG59XG4iLCJpbXBvcnQge1RyYWNlfSBmcm9tICcuL1RyYWNlLmpzJztcbmltcG9ydCAqIGFzIGNvbW1vbiBmcm9tICcuL2NvbW1vbi5qcyc7XG5pbXBvcnQgKiBhcyBlcnJvcnMgZnJvbSAnLi9lcnJvcnMuanMnO1xuaW1wb3J0IHtJdGVyYXRpb25Ob2RlLCBOb250ZXJtaW5hbE5vZGUsIFRlcm1pbmFsTm9kZX0gZnJvbSAnLi9ub2Rlcy5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMtbWFpbi5qcyc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBPcGVyYXRpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKlxuICBFdmFsdWF0ZSB0aGUgZXhwcmVzc2lvbiBhbmQgcmV0dXJuIGB0cnVlYCBpZiBpdCBzdWNjZWVkcywgYGZhbHNlYCBvdGhlcndpc2UuIFRoaXMgbWV0aG9kIHNob3VsZFxuICBvbmx5IGJlIGNhbGxlZCBkaXJlY3RseSBieSBgU3RhdGUucHJvdG90eXBlLmV2YWwoZXhwcilgLCB3aGljaCBhbHNvIHVwZGF0ZXMgdGhlIGRhdGEgc3RydWN0dXJlc1xuICB0aGF0IGFyZSB1c2VkIGZvciB0cmFjaW5nLiAoTWFraW5nIHRob3NlIHVwZGF0ZXMgaW4gYSBtZXRob2Qgb2YgYFN0YXRlYCBlbmFibGVzIHRoZSB0cmFjZS1zcGVjaWZpY1xuICBkYXRhIHN0cnVjdHVyZXMgdG8gYmUgXCJzZWNyZXRzXCIgb2YgdGhhdCBjbGFzcywgd2hpY2ggaXMgZ29vZCBmb3IgbW9kdWxhcml0eS4pXG5cbiAgVGhlIGNvbnRyYWN0IG9mIHRoaXMgbWV0aG9kIGlzIGFzIGZvbGxvd3M6XG4gICogV2hlbiB0aGUgcmV0dXJuIHZhbHVlIGlzIGB0cnVlYCxcbiAgICAtIHRoZSBzdGF0ZSBvYmplY3Qgd2lsbCBoYXZlIGBleHByLmdldEFyaXR5KClgIG1vcmUgYmluZGluZ3MgdGhhbiBpdCBkaWQgYmVmb3JlIHRoZSBjYWxsLlxuICAqIFdoZW4gdGhlIHJldHVybiB2YWx1ZSBpcyBgZmFsc2VgLFxuICAgIC0gdGhlIHN0YXRlIG9iamVjdCBtYXkgaGF2ZSBtb3JlIGJpbmRpbmdzIHRoYW4gaXQgZGlkIGJlZm9yZSB0aGUgY2FsbCwgYW5kXG4gICAgLSBpdHMgaW5wdXQgc3RyZWFtJ3MgcG9zaXRpb24gbWF5IGJlIGFueXdoZXJlLlxuXG4gIE5vdGUgdGhhdCBgU3RhdGUucHJvdG90eXBlLmV2YWwoZXhwcilgLCB1bmxpa2UgdGhpcyBtZXRob2QsIGd1YXJhbnRlZXMgdGhhdCBuZWl0aGVyIHRoZSBzdGF0ZVxuICBvYmplY3QncyBiaW5kaW5ncyBub3IgaXRzIGlucHV0IHN0cmVhbSdzIHBvc2l0aW9uIHdpbGwgY2hhbmdlIGlmIHRoZSBleHByZXNzaW9uIGZhaWxzIHRvIG1hdGNoLlxuKi9cbnBleHBycy5QRXhwci5wcm90b3R5cGUuZXZhbCA9IGNvbW1vbi5hYnN0cmFjdCgnZXZhbCcpOyAvLyBmdW5jdGlvbihzdGF0ZSkgeyAuLi4gfVxuXG5wZXhwcnMuYW55LmV2YWwgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBjb25zdCB7aW5wdXRTdHJlYW19ID0gc3RhdGU7XG4gIGNvbnN0IG9yaWdQb3MgPSBpbnB1dFN0cmVhbS5wb3M7XG4gIGNvbnN0IGNwID0gaW5wdXRTdHJlYW0ubmV4dENvZGVQb2ludCgpO1xuICBpZiAoY3AgIT09IHVuZGVmaW5lZCkge1xuICAgIHN0YXRlLnB1c2hCaW5kaW5nKG5ldyBUZXJtaW5hbE5vZGUoU3RyaW5nLmZyb21Db2RlUG9pbnQoY3ApLmxlbmd0aCksIG9yaWdQb3MpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHN0YXRlLnByb2Nlc3NGYWlsdXJlKG9yaWdQb3MsIHRoaXMpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxucGV4cHJzLmVuZC5ldmFsID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgY29uc3Qge2lucHV0U3RyZWFtfSA9IHN0YXRlO1xuICBjb25zdCBvcmlnUG9zID0gaW5wdXRTdHJlYW0ucG9zO1xuICBpZiAoaW5wdXRTdHJlYW0uYXRFbmQoKSkge1xuICAgIHN0YXRlLnB1c2hCaW5kaW5nKG5ldyBUZXJtaW5hbE5vZGUoMCksIG9yaWdQb3MpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHN0YXRlLnByb2Nlc3NGYWlsdXJlKG9yaWdQb3MsIHRoaXMpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxucGV4cHJzLlRlcm1pbmFsLnByb3RvdHlwZS5ldmFsID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgY29uc3Qge2lucHV0U3RyZWFtfSA9IHN0YXRlO1xuICBjb25zdCBvcmlnUG9zID0gaW5wdXRTdHJlYW0ucG9zO1xuICBpZiAoIWlucHV0U3RyZWFtLm1hdGNoU3RyaW5nKHRoaXMub2JqKSkge1xuICAgIHN0YXRlLnByb2Nlc3NGYWlsdXJlKG9yaWdQb3MsIHRoaXMpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICBzdGF0ZS5wdXNoQmluZGluZyhuZXcgVGVybWluYWxOb2RlKHRoaXMub2JqLmxlbmd0aCksIG9yaWdQb3MpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59O1xuXG5wZXhwcnMuUmFuZ2UucHJvdG90eXBlLmV2YWwgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBjb25zdCB7aW5wdXRTdHJlYW19ID0gc3RhdGU7XG4gIGNvbnN0IG9yaWdQb3MgPSBpbnB1dFN0cmVhbS5wb3M7XG5cbiAgLy8gQSByYW5nZSBjYW4gb3BlcmF0ZSBpbiBvbmUgb2YgdHdvIG1vZGVzOiBtYXRjaGluZyBhIHNpbmdsZSwgMTYtYml0IF9jb2RlIHVuaXRfLFxuICAvLyBvciBtYXRjaGluZyBhIF9jb2RlIHBvaW50Xy4gKENvZGUgcG9pbnRzIG92ZXIgMHhGRkZGIHRha2UgdXAgdHdvIDE2LWJpdCBjb2RlIHVuaXRzLilcbiAgY29uc3QgY3AgPSB0aGlzLm1hdGNoQ29kZVBvaW50ID8gaW5wdXRTdHJlYW0ubmV4dENvZGVQb2ludCgpIDogaW5wdXRTdHJlYW0ubmV4dENoYXJDb2RlKCk7XG5cbiAgLy8gQWx3YXlzIGNvbXBhcmUgYnkgY29kZSBwb2ludCB2YWx1ZSB0byBnZXQgdGhlIGNvcnJlY3QgcmVzdWx0IGluIGFsbCBzY2VuYXJpb3MuXG4gIC8vIE5vdGUgdGhhdCBmb3Igc3RyaW5ncyBvZiBsZW5ndGggMSwgY29kZVBvaW50QXQoMCkgYW5kIGNoYXJQb2ludEF0KDApIGFyZSBlcXVpdmFsZW50LlxuICBpZiAoY3AgIT09IHVuZGVmaW5lZCAmJiB0aGlzLmZyb20uY29kZVBvaW50QXQoMCkgPD0gY3AgJiYgY3AgPD0gdGhpcy50by5jb2RlUG9pbnRBdCgwKSkge1xuICAgIHN0YXRlLnB1c2hCaW5kaW5nKG5ldyBUZXJtaW5hbE5vZGUoU3RyaW5nLmZyb21Db2RlUG9pbnQoY3ApLmxlbmd0aCksIG9yaWdQb3MpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHN0YXRlLnByb2Nlc3NGYWlsdXJlKG9yaWdQb3MsIHRoaXMpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxucGV4cHJzLlBhcmFtLnByb3RvdHlwZS5ldmFsID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgcmV0dXJuIHN0YXRlLmV2YWwoc3RhdGUuY3VycmVudEFwcGxpY2F0aW9uKCkuYXJnc1t0aGlzLmluZGV4XSk7XG59O1xuXG5wZXhwcnMuTGV4LnByb3RvdHlwZS5ldmFsID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgc3RhdGUuZW50ZXJMZXhpZmllZENvbnRleHQoKTtcbiAgY29uc3QgYW5zID0gc3RhdGUuZXZhbCh0aGlzLmV4cHIpO1xuICBzdGF0ZS5leGl0TGV4aWZpZWRDb250ZXh0KCk7XG4gIHJldHVybiBhbnM7XG59O1xuXG5wZXhwcnMuQWx0LnByb3RvdHlwZS5ldmFsID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgZm9yIChsZXQgaWR4ID0gMDsgaWR4IDwgdGhpcy50ZXJtcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgaWYgKHN0YXRlLmV2YWwodGhpcy50ZXJtc1tpZHhdKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbnBleHBycy5TZXEucHJvdG90eXBlLmV2YWwgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBmb3IgKGxldCBpZHggPSAwOyBpZHggPCB0aGlzLmZhY3RvcnMubGVuZ3RoOyBpZHgrKykge1xuICAgIGNvbnN0IGZhY3RvciA9IHRoaXMuZmFjdG9yc1tpZHhdO1xuICAgIGlmICghc3RhdGUuZXZhbChmYWN0b3IpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxucGV4cHJzLkl0ZXIucHJvdG90eXBlLmV2YWwgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBjb25zdCB7aW5wdXRTdHJlYW19ID0gc3RhdGU7XG4gIGNvbnN0IG9yaWdQb3MgPSBpbnB1dFN0cmVhbS5wb3M7XG4gIGNvbnN0IGFyaXR5ID0gdGhpcy5nZXRBcml0eSgpO1xuICBjb25zdCBjb2xzID0gW107XG4gIGNvbnN0IGNvbE9mZnNldHMgPSBbXTtcbiAgd2hpbGUgKGNvbHMubGVuZ3RoIDwgYXJpdHkpIHtcbiAgICBjb2xzLnB1c2goW10pO1xuICAgIGNvbE9mZnNldHMucHVzaChbXSk7XG4gIH1cblxuICBsZXQgbnVtTWF0Y2hlcyA9IDA7XG4gIGxldCBwcmV2UG9zID0gb3JpZ1BvcztcbiAgbGV0IGlkeDtcbiAgd2hpbGUgKG51bU1hdGNoZXMgPCB0aGlzLm1heE51bU1hdGNoZXMgJiYgc3RhdGUuZXZhbCh0aGlzLmV4cHIpKSB7XG4gICAgaWYgKGlucHV0U3RyZWFtLnBvcyA9PT0gcHJldlBvcykge1xuICAgICAgdGhyb3cgZXJyb3JzLmtsZWVuZUV4cHJIYXNOdWxsYWJsZU9wZXJhbmQodGhpcywgc3RhdGUuX2FwcGxpY2F0aW9uU3RhY2spO1xuICAgIH1cbiAgICBwcmV2UG9zID0gaW5wdXRTdHJlYW0ucG9zO1xuICAgIG51bU1hdGNoZXMrKztcbiAgICBjb25zdCByb3cgPSBzdGF0ZS5fYmluZGluZ3Muc3BsaWNlKHN0YXRlLl9iaW5kaW5ncy5sZW5ndGggLSBhcml0eSwgYXJpdHkpO1xuICAgIGNvbnN0IHJvd09mZnNldHMgPSBzdGF0ZS5fYmluZGluZ09mZnNldHMuc3BsaWNlKFxuICAgICAgICBzdGF0ZS5fYmluZGluZ09mZnNldHMubGVuZ3RoIC0gYXJpdHksXG4gICAgICAgIGFyaXR5LFxuICAgICk7XG4gICAgZm9yIChpZHggPSAwOyBpZHggPCByb3cubGVuZ3RoOyBpZHgrKykge1xuICAgICAgY29sc1tpZHhdLnB1c2gocm93W2lkeF0pO1xuICAgICAgY29sT2Zmc2V0c1tpZHhdLnB1c2gocm93T2Zmc2V0c1tpZHhdKTtcbiAgICB9XG4gIH1cbiAgaWYgKG51bU1hdGNoZXMgPCB0aGlzLm1pbk51bU1hdGNoZXMpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgbGV0IG9mZnNldCA9IHN0YXRlLnBvc1RvT2Zmc2V0KG9yaWdQb3MpO1xuICBsZXQgbWF0Y2hMZW5ndGggPSAwO1xuICBpZiAobnVtTWF0Y2hlcyA+IDApIHtcbiAgICBjb25zdCBsYXN0Q29sID0gY29sc1thcml0eSAtIDFdO1xuICAgIGNvbnN0IGxhc3RDb2xPZmZzZXRzID0gY29sT2Zmc2V0c1thcml0eSAtIDFdO1xuXG4gICAgY29uc3QgZW5kT2Zmc2V0ID1cbiAgICAgIGxhc3RDb2xPZmZzZXRzW2xhc3RDb2xPZmZzZXRzLmxlbmd0aCAtIDFdICsgbGFzdENvbFtsYXN0Q29sLmxlbmd0aCAtIDFdLm1hdGNoTGVuZ3RoO1xuICAgIG9mZnNldCA9IGNvbE9mZnNldHNbMF1bMF07XG4gICAgbWF0Y2hMZW5ndGggPSBlbmRPZmZzZXQgLSBvZmZzZXQ7XG4gIH1cbiAgY29uc3QgaXNPcHRpb25hbCA9IHRoaXMgaW5zdGFuY2VvZiBwZXhwcnMuT3B0O1xuICBmb3IgKGlkeCA9IDA7IGlkeCA8IGNvbHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHN0YXRlLl9iaW5kaW5ncy5wdXNoKFxuICAgICAgICBuZXcgSXRlcmF0aW9uTm9kZShjb2xzW2lkeF0sIGNvbE9mZnNldHNbaWR4XSwgbWF0Y2hMZW5ndGgsIGlzT3B0aW9uYWwpLFxuICAgICk7XG4gICAgc3RhdGUuX2JpbmRpbmdPZmZzZXRzLnB1c2gob2Zmc2V0KTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbnBleHBycy5Ob3QucHJvdG90eXBlLmV2YWwgPSBmdW5jdGlvbihzdGF0ZSkge1xuICAvKlxuICAgIFRPRE86XG4gICAgLSBSaWdodCBub3cgd2UncmUganVzdCB0aHJvd2luZyBhd2F5IGFsbCBvZiB0aGUgZmFpbHVyZXMgdGhhdCBoYXBwZW4gaW5zaWRlIGEgYG5vdGAsIGFuZFxuICAgICAgcmVjb3JkaW5nIGB0aGlzYCBhcyBhIGZhaWxlZCBleHByZXNzaW9uLlxuICAgIC0gRG91YmxlIG5lZ2F0aW9uIHNob3VsZCBiZSBlcXVpdmFsZW50IHRvIGxvb2thaGVhZCwgYnV0IHRoYXQncyBub3QgdGhlIGNhc2UgcmlnaHQgbm93IHdydFxuICAgICAgZmFpbHVyZXMuIEUuZy4sIH5+J2ZvbycgcHJvZHVjZXMgYSBmYWlsdXJlIGZvciB+fidmb28nLCBidXQgbWF5YmUgaXQgc2hvdWxkIHByb2R1Y2VcbiAgICAgIGEgZmFpbHVyZSBmb3IgJ2ZvbycgaW5zdGVhZC5cbiAgKi9cblxuICBjb25zdCB7aW5wdXRTdHJlYW19ID0gc3RhdGU7XG4gIGNvbnN0IG9yaWdQb3MgPSBpbnB1dFN0cmVhbS5wb3M7XG4gIHN0YXRlLnB1c2hGYWlsdXJlc0luZm8oKTtcblxuICBjb25zdCBhbnMgPSBzdGF0ZS5ldmFsKHRoaXMuZXhwcik7XG5cbiAgc3RhdGUucG9wRmFpbHVyZXNJbmZvKCk7XG4gIGlmIChhbnMpIHtcbiAgICBzdGF0ZS5wcm9jZXNzRmFpbHVyZShvcmlnUG9zLCB0aGlzKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpbnB1dFN0cmVhbS5wb3MgPSBvcmlnUG9zO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbnBleHBycy5Mb29rYWhlYWQucHJvdG90eXBlLmV2YWwgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBjb25zdCB7aW5wdXRTdHJlYW19ID0gc3RhdGU7XG4gIGNvbnN0IG9yaWdQb3MgPSBpbnB1dFN0cmVhbS5wb3M7XG4gIGlmIChzdGF0ZS5ldmFsKHRoaXMuZXhwcikpIHtcbiAgICBpbnB1dFN0cmVhbS5wb3MgPSBvcmlnUG9zO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxucGV4cHJzLkFwcGx5LnByb3RvdHlwZS5ldmFsID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgY29uc3QgY2FsbGVyID0gc3RhdGUuY3VycmVudEFwcGxpY2F0aW9uKCk7XG4gIGNvbnN0IGFjdHVhbHMgPSBjYWxsZXIgPyBjYWxsZXIuYXJncyA6IFtdO1xuICBjb25zdCBhcHAgPSB0aGlzLnN1YnN0aXR1dGVQYXJhbXMoYWN0dWFscyk7XG5cbiAgY29uc3QgcG9zSW5mbyA9IHN0YXRlLmdldEN1cnJlbnRQb3NJbmZvKCk7XG4gIGlmIChwb3NJbmZvLmlzQWN0aXZlKGFwcCkpIHtcbiAgICAvLyBUaGlzIHJ1bGUgaXMgYWxyZWFkeSBhY3RpdmUgYXQgdGhpcyBwb3NpdGlvbiwgaS5lLiwgaXQgaXMgbGVmdC1yZWN1cnNpdmUuXG4gICAgcmV0dXJuIGFwcC5oYW5kbGVDeWNsZShzdGF0ZSk7XG4gIH1cblxuICBjb25zdCBtZW1vS2V5ID0gYXBwLnRvTWVtb0tleSgpO1xuICBjb25zdCBtZW1vUmVjID0gcG9zSW5mby5tZW1vW21lbW9LZXldO1xuXG4gIGlmIChtZW1vUmVjICYmIHBvc0luZm8uc2hvdWxkVXNlTWVtb2l6ZWRSZXN1bHQobWVtb1JlYykpIHtcbiAgICBpZiAoc3RhdGUuaGFzTmVjZXNzYXJ5SW5mbyhtZW1vUmVjKSkge1xuICAgICAgcmV0dXJuIHN0YXRlLnVzZU1lbW9pemVkUmVzdWx0KHN0YXRlLmlucHV0U3RyZWFtLnBvcywgbWVtb1JlYyk7XG4gICAgfVxuICAgIGRlbGV0ZSBwb3NJbmZvLm1lbW9bbWVtb0tleV07XG4gIH1cbiAgcmV0dXJuIGFwcC5yZWFsbHlFdmFsKHN0YXRlKTtcbn07XG5cbnBleHBycy5BcHBseS5wcm90b3R5cGUuaGFuZGxlQ3ljbGUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBjb25zdCBwb3NJbmZvID0gc3RhdGUuZ2V0Q3VycmVudFBvc0luZm8oKTtcbiAgY29uc3Qge2N1cnJlbnRMZWZ0UmVjdXJzaW9ufSA9IHBvc0luZm87XG4gIGNvbnN0IG1lbW9LZXkgPSB0aGlzLnRvTWVtb0tleSgpO1xuICBsZXQgbWVtb1JlYyA9IHBvc0luZm8ubWVtb1ttZW1vS2V5XTtcblxuICBpZiAoY3VycmVudExlZnRSZWN1cnNpb24gJiYgY3VycmVudExlZnRSZWN1cnNpb24uaGVhZEFwcGxpY2F0aW9uLnRvTWVtb0tleSgpID09PSBtZW1vS2V5KSB7XG4gICAgLy8gV2UgYWxyZWFkeSBrbm93IGFib3V0IHRoaXMgbGVmdCByZWN1cnNpb24sIGJ1dCBpdCdzIHBvc3NpYmxlIHRoZXJlIGFyZSBcImludm9sdmVkXG4gICAgLy8gYXBwbGljYXRpb25zXCIgdGhhdCB3ZSBkb24ndCBhbHJlYWR5IGtub3cgYWJvdXQsIHNvLi4uXG4gICAgbWVtb1JlYy51cGRhdGVJbnZvbHZlZEFwcGxpY2F0aW9uTWVtb0tleXMoKTtcbiAgfSBlbHNlIGlmICghbWVtb1JlYykge1xuICAgIC8vIE5ldyBsZWZ0IHJlY3Vyc2lvbiBkZXRlY3RlZCEgTWVtb2l6ZSBhIGZhaWx1cmUgdG8gdHJ5IHRvIGdldCBhIHNlZWQgcGFyc2UuXG4gICAgbWVtb1JlYyA9IHBvc0luZm8ubWVtb2l6ZShtZW1vS2V5LCB7XG4gICAgICBtYXRjaExlbmd0aDogMCxcbiAgICAgIGV4YW1pbmVkTGVuZ3RoOiAwLFxuICAgICAgdmFsdWU6IGZhbHNlLFxuICAgICAgcmlnaHRtb3N0RmFpbHVyZU9mZnNldDogLTEsXG4gICAgfSk7XG4gICAgcG9zSW5mby5zdGFydExlZnRSZWN1cnNpb24odGhpcywgbWVtb1JlYyk7XG4gIH1cbiAgcmV0dXJuIHN0YXRlLnVzZU1lbW9pemVkUmVzdWx0KHN0YXRlLmlucHV0U3RyZWFtLnBvcywgbWVtb1JlYyk7XG59O1xuXG5wZXhwcnMuQXBwbHkucHJvdG90eXBlLnJlYWxseUV2YWwgPSBmdW5jdGlvbihzdGF0ZSkge1xuICBjb25zdCB7aW5wdXRTdHJlYW19ID0gc3RhdGU7XG4gIGNvbnN0IG9yaWdQb3MgPSBpbnB1dFN0cmVhbS5wb3M7XG4gIGNvbnN0IG9yaWdQb3NJbmZvID0gc3RhdGUuZ2V0Q3VycmVudFBvc0luZm8oKTtcbiAgY29uc3QgcnVsZUluZm8gPSBzdGF0ZS5ncmFtbWFyLnJ1bGVzW3RoaXMucnVsZU5hbWVdO1xuICBjb25zdCB7Ym9keX0gPSBydWxlSW5mbztcbiAgY29uc3Qge2Rlc2NyaXB0aW9ufSA9IHJ1bGVJbmZvO1xuXG4gIHN0YXRlLmVudGVyQXBwbGljYXRpb24ob3JpZ1Bvc0luZm8sIHRoaXMpO1xuXG4gIGlmIChkZXNjcmlwdGlvbikge1xuICAgIHN0YXRlLnB1c2hGYWlsdXJlc0luZm8oKTtcbiAgfVxuXG4gIC8vIFJlc2V0IHRoZSBpbnB1dCBzdHJlYW0ncyBleGFtaW5lZExlbmd0aCBwcm9wZXJ0eSBzbyB0aGF0IHdlIGNhbiB0cmFja1xuICAvLyB0aGUgZXhhbWluZWQgbGVuZ3RoIG9mIHRoaXMgcGFydGljdWxhciBhcHBsaWNhdGlvbi5cbiAgY29uc3Qgb3JpZ0lucHV0U3RyZWFtRXhhbWluZWRMZW5ndGggPSBpbnB1dFN0cmVhbS5leGFtaW5lZExlbmd0aDtcbiAgaW5wdXRTdHJlYW0uZXhhbWluZWRMZW5ndGggPSAwO1xuXG4gIGxldCB2YWx1ZSA9IHRoaXMuZXZhbE9uY2UoYm9keSwgc3RhdGUpO1xuICBjb25zdCBjdXJyZW50TFIgPSBvcmlnUG9zSW5mby5jdXJyZW50TGVmdFJlY3Vyc2lvbjtcbiAgY29uc3QgbWVtb0tleSA9IHRoaXMudG9NZW1vS2V5KCk7XG4gIGNvbnN0IGlzSGVhZE9mTGVmdFJlY3Vyc2lvbiA9IGN1cnJlbnRMUiAmJiBjdXJyZW50TFIuaGVhZEFwcGxpY2F0aW9uLnRvTWVtb0tleSgpID09PSBtZW1vS2V5O1xuICBsZXQgbWVtb1JlYztcblxuICBpZiAoc3RhdGUuZG9Ob3RNZW1vaXplKSB7XG4gICAgc3RhdGUuZG9Ob3RNZW1vaXplID0gZmFsc2U7XG4gIH0gZWxzZSBpZiAoaXNIZWFkT2ZMZWZ0UmVjdXJzaW9uKSB7XG4gICAgdmFsdWUgPSB0aGlzLmdyb3dTZWVkUmVzdWx0KGJvZHksIHN0YXRlLCBvcmlnUG9zLCBjdXJyZW50TFIsIHZhbHVlKTtcbiAgICBvcmlnUG9zSW5mby5lbmRMZWZ0UmVjdXJzaW9uKCk7XG4gICAgbWVtb1JlYyA9IGN1cnJlbnRMUjtcbiAgICBtZW1vUmVjLmV4YW1pbmVkTGVuZ3RoID0gaW5wdXRTdHJlYW0uZXhhbWluZWRMZW5ndGggLSBvcmlnUG9zO1xuICAgIG1lbW9SZWMucmlnaHRtb3N0RmFpbHVyZU9mZnNldCA9IHN0YXRlLl9nZXRSaWdodG1vc3RGYWlsdXJlT2Zmc2V0KCk7XG4gICAgb3JpZ1Bvc0luZm8ubWVtb2l6ZShtZW1vS2V5LCBtZW1vUmVjKTsgLy8gdXBkYXRlcyBvcmlnUG9zSW5mbydzIG1heEV4YW1pbmVkTGVuZ3RoXG4gIH0gZWxzZSBpZiAoIWN1cnJlbnRMUiB8fCAhY3VycmVudExSLmlzSW52b2x2ZWQobWVtb0tleSkpIHtcbiAgICAvLyBUaGlzIGFwcGxpY2F0aW9uIGlzIG5vdCBpbnZvbHZlZCBpbiBsZWZ0IHJlY3Vyc2lvbiwgc28gaXQncyBvayB0byBtZW1vaXplIGl0LlxuICAgIG1lbW9SZWMgPSBvcmlnUG9zSW5mby5tZW1vaXplKG1lbW9LZXksIHtcbiAgICAgIG1hdGNoTGVuZ3RoOiBpbnB1dFN0cmVhbS5wb3MgLSBvcmlnUG9zLFxuICAgICAgZXhhbWluZWRMZW5ndGg6IGlucHV0U3RyZWFtLmV4YW1pbmVkTGVuZ3RoIC0gb3JpZ1BvcyxcbiAgICAgIHZhbHVlLFxuICAgICAgZmFpbHVyZXNBdFJpZ2h0bW9zdFBvc2l0aW9uOiBzdGF0ZS5jbG9uZVJlY29yZGVkRmFpbHVyZXMoKSxcbiAgICAgIHJpZ2h0bW9zdEZhaWx1cmVPZmZzZXQ6IHN0YXRlLl9nZXRSaWdodG1vc3RGYWlsdXJlT2Zmc2V0KCksXG4gICAgfSk7XG4gIH1cbiAgY29uc3Qgc3VjY2VlZGVkID0gISF2YWx1ZTtcblxuICBpZiAoZGVzY3JpcHRpb24pIHtcbiAgICBzdGF0ZS5wb3BGYWlsdXJlc0luZm8oKTtcbiAgICBpZiAoIXN1Y2NlZWRlZCkge1xuICAgICAgc3RhdGUucHJvY2Vzc0ZhaWx1cmUob3JpZ1BvcywgdGhpcyk7XG4gICAgfVxuICAgIGlmIChtZW1vUmVjKSB7XG4gICAgICBtZW1vUmVjLmZhaWx1cmVzQXRSaWdodG1vc3RQb3NpdGlvbiA9IHN0YXRlLmNsb25lUmVjb3JkZWRGYWlsdXJlcygpO1xuICAgIH1cbiAgfVxuXG4gIC8vIFJlY29yZCB0cmFjZSBpbmZvcm1hdGlvbiBpbiB0aGUgbWVtbyB0YWJsZSwgc28gdGhhdCBpdCBpcyBhdmFpbGFibGUgaWYgdGhlIG1lbW9pemVkIHJlc3VsdFxuICAvLyBpcyB1c2VkIGxhdGVyLlxuICBpZiAoc3RhdGUuaXNUcmFjaW5nKCkgJiYgbWVtb1JlYykge1xuICAgIGNvbnN0IGVudHJ5ID0gc3RhdGUuZ2V0VHJhY2VFbnRyeShvcmlnUG9zLCB0aGlzLCBzdWNjZWVkZWQsIHN1Y2NlZWRlZCA/IFt2YWx1ZV0gOiBbXSk7XG4gICAgaWYgKGlzSGVhZE9mTGVmdFJlY3Vyc2lvbikge1xuICAgICAgY29tbW9uLmFzc2VydChlbnRyeS50ZXJtaW5hdGluZ0xSRW50cnkgIT0gbnVsbCB8fCAhc3VjY2VlZGVkKTtcbiAgICAgIGVudHJ5LmlzSGVhZE9mTGVmdFJlY3Vyc2lvbiA9IHRydWU7XG4gICAgfVxuICAgIG1lbW9SZWMudHJhY2VFbnRyeSA9IGVudHJ5O1xuICB9XG5cbiAgLy8gRml4IHRoZSBpbnB1dCBzdHJlYW0ncyBleGFtaW5lZExlbmd0aCAtLSBpdCBzaG91bGQgYmUgdGhlIG1heGltdW0gZXhhbWluZWQgbGVuZ3RoXG4gIC8vIGFjcm9zcyBhbGwgYXBwbGljYXRpb25zLCBub3QganVzdCB0aGlzIG9uZS5cbiAgaW5wdXRTdHJlYW0uZXhhbWluZWRMZW5ndGggPSBNYXRoLm1heChcbiAgICAgIGlucHV0U3RyZWFtLmV4YW1pbmVkTGVuZ3RoLFxuICAgICAgb3JpZ0lucHV0U3RyZWFtRXhhbWluZWRMZW5ndGgsXG4gICk7XG5cbiAgc3RhdGUuZXhpdEFwcGxpY2F0aW9uKG9yaWdQb3NJbmZvLCB2YWx1ZSk7XG5cbiAgcmV0dXJuIHN1Y2NlZWRlZDtcbn07XG5cbnBleHBycy5BcHBseS5wcm90b3R5cGUuZXZhbE9uY2UgPSBmdW5jdGlvbihleHByLCBzdGF0ZSkge1xuICBjb25zdCB7aW5wdXRTdHJlYW19ID0gc3RhdGU7XG4gIGNvbnN0IG9yaWdQb3MgPSBpbnB1dFN0cmVhbS5wb3M7XG5cbiAgaWYgKHN0YXRlLmV2YWwoZXhwcikpIHtcbiAgICBjb25zdCBhcml0eSA9IGV4cHIuZ2V0QXJpdHkoKTtcbiAgICBjb25zdCBiaW5kaW5ncyA9IHN0YXRlLl9iaW5kaW5ncy5zcGxpY2Uoc3RhdGUuX2JpbmRpbmdzLmxlbmd0aCAtIGFyaXR5LCBhcml0eSk7XG4gICAgY29uc3Qgb2Zmc2V0cyA9IHN0YXRlLl9iaW5kaW5nT2Zmc2V0cy5zcGxpY2Uoc3RhdGUuX2JpbmRpbmdPZmZzZXRzLmxlbmd0aCAtIGFyaXR5LCBhcml0eSk7XG4gICAgY29uc3QgbWF0Y2hMZW5ndGggPSBpbnB1dFN0cmVhbS5wb3MgLSBvcmlnUG9zO1xuICAgIHJldHVybiBuZXcgTm9udGVybWluYWxOb2RlKHRoaXMucnVsZU5hbWUsIGJpbmRpbmdzLCBvZmZzZXRzLCBtYXRjaExlbmd0aCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5wZXhwcnMuQXBwbHkucHJvdG90eXBlLmdyb3dTZWVkUmVzdWx0ID0gZnVuY3Rpb24oYm9keSwgc3RhdGUsIG9yaWdQb3MsIGxyTWVtb1JlYywgbmV3VmFsdWUpIHtcbiAgaWYgKCFuZXdWYWx1ZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IHtpbnB1dFN0cmVhbX0gPSBzdGF0ZTtcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIGxyTWVtb1JlYy5tYXRjaExlbmd0aCA9IGlucHV0U3RyZWFtLnBvcyAtIG9yaWdQb3M7XG4gICAgbHJNZW1vUmVjLnZhbHVlID0gbmV3VmFsdWU7XG4gICAgbHJNZW1vUmVjLmZhaWx1cmVzQXRSaWdodG1vc3RQb3NpdGlvbiA9IHN0YXRlLmNsb25lUmVjb3JkZWRGYWlsdXJlcygpO1xuXG4gICAgaWYgKHN0YXRlLmlzVHJhY2luZygpKSB7XG4gICAgICAvLyBCZWZvcmUgZXZhbHVhdGluZyB0aGUgYm9keSBhZ2FpbiwgYWRkIGEgdHJhY2Ugbm9kZSBmb3IgdGhpcyBhcHBsaWNhdGlvbiB0byB0aGUgbWVtbyBlbnRyeS5cbiAgICAgIC8vIEl0cyBvbmx5IGNoaWxkIGlzIGEgY29weSBvZiB0aGUgdHJhY2Ugbm9kZSBmcm9tIGBuZXdWYWx1ZWAsIHdoaWNoIHdpbGwgYWx3YXlzIGJlIHRoZSBsYXN0XG4gICAgICAvLyBlbGVtZW50IGluIGBzdGF0ZS50cmFjZWAuXG4gICAgICBjb25zdCBzZWVkVHJhY2UgPSBzdGF0ZS50cmFjZVtzdGF0ZS50cmFjZS5sZW5ndGggLSAxXTtcbiAgICAgIGxyTWVtb1JlYy50cmFjZUVudHJ5ID0gbmV3IFRyYWNlKFxuICAgICAgICAgIHN0YXRlLmlucHV0LFxuICAgICAgICAgIG9yaWdQb3MsXG4gICAgICAgICAgaW5wdXRTdHJlYW0ucG9zLFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgdHJ1ZSxcbiAgICAgICAgICBbbmV3VmFsdWVdLFxuICAgICAgICAgIFtzZWVkVHJhY2UuY2xvbmUoKV0sXG4gICAgICApO1xuICAgIH1cbiAgICBpbnB1dFN0cmVhbS5wb3MgPSBvcmlnUG9zO1xuICAgIG5ld1ZhbHVlID0gdGhpcy5ldmFsT25jZShib2R5LCBzdGF0ZSk7XG4gICAgaWYgKGlucHV0U3RyZWFtLnBvcyAtIG9yaWdQb3MgPD0gbHJNZW1vUmVjLm1hdGNoTGVuZ3RoKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgaWYgKHN0YXRlLmlzVHJhY2luZygpKSB7XG4gICAgICBzdGF0ZS50cmFjZS5zcGxpY2UoLTIsIDEpOyAvLyBEcm9wIHRoZSB0cmFjZSBmb3IgdGhlIG9sZCBzZWVkLlxuICAgIH1cbiAgfVxuICBpZiAoc3RhdGUuaXNUcmFjaW5nKCkpIHtcbiAgICAvLyBUaGUgbGFzdCBlbnRyeSBpcyBmb3IgYW4gdW51c2VkIHJlc3VsdCAtLSBwb3AgaXQgYW5kIHNhdmUgaXQgaW4gdGhlIFwicmVhbFwiIGVudHJ5LlxuICAgIGxyTWVtb1JlYy50cmFjZUVudHJ5LnJlY29yZExSVGVybWluYXRpb24oc3RhdGUudHJhY2UucG9wKCksIG5ld1ZhbHVlKTtcbiAgfVxuICBpbnB1dFN0cmVhbS5wb3MgPSBvcmlnUG9zICsgbHJNZW1vUmVjLm1hdGNoTGVuZ3RoO1xuICByZXR1cm4gbHJNZW1vUmVjLnZhbHVlO1xufTtcblxucGV4cHJzLlVuaWNvZGVDaGFyLnByb3RvdHlwZS5ldmFsID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgY29uc3Qge2lucHV0U3RyZWFtfSA9IHN0YXRlO1xuICBjb25zdCBvcmlnUG9zID0gaW5wdXRTdHJlYW0ucG9zO1xuICBjb25zdCBjaCA9IGlucHV0U3RyZWFtLm5leHQoKTtcbiAgaWYgKGNoICYmIHRoaXMucGF0dGVybi50ZXN0KGNoKSkge1xuICAgIHN0YXRlLnB1c2hCaW5kaW5nKG5ldyBUZXJtaW5hbE5vZGUoY2gubGVuZ3RoKSwgb3JpZ1Bvcyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgc3RhdGUucHJvY2Vzc0ZhaWx1cmUob3JpZ1BvcywgdGhpcyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuIiwiaW1wb3J0IHthYnN0cmFjdH0gZnJvbSAnLi9jb21tb24uanMnO1xuaW1wb3J0ICogYXMgcGV4cHJzIGZyb20gJy4vcGV4cHJzLW1haW4uanMnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gT3BlcmF0aW9uc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxucGV4cHJzLlBFeHByLnByb3RvdHlwZS5nZXRBcml0eSA9IGFic3RyYWN0KCdnZXRBcml0eScpO1xuXG5wZXhwcnMuYW55LmdldEFyaXR5ID1cbiAgcGV4cHJzLmVuZC5nZXRBcml0eSA9XG4gIHBleHBycy5UZXJtaW5hbC5wcm90b3R5cGUuZ2V0QXJpdHkgPVxuICBwZXhwcnMuUmFuZ2UucHJvdG90eXBlLmdldEFyaXR5ID1cbiAgcGV4cHJzLlBhcmFtLnByb3RvdHlwZS5nZXRBcml0eSA9XG4gIHBleHBycy5BcHBseS5wcm90b3R5cGUuZ2V0QXJpdHkgPVxuICBwZXhwcnMuVW5pY29kZUNoYXIucHJvdG90eXBlLmdldEFyaXR5ID1cbiAgICBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH07XG5cbnBleHBycy5BbHQucHJvdG90eXBlLmdldEFyaXR5ID0gZnVuY3Rpb24oKSB7XG4gIC8vIFRoaXMgaXMgb2sgYi9jIGFsbCB0ZXJtcyBtdXN0IGhhdmUgdGhlIHNhbWUgYXJpdHkgLS0gdGhpcyBwcm9wZXJ0eSBpc1xuICAvLyBjaGVja2VkIGJ5IHRoZSBHcmFtbWFyIGNvbnN0cnVjdG9yLlxuICByZXR1cm4gdGhpcy50ZXJtcy5sZW5ndGggPT09IDAgPyAwIDogdGhpcy50ZXJtc1swXS5nZXRBcml0eSgpO1xufTtcblxucGV4cHJzLlNlcS5wcm90b3R5cGUuZ2V0QXJpdHkgPSBmdW5jdGlvbigpIHtcbiAgbGV0IGFyaXR5ID0gMDtcbiAgZm9yIChsZXQgaWR4ID0gMDsgaWR4IDwgdGhpcy5mYWN0b3JzLmxlbmd0aDsgaWR4KyspIHtcbiAgICBhcml0eSArPSB0aGlzLmZhY3RvcnNbaWR4XS5nZXRBcml0eSgpO1xuICB9XG4gIHJldHVybiBhcml0eTtcbn07XG5cbnBleHBycy5JdGVyLnByb3RvdHlwZS5nZXRBcml0eSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5leHByLmdldEFyaXR5KCk7XG59O1xuXG5wZXhwcnMuTm90LnByb3RvdHlwZS5nZXRBcml0eSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gMDtcbn07XG5cbnBleHBycy5Mb29rYWhlYWQucHJvdG90eXBlLmdldEFyaXR5ID0gcGV4cHJzLkxleC5wcm90b3R5cGUuZ2V0QXJpdHkgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZXhwci5nZXRBcml0eSgpO1xufTtcbiIsImltcG9ydCB7YWJzdHJhY3R9IGZyb20gJy4vY29tbW9uLmpzJztcbmltcG9ydCAqIGFzIHBleHBycyBmcm9tICcuL3BleHBycy1tYWluLmpzJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFByaXZhdGUgc3R1ZmZcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIGdldE1ldGFJbmZvKGV4cHIsIGdyYW1tYXJJbnRlcnZhbCkge1xuICBjb25zdCBtZXRhSW5mbyA9IHt9O1xuICBpZiAoZXhwci5zb3VyY2UgJiYgZ3JhbW1hckludGVydmFsKSB7XG4gICAgY29uc3QgYWRqdXN0ZWQgPSBleHByLnNvdXJjZS5yZWxhdGl2ZVRvKGdyYW1tYXJJbnRlcnZhbCk7XG4gICAgbWV0YUluZm8uc291cmNlSW50ZXJ2YWwgPSBbYWRqdXN0ZWQuc3RhcnRJZHgsIGFkanVzdGVkLmVuZElkeF07XG4gIH1cbiAgcmV0dXJuIG1ldGFJbmZvO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gT3BlcmF0aW9uc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxucGV4cHJzLlBFeHByLnByb3RvdHlwZS5vdXRwdXRSZWNpcGUgPSBhYnN0cmFjdCgnb3V0cHV0UmVjaXBlJyk7XG5cbnBleHBycy5hbnkub3V0cHV0UmVjaXBlID0gZnVuY3Rpb24oZm9ybWFscywgZ3JhbW1hckludGVydmFsKSB7XG4gIHJldHVybiBbJ2FueScsIGdldE1ldGFJbmZvKHRoaXMsIGdyYW1tYXJJbnRlcnZhbCldO1xufTtcblxucGV4cHJzLmVuZC5vdXRwdXRSZWNpcGUgPSBmdW5jdGlvbihmb3JtYWxzLCBncmFtbWFySW50ZXJ2YWwpIHtcbiAgcmV0dXJuIFsnZW5kJywgZ2V0TWV0YUluZm8odGhpcywgZ3JhbW1hckludGVydmFsKV07XG59O1xuXG5wZXhwcnMuVGVybWluYWwucHJvdG90eXBlLm91dHB1dFJlY2lwZSA9IGZ1bmN0aW9uKGZvcm1hbHMsIGdyYW1tYXJJbnRlcnZhbCkge1xuICByZXR1cm4gWyd0ZXJtaW5hbCcsIGdldE1ldGFJbmZvKHRoaXMsIGdyYW1tYXJJbnRlcnZhbCksIHRoaXMub2JqXTtcbn07XG5cbnBleHBycy5SYW5nZS5wcm90b3R5cGUub3V0cHV0UmVjaXBlID0gZnVuY3Rpb24oZm9ybWFscywgZ3JhbW1hckludGVydmFsKSB7XG4gIHJldHVybiBbJ3JhbmdlJywgZ2V0TWV0YUluZm8odGhpcywgZ3JhbW1hckludGVydmFsKSwgdGhpcy5mcm9tLCB0aGlzLnRvXTtcbn07XG5cbnBleHBycy5QYXJhbS5wcm90b3R5cGUub3V0cHV0UmVjaXBlID0gZnVuY3Rpb24oZm9ybWFscywgZ3JhbW1hckludGVydmFsKSB7XG4gIHJldHVybiBbJ3BhcmFtJywgZ2V0TWV0YUluZm8odGhpcywgZ3JhbW1hckludGVydmFsKSwgdGhpcy5pbmRleF07XG59O1xuXG5wZXhwcnMuQWx0LnByb3RvdHlwZS5vdXRwdXRSZWNpcGUgPSBmdW5jdGlvbihmb3JtYWxzLCBncmFtbWFySW50ZXJ2YWwpIHtcbiAgcmV0dXJuIFsnYWx0JywgZ2V0TWV0YUluZm8odGhpcywgZ3JhbW1hckludGVydmFsKV0uY29uY2F0KFxuICAgICAgdGhpcy50ZXJtcy5tYXAodGVybSA9PiB0ZXJtLm91dHB1dFJlY2lwZShmb3JtYWxzLCBncmFtbWFySW50ZXJ2YWwpKSxcbiAgKTtcbn07XG5cbnBleHBycy5FeHRlbmQucHJvdG90eXBlLm91dHB1dFJlY2lwZSA9IGZ1bmN0aW9uKGZvcm1hbHMsIGdyYW1tYXJJbnRlcnZhbCkge1xuICBjb25zdCBleHRlbnNpb24gPSB0aGlzLnRlcm1zWzBdOyAvLyBbZXh0ZW5zaW9uLCBvcmlnaW5hbF1cbiAgcmV0dXJuIGV4dGVuc2lvbi5vdXRwdXRSZWNpcGUoZm9ybWFscywgZ3JhbW1hckludGVydmFsKTtcbn07XG5cbnBleHBycy5TcGxpY2UucHJvdG90eXBlLm91dHB1dFJlY2lwZSA9IGZ1bmN0aW9uKGZvcm1hbHMsIGdyYW1tYXJJbnRlcnZhbCkge1xuICBjb25zdCBiZWZvcmVUZXJtcyA9IHRoaXMudGVybXMuc2xpY2UoMCwgdGhpcy5leHBhbnNpb25Qb3MpO1xuICBjb25zdCBhZnRlclRlcm1zID0gdGhpcy50ZXJtcy5zbGljZSh0aGlzLmV4cGFuc2lvblBvcyArIDEpO1xuICByZXR1cm4gW1xuICAgICdzcGxpY2UnLFxuICAgIGdldE1ldGFJbmZvKHRoaXMsIGdyYW1tYXJJbnRlcnZhbCksXG4gICAgYmVmb3JlVGVybXMubWFwKHRlcm0gPT4gdGVybS5vdXRwdXRSZWNpcGUoZm9ybWFscywgZ3JhbW1hckludGVydmFsKSksXG4gICAgYWZ0ZXJUZXJtcy5tYXAodGVybSA9PiB0ZXJtLm91dHB1dFJlY2lwZShmb3JtYWxzLCBncmFtbWFySW50ZXJ2YWwpKSxcbiAgXTtcbn07XG5cbnBleHBycy5TZXEucHJvdG90eXBlLm91dHB1dFJlY2lwZSA9IGZ1bmN0aW9uKGZvcm1hbHMsIGdyYW1tYXJJbnRlcnZhbCkge1xuICByZXR1cm4gWydzZXEnLCBnZXRNZXRhSW5mbyh0aGlzLCBncmFtbWFySW50ZXJ2YWwpXS5jb25jYXQoXG4gICAgICB0aGlzLmZhY3RvcnMubWFwKGZhY3RvciA9PiBmYWN0b3Iub3V0cHV0UmVjaXBlKGZvcm1hbHMsIGdyYW1tYXJJbnRlcnZhbCkpLFxuICApO1xufTtcblxucGV4cHJzLlN0YXIucHJvdG90eXBlLm91dHB1dFJlY2lwZSA9XG4gIHBleHBycy5QbHVzLnByb3RvdHlwZS5vdXRwdXRSZWNpcGUgPVxuICBwZXhwcnMuT3B0LnByb3RvdHlwZS5vdXRwdXRSZWNpcGUgPVxuICBwZXhwcnMuTm90LnByb3RvdHlwZS5vdXRwdXRSZWNpcGUgPVxuICBwZXhwcnMuTG9va2FoZWFkLnByb3RvdHlwZS5vdXRwdXRSZWNpcGUgPVxuICBwZXhwcnMuTGV4LnByb3RvdHlwZS5vdXRwdXRSZWNpcGUgPVxuICAgIGZ1bmN0aW9uKGZvcm1hbHMsIGdyYW1tYXJJbnRlcnZhbCkge1xuICAgICAgcmV0dXJuIFtcbiAgICAgICAgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lLnRvTG93ZXJDYXNlKCksXG4gICAgICAgIGdldE1ldGFJbmZvKHRoaXMsIGdyYW1tYXJJbnRlcnZhbCksXG4gICAgICAgIHRoaXMuZXhwci5vdXRwdXRSZWNpcGUoZm9ybWFscywgZ3JhbW1hckludGVydmFsKSxcbiAgICAgIF07XG4gICAgfTtcblxucGV4cHJzLkFwcGx5LnByb3RvdHlwZS5vdXRwdXRSZWNpcGUgPSBmdW5jdGlvbihmb3JtYWxzLCBncmFtbWFySW50ZXJ2YWwpIHtcbiAgcmV0dXJuIFtcbiAgICAnYXBwJyxcbiAgICBnZXRNZXRhSW5mbyh0aGlzLCBncmFtbWFySW50ZXJ2YWwpLFxuICAgIHRoaXMucnVsZU5hbWUsXG4gICAgdGhpcy5hcmdzLm1hcChhcmcgPT4gYXJnLm91dHB1dFJlY2lwZShmb3JtYWxzLCBncmFtbWFySW50ZXJ2YWwpKSxcbiAgXTtcbn07XG5cbnBleHBycy5Vbmljb2RlQ2hhci5wcm90b3R5cGUub3V0cHV0UmVjaXBlID0gZnVuY3Rpb24oZm9ybWFscywgZ3JhbW1hckludGVydmFsKSB7XG4gIHJldHVybiBbJ3VuaWNvZGVDaGFyJywgZ2V0TWV0YUluZm8odGhpcywgZ3JhbW1hckludGVydmFsKSwgdGhpcy5jYXRlZ29yeV07XG59O1xuIiwiaW1wb3J0IHthYnN0cmFjdH0gZnJvbSAnLi9jb21tb24uanMnO1xuaW1wb3J0ICogYXMgcGV4cHJzIGZyb20gJy4vcGV4cHJzLW1haW4uanMnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gT3BlcmF0aW9uc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLypcbiAgQ2FsbGVkIGF0IGdyYW1tYXIgY3JlYXRpb24gdGltZSB0byByZXdyaXRlIGEgcnVsZSBib2R5LCByZXBsYWNpbmcgZWFjaCByZWZlcmVuY2UgdG8gYSBmb3JtYWxcbiAgcGFyYW1ldGVyIHdpdGggYSBgUGFyYW1gIG5vZGUuIFJldHVybnMgYSBQRXhwciAtLSBlaXRoZXIgYSBuZXcgb25lLCBvciB0aGUgb3JpZ2luYWwgb25lIGlmXG4gIGl0IHdhcyBtb2RpZmllZCBpbiBwbGFjZS5cbiovXG5wZXhwcnMuUEV4cHIucHJvdG90eXBlLmludHJvZHVjZVBhcmFtcyA9IGFic3RyYWN0KCdpbnRyb2R1Y2VQYXJhbXMnKTtcblxucGV4cHJzLmFueS5pbnRyb2R1Y2VQYXJhbXMgPVxuICBwZXhwcnMuZW5kLmludHJvZHVjZVBhcmFtcyA9XG4gIHBleHBycy5UZXJtaW5hbC5wcm90b3R5cGUuaW50cm9kdWNlUGFyYW1zID1cbiAgcGV4cHJzLlJhbmdlLnByb3RvdHlwZS5pbnRyb2R1Y2VQYXJhbXMgPVxuICBwZXhwcnMuUGFyYW0ucHJvdG90eXBlLmludHJvZHVjZVBhcmFtcyA9XG4gIHBleHBycy5Vbmljb2RlQ2hhci5wcm90b3R5cGUuaW50cm9kdWNlUGFyYW1zID1cbiAgICBmdW5jdGlvbihmb3JtYWxzKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG5wZXhwcnMuQWx0LnByb3RvdHlwZS5pbnRyb2R1Y2VQYXJhbXMgPSBmdW5jdGlvbihmb3JtYWxzKSB7XG4gIHRoaXMudGVybXMuZm9yRWFjaCgodGVybSwgaWR4LCB0ZXJtcykgPT4ge1xuICAgIHRlcm1zW2lkeF0gPSB0ZXJtLmludHJvZHVjZVBhcmFtcyhmb3JtYWxzKTtcbiAgfSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxucGV4cHJzLlNlcS5wcm90b3R5cGUuaW50cm9kdWNlUGFyYW1zID0gZnVuY3Rpb24oZm9ybWFscykge1xuICB0aGlzLmZhY3RvcnMuZm9yRWFjaCgoZmFjdG9yLCBpZHgsIGZhY3RvcnMpID0+IHtcbiAgICBmYWN0b3JzW2lkeF0gPSBmYWN0b3IuaW50cm9kdWNlUGFyYW1zKGZvcm1hbHMpO1xuICB9KTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5wZXhwcnMuSXRlci5wcm90b3R5cGUuaW50cm9kdWNlUGFyYW1zID1cbiAgcGV4cHJzLk5vdC5wcm90b3R5cGUuaW50cm9kdWNlUGFyYW1zID1cbiAgcGV4cHJzLkxvb2thaGVhZC5wcm90b3R5cGUuaW50cm9kdWNlUGFyYW1zID1cbiAgcGV4cHJzLkxleC5wcm90b3R5cGUuaW50cm9kdWNlUGFyYW1zID1cbiAgICBmdW5jdGlvbihmb3JtYWxzKSB7XG4gICAgICB0aGlzLmV4cHIgPSB0aGlzLmV4cHIuaW50cm9kdWNlUGFyYW1zKGZvcm1hbHMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxucGV4cHJzLkFwcGx5LnByb3RvdHlwZS5pbnRyb2R1Y2VQYXJhbXMgPSBmdW5jdGlvbihmb3JtYWxzKSB7XG4gIGNvbnN0IGluZGV4ID0gZm9ybWFscy5pbmRleE9mKHRoaXMucnVsZU5hbWUpO1xuICBpZiAoaW5kZXggPj0gMCkge1xuICAgIGlmICh0aGlzLmFyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgLy8gVE9ETzogU2hvdWxkIHRoaXMgYmUgc3VwcG9ydGVkPyBTZWUgaXNzdWUgIzY0LlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdQYXJhbWV0ZXJpemVkIHJ1bGVzIGNhbm5vdCBiZSBwYXNzZWQgYXMgYXJndW1lbnRzIHRvIGFub3RoZXIgcnVsZS4nKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBwZXhwcnMuUGFyYW0oaW5kZXgpLndpdGhTb3VyY2UodGhpcy5zb3VyY2UpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuYXJncy5mb3JFYWNoKChhcmcsIGlkeCwgYXJncykgPT4ge1xuICAgICAgYXJnc1tpZHhdID0gYXJnLmludHJvZHVjZVBhcmFtcyhmb3JtYWxzKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxufTtcbiIsImltcG9ydCB7YWJzdHJhY3R9IGZyb20gJy4vY29tbW9uLmpzJztcbmltcG9ydCAqIGFzIHBleHBycyBmcm9tICcuL3BleHBycy1tYWluLmpzJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIE9wZXJhdGlvbnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIFJldHVybnMgYHRydWVgIGlmIHRoaXMgcGFyc2luZyBleHByZXNzaW9uIG1heSBhY2NlcHQgd2l0aG91dCBjb25zdW1pbmcgYW55IGlucHV0LlxucGV4cHJzLlBFeHByLnByb3RvdHlwZS5pc051bGxhYmxlID0gZnVuY3Rpb24oZ3JhbW1hcikge1xuICByZXR1cm4gdGhpcy5faXNOdWxsYWJsZShncmFtbWFyLCBPYmplY3QuY3JlYXRlKG51bGwpKTtcbn07XG5cbnBleHBycy5QRXhwci5wcm90b3R5cGUuX2lzTnVsbGFibGUgPSBhYnN0cmFjdCgnX2lzTnVsbGFibGUnKTtcblxucGV4cHJzLmFueS5faXNOdWxsYWJsZSA9XG4gIHBleHBycy5SYW5nZS5wcm90b3R5cGUuX2lzTnVsbGFibGUgPVxuICBwZXhwcnMuUGFyYW0ucHJvdG90eXBlLl9pc051bGxhYmxlID1cbiAgcGV4cHJzLlBsdXMucHJvdG90eXBlLl9pc051bGxhYmxlID1cbiAgcGV4cHJzLlVuaWNvZGVDaGFyLnByb3RvdHlwZS5faXNOdWxsYWJsZSA9XG4gICAgZnVuY3Rpb24oZ3JhbW1hciwgbWVtbykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbnBleHBycy5lbmQuX2lzTnVsbGFibGUgPSBmdW5jdGlvbihncmFtbWFyLCBtZW1vKSB7XG4gIHJldHVybiB0cnVlO1xufTtcblxucGV4cHJzLlRlcm1pbmFsLnByb3RvdHlwZS5faXNOdWxsYWJsZSA9IGZ1bmN0aW9uKGdyYW1tYXIsIG1lbW8pIHtcbiAgaWYgKHR5cGVvZiB0aGlzLm9iaiA9PT0gJ3N0cmluZycpIHtcbiAgICAvLyBUaGlzIGlzIGFuIG92ZXItc2ltcGxpZmljYXRpb246IGl0J3Mgb25seSBjb3JyZWN0IGlmIHRoZSBpbnB1dCBpcyBhIHN0cmluZy4gSWYgaXQncyBhbiBhcnJheVxuICAgIC8vIG9yIGFuIG9iamVjdCwgdGhlbiB0aGUgZW1wdHkgc3RyaW5nIHBhcnNpbmcgZXhwcmVzc2lvbiBpcyBub3QgbnVsbGFibGUuXG4gICAgcmV0dXJuIHRoaXMub2JqID09PSAnJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cbnBleHBycy5BbHQucHJvdG90eXBlLl9pc051bGxhYmxlID0gZnVuY3Rpb24oZ3JhbW1hciwgbWVtbykge1xuICByZXR1cm4gdGhpcy50ZXJtcy5sZW5ndGggPT09IDAgfHwgdGhpcy50ZXJtcy5zb21lKHRlcm0gPT4gdGVybS5faXNOdWxsYWJsZShncmFtbWFyLCBtZW1vKSk7XG59O1xuXG5wZXhwcnMuU2VxLnByb3RvdHlwZS5faXNOdWxsYWJsZSA9IGZ1bmN0aW9uKGdyYW1tYXIsIG1lbW8pIHtcbiAgcmV0dXJuIHRoaXMuZmFjdG9ycy5ldmVyeShmYWN0b3IgPT4gZmFjdG9yLl9pc051bGxhYmxlKGdyYW1tYXIsIG1lbW8pKTtcbn07XG5cbnBleHBycy5TdGFyLnByb3RvdHlwZS5faXNOdWxsYWJsZSA9XG4gIHBleHBycy5PcHQucHJvdG90eXBlLl9pc051bGxhYmxlID1cbiAgcGV4cHJzLk5vdC5wcm90b3R5cGUuX2lzTnVsbGFibGUgPVxuICBwZXhwcnMuTG9va2FoZWFkLnByb3RvdHlwZS5faXNOdWxsYWJsZSA9XG4gICAgZnVuY3Rpb24oZ3JhbW1hciwgbWVtbykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxucGV4cHJzLkxleC5wcm90b3R5cGUuX2lzTnVsbGFibGUgPSBmdW5jdGlvbihncmFtbWFyLCBtZW1vKSB7XG4gIHJldHVybiB0aGlzLmV4cHIuX2lzTnVsbGFibGUoZ3JhbW1hciwgbWVtbyk7XG59O1xuXG5wZXhwcnMuQXBwbHkucHJvdG90eXBlLl9pc051bGxhYmxlID0gZnVuY3Rpb24oZ3JhbW1hciwgbWVtbykge1xuICBjb25zdCBrZXkgPSB0aGlzLnRvTWVtb0tleSgpO1xuICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtZW1vLCBrZXkpKSB7XG4gICAgY29uc3Qge2JvZHl9ID0gZ3JhbW1hci5ydWxlc1t0aGlzLnJ1bGVOYW1lXTtcbiAgICBjb25zdCBpbmxpbmVkID0gYm9keS5zdWJzdGl0dXRlUGFyYW1zKHRoaXMuYXJncyk7XG4gICAgbWVtb1trZXldID0gZmFsc2U7IC8vIFByZXZlbnQgaW5maW5pdGUgcmVjdXJzaW9uIGZvciByZWN1cnNpdmUgcnVsZXMuXG4gICAgbWVtb1trZXldID0gaW5saW5lZC5faXNOdWxsYWJsZShncmFtbWFyLCBtZW1vKTtcbiAgfVxuICByZXR1cm4gbWVtb1trZXldO1xufTtcbiIsImltcG9ydCB7YWJzdHJhY3R9IGZyb20gJy4vY29tbW9uLmpzJztcbmltcG9ydCAqIGFzIHBleHBycyBmcm9tICcuL3BleHBycy1tYWluLmpzJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIE9wZXJhdGlvbnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qXG4gIFJldHVybnMgYSBQRXhwciB0aGF0IHJlc3VsdHMgZnJvbSByZWN1cnNpdmVseSByZXBsYWNpbmcgZXZlcnkgZm9ybWFsIHBhcmFtZXRlciAoaS5lLiwgaW5zdGFuY2VcbiAgb2YgYFBhcmFtYCkgaW5zaWRlIHRoaXMgUEV4cHIgd2l0aCBpdHMgYWN0dWFsIHZhbHVlIGZyb20gYGFjdHVhbHNgIChhbiBBcnJheSkuXG5cbiAgVGhlIHJlY2VpdmVyIG11c3Qgbm90IGJlIG1vZGlmaWVkOyBhIG5ldyBQRXhwciBtdXN0IGJlIHJldHVybmVkIGlmIGFueSByZXBsYWNlbWVudCBpcyBuZWNlc3NhcnkuXG4qL1xuLy8gZnVuY3Rpb24oYWN0dWFscykgeyAuLi4gfVxucGV4cHJzLlBFeHByLnByb3RvdHlwZS5zdWJzdGl0dXRlUGFyYW1zID0gYWJzdHJhY3QoJ3N1YnN0aXR1dGVQYXJhbXMnKTtcblxucGV4cHJzLmFueS5zdWJzdGl0dXRlUGFyYW1zID1cbiAgcGV4cHJzLmVuZC5zdWJzdGl0dXRlUGFyYW1zID1cbiAgcGV4cHJzLlRlcm1pbmFsLnByb3RvdHlwZS5zdWJzdGl0dXRlUGFyYW1zID1cbiAgcGV4cHJzLlJhbmdlLnByb3RvdHlwZS5zdWJzdGl0dXRlUGFyYW1zID1cbiAgcGV4cHJzLlVuaWNvZGVDaGFyLnByb3RvdHlwZS5zdWJzdGl0dXRlUGFyYW1zID1cbiAgICBmdW5jdGlvbihhY3R1YWxzKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG5wZXhwcnMuUGFyYW0ucHJvdG90eXBlLnN1YnN0aXR1dGVQYXJhbXMgPSBmdW5jdGlvbihhY3R1YWxzKSB7XG4gIHJldHVybiBhY3R1YWxzW3RoaXMuaW5kZXhdO1xufTtcblxucGV4cHJzLkFsdC5wcm90b3R5cGUuc3Vic3RpdHV0ZVBhcmFtcyA9IGZ1bmN0aW9uKGFjdHVhbHMpIHtcbiAgcmV0dXJuIG5ldyBwZXhwcnMuQWx0KHRoaXMudGVybXMubWFwKHRlcm0gPT4gdGVybS5zdWJzdGl0dXRlUGFyYW1zKGFjdHVhbHMpKSk7XG59O1xuXG5wZXhwcnMuU2VxLnByb3RvdHlwZS5zdWJzdGl0dXRlUGFyYW1zID0gZnVuY3Rpb24oYWN0dWFscykge1xuICByZXR1cm4gbmV3IHBleHBycy5TZXEodGhpcy5mYWN0b3JzLm1hcChmYWN0b3IgPT4gZmFjdG9yLnN1YnN0aXR1dGVQYXJhbXMoYWN0dWFscykpKTtcbn07XG5cbnBleHBycy5JdGVyLnByb3RvdHlwZS5zdWJzdGl0dXRlUGFyYW1zID1cbiAgcGV4cHJzLk5vdC5wcm90b3R5cGUuc3Vic3RpdHV0ZVBhcmFtcyA9XG4gIHBleHBycy5Mb29rYWhlYWQucHJvdG90eXBlLnN1YnN0aXR1dGVQYXJhbXMgPVxuICBwZXhwcnMuTGV4LnByb3RvdHlwZS5zdWJzdGl0dXRlUGFyYW1zID1cbiAgICBmdW5jdGlvbihhY3R1YWxzKSB7XG4gICAgICByZXR1cm4gbmV3IHRoaXMuY29uc3RydWN0b3IodGhpcy5leHByLnN1YnN0aXR1dGVQYXJhbXMoYWN0dWFscykpO1xuICAgIH07XG5cbnBleHBycy5BcHBseS5wcm90b3R5cGUuc3Vic3RpdHV0ZVBhcmFtcyA9IGZ1bmN0aW9uKGFjdHVhbHMpIHtcbiAgaWYgKHRoaXMuYXJncy5sZW5ndGggPT09IDApIHtcbiAgICAvLyBBdm9pZCBtYWtpbmcgYSBjb3B5IG9mIHRoaXMgYXBwbGljYXRpb24sIGFzIGFuIG9wdGltaXphdGlvblxuICAgIHJldHVybiB0aGlzO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGFyZ3MgPSB0aGlzLmFyZ3MubWFwKGFyZyA9PiBhcmcuc3Vic3RpdHV0ZVBhcmFtcyhhY3R1YWxzKSk7XG4gICAgcmV0dXJuIG5ldyBwZXhwcnMuQXBwbHkodGhpcy5ydWxlTmFtZSwgYXJncyk7XG4gIH1cbn07XG4iLCJpbXBvcnQge2Fic3RyYWN0LCBjb3B5V2l0aG91dER1cGxpY2F0ZXN9IGZyb20gJy4vY29tbW9uLmpzJztcbmltcG9ydCAqIGFzIHBleHBycyBmcm9tICcuL3BleHBycy1tYWluLmpzJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFByaXZhdGUgc3R1ZmZcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIGlzUmVzdHJpY3RlZEpTSWRlbnRpZmllcihzdHIpIHtcbiAgcmV0dXJuIC9eW2EtekEtWl8kXVswLTlhLXpBLVpfJF0qJC8udGVzdChzdHIpO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlRHVwbGljYXRlZE5hbWVzKGFyZ3VtZW50TmFtZUxpc3QpIHtcbiAgLy8gYGNvdW50YCBpcyB1c2VkIHRvIHJlY29yZCB0aGUgbnVtYmVyIG9mIHRpbWVzIGVhY2ggYXJndW1lbnQgbmFtZSBvY2N1cnMgaW4gdGhlIGxpc3QsXG4gIC8vIHRoaXMgaXMgdXNlZnVsIGZvciBjaGVja2luZyBkdXBsaWNhdGVkIGFyZ3VtZW50IG5hbWUuIEl0IG1hcHMgYXJndW1lbnQgbmFtZXMgdG8gaW50cy5cbiAgY29uc3QgY291bnQgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICBhcmd1bWVudE5hbWVMaXN0LmZvckVhY2goYXJnTmFtZSA9PiB7XG4gICAgY291bnRbYXJnTmFtZV0gPSAoY291bnRbYXJnTmFtZV0gfHwgMCkgKyAxO1xuICB9KTtcblxuICAvLyBBcHBlbmQgc3Vic2NyaXB0cyAoJ18xJywgJ18yJywgLi4uKSB0byBkdXBsaWNhdGUgYXJndW1lbnQgbmFtZXMuXG4gIE9iamVjdC5rZXlzKGNvdW50KS5mb3JFYWNoKGR1cEFyZ05hbWUgPT4ge1xuICAgIGlmIChjb3VudFtkdXBBcmdOYW1lXSA8PSAxKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVGhpcyBuYW1lIHNob3dzIHVwIG1vcmUgdGhhbiBvbmNlLCBzbyBhZGQgc3Vic2NyaXB0cy5cbiAgICBsZXQgc3Vic2NyaXB0ID0gMTtcbiAgICBhcmd1bWVudE5hbWVMaXN0LmZvckVhY2goKGFyZ05hbWUsIGlkeCkgPT4ge1xuICAgICAgaWYgKGFyZ05hbWUgPT09IGR1cEFyZ05hbWUpIHtcbiAgICAgICAgYXJndW1lbnROYW1lTGlzdFtpZHhdID0gYXJnTmFtZSArICdfJyArIHN1YnNjcmlwdCsrO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIE9wZXJhdGlvbnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qXG4gIFJldHVybnMgYSBsaXN0IG9mIHN0cmluZ3MgdGhhdCB3aWxsIGJlIHVzZWQgYXMgdGhlIGRlZmF1bHQgYXJndW1lbnQgbmFtZXMgZm9yIGl0cyByZWNlaXZlclxuICAoYSBwZXhwcikgaW4gYSBzZW1hbnRpYyBhY3Rpb24uIFRoaXMgaXMgdXNlZCBleGNsdXNpdmVseSBieSB0aGUgU2VtYW50aWNzIEVkaXRvci5cblxuICBgZmlyc3RBcmdJbmRleGAgaXMgdGhlIDEtYmFzZWQgaW5kZXggb2YgdGhlIGZpcnN0IGFyZ3VtZW50IG5hbWUgdGhhdCB3aWxsIGJlIGdlbmVyYXRlZCBmb3IgdGhpc1xuICBwZXhwci4gSXQgZW5hYmxlcyB1cyB0byBuYW1lIGFyZ3VtZW50cyBwb3NpdGlvbmFsbHksIGUuZy4sIGlmIHRoZSBzZWNvbmQgYXJndW1lbnQgaXMgYVxuICBub24tYWxwaGFudW1lcmljIHRlcm1pbmFsIGxpa2UgXCIrXCIsIGl0IHdpbGwgYmUgbmFtZWQgJyQyJy5cblxuICBgbm9EdXBDaGVja2AgaXMgdHJ1ZSBpZiB0aGUgY2FsbGVyIG9mIGB0b0FyZ3VtZW50TmFtZUxpc3RgIGlzIG5vdCBhIHRvcCBsZXZlbCBjYWxsZXIuIEl0IGVuYWJsZXNcbiAgdXMgdG8gYXZvaWQgbmVzdGVkIGR1cGxpY2F0aW9uIHN1YnNjcmlwdHMgYXBwZW5kaW5nLCBlLmcuLCAnXzFfMScsICdfMV8yJywgYnkgb25seSBjaGVja2luZ1xuICBkdXBsaWNhdGVzIGF0IHRoZSB0b3AgbGV2ZWwuXG5cbiAgSGVyZSBpcyBhIG1vcmUgZWxhYm9yYXRlIGV4YW1wbGUgdGhhdCBpbGx1c3RyYXRlcyBob3cgdGhpcyBtZXRob2Qgd29ya3M6XG4gIGAoYSBcIitcIiBiKS50b0FyZ3VtZW50TmFtZUxpc3QoMSlgIGV2YWx1YXRlcyB0byBgWydhJywgJyQyJywgJ2InXWAgd2l0aCB0aGUgZm9sbG93aW5nIHJlY3Vyc2l2ZVxuICBjYWxsczpcblxuICAgIChhKS50b0FyZ3VtZW50TmFtZUxpc3QoMSkgLT4gWydhJ10sXG4gICAgKFwiK1wiKS50b0FyZ3VtZW50TmFtZUxpc3QoMikgLT4gWyckMiddLFxuICAgIChiKS50b0FyZ3VtZW50TmFtZUxpc3QoMykgLT4gWydiJ11cblxuICBOb3RlczpcbiAgKiBUaGlzIG1ldGhvZCBtdXN0IG9ubHkgYmUgY2FsbGVkIG9uIHdlbGwtZm9ybWVkIGV4cHJlc3Npb25zLCBlLmcuLCB0aGUgcmVjZWl2ZXIgbXVzdFxuICAgIG5vdCBoYXZlIGFueSBBbHQgc3ViLWV4cHJlc3Npb25zIHdpdGggaW5jb25zaXN0ZW50IGFyaXRpZXMuXG4gICogZS5nZXRBcml0eSgpID09PSBlLnRvQXJndW1lbnROYW1lTGlzdCgxKS5sZW5ndGhcbiovXG4vLyBmdW5jdGlvbihmaXJzdEFyZ0luZGV4LCBub0R1cENoZWNrKSB7IC4uLiB9XG5wZXhwcnMuUEV4cHIucHJvdG90eXBlLnRvQXJndW1lbnROYW1lTGlzdCA9IGFic3RyYWN0KCd0b0FyZ3VtZW50TmFtZUxpc3QnKTtcblxucGV4cHJzLmFueS50b0FyZ3VtZW50TmFtZUxpc3QgPSBmdW5jdGlvbihmaXJzdEFyZ0luZGV4LCBub0R1cENoZWNrKSB7XG4gIHJldHVybiBbJ2FueSddO1xufTtcblxucGV4cHJzLmVuZC50b0FyZ3VtZW50TmFtZUxpc3QgPSBmdW5jdGlvbihmaXJzdEFyZ0luZGV4LCBub0R1cENoZWNrKSB7XG4gIHJldHVybiBbJ2VuZCddO1xufTtcblxucGV4cHJzLlRlcm1pbmFsLnByb3RvdHlwZS50b0FyZ3VtZW50TmFtZUxpc3QgPSBmdW5jdGlvbihmaXJzdEFyZ0luZGV4LCBub0R1cENoZWNrKSB7XG4gIGlmICh0eXBlb2YgdGhpcy5vYmogPT09ICdzdHJpbmcnICYmIC9eW19hLXpBLVowLTldKyQvLnRlc3QodGhpcy5vYmopKSB7XG4gICAgLy8gSWYgdGhpcyB0ZXJtaW5hbCBpcyBhIHZhbGlkIHN1ZmZpeCBmb3IgYSBKUyBpZGVudGlmaWVyLCBqdXN0IHByZXBlbmQgaXQgd2l0aCAnXydcbiAgICByZXR1cm4gWydfJyArIHRoaXMub2JqXTtcbiAgfSBlbHNlIHtcbiAgICAvLyBPdGhlcndpc2UsIG5hbWUgaXQgcG9zaXRpb25hbGx5LlxuICAgIHJldHVybiBbJyQnICsgZmlyc3RBcmdJbmRleF07XG4gIH1cbn07XG5cbnBleHBycy5SYW5nZS5wcm90b3R5cGUudG9Bcmd1bWVudE5hbWVMaXN0ID0gZnVuY3Rpb24oZmlyc3RBcmdJbmRleCwgbm9EdXBDaGVjaykge1xuICBsZXQgYXJnTmFtZSA9IHRoaXMuZnJvbSArICdfdG9fJyArIHRoaXMudG87XG4gIC8vIElmIHRoZSBgYXJnTmFtZWAgaXMgbm90IHZhbGlkIHRoZW4gdHJ5IHRvIHByZXBlbmQgYSBgX2AuXG4gIGlmICghaXNSZXN0cmljdGVkSlNJZGVudGlmaWVyKGFyZ05hbWUpKSB7XG4gICAgYXJnTmFtZSA9ICdfJyArIGFyZ05hbWU7XG4gIH1cbiAgLy8gSWYgdGhlIGBhcmdOYW1lYCBzdGlsbCBub3QgdmFsaWQgYWZ0ZXIgcHJlcGVuZGluZyBhIGBfYCwgdGhlbiBuYW1lIGl0IHBvc2l0aW9uYWxseS5cbiAgaWYgKCFpc1Jlc3RyaWN0ZWRKU0lkZW50aWZpZXIoYXJnTmFtZSkpIHtcbiAgICBhcmdOYW1lID0gJyQnICsgZmlyc3RBcmdJbmRleDtcbiAgfVxuICByZXR1cm4gW2FyZ05hbWVdO1xufTtcblxucGV4cHJzLkFsdC5wcm90b3R5cGUudG9Bcmd1bWVudE5hbWVMaXN0ID0gZnVuY3Rpb24oZmlyc3RBcmdJbmRleCwgbm9EdXBDaGVjaykge1xuICAvLyBgdGVybUFyZ05hbWVMaXN0c2AgaXMgYW4gYXJyYXkgb2YgYXJyYXlzIHdoZXJlIGVhY2ggcm93IGlzIHRoZVxuICAvLyBhcmd1bWVudCBuYW1lIGxpc3QgdGhhdCBjb3JyZXNwb25kcyB0byBhIHRlcm0gaW4gdGhpcyBhbHRlcm5hdGlvbi5cbiAgY29uc3QgdGVybUFyZ05hbWVMaXN0cyA9IHRoaXMudGVybXMubWFwKHRlcm0gPT5cbiAgICB0ZXJtLnRvQXJndW1lbnROYW1lTGlzdChmaXJzdEFyZ0luZGV4LCB0cnVlKSxcbiAgKTtcblxuICBjb25zdCBhcmd1bWVudE5hbWVMaXN0ID0gW107XG4gIGNvbnN0IG51bUFyZ3MgPSB0ZXJtQXJnTmFtZUxpc3RzWzBdLmxlbmd0aDtcbiAgZm9yIChsZXQgY29sSWR4ID0gMDsgY29sSWR4IDwgbnVtQXJnczsgY29sSWR4KyspIHtcbiAgICBjb25zdCBjb2wgPSBbXTtcbiAgICBmb3IgKGxldCByb3dJZHggPSAwOyByb3dJZHggPCB0aGlzLnRlcm1zLmxlbmd0aDsgcm93SWR4KyspIHtcbiAgICAgIGNvbC5wdXNoKHRlcm1BcmdOYW1lTGlzdHNbcm93SWR4XVtjb2xJZHhdKTtcbiAgICB9XG4gICAgY29uc3QgdW5pcXVlTmFtZXMgPSBjb3B5V2l0aG91dER1cGxpY2F0ZXMoY29sKTtcbiAgICBhcmd1bWVudE5hbWVMaXN0LnB1c2godW5pcXVlTmFtZXMuam9pbignX29yXycpKTtcbiAgfVxuXG4gIGlmICghbm9EdXBDaGVjaykge1xuICAgIHJlc29sdmVEdXBsaWNhdGVkTmFtZXMoYXJndW1lbnROYW1lTGlzdCk7XG4gIH1cbiAgcmV0dXJuIGFyZ3VtZW50TmFtZUxpc3Q7XG59O1xuXG5wZXhwcnMuU2VxLnByb3RvdHlwZS50b0FyZ3VtZW50TmFtZUxpc3QgPSBmdW5jdGlvbihmaXJzdEFyZ0luZGV4LCBub0R1cENoZWNrKSB7XG4gIC8vIEdlbmVyYXRlIHRoZSBhcmd1bWVudCBuYW1lIGxpc3QsIHdpdGhvdXQgd29ycnlpbmcgYWJvdXQgZHVwbGljYXRlcy5cbiAgbGV0IGFyZ3VtZW50TmFtZUxpc3QgPSBbXTtcbiAgdGhpcy5mYWN0b3JzLmZvckVhY2goZmFjdG9yID0+IHtcbiAgICBjb25zdCBmYWN0b3JBcmd1bWVudE5hbWVMaXN0ID0gZmFjdG9yLnRvQXJndW1lbnROYW1lTGlzdChmaXJzdEFyZ0luZGV4LCB0cnVlKTtcbiAgICBhcmd1bWVudE5hbWVMaXN0ID0gYXJndW1lbnROYW1lTGlzdC5jb25jYXQoZmFjdG9yQXJndW1lbnROYW1lTGlzdCk7XG5cbiAgICAvLyBTaGlmdCB0aGUgZmlyc3RBcmdJbmRleCB0byB0YWtlIHRoaXMgZmFjdG9yJ3MgYXJndW1lbnQgbmFtZXMgaW50byBhY2NvdW50LlxuICAgIGZpcnN0QXJnSW5kZXggKz0gZmFjdG9yQXJndW1lbnROYW1lTGlzdC5sZW5ndGg7XG4gIH0pO1xuICBpZiAoIW5vRHVwQ2hlY2spIHtcbiAgICByZXNvbHZlRHVwbGljYXRlZE5hbWVzKGFyZ3VtZW50TmFtZUxpc3QpO1xuICB9XG4gIHJldHVybiBhcmd1bWVudE5hbWVMaXN0O1xufTtcblxucGV4cHJzLkl0ZXIucHJvdG90eXBlLnRvQXJndW1lbnROYW1lTGlzdCA9IGZ1bmN0aW9uKGZpcnN0QXJnSW5kZXgsIG5vRHVwQ2hlY2spIHtcbiAgY29uc3QgYXJndW1lbnROYW1lTGlzdCA9IHRoaXMuZXhwclxuICAgICAgLnRvQXJndW1lbnROYW1lTGlzdChmaXJzdEFyZ0luZGV4LCBub0R1cENoZWNrKVxuICAgICAgLm1hcChleHByQXJndW1lbnRTdHJpbmcgPT5cbiAgICAgIGV4cHJBcmd1bWVudFN0cmluZ1tleHByQXJndW1lbnRTdHJpbmcubGVuZ3RoIC0gMV0gPT09ICdzJyA/XG4gICAgICAgIGV4cHJBcmd1bWVudFN0cmluZyArICdlcycgOlxuICAgICAgICBleHByQXJndW1lbnRTdHJpbmcgKyAncycsXG4gICAgICApO1xuICBpZiAoIW5vRHVwQ2hlY2spIHtcbiAgICByZXNvbHZlRHVwbGljYXRlZE5hbWVzKGFyZ3VtZW50TmFtZUxpc3QpO1xuICB9XG4gIHJldHVybiBhcmd1bWVudE5hbWVMaXN0O1xufTtcblxucGV4cHJzLk9wdC5wcm90b3R5cGUudG9Bcmd1bWVudE5hbWVMaXN0ID0gZnVuY3Rpb24oZmlyc3RBcmdJbmRleCwgbm9EdXBDaGVjaykge1xuICByZXR1cm4gdGhpcy5leHByLnRvQXJndW1lbnROYW1lTGlzdChmaXJzdEFyZ0luZGV4LCBub0R1cENoZWNrKS5tYXAoYXJnTmFtZSA9PiB7XG4gICAgcmV0dXJuICdvcHQnICsgYXJnTmFtZVswXS50b1VwcGVyQ2FzZSgpICsgYXJnTmFtZS5zbGljZSgxKTtcbiAgfSk7XG59O1xuXG5wZXhwcnMuTm90LnByb3RvdHlwZS50b0FyZ3VtZW50TmFtZUxpc3QgPSBmdW5jdGlvbihmaXJzdEFyZ0luZGV4LCBub0R1cENoZWNrKSB7XG4gIHJldHVybiBbXTtcbn07XG5cbnBleHBycy5Mb29rYWhlYWQucHJvdG90eXBlLnRvQXJndW1lbnROYW1lTGlzdCA9IHBleHBycy5MZXgucHJvdG90eXBlLnRvQXJndW1lbnROYW1lTGlzdCA9XG4gIGZ1bmN0aW9uKGZpcnN0QXJnSW5kZXgsIG5vRHVwQ2hlY2spIHtcbiAgICByZXR1cm4gdGhpcy5leHByLnRvQXJndW1lbnROYW1lTGlzdChmaXJzdEFyZ0luZGV4LCBub0R1cENoZWNrKTtcbiAgfTtcblxucGV4cHJzLkFwcGx5LnByb3RvdHlwZS50b0FyZ3VtZW50TmFtZUxpc3QgPSBmdW5jdGlvbihmaXJzdEFyZ0luZGV4LCBub0R1cENoZWNrKSB7XG4gIHJldHVybiBbdGhpcy5ydWxlTmFtZV07XG59O1xuXG5wZXhwcnMuVW5pY29kZUNoYXIucHJvdG90eXBlLnRvQXJndW1lbnROYW1lTGlzdCA9IGZ1bmN0aW9uKGZpcnN0QXJnSW5kZXgsIG5vRHVwQ2hlY2spIHtcbiAgcmV0dXJuIFsnJCcgKyBmaXJzdEFyZ0luZGV4XTtcbn07XG5cbnBleHBycy5QYXJhbS5wcm90b3R5cGUudG9Bcmd1bWVudE5hbWVMaXN0ID0gZnVuY3Rpb24oZmlyc3RBcmdJbmRleCwgbm9EdXBDaGVjaykge1xuICByZXR1cm4gWydwYXJhbScgKyB0aGlzLmluZGV4XTtcbn07XG5cbi8vIFwiVmFsdWUgcGV4cHJzXCIgKFZhbHVlLCBTdHIsIEFyciwgT2JqKSBhcmUgZ29pbmcgYXdheSBzb29uLCBzbyB3ZSBkb24ndCB3b3JyeSBhYm91dCB0aGVtIGhlcmUuXG4iLCJpbXBvcnQge2Fic3RyYWN0fSBmcm9tICcuL2NvbW1vbi5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMtbWFpbi5qcyc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBPcGVyYXRpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBSZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgUEV4cHIsIGZvciB1c2UgYXMgYSBVSSBsYWJlbCwgZXRjLlxucGV4cHJzLlBFeHByLnByb3RvdHlwZS50b0Rpc3BsYXlTdHJpbmcgPSBhYnN0cmFjdCgndG9EaXNwbGF5U3RyaW5nJyk7XG5cbnBleHBycy5BbHQucHJvdG90eXBlLnRvRGlzcGxheVN0cmluZyA9IHBleHBycy5TZXEucHJvdG90eXBlLnRvRGlzcGxheVN0cmluZyA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5zb3VyY2UpIHtcbiAgICByZXR1cm4gdGhpcy5zb3VyY2UudHJpbW1lZCgpLmNvbnRlbnRzO1xuICB9XG4gIHJldHVybiAnWycgKyB0aGlzLmNvbnN0cnVjdG9yLm5hbWUgKyAnXSc7XG59O1xuXG5wZXhwcnMuYW55LnRvRGlzcGxheVN0cmluZyA9XG4gIHBleHBycy5lbmQudG9EaXNwbGF5U3RyaW5nID1cbiAgcGV4cHJzLkl0ZXIucHJvdG90eXBlLnRvRGlzcGxheVN0cmluZyA9XG4gIHBleHBycy5Ob3QucHJvdG90eXBlLnRvRGlzcGxheVN0cmluZyA9XG4gIHBleHBycy5Mb29rYWhlYWQucHJvdG90eXBlLnRvRGlzcGxheVN0cmluZyA9XG4gIHBleHBycy5MZXgucHJvdG90eXBlLnRvRGlzcGxheVN0cmluZyA9XG4gIHBleHBycy5UZXJtaW5hbC5wcm90b3R5cGUudG9EaXNwbGF5U3RyaW5nID1cbiAgcGV4cHJzLlJhbmdlLnByb3RvdHlwZS50b0Rpc3BsYXlTdHJpbmcgPVxuICBwZXhwcnMuUGFyYW0ucHJvdG90eXBlLnRvRGlzcGxheVN0cmluZyA9XG4gICAgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50b1N0cmluZygpO1xuICAgIH07XG5cbnBleHBycy5BcHBseS5wcm90b3R5cGUudG9EaXNwbGF5U3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmFyZ3MubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHBzID0gdGhpcy5hcmdzLm1hcChhcmcgPT4gYXJnLnRvRGlzcGxheVN0cmluZygpKTtcbiAgICByZXR1cm4gdGhpcy5ydWxlTmFtZSArICc8JyArIHBzLmpvaW4oJywnKSArICc+JztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdGhpcy5ydWxlTmFtZTtcbiAgfVxufTtcblxucGV4cHJzLlVuaWNvZGVDaGFyLnByb3RvdHlwZS50b0Rpc3BsYXlTdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICdVbmljb2RlIFsnICsgdGhpcy5jYXRlZ29yeSArICddIGNoYXJhY3Rlcic7XG59O1xuIiwiLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFByaXZhdGUgc3R1ZmZcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qXG4gIGBGYWlsdXJlYHMgcmVwcmVzZW50IGV4cHJlc3Npb25zIHRoYXQgd2VyZW4ndCBtYXRjaGVkIHdoaWxlIHBhcnNpbmcuIFRoZXkgYXJlIHVzZWQgdG8gZ2VuZXJhdGVcbiAgZXJyb3IgbWVzc2FnZXMgYXV0b21hdGljYWxseS4gVGhlIGludGVyZmFjZSBvZiBgRmFpbHVyZWBzIGluY2x1ZGVzIHRoZSBjb2xsb3dpbmcgbWV0aG9kczpcblxuICAtIGdldFRleHQoKSA6IFN0cmluZ1xuICAtIGdldFR5cGUoKSA6IFN0cmluZyAgKG9uZSBvZiB7XCJkZXNjcmlwdGlvblwiLCBcInN0cmluZ1wiLCBcImNvZGVcIn0pXG4gIC0gaXNEZXNjcmlwdGlvbigpIDogYm9vbFxuICAtIGlzU3RyaW5nVGVybWluYWwoKSA6IGJvb2xcbiAgLSBpc0NvZGUoKSA6IGJvb2xcbiAgLSBpc0ZsdWZmeSgpIDogYm9vbFxuICAtIG1ha2VGbHVmZnkoKSA6IHZvaWRcbiAgLSBzdWJzdW1lcyhGYWlsdXJlKSA6IGJvb2xcbiovXG5cbmZ1bmN0aW9uIGlzVmFsaWRUeXBlKHR5cGUpIHtcbiAgcmV0dXJuIHR5cGUgPT09ICdkZXNjcmlwdGlvbicgfHwgdHlwZSA9PT0gJ3N0cmluZycgfHwgdHlwZSA9PT0gJ2NvZGUnO1xufVxuXG5leHBvcnQgY2xhc3MgRmFpbHVyZSB7XG4gIGNvbnN0cnVjdG9yKHBleHByLCB0ZXh0LCB0eXBlKSB7XG4gICAgaWYgKCFpc1ZhbGlkVHlwZSh0eXBlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIEZhaWx1cmUgdHlwZTogJyArIHR5cGUpO1xuICAgIH1cbiAgICB0aGlzLnBleHByID0gcGV4cHI7XG4gICAgdGhpcy50ZXh0ID0gdGV4dDtcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIHRoaXMuZmx1ZmZ5ID0gZmFsc2U7XG4gIH1cblxuICBnZXRQRXhwcigpIHtcbiAgICByZXR1cm4gdGhpcy5wZXhwcjtcbiAgfVxuXG4gIGdldFRleHQoKSB7XG4gICAgcmV0dXJuIHRoaXMudGV4dDtcbiAgfVxuXG4gIGdldFR5cGUoKSB7XG4gICAgcmV0dXJuIHRoaXMudHlwZTtcbiAgfVxuXG4gIGlzRGVzY3JpcHRpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudHlwZSA9PT0gJ2Rlc2NyaXB0aW9uJztcbiAgfVxuXG4gIGlzU3RyaW5nVGVybWluYWwoKSB7XG4gICAgcmV0dXJuIHRoaXMudHlwZSA9PT0gJ3N0cmluZyc7XG4gIH1cblxuICBpc0NvZGUoKSB7XG4gICAgcmV0dXJuIHRoaXMudHlwZSA9PT0gJ2NvZGUnO1xuICB9XG5cbiAgaXNGbHVmZnkoKSB7XG4gICAgcmV0dXJuIHRoaXMuZmx1ZmZ5O1xuICB9XG5cbiAgbWFrZUZsdWZmeSgpIHtcbiAgICB0aGlzLmZsdWZmeSA9IHRydWU7XG4gIH1cblxuICBjbGVhckZsdWZmeSgpIHtcbiAgICB0aGlzLmZsdWZmeSA9IGZhbHNlO1xuICB9XG5cbiAgc3Vic3VtZXModGhhdCkge1xuICAgIHJldHVybiAoXG4gICAgICB0aGlzLmdldFRleHQoKSA9PT0gdGhhdC5nZXRUZXh0KCkgJiZcbiAgICAgIHRoaXMudHlwZSA9PT0gdGhhdC50eXBlICYmXG4gICAgICAoIXRoaXMuaXNGbHVmZnkoKSB8fCAodGhpcy5pc0ZsdWZmeSgpICYmIHRoYXQuaXNGbHVmZnkoKSkpXG4gICAgKTtcbiAgfVxuXG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLnR5cGUgPT09ICdzdHJpbmcnID8gSlNPTi5zdHJpbmdpZnkodGhpcy5nZXRUZXh0KCkpIDogdGhpcy5nZXRUZXh0KCk7XG4gIH1cblxuICBjbG9uZSgpIHtcbiAgICBjb25zdCBmYWlsdXJlID0gbmV3IEZhaWx1cmUodGhpcy5wZXhwciwgdGhpcy50ZXh0LCB0aGlzLnR5cGUpO1xuICAgIGlmICh0aGlzLmlzRmx1ZmZ5KCkpIHtcbiAgICAgIGZhaWx1cmUubWFrZUZsdWZmeSgpO1xuICAgIH1cbiAgICByZXR1cm4gZmFpbHVyZTtcbiAgfVxuXG4gIHRvS2V5KCkge1xuICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCkgKyAnIycgKyB0aGlzLnR5cGU7XG4gIH1cbn1cbiIsImltcG9ydCB7YWJzdHJhY3R9IGZyb20gJy4vY29tbW9uLmpzJztcbmltcG9ydCAqIGFzIHBleHBycyBmcm9tICcuL3BleHBycy1tYWluLmpzJztcbmltcG9ydCB7RmFpbHVyZX0gZnJvbSAnLi9GYWlsdXJlLmpzJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIE9wZXJhdGlvbnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbnBleHBycy5QRXhwci5wcm90b3R5cGUudG9GYWlsdXJlID0gYWJzdHJhY3QoJ3RvRmFpbHVyZScpO1xuXG5wZXhwcnMuYW55LnRvRmFpbHVyZSA9IGZ1bmN0aW9uKGdyYW1tYXIpIHtcbiAgcmV0dXJuIG5ldyBGYWlsdXJlKHRoaXMsICdhbnkgb2JqZWN0JywgJ2Rlc2NyaXB0aW9uJyk7XG59O1xuXG5wZXhwcnMuZW5kLnRvRmFpbHVyZSA9IGZ1bmN0aW9uKGdyYW1tYXIpIHtcbiAgcmV0dXJuIG5ldyBGYWlsdXJlKHRoaXMsICdlbmQgb2YgaW5wdXQnLCAnZGVzY3JpcHRpb24nKTtcbn07XG5cbnBleHBycy5UZXJtaW5hbC5wcm90b3R5cGUudG9GYWlsdXJlID0gZnVuY3Rpb24oZ3JhbW1hcikge1xuICByZXR1cm4gbmV3IEZhaWx1cmUodGhpcywgdGhpcy5vYmosICdzdHJpbmcnKTtcbn07XG5cbnBleHBycy5SYW5nZS5wcm90b3R5cGUudG9GYWlsdXJlID0gZnVuY3Rpb24oZ3JhbW1hcikge1xuICAvLyBUT0RPOiBjb21lIHVwIHdpdGggc29tZXRoaW5nIGJldHRlclxuICByZXR1cm4gbmV3IEZhaWx1cmUodGhpcywgSlNPTi5zdHJpbmdpZnkodGhpcy5mcm9tKSArICcuLicgKyBKU09OLnN0cmluZ2lmeSh0aGlzLnRvKSwgJ2NvZGUnKTtcbn07XG5cbnBleHBycy5Ob3QucHJvdG90eXBlLnRvRmFpbHVyZSA9IGZ1bmN0aW9uKGdyYW1tYXIpIHtcbiAgY29uc3QgZGVzY3JpcHRpb24gPVxuICAgIHRoaXMuZXhwciA9PT0gcGV4cHJzLmFueSA/ICdub3RoaW5nJyA6ICdub3QgJyArIHRoaXMuZXhwci50b0ZhaWx1cmUoZ3JhbW1hcik7XG4gIHJldHVybiBuZXcgRmFpbHVyZSh0aGlzLCBkZXNjcmlwdGlvbiwgJ2Rlc2NyaXB0aW9uJyk7XG59O1xuXG5wZXhwcnMuTG9va2FoZWFkLnByb3RvdHlwZS50b0ZhaWx1cmUgPSBmdW5jdGlvbihncmFtbWFyKSB7XG4gIHJldHVybiB0aGlzLmV4cHIudG9GYWlsdXJlKGdyYW1tYXIpO1xufTtcblxucGV4cHJzLkFwcGx5LnByb3RvdHlwZS50b0ZhaWx1cmUgPSBmdW5jdGlvbihncmFtbWFyKSB7XG4gIGxldCB7ZGVzY3JpcHRpb259ID0gZ3JhbW1hci5ydWxlc1t0aGlzLnJ1bGVOYW1lXTtcbiAgaWYgKCFkZXNjcmlwdGlvbikge1xuICAgIGNvbnN0IGFydGljbGUgPSAvXlthZWlvdUFFSU9VXS8udGVzdCh0aGlzLnJ1bGVOYW1lKSA/ICdhbicgOiAnYSc7XG4gICAgZGVzY3JpcHRpb24gPSBhcnRpY2xlICsgJyAnICsgdGhpcy5ydWxlTmFtZTtcbiAgfVxuICByZXR1cm4gbmV3IEZhaWx1cmUodGhpcywgZGVzY3JpcHRpb24sICdkZXNjcmlwdGlvbicpO1xufTtcblxucGV4cHJzLlVuaWNvZGVDaGFyLnByb3RvdHlwZS50b0ZhaWx1cmUgPSBmdW5jdGlvbihncmFtbWFyKSB7XG4gIHJldHVybiBuZXcgRmFpbHVyZSh0aGlzLCAnYSBVbmljb2RlIFsnICsgdGhpcy5jYXRlZ29yeSArICddIGNoYXJhY3RlcicsICdkZXNjcmlwdGlvbicpO1xufTtcblxucGV4cHJzLkFsdC5wcm90b3R5cGUudG9GYWlsdXJlID0gZnVuY3Rpb24oZ3JhbW1hcikge1xuICBjb25zdCBmcyA9IHRoaXMudGVybXMubWFwKHQgPT4gdC50b0ZhaWx1cmUoZ3JhbW1hcikpO1xuICBjb25zdCBkZXNjcmlwdGlvbiA9ICcoJyArIGZzLmpvaW4oJyBvciAnKSArICcpJztcbiAgcmV0dXJuIG5ldyBGYWlsdXJlKHRoaXMsIGRlc2NyaXB0aW9uLCAnZGVzY3JpcHRpb24nKTtcbn07XG5cbnBleHBycy5TZXEucHJvdG90eXBlLnRvRmFpbHVyZSA9IGZ1bmN0aW9uKGdyYW1tYXIpIHtcbiAgY29uc3QgZnMgPSB0aGlzLmZhY3RvcnMubWFwKGYgPT4gZi50b0ZhaWx1cmUoZ3JhbW1hcikpO1xuICBjb25zdCBkZXNjcmlwdGlvbiA9ICcoJyArIGZzLmpvaW4oJyAnKSArICcpJztcbiAgcmV0dXJuIG5ldyBGYWlsdXJlKHRoaXMsIGRlc2NyaXB0aW9uLCAnZGVzY3JpcHRpb24nKTtcbn07XG5cbnBleHBycy5JdGVyLnByb3RvdHlwZS50b0ZhaWx1cmUgPSBmdW5jdGlvbihncmFtbWFyKSB7XG4gIGNvbnN0IGRlc2NyaXB0aW9uID0gJygnICsgdGhpcy5leHByLnRvRmFpbHVyZShncmFtbWFyKSArIHRoaXMub3BlcmF0b3IgKyAnKSc7XG4gIHJldHVybiBuZXcgRmFpbHVyZSh0aGlzLCBkZXNjcmlwdGlvbiwgJ2Rlc2NyaXB0aW9uJyk7XG59O1xuIiwiaW1wb3J0IHthYnN0cmFjdH0gZnJvbSAnLi9jb21tb24uanMnO1xuaW1wb3J0ICogYXMgcGV4cHJzIGZyb20gJy4vcGV4cHJzLW1haW4uanMnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gT3BlcmF0aW9uc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLypcbiAgZTEudG9TdHJpbmcoKSA9PT0gZTIudG9TdHJpbmcoKSA9PT4gZTEgYW5kIGUyIGFyZSBzZW1hbnRpY2FsbHkgZXF1aXZhbGVudC5cbiAgTm90ZSB0aGF0IHRoaXMgaXMgbm90IGFuIGlmZiAoPD09Pik6IGUuZy4sXG4gICh+XCJiXCIgXCJhXCIpLnRvU3RyaW5nKCkgIT09IChcImFcIikudG9TdHJpbmcoKSwgZXZlbiB0aG91Z2hcbiAgflwiYlwiIFwiYVwiIGFuZCBcImFcIiBhcmUgaW50ZXJjaGFuZ2VhYmxlIGluIGFueSBncmFtbWFyLFxuICBib3RoIGluIHRlcm1zIG9mIHRoZSBsYW5ndWFnZXMgdGhleSBhY2NlcHQgYW5kIHRoZWlyIGFyaXRpZXMuXG4qL1xucGV4cHJzLlBFeHByLnByb3RvdHlwZS50b1N0cmluZyA9IGFic3RyYWN0KCd0b1N0cmluZycpO1xuXG5wZXhwcnMuYW55LnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAnYW55Jztcbn07XG5cbnBleHBycy5lbmQudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICdlbmQnO1xufTtcblxucGV4cHJzLlRlcm1pbmFsLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5vYmopO1xufTtcblxucGV4cHJzLlJhbmdlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5mcm9tKSArICcuLicgKyBKU09OLnN0cmluZ2lmeSh0aGlzLnRvKTtcbn07XG5cbnBleHBycy5QYXJhbS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICckJyArIHRoaXMuaW5kZXg7XG59O1xuXG5wZXhwcnMuTGV4LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJyMoJyArIHRoaXMuZXhwci50b1N0cmluZygpICsgJyknO1xufTtcblxucGV4cHJzLkFsdC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMudGVybXMubGVuZ3RoID09PSAxID9cbiAgICB0aGlzLnRlcm1zWzBdLnRvU3RyaW5nKCkgOlxuICAgICcoJyArIHRoaXMudGVybXMubWFwKHRlcm0gPT4gdGVybS50b1N0cmluZygpKS5qb2luKCcgfCAnKSArICcpJztcbn07XG5cbnBleHBycy5TZXEucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmZhY3RvcnMubGVuZ3RoID09PSAxID9cbiAgICB0aGlzLmZhY3RvcnNbMF0udG9TdHJpbmcoKSA6XG4gICAgJygnICsgdGhpcy5mYWN0b3JzLm1hcChmYWN0b3IgPT4gZmFjdG9yLnRvU3RyaW5nKCkpLmpvaW4oJyAnKSArICcpJztcbn07XG5cbnBleHBycy5JdGVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5leHByICsgdGhpcy5vcGVyYXRvcjtcbn07XG5cbnBleHBycy5Ob3QucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAnficgKyB0aGlzLmV4cHI7XG59O1xuXG5wZXhwcnMuTG9va2FoZWFkLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJyYnICsgdGhpcy5leHByO1xufTtcblxucGV4cHJzLkFwcGx5LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5hcmdzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBwcyA9IHRoaXMuYXJncy5tYXAoYXJnID0+IGFyZy50b1N0cmluZygpKTtcbiAgICByZXR1cm4gdGhpcy5ydWxlTmFtZSArICc8JyArIHBzLmpvaW4oJywnKSArICc+JztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdGhpcy5ydWxlTmFtZTtcbiAgfVxufTtcblxucGV4cHJzLlVuaWNvZGVDaGFyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJ1xcXFxweycgKyB0aGlzLmNhdGVnb3J5ICsgJ30nO1xufTtcbiIsImltcG9ydCB7RmFpbHVyZX0gZnJvbSAnLi9GYWlsdXJlLmpzJztcbmltcG9ydCB7VGVybWluYWxOb2RlfSBmcm9tICcuL25vZGVzLmpzJztcbmltcG9ydCB7YXNzZXJ0fSBmcm9tICcuL2NvbW1vbi5qcyc7XG5pbXBvcnQge1BFeHByLCBUZXJtaW5hbH0gZnJvbSAnLi9wZXhwcnMtbWFpbi5qcyc7XG5cbmV4cG9ydCBjbGFzcyBDYXNlSW5zZW5zaXRpdmVUZXJtaW5hbCBleHRlbmRzIFBFeHByIHtcbiAgY29uc3RydWN0b3IocGFyYW0pIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMub2JqID0gcGFyYW07XG4gIH1cblxuICBfZ2V0U3RyaW5nKHN0YXRlKSB7XG4gICAgY29uc3QgdGVybWluYWwgPSBzdGF0ZS5jdXJyZW50QXBwbGljYXRpb24oKS5hcmdzW3RoaXMub2JqLmluZGV4XTtcbiAgICBhc3NlcnQodGVybWluYWwgaW5zdGFuY2VvZiBUZXJtaW5hbCwgJ2V4cGVjdGVkIGEgVGVybWluYWwgZXhwcmVzc2lvbicpO1xuICAgIHJldHVybiB0ZXJtaW5hbC5vYmo7XG4gIH1cblxuICAvLyBJbXBsZW1lbnRhdGlvbiBvZiB0aGUgUEV4cHIgQVBJXG5cbiAgYWxsb3dzU2tpcHBpbmdQcmVjZWRpbmdTcGFjZSgpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGV2YWwoc3RhdGUpIHtcbiAgICBjb25zdCB7aW5wdXRTdHJlYW19ID0gc3RhdGU7XG4gICAgY29uc3Qgb3JpZ1BvcyA9IGlucHV0U3RyZWFtLnBvcztcbiAgICBjb25zdCBtYXRjaFN0ciA9IHRoaXMuX2dldFN0cmluZyhzdGF0ZSk7XG4gICAgaWYgKCFpbnB1dFN0cmVhbS5tYXRjaFN0cmluZyhtYXRjaFN0ciwgdHJ1ZSkpIHtcbiAgICAgIHN0YXRlLnByb2Nlc3NGYWlsdXJlKG9yaWdQb3MsIHRoaXMpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGF0ZS5wdXNoQmluZGluZyhuZXcgVGVybWluYWxOb2RlKG1hdGNoU3RyLmxlbmd0aCksIG9yaWdQb3MpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgZ2V0QXJpdHkoKSB7XG4gICAgcmV0dXJuIDE7XG4gIH1cblxuICBzdWJzdGl0dXRlUGFyYW1zKGFjdHVhbHMpIHtcbiAgICByZXR1cm4gbmV3IENhc2VJbnNlbnNpdGl2ZVRlcm1pbmFsKHRoaXMub2JqLnN1YnN0aXR1dGVQYXJhbXMoYWN0dWFscykpO1xuICB9XG5cbiAgdG9EaXNwbGF5U3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLm9iai50b0Rpc3BsYXlTdHJpbmcoKSArICcgKGNhc2UtaW5zZW5zaXRpdmUpJztcbiAgfVxuXG4gIHRvRmFpbHVyZShncmFtbWFyKSB7XG4gICAgcmV0dXJuIG5ldyBGYWlsdXJlKFxuICAgICAgICB0aGlzLFxuICAgICAgICB0aGlzLm9iai50b0ZhaWx1cmUoZ3JhbW1hcikgKyAnIChjYXNlLWluc2Vuc2l0aXZlKScsXG4gICAgICAgICdkZXNjcmlwdGlvbicsXG4gICAgKTtcbiAgfVxuXG4gIF9pc051bGxhYmxlKGdyYW1tYXIsIG1lbW8pIHtcbiAgICByZXR1cm4gdGhpcy5vYmouX2lzTnVsbGFibGUoZ3JhbW1hciwgbWVtbyk7XG4gIH1cbn1cbiIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBFeHRlbnNpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5pbXBvcnQgJy4vcGV4cHJzLWFsbG93c1NraXBwaW5nUHJlY2VkaW5nU3BhY2UuanMnO1xuaW1wb3J0ICcuL3BleHBycy1hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZC5qcyc7XG5pbXBvcnQgJy4vcGV4cHJzLWFzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5LmpzJztcbmltcG9ydCAnLi9wZXhwcnMtYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlLmpzJztcbmltcG9ydCAnLi9wZXhwcnMtZXZhbC5qcyc7XG5pbXBvcnQgJy4vcGV4cHJzLWdldEFyaXR5LmpzJztcbmltcG9ydCAnLi9wZXhwcnMtb3V0cHV0UmVjaXBlLmpzJztcbmltcG9ydCAnLi9wZXhwcnMtaW50cm9kdWNlUGFyYW1zLmpzJztcbmltcG9ydCAnLi9wZXhwcnMtaXNOdWxsYWJsZS5qcyc7XG5pbXBvcnQgJy4vcGV4cHJzLXN1YnN0aXR1dGVQYXJhbXMuanMnO1xuaW1wb3J0ICcuL3BleHBycy10b0FyZ3VtZW50TmFtZUxpc3QuanMnO1xuaW1wb3J0ICcuL3BleHBycy10b0Rpc3BsYXlTdHJpbmcuanMnO1xuaW1wb3J0ICcuL3BleHBycy10b0ZhaWx1cmUuanMnO1xuaW1wb3J0ICcuL3BleHBycy10b1N0cmluZy5qcyc7XG5cbmV4cG9ydCAqIGZyb20gJy4vcGV4cHJzLW1haW4uanMnO1xuZXhwb3J0IHtDYXNlSW5zZW5zaXRpdmVUZXJtaW5hbH0gZnJvbSAnLi9DYXNlSW5zZW5zaXRpdmVUZXJtaW5hbC5qcyc7XG4iLCJpbXBvcnQge0lucHV0U3RyZWFtfSBmcm9tICcuL0lucHV0U3RyZWFtLmpzJztcbmltcG9ydCB7TWF0Y2hSZXN1bHR9IGZyb20gJy4vTWF0Y2hSZXN1bHQuanMnO1xuaW1wb3J0IHtQb3NJbmZvfSBmcm9tICcuL1Bvc0luZm8uanMnO1xuaW1wb3J0IHtUcmFjZX0gZnJvbSAnLi9UcmFjZS5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMuanMnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWwuanMnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUHJpdmF0ZSBzdHVmZlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxubGV0IGJ1aWx0SW5BcHBseVN5bnRhY3RpY0JvZHk7XG5cbnV0aWwuYXdhaXRCdWlsdEluUnVsZXMoYnVpbHRJblJ1bGVzID0+IHtcbiAgYnVpbHRJbkFwcGx5U3ludGFjdGljQm9keSA9IGJ1aWx0SW5SdWxlcy5ydWxlcy5hcHBseVN5bnRhY3RpYy5ib2R5O1xufSk7XG5cbmNvbnN0IGFwcGx5U3BhY2VzID0gbmV3IHBleHBycy5BcHBseSgnc3BhY2VzJyk7XG5cbmV4cG9ydCBjbGFzcyBNYXRjaFN0YXRlIHtcbiAgY29uc3RydWN0b3IobWF0Y2hlciwgc3RhcnRFeHByLCBvcHRQb3NpdGlvblRvUmVjb3JkRmFpbHVyZXMpIHtcbiAgICB0aGlzLm1hdGNoZXIgPSBtYXRjaGVyO1xuICAgIHRoaXMuc3RhcnRFeHByID0gc3RhcnRFeHByO1xuXG4gICAgdGhpcy5ncmFtbWFyID0gbWF0Y2hlci5ncmFtbWFyO1xuICAgIHRoaXMuaW5wdXQgPSBtYXRjaGVyLmdldElucHV0KCk7XG4gICAgdGhpcy5pbnB1dFN0cmVhbSA9IG5ldyBJbnB1dFN0cmVhbSh0aGlzLmlucHV0KTtcbiAgICB0aGlzLm1lbW9UYWJsZSA9IG1hdGNoZXIuX21lbW9UYWJsZTtcblxuICAgIHRoaXMudXNlckRhdGEgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5kb05vdE1lbW9pemUgPSBmYWxzZTtcblxuICAgIHRoaXMuX2JpbmRpbmdzID0gW107XG4gICAgdGhpcy5fYmluZGluZ09mZnNldHMgPSBbXTtcbiAgICB0aGlzLl9hcHBsaWNhdGlvblN0YWNrID0gW107XG4gICAgdGhpcy5fcG9zU3RhY2sgPSBbMF07XG4gICAgdGhpcy5pbkxleGlmaWVkQ29udGV4dFN0YWNrID0gW2ZhbHNlXTtcblxuICAgIHRoaXMucmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uID0gLTE7XG4gICAgdGhpcy5fcmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uU3RhY2sgPSBbXTtcbiAgICB0aGlzLl9yZWNvcmRlZEZhaWx1cmVzU3RhY2sgPSBbXTtcblxuICAgIGlmIChvcHRQb3NpdGlvblRvUmVjb3JkRmFpbHVyZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5wb3NpdGlvblRvUmVjb3JkRmFpbHVyZXMgPSBvcHRQb3NpdGlvblRvUmVjb3JkRmFpbHVyZXM7XG4gICAgICB0aGlzLnJlY29yZGVkRmFpbHVyZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIHBvc1RvT2Zmc2V0KHBvcykge1xuICAgIHJldHVybiBwb3MgLSB0aGlzLl9wb3NTdGFja1t0aGlzLl9wb3NTdGFjay5sZW5ndGggLSAxXTtcbiAgfVxuXG4gIGVudGVyQXBwbGljYXRpb24ocG9zSW5mbywgYXBwKSB7XG4gICAgdGhpcy5fcG9zU3RhY2sucHVzaCh0aGlzLmlucHV0U3RyZWFtLnBvcyk7XG4gICAgdGhpcy5fYXBwbGljYXRpb25TdGFjay5wdXNoKGFwcCk7XG4gICAgdGhpcy5pbkxleGlmaWVkQ29udGV4dFN0YWNrLnB1c2goZmFsc2UpO1xuICAgIHBvc0luZm8uZW50ZXIoYXBwKTtcbiAgICB0aGlzLl9yaWdodG1vc3RGYWlsdXJlUG9zaXRpb25TdGFjay5wdXNoKHRoaXMucmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uKTtcbiAgICB0aGlzLnJpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvbiA9IC0xO1xuICB9XG5cbiAgZXhpdEFwcGxpY2F0aW9uKHBvc0luZm8sIG9wdE5vZGUpIHtcbiAgICBjb25zdCBvcmlnUG9zID0gdGhpcy5fcG9zU3RhY2sucG9wKCk7XG4gICAgdGhpcy5fYXBwbGljYXRpb25TdGFjay5wb3AoKTtcbiAgICB0aGlzLmluTGV4aWZpZWRDb250ZXh0U3RhY2sucG9wKCk7XG4gICAgcG9zSW5mby5leGl0KCk7XG5cbiAgICB0aGlzLnJpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvbiA9IE1hdGgubWF4KFxuICAgICAgICB0aGlzLnJpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvbixcbiAgICAgICAgdGhpcy5fcmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uU3RhY2sucG9wKCksXG4gICAgKTtcblxuICAgIGlmIChvcHROb2RlKSB7XG4gICAgICB0aGlzLnB1c2hCaW5kaW5nKG9wdE5vZGUsIG9yaWdQb3MpO1xuICAgIH1cbiAgfVxuXG4gIGVudGVyTGV4aWZpZWRDb250ZXh0KCkge1xuICAgIHRoaXMuaW5MZXhpZmllZENvbnRleHRTdGFjay5wdXNoKHRydWUpO1xuICB9XG5cbiAgZXhpdExleGlmaWVkQ29udGV4dCgpIHtcbiAgICB0aGlzLmluTGV4aWZpZWRDb250ZXh0U3RhY2sucG9wKCk7XG4gIH1cblxuICBjdXJyZW50QXBwbGljYXRpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FwcGxpY2F0aW9uU3RhY2tbdGhpcy5fYXBwbGljYXRpb25TdGFjay5sZW5ndGggLSAxXTtcbiAgfVxuXG4gIGluU3ludGFjdGljQ29udGV4dCgpIHtcbiAgICBjb25zdCBjdXJyZW50QXBwbGljYXRpb24gPSB0aGlzLmN1cnJlbnRBcHBsaWNhdGlvbigpO1xuICAgIGlmIChjdXJyZW50QXBwbGljYXRpb24pIHtcbiAgICAgIHJldHVybiBjdXJyZW50QXBwbGljYXRpb24uaXNTeW50YWN0aWMoKSAmJiAhdGhpcy5pbkxleGlmaWVkQ29udGV4dCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgdG9wLWxldmVsIGNvbnRleHQgaXMgc3ludGFjdGljIGlmIHRoZSBzdGFydCBhcHBsaWNhdGlvbiBpcy5cbiAgICAgIHJldHVybiB0aGlzLnN0YXJ0RXhwci5mYWN0b3JzWzBdLmlzU3ludGFjdGljKCk7XG4gICAgfVxuICB9XG5cbiAgaW5MZXhpZmllZENvbnRleHQoKSB7XG4gICAgcmV0dXJuIHRoaXMuaW5MZXhpZmllZENvbnRleHRTdGFja1t0aGlzLmluTGV4aWZpZWRDb250ZXh0U3RhY2subGVuZ3RoIC0gMV07XG4gIH1cblxuICBza2lwU3BhY2VzKCkge1xuICAgIHRoaXMucHVzaEZhaWx1cmVzSW5mbygpO1xuICAgIHRoaXMuZXZhbChhcHBseVNwYWNlcyk7XG4gICAgdGhpcy5wb3BCaW5kaW5nKCk7XG4gICAgdGhpcy5wb3BGYWlsdXJlc0luZm8oKTtcbiAgICByZXR1cm4gdGhpcy5pbnB1dFN0cmVhbS5wb3M7XG4gIH1cblxuICBza2lwU3BhY2VzSWZJblN5bnRhY3RpY0NvbnRleHQoKSB7XG4gICAgcmV0dXJuIHRoaXMuaW5TeW50YWN0aWNDb250ZXh0KCkgPyB0aGlzLnNraXBTcGFjZXMoKSA6IHRoaXMuaW5wdXRTdHJlYW0ucG9zO1xuICB9XG5cbiAgbWF5YmVTa2lwU3BhY2VzQmVmb3JlKGV4cHIpIHtcbiAgICBpZiAoZXhwci5hbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlKCkgJiYgZXhwciAhPT0gYXBwbHlTcGFjZXMpIHtcbiAgICAgIHJldHVybiB0aGlzLnNraXBTcGFjZXNJZkluU3ludGFjdGljQ29udGV4dCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5pbnB1dFN0cmVhbS5wb3M7XG4gICAgfVxuICB9XG5cbiAgcHVzaEJpbmRpbmcobm9kZSwgb3JpZ1Bvcykge1xuICAgIHRoaXMuX2JpbmRpbmdzLnB1c2gobm9kZSk7XG4gICAgdGhpcy5fYmluZGluZ09mZnNldHMucHVzaCh0aGlzLnBvc1RvT2Zmc2V0KG9yaWdQb3MpKTtcbiAgfVxuXG4gIHBvcEJpbmRpbmcoKSB7XG4gICAgdGhpcy5fYmluZGluZ3MucG9wKCk7XG4gICAgdGhpcy5fYmluZGluZ09mZnNldHMucG9wKCk7XG4gIH1cblxuICBudW1CaW5kaW5ncygpIHtcbiAgICByZXR1cm4gdGhpcy5fYmluZGluZ3MubGVuZ3RoO1xuICB9XG5cbiAgdHJ1bmNhdGVCaW5kaW5ncyhuZXdMZW5ndGgpIHtcbiAgICAvLyBZZXMsIHRoaXMgaXMgdGhpcyByZWFsbHkgZmFzdGVyIHRoYW4gc2V0dGluZyB0aGUgYGxlbmd0aGAgcHJvcGVydHkgKHRlc3RlZCB3aXRoXG4gICAgLy8gYmluL2VzNWJlbmNoIG9uIE5vZGUgdjYuMS4wKS5cbiAgICAvLyBVcGRhdGUgMjAyMS0xMC0yNTogc3RpbGwgdHJ1ZSBvbiB2MTQuMTUuNSDigJQgaXQncyB+MjAlIHNwZWVkdXAgb24gZXM1YmVuY2guXG4gICAgd2hpbGUgKHRoaXMuX2JpbmRpbmdzLmxlbmd0aCA+IG5ld0xlbmd0aCkge1xuICAgICAgdGhpcy5wb3BCaW5kaW5nKCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0Q3VycmVudFBvc0luZm8oKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0UG9zSW5mbyh0aGlzLmlucHV0U3RyZWFtLnBvcyk7XG4gIH1cblxuICBnZXRQb3NJbmZvKHBvcykge1xuICAgIGxldCBwb3NJbmZvID0gdGhpcy5tZW1vVGFibGVbcG9zXTtcbiAgICBpZiAoIXBvc0luZm8pIHtcbiAgICAgIHBvc0luZm8gPSB0aGlzLm1lbW9UYWJsZVtwb3NdID0gbmV3IFBvc0luZm8oKTtcbiAgICB9XG4gICAgcmV0dXJuIHBvc0luZm87XG4gIH1cblxuICBwcm9jZXNzRmFpbHVyZShwb3MsIGV4cHIpIHtcbiAgICB0aGlzLnJpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvbiA9IE1hdGgubWF4KHRoaXMucmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uLCBwb3MpO1xuXG4gICAgaWYgKHRoaXMucmVjb3JkZWRGYWlsdXJlcyAmJiBwb3MgPT09IHRoaXMucG9zaXRpb25Ub1JlY29yZEZhaWx1cmVzKSB7XG4gICAgICBjb25zdCBhcHAgPSB0aGlzLmN1cnJlbnRBcHBsaWNhdGlvbigpO1xuICAgICAgaWYgKGFwcCkge1xuICAgICAgICAvLyBTdWJzdGl0dXRlIHBhcmFtZXRlcnMgd2l0aCB0aGUgYWN0dWFsIHBleHBycyB0aGF0IHdlcmUgcGFzc2VkIHRvXG4gICAgICAgIC8vIHRoZSBjdXJyZW50IHJ1bGUuXG4gICAgICAgIGV4cHIgPSBleHByLnN1YnN0aXR1dGVQYXJhbXMoYXBwLmFyZ3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhpcyBicmFuY2ggaXMgb25seSByZWFjaGVkIGZvciB0aGUgXCJlbmQtY2hlY2tcIiB0aGF0IGlzXG4gICAgICAgIC8vIHBlcmZvcm1lZCBhZnRlciB0aGUgdG9wLWxldmVsIGFwcGxpY2F0aW9uLiBJbiB0aGF0IGNhc2UsXG4gICAgICAgIC8vIGV4cHIgPT09IHBleHBycy5lbmQgc28gdGhlcmUgaXMgbm8gbmVlZCB0byBzdWJzdGl0dXRlXG4gICAgICAgIC8vIHBhcmFtZXRlcnMuXG4gICAgICB9XG5cbiAgICAgIHRoaXMucmVjb3JkRmFpbHVyZShleHByLnRvRmFpbHVyZSh0aGlzLmdyYW1tYXIpLCBmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgcmVjb3JkRmFpbHVyZShmYWlsdXJlLCBzaG91bGRDbG9uZUlmTmV3KSB7XG4gICAgY29uc3Qga2V5ID0gZmFpbHVyZS50b0tleSgpO1xuICAgIGlmICghdGhpcy5yZWNvcmRlZEZhaWx1cmVzW2tleV0pIHtcbiAgICAgIHRoaXMucmVjb3JkZWRGYWlsdXJlc1trZXldID0gc2hvdWxkQ2xvbmVJZk5ldyA/IGZhaWx1cmUuY2xvbmUoKSA6IGZhaWx1cmU7XG4gICAgfSBlbHNlIGlmICh0aGlzLnJlY29yZGVkRmFpbHVyZXNba2V5XS5pc0ZsdWZmeSgpICYmICFmYWlsdXJlLmlzRmx1ZmZ5KCkpIHtcbiAgICAgIHRoaXMucmVjb3JkZWRGYWlsdXJlc1trZXldLmNsZWFyRmx1ZmZ5KCk7XG4gICAgfVxuICB9XG5cbiAgcmVjb3JkRmFpbHVyZXMoZmFpbHVyZXMsIHNob3VsZENsb25lSWZOZXcpIHtcbiAgICBPYmplY3Qua2V5cyhmYWlsdXJlcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgdGhpcy5yZWNvcmRGYWlsdXJlKGZhaWx1cmVzW2tleV0sIHNob3VsZENsb25lSWZOZXcpO1xuICAgIH0pO1xuICB9XG5cbiAgY2xvbmVSZWNvcmRlZEZhaWx1cmVzKCkge1xuICAgIGlmICghdGhpcy5yZWNvcmRlZEZhaWx1cmVzKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGFucyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgT2JqZWN0LmtleXModGhpcy5yZWNvcmRlZEZhaWx1cmVzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICBhbnNba2V5XSA9IHRoaXMucmVjb3JkZWRGYWlsdXJlc1trZXldLmNsb25lKCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGFucztcbiAgfVxuXG4gIGdldFJpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5yaWdodG1vc3RGYWlsdXJlUG9zaXRpb247XG4gIH1cblxuICBfZ2V0UmlnaHRtb3N0RmFpbHVyZU9mZnNldCgpIHtcbiAgICByZXR1cm4gdGhpcy5yaWdodG1vc3RGYWlsdXJlUG9zaXRpb24gPj0gMCA/XG4gICAgICB0aGlzLnBvc1RvT2Zmc2V0KHRoaXMucmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uKSA6XG4gICAgICAtMTtcbiAgfVxuXG4gIC8vIFJldHVybnMgdGhlIG1lbW9pemVkIHRyYWNlIGVudHJ5IGZvciBgZXhwcmAgYXQgYHBvc2AsIGlmIG9uZSBleGlzdHMsIGBudWxsYCBvdGhlcndpc2UuXG4gIGdldE1lbW9pemVkVHJhY2VFbnRyeShwb3MsIGV4cHIpIHtcbiAgICBjb25zdCBwb3NJbmZvID0gdGhpcy5tZW1vVGFibGVbcG9zXTtcbiAgICBpZiAocG9zSW5mbyAmJiBleHByIGluc3RhbmNlb2YgcGV4cHJzLkFwcGx5KSB7XG4gICAgICBjb25zdCBtZW1vUmVjID0gcG9zSW5mby5tZW1vW2V4cHIudG9NZW1vS2V5KCldO1xuICAgICAgaWYgKG1lbW9SZWMgJiYgbWVtb1JlYy50cmFjZUVudHJ5KSB7XG4gICAgICAgIGNvbnN0IGVudHJ5ID0gbWVtb1JlYy50cmFjZUVudHJ5LmNsb25lV2l0aEV4cHIoZXhwcik7XG4gICAgICAgIGVudHJ5LmlzTWVtb2l6ZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gZW50cnk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gUmV0dXJucyBhIG5ldyB0cmFjZSBlbnRyeSwgd2l0aCB0aGUgY3VycmVudGx5IGFjdGl2ZSB0cmFjZSBhcnJheSBhcyBpdHMgY2hpbGRyZW4uXG4gIGdldFRyYWNlRW50cnkocG9zLCBleHByLCBzdWNjZWVkZWQsIGJpbmRpbmdzKSB7XG4gICAgaWYgKGV4cHIgaW5zdGFuY2VvZiBwZXhwcnMuQXBwbHkpIHtcbiAgICAgIGNvbnN0IGFwcCA9IHRoaXMuY3VycmVudEFwcGxpY2F0aW9uKCk7XG4gICAgICBjb25zdCBhY3R1YWxzID0gYXBwID8gYXBwLmFyZ3MgOiBbXTtcbiAgICAgIGV4cHIgPSBleHByLnN1YnN0aXR1dGVQYXJhbXMoYWN0dWFscyk7XG4gICAgfVxuICAgIHJldHVybiAoXG4gICAgICB0aGlzLmdldE1lbW9pemVkVHJhY2VFbnRyeShwb3MsIGV4cHIpIHx8XG4gICAgICBuZXcgVHJhY2UodGhpcy5pbnB1dCwgcG9zLCB0aGlzLmlucHV0U3RyZWFtLnBvcywgZXhwciwgc3VjY2VlZGVkLCBiaW5kaW5ncywgdGhpcy50cmFjZSlcbiAgICApO1xuICB9XG5cbiAgaXNUcmFjaW5nKCkge1xuICAgIHJldHVybiAhIXRoaXMudHJhY2U7XG4gIH1cblxuICBoYXNOZWNlc3NhcnlJbmZvKG1lbW9SZWMpIHtcbiAgICBpZiAodGhpcy50cmFjZSAmJiAhbWVtb1JlYy50cmFjZUVudHJ5KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKFxuICAgICAgdGhpcy5yZWNvcmRlZEZhaWx1cmVzICYmXG4gICAgICB0aGlzLmlucHV0U3RyZWFtLnBvcyArIG1lbW9SZWMucmlnaHRtb3N0RmFpbHVyZU9mZnNldCA9PT0gdGhpcy5wb3NpdGlvblRvUmVjb3JkRmFpbHVyZXNcbiAgICApIHtcbiAgICAgIHJldHVybiAhIW1lbW9SZWMuZmFpbHVyZXNBdFJpZ2h0bW9zdFBvc2l0aW9uO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgdXNlTWVtb2l6ZWRSZXN1bHQob3JpZ1BvcywgbWVtb1JlYykge1xuICAgIGlmICh0aGlzLnRyYWNlKSB7XG4gICAgICB0aGlzLnRyYWNlLnB1c2gobWVtb1JlYy50cmFjZUVudHJ5KTtcbiAgICB9XG5cbiAgICBjb25zdCBtZW1vUmVjUmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uID1cbiAgICAgIHRoaXMuaW5wdXRTdHJlYW0ucG9zICsgbWVtb1JlYy5yaWdodG1vc3RGYWlsdXJlT2Zmc2V0O1xuICAgIHRoaXMucmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uID0gTWF0aC5tYXgoXG4gICAgICAgIHRoaXMucmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uLFxuICAgICAgICBtZW1vUmVjUmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uLFxuICAgICk7XG4gICAgaWYgKFxuICAgICAgdGhpcy5yZWNvcmRlZEZhaWx1cmVzICYmXG4gICAgICB0aGlzLnBvc2l0aW9uVG9SZWNvcmRGYWlsdXJlcyA9PT0gbWVtb1JlY1JpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvbiAmJlxuICAgICAgbWVtb1JlYy5mYWlsdXJlc0F0UmlnaHRtb3N0UG9zaXRpb25cbiAgICApIHtcbiAgICAgIHRoaXMucmVjb3JkRmFpbHVyZXMobWVtb1JlYy5mYWlsdXJlc0F0UmlnaHRtb3N0UG9zaXRpb24sIHRydWUpO1xuICAgIH1cblxuICAgIHRoaXMuaW5wdXRTdHJlYW0uZXhhbWluZWRMZW5ndGggPSBNYXRoLm1heChcbiAgICAgICAgdGhpcy5pbnB1dFN0cmVhbS5leGFtaW5lZExlbmd0aCxcbiAgICAgICAgbWVtb1JlYy5leGFtaW5lZExlbmd0aCArIG9yaWdQb3MsXG4gICAgKTtcblxuICAgIGlmIChtZW1vUmVjLnZhbHVlKSB7XG4gICAgICB0aGlzLmlucHV0U3RyZWFtLnBvcyArPSBtZW1vUmVjLm1hdGNoTGVuZ3RoO1xuICAgICAgdGhpcy5wdXNoQmluZGluZyhtZW1vUmVjLnZhbHVlLCBvcmlnUG9zKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBFdmFsdWF0ZSBgZXhwcmAgYW5kIHJldHVybiBgdHJ1ZWAgaWYgaXQgc3VjY2VlZGVkLCBgZmFsc2VgIG90aGVyd2lzZS4gT24gc3VjY2VzcywgYGJpbmRpbmdzYFxuICAvLyB3aWxsIGhhdmUgYGV4cHIuZ2V0QXJpdHkoKWAgbW9yZSBlbGVtZW50cyB0aGFuIGJlZm9yZSwgYW5kIHRoZSBpbnB1dCBzdHJlYW0ncyBwb3NpdGlvbiBtYXlcbiAgLy8gaGF2ZSBpbmNyZWFzZWQuIE9uIGZhaWx1cmUsIGBiaW5kaW5nc2AgYW5kIHBvc2l0aW9uIHdpbGwgYmUgdW5jaGFuZ2VkLlxuICBldmFsKGV4cHIpIHtcbiAgICBjb25zdCB7aW5wdXRTdHJlYW19ID0gdGhpcztcbiAgICBjb25zdCBvcmlnTnVtQmluZGluZ3MgPSB0aGlzLl9iaW5kaW5ncy5sZW5ndGg7XG4gICAgY29uc3Qgb3JpZ1VzZXJEYXRhID0gdGhpcy51c2VyRGF0YTtcblxuICAgIGxldCBvcmlnUmVjb3JkZWRGYWlsdXJlcztcbiAgICBpZiAodGhpcy5yZWNvcmRlZEZhaWx1cmVzKSB7XG4gICAgICBvcmlnUmVjb3JkZWRGYWlsdXJlcyA9IHRoaXMucmVjb3JkZWRGYWlsdXJlcztcbiAgICAgIHRoaXMucmVjb3JkZWRGYWlsdXJlcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3JpZ1BvcyA9IGlucHV0U3RyZWFtLnBvcztcbiAgICBjb25zdCBtZW1vUG9zID0gdGhpcy5tYXliZVNraXBTcGFjZXNCZWZvcmUoZXhwcik7XG5cbiAgICBsZXQgb3JpZ1RyYWNlO1xuICAgIGlmICh0aGlzLnRyYWNlKSB7XG4gICAgICBvcmlnVHJhY2UgPSB0aGlzLnRyYWNlO1xuICAgICAgdGhpcy50cmFjZSA9IFtdO1xuICAgIH1cblxuICAgIC8vIERvIHRoZSBhY3R1YWwgZXZhbHVhdGlvbi5cbiAgICBjb25zdCBhbnMgPSBleHByLmV2YWwodGhpcyk7XG5cbiAgICBpZiAodGhpcy50cmFjZSkge1xuICAgICAgY29uc3QgYmluZGluZ3MgPSB0aGlzLl9iaW5kaW5ncy5zbGljZShvcmlnTnVtQmluZGluZ3MpO1xuICAgICAgY29uc3QgdHJhY2VFbnRyeSA9IHRoaXMuZ2V0VHJhY2VFbnRyeShtZW1vUG9zLCBleHByLCBhbnMsIGJpbmRpbmdzKTtcbiAgICAgIHRyYWNlRW50cnkuaXNJbXBsaWNpdFNwYWNlcyA9IGV4cHIgPT09IGFwcGx5U3BhY2VzO1xuICAgICAgdHJhY2VFbnRyeS5pc1Jvb3ROb2RlID0gZXhwciA9PT0gdGhpcy5zdGFydEV4cHI7XG4gICAgICBvcmlnVHJhY2UucHVzaCh0cmFjZUVudHJ5KTtcbiAgICAgIHRoaXMudHJhY2UgPSBvcmlnVHJhY2U7XG4gICAgfVxuXG4gICAgaWYgKGFucykge1xuICAgICAgaWYgKHRoaXMucmVjb3JkZWRGYWlsdXJlcyAmJiBpbnB1dFN0cmVhbS5wb3MgPT09IHRoaXMucG9zaXRpb25Ub1JlY29yZEZhaWx1cmVzKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMucmVjb3JkZWRGYWlsdXJlcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgIHRoaXMucmVjb3JkZWRGYWlsdXJlc1trZXldLm1ha2VGbHVmZnkoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFJlc2V0IHRoZSBwb3NpdGlvbiwgYmluZGluZ3MsIGFuZCB1c2VyRGF0YS5cbiAgICAgIGlucHV0U3RyZWFtLnBvcyA9IG9yaWdQb3M7XG4gICAgICB0aGlzLnRydW5jYXRlQmluZGluZ3Mob3JpZ051bUJpbmRpbmdzKTtcbiAgICAgIHRoaXMudXNlckRhdGEgPSBvcmlnVXNlckRhdGE7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucmVjb3JkZWRGYWlsdXJlcykge1xuICAgICAgdGhpcy5yZWNvcmRGYWlsdXJlcyhvcmlnUmVjb3JkZWRGYWlsdXJlcywgZmFsc2UpO1xuICAgIH1cblxuICAgIC8vIFRoZSBidWlsdC1pbiBhcHBseVN5bnRhY3RpYyBydWxlIG5lZWRzIHNwZWNpYWwgaGFuZGxpbmc6IHdlIHdhbnQgdG8gc2tpcFxuICAgIC8vIHRyYWlsaW5nIHNwYWNlcywganVzdCBhcyB3aXRoIHRoZSB0b3AtbGV2ZWwgYXBwbGljYXRpb24gb2YgYSBzeW50YWN0aWMgcnVsZS5cbiAgICBpZiAoZXhwciA9PT0gYnVpbHRJbkFwcGx5U3ludGFjdGljQm9keSkge1xuICAgICAgdGhpcy5za2lwU3BhY2VzKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFucztcbiAgfVxuXG4gIGdldE1hdGNoUmVzdWx0KCkge1xuICAgIHRoaXMuZ3JhbW1hci5fc2V0VXBNYXRjaFN0YXRlKHRoaXMpO1xuICAgIHRoaXMuZXZhbCh0aGlzLnN0YXJ0RXhwcik7XG4gICAgbGV0IHJpZ2h0bW9zdEZhaWx1cmVzO1xuICAgIGlmICh0aGlzLnJlY29yZGVkRmFpbHVyZXMpIHtcbiAgICAgIHJpZ2h0bW9zdEZhaWx1cmVzID0gT2JqZWN0LmtleXModGhpcy5yZWNvcmRlZEZhaWx1cmVzKS5tYXAoXG4gICAgICAgICAga2V5ID0+IHRoaXMucmVjb3JkZWRGYWlsdXJlc1trZXldLFxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3QgY3N0ID0gdGhpcy5fYmluZGluZ3NbMF07XG4gICAgaWYgKGNzdCkge1xuICAgICAgY3N0LmdyYW1tYXIgPSB0aGlzLmdyYW1tYXI7XG4gICAgfVxuICAgIHJldHVybiBuZXcgTWF0Y2hSZXN1bHQoXG4gICAgICAgIHRoaXMubWF0Y2hlcixcbiAgICAgICAgdGhpcy5pbnB1dCxcbiAgICAgICAgdGhpcy5zdGFydEV4cHIsXG4gICAgICAgIGNzdCxcbiAgICAgICAgdGhpcy5fYmluZGluZ09mZnNldHNbMF0sXG4gICAgICAgIHRoaXMucmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uLFxuICAgICAgICByaWdodG1vc3RGYWlsdXJlcyxcbiAgICApO1xuICB9XG5cbiAgZ2V0VHJhY2UoKSB7XG4gICAgdGhpcy50cmFjZSA9IFtdO1xuICAgIGNvbnN0IG1hdGNoUmVzdWx0ID0gdGhpcy5nZXRNYXRjaFJlc3VsdCgpO1xuXG4gICAgLy8gVGhlIHRyYWNlIG5vZGUgZm9yIHRoZSBzdGFydCBydWxlIGlzIGFsd2F5cyB0aGUgbGFzdCBlbnRyeS4gSWYgaXQgaXMgYSBzeW50YWN0aWMgcnVsZSxcbiAgICAvLyB0aGUgZmlyc3QgZW50cnkgaXMgZm9yIGFuIGFwcGxpY2F0aW9uIG9mICdzcGFjZXMnLlxuICAgIC8vIFRPRE8ocGR1YnJveSk6IENsZWFuIHRoaXMgdXAgYnkgaW50cm9kdWNpbmcgYSBzcGVjaWFsIGBNYXRjaDxzdGFydEFwcGw+YCBydWxlLCB3aGljaCB3aWxsXG4gICAgLy8gZW5zdXJlIHRoYXQgdGhlcmUgaXMgYWx3YXlzIGEgc2luZ2xlIHJvb3QgdHJhY2Ugbm9kZS5cbiAgICBjb25zdCByb290VHJhY2UgPSB0aGlzLnRyYWNlW3RoaXMudHJhY2UubGVuZ3RoIC0gMV07XG4gICAgcm9vdFRyYWNlLnJlc3VsdCA9IG1hdGNoUmVzdWx0O1xuICAgIHJldHVybiByb290VHJhY2U7XG4gIH1cblxuICBwdXNoRmFpbHVyZXNJbmZvKCkge1xuICAgIHRoaXMuX3JpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvblN0YWNrLnB1c2godGhpcy5yaWdodG1vc3RGYWlsdXJlUG9zaXRpb24pO1xuICAgIHRoaXMuX3JlY29yZGVkRmFpbHVyZXNTdGFjay5wdXNoKHRoaXMucmVjb3JkZWRGYWlsdXJlcyk7XG4gIH1cblxuICBwb3BGYWlsdXJlc0luZm8oKSB7XG4gICAgdGhpcy5yaWdodG1vc3RGYWlsdXJlUG9zaXRpb24gPSB0aGlzLl9yaWdodG1vc3RGYWlsdXJlUG9zaXRpb25TdGFjay5wb3AoKTtcbiAgICB0aGlzLnJlY29yZGVkRmFpbHVyZXMgPSB0aGlzLl9yZWNvcmRlZEZhaWx1cmVzU3RhY2sucG9wKCk7XG4gIH1cbn1cbiIsImltcG9ydCB7Z3JhbW1hckRvZXNOb3RTdXBwb3J0SW5jcmVtZW50YWxQYXJzaW5nfSBmcm9tICcuL2Vycm9ycy5qcyc7XG5pbXBvcnQge01hdGNoU3RhdGV9IGZyb20gJy4vTWF0Y2hTdGF0ZS5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMuanMnO1xuXG5leHBvcnQgY2xhc3MgTWF0Y2hlciB7XG4gIGNvbnN0cnVjdG9yKGdyYW1tYXIpIHtcbiAgICB0aGlzLmdyYW1tYXIgPSBncmFtbWFyO1xuICAgIHRoaXMuX21lbW9UYWJsZSA9IFtdO1xuICAgIHRoaXMuX2lucHV0ID0gJyc7XG4gICAgdGhpcy5faXNNZW1vVGFibGVTdGFsZSA9IGZhbHNlO1xuICB9XG5cbiAgX3Jlc2V0TWVtb1RhYmxlKCkge1xuICAgIHRoaXMuX21lbW9UYWJsZSA9IFtdO1xuICAgIHRoaXMuX2lzTWVtb1RhYmxlU3RhbGUgPSBmYWxzZTtcbiAgfVxuXG4gIGdldElucHV0KCkge1xuICAgIHJldHVybiB0aGlzLl9pbnB1dDtcbiAgfVxuXG4gIHNldElucHV0KHN0cikge1xuICAgIGlmICh0aGlzLl9pbnB1dCAhPT0gc3RyKSB7XG4gICAgICB0aGlzLnJlcGxhY2VJbnB1dFJhbmdlKDAsIHRoaXMuX2lucHV0Lmxlbmd0aCwgc3RyKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICByZXBsYWNlSW5wdXRSYW5nZShzdGFydElkeCwgZW5kSWR4LCBzdHIpIHtcbiAgICBjb25zdCBwcmV2SW5wdXQgPSB0aGlzLl9pbnB1dDtcbiAgICBjb25zdCBtZW1vVGFibGUgPSB0aGlzLl9tZW1vVGFibGU7XG4gICAgaWYgKFxuICAgICAgc3RhcnRJZHggPCAwIHx8XG4gICAgICBzdGFydElkeCA+IHByZXZJbnB1dC5sZW5ndGggfHxcbiAgICAgIGVuZElkeCA8IDAgfHxcbiAgICAgIGVuZElkeCA+IHByZXZJbnB1dC5sZW5ndGggfHxcbiAgICAgIHN0YXJ0SWR4ID4gZW5kSWR4XG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaW5kaWNlczogJyArIHN0YXJ0SWR4ICsgJyBhbmQgJyArIGVuZElkeCk7XG4gICAgfVxuXG4gICAgLy8gdXBkYXRlIGlucHV0XG4gICAgdGhpcy5faW5wdXQgPSBwcmV2SW5wdXQuc2xpY2UoMCwgc3RhcnRJZHgpICsgc3RyICsgcHJldklucHV0LnNsaWNlKGVuZElkeCk7XG4gICAgaWYgKHRoaXMuX2lucHV0ICE9PSBwcmV2SW5wdXQgJiYgbWVtb1RhYmxlLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuX2lzTWVtb1RhYmxlU3RhbGUgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIHVwZGF0ZSBtZW1vIHRhYmxlIChzaW1pbGFyIHRvIHRoZSBhYm92ZSlcbiAgICBjb25zdCByZXN0T2ZNZW1vVGFibGUgPSBtZW1vVGFibGUuc2xpY2UoZW5kSWR4KTtcbiAgICBtZW1vVGFibGUubGVuZ3RoID0gc3RhcnRJZHg7XG4gICAgZm9yIChsZXQgaWR4ID0gMDsgaWR4IDwgc3RyLmxlbmd0aDsgaWR4KyspIHtcbiAgICAgIG1lbW9UYWJsZS5wdXNoKHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgcG9zSW5mbyBvZiByZXN0T2ZNZW1vVGFibGUpIHtcbiAgICAgIG1lbW9UYWJsZS5wdXNoKHBvc0luZm8pO1xuICAgIH1cblxuICAgIC8vIEludmFsaWRhdGUgbWVtb1JlY3NcbiAgICBmb3IgKGxldCBwb3MgPSAwOyBwb3MgPCBzdGFydElkeDsgcG9zKyspIHtcbiAgICAgIGNvbnN0IHBvc0luZm8gPSBtZW1vVGFibGVbcG9zXTtcbiAgICAgIGlmIChwb3NJbmZvKSB7XG4gICAgICAgIHBvc0luZm8uY2xlYXJPYnNvbGV0ZUVudHJpZXMocG9zLCBzdGFydElkeCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBtYXRjaChvcHRTdGFydEFwcGxpY2F0aW9uU3RyLCBvcHRpb25zID0ge2luY3JlbWVudGFsOiB0cnVlfSkge1xuICAgIHJldHVybiB0aGlzLl9tYXRjaCh0aGlzLl9nZXRTdGFydEV4cHIob3B0U3RhcnRBcHBsaWNhdGlvblN0ciksIHtcbiAgICAgIGluY3JlbWVudGFsOiBvcHRpb25zLmluY3JlbWVudGFsLFxuICAgICAgdHJhY2luZzogZmFsc2UsXG4gICAgfSk7XG4gIH1cblxuICB0cmFjZShvcHRTdGFydEFwcGxpY2F0aW9uU3RyLCBvcHRpb25zID0ge2luY3JlbWVudGFsOiB0cnVlfSkge1xuICAgIHJldHVybiB0aGlzLl9tYXRjaCh0aGlzLl9nZXRTdGFydEV4cHIob3B0U3RhcnRBcHBsaWNhdGlvblN0ciksIHtcbiAgICAgIGluY3JlbWVudGFsOiBvcHRpb25zLmluY3JlbWVudGFsLFxuICAgICAgdHJhY2luZzogdHJ1ZSxcbiAgICB9KTtcbiAgfVxuXG4gIF9tYXRjaChzdGFydEV4cHIsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IG9wdHMgPSB7XG4gICAgICB0cmFjaW5nOiBmYWxzZSxcbiAgICAgIGluY3JlbWVudGFsOiB0cnVlLFxuICAgICAgcG9zaXRpb25Ub1JlY29yZEZhaWx1cmVzOiB1bmRlZmluZWQsXG4gICAgICAuLi5vcHRpb25zLFxuICAgIH07XG4gICAgaWYgKCFvcHRzLmluY3JlbWVudGFsKSB7XG4gICAgICB0aGlzLl9yZXNldE1lbW9UYWJsZSgpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5faXNNZW1vVGFibGVTdGFsZSAmJiAhdGhpcy5ncmFtbWFyLnN1cHBvcnRzSW5jcmVtZW50YWxQYXJzaW5nKSB7XG4gICAgICB0aHJvdyBncmFtbWFyRG9lc05vdFN1cHBvcnRJbmNyZW1lbnRhbFBhcnNpbmcodGhpcy5ncmFtbWFyKTtcbiAgICB9XG5cbiAgICBjb25zdCBzdGF0ZSA9IG5ldyBNYXRjaFN0YXRlKHRoaXMsIHN0YXJ0RXhwciwgb3B0cy5wb3NpdGlvblRvUmVjb3JkRmFpbHVyZXMpO1xuICAgIHJldHVybiBvcHRzLnRyYWNpbmcgPyBzdGF0ZS5nZXRUcmFjZSgpIDogc3RhdGUuZ2V0TWF0Y2hSZXN1bHQoKTtcbiAgfVxuXG4gIC8qXG4gICAgUmV0dXJucyB0aGUgc3RhcnRpbmcgZXhwcmVzc2lvbiBmb3IgdGhpcyBNYXRjaGVyJ3MgYXNzb2NpYXRlZCBncmFtbWFyLiBJZlxuICAgIGBvcHRTdGFydEFwcGxpY2F0aW9uU3RyYCBpcyBzcGVjaWZpZWQsIGl0IGlzIGEgc3RyaW5nIGV4cHJlc3NpbmcgYSBydWxlIGFwcGxpY2F0aW9uIGluIHRoZVxuICAgIGdyYW1tYXIuIElmIG5vdCBzcGVjaWZpZWQsIHRoZSBncmFtbWFyJ3MgZGVmYXVsdCBzdGFydCBydWxlIHdpbGwgYmUgdXNlZC5cbiAgKi9cbiAgX2dldFN0YXJ0RXhwcihvcHRTdGFydEFwcGxpY2F0aW9uU3RyKSB7XG4gICAgY29uc3QgYXBwbGljYXRpb25TdHIgPSBvcHRTdGFydEFwcGxpY2F0aW9uU3RyIHx8IHRoaXMuZ3JhbW1hci5kZWZhdWx0U3RhcnRSdWxlO1xuICAgIGlmICghYXBwbGljYXRpb25TdHIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBzdGFydCBydWxlIGFyZ3VtZW50IC0tIHRoZSBncmFtbWFyIGhhcyBubyBkZWZhdWx0IHN0YXJ0IHJ1bGUuJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhcnRBcHAgPSB0aGlzLmdyYW1tYXIucGFyc2VBcHBsaWNhdGlvbihhcHBsaWNhdGlvblN0cik7XG4gICAgcmV0dXJuIG5ldyBwZXhwcnMuU2VxKFtzdGFydEFwcCwgcGV4cHJzLmVuZF0pO1xuICB9XG59XG4iLCJpbXBvcnQge0lucHV0U3RyZWFtfSBmcm9tICcuL0lucHV0U3RyZWFtLmpzJztcbmltcG9ydCB7SXRlcmF0aW9uTm9kZX0gZnJvbSAnLi9ub2Rlcy5qcyc7XG5pbXBvcnQge01hdGNoUmVzdWx0fSBmcm9tICcuL01hdGNoUmVzdWx0LmpzJztcbmltcG9ydCAqIGFzIGNvbW1vbiBmcm9tICcuL2NvbW1vbi5qcyc7XG5pbXBvcnQgKiBhcyBlcnJvcnMgZnJvbSAnLi9lcnJvcnMuanMnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWwuanMnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUHJpdmF0ZSBzdHVmZlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuY29uc3QgZ2xvYmFsQWN0aW9uU3RhY2sgPSBbXTtcblxuY29uc3QgaGFzT3duUHJvcGVydHkgPSAoeCwgcHJvcCkgPT4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHgsIHByb3ApO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLSBXcmFwcGVycyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBXcmFwcGVycyBkZWNvcmF0ZSBDU1Qgbm9kZXMgd2l0aCBhbGwgb2YgdGhlIGZ1bmN0aW9uYWxpdHkgKGkuZS4sIG9wZXJhdGlvbnMgYW5kIGF0dHJpYnV0ZXMpXG4vLyBwcm92aWRlZCBieSBhIFNlbWFudGljcyAoc2VlIGJlbG93KS4gYFdyYXBwZXJgIGlzIHRoZSBhYnN0cmFjdCBzdXBlcmNsYXNzIG9mIGFsbCB3cmFwcGVycy4gQVxuLy8gYFdyYXBwZXJgIG11c3QgaGF2ZSBgX25vZGVgIGFuZCBgX3NlbWFudGljc2AgaW5zdGFuY2UgdmFyaWFibGVzLCB3aGljaCByZWZlciB0byB0aGUgQ1NUIG5vZGUgYW5kXG4vLyBTZW1hbnRpY3MgKHJlc3AuKSBmb3Igd2hpY2ggaXQgd2FzIGNyZWF0ZWQsIGFuZCBhIGBfY2hpbGRXcmFwcGVyc2AgaW5zdGFuY2UgdmFyaWFibGUgd2hpY2ggaXNcbi8vIHVzZWQgdG8gY2FjaGUgdGhlIHdyYXBwZXIgaW5zdGFuY2VzIHRoYXQgYXJlIGNyZWF0ZWQgZm9yIGl0cyBjaGlsZCBub2Rlcy4gU2V0dGluZyB0aGVzZSBpbnN0YW5jZVxuLy8gdmFyaWFibGVzIGlzIHRoZSByZXNwb25zaWJpbGl0eSBvZiB0aGUgY29uc3RydWN0b3Igb2YgZWFjaCBTZW1hbnRpY3Mtc3BlY2lmaWMgc3ViY2xhc3Mgb2Zcbi8vIGBXcmFwcGVyYC5cbmNsYXNzIFdyYXBwZXIge1xuICBjb25zdHJ1Y3Rvcihub2RlLCBzb3VyY2VJbnRlcnZhbCwgYmFzZUludGVydmFsKSB7XG4gICAgdGhpcy5fbm9kZSA9IG5vZGU7XG4gICAgdGhpcy5zb3VyY2UgPSBzb3VyY2VJbnRlcnZhbDtcblxuICAgIC8vIFRoZSBpbnRlcnZhbCB0aGF0IHRoZSBjaGlsZE9mZnNldHMgb2YgYG5vZGVgIGFyZSByZWxhdGl2ZSB0by4gSXQgc2hvdWxkIGJlIHRoZSBzb3VyY2VcbiAgICAvLyBvZiB0aGUgY2xvc2VzdCBOb250ZXJtaW5hbCBub2RlLlxuICAgIHRoaXMuX2Jhc2VJbnRlcnZhbCA9IGJhc2VJbnRlcnZhbDtcblxuICAgIGlmIChub2RlLmlzTm9udGVybWluYWwoKSkge1xuICAgICAgY29tbW9uLmFzc2VydChzb3VyY2VJbnRlcnZhbCA9PT0gYmFzZUludGVydmFsKTtcbiAgICB9XG4gICAgdGhpcy5fY2hpbGRXcmFwcGVycyA9IFtdO1xuICB9XG5cbiAgX2ZvcmdldE1lbW9pemVkUmVzdWx0Rm9yKGF0dHJpYnV0ZU5hbWUpIHtcbiAgICAvLyBSZW1vdmUgdGhlIG1lbW9pemVkIGF0dHJpYnV0ZSBmcm9tIHRoZSBjc3ROb2RlIGFuZCBhbGwgaXRzIGNoaWxkcmVuLlxuICAgIGRlbGV0ZSB0aGlzLl9ub2RlW3RoaXMuX3NlbWFudGljcy5hdHRyaWJ1dGVLZXlzW2F0dHJpYnV0ZU5hbWVdXTtcbiAgICB0aGlzLmNoaWxkcmVuLmZvckVhY2goY2hpbGQgPT4ge1xuICAgICAgY2hpbGQuX2ZvcmdldE1lbW9pemVkUmVzdWx0Rm9yKGF0dHJpYnV0ZU5hbWUpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gUmV0dXJucyB0aGUgd3JhcHBlciBvZiB0aGUgc3BlY2lmaWVkIGNoaWxkIG5vZGUuIENoaWxkIHdyYXBwZXJzIGFyZSBjcmVhdGVkIGxhemlseSBhbmRcbiAgLy8gY2FjaGVkIGluIHRoZSBwYXJlbnQgd3JhcHBlcidzIGBfY2hpbGRXcmFwcGVyc2AgaW5zdGFuY2UgdmFyaWFibGUuXG4gIGNoaWxkKGlkeCkge1xuICAgIGlmICghKDAgPD0gaWR4ICYmIGlkeCA8IHRoaXMuX25vZGUubnVtQ2hpbGRyZW4oKSkpIHtcbiAgICAgIC8vIFRPRE86IENvbnNpZGVyIHRocm93aW5nIGFuIGV4Y2VwdGlvbiBoZXJlLlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgbGV0IGNoaWxkV3JhcHBlciA9IHRoaXMuX2NoaWxkV3JhcHBlcnNbaWR4XTtcbiAgICBpZiAoIWNoaWxkV3JhcHBlcikge1xuICAgICAgY29uc3QgY2hpbGROb2RlID0gdGhpcy5fbm9kZS5jaGlsZEF0KGlkeCk7XG4gICAgICBjb25zdCBvZmZzZXQgPSB0aGlzLl9ub2RlLmNoaWxkT2Zmc2V0c1tpZHhdO1xuXG4gICAgICBjb25zdCBzb3VyY2UgPSB0aGlzLl9iYXNlSW50ZXJ2YWwuc3ViSW50ZXJ2YWwob2Zmc2V0LCBjaGlsZE5vZGUubWF0Y2hMZW5ndGgpO1xuICAgICAgY29uc3QgYmFzZSA9IGNoaWxkTm9kZS5pc05vbnRlcm1pbmFsKCkgPyBzb3VyY2UgOiB0aGlzLl9iYXNlSW50ZXJ2YWw7XG4gICAgICBjaGlsZFdyYXBwZXIgPSB0aGlzLl9jaGlsZFdyYXBwZXJzW2lkeF0gPSB0aGlzLl9zZW1hbnRpY3Mud3JhcChjaGlsZE5vZGUsIHNvdXJjZSwgYmFzZSk7XG4gICAgfVxuICAgIHJldHVybiBjaGlsZFdyYXBwZXI7XG4gIH1cblxuICAvLyBSZXR1cm5zIGFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIHdyYXBwZXJzIG9mIGFsbCBvZiB0aGUgY2hpbGRyZW4gb2YgdGhlIG5vZGUgYXNzb2NpYXRlZFxuICAvLyB3aXRoIHRoaXMgd3JhcHBlci5cbiAgX2NoaWxkcmVuKCkge1xuICAgIC8vIEZvcmNlIHRoZSBjcmVhdGlvbiBvZiBhbGwgY2hpbGQgd3JhcHBlcnNcbiAgICBmb3IgKGxldCBpZHggPSAwOyBpZHggPCB0aGlzLl9ub2RlLm51bUNoaWxkcmVuKCk7IGlkeCsrKSB7XG4gICAgICB0aGlzLmNoaWxkKGlkeCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jaGlsZFdyYXBwZXJzO1xuICB9XG5cbiAgLy8gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIENTVCBub2RlIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHdyYXBwZXIgY29ycmVzcG9uZHMgdG8gYW4gaXRlcmF0aW9uXG4gIC8vIGV4cHJlc3Npb24sIGkuZS4sIGEgS2xlZW5lLSosIEtsZWVuZS0rLCBvciBhbiBvcHRpb25hbC4gUmV0dXJucyBgZmFsc2VgIG90aGVyd2lzZS5cbiAgaXNJdGVyYXRpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX25vZGUuaXNJdGVyYXRpb24oKTtcbiAgfVxuXG4gIC8vIFJldHVybnMgYHRydWVgIGlmIHRoZSBDU1Qgbm9kZSBhc3NvY2lhdGVkIHdpdGggdGhpcyB3cmFwcGVyIGlzIGEgdGVybWluYWwgbm9kZSwgYGZhbHNlYFxuICAvLyBvdGhlcndpc2UuXG4gIGlzVGVybWluYWwoKSB7XG4gICAgcmV0dXJuIHRoaXMuX25vZGUuaXNUZXJtaW5hbCgpO1xuICB9XG5cbiAgLy8gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIENTVCBub2RlIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHdyYXBwZXIgaXMgYSBub250ZXJtaW5hbCBub2RlLCBgZmFsc2VgXG4gIC8vIG90aGVyd2lzZS5cbiAgaXNOb250ZXJtaW5hbCgpIHtcbiAgICByZXR1cm4gdGhpcy5fbm9kZS5pc05vbnRlcm1pbmFsKCk7XG4gIH1cblxuICAvLyBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgQ1NUIG5vZGUgYXNzb2NpYXRlZCB3aXRoIHRoaXMgd3JhcHBlciBpcyBhIG5vbnRlcm1pbmFsIG5vZGVcbiAgLy8gY29ycmVzcG9uZGluZyB0byBhIHN5bnRhY3RpYyBydWxlLCBgZmFsc2VgIG90aGVyd2lzZS5cbiAgaXNTeW50YWN0aWMoKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNOb250ZXJtaW5hbCgpICYmIHRoaXMuX25vZGUuaXNTeW50YWN0aWMoKTtcbiAgfVxuXG4gIC8vIFJldHVybnMgYHRydWVgIGlmIHRoZSBDU1Qgbm9kZSBhc3NvY2lhdGVkIHdpdGggdGhpcyB3cmFwcGVyIGlzIGEgbm9udGVybWluYWwgbm9kZVxuICAvLyBjb3JyZXNwb25kaW5nIHRvIGEgbGV4aWNhbCBydWxlLCBgZmFsc2VgIG90aGVyd2lzZS5cbiAgaXNMZXhpY2FsKCkge1xuICAgIHJldHVybiB0aGlzLmlzTm9udGVybWluYWwoKSAmJiB0aGlzLl9ub2RlLmlzTGV4aWNhbCgpO1xuICB9XG5cbiAgLy8gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIENTVCBub2RlIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHdyYXBwZXIgaXMgYW4gaXRlcmF0b3Igbm9kZVxuICAvLyBoYXZpbmcgZWl0aGVyIG9uZSBvciBubyBjaGlsZCAoPyBvcGVyYXRvciksIGBmYWxzZWAgb3RoZXJ3aXNlLlxuICAvLyBPdGhlcndpc2UsIHRocm93cyBhbiBleGNlcHRpb24uXG4gIGlzT3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIHRoaXMuX25vZGUuaXNPcHRpb25hbCgpO1xuICB9XG5cbiAgLy8gQ3JlYXRlIGEgbmV3IF9pdGVyIHdyYXBwZXIgaW4gdGhlIHNhbWUgc2VtYW50aWNzIGFzIHRoaXMgd3JhcHBlci5cbiAgaXRlcmF0aW9uKG9wdENoaWxkV3JhcHBlcnMpIHtcbiAgICBjb25zdCBjaGlsZFdyYXBwZXJzID0gb3B0Q2hpbGRXcmFwcGVycyB8fCBbXTtcblxuICAgIGNvbnN0IGNoaWxkTm9kZXMgPSBjaGlsZFdyYXBwZXJzLm1hcChjID0+IGMuX25vZGUpO1xuICAgIGNvbnN0IGl0ZXIgPSBuZXcgSXRlcmF0aW9uTm9kZShjaGlsZE5vZGVzLCBbXSwgLTEsIGZhbHNlKTtcblxuICAgIGNvbnN0IHdyYXBwZXIgPSB0aGlzLl9zZW1hbnRpY3Mud3JhcChpdGVyLCBudWxsLCBudWxsKTtcbiAgICB3cmFwcGVyLl9jaGlsZFdyYXBwZXJzID0gY2hpbGRXcmFwcGVycztcbiAgICByZXR1cm4gd3JhcHBlcjtcbiAgfVxuXG4gIC8vIFJldHVybnMgYW4gYXJyYXkgY29udGFpbmluZyB0aGUgY2hpbGRyZW4gb2YgdGhpcyBDU1Qgbm9kZS5cbiAgZ2V0IGNoaWxkcmVuKCkge1xuICAgIHJldHVybiB0aGlzLl9jaGlsZHJlbigpO1xuICB9XG5cbiAgLy8gUmV0dXJucyB0aGUgbmFtZSBvZiBncmFtbWFyIHJ1bGUgdGhhdCBjcmVhdGVkIHRoaXMgQ1NUIG5vZGUuXG4gIGdldCBjdG9yTmFtZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fbm9kZS5jdG9yTmFtZTtcbiAgfVxuXG4gIC8vIFJldHVybnMgdGhlIG51bWJlciBvZiBjaGlsZHJlbiBvZiB0aGlzIENTVCBub2RlLlxuICBnZXQgbnVtQ2hpbGRyZW4oKSB7XG4gICAgcmV0dXJuIHRoaXMuX25vZGUubnVtQ2hpbGRyZW4oKTtcbiAgfVxuXG4gIC8vIFJldHVybnMgdGhlIGNvbnRlbnRzIG9mIHRoZSBpbnB1dCBzdHJlYW0gY29uc3VtZWQgYnkgdGhpcyBDU1Qgbm9kZS5cbiAgZ2V0IHNvdXJjZVN0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5zb3VyY2UuY29udGVudHM7XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0gU2VtYW50aWNzIC0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIEEgU2VtYW50aWNzIGlzIGEgY29udGFpbmVyIGZvciBhIGZhbWlseSBvZiBPcGVyYXRpb25zIGFuZCBBdHRyaWJ1dGVzIGZvciBhIGdpdmVuIGdyYW1tYXIuXG4vLyBTZW1hbnRpY3MgZW5hYmxlIG1vZHVsYXJpdHkgKGRpZmZlcmVudCBjbGllbnRzIG9mIGEgZ3JhbW1hciBjYW4gY3JlYXRlIHRoZWlyIHNldCBvZiBvcGVyYXRpb25zXG4vLyBhbmQgYXR0cmlidXRlcyBpbiBpc29sYXRpb24pIGFuZCBleHRlbnNpYmlsaXR5IGV2ZW4gd2hlbiBvcGVyYXRpb25zIGFuZCBhdHRyaWJ1dGVzIGFyZSBtdXR1YWxseS1cbi8vIHJlY3Vyc2l2ZS4gVGhpcyBjb25zdHJ1Y3RvciBzaG91bGQgbm90IGJlIGNhbGxlZCBkaXJlY3RseSBleGNlcHQgZnJvbVxuLy8gYFNlbWFudGljcy5jcmVhdGVTZW1hbnRpY3NgLiBUaGUgbm9ybWFsIHdheXMgdG8gY3JlYXRlIGEgU2VtYW50aWNzLCBnaXZlbiBhIGdyYW1tYXIgJ2cnLCBhcmVcbi8vIGBnLmNyZWF0ZVNlbWFudGljcygpYCBhbmQgYGcuZXh0ZW5kU2VtYW50aWNzKHBhcmVudFNlbWFudGljcylgLlxuZXhwb3J0IGNsYXNzIFNlbWFudGljcyB7XG4gIGNvbnN0cnVjdG9yKGdyYW1tYXIsIHN1cGVyU2VtYW50aWNzKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5ncmFtbWFyID0gZ3JhbW1hcjtcbiAgICB0aGlzLmNoZWNrZWRBY3Rpb25EaWN0cyA9IGZhbHNlO1xuXG4gICAgLy8gQ29uc3RydWN0b3IgZm9yIHdyYXBwZXIgaW5zdGFuY2VzLCB3aGljaCBhcmUgcGFzc2VkIGFzIHRoZSBhcmd1bWVudHMgdG8gdGhlIHNlbWFudGljIGFjdGlvbnNcbiAgICAvLyBvZiBhbiBvcGVyYXRpb24gb3IgYXR0cmlidXRlLiBPcGVyYXRpb25zIGFuZCBhdHRyaWJ1dGVzIHJlcXVpcmUgZG91YmxlIGRpc3BhdGNoOiB0aGUgc2VtYW50aWNcbiAgICAvLyBhY3Rpb24gaXMgY2hvc2VuIGJhc2VkIG9uIGJvdGggdGhlIG5vZGUncyB0eXBlIGFuZCB0aGUgc2VtYW50aWNzLiBXcmFwcGVycyBlbnN1cmUgdGhhdFxuICAgIC8vIHRoZSBgZXhlY3V0ZWAgbWV0aG9kIGlzIGNhbGxlZCB3aXRoIHRoZSBjb3JyZWN0IChtb3N0IHNwZWNpZmljKSBzZW1hbnRpY3Mgb2JqZWN0IGFzIGFuXG4gICAgLy8gYXJndW1lbnQuXG4gICAgdGhpcy5XcmFwcGVyID0gY2xhc3MgZXh0ZW5kcyAoc3VwZXJTZW1hbnRpY3MgPyBzdXBlclNlbWFudGljcy5XcmFwcGVyIDogV3JhcHBlcikge1xuICAgICAgY29uc3RydWN0b3Iobm9kZSwgc291cmNlSW50ZXJ2YWwsIGJhc2VJbnRlcnZhbCkge1xuICAgICAgICBzdXBlcihub2RlLCBzb3VyY2VJbnRlcnZhbCwgYmFzZUludGVydmFsKTtcbiAgICAgICAgc2VsZi5jaGVja0FjdGlvbkRpY3RzSWZIYXZlbnRBbHJlYWR5KCk7XG4gICAgICAgIHRoaXMuX3NlbWFudGljcyA9IHNlbGY7XG4gICAgICB9XG5cbiAgICAgIHRvU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gJ1tzZW1hbnRpY3Mgd3JhcHBlciBmb3IgJyArIHNlbGYuZ3JhbW1hci5uYW1lICsgJ10nO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLnN1cGVyID0gc3VwZXJTZW1hbnRpY3M7XG4gICAgaWYgKHN1cGVyU2VtYW50aWNzKSB7XG4gICAgICBpZiAoIShncmFtbWFyLmVxdWFscyh0aGlzLnN1cGVyLmdyYW1tYXIpIHx8IGdyYW1tYXIuX2luaGVyaXRzRnJvbSh0aGlzLnN1cGVyLmdyYW1tYXIpKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBcIkNhbm5vdCBleHRlbmQgYSBzZW1hbnRpY3MgZm9yIGdyYW1tYXIgJ1wiICtcbiAgICAgICAgICAgIHRoaXMuc3VwZXIuZ3JhbW1hci5uYW1lICtcbiAgICAgICAgICAgIFwiJyBmb3IgdXNlIHdpdGggZ3JhbW1hciAnXCIgK1xuICAgICAgICAgICAgZ3JhbW1hci5uYW1lICtcbiAgICAgICAgICAgIFwiJyAobm90IGEgc3ViLWdyYW1tYXIpXCIsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICB0aGlzLm9wZXJhdGlvbnMgPSBPYmplY3QuY3JlYXRlKHRoaXMuc3VwZXIub3BlcmF0aW9ucyk7XG4gICAgICB0aGlzLmF0dHJpYnV0ZXMgPSBPYmplY3QuY3JlYXRlKHRoaXMuc3VwZXIuYXR0cmlidXRlcyk7XG4gICAgICB0aGlzLmF0dHJpYnV0ZUtleXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgICAvLyBBc3NpZ24gdW5pcXVlIHN5bWJvbHMgZm9yIGVhY2ggb2YgdGhlIGF0dHJpYnV0ZXMgaW5oZXJpdGVkIGZyb20gdGhlIHN1cGVyLXNlbWFudGljcyBzbyB0aGF0XG4gICAgICAvLyB0aGV5IGFyZSBtZW1vaXplZCBpbmRlcGVuZGVudGx5LlxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgICAgZm9yIChjb25zdCBhdHRyaWJ1dGVOYW1lIGluIHRoaXMuYXR0cmlidXRlcykge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcy5hdHRyaWJ1dGVLZXlzLCBhdHRyaWJ1dGVOYW1lLCB7XG4gICAgICAgICAgdmFsdWU6IHV0aWwudW5pcXVlSWQoYXR0cmlidXRlTmFtZSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9wZXJhdGlvbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgdGhpcy5hdHRyaWJ1dGVzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgIHRoaXMuYXR0cmlidXRlS2V5cyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgfVxuICB9XG5cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuICdbc2VtYW50aWNzIGZvciAnICsgdGhpcy5ncmFtbWFyLm5hbWUgKyAnXSc7XG4gIH1cblxuICBjaGVja0FjdGlvbkRpY3RzSWZIYXZlbnRBbHJlYWR5KCkge1xuICAgIGlmICghdGhpcy5jaGVja2VkQWN0aW9uRGljdHMpIHtcbiAgICAgIHRoaXMuY2hlY2tBY3Rpb25EaWN0cygpO1xuICAgICAgdGhpcy5jaGVja2VkQWN0aW9uRGljdHMgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8vIENoZWNrcyB0aGF0IHRoZSBhY3Rpb24gZGljdGlvbmFyaWVzIGZvciBhbGwgb3BlcmF0aW9ucyBhbmQgYXR0cmlidXRlcyBpbiB0aGlzIHNlbWFudGljcyxcbiAgLy8gaW5jbHVkaW5nIHRoZSBvbmVzIHRoYXQgd2VyZSBpbmhlcml0ZWQgZnJvbSB0aGUgc3VwZXItc2VtYW50aWNzLCBhZ3JlZSB3aXRoIHRoZSBncmFtbWFyLlxuICAvLyBUaHJvd3MgYW4gZXhjZXB0aW9uIGlmIG9uZSBvciBtb3JlIG9mIHRoZW0gZG9lc24ndC5cbiAgY2hlY2tBY3Rpb25EaWN0cygpIHtcbiAgICBsZXQgbmFtZTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgZm9yIChuYW1lIGluIHRoaXMub3BlcmF0aW9ucykge1xuICAgICAgdGhpcy5vcGVyYXRpb25zW25hbWVdLmNoZWNrQWN0aW9uRGljdCh0aGlzLmdyYW1tYXIpO1xuICAgIH1cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgZm9yIChuYW1lIGluIHRoaXMuYXR0cmlidXRlcykge1xuICAgICAgdGhpcy5hdHRyaWJ1dGVzW25hbWVdLmNoZWNrQWN0aW9uRGljdCh0aGlzLmdyYW1tYXIpO1xuICAgIH1cbiAgfVxuXG4gIHRvUmVjaXBlKHNlbWFudGljc09ubHkpIHtcbiAgICBmdW5jdGlvbiBoYXNTdXBlclNlbWFudGljcyhzKSB7XG4gICAgICByZXR1cm4gcy5zdXBlciAhPT0gU2VtYW50aWNzLkJ1aWx0SW5TZW1hbnRpY3MuX2dldFNlbWFudGljcygpO1xuICAgIH1cblxuICAgIGxldCBzdHIgPSAnKGZ1bmN0aW9uKGcpIHtcXG4nO1xuICAgIGlmIChoYXNTdXBlclNlbWFudGljcyh0aGlzKSkge1xuICAgICAgc3RyICs9ICcgIHZhciBzZW1hbnRpY3MgPSAnICsgdGhpcy5zdXBlci50b1JlY2lwZSh0cnVlKSArICcoZyc7XG5cbiAgICAgIGNvbnN0IHN1cGVyU2VtYW50aWNzR3JhbW1hciA9IHRoaXMuc3VwZXIuZ3JhbW1hcjtcbiAgICAgIGxldCByZWxhdGVkR3JhbW1hciA9IHRoaXMuZ3JhbW1hcjtcbiAgICAgIHdoaWxlIChyZWxhdGVkR3JhbW1hciAhPT0gc3VwZXJTZW1hbnRpY3NHcmFtbWFyKSB7XG4gICAgICAgIHN0ciArPSAnLnN1cGVyR3JhbW1hcic7XG4gICAgICAgIHJlbGF0ZWRHcmFtbWFyID0gcmVsYXRlZEdyYW1tYXIuc3VwZXJHcmFtbWFyO1xuICAgICAgfVxuXG4gICAgICBzdHIgKz0gJyk7XFxuJztcbiAgICAgIHN0ciArPSAnICByZXR1cm4gZy5leHRlbmRTZW1hbnRpY3Moc2VtYW50aWNzKSc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICByZXR1cm4gZy5jcmVhdGVTZW1hbnRpY3MoKSc7XG4gICAgfVxuICAgIFsnT3BlcmF0aW9uJywgJ0F0dHJpYnV0ZSddLmZvckVhY2godHlwZSA9PiB7XG4gICAgICBjb25zdCBzZW1hbnRpY09wZXJhdGlvbnMgPSB0aGlzW3R5cGUudG9Mb3dlckNhc2UoKSArICdzJ107XG4gICAgICBPYmplY3Qua2V5cyhzZW1hbnRpY09wZXJhdGlvbnMpLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICAgIGNvbnN0IHthY3Rpb25EaWN0LCBmb3JtYWxzLCBidWlsdEluRGVmYXVsdH0gPSBzZW1hbnRpY09wZXJhdGlvbnNbbmFtZV07XG5cbiAgICAgICAgbGV0IHNpZ25hdHVyZSA9IG5hbWU7XG4gICAgICAgIGlmIChmb3JtYWxzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBzaWduYXR1cmUgKz0gJygnICsgZm9ybWFscy5qb2luKCcsICcpICsgJyknO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IG1ldGhvZDtcbiAgICAgICAgaWYgKGhhc1N1cGVyU2VtYW50aWNzKHRoaXMpICYmIHRoaXMuc3VwZXJbdHlwZS50b0xvd2VyQ2FzZSgpICsgJ3MnXVtuYW1lXSkge1xuICAgICAgICAgIG1ldGhvZCA9ICdleHRlbmQnICsgdHlwZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtZXRob2QgPSAnYWRkJyArIHR5cGU7XG4gICAgICAgIH1cbiAgICAgICAgc3RyICs9ICdcXG4gICAgLicgKyBtZXRob2QgKyAnKCcgKyBKU09OLnN0cmluZ2lmeShzaWduYXR1cmUpICsgJywgeyc7XG5cbiAgICAgICAgY29uc3Qgc3JjQXJyYXkgPSBbXTtcbiAgICAgICAgT2JqZWN0LmtleXMoYWN0aW9uRGljdCkuZm9yRWFjaChhY3Rpb25OYW1lID0+IHtcbiAgICAgICAgICBpZiAoYWN0aW9uRGljdFthY3Rpb25OYW1lXSAhPT0gYnVpbHRJbkRlZmF1bHQpIHtcbiAgICAgICAgICAgIGxldCBzb3VyY2UgPSBhY3Rpb25EaWN0W2FjdGlvbk5hbWVdLnRvU3RyaW5nKCkudHJpbSgpO1xuXG4gICAgICAgICAgICAvLyBDb252ZXJ0IG1ldGhvZCBzaG9ydGhhbmQgdG8gcGxhaW4gb2xkIGZ1bmN0aW9uIHN5bnRheC5cbiAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9vaG1qcy9vaG0vaXNzdWVzLzI2M1xuICAgICAgICAgICAgc291cmNlID0gc291cmNlLnJlcGxhY2UoL14uKlxcKC8sICdmdW5jdGlvbignKTtcblxuICAgICAgICAgICAgc3JjQXJyYXkucHVzaCgnXFxuICAgICAgJyArIEpTT04uc3RyaW5naWZ5KGFjdGlvbk5hbWUpICsgJzogJyArIHNvdXJjZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgc3RyICs9IHNyY0FycmF5LmpvaW4oJywnKSArICdcXG4gICAgfSknO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgc3RyICs9ICc7XFxuICB9KSc7XG5cbiAgICBpZiAoIXNlbWFudGljc09ubHkpIHtcbiAgICAgIHN0ciA9XG4gICAgICAgICcoZnVuY3Rpb24oKSB7XFxuJyArXG4gICAgICAgICcgIHZhciBncmFtbWFyID0gdGhpcy5mcm9tUmVjaXBlKCcgK1xuICAgICAgICB0aGlzLmdyYW1tYXIudG9SZWNpcGUoKSArXG4gICAgICAgICcpO1xcbicgK1xuICAgICAgICAnICB2YXIgc2VtYW50aWNzID0gJyArXG4gICAgICAgIHN0ciArXG4gICAgICAgICcoZ3JhbW1hcik7XFxuJyArXG4gICAgICAgICcgIHJldHVybiBzZW1hbnRpY3M7XFxuJyArXG4gICAgICAgICd9KTtcXG4nO1xuICAgIH1cblxuICAgIHJldHVybiBzdHI7XG4gIH1cblxuICBhZGRPcGVyYXRpb25PckF0dHJpYnV0ZSh0eXBlLCBzaWduYXR1cmUsIGFjdGlvbkRpY3QpIHtcbiAgICBjb25zdCB0eXBlUGx1cmFsID0gdHlwZSArICdzJztcblxuICAgIGNvbnN0IHBhcnNlZE5hbWVBbmRGb3JtYWxBcmdzID0gcGFyc2VTaWduYXR1cmUoc2lnbmF0dXJlLCB0eXBlKTtcbiAgICBjb25zdCB7bmFtZX0gPSBwYXJzZWROYW1lQW5kRm9ybWFsQXJncztcbiAgICBjb25zdCB7Zm9ybWFsc30gPSBwYXJzZWROYW1lQW5kRm9ybWFsQXJncztcblxuICAgIC8vIFRPRE86IGNoZWNrIHRoYXQgdGhlcmUgYXJlIG5vIGR1cGxpY2F0ZSBmb3JtYWwgYXJndW1lbnRzXG5cbiAgICB0aGlzLmFzc2VydE5ld05hbWUobmFtZSwgdHlwZSk7XG5cbiAgICAvLyBDcmVhdGUgdGhlIGFjdGlvbiBkaWN0aW9uYXJ5IGZvciB0aGlzIG9wZXJhdGlvbiAvIGF0dHJpYnV0ZSB0aGF0IGNvbnRhaW5zIGEgYF9kZWZhdWx0YCBhY3Rpb25cbiAgICAvLyB3aGljaCBkZWZpbmVzIHRoZSBkZWZhdWx0IGJlaGF2aW9yIG9mIGl0ZXJhdGlvbiwgdGVybWluYWwsIGFuZCBub24tdGVybWluYWwgbm9kZXMuLi5cbiAgICBjb25zdCBidWlsdEluRGVmYXVsdCA9IG5ld0RlZmF1bHRBY3Rpb24odHlwZSwgbmFtZSwgZG9JdCk7XG4gICAgY29uc3QgcmVhbEFjdGlvbkRpY3QgPSB7X2RlZmF1bHQ6IGJ1aWx0SW5EZWZhdWx0fTtcbiAgICAvLyAuLi4gYW5kIGFkZCBpbiB0aGUgYWN0aW9ucyBzdXBwbGllZCBieSB0aGUgcHJvZ3JhbW1lciwgd2hpY2ggbWF5IG92ZXJyaWRlIHNvbWUgb3IgYWxsIG9mIHRoZVxuICAgIC8vIGRlZmF1bHQgb25lcy5cbiAgICBPYmplY3Qua2V5cyhhY3Rpb25EaWN0KS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgcmVhbEFjdGlvbkRpY3RbbmFtZV0gPSBhY3Rpb25EaWN0W25hbWVdO1xuICAgIH0pO1xuXG4gICAgY29uc3QgZW50cnkgPVxuICAgICAgdHlwZSA9PT0gJ29wZXJhdGlvbicgP1xuICAgICAgICBuZXcgT3BlcmF0aW9uKG5hbWUsIGZvcm1hbHMsIHJlYWxBY3Rpb25EaWN0LCBidWlsdEluRGVmYXVsdCkgOlxuICAgICAgICBuZXcgQXR0cmlidXRlKG5hbWUsIHJlYWxBY3Rpb25EaWN0LCBidWlsdEluRGVmYXVsdCk7XG5cbiAgICAvLyBUaGUgZm9sbG93aW5nIGNoZWNrIGlzIG5vdCBzdHJpY3RseSBuZWNlc3NhcnkgKGl0IHdpbGwgaGFwcGVuIGxhdGVyIGFueXdheSkgYnV0IGl0J3MgYmV0dGVyXG4gICAgLy8gdG8gY2F0Y2ggZXJyb3JzIGVhcmx5LlxuICAgIGVudHJ5LmNoZWNrQWN0aW9uRGljdCh0aGlzLmdyYW1tYXIpO1xuXG4gICAgdGhpc1t0eXBlUGx1cmFsXVtuYW1lXSA9IGVudHJ5O1xuXG4gICAgZnVuY3Rpb24gZG9JdCguLi5hcmdzKSB7XG4gICAgICAvLyBEaXNwYXRjaCB0byBtb3N0IHNwZWNpZmljIHZlcnNpb24gb2YgdGhpcyBvcGVyYXRpb24gLyBhdHRyaWJ1dGUgLS0gaXQgbWF5IGhhdmUgYmVlblxuICAgICAgLy8gb3ZlcnJpZGRlbiBieSBhIHN1Yi1zZW1hbnRpY3MuXG4gICAgICBjb25zdCB0aGlzVGhpbmcgPSB0aGlzLl9zZW1hbnRpY3NbdHlwZVBsdXJhbF1bbmFtZV07XG5cbiAgICAgIC8vIENoZWNrIHRoYXQgdGhlIGNhbGxlciBwYXNzZWQgdGhlIGNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cy5cbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoICE9PSB0aGlzVGhpbmcuZm9ybWFscy5sZW5ndGgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgJ0ludmFsaWQgbnVtYmVyIG9mIGFyZ3VtZW50cyBwYXNzZWQgdG8gJyArXG4gICAgICAgICAgICBuYW1lICtcbiAgICAgICAgICAgICcgJyArXG4gICAgICAgICAgICB0eXBlICtcbiAgICAgICAgICAgICcgKGV4cGVjdGVkICcgK1xuICAgICAgICAgICAgdGhpc1RoaW5nLmZvcm1hbHMubGVuZ3RoICtcbiAgICAgICAgICAgICcsIGdvdCAnICtcbiAgICAgICAgICAgIGFyZ3VtZW50cy5sZW5ndGggK1xuICAgICAgICAgICAgJyknLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICAvLyBDcmVhdGUgYW4gXCJhcmd1bWVudHMgb2JqZWN0XCIgZnJvbSB0aGUgYXJndW1lbnRzIHRoYXQgd2VyZSBwYXNzZWQgdG8gdGhpc1xuICAgICAgLy8gb3BlcmF0aW9uIC8gYXR0cmlidXRlLlxuICAgICAgY29uc3QgYXJnc09iaiA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICBmb3IgKGNvbnN0IFtpZHgsIHZhbF0gb2YgT2JqZWN0LmVudHJpZXMoYXJncykpIHtcbiAgICAgICAgY29uc3QgZm9ybWFsID0gdGhpc1RoaW5nLmZvcm1hbHNbaWR4XTtcbiAgICAgICAgYXJnc09ialtmb3JtYWxdID0gdmFsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBvbGRBcmdzID0gdGhpcy5hcmdzO1xuICAgICAgdGhpcy5hcmdzID0gYXJnc09iajtcbiAgICAgIGNvbnN0IGFucyA9IHRoaXNUaGluZy5leGVjdXRlKHRoaXMuX3NlbWFudGljcywgdGhpcyk7XG4gICAgICB0aGlzLmFyZ3MgPSBvbGRBcmdzO1xuICAgICAgcmV0dXJuIGFucztcbiAgICB9XG5cbiAgICBpZiAodHlwZSA9PT0gJ29wZXJhdGlvbicpIHtcbiAgICAgIHRoaXMuV3JhcHBlci5wcm90b3R5cGVbbmFtZV0gPSBkb0l0O1xuICAgICAgdGhpcy5XcmFwcGVyLnByb3RvdHlwZVtuYW1lXS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gJ1snICsgbmFtZSArICcgb3BlcmF0aW9uXSc7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcy5XcmFwcGVyLnByb3RvdHlwZSwgbmFtZSwge1xuICAgICAgICBnZXQ6IGRvSXQsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSwgLy8gU28gdGhlIHByb3BlcnR5IGNhbiBiZSBkZWxldGVkLlxuICAgICAgfSk7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcy5hdHRyaWJ1dGVLZXlzLCBuYW1lLCB7XG4gICAgICAgIHZhbHVlOiB1dGlsLnVuaXF1ZUlkKG5hbWUpLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgZXh0ZW5kT3BlcmF0aW9uT3JBdHRyaWJ1dGUodHlwZSwgbmFtZSwgYWN0aW9uRGljdCkge1xuICAgIGNvbnN0IHR5cGVQbHVyYWwgPSB0eXBlICsgJ3MnO1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoYXQgYG5hbWVgIHJlYWxseSBpcyBqdXN0IGEgbmFtZSwgaS5lLiwgdGhhdCBpdCBkb2Vzbid0IGFsc28gY29udGFpbiBmb3JtYWxzLlxuICAgIHBhcnNlU2lnbmF0dXJlKG5hbWUsICdhdHRyaWJ1dGUnKTtcblxuICAgIGlmICghKHRoaXMuc3VwZXIgJiYgbmFtZSBpbiB0aGlzLnN1cGVyW3R5cGVQbHVyYWxdKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdDYW5ub3QgZXh0ZW5kICcgK1xuICAgICAgICAgIHR5cGUgK1xuICAgICAgICAgIFwiICdcIiArXG4gICAgICAgICAgbmFtZSArXG4gICAgICAgICAgXCInOiBkaWQgbm90IGluaGVyaXQgYW4gXCIgK1xuICAgICAgICAgIHR5cGUgK1xuICAgICAgICAgICcgd2l0aCB0aGF0IG5hbWUnLFxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKGhhc093blByb3BlcnR5KHRoaXNbdHlwZVBsdXJhbF0sIG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBleHRlbmQgJyArIHR5cGUgKyBcIiAnXCIgKyBuYW1lICsgXCInIGFnYWluXCIpO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhIG5ldyBvcGVyYXRpb24gLyBhdHRyaWJ1dGUgd2hvc2UgYWN0aW9uRGljdCBkZWxlZ2F0ZXMgdG8gdGhlIHN1cGVyIG9wZXJhdGlvbiAvXG4gICAgLy8gYXR0cmlidXRlJ3MgYWN0aW9uRGljdCwgYW5kIHdoaWNoIGhhcyBhbGwgdGhlIGtleXMgZnJvbSBgaW5oZXJpdGVkQWN0aW9uRGljdGAuXG4gICAgY29uc3QgaW5oZXJpdGVkRm9ybWFscyA9IHRoaXNbdHlwZVBsdXJhbF1bbmFtZV0uZm9ybWFscztcbiAgICBjb25zdCBpbmhlcml0ZWRBY3Rpb25EaWN0ID0gdGhpc1t0eXBlUGx1cmFsXVtuYW1lXS5hY3Rpb25EaWN0O1xuICAgIGNvbnN0IG5ld0FjdGlvbkRpY3QgPSBPYmplY3QuY3JlYXRlKGluaGVyaXRlZEFjdGlvbkRpY3QpO1xuICAgIE9iamVjdC5rZXlzKGFjdGlvbkRpY3QpLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICBuZXdBY3Rpb25EaWN0W25hbWVdID0gYWN0aW9uRGljdFtuYW1lXTtcbiAgICB9KTtcblxuICAgIHRoaXNbdHlwZVBsdXJhbF1bbmFtZV0gPVxuICAgICAgdHlwZSA9PT0gJ29wZXJhdGlvbicgP1xuICAgICAgICBuZXcgT3BlcmF0aW9uKG5hbWUsIGluaGVyaXRlZEZvcm1hbHMsIG5ld0FjdGlvbkRpY3QpIDpcbiAgICAgICAgbmV3IEF0dHJpYnV0ZShuYW1lLCBuZXdBY3Rpb25EaWN0KTtcblxuICAgIC8vIFRoZSBmb2xsb3dpbmcgY2hlY2sgaXMgbm90IHN0cmljdGx5IG5lY2Vzc2FyeSAoaXQgd2lsbCBoYXBwZW4gbGF0ZXIgYW55d2F5KSBidXQgaXQncyBiZXR0ZXJcbiAgICAvLyB0byBjYXRjaCBlcnJvcnMgZWFybHkuXG4gICAgdGhpc1t0eXBlUGx1cmFsXVtuYW1lXS5jaGVja0FjdGlvbkRpY3QodGhpcy5ncmFtbWFyKTtcbiAgfVxuXG4gIGFzc2VydE5ld05hbWUobmFtZSwgdHlwZSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eShXcmFwcGVyLnByb3RvdHlwZSwgbmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGFkZCAnICsgdHlwZSArIFwiICdcIiArIG5hbWUgKyBcIic6IHRoYXQncyBhIHJlc2VydmVkIG5hbWVcIik7XG4gICAgfVxuICAgIGlmIChuYW1lIGluIHRoaXMub3BlcmF0aW9ucykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdDYW5ub3QgYWRkICcgKyB0eXBlICsgXCIgJ1wiICsgbmFtZSArIFwiJzogYW4gb3BlcmF0aW9uIHdpdGggdGhhdCBuYW1lIGFscmVhZHkgZXhpc3RzXCIsXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAobmFtZSBpbiB0aGlzLmF0dHJpYnV0ZXMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnQ2Fubm90IGFkZCAnICsgdHlwZSArIFwiICdcIiArIG5hbWUgKyBcIic6IGFuIGF0dHJpYnV0ZSB3aXRoIHRoYXQgbmFtZSBhbHJlYWR5IGV4aXN0c1wiLFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvLyBSZXR1cm5zIGEgd3JhcHBlciBmb3IgdGhlIGdpdmVuIENTVCBgbm9kZWAgaW4gdGhpcyBzZW1hbnRpY3MuXG4gIC8vIElmIGBub2RlYCBpcyBhbHJlYWR5IGEgd3JhcHBlciwgcmV0dXJucyBgbm9kZWAgaXRzZWxmLiAgLy8gVE9ETzogd2h5IGlzIHRoaXMgbmVlZGVkP1xuICB3cmFwKG5vZGUsIHNvdXJjZSwgb3B0QmFzZUludGVydmFsKSB7XG4gICAgY29uc3QgYmFzZUludGVydmFsID0gb3B0QmFzZUludGVydmFsIHx8IHNvdXJjZTtcbiAgICByZXR1cm4gbm9kZSBpbnN0YW5jZW9mIHRoaXMuV3JhcHBlciA/IG5vZGUgOiBuZXcgdGhpcy5XcmFwcGVyKG5vZGUsIHNvdXJjZSwgYmFzZUludGVydmFsKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwYXJzZVNpZ25hdHVyZShzaWduYXR1cmUsIHR5cGUpIHtcbiAgaWYgKCFTZW1hbnRpY3MucHJvdG90eXBlR3JhbW1hcikge1xuICAgIC8vIFRoZSBPcGVyYXRpb25zIGFuZCBBdHRyaWJ1dGVzIGdyYW1tYXIgd29uJ3QgYmUgYXZhaWxhYmxlIHdoaWxlIE9obSBpcyBsb2FkaW5nLFxuICAgIC8vIGJ1dCB3ZSBjYW4gZ2V0IGF3YXkgdGhlIGZvbGxvd2luZyBzaW1wbGlmaWNhdGlvbiBiL2Mgbm9uZSBvZiB0aGUgb3BlcmF0aW9uc1xuICAgIC8vIHRoYXQgYXJlIHVzZWQgd2hpbGUgbG9hZGluZyB0YWtlIGFyZ3VtZW50cy5cbiAgICBjb21tb24uYXNzZXJ0KHNpZ25hdHVyZS5pbmRleE9mKCcoJykgPT09IC0xKTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogc2lnbmF0dXJlLFxuICAgICAgZm9ybWFsczogW10sXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IHIgPSBTZW1hbnRpY3MucHJvdG90eXBlR3JhbW1hci5tYXRjaChcbiAgICAgIHNpZ25hdHVyZSxcbiAgICB0eXBlID09PSAnb3BlcmF0aW9uJyA/ICdPcGVyYXRpb25TaWduYXR1cmUnIDogJ0F0dHJpYnV0ZVNpZ25hdHVyZScsXG4gICk7XG4gIGlmIChyLmZhaWxlZCgpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKHIubWVzc2FnZSk7XG4gIH1cblxuICByZXR1cm4gU2VtYW50aWNzLnByb3RvdHlwZUdyYW1tYXJTZW1hbnRpY3MocikucGFyc2UoKTtcbn1cblxuZnVuY3Rpb24gbmV3RGVmYXVsdEFjdGlvbih0eXBlLCBuYW1lLCBkb0l0KSB7XG4gIHJldHVybiBmdW5jdGlvbiguLi5jaGlsZHJlbikge1xuICAgIGNvbnN0IHRoaXNUaGluZyA9IHRoaXMuX3NlbWFudGljcy5vcGVyYXRpb25zW25hbWVdIHx8IHRoaXMuX3NlbWFudGljcy5hdHRyaWJ1dGVzW25hbWVdO1xuICAgIGNvbnN0IGFyZ3MgPSB0aGlzVGhpbmcuZm9ybWFscy5tYXAoZm9ybWFsID0+IHRoaXMuYXJnc1tmb3JtYWxdKTtcblxuICAgIGlmICghdGhpcy5pc0l0ZXJhdGlvbigpICYmIGNoaWxkcmVuLmxlbmd0aCA9PT0gMSkge1xuICAgICAgLy8gVGhpcyBDU1Qgbm9kZSBjb3JyZXNwb25kcyB0byBhIG5vbi10ZXJtaW5hbCBpbiB0aGUgZ3JhbW1hciAoZS5nLiwgQWRkRXhwcikuIFRoZSBmYWN0IHRoYXRcbiAgICAgIC8vIHdlIGdvdCBoZXJlIG1lYW5zIHRoYXQgdGhpcyBhY3Rpb24gZGljdGlvbmFyeSBkb2Vzbid0IGhhdmUgYW4gYWN0aW9uIGZvciB0aGlzIHBhcnRpY3VsYXJcbiAgICAgIC8vIG5vbi10ZXJtaW5hbCBvciBhIGdlbmVyaWMgYF9ub250ZXJtaW5hbGAgYWN0aW9uLlxuICAgICAgLy8gQXMgYSBjb252ZW5pZW5jZSwgaWYgdGhpcyBub2RlIG9ubHkgaGFzIG9uZSBjaGlsZCwgd2UganVzdCByZXR1cm4gdGhlIHJlc3VsdCBvZiBhcHBseWluZ1xuICAgICAgLy8gdGhpcyBvcGVyYXRpb24gLyBhdHRyaWJ1dGUgdG8gdGhlIGNoaWxkIG5vZGUuXG4gICAgICByZXR1cm4gZG9JdC5hcHBseShjaGlsZHJlblswXSwgYXJncyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE90aGVyd2lzZSwgd2UgdGhyb3cgYW4gZXhjZXB0aW9uIHRvIGxldCB0aGUgcHJvZ3JhbW1lciBrbm93IHRoYXQgd2UgZG9uJ3Qga25vdyB3aGF0XG4gICAgICAvLyB0byBkbyB3aXRoIHRoaXMgbm9kZS5cbiAgICAgIHRocm93IGVycm9ycy5taXNzaW5nU2VtYW50aWNBY3Rpb24odGhpcy5jdG9yTmFtZSwgbmFtZSwgdHlwZSwgZ2xvYmFsQWN0aW9uU3RhY2spO1xuICAgIH1cbiAgfTtcbn1cblxuLy8gQ3JlYXRlcyBhIG5ldyBTZW1hbnRpY3MgaW5zdGFuY2UgZm9yIGBncmFtbWFyYCwgaW5oZXJpdGluZyBvcGVyYXRpb25zIGFuZCBhdHRyaWJ1dGVzIGZyb21cbi8vIGBvcHRTdXBlclNlbWFudGljc2AsIGlmIGl0IGlzIHNwZWNpZmllZC4gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgYWN0cyBhcyBhIHByb3h5IGZvciB0aGUgbmV3XG4vLyBTZW1hbnRpY3MgaW5zdGFuY2UuIFdoZW4gdGhhdCBmdW5jdGlvbiBpcyBpbnZva2VkIHdpdGggYSBDU1Qgbm9kZSBhcyBhbiBhcmd1bWVudCwgaXQgcmV0dXJuc1xuLy8gYSB3cmFwcGVyIGZvciB0aGF0IG5vZGUgd2hpY2ggZ2l2ZXMgYWNjZXNzIHRvIHRoZSBvcGVyYXRpb25zIGFuZCBhdHRyaWJ1dGVzIHByb3ZpZGVkIGJ5IHRoaXNcbi8vIHNlbWFudGljcy5cblNlbWFudGljcy5jcmVhdGVTZW1hbnRpY3MgPSBmdW5jdGlvbihncmFtbWFyLCBvcHRTdXBlclNlbWFudGljcykge1xuICBjb25zdCBzID0gbmV3IFNlbWFudGljcyhcbiAgICAgIGdyYW1tYXIsXG4gICAgb3B0U3VwZXJTZW1hbnRpY3MgIT09IHVuZGVmaW5lZCA/XG4gICAgICBvcHRTdXBlclNlbWFudGljcyA6XG4gICAgICBTZW1hbnRpY3MuQnVpbHRJblNlbWFudGljcy5fZ2V0U2VtYW50aWNzKCksXG4gICk7XG5cbiAgLy8gVG8gZW5hYmxlIGNsaWVudHMgdG8gaW52b2tlIGEgc2VtYW50aWNzIGxpa2UgYSBmdW5jdGlvbiwgcmV0dXJuIGEgZnVuY3Rpb24gdGhhdCBhY3RzIGFzIGEgcHJveHlcbiAgLy8gZm9yIGBzYCwgd2hpY2ggaXMgdGhlIHJlYWwgYFNlbWFudGljc2AgaW5zdGFuY2UuXG4gIGNvbnN0IHByb3h5ID0gZnVuY3Rpb24gQVNlbWFudGljcyhtYXRjaFJlc3VsdCkge1xuICAgIGlmICghKG1hdGNoUmVzdWx0IGluc3RhbmNlb2YgTWF0Y2hSZXN1bHQpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICdTZW1hbnRpY3MgZXhwZWN0ZWQgYSBNYXRjaFJlc3VsdCwgYnV0IGdvdCAnICtcbiAgICAgICAgICBjb21tb24udW5leHBlY3RlZE9ialRvU3RyaW5nKG1hdGNoUmVzdWx0KSxcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChtYXRjaFJlc3VsdC5mYWlsZWQoKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignY2Fubm90IGFwcGx5IFNlbWFudGljcyB0byAnICsgbWF0Y2hSZXN1bHQudG9TdHJpbmcoKSk7XG4gICAgfVxuXG4gICAgY29uc3QgY3N0ID0gbWF0Y2hSZXN1bHQuX2NzdDtcbiAgICBpZiAoY3N0LmdyYW1tYXIgIT09IGdyYW1tYXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBcIkNhbm5vdCB1c2UgYSBNYXRjaFJlc3VsdCBmcm9tIGdyYW1tYXIgJ1wiICtcbiAgICAgICAgICBjc3QuZ3JhbW1hci5uYW1lICtcbiAgICAgICAgICBcIicgd2l0aCBhIHNlbWFudGljcyBmb3IgJ1wiICtcbiAgICAgICAgICBncmFtbWFyLm5hbWUgK1xuICAgICAgICAgIFwiJ1wiLFxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3QgaW5wdXRTdHJlYW0gPSBuZXcgSW5wdXRTdHJlYW0obWF0Y2hSZXN1bHQuaW5wdXQpO1xuICAgIHJldHVybiBzLndyYXAoY3N0LCBpbnB1dFN0cmVhbS5pbnRlcnZhbChtYXRjaFJlc3VsdC5fY3N0T2Zmc2V0LCBtYXRjaFJlc3VsdC5pbnB1dC5sZW5ndGgpKTtcbiAgfTtcblxuICAvLyBGb3J3YXJkIHB1YmxpYyBtZXRob2RzIGZyb20gdGhlIHByb3h5IHRvIHRoZSBzZW1hbnRpY3MgaW5zdGFuY2UuXG4gIHByb3h5LmFkZE9wZXJhdGlvbiA9IGZ1bmN0aW9uKHNpZ25hdHVyZSwgYWN0aW9uRGljdCkge1xuICAgIHMuYWRkT3BlcmF0aW9uT3JBdHRyaWJ1dGUoJ29wZXJhdGlvbicsIHNpZ25hdHVyZSwgYWN0aW9uRGljdCk7XG4gICAgcmV0dXJuIHByb3h5O1xuICB9O1xuICBwcm94eS5leHRlbmRPcGVyYXRpb24gPSBmdW5jdGlvbihuYW1lLCBhY3Rpb25EaWN0KSB7XG4gICAgcy5leHRlbmRPcGVyYXRpb25PckF0dHJpYnV0ZSgnb3BlcmF0aW9uJywgbmFtZSwgYWN0aW9uRGljdCk7XG4gICAgcmV0dXJuIHByb3h5O1xuICB9O1xuICBwcm94eS5hZGRBdHRyaWJ1dGUgPSBmdW5jdGlvbihuYW1lLCBhY3Rpb25EaWN0KSB7XG4gICAgcy5hZGRPcGVyYXRpb25PckF0dHJpYnV0ZSgnYXR0cmlidXRlJywgbmFtZSwgYWN0aW9uRGljdCk7XG4gICAgcmV0dXJuIHByb3h5O1xuICB9O1xuICBwcm94eS5leHRlbmRBdHRyaWJ1dGUgPSBmdW5jdGlvbihuYW1lLCBhY3Rpb25EaWN0KSB7XG4gICAgcy5leHRlbmRPcGVyYXRpb25PckF0dHJpYnV0ZSgnYXR0cmlidXRlJywgbmFtZSwgYWN0aW9uRGljdCk7XG4gICAgcmV0dXJuIHByb3h5O1xuICB9O1xuICBwcm94eS5fZ2V0QWN0aW9uRGljdCA9IGZ1bmN0aW9uKG9wZXJhdGlvbk9yQXR0cmlidXRlTmFtZSkge1xuICAgIGNvbnN0IGFjdGlvbiA9XG4gICAgICBzLm9wZXJhdGlvbnNbb3BlcmF0aW9uT3JBdHRyaWJ1dGVOYW1lXSB8fCBzLmF0dHJpYnV0ZXNbb3BlcmF0aW9uT3JBdHRyaWJ1dGVOYW1lXTtcbiAgICBpZiAoIWFjdGlvbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdcIicgK1xuICAgICAgICAgIG9wZXJhdGlvbk9yQXR0cmlidXRlTmFtZSArXG4gICAgICAgICAgJ1wiIGlzIG5vdCBhIHZhbGlkIG9wZXJhdGlvbiBvciBhdHRyaWJ1dGUgJyArXG4gICAgICAgICAgJ25hbWUgaW4gdGhpcyBzZW1hbnRpY3MgZm9yIFwiJyArXG4gICAgICAgICAgZ3JhbW1hci5uYW1lICtcbiAgICAgICAgICAnXCInLFxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIGFjdGlvbi5hY3Rpb25EaWN0O1xuICB9O1xuICBwcm94eS5fcmVtb3ZlID0gZnVuY3Rpb24ob3BlcmF0aW9uT3JBdHRyaWJ1dGVOYW1lKSB7XG4gICAgbGV0IHNlbWFudGljO1xuICAgIGlmIChvcGVyYXRpb25PckF0dHJpYnV0ZU5hbWUgaW4gcy5vcGVyYXRpb25zKSB7XG4gICAgICBzZW1hbnRpYyA9IHMub3BlcmF0aW9uc1tvcGVyYXRpb25PckF0dHJpYnV0ZU5hbWVdO1xuICAgICAgZGVsZXRlIHMub3BlcmF0aW9uc1tvcGVyYXRpb25PckF0dHJpYnV0ZU5hbWVdO1xuICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uT3JBdHRyaWJ1dGVOYW1lIGluIHMuYXR0cmlidXRlcykge1xuICAgICAgc2VtYW50aWMgPSBzLmF0dHJpYnV0ZXNbb3BlcmF0aW9uT3JBdHRyaWJ1dGVOYW1lXTtcbiAgICAgIGRlbGV0ZSBzLmF0dHJpYnV0ZXNbb3BlcmF0aW9uT3JBdHRyaWJ1dGVOYW1lXTtcbiAgICB9XG4gICAgZGVsZXRlIHMuV3JhcHBlci5wcm90b3R5cGVbb3BlcmF0aW9uT3JBdHRyaWJ1dGVOYW1lXTtcbiAgICByZXR1cm4gc2VtYW50aWM7XG4gIH07XG4gIHByb3h5LmdldE9wZXJhdGlvbk5hbWVzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHMub3BlcmF0aW9ucyk7XG4gIH07XG4gIHByb3h5LmdldEF0dHJpYnV0ZU5hbWVzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHMuYXR0cmlidXRlcyk7XG4gIH07XG4gIHByb3h5LmdldEdyYW1tYXIgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gcy5ncmFtbWFyO1xuICB9O1xuICBwcm94eS50b1JlY2lwZSA9IGZ1bmN0aW9uKHNlbWFudGljc09ubHkpIHtcbiAgICByZXR1cm4gcy50b1JlY2lwZShzZW1hbnRpY3NPbmx5KTtcbiAgfTtcblxuICAvLyBNYWtlIHRoZSBwcm94eSdzIHRvU3RyaW5nKCkgd29yay5cbiAgcHJveHkudG9TdHJpbmcgPSBzLnRvU3RyaW5nLmJpbmQocyk7XG5cbiAgLy8gUmV0dXJucyB0aGUgc2VtYW50aWNzIGZvciB0aGUgcHJveHkuXG4gIHByb3h5Ll9nZXRTZW1hbnRpY3MgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gcztcbiAgfTtcblxuICByZXR1cm4gcHJveHk7XG59O1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLSBPcGVyYXRpb24gLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gQW4gT3BlcmF0aW9uIHJlcHJlc2VudHMgYSBmdW5jdGlvbiB0byBiZSBhcHBsaWVkIHRvIGEgY29uY3JldGUgc3ludGF4IHRyZWUgKENTVCkgLS0gaXQncyB2ZXJ5XG4vLyBzaW1pbGFyIHRvIGEgVmlzaXRvciAoaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9WaXNpdG9yX3BhdHRlcm4pLiBBbiBvcGVyYXRpb24gaXMgZXhlY3V0ZWQgYnlcbi8vIHJlY3Vyc2l2ZWx5IHdhbGtpbmcgdGhlIENTVCwgYW5kIGF0IGVhY2ggbm9kZSwgaW52b2tpbmcgdGhlIG1hdGNoaW5nIHNlbWFudGljIGFjdGlvbiBmcm9tXG4vLyBgYWN0aW9uRGljdGAuIFNlZSBgT3BlcmF0aW9uLnByb3RvdHlwZS5leGVjdXRlYCBmb3IgZGV0YWlscyBvZiBob3cgYSBDU1Qgbm9kZSdzIG1hdGNoaW5nIHNlbWFudGljXG4vLyBhY3Rpb24gaXMgZm91bmQuXG5jbGFzcyBPcGVyYXRpb24ge1xuICBjb25zdHJ1Y3RvcihuYW1lLCBmb3JtYWxzLCBhY3Rpb25EaWN0LCBidWlsdEluRGVmYXVsdCkge1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5mb3JtYWxzID0gZm9ybWFscztcbiAgICB0aGlzLmFjdGlvbkRpY3QgPSBhY3Rpb25EaWN0O1xuICAgIHRoaXMuYnVpbHRJbkRlZmF1bHQgPSBidWlsdEluRGVmYXVsdDtcbiAgfVxuXG4gIGNoZWNrQWN0aW9uRGljdChncmFtbWFyKSB7XG4gICAgZ3JhbW1hci5fY2hlY2tUb3BEb3duQWN0aW9uRGljdCh0aGlzLnR5cGVOYW1lLCB0aGlzLm5hbWUsIHRoaXMuYWN0aW9uRGljdCk7XG4gIH1cblxuICAvLyBFeGVjdXRlIHRoaXMgb3BlcmF0aW9uIG9uIHRoZSBDU1Qgbm9kZSBhc3NvY2lhdGVkIHdpdGggYG5vZGVXcmFwcGVyYCBpbiB0aGUgY29udGV4dCBvZiB0aGVcbiAgLy8gZ2l2ZW4gU2VtYW50aWNzIGluc3RhbmNlLlxuICBleGVjdXRlKHNlbWFudGljcywgbm9kZVdyYXBwZXIpIHtcbiAgICB0cnkge1xuICAgICAgLy8gTG9vayBmb3IgYSBzZW1hbnRpYyBhY3Rpb24gd2hvc2UgbmFtZSBtYXRjaGVzIHRoZSBub2RlJ3MgY29uc3RydWN0b3IgbmFtZSwgd2hpY2ggaXMgZWl0aGVyXG4gICAgICAvLyB0aGUgbmFtZSBvZiBhIHJ1bGUgaW4gdGhlIGdyYW1tYXIsIG9yICdfdGVybWluYWwnIChmb3IgYSB0ZXJtaW5hbCBub2RlKSwgb3IgJ19pdGVyJyAoZm9yIGFuXG4gICAgICAvLyBpdGVyYXRpb24gbm9kZSkuXG4gICAgICBjb25zdCB7Y3Rvck5hbWV9ID0gbm9kZVdyYXBwZXIuX25vZGU7XG4gICAgICBsZXQgYWN0aW9uRm4gPSB0aGlzLmFjdGlvbkRpY3RbY3Rvck5hbWVdO1xuICAgICAgaWYgKGFjdGlvbkZuKSB7XG4gICAgICAgIGdsb2JhbEFjdGlvblN0YWNrLnB1c2goW3RoaXMsIGN0b3JOYW1lXSk7XG4gICAgICAgIHJldHVybiBhY3Rpb25Gbi5hcHBseShub2RlV3JhcHBlciwgbm9kZVdyYXBwZXIuX2NoaWxkcmVuKCkpO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgYWN0aW9uIGRpY3Rpb25hcnkgZG9lcyBub3QgY29udGFpbiBhIHNlbWFudGljIGFjdGlvbiBmb3IgdGhpcyBzcGVjaWZpYyB0eXBlIG9mIG5vZGUuXG4gICAgICAvLyBJZiB0aGlzIGlzIGEgbm9udGVybWluYWwgbm9kZSBhbmQgdGhlIHByb2dyYW1tZXIgaGFzIHByb3ZpZGVkIGEgYF9ub250ZXJtaW5hbGAgc2VtYW50aWNcbiAgICAgIC8vIGFjdGlvbiwgd2UgaW52b2tlIGl0OlxuICAgICAgaWYgKG5vZGVXcmFwcGVyLmlzTm9udGVybWluYWwoKSkge1xuICAgICAgICBhY3Rpb25GbiA9IHRoaXMuYWN0aW9uRGljdC5fbm9udGVybWluYWw7XG4gICAgICAgIGlmIChhY3Rpb25Gbikge1xuICAgICAgICAgIGdsb2JhbEFjdGlvblN0YWNrLnB1c2goW3RoaXMsICdfbm9udGVybWluYWwnLCBjdG9yTmFtZV0pO1xuICAgICAgICAgIHJldHVybiBhY3Rpb25Gbi5hcHBseShub2RlV3JhcHBlciwgbm9kZVdyYXBwZXIuX2NoaWxkcmVuKCkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIE90aGVyd2lzZSwgd2UgaW52b2tlIHRoZSAnX2RlZmF1bHQnIHNlbWFudGljIGFjdGlvbi5cbiAgICAgIGdsb2JhbEFjdGlvblN0YWNrLnB1c2goW3RoaXMsICdkZWZhdWx0IGFjdGlvbicsIGN0b3JOYW1lXSk7XG4gICAgICByZXR1cm4gdGhpcy5hY3Rpb25EaWN0Ll9kZWZhdWx0LmFwcGx5KG5vZGVXcmFwcGVyLCBub2RlV3JhcHBlci5fY2hpbGRyZW4oKSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGdsb2JhbEFjdGlvblN0YWNrLnBvcCgpO1xuICAgIH1cbiAgfVxufVxuXG5PcGVyYXRpb24ucHJvdG90eXBlLnR5cGVOYW1lID0gJ29wZXJhdGlvbic7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tIEF0dHJpYnV0ZSAtLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBBdHRyaWJ1dGVzIGFyZSBPcGVyYXRpb25zIHdob3NlIHJlc3VsdHMgYXJlIG1lbW9pemVkLiBUaGlzIG1lYW5zIHRoYXQsIGZvciBhbnkgZ2l2ZW4gc2VtYW50aWNzLFxuLy8gdGhlIHNlbWFudGljIGFjdGlvbiBmb3IgYSBDU1Qgbm9kZSB3aWxsIGJlIGludm9rZWQgbm8gbW9yZSB0aGFuIG9uY2UuXG5jbGFzcyBBdHRyaWJ1dGUgZXh0ZW5kcyBPcGVyYXRpb24ge1xuICBjb25zdHJ1Y3RvcihuYW1lLCBhY3Rpb25EaWN0LCBidWlsdEluRGVmYXVsdCkge1xuICAgIHN1cGVyKG5hbWUsIFtdLCBhY3Rpb25EaWN0LCBidWlsdEluRGVmYXVsdCk7XG4gIH1cblxuICBleGVjdXRlKHNlbWFudGljcywgbm9kZVdyYXBwZXIpIHtcbiAgICBjb25zdCBub2RlID0gbm9kZVdyYXBwZXIuX25vZGU7XG4gICAgY29uc3Qga2V5ID0gc2VtYW50aWNzLmF0dHJpYnV0ZUtleXNbdGhpcy5uYW1lXTtcbiAgICBpZiAoIWhhc093blByb3BlcnR5KG5vZGUsIGtleSkpIHtcbiAgICAgIC8vIFRoZSBmb2xsb3dpbmcgaXMgYSBzdXBlci1zZW5kIC0tIGlzbid0IEpTIGJlYXV0aWZ1bD8gOi9cbiAgICAgIG5vZGVba2V5XSA9IE9wZXJhdGlvbi5wcm90b3R5cGUuZXhlY3V0ZS5jYWxsKHRoaXMsIHNlbWFudGljcywgbm9kZVdyYXBwZXIpO1xuICAgIH1cbiAgICByZXR1cm4gbm9kZVtrZXldO1xuICB9XG59XG5cbkF0dHJpYnV0ZS5wcm90b3R5cGUudHlwZU5hbWUgPSAnYXR0cmlidXRlJztcbiIsImltcG9ydCB7TWF0Y2hlcn0gZnJvbSAnLi9NYXRjaGVyLmpzJztcbmltcG9ydCB7U2VtYW50aWNzfSBmcm9tICcuL1NlbWFudGljcy5qcyc7XG5pbXBvcnQgKiBhcyBjb21tb24gZnJvbSAnLi9jb21tb24uanMnO1xuaW1wb3J0ICogYXMgZXJyb3JzIGZyb20gJy4vZXJyb3JzLmpzJztcbmltcG9ydCAqIGFzIHBleHBycyBmcm9tICcuL3BleHBycy5qcyc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBQcml2YXRlIHN0dWZmXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5jb25zdCBTUEVDSUFMX0FDVElPTl9OQU1FUyA9IFsnX2l0ZXInLCAnX3Rlcm1pbmFsJywgJ19ub250ZXJtaW5hbCcsICdfZGVmYXVsdCddO1xuXG5mdW5jdGlvbiBnZXRTb3J0ZWRSdWxlVmFsdWVzKGdyYW1tYXIpIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKGdyYW1tYXIucnVsZXMpXG4gICAgICAuc29ydCgpXG4gICAgICAubWFwKG5hbWUgPT4gZ3JhbW1hci5ydWxlc1tuYW1lXSk7XG59XG5cbi8vIFVudGlsIEVTMjAxOSwgSlNPTiB3YXMgbm90IGEgdmFsaWQgc3Vic2V0IG9mIEphdmFTY3JpcHQgYmVjYXVzZSBVKzIwMjggKGxpbmUgc2VwYXJhdG9yKVxuLy8gYW5kIFUrMjAyOSAocGFyYWdyYXBoIHNlcGFyYXRvcikgYXJlIGFsbG93ZWQgaW4gSlNPTiBzdHJpbmcgbGl0ZXJhbHMsIGJ1dCBub3QgaW4gSlMuXG4vLyBUaGlzIGZ1bmN0aW9uIHByb3Blcmx5IGVuY29kZXMgdGhvc2UgdHdvIGNoYXJhY3RlcnMgc28gdGhhdCB0aGUgcmVzdWx0aW5nIHN0cmluZyBpc1xuLy8gcmVwcmVzZW50cyBib3RoIHZhbGlkIEpTT04sIGFuZCB2YWxpZCBKYXZhU2NyaXB0IChmb3IgRVMyMDE4IGFuZCBiZWxvdykuXG4vLyBTZWUgaHR0cHM6Ly92OC5kZXYvZmVhdHVyZXMvc3Vic3VtZS1qc29uIGZvciBtb3JlIGRldGFpbHMuXG5jb25zdCBqc29uVG9KUyA9IHN0ciA9PiBzdHIucmVwbGFjZSgvXFx1MjAyOC9nLCAnXFxcXHUyMDI4JykucmVwbGFjZSgvXFx1MjAyOS9nLCAnXFxcXHUyMDI5Jyk7XG5cbmxldCBvaG1HcmFtbWFyO1xubGV0IGJ1aWxkR3JhbW1hcjtcblxuZXhwb3J0IGNsYXNzIEdyYW1tYXIge1xuICBjb25zdHJ1Y3RvcihuYW1lLCBzdXBlckdyYW1tYXIsIHJ1bGVzLCBvcHREZWZhdWx0U3RhcnRSdWxlKSB7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLnN1cGVyR3JhbW1hciA9IHN1cGVyR3JhbW1hcjtcbiAgICB0aGlzLnJ1bGVzID0gcnVsZXM7XG4gICAgaWYgKG9wdERlZmF1bHRTdGFydFJ1bGUpIHtcbiAgICAgIGlmICghKG9wdERlZmF1bHRTdGFydFJ1bGUgaW4gcnVsZXMpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIFwiSW52YWxpZCBzdGFydCBydWxlOiAnXCIgK1xuICAgICAgICAgICAgb3B0RGVmYXVsdFN0YXJ0UnVsZSArXG4gICAgICAgICAgICBcIicgaXMgbm90IGEgcnVsZSBpbiBncmFtbWFyICdcIiArXG4gICAgICAgICAgICBuYW1lICtcbiAgICAgICAgICAgIFwiJ1wiLFxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgdGhpcy5kZWZhdWx0U3RhcnRSdWxlID0gb3B0RGVmYXVsdFN0YXJ0UnVsZTtcbiAgICB9XG4gICAgdGhpcy5fbWF0Y2hTdGF0ZUluaXRpYWxpemVyID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuc3VwcG9ydHNJbmNyZW1lbnRhbFBhcnNpbmcgPSB0cnVlO1xuICB9XG5cbiAgbWF0Y2hlcigpIHtcbiAgICByZXR1cm4gbmV3IE1hdGNoZXIodGhpcyk7XG4gIH1cblxuICAvLyBSZXR1cm4gdHJ1ZSBpZiB0aGUgZ3JhbW1hciBpcyBhIGJ1aWx0LWluIGdyYW1tYXIsIG90aGVyd2lzZSBmYWxzZS5cbiAgLy8gTk9URTogVGhpcyBtaWdodCBnaXZlIGFuIHVuZXhwZWN0ZWQgcmVzdWx0IGlmIGNhbGxlZCBiZWZvcmUgQnVpbHRJblJ1bGVzIGlzIGRlZmluZWQhXG4gIGlzQnVpbHRJbigpIHtcbiAgICByZXR1cm4gdGhpcyA9PT0gR3JhbW1hci5Qcm90b0J1aWx0SW5SdWxlcyB8fCB0aGlzID09PSBHcmFtbWFyLkJ1aWx0SW5SdWxlcztcbiAgfVxuXG4gIGVxdWFscyhnKSB7XG4gICAgaWYgKHRoaXMgPT09IGcpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvLyBEbyB0aGUgY2hlYXBlc3QgY29tcGFyaXNvbnMgZmlyc3QuXG4gICAgaWYgKFxuICAgICAgZyA9PSBudWxsIHx8XG4gICAgICB0aGlzLm5hbWUgIT09IGcubmFtZSB8fFxuICAgICAgdGhpcy5kZWZhdWx0U3RhcnRSdWxlICE9PSBnLmRlZmF1bHRTdGFydFJ1bGUgfHxcbiAgICAgICEodGhpcy5zdXBlckdyYW1tYXIgPT09IGcuc3VwZXJHcmFtbWFyIHx8IHRoaXMuc3VwZXJHcmFtbWFyLmVxdWFscyhnLnN1cGVyR3JhbW1hcikpXG4gICAgKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IG15UnVsZXMgPSBnZXRTb3J0ZWRSdWxlVmFsdWVzKHRoaXMpO1xuICAgIGNvbnN0IG90aGVyUnVsZXMgPSBnZXRTb3J0ZWRSdWxlVmFsdWVzKGcpO1xuICAgIHJldHVybiAoXG4gICAgICBteVJ1bGVzLmxlbmd0aCA9PT0gb3RoZXJSdWxlcy5sZW5ndGggJiZcbiAgICAgIG15UnVsZXMuZXZlcnkoKHJ1bGUsIGkpID0+IHtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICBydWxlLmRlc2NyaXB0aW9uID09PSBvdGhlclJ1bGVzW2ldLmRlc2NyaXB0aW9uICYmXG4gICAgICAgICAgcnVsZS5mb3JtYWxzLmpvaW4oJywnKSA9PT0gb3RoZXJSdWxlc1tpXS5mb3JtYWxzLmpvaW4oJywnKSAmJlxuICAgICAgICAgIHJ1bGUuYm9keS50b1N0cmluZygpID09PSBvdGhlclJ1bGVzW2ldLmJvZHkudG9TdHJpbmcoKVxuICAgICAgICApO1xuICAgICAgfSlcbiAgICApO1xuICB9XG5cbiAgbWF0Y2goaW5wdXQsIG9wdFN0YXJ0QXBwbGljYXRpb24pIHtcbiAgICBjb25zdCBtID0gdGhpcy5tYXRjaGVyKCk7XG4gICAgbS5yZXBsYWNlSW5wdXRSYW5nZSgwLCAwLCBpbnB1dCk7XG4gICAgcmV0dXJuIG0ubWF0Y2gob3B0U3RhcnRBcHBsaWNhdGlvbik7XG4gIH1cblxuICB0cmFjZShpbnB1dCwgb3B0U3RhcnRBcHBsaWNhdGlvbikge1xuICAgIGNvbnN0IG0gPSB0aGlzLm1hdGNoZXIoKTtcbiAgICBtLnJlcGxhY2VJbnB1dFJhbmdlKDAsIDAsIGlucHV0KTtcbiAgICByZXR1cm4gbS50cmFjZShvcHRTdGFydEFwcGxpY2F0aW9uKTtcbiAgfVxuXG4gIGNyZWF0ZVNlbWFudGljcygpIHtcbiAgICByZXR1cm4gU2VtYW50aWNzLmNyZWF0ZVNlbWFudGljcyh0aGlzKTtcbiAgfVxuXG4gIGV4dGVuZFNlbWFudGljcyhzdXBlclNlbWFudGljcykge1xuICAgIHJldHVybiBTZW1hbnRpY3MuY3JlYXRlU2VtYW50aWNzKHRoaXMsIHN1cGVyU2VtYW50aWNzLl9nZXRTZW1hbnRpY3MoKSk7XG4gIH1cblxuICAvLyBDaGVjayB0aGF0IGV2ZXJ5IGtleSBpbiBgYWN0aW9uRGljdGAgY29ycmVzcG9uZHMgdG8gYSBzZW1hbnRpYyBhY3Rpb24sIGFuZCB0aGF0IGl0IG1hcHMgdG9cbiAgLy8gYSBmdW5jdGlvbiBvZiB0aGUgY29ycmVjdCBhcml0eS4gSWYgbm90LCB0aHJvdyBhbiBleGNlcHRpb24uXG4gIF9jaGVja1RvcERvd25BY3Rpb25EaWN0KHdoYXQsIG5hbWUsIGFjdGlvbkRpY3QpIHtcbiAgICBjb25zdCBwcm9ibGVtcyA9IFtdO1xuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGd1YXJkLWZvci1pblxuICAgIGZvciAoY29uc3QgayBpbiBhY3Rpb25EaWN0KSB7XG4gICAgICBjb25zdCB2ID0gYWN0aW9uRGljdFtrXTtcbiAgICAgIGNvbnN0IGlzU3BlY2lhbEFjdGlvbiA9IFNQRUNJQUxfQUNUSU9OX05BTUVTLmluY2x1ZGVzKGspO1xuXG4gICAgICBpZiAoIWlzU3BlY2lhbEFjdGlvbiAmJiAhKGsgaW4gdGhpcy5ydWxlcykpIHtcbiAgICAgICAgcHJvYmxlbXMucHVzaChgJyR7a30nIGlzIG5vdCBhIHZhbGlkIHNlbWFudGljIGFjdGlvbiBmb3IgJyR7dGhpcy5uYW1lfSdgKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHYgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcHJvYmxlbXMucHVzaChgJyR7a30nIG11c3QgYmUgYSBmdW5jdGlvbiBpbiBhbiBhY3Rpb24gZGljdGlvbmFyeSBmb3IgJyR7dGhpcy5uYW1lfSdgKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBhY3R1YWwgPSB2Lmxlbmd0aDtcbiAgICAgIGNvbnN0IGV4cGVjdGVkID0gdGhpcy5fdG9wRG93bkFjdGlvbkFyaXR5KGspO1xuICAgICAgaWYgKGFjdHVhbCAhPT0gZXhwZWN0ZWQpIHtcbiAgICAgICAgbGV0IGRldGFpbHM7XG4gICAgICAgIGlmIChrID09PSAnX2l0ZXInIHx8IGsgPT09ICdfbm9udGVybWluYWwnKSB7XG4gICAgICAgICAgZGV0YWlscyA9XG4gICAgICAgICAgICBgaXQgc2hvdWxkIHVzZSBhIHJlc3QgcGFyYW1ldGVyLCBlLmcuIFxcYCR7a30oLi4uY2hpbGRyZW4pIHt9XFxgLiBgICtcbiAgICAgICAgICAgICdOT1RFOiB0aGlzIGlzIG5ldyBpbiBPaG0gdjE2IOKAlCBzZWUgaHR0cHM6Ly9vaG1qcy5vcmcvZC9hdGkgZm9yIGRldGFpbHMuJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZXRhaWxzID0gYGV4cGVjdGVkICR7ZXhwZWN0ZWR9LCBnb3QgJHthY3R1YWx9YDtcbiAgICAgICAgfVxuICAgICAgICBwcm9ibGVtcy5wdXNoKGBTZW1hbnRpYyBhY3Rpb24gJyR7a30nIGhhcyB0aGUgd3JvbmcgYXJpdHk6ICR7ZGV0YWlsc31gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHByb2JsZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHByZXR0eVByb2JsZW1zID0gcHJvYmxlbXMubWFwKHByb2JsZW0gPT4gJy0gJyArIHByb2JsZW0pO1xuICAgICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoXG4gICAgICAgICAgW1xuICAgICAgICAgICAgYEZvdW5kIGVycm9ycyBpbiB0aGUgYWN0aW9uIGRpY3Rpb25hcnkgb2YgdGhlICcke25hbWV9JyAke3doYXR9OmAsXG4gICAgICAgICAgICAuLi5wcmV0dHlQcm9ibGVtcyxcbiAgICAgICAgICBdLmpvaW4oJ1xcbicpLFxuICAgICAgKTtcbiAgICAgIGVycm9yLnByb2JsZW1zID0gcHJvYmxlbXM7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICAvLyBSZXR1cm4gdGhlIGV4cGVjdGVkIGFyaXR5IGZvciBhIHNlbWFudGljIGFjdGlvbiBuYW1lZCBgYWN0aW9uTmFtZWAsIHdoaWNoXG4gIC8vIGlzIGVpdGhlciBhIHJ1bGUgbmFtZSBvciBhIHNwZWNpYWwgYWN0aW9uIG5hbWUgbGlrZSAnX25vbnRlcm1pbmFsJy5cbiAgX3RvcERvd25BY3Rpb25Bcml0eShhY3Rpb25OYW1lKSB7XG4gICAgLy8gQWxsIHNwZWNpYWwgYWN0aW9ucyBoYXZlIGFuIGV4cGVjdGVkIGFyaXR5IG9mIDAsIHRob3VnaCBhbGwgYnV0IF90ZXJtaW5hbFxuICAgIC8vIGFyZSBleHBlY3RlZCB0byB1c2UgdGhlIHJlc3QgcGFyYW1ldGVyIHN5bnRheCAoZS5nLiBgX2l0ZXIoLi4uY2hpbGRyZW4pYCkuXG4gICAgLy8gVGhpcyBpcyBjb25zaWRlcmVkIHRvIGhhdmUgYXJpdHkgMCwgaS5lLiBgKCguLi5hcmdzKSA9PiB7fSkubGVuZ3RoYCBpcyAwLlxuICAgIHJldHVybiBTUEVDSUFMX0FDVElPTl9OQU1FUy5pbmNsdWRlcyhhY3Rpb25OYW1lKSA/XG4gICAgICAwIDpcbiAgICAgIHRoaXMucnVsZXNbYWN0aW9uTmFtZV0uYm9keS5nZXRBcml0eSgpO1xuICB9XG5cbiAgX2luaGVyaXRzRnJvbShncmFtbWFyKSB7XG4gICAgbGV0IGcgPSB0aGlzLnN1cGVyR3JhbW1hcjtcbiAgICB3aGlsZSAoZykge1xuICAgICAgaWYgKGcuZXF1YWxzKGdyYW1tYXIsIHRydWUpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgZyA9IGcuc3VwZXJHcmFtbWFyO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICB0b1JlY2lwZShzdXBlckdyYW1tYXJFeHByID0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgbWV0YUluZm8gPSB7fTtcbiAgICAvLyBJbmNsdWRlIHRoZSBncmFtbWFyIHNvdXJjZSBpZiBpdCBpcyBhdmFpbGFibGUuXG4gICAgaWYgKHRoaXMuc291cmNlKSB7XG4gICAgICBtZXRhSW5mby5zb3VyY2UgPSB0aGlzLnNvdXJjZS5jb250ZW50cztcbiAgICB9XG5cbiAgICBsZXQgc3RhcnRSdWxlID0gbnVsbDtcbiAgICBpZiAodGhpcy5kZWZhdWx0U3RhcnRSdWxlKSB7XG4gICAgICBzdGFydFJ1bGUgPSB0aGlzLmRlZmF1bHRTdGFydFJ1bGU7XG4gICAgfVxuXG4gICAgY29uc3QgcnVsZXMgPSB7fTtcbiAgICBPYmplY3Qua2V5cyh0aGlzLnJ1bGVzKS5mb3JFYWNoKHJ1bGVOYW1lID0+IHtcbiAgICAgIGNvbnN0IHJ1bGVJbmZvID0gdGhpcy5ydWxlc1tydWxlTmFtZV07XG4gICAgICBjb25zdCB7Ym9keX0gPSBydWxlSW5mbztcbiAgICAgIGNvbnN0IGlzRGVmaW5pdGlvbiA9ICF0aGlzLnN1cGVyR3JhbW1hciB8fCAhdGhpcy5zdXBlckdyYW1tYXIucnVsZXNbcnVsZU5hbWVdO1xuXG4gICAgICBsZXQgb3BlcmF0aW9uO1xuICAgICAgaWYgKGlzRGVmaW5pdGlvbikge1xuICAgICAgICBvcGVyYXRpb24gPSAnZGVmaW5lJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9wZXJhdGlvbiA9IGJvZHkgaW5zdGFuY2VvZiBwZXhwcnMuRXh0ZW5kID8gJ2V4dGVuZCcgOiAnb3ZlcnJpZGUnO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtZXRhSW5mbyA9IHt9O1xuICAgICAgaWYgKHJ1bGVJbmZvLnNvdXJjZSAmJiB0aGlzLnNvdXJjZSkge1xuICAgICAgICBjb25zdCBhZGp1c3RlZCA9IHJ1bGVJbmZvLnNvdXJjZS5yZWxhdGl2ZVRvKHRoaXMuc291cmNlKTtcbiAgICAgICAgbWV0YUluZm8uc291cmNlSW50ZXJ2YWwgPSBbYWRqdXN0ZWQuc3RhcnRJZHgsIGFkanVzdGVkLmVuZElkeF07XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gaXNEZWZpbml0aW9uID8gcnVsZUluZm8uZGVzY3JpcHRpb24gOiBudWxsO1xuICAgICAgY29uc3QgYm9keVJlY2lwZSA9IGJvZHkub3V0cHV0UmVjaXBlKHJ1bGVJbmZvLmZvcm1hbHMsIHRoaXMuc291cmNlKTtcblxuICAgICAgcnVsZXNbcnVsZU5hbWVdID0gW1xuICAgICAgICBvcGVyYXRpb24sIC8vIFwiZGVmaW5lXCIvXCJleHRlbmRcIi9cIm92ZXJyaWRlXCJcbiAgICAgICAgbWV0YUluZm8sXG4gICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICBydWxlSW5mby5mb3JtYWxzLFxuICAgICAgICBib2R5UmVjaXBlLFxuICAgICAgXTtcbiAgICB9KTtcblxuICAgIC8vIElmIHRoZSBjYWxsZXIgcHJvdmlkZWQgYW4gZXhwcmVzc2lvbiB0byB1c2UgZm9yIHRoZSBzdXBlcmdyYW1tYXIsIHVzZSB0aGF0LlxuICAgIC8vIE90aGVyd2lzZSwgaWYgdGhlIHN1cGVyZ3JhbW1hciBpcyBhIHVzZXIgZ3JhbW1hciwgdXNlIGl0cyByZWNpcGUgaW5saW5lLlxuICAgIGxldCBzdXBlckdyYW1tYXJPdXRwdXQgPSAnbnVsbCc7XG4gICAgaWYgKHN1cGVyR3JhbW1hckV4cHIpIHtcbiAgICAgIHN1cGVyR3JhbW1hck91dHB1dCA9IHN1cGVyR3JhbW1hckV4cHI7XG4gICAgfSBlbHNlIGlmICh0aGlzLnN1cGVyR3JhbW1hciAmJiAhdGhpcy5zdXBlckdyYW1tYXIuaXNCdWlsdEluKCkpIHtcbiAgICAgIHN1cGVyR3JhbW1hck91dHB1dCA9IHRoaXMuc3VwZXJHcmFtbWFyLnRvUmVjaXBlKCk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVjaXBlRWxlbWVudHMgPSBbXG4gICAgICAuLi5bJ2dyYW1tYXInLCBtZXRhSW5mbywgdGhpcy5uYW1lXS5tYXAoSlNPTi5zdHJpbmdpZnkpLFxuICAgICAgc3VwZXJHcmFtbWFyT3V0cHV0LFxuICAgICAgLi4uW3N0YXJ0UnVsZSwgcnVsZXNdLm1hcChKU09OLnN0cmluZ2lmeSksXG4gICAgXTtcbiAgICByZXR1cm4ganNvblRvSlMoYFske3JlY2lwZUVsZW1lbnRzLmpvaW4oJywnKX1dYCk7XG4gIH1cblxuICAvLyBUT0RPOiBDb21lIHVwIHdpdGggYmV0dGVyIG5hbWVzIGZvciB0aGVzZSBtZXRob2RzLlxuICAvLyBUT0RPOiBXcml0ZSB0aGUgYW5hbG9nIG9mIHRoZXNlIG1ldGhvZHMgZm9yIGluaGVyaXRlZCBhdHRyaWJ1dGVzLlxuICB0b09wZXJhdGlvbkFjdGlvbkRpY3Rpb25hcnlUZW1wbGF0ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fdG9PcGVyYXRpb25PckF0dHJpYnV0ZUFjdGlvbkRpY3Rpb25hcnlUZW1wbGF0ZSgpO1xuICB9XG4gIHRvQXR0cmlidXRlQWN0aW9uRGljdGlvbmFyeVRlbXBsYXRlKCkge1xuICAgIHJldHVybiB0aGlzLl90b09wZXJhdGlvbk9yQXR0cmlidXRlQWN0aW9uRGljdGlvbmFyeVRlbXBsYXRlKCk7XG4gIH1cblxuICBfdG9PcGVyYXRpb25PckF0dHJpYnV0ZUFjdGlvbkRpY3Rpb25hcnlUZW1wbGF0ZSgpIHtcbiAgICAvLyBUT0RPOiBhZGQgdGhlIHN1cGVyLWdyYW1tYXIncyB0ZW1wbGF0ZXMgYXQgdGhlIHJpZ2h0IHBsYWNlLCBlLmcuLCBhIGNhc2UgZm9yIEFkZEV4cHJfcGx1c1xuICAgIC8vIHNob3VsZCBhcHBlYXIgbmV4dCB0byBvdGhlciBjYXNlcyBvZiBBZGRFeHByLlxuXG4gICAgY29uc3Qgc2IgPSBuZXcgY29tbW9uLlN0cmluZ0J1ZmZlcigpO1xuICAgIHNiLmFwcGVuZCgneycpO1xuXG4gICAgbGV0IGZpcnN0ID0gdHJ1ZTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZ3VhcmQtZm9yLWluXG4gICAgZm9yIChjb25zdCBydWxlTmFtZSBpbiB0aGlzLnJ1bGVzKSB7XG4gICAgICBjb25zdCB7Ym9keX0gPSB0aGlzLnJ1bGVzW3J1bGVOYW1lXTtcbiAgICAgIGlmIChmaXJzdCkge1xuICAgICAgICBmaXJzdCA9IGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2IuYXBwZW5kKCcsJyk7XG4gICAgICB9XG4gICAgICBzYi5hcHBlbmQoJ1xcbicpO1xuICAgICAgc2IuYXBwZW5kKCcgICcpO1xuICAgICAgdGhpcy5hZGRTZW1hbnRpY0FjdGlvblRlbXBsYXRlKHJ1bGVOYW1lLCBib2R5LCBzYik7XG4gICAgfVxuXG4gICAgc2IuYXBwZW5kKCdcXG59Jyk7XG4gICAgcmV0dXJuIHNiLmNvbnRlbnRzKCk7XG4gIH1cblxuICBhZGRTZW1hbnRpY0FjdGlvblRlbXBsYXRlKHJ1bGVOYW1lLCBib2R5LCBzYikge1xuICAgIHNiLmFwcGVuZChydWxlTmFtZSk7XG4gICAgc2IuYXBwZW5kKCc6IGZ1bmN0aW9uKCcpO1xuICAgIGNvbnN0IGFyaXR5ID0gdGhpcy5fdG9wRG93bkFjdGlvbkFyaXR5KHJ1bGVOYW1lKTtcbiAgICBzYi5hcHBlbmQoY29tbW9uLnJlcGVhdCgnXycsIGFyaXR5KS5qb2luKCcsICcpKTtcbiAgICBzYi5hcHBlbmQoJykge1xcbicpO1xuICAgIHNiLmFwcGVuZCgnICB9Jyk7XG4gIH1cblxuICAvLyBQYXJzZSBhIHN0cmluZyB3aGljaCBleHByZXNzZXMgYSBydWxlIGFwcGxpY2F0aW9uIGluIHRoaXMgZ3JhbW1hciwgYW5kIHJldHVybiB0aGVcbiAgLy8gcmVzdWx0aW5nIEFwcGx5IG5vZGUuXG4gIHBhcnNlQXBwbGljYXRpb24oc3RyKSB7XG4gICAgbGV0IGFwcDtcbiAgICBpZiAoc3RyLmluZGV4T2YoJzwnKSA9PT0gLTEpIHtcbiAgICAgIC8vIHNpbXBsZSBhcHBsaWNhdGlvblxuICAgICAgYXBwID0gbmV3IHBleHBycy5BcHBseShzdHIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBwYXJhbWV0ZXJpemVkIGFwcGxpY2F0aW9uXG4gICAgICBjb25zdCBjc3QgPSBvaG1HcmFtbWFyLm1hdGNoKHN0ciwgJ0Jhc2VfYXBwbGljYXRpb24nKTtcbiAgICAgIGFwcCA9IGJ1aWxkR3JhbW1hcihjc3QsIHt9KTtcbiAgICB9XG5cbiAgICAvLyBFbnN1cmUgdGhhdCB0aGUgYXBwbGljYXRpb24gaXMgdmFsaWQuXG4gICAgaWYgKCEoYXBwLnJ1bGVOYW1lIGluIHRoaXMucnVsZXMpKSB7XG4gICAgICB0aHJvdyBlcnJvcnMudW5kZWNsYXJlZFJ1bGUoYXBwLnJ1bGVOYW1lLCB0aGlzLm5hbWUpO1xuICAgIH1cbiAgICBjb25zdCB7Zm9ybWFsc30gPSB0aGlzLnJ1bGVzW2FwcC5ydWxlTmFtZV07XG4gICAgaWYgKGZvcm1hbHMubGVuZ3RoICE9PSBhcHAuYXJncy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IHtzb3VyY2V9ID0gdGhpcy5ydWxlc1thcHAucnVsZU5hbWVdO1xuICAgICAgdGhyb3cgZXJyb3JzLndyb25nTnVtYmVyT2ZQYXJhbWV0ZXJzKFxuICAgICAgICAgIGFwcC5ydWxlTmFtZSxcbiAgICAgICAgICBmb3JtYWxzLmxlbmd0aCxcbiAgICAgICAgICBhcHAuYXJncy5sZW5ndGgsXG4gICAgICAgICAgc291cmNlLFxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIGFwcDtcbiAgfVxuXG4gIF9zZXRVcE1hdGNoU3RhdGUoc3RhdGUpIHtcbiAgICBpZiAodGhpcy5fbWF0Y2hTdGF0ZUluaXRpYWxpemVyKSB7XG4gICAgICB0aGlzLl9tYXRjaFN0YXRlSW5pdGlhbGl6ZXIoc3RhdGUpO1xuICAgIH1cbiAgfVxufVxuXG4vLyBUaGUgZm9sbG93aW5nIGdyYW1tYXIgY29udGFpbnMgYSBmZXcgcnVsZXMgdGhhdCBjb3VsZG4ndCBiZSB3cml0dGVuICBpbiBcInVzZXJsYW5kXCIuXG4vLyBBdCB0aGUgYm90dG9tIG9mIHNyYy9tYWluLmpzLCB3ZSBjcmVhdGUgYSBzdWItZ3JhbW1hciBvZiB0aGlzIGdyYW1tYXIgdGhhdCdzIGNhbGxlZFxuLy8gYEJ1aWx0SW5SdWxlc2AuIFRoYXQgZ3JhbW1hciBjb250YWlucyBzZXZlcmFsIGNvbnZlbmllbmNlIHJ1bGVzLCBlLmcuLCBgbGV0dGVyYCBhbmRcbi8vIGBkaWdpdGAsIGFuZCBpcyBpbXBsaWNpdGx5IHRoZSBzdXBlci1ncmFtbWFyIG9mIGFueSBncmFtbWFyIHdob3NlIHN1cGVyLWdyYW1tYXJcbi8vIGlzbid0IHNwZWNpZmllZC5cbkdyYW1tYXIuUHJvdG9CdWlsdEluUnVsZXMgPSBuZXcgR3JhbW1hcihcbiAgICAnUHJvdG9CdWlsdEluUnVsZXMnLCAvLyBuYW1lXG4gICAgdW5kZWZpbmVkLCAvLyBzdXBlcmdyYW1tYXJcbiAgICB7XG4gICAgICBhbnk6IHtcbiAgICAgICAgYm9keTogcGV4cHJzLmFueSxcbiAgICAgICAgZm9ybWFsczogW10sXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnYW55IGNoYXJhY3RlcicsXG4gICAgICAgIHByaW1pdGl2ZTogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBlbmQ6IHtcbiAgICAgICAgYm9keTogcGV4cHJzLmVuZCxcbiAgICAgICAgZm9ybWFsczogW10sXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnZW5kIG9mIGlucHV0JyxcbiAgICAgICAgcHJpbWl0aXZlOiB0cnVlLFxuICAgICAgfSxcblxuICAgICAgY2FzZUluc2Vuc2l0aXZlOiB7XG4gICAgICAgIGJvZHk6IG5ldyBwZXhwcnMuQ2FzZUluc2Vuc2l0aXZlVGVybWluYWwobmV3IHBleHBycy5QYXJhbSgwKSksXG4gICAgICAgIGZvcm1hbHM6IFsnc3RyJ10sXG4gICAgICAgIHByaW1pdGl2ZTogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBsb3dlcjoge1xuICAgICAgICBib2R5OiBuZXcgcGV4cHJzLlVuaWNvZGVDaGFyKCdMbCcpLFxuICAgICAgICBmb3JtYWxzOiBbXSxcbiAgICAgICAgZGVzY3JpcHRpb246ICdhIGxvd2VyY2FzZSBsZXR0ZXInLFxuICAgICAgICBwcmltaXRpdmU6IHRydWUsXG4gICAgICB9LFxuICAgICAgdXBwZXI6IHtcbiAgICAgICAgYm9keTogbmV3IHBleHBycy5Vbmljb2RlQ2hhcignTHUnKSxcbiAgICAgICAgZm9ybWFsczogW10sXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnYW4gdXBwZXJjYXNlIGxldHRlcicsXG4gICAgICAgIHByaW1pdGl2ZTogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICAvLyBVbmlvbiBvZiBMdCAodGl0bGVjYXNlKSwgTG0gKG1vZGlmaWVyKSwgYW5kIExvIChvdGhlciksIGkuZS4gYW55IGxldHRlciBub3QgaW4gTGwgb3IgTHUuXG4gICAgICB1bmljb2RlTHRtbzoge1xuICAgICAgICBib2R5OiBuZXcgcGV4cHJzLlVuaWNvZGVDaGFyKCdMdG1vJyksXG4gICAgICAgIGZvcm1hbHM6IFtdLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ2EgVW5pY29kZSBjaGFyYWN0ZXIgaW4gTHQsIExtLCBvciBMbycsXG4gICAgICAgIHByaW1pdGl2ZTogdHJ1ZSxcbiAgICAgIH0sXG5cbiAgICAgIC8vIFRoZXNlIHJ1bGVzIGFyZSBub3QgdHJ1bHkgcHJpbWl0aXZlICh0aGV5IGNvdWxkIGJlIHdyaXR0ZW4gaW4gdXNlcmxhbmQpIGJ1dCBhcmUgZGVmaW5lZFxuICAgICAgLy8gaGVyZSBmb3IgYm9vdHN0cmFwcGluZyBwdXJwb3Nlcy5cbiAgICAgIHNwYWNlczoge1xuICAgICAgICBib2R5OiBuZXcgcGV4cHJzLlN0YXIobmV3IHBleHBycy5BcHBseSgnc3BhY2UnKSksXG4gICAgICAgIGZvcm1hbHM6IFtdLFxuICAgICAgfSxcbiAgICAgIHNwYWNlOiB7XG4gICAgICAgIGJvZHk6IG5ldyBwZXhwcnMuUmFuZ2UoJ1xceDAwJywgJyAnKSxcbiAgICAgICAgZm9ybWFsczogW10sXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnYSBzcGFjZScsXG4gICAgICB9LFxuICAgIH0sXG4pO1xuXG4vLyBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgZnJvbSBtYWluLmpzIG9uY2UgT2htIGhhcyBsb2FkZWQuXG5HcmFtbWFyLmluaXRBcHBsaWNhdGlvblBhcnNlciA9IGZ1bmN0aW9uKGdyYW1tYXIsIGJ1aWxkZXJGbikge1xuICBvaG1HcmFtbWFyID0gZ3JhbW1hcjtcbiAgYnVpbGRHcmFtbWFyID0gYnVpbGRlckZuO1xufTtcbiIsImltcG9ydCB7R3JhbW1hcn0gZnJvbSAnLi9HcmFtbWFyLmpzJztcbmltcG9ydCB7SW5wdXRTdHJlYW19IGZyb20gJy4vSW5wdXRTdHJlYW0uanMnO1xuaW1wb3J0IHtnZXREdXBsaWNhdGVzfSBmcm9tICcuL2NvbW1vbi5qcyc7XG5pbXBvcnQgKiBhcyBlcnJvcnMgZnJvbSAnLi9lcnJvcnMuanMnO1xuaW1wb3J0ICogYXMgcGV4cHJzIGZyb20gJy4vcGV4cHJzLmpzJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFByaXZhdGUgU3R1ZmZcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIENvbnN0cnVjdG9yc1xuXG5leHBvcnQgY2xhc3MgR3JhbW1hckRlY2wge1xuICBjb25zdHJ1Y3RvcihuYW1lKSB7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgfVxuXG4gIC8vIEhlbHBlcnNcblxuICBzb3VyY2VJbnRlcnZhbChzdGFydElkeCwgZW5kSWR4KSB7XG4gICAgcmV0dXJuIHRoaXMuc291cmNlLnN1YkludGVydmFsKHN0YXJ0SWR4LCBlbmRJZHggLSBzdGFydElkeCk7XG4gIH1cblxuICBlbnN1cmVTdXBlckdyYW1tYXIoKSB7XG4gICAgaWYgKCF0aGlzLnN1cGVyR3JhbW1hcikge1xuICAgICAgdGhpcy53aXRoU3VwZXJHcmFtbWFyKFxuICAgICAgICAvLyBUT0RPOiBUaGUgY29uZGl0aW9uYWwgZXhwcmVzc2lvbiBiZWxvdyBpcyBhbiB1Z2x5IGhhY2suIEl0J3Mga2luZCBvZiBvayBiZWNhdXNlXG4gICAgICAgIC8vIEkgZG91YnQgYW55b25lIHdpbGwgZXZlciB0cnkgdG8gZGVjbGFyZSBhIGdyYW1tYXIgY2FsbGVkIGBCdWlsdEluUnVsZXNgLiBTdGlsbCxcbiAgICAgICAgLy8gd2Ugc2hvdWxkIHRyeSB0byBmaW5kIGEgYmV0dGVyIHdheSB0byBkbyB0aGlzLlxuICAgICAgICB0aGlzLm5hbWUgPT09ICdCdWlsdEluUnVsZXMnID8gR3JhbW1hci5Qcm90b0J1aWx0SW5SdWxlcyA6IEdyYW1tYXIuQnVpbHRJblJ1bGVzLFxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc3VwZXJHcmFtbWFyO1xuICB9XG5cbiAgZW5zdXJlU3VwZXJHcmFtbWFyUnVsZUZvck92ZXJyaWRpbmcobmFtZSwgc291cmNlKSB7XG4gICAgY29uc3QgcnVsZUluZm8gPSB0aGlzLmVuc3VyZVN1cGVyR3JhbW1hcigpLnJ1bGVzW25hbWVdO1xuICAgIGlmICghcnVsZUluZm8pIHtcbiAgICAgIHRocm93IGVycm9ycy5jYW5ub3RPdmVycmlkZVVuZGVjbGFyZWRSdWxlKG5hbWUsIHRoaXMuc3VwZXJHcmFtbWFyLm5hbWUsIHNvdXJjZSk7XG4gICAgfVxuICAgIHJldHVybiBydWxlSW5mbztcbiAgfVxuXG4gIGluc3RhbGxPdmVycmlkZGVuT3JFeHRlbmRlZFJ1bGUobmFtZSwgZm9ybWFscywgYm9keSwgc291cmNlKSB7XG4gICAgY29uc3QgZHVwbGljYXRlUGFyYW1ldGVyTmFtZXMgPSBnZXREdXBsaWNhdGVzKGZvcm1hbHMpO1xuICAgIGlmIChkdXBsaWNhdGVQYXJhbWV0ZXJOYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICB0aHJvdyBlcnJvcnMuZHVwbGljYXRlUGFyYW1ldGVyTmFtZXMobmFtZSwgZHVwbGljYXRlUGFyYW1ldGVyTmFtZXMsIHNvdXJjZSk7XG4gICAgfVxuICAgIGNvbnN0IHJ1bGVJbmZvID0gdGhpcy5lbnN1cmVTdXBlckdyYW1tYXIoKS5ydWxlc1tuYW1lXTtcbiAgICBjb25zdCBleHBlY3RlZEZvcm1hbHMgPSBydWxlSW5mby5mb3JtYWxzO1xuICAgIGNvbnN0IGV4cGVjdGVkTnVtRm9ybWFscyA9IGV4cGVjdGVkRm9ybWFscyA/IGV4cGVjdGVkRm9ybWFscy5sZW5ndGggOiAwO1xuICAgIGlmIChmb3JtYWxzLmxlbmd0aCAhPT0gZXhwZWN0ZWROdW1Gb3JtYWxzKSB7XG4gICAgICB0aHJvdyBlcnJvcnMud3JvbmdOdW1iZXJPZlBhcmFtZXRlcnMobmFtZSwgZXhwZWN0ZWROdW1Gb3JtYWxzLCBmb3JtYWxzLmxlbmd0aCwgc291cmNlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuaW5zdGFsbChuYW1lLCBmb3JtYWxzLCBib2R5LCBydWxlSW5mby5kZXNjcmlwdGlvbiwgc291cmNlKTtcbiAgfVxuXG4gIGluc3RhbGwobmFtZSwgZm9ybWFscywgYm9keSwgZGVzY3JpcHRpb24sIHNvdXJjZSwgcHJpbWl0aXZlID0gZmFsc2UpIHtcbiAgICB0aGlzLnJ1bGVzW25hbWVdID0ge1xuICAgICAgYm9keTogYm9keS5pbnRyb2R1Y2VQYXJhbXMoZm9ybWFscyksXG4gICAgICBmb3JtYWxzLFxuICAgICAgZGVzY3JpcHRpb24sXG4gICAgICBzb3VyY2UsXG4gICAgICBwcmltaXRpdmUsXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIFN0dWZmIHRoYXQgeW91IHNob3VsZCBvbmx5IGRvIG9uY2VcblxuICB3aXRoU3VwZXJHcmFtbWFyKHN1cGVyR3JhbW1hcikge1xuICAgIGlmICh0aGlzLnN1cGVyR3JhbW1hcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCd0aGUgc3VwZXIgZ3JhbW1hciBvZiBhIEdyYW1tYXJEZWNsIGNhbm5vdCBiZSBzZXQgbW9yZSB0aGFuIG9uY2UnKTtcbiAgICB9XG4gICAgdGhpcy5zdXBlckdyYW1tYXIgPSBzdXBlckdyYW1tYXI7XG4gICAgdGhpcy5ydWxlcyA9IE9iamVjdC5jcmVhdGUoc3VwZXJHcmFtbWFyLnJ1bGVzKTtcblxuICAgIC8vIEdyYW1tYXJzIHdpdGggYW4gZXhwbGljaXQgc3VwZXJncmFtbWFyIGluaGVyaXQgYSBkZWZhdWx0IHN0YXJ0IHJ1bGUuXG4gICAgaWYgKCFzdXBlckdyYW1tYXIuaXNCdWlsdEluKCkpIHtcbiAgICAgIHRoaXMuZGVmYXVsdFN0YXJ0UnVsZSA9IHN1cGVyR3JhbW1hci5kZWZhdWx0U3RhcnRSdWxlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHdpdGhEZWZhdWx0U3RhcnRSdWxlKHJ1bGVOYW1lKSB7XG4gICAgdGhpcy5kZWZhdWx0U3RhcnRSdWxlID0gcnVsZU5hbWU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB3aXRoU291cmNlKHNvdXJjZSkge1xuICAgIHRoaXMuc291cmNlID0gbmV3IElucHV0U3RyZWFtKHNvdXJjZSkuaW50ZXJ2YWwoMCwgc291cmNlLmxlbmd0aCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBDcmVhdGVzIGEgR3JhbW1hciBpbnN0YW5jZSwgYW5kIGlmIGl0IHBhc3NlcyB0aGUgc2FuaXR5IGNoZWNrcywgcmV0dXJucyBpdC5cbiAgYnVpbGQoKSB7XG4gICAgY29uc3QgZ3JhbW1hciA9IG5ldyBHcmFtbWFyKFxuICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgIHRoaXMuZW5zdXJlU3VwZXJHcmFtbWFyKCksXG4gICAgICAgIHRoaXMucnVsZXMsXG4gICAgICAgIHRoaXMuZGVmYXVsdFN0YXJ0UnVsZSxcbiAgICApO1xuICAgIC8vIEluaXRpYWxpemUgaW50ZXJuYWwgcHJvcHMgdGhhdCBhcmUgaW5oZXJpdGVkIGZyb20gdGhlIHN1cGVyIGdyYW1tYXIuXG4gICAgZ3JhbW1hci5fbWF0Y2hTdGF0ZUluaXRpYWxpemVyID0gZ3JhbW1hci5zdXBlckdyYW1tYXIuX21hdGNoU3RhdGVJbml0aWFsaXplcjtcbiAgICBncmFtbWFyLnN1cHBvcnRzSW5jcmVtZW50YWxQYXJzaW5nID0gZ3JhbW1hci5zdXBlckdyYW1tYXIuc3VwcG9ydHNJbmNyZW1lbnRhbFBhcnNpbmc7XG5cbiAgICAvLyBUT0RPOiBjaGFuZ2UgdGhlIHBleHByLnByb3RvdHlwZS5hc3NlcnQuLi4gbWV0aG9kcyB0byBtYWtlIHRoZW0gYWRkXG4gICAgLy8gZXhjZXB0aW9ucyB0byBhbiBhcnJheSB0aGF0J3MgcHJvdmlkZWQgYXMgYW4gYXJnLiBUaGVuIHdlJ2xsIGJlIGFibGUgdG9cbiAgICAvLyBzaG93IG1vcmUgdGhhbiBvbmUgZXJyb3Igb2YgdGhlIHNhbWUgdHlwZSBhdCBhIHRpbWUuXG4gICAgLy8gVE9ETzogaW5jbHVkZSB0aGUgb2ZmZW5kaW5nIHBleHByIGluIHRoZSBlcnJvcnMsIHRoYXQgd2F5IHdlIGNhbiBzaG93XG4gICAgLy8gdGhlIHBhcnQgb2YgdGhlIHNvdXJjZSB0aGF0IGNhdXNlZCBpdC5cbiAgICBjb25zdCBncmFtbWFyRXJyb3JzID0gW107XG4gICAgbGV0IGdyYW1tYXJIYXNJbnZhbGlkQXBwbGljYXRpb25zID0gZmFsc2U7XG4gICAgT2JqZWN0LmtleXMoZ3JhbW1hci5ydWxlcykuZm9yRWFjaChydWxlTmFtZSA9PiB7XG4gICAgICBjb25zdCB7Ym9keX0gPSBncmFtbWFyLnJ1bGVzW3J1bGVOYW1lXTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGJvZHkuYXNzZXJ0Q2hvaWNlc0hhdmVVbmlmb3JtQXJpdHkocnVsZU5hbWUpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBncmFtbWFyRXJyb3JzLnB1c2goZSk7XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICBib2R5LmFzc2VydEFsbEFwcGxpY2F0aW9uc0FyZVZhbGlkKHJ1bGVOYW1lLCBncmFtbWFyKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgZ3JhbW1hckVycm9ycy5wdXNoKGUpO1xuICAgICAgICBncmFtbWFySGFzSW52YWxpZEFwcGxpY2F0aW9ucyA9IHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCFncmFtbWFySGFzSW52YWxpZEFwcGxpY2F0aW9ucykge1xuICAgICAgLy8gVGhlIGZvbGxvd2luZyBjaGVjayBjYW4gb25seSBiZSBkb25lIGlmIHRoZSBncmFtbWFyIGhhcyBubyBpbnZhbGlkIGFwcGxpY2F0aW9ucy5cbiAgICAgIE9iamVjdC5rZXlzKGdyYW1tYXIucnVsZXMpLmZvckVhY2gocnVsZU5hbWUgPT4ge1xuICAgICAgICBjb25zdCB7Ym9keX0gPSBncmFtbWFyLnJ1bGVzW3J1bGVOYW1lXTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBib2R5LmFzc2VydEl0ZXJhdGVkRXhwcnNBcmVOb3ROdWxsYWJsZShncmFtbWFyLCBbXSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBncmFtbWFyRXJyb3JzLnB1c2goZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoZ3JhbW1hckVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICBlcnJvcnMudGhyb3dFcnJvcnMoZ3JhbW1hckVycm9ycyk7XG4gICAgfVxuICAgIGlmICh0aGlzLnNvdXJjZSkge1xuICAgICAgZ3JhbW1hci5zb3VyY2UgPSB0aGlzLnNvdXJjZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZ3JhbW1hcjtcbiAgfVxuXG4gIC8vIFJ1bGUgZGVjbGFyYXRpb25zXG5cbiAgZGVmaW5lKG5hbWUsIGZvcm1hbHMsIGJvZHksIGRlc2NyaXB0aW9uLCBzb3VyY2UsIHByaW1pdGl2ZSkge1xuICAgIHRoaXMuZW5zdXJlU3VwZXJHcmFtbWFyKCk7XG4gICAgaWYgKHRoaXMuc3VwZXJHcmFtbWFyLnJ1bGVzW25hbWVdKSB7XG4gICAgICB0aHJvdyBlcnJvcnMuZHVwbGljYXRlUnVsZURlY2xhcmF0aW9uKG5hbWUsIHRoaXMubmFtZSwgdGhpcy5zdXBlckdyYW1tYXIubmFtZSwgc291cmNlKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMucnVsZXNbbmFtZV0pIHtcbiAgICAgIHRocm93IGVycm9ycy5kdXBsaWNhdGVSdWxlRGVjbGFyYXRpb24obmFtZSwgdGhpcy5uYW1lLCB0aGlzLm5hbWUsIHNvdXJjZSk7XG4gICAgfVxuICAgIGNvbnN0IGR1cGxpY2F0ZVBhcmFtZXRlck5hbWVzID0gZ2V0RHVwbGljYXRlcyhmb3JtYWxzKTtcbiAgICBpZiAoZHVwbGljYXRlUGFyYW1ldGVyTmFtZXMubGVuZ3RoID4gMCkge1xuICAgICAgdGhyb3cgZXJyb3JzLmR1cGxpY2F0ZVBhcmFtZXRlck5hbWVzKG5hbWUsIGR1cGxpY2F0ZVBhcmFtZXRlck5hbWVzLCBzb3VyY2UpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5pbnN0YWxsKG5hbWUsIGZvcm1hbHMsIGJvZHksIGRlc2NyaXB0aW9uLCBzb3VyY2UsIHByaW1pdGl2ZSk7XG4gIH1cblxuICBvdmVycmlkZShuYW1lLCBmb3JtYWxzLCBib2R5LCBkZXNjSWdub3JlZCwgc291cmNlKSB7XG4gICAgdGhpcy5lbnN1cmVTdXBlckdyYW1tYXJSdWxlRm9yT3ZlcnJpZGluZyhuYW1lLCBzb3VyY2UpO1xuICAgIHRoaXMuaW5zdGFsbE92ZXJyaWRkZW5PckV4dGVuZGVkUnVsZShuYW1lLCBmb3JtYWxzLCBib2R5LCBzb3VyY2UpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgZXh0ZW5kKG5hbWUsIGZvcm1hbHMsIGZyYWdtZW50LCBkZXNjSWdub3JlZCwgc291cmNlKSB7XG4gICAgY29uc3QgcnVsZUluZm8gPSB0aGlzLmVuc3VyZVN1cGVyR3JhbW1hcigpLnJ1bGVzW25hbWVdO1xuICAgIGlmICghcnVsZUluZm8pIHtcbiAgICAgIHRocm93IGVycm9ycy5jYW5ub3RFeHRlbmRVbmRlY2xhcmVkUnVsZShuYW1lLCB0aGlzLnN1cGVyR3JhbW1hci5uYW1lLCBzb3VyY2UpO1xuICAgIH1cbiAgICBjb25zdCBib2R5ID0gbmV3IHBleHBycy5FeHRlbmQodGhpcy5zdXBlckdyYW1tYXIsIG5hbWUsIGZyYWdtZW50KTtcbiAgICBib2R5LnNvdXJjZSA9IGZyYWdtZW50LnNvdXJjZTtcbiAgICB0aGlzLmluc3RhbGxPdmVycmlkZGVuT3JFeHRlbmRlZFJ1bGUobmFtZSwgZm9ybWFscywgYm9keSwgc291cmNlKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxufVxuIiwiaW1wb3J0IHtHcmFtbWFyfSBmcm9tICcuL0dyYW1tYXIuanMnO1xuaW1wb3J0IHtHcmFtbWFyRGVjbH0gZnJvbSAnLi9HcmFtbWFyRGVjbC5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMuanMnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUHJpdmF0ZSBzdHVmZlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGNsYXNzIEJ1aWxkZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmN1cnJlbnREZWNsID0gbnVsbDtcbiAgICB0aGlzLmN1cnJlbnRSdWxlTmFtZSA9IG51bGw7XG4gIH1cblxuICBuZXdHcmFtbWFyKG5hbWUpIHtcbiAgICByZXR1cm4gbmV3IEdyYW1tYXJEZWNsKG5hbWUpO1xuICB9XG5cbiAgZ3JhbW1hcihtZXRhSW5mbywgbmFtZSwgc3VwZXJHcmFtbWFyLCBkZWZhdWx0U3RhcnRSdWxlLCBydWxlcykge1xuICAgIGNvbnN0IGdEZWNsID0gbmV3IEdyYW1tYXJEZWNsKG5hbWUpO1xuICAgIGlmIChzdXBlckdyYW1tYXIpIHtcbiAgICAgIC8vIGBzdXBlckdyYW1tYXJgIG1heSBiZSBhIHJlY2lwZSAoaS5lLiBhbiBBcnJheSksIG9yIGFuIGFjdHVhbCBncmFtbWFyIGluc3RhbmNlLlxuICAgICAgZ0RlY2wud2l0aFN1cGVyR3JhbW1hcihcbiAgICAgICAgc3VwZXJHcmFtbWFyIGluc3RhbmNlb2YgR3JhbW1hciA/IHN1cGVyR3JhbW1hciA6IHRoaXMuZnJvbVJlY2lwZShzdXBlckdyYW1tYXIpLFxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKGRlZmF1bHRTdGFydFJ1bGUpIHtcbiAgICAgIGdEZWNsLndpdGhEZWZhdWx0U3RhcnRSdWxlKGRlZmF1bHRTdGFydFJ1bGUpO1xuICAgIH1cbiAgICBpZiAobWV0YUluZm8gJiYgbWV0YUluZm8uc291cmNlKSB7XG4gICAgICBnRGVjbC53aXRoU291cmNlKG1ldGFJbmZvLnNvdXJjZSk7XG4gICAgfVxuXG4gICAgdGhpcy5jdXJyZW50RGVjbCA9IGdEZWNsO1xuICAgIE9iamVjdC5rZXlzKHJ1bGVzKS5mb3JFYWNoKHJ1bGVOYW1lID0+IHtcbiAgICAgIHRoaXMuY3VycmVudFJ1bGVOYW1lID0gcnVsZU5hbWU7XG4gICAgICBjb25zdCBydWxlUmVjaXBlID0gcnVsZXNbcnVsZU5hbWVdO1xuXG4gICAgICBjb25zdCBhY3Rpb24gPSBydWxlUmVjaXBlWzBdOyAvLyBkZWZpbmUvZXh0ZW5kL292ZXJyaWRlXG4gICAgICBjb25zdCBtZXRhSW5mbyA9IHJ1bGVSZWNpcGVbMV07XG4gICAgICBjb25zdCBkZXNjcmlwdGlvbiA9IHJ1bGVSZWNpcGVbMl07XG4gICAgICBjb25zdCBmb3JtYWxzID0gcnVsZVJlY2lwZVszXTtcbiAgICAgIGNvbnN0IGJvZHkgPSB0aGlzLmZyb21SZWNpcGUocnVsZVJlY2lwZVs0XSk7XG5cbiAgICAgIGxldCBzb3VyY2U7XG4gICAgICBpZiAoZ0RlY2wuc291cmNlICYmIG1ldGFJbmZvICYmIG1ldGFJbmZvLnNvdXJjZUludGVydmFsKSB7XG4gICAgICAgIHNvdXJjZSA9IGdEZWNsLnNvdXJjZS5zdWJJbnRlcnZhbChcbiAgICAgICAgICAgIG1ldGFJbmZvLnNvdXJjZUludGVydmFsWzBdLFxuICAgICAgICAgICAgbWV0YUluZm8uc291cmNlSW50ZXJ2YWxbMV0gLSBtZXRhSW5mby5zb3VyY2VJbnRlcnZhbFswXSxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGdEZWNsW2FjdGlvbl0ocnVsZU5hbWUsIGZvcm1hbHMsIGJvZHksIGRlc2NyaXB0aW9uLCBzb3VyY2UpO1xuICAgIH0pO1xuICAgIHRoaXMuY3VycmVudFJ1bGVOYW1lID0gdGhpcy5jdXJyZW50RGVjbCA9IG51bGw7XG4gICAgcmV0dXJuIGdEZWNsLmJ1aWxkKCk7XG4gIH1cblxuICB0ZXJtaW5hbCh4KSB7XG4gICAgcmV0dXJuIG5ldyBwZXhwcnMuVGVybWluYWwoeCk7XG4gIH1cblxuICByYW5nZShmcm9tLCB0bykge1xuICAgIHJldHVybiBuZXcgcGV4cHJzLlJhbmdlKGZyb20sIHRvKTtcbiAgfVxuXG4gIHBhcmFtKGluZGV4KSB7XG4gICAgcmV0dXJuIG5ldyBwZXhwcnMuUGFyYW0oaW5kZXgpO1xuICB9XG5cbiAgYWx0KC4uLnRlcm1BcmdzKSB7XG4gICAgbGV0IHRlcm1zID0gW107XG4gICAgZm9yIChsZXQgYXJnIG9mIHRlcm1BcmdzKSB7XG4gICAgICBpZiAoIShhcmcgaW5zdGFuY2VvZiBwZXhwcnMuUEV4cHIpKSB7XG4gICAgICAgIGFyZyA9IHRoaXMuZnJvbVJlY2lwZShhcmcpO1xuICAgICAgfVxuICAgICAgaWYgKGFyZyBpbnN0YW5jZW9mIHBleHBycy5BbHQpIHtcbiAgICAgICAgdGVybXMgPSB0ZXJtcy5jb25jYXQoYXJnLnRlcm1zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRlcm1zLnB1c2goYXJnKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRlcm1zLmxlbmd0aCA9PT0gMSA/IHRlcm1zWzBdIDogbmV3IHBleHBycy5BbHQodGVybXMpO1xuICB9XG5cbiAgc2VxKC4uLmZhY3RvckFyZ3MpIHtcbiAgICBsZXQgZmFjdG9ycyA9IFtdO1xuICAgIGZvciAobGV0IGFyZyBvZiBmYWN0b3JBcmdzKSB7XG4gICAgICBpZiAoIShhcmcgaW5zdGFuY2VvZiBwZXhwcnMuUEV4cHIpKSB7XG4gICAgICAgIGFyZyA9IHRoaXMuZnJvbVJlY2lwZShhcmcpO1xuICAgICAgfVxuICAgICAgaWYgKGFyZyBpbnN0YW5jZW9mIHBleHBycy5TZXEpIHtcbiAgICAgICAgZmFjdG9ycyA9IGZhY3RvcnMuY29uY2F0KGFyZy5mYWN0b3JzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZhY3RvcnMucHVzaChhcmcpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFjdG9ycy5sZW5ndGggPT09IDEgPyBmYWN0b3JzWzBdIDogbmV3IHBleHBycy5TZXEoZmFjdG9ycyk7XG4gIH1cblxuICBzdGFyKGV4cHIpIHtcbiAgICBpZiAoIShleHByIGluc3RhbmNlb2YgcGV4cHJzLlBFeHByKSkge1xuICAgICAgZXhwciA9IHRoaXMuZnJvbVJlY2lwZShleHByKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBwZXhwcnMuU3RhcihleHByKTtcbiAgfVxuXG4gIHBsdXMoZXhwcikge1xuICAgIGlmICghKGV4cHIgaW5zdGFuY2VvZiBwZXhwcnMuUEV4cHIpKSB7XG4gICAgICBleHByID0gdGhpcy5mcm9tUmVjaXBlKGV4cHIpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IHBleHBycy5QbHVzKGV4cHIpO1xuICB9XG5cbiAgb3B0KGV4cHIpIHtcbiAgICBpZiAoIShleHByIGluc3RhbmNlb2YgcGV4cHJzLlBFeHByKSkge1xuICAgICAgZXhwciA9IHRoaXMuZnJvbVJlY2lwZShleHByKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBwZXhwcnMuT3B0KGV4cHIpO1xuICB9XG5cbiAgbm90KGV4cHIpIHtcbiAgICBpZiAoIShleHByIGluc3RhbmNlb2YgcGV4cHJzLlBFeHByKSkge1xuICAgICAgZXhwciA9IHRoaXMuZnJvbVJlY2lwZShleHByKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBwZXhwcnMuTm90KGV4cHIpO1xuICB9XG5cbiAgbG9va2FoZWFkKGV4cHIpIHtcbiAgICBpZiAoIShleHByIGluc3RhbmNlb2YgcGV4cHJzLlBFeHByKSkge1xuICAgICAgZXhwciA9IHRoaXMuZnJvbVJlY2lwZShleHByKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBwZXhwcnMuTG9va2FoZWFkKGV4cHIpO1xuICB9XG5cbiAgbGV4KGV4cHIpIHtcbiAgICBpZiAoIShleHByIGluc3RhbmNlb2YgcGV4cHJzLlBFeHByKSkge1xuICAgICAgZXhwciA9IHRoaXMuZnJvbVJlY2lwZShleHByKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBwZXhwcnMuTGV4KGV4cHIpO1xuICB9XG5cbiAgYXBwKHJ1bGVOYW1lLCBvcHRQYXJhbXMpIHtcbiAgICBpZiAob3B0UGFyYW1zICYmIG9wdFBhcmFtcy5sZW5ndGggPiAwKSB7XG4gICAgICBvcHRQYXJhbXMgPSBvcHRQYXJhbXMubWFwKGZ1bmN0aW9uKHBhcmFtKSB7XG4gICAgICAgIHJldHVybiBwYXJhbSBpbnN0YW5jZW9mIHBleHBycy5QRXhwciA/IHBhcmFtIDogdGhpcy5mcm9tUmVjaXBlKHBhcmFtKTtcbiAgICAgIH0sIHRoaXMpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IHBleHBycy5BcHBseShydWxlTmFtZSwgb3B0UGFyYW1zKTtcbiAgfVxuXG4gIC8vIE5vdGUgdGhhdCB1bmxpa2Ugb3RoZXIgbWV0aG9kcyBpbiB0aGlzIGNsYXNzLCB0aGlzIG1ldGhvZCBjYW5ub3QgYmUgdXNlZCBhcyBhXG4gIC8vIGNvbnZlbmllbmNlIGNvbnN0cnVjdG9yLiBJdCBvbmx5IHdvcmtzIHdpdGggcmVjaXBlcywgYmVjYXVzZSBpdCByZWxpZXMgb25cbiAgLy8gYHRoaXMuY3VycmVudERlY2xgIGFuZCBgdGhpcy5jdXJyZW50UnVsZU5hbWVgIGJlaW5nIHNldC5cbiAgc3BsaWNlKGJlZm9yZVRlcm1zLCBhZnRlclRlcm1zKSB7XG4gICAgcmV0dXJuIG5ldyBwZXhwcnMuU3BsaWNlKFxuICAgICAgICB0aGlzLmN1cnJlbnREZWNsLnN1cGVyR3JhbW1hcixcbiAgICAgICAgdGhpcy5jdXJyZW50UnVsZU5hbWUsXG4gICAgICAgIGJlZm9yZVRlcm1zLm1hcCh0ZXJtID0+IHRoaXMuZnJvbVJlY2lwZSh0ZXJtKSksXG4gICAgICAgIGFmdGVyVGVybXMubWFwKHRlcm0gPT4gdGhpcy5mcm9tUmVjaXBlKHRlcm0pKSxcbiAgICApO1xuICB9XG5cbiAgZnJvbVJlY2lwZShyZWNpcGUpIHtcbiAgICAvLyB0aGUgbWV0YS1pbmZvIG9mICdncmFtbWFyJyBpcyBwcm9jZXNzZWQgaW4gQnVpbGRlci5ncmFtbWFyXG4gICAgY29uc3QgYXJncyA9IHJlY2lwZVswXSA9PT0gJ2dyYW1tYXInID8gcmVjaXBlLnNsaWNlKDEpIDogcmVjaXBlLnNsaWNlKDIpO1xuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXNbcmVjaXBlWzBdXSguLi5hcmdzKTtcblxuICAgIGNvbnN0IG1ldGFJbmZvID0gcmVjaXBlWzFdO1xuICAgIGlmIChtZXRhSW5mbykge1xuICAgICAgaWYgKG1ldGFJbmZvLnNvdXJjZUludGVydmFsICYmIHRoaXMuY3VycmVudERlY2wpIHtcbiAgICAgICAgcmVzdWx0LndpdGhTb3VyY2UodGhpcy5jdXJyZW50RGVjbC5zb3VyY2VJbnRlcnZhbCguLi5tZXRhSW5mby5zb3VyY2VJbnRlcnZhbCkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG4iLCJpbXBvcnQge0J1aWxkZXJ9IGZyb20gJy4vQnVpbGRlci5qcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlUmVjaXBlKHJlY2lwZSkge1xuICBpZiAodHlwZW9mIHJlY2lwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiByZWNpcGUuY2FsbChuZXcgQnVpbGRlcigpKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAodHlwZW9mIHJlY2lwZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIC8vIHN0cmluZ2lmaWVkIEpTT04gcmVjaXBlXG4gICAgICByZWNpcGUgPSBKU09OLnBhcnNlKHJlY2lwZSk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgQnVpbGRlcigpLmZyb21SZWNpcGUocmVjaXBlKTtcbiAgfVxufVxuIiwiaW1wb3J0IHttYWtlUmVjaXBlfSBmcm9tICcuLi9zcmMvbWFrZVJlY2lwZS5qcyc7XG5leHBvcnQgZGVmYXVsdCBtYWtlUmVjaXBlKFtcImdyYW1tYXJcIix7XCJzb3VyY2VcIjpcIkJ1aWx0SW5SdWxlcyB7XFxuXFxuICBhbG51bSAgKGFuIGFscGhhLW51bWVyaWMgY2hhcmFjdGVyKVxcbiAgICA9IGxldHRlclxcbiAgICB8IGRpZ2l0XFxuXFxuICBsZXR0ZXIgIChhIGxldHRlcilcXG4gICAgPSBsb3dlclxcbiAgICB8IHVwcGVyXFxuICAgIHwgdW5pY29kZUx0bW9cXG5cXG4gIGRpZ2l0ICAoYSBkaWdpdClcXG4gICAgPSBcXFwiMFxcXCIuLlxcXCI5XFxcIlxcblxcbiAgaGV4RGlnaXQgIChhIGhleGFkZWNpbWFsIGRpZ2l0KVxcbiAgICA9IGRpZ2l0XFxuICAgIHwgXFxcImFcXFwiLi5cXFwiZlxcXCJcXG4gICAgfCBcXFwiQVxcXCIuLlxcXCJGXFxcIlxcblxcbiAgTGlzdE9mPGVsZW0sIHNlcD5cXG4gICAgPSBOb25lbXB0eUxpc3RPZjxlbGVtLCBzZXA+XFxuICAgIHwgRW1wdHlMaXN0T2Y8ZWxlbSwgc2VwPlxcblxcbiAgTm9uZW1wdHlMaXN0T2Y8ZWxlbSwgc2VwPlxcbiAgICA9IGVsZW0gKHNlcCBlbGVtKSpcXG5cXG4gIEVtcHR5TGlzdE9mPGVsZW0sIHNlcD5cXG4gICAgPSAvKiBub3RoaW5nICovXFxuXFxuICBsaXN0T2Y8ZWxlbSwgc2VwPlxcbiAgICA9IG5vbmVtcHR5TGlzdE9mPGVsZW0sIHNlcD5cXG4gICAgfCBlbXB0eUxpc3RPZjxlbGVtLCBzZXA+XFxuXFxuICBub25lbXB0eUxpc3RPZjxlbGVtLCBzZXA+XFxuICAgID0gZWxlbSAoc2VwIGVsZW0pKlxcblxcbiAgZW1wdHlMaXN0T2Y8ZWxlbSwgc2VwPlxcbiAgICA9IC8qIG5vdGhpbmcgKi9cXG5cXG4gIC8vIEFsbG93cyBhIHN5bnRhY3RpYyBydWxlIGFwcGxpY2F0aW9uIHdpdGhpbiBhIGxleGljYWwgY29udGV4dC5cXG4gIGFwcGx5U3ludGFjdGljPGFwcD4gPSBhcHBcXG59XCJ9LFwiQnVpbHRJblJ1bGVzXCIsbnVsbCxudWxsLHtcImFsbnVtXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTgsNzhdfSxcImFuIGFscGhhLW51bWVyaWMgY2hhcmFjdGVyXCIsW10sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbNjAsNzhdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls2MCw2Nl19LFwibGV0dGVyXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzczLDc4XX0sXCJkaWdpdFwiLFtdXV1dLFwibGV0dGVyXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbODIsMTQyXX0sXCJhIGxldHRlclwiLFtdLFtcImFsdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEwNywxNDJdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMDcsMTEyXX0sXCJsb3dlclwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMTksMTI0XX0sXCJ1cHBlclwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMzEsMTQyXX0sXCJ1bmljb2RlTHRtb1wiLFtdXV1dLFwiZGlnaXRcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNDYsMTc3XX0sXCJhIGRpZ2l0XCIsW10sW1wicmFuZ2VcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNjksMTc3XX0sXCIwXCIsXCI5XCJdXSxcImhleERpZ2l0XCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTgxLDI1NF19LFwiYSBoZXhhZGVjaW1hbCBkaWdpdFwiLFtdLFtcImFsdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIxOSwyNTRdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMTksMjI0XX0sXCJkaWdpdFwiLFtdXSxbXCJyYW5nZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzIzMSwyMzldfSxcImFcIixcImZcIl0sW1wicmFuZ2VcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDYsMjU0XX0sXCJBXCIsXCJGXCJdXV0sXCJMaXN0T2ZcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNTgsMzM2XX0sbnVsbCxbXCJlbGVtXCIsXCJzZXBcIl0sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjgyLDMzNl19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI4MiwzMDddfSxcIk5vbmVtcHR5TGlzdE9mXCIsW1tcInBhcmFtXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjk3LDMwMV19LDBdLFtcInBhcmFtXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzAzLDMwNl19LDFdXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzE0LDMzNl19LFwiRW1wdHlMaXN0T2ZcIixbW1wicGFyYW1cIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszMjYsMzMwXX0sMF0sW1wicGFyYW1cIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszMzIsMzM1XX0sMV1dXV1dLFwiTm9uZW1wdHlMaXN0T2ZcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszNDAsMzg4XX0sbnVsbCxbXCJlbGVtXCIsXCJzZXBcIl0sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzcyLDM4OF19LFtcInBhcmFtXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzcyLDM3Nl19LDBdLFtcInN0YXJcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszNzcsMzg4XX0sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzc4LDM4Nl19LFtcInBhcmFtXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzc4LDM4MV19LDFdLFtcInBhcmFtXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzgyLDM4Nl19LDBdXV1dXSxcIkVtcHR5TGlzdE9mXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzkyLDQzNF19LG51bGwsW1wiZWxlbVwiLFwic2VwXCJdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzQzOCw0MzhdfV1dLFwibGlzdE9mXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNDM4LDUxNl19LG51bGwsW1wiZWxlbVwiLFwic2VwXCJdLFtcImFsdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzQ2Miw1MTZdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls0NjIsNDg3XX0sXCJub25lbXB0eUxpc3RPZlwiLFtbXCJwYXJhbVwiLHtcInNvdXJjZUludGVydmFsXCI6WzQ3Nyw0ODFdfSwwXSxbXCJwYXJhbVwiLHtcInNvdXJjZUludGVydmFsXCI6WzQ4Myw0ODZdfSwxXV1dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzQ5NCw1MTZdfSxcImVtcHR5TGlzdE9mXCIsW1tcInBhcmFtXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTA2LDUxMF19LDBdLFtcInBhcmFtXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTEyLDUxNV19LDFdXV1dXSxcIm5vbmVtcHR5TGlzdE9mXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTIwLDU2OF19LG51bGwsW1wiZWxlbVwiLFwic2VwXCJdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzU1Miw1NjhdfSxbXCJwYXJhbVwiLHtcInNvdXJjZUludGVydmFsXCI6WzU1Miw1NTZdfSwwXSxbXCJzdGFyXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTU3LDU2OF19LFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzU1OCw1NjZdfSxbXCJwYXJhbVwiLHtcInNvdXJjZUludGVydmFsXCI6WzU1OCw1NjFdfSwxXSxbXCJwYXJhbVwiLHtcInNvdXJjZUludGVydmFsXCI6WzU2Miw1NjZdfSwwXV1dXV0sXCJlbXB0eUxpc3RPZlwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzU3Miw2ODJdfSxudWxsLFtcImVsZW1cIixcInNlcFwiXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls2ODUsNjg1XX1dXSxcImFwcGx5U3ludGFjdGljXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNjg1LDcxMF19LG51bGwsW1wiYXBwXCJdLFtcInBhcmFtXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzA3LDcxMF19LDBdXX1dKTtcbiIsImltcG9ydCBCdWlsdEluUnVsZXMgZnJvbSAnLi4vZGlzdC9idWlsdC1pbi1ydWxlcy5qcyc7XG5pbXBvcnQge0dyYW1tYXJ9IGZyb20gJy4vR3JhbW1hci5qcyc7XG5pbXBvcnQge2Fubm91bmNlQnVpbHRJblJ1bGVzfSBmcm9tICcuL3V0aWwuanMnO1xuXG5HcmFtbWFyLkJ1aWx0SW5SdWxlcyA9IEJ1aWx0SW5SdWxlcztcbmFubm91bmNlQnVpbHRJblJ1bGVzKEdyYW1tYXIuQnVpbHRJblJ1bGVzKTtcblxuLy8gRHVyaW5nIHRoZSBib290c3RyYXAgcHJvY2Vzcywgd2UgaW5zdGFudGlhdGUgc29tZSBncmFtbWFycyB0aGF0IHJlcXVpcmVcbi8vIHRoZSBidWlsdC1pbiBydWxlcyB0byBiZSBsb2FkZWQgZmlyc3QgKGUuZy4sIG9obS1ncmFtbWFyLm9obSkuIEJ5XG4vLyBleHBvcnRpbmcgYG1ha2VSZWNpcGVgIGhlcmUsIHRoZSByZWNpcGVzIGZvciB0aG9zZSBncmFtbWFycyBjYW4gZW5jb2RlXG4vLyB0aGF0IGRlcGVuZGVuY3kgYnkgaW1wb3J0aW5nIGl0IGZyb20gdGhpcyBtb2R1bGUuXG5leHBvcnQge21ha2VSZWNpcGV9IGZyb20gJy4vbWFrZVJlY2lwZS5qcyc7XG4iLCJpbXBvcnQge21ha2VSZWNpcGV9IGZyb20gJy4uL3NyYy9tYWluLWtlcm5lbC5qcyc7XG5leHBvcnQgZGVmYXVsdCBtYWtlUmVjaXBlKFtcImdyYW1tYXJcIix7XCJzb3VyY2VcIjpcIk9obSB7XFxuXFxuICBHcmFtbWFyc1xcbiAgICA9IEdyYW1tYXIqXFxuXFxuICBHcmFtbWFyXFxuICAgID0gaWRlbnQgU3VwZXJHcmFtbWFyPyBcXFwie1xcXCIgUnVsZSogXFxcIn1cXFwiXFxuXFxuICBTdXBlckdyYW1tYXJcXG4gICAgPSBcXFwiPDpcXFwiIGlkZW50XFxuXFxuICBSdWxlXFxuICAgID0gaWRlbnQgRm9ybWFscz8gcnVsZURlc2NyPyBcXFwiPVxcXCIgIFJ1bGVCb2R5ICAtLSBkZWZpbmVcXG4gICAgfCBpZGVudCBGb3JtYWxzPyAgICAgICAgICAgIFxcXCI6PVxcXCIgT3ZlcnJpZGVSdWxlQm9keSAgLS0gb3ZlcnJpZGVcXG4gICAgfCBpZGVudCBGb3JtYWxzPyAgICAgICAgICAgIFxcXCIrPVxcXCIgUnVsZUJvZHkgIC0tIGV4dGVuZFxcblxcbiAgUnVsZUJvZHlcXG4gICAgPSBcXFwifFxcXCI/IE5vbmVtcHR5TGlzdE9mPFRvcExldmVsVGVybSwgXFxcInxcXFwiPlxcblxcbiAgVG9wTGV2ZWxUZXJtXFxuICAgID0gU2VxIGNhc2VOYW1lICAtLSBpbmxpbmVcXG4gICAgfCBTZXFcXG5cXG4gIE92ZXJyaWRlUnVsZUJvZHlcXG4gICAgPSBcXFwifFxcXCI/IE5vbmVtcHR5TGlzdE9mPE92ZXJyaWRlVG9wTGV2ZWxUZXJtLCBcXFwifFxcXCI+XFxuXFxuICBPdmVycmlkZVRvcExldmVsVGVybVxcbiAgICA9IFxcXCIuLi5cXFwiICAtLSBzdXBlclNwbGljZVxcbiAgICB8IFRvcExldmVsVGVybVxcblxcbiAgRm9ybWFsc1xcbiAgICA9IFxcXCI8XFxcIiBMaXN0T2Y8aWRlbnQsIFxcXCIsXFxcIj4gXFxcIj5cXFwiXFxuXFxuICBQYXJhbXNcXG4gICAgPSBcXFwiPFxcXCIgTGlzdE9mPFNlcSwgXFxcIixcXFwiPiBcXFwiPlxcXCJcXG5cXG4gIEFsdFxcbiAgICA9IE5vbmVtcHR5TGlzdE9mPFNlcSwgXFxcInxcXFwiPlxcblxcbiAgU2VxXFxuICAgID0gSXRlcipcXG5cXG4gIEl0ZXJcXG4gICAgPSBQcmVkIFxcXCIqXFxcIiAgLS0gc3RhclxcbiAgICB8IFByZWQgXFxcIitcXFwiICAtLSBwbHVzXFxuICAgIHwgUHJlZCBcXFwiP1xcXCIgIC0tIG9wdFxcbiAgICB8IFByZWRcXG5cXG4gIFByZWRcXG4gICAgPSBcXFwiflxcXCIgTGV4ICAtLSBub3RcXG4gICAgfCBcXFwiJlxcXCIgTGV4ICAtLSBsb29rYWhlYWRcXG4gICAgfCBMZXhcXG5cXG4gIExleFxcbiAgICA9IFxcXCIjXFxcIiBCYXNlICAtLSBsZXhcXG4gICAgfCBCYXNlXFxuXFxuICBCYXNlXFxuICAgID0gaWRlbnQgUGFyYW1zPyB+KHJ1bGVEZXNjcj8gXFxcIj1cXFwiIHwgXFxcIjo9XFxcIiB8IFxcXCIrPVxcXCIpICAtLSBhcHBsaWNhdGlvblxcbiAgICB8IG9uZUNoYXJUZXJtaW5hbCBcXFwiLi5cXFwiIG9uZUNoYXJUZXJtaW5hbCAgICAgICAgICAgLS0gcmFuZ2VcXG4gICAgfCB0ZXJtaW5hbCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tIHRlcm1pbmFsXFxuICAgIHwgXFxcIihcXFwiIEFsdCBcXFwiKVxcXCIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLSBwYXJlblxcblxcbiAgcnVsZURlc2NyICAoYSBydWxlIGRlc2NyaXB0aW9uKVxcbiAgICA9IFxcXCIoXFxcIiBydWxlRGVzY3JUZXh0IFxcXCIpXFxcIlxcblxcbiAgcnVsZURlc2NyVGV4dFxcbiAgICA9ICh+XFxcIilcXFwiIGFueSkqXFxuXFxuICBjYXNlTmFtZVxcbiAgICA9IFxcXCItLVxcXCIgKH5cXFwiXFxcXG5cXFwiIHNwYWNlKSogbmFtZSAoflxcXCJcXFxcblxcXCIgc3BhY2UpKiAoXFxcIlxcXFxuXFxcIiB8ICZcXFwifVxcXCIpXFxuXFxuICBuYW1lICAoYSBuYW1lKVxcbiAgICA9IG5hbWVGaXJzdCBuYW1lUmVzdCpcXG5cXG4gIG5hbWVGaXJzdFxcbiAgICA9IFxcXCJfXFxcIlxcbiAgICB8IGxldHRlclxcblxcbiAgbmFtZVJlc3RcXG4gICAgPSBcXFwiX1xcXCJcXG4gICAgfCBhbG51bVxcblxcbiAgaWRlbnQgIChhbiBpZGVudGlmaWVyKVxcbiAgICA9IG5hbWVcXG5cXG4gIHRlcm1pbmFsXFxuICAgID0gXFxcIlxcXFxcXFwiXFxcIiB0ZXJtaW5hbENoYXIqIFxcXCJcXFxcXFxcIlxcXCJcXG5cXG4gIG9uZUNoYXJUZXJtaW5hbFxcbiAgICA9IFxcXCJcXFxcXFxcIlxcXCIgdGVybWluYWxDaGFyIFxcXCJcXFxcXFxcIlxcXCJcXG5cXG4gIHRlcm1pbmFsQ2hhclxcbiAgICA9IGVzY2FwZUNoYXJcXG4gICAgICB8IH5cXFwiXFxcXFxcXFxcXFwiIH5cXFwiXFxcXFxcXCJcXFwiIH5cXFwiXFxcXG5cXFwiIFxcXCJcXFxcdXswfVxcXCIuLlxcXCJcXFxcdXsxMEZGRkZ9XFxcIlxcblxcbiAgZXNjYXBlQ2hhciAgKGFuIGVzY2FwZSBzZXF1ZW5jZSlcXG4gICAgPSBcXFwiXFxcXFxcXFxcXFxcXFxcXFxcXCIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0gYmFja3NsYXNoXFxuICAgIHwgXFxcIlxcXFxcXFxcXFxcXFxcXCJcXFwiICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tIGRvdWJsZVF1b3RlXFxuICAgIHwgXFxcIlxcXFxcXFxcXFxcXCdcXFwiICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tIHNpbmdsZVF1b3RlXFxuICAgIHwgXFxcIlxcXFxcXFxcYlxcXCIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tIGJhY2tzcGFjZVxcbiAgICB8IFxcXCJcXFxcXFxcXG5cXFwiICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLSBsaW5lRmVlZFxcbiAgICB8IFxcXCJcXFxcXFxcXHJcXFwiICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLSBjYXJyaWFnZVJldHVyblxcbiAgICB8IFxcXCJcXFxcXFxcXHRcXFwiICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLSB0YWJcXG4gICAgfCBcXFwiXFxcXFxcXFx1e1xcXCIgaGV4RGlnaXQgaGV4RGlnaXQ/IGhleERpZ2l0P1xcbiAgICAgICAgICAgICBoZXhEaWdpdD8gaGV4RGlnaXQ/IGhleERpZ2l0PyBcXFwifVxcXCIgICAtLSB1bmljb2RlQ29kZVBvaW50XFxuICAgIHwgXFxcIlxcXFxcXFxcdVxcXCIgaGV4RGlnaXQgaGV4RGlnaXQgaGV4RGlnaXQgaGV4RGlnaXQgIC0tIHVuaWNvZGVFc2NhcGVcXG4gICAgfCBcXFwiXFxcXFxcXFx4XFxcIiBoZXhEaWdpdCBoZXhEaWdpdCAgICAgICAgICAgICAgICAgICAgLS0gaGV4RXNjYXBlXFxuXFxuICBzcGFjZVxcbiAgICs9IGNvbW1lbnRcXG5cXG4gIGNvbW1lbnRcXG4gICAgPSBcXFwiLy9cXFwiICh+XFxcIlxcXFxuXFxcIiBhbnkpKiAmKFxcXCJcXFxcblxcXCIgfCBlbmQpICAtLSBzaW5nbGVMaW5lXFxuICAgIHwgXFxcIi8qXFxcIiAoflxcXCIqL1xcXCIgYW55KSogXFxcIiovXFxcIiAgLS0gbXVsdGlMaW5lXFxuXFxuICB0b2tlbnMgPSB0b2tlbipcXG5cXG4gIHRva2VuID0gY2FzZU5hbWUgfCBjb21tZW50IHwgaWRlbnQgfCBvcGVyYXRvciB8IHB1bmN0dWF0aW9uIHwgdGVybWluYWwgfCBhbnlcXG5cXG4gIG9wZXJhdG9yID0gXFxcIjw6XFxcIiB8IFxcXCI9XFxcIiB8IFxcXCI6PVxcXCIgfCBcXFwiKz1cXFwiIHwgXFxcIipcXFwiIHwgXFxcIitcXFwiIHwgXFxcIj9cXFwiIHwgXFxcIn5cXFwiIHwgXFxcIiZcXFwiXFxuXFxuICBwdW5jdHVhdGlvbiA9IFxcXCI8XFxcIiB8IFxcXCI+XFxcIiB8IFxcXCIsXFxcIiB8IFxcXCItLVxcXCJcXG59XCJ9LFwiT2htXCIsbnVsbCxcIkdyYW1tYXJzXCIse1wiR3JhbW1hcnNcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls5LDMyXX0sbnVsbCxbXSxbXCJzdGFyXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjQsMzJdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNCwzMV19LFwiR3JhbW1hclwiLFtdXV1dLFwiR3JhbW1hclwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzM2LDgzXX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls1MCw4M119LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzUwLDU1XX0sXCJpZGVudFwiLFtdXSxbXCJvcHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls1Niw2OV19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzU2LDY4XX0sXCJTdXBlckdyYW1tYXJcIixbXV1dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzAsNzNdfSxcIntcIl0sW1wic3RhclwiLHtcInNvdXJjZUludGVydmFsXCI6Wzc0LDc5XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzQsNzhdfSxcIlJ1bGVcIixbXV1dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbODAsODNdfSxcIn1cIl1dXSxcIlN1cGVyR3JhbW1hclwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6Wzg3LDExNl19LG51bGwsW10sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTA2LDExNl19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTA2LDExMF19LFwiPDpcIl0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTExLDExNl19LFwiaWRlbnRcIixbXV1dXSxcIlJ1bGVfZGVmaW5lXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTMxLDE4MV19LG51bGwsW10sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTMxLDE3MF19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzMSwxMzZdfSxcImlkZW50XCIsW11dLFtcIm9wdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzNywxNDVdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMzcsMTQ0XX0sXCJGb3JtYWxzXCIsW11dXSxbXCJvcHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNDYsMTU2XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTQ2LDE1NV19LFwicnVsZURlc2NyXCIsW11dXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE1NywxNjBdfSxcIj1cIl0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTYyLDE3MF19LFwiUnVsZUJvZHlcIixbXV1dXSxcIlJ1bGVfb3ZlcnJpZGVcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxODgsMjQ4XX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxODgsMjM1XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTg4LDE5M119LFwiaWRlbnRcIixbXV0sW1wib3B0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTk0LDIwMl19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE5NCwyMDFdfSxcIkZvcm1hbHNcIixbXV1dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjE0LDIxOF19LFwiOj1cIl0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjE5LDIzNV19LFwiT3ZlcnJpZGVSdWxlQm9keVwiLFtdXV1dLFwiUnVsZV9leHRlbmRcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNTUsMzA1XX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNTUsMjk0XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjU1LDI2MF19LFwiaWRlbnRcIixbXV0sW1wib3B0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjYxLDI2OV19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI2MSwyNjhdfSxcIkZvcm1hbHNcIixbXV1dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjgxLDI4NV19LFwiKz1cIl0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjg2LDI5NF19LFwiUnVsZUJvZHlcIixbXV1dXSxcIlJ1bGVcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMjAsMzA1XX0sbnVsbCxbXSxbXCJhbHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMzEsMzA1XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTMxLDE3MF19LFwiUnVsZV9kZWZpbmVcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTg4LDIzNV19LFwiUnVsZV9vdmVycmlkZVwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNTUsMjk0XX0sXCJSdWxlX2V4dGVuZFwiLFtdXV1dLFwiUnVsZUJvZHlcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszMDksMzYyXX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszMjQsMzYyXX0sW1wib3B0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzI0LDMyOF19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzI0LDMyN119LFwifFwiXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzI5LDM2Ml19LFwiTm9uZW1wdHlMaXN0T2ZcIixbW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzQ0LDM1Nl19LFwiVG9wTGV2ZWxUZXJtXCIsW11dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzU4LDM2MV19LFwifFwiXV1dXV0sXCJUb3BMZXZlbFRlcm1faW5saW5lXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzg1LDQwOF19LG51bGwsW10sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzg1LDM5N119LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzM4NSwzODhdfSxcIlNlcVwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszODksMzk3XX0sXCJjYXNlTmFtZVwiLFtdXV1dLFwiVG9wTGV2ZWxUZXJtXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzY2LDQxOF19LG51bGwsW10sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzg1LDQxOF19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzM4NSwzOTddfSxcIlRvcExldmVsVGVybV9pbmxpbmVcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNDE1LDQxOF19LFwiU2VxXCIsW11dXV0sXCJPdmVycmlkZVJ1bGVCb2R5XCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNDIyLDQ5MV19LG51bGwsW10sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNDQ1LDQ5MV19LFtcIm9wdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzQ0NSw0NDldfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzQ0NSw0NDhdfSxcInxcIl1dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzQ1MCw0OTFdfSxcIk5vbmVtcHR5TGlzdE9mXCIsW1tcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzQ2NSw0ODVdfSxcIk92ZXJyaWRlVG9wTGV2ZWxUZXJtXCIsW11dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNDg3LDQ5MF19LFwifFwiXV1dXV0sXCJPdmVycmlkZVRvcExldmVsVGVybV9zdXBlclNwbGljZVwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzUyMiw1NDNdfSxudWxsLFtdLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTIyLDUyN119LFwiLi4uXCJdXSxcIk92ZXJyaWRlVG9wTGV2ZWxUZXJtXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNDk1LDU2Ml19LG51bGwsW10sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTIyLDU2Ml19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzUyMiw1MjddfSxcIk92ZXJyaWRlVG9wTGV2ZWxUZXJtX3N1cGVyU3BsaWNlXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzU1MCw1NjJdfSxcIlRvcExldmVsVGVybVwiLFtdXV1dLFwiRm9ybWFsc1wiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzU2Niw2MDZdfSxudWxsLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzU4MCw2MDZdfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzU4MCw1ODNdfSxcIjxcIl0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTg0LDYwMl19LFwiTGlzdE9mXCIsW1tcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzU5MSw1OTZdfSxcImlkZW50XCIsW11dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTk4LDYwMV19LFwiLFwiXV1dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNjAzLDYwNl19LFwiPlwiXV1dLFwiUGFyYW1zXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNjEwLDY0N119LG51bGwsW10sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNjIzLDY0N119LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNjIzLDYyNl19LFwiPFwiXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls2MjcsNjQzXX0sXCJMaXN0T2ZcIixbW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNjM0LDYzN119LFwiU2VxXCIsW11dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNjM5LDY0Ml19LFwiLFwiXV1dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNjQ0LDY0N119LFwiPlwiXV1dLFwiQWx0XCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNjUxLDY4NV19LG51bGwsW10sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNjYxLDY4NV19LFwiTm9uZW1wdHlMaXN0T2ZcIixbW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNjc2LDY3OV19LFwiU2VxXCIsW11dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNjgxLDY4NF19LFwifFwiXV1dXSxcIlNlcVwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzY4OSw3MDRdfSxudWxsLFtdLFtcInN0YXJcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls2OTksNzA0XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNjk5LDcwM119LFwiSXRlclwiLFtdXV1dLFwiSXRlcl9zdGFyXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzE5LDczNl19LG51bGwsW10sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzE5LDcyN119LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzcxOSw3MjNdfSxcIlByZWRcIixbXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls3MjQsNzI3XX0sXCIqXCJdXV0sXCJJdGVyX3BsdXNcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls3NDMsNzYwXX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls3NDMsNzUxXX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzQzLDc0N119LFwiUHJlZFwiLFtdXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6Wzc0OCw3NTFdfSxcIitcIl1dXSxcIkl0ZXJfb3B0XCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzY3LDc4M119LG51bGwsW10sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzY3LDc3NV19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6Wzc2Nyw3NzFdfSxcIlByZWRcIixbXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls3NzIsNzc1XX0sXCI/XCJdXV0sXCJJdGVyXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzA4LDc5NF19LG51bGwsW10sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzE5LDc5NF19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzcxOSw3MjddfSxcIkl0ZXJfc3RhclwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls3NDMsNzUxXX0sXCJJdGVyX3BsdXNcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzY3LDc3NV19LFwiSXRlcl9vcHRcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzkwLDc5NF19LFwiUHJlZFwiLFtdXV1dLFwiUHJlZF9ub3RcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls4MDksODI0XX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls4MDksODE2XX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls4MDksODEyXX0sXCJ+XCJdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzgxMyw4MTZdfSxcIkxleFwiLFtdXV1dLFwiUHJlZF9sb29rYWhlYWRcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls4MzEsODUyXX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls4MzEsODM4XX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls4MzEsODM0XX0sXCImXCJdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzgzNSw4MzhdfSxcIkxleFwiLFtdXV1dLFwiUHJlZFwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6Wzc5OCw4NjJdfSxudWxsLFtdLFtcImFsdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzgwOSw4NjJdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls4MDksODE2XX0sXCJQcmVkX25vdFwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls4MzEsODM4XX0sXCJQcmVkX2xvb2thaGVhZFwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls4NTksODYyXX0sXCJMZXhcIixbXV1dXSxcIkxleF9sZXhcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls4NzYsODkyXX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls4NzYsODg0XX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls4NzYsODc5XX0sXCIjXCJdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6Wzg4MCw4ODRdfSxcIkJhc2VcIixbXV1dXSxcIkxleFwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6Wzg2Niw5MDNdfSxudWxsLFtdLFtcImFsdFwiLHtcInNvdXJjZUludGVydmFsXCI6Wzg3Niw5MDNdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls4NzYsODg0XX0sXCJMZXhfbGV4XCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6Wzg5OSw5MDNdfSxcIkJhc2VcIixbXV1dXSxcIkJhc2VfYXBwbGljYXRpb25cIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls5MTgsOTc5XX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls5MTgsOTYzXX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbOTE4LDkyM119LFwiaWRlbnRcIixbXV0sW1wib3B0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbOTI0LDkzMV19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzkyNCw5MzBdfSxcIlBhcmFtc1wiLFtdXV0sW1wibm90XCIse1wic291cmNlSW50ZXJ2YWxcIjpbOTMyLDk2M119LFtcImFsdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzkzNCw5NjJdfSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls5MzQsOTQ4XX0sW1wib3B0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbOTM0LDk0NF19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzkzNCw5NDNdfSxcInJ1bGVEZXNjclwiLFtdXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls5NDUsOTQ4XX0sXCI9XCJdXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6Wzk1MSw5NTVdfSxcIjo9XCJdLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbOTU4LDk2Ml19LFwiKz1cIl1dXV1dLFwiQmFzZV9yYW5nZVwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6Wzk4NiwxMDQxXX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls5ODYsMTAyMl19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6Wzk4NiwxMDAxXX0sXCJvbmVDaGFyVGVybWluYWxcIixbXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMDAyLDEwMDZdfSxcIi4uXCJdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEwMDcsMTAyMl19LFwib25lQ2hhclRlcm1pbmFsXCIsW11dXV0sXCJCYXNlX3Rlcm1pbmFsXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTA0OCwxMTA2XX0sbnVsbCxbXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMDQ4LDEwNTZdfSxcInRlcm1pbmFsXCIsW11dXSxcIkJhc2VfcGFyZW5cIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMTEzLDExNjhdfSxudWxsLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzExMTMsMTEyNF19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTExMywxMTE2XX0sXCIoXCJdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzExMTcsMTEyMF19LFwiQWx0XCIsW11dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTEyMSwxMTI0XX0sXCIpXCJdXV0sXCJCYXNlXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbOTA3LDExNjhdfSxudWxsLFtdLFtcImFsdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzkxOCwxMTY4XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbOTE4LDk2M119LFwiQmFzZV9hcHBsaWNhdGlvblwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls5ODYsMTAyMl19LFwiQmFzZV9yYW5nZVwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMDQ4LDEwNTZdfSxcIkJhc2VfdGVybWluYWxcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTExMywxMTI0XX0sXCJCYXNlX3BhcmVuXCIsW11dXV0sXCJydWxlRGVzY3JcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMTcyLDEyMzFdfSxcImEgcnVsZSBkZXNjcmlwdGlvblwiLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzEyMTAsMTIzMV19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTIxMCwxMjEzXX0sXCIoXCJdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEyMTQsMTIyN119LFwicnVsZURlc2NyVGV4dFwiLFtdXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEyMjgsMTIzMV19LFwiKVwiXV1dLFwicnVsZURlc2NyVGV4dFwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzEyMzUsMTI2Nl19LG51bGwsW10sW1wic3RhclwiLHtcInNvdXJjZUludGVydmFsXCI6WzEyNTUsMTI2Nl19LFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzEyNTYsMTI2NF19LFtcIm5vdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEyNTYsMTI2MF19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTI1NywxMjYwXX0sXCIpXCJdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMjYxLDEyNjRdfSxcImFueVwiLFtdXV1dXSxcImNhc2VOYW1lXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTI3MCwxMzM4XX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMjg1LDEzMzhdfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEyODUsMTI4OV19LFwiLS1cIl0sW1wic3RhclwiLHtcInNvdXJjZUludGVydmFsXCI6WzEyOTAsMTMwNF19LFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzEyOTEsMTMwMl19LFtcIm5vdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEyOTEsMTI5Nl19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTI5MiwxMjk2XX0sXCJcXG5cIl1dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEyOTcsMTMwMl19LFwic3BhY2VcIixbXV1dXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMzA1LDEzMDldfSxcIm5hbWVcIixbXV0sW1wic3RhclwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzMTAsMTMyNF19LFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzMTEsMTMyMl19LFtcIm5vdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzMTEsMTMxNl19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTMxMiwxMzE2XX0sXCJcXG5cIl1dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzMTcsMTMyMl19LFwic3BhY2VcIixbXV1dXSxbXCJhbHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMzI2LDEzMzddfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzMjYsMTMzMF19LFwiXFxuXCJdLFtcImxvb2thaGVhZFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzMzMsMTMzN119LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTMzNCwxMzM3XX0sXCJ9XCJdXV1dXSxcIm5hbWVcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMzQyLDEzODJdfSxcImEgbmFtZVwiLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzNjMsMTM4Ml19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzNjMsMTM3Ml19LFwibmFtZUZpcnN0XCIsW11dLFtcInN0YXJcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMzczLDEzODJdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMzczLDEzODFdfSxcIm5hbWVSZXN0XCIsW11dXV1dLFwibmFtZUZpcnN0XCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTM4NiwxNDE4XX0sbnVsbCxbXSxbXCJhbHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNDAyLDE0MThdfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE0MDIsMTQwNV19LFwiX1wiXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNDEyLDE0MThdfSxcImxldHRlclwiLFtdXV1dLFwibmFtZVJlc3RcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNDIyLDE0NTJdfSxudWxsLFtdLFtcImFsdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE0MzcsMTQ1Ml19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTQzNywxNDQwXX0sXCJfXCJdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE0NDcsMTQ1Ml19LFwiYWxudW1cIixbXV1dXSxcImlkZW50XCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTQ1NiwxNDg5XX0sXCJhbiBpZGVudGlmaWVyXCIsW10sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTQ4NSwxNDg5XX0sXCJuYW1lXCIsW11dXSxcInRlcm1pbmFsXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTQ5MywxNTMxXX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNTA4LDE1MzFdfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE1MDgsMTUxMl19LFwiXFxcIlwiXSxbXCJzdGFyXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTUxMywxNTI2XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTUxMywxNTI1XX0sXCJ0ZXJtaW5hbENoYXJcIixbXV1dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTUyNywxNTMxXX0sXCJcXFwiXCJdXV0sXCJvbmVDaGFyVGVybWluYWxcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNTM1LDE1NzldfSxudWxsLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzE1NTcsMTU3OV19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTU1NywxNTYxXX0sXCJcXFwiXCJdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE1NjIsMTU3NF19LFwidGVybWluYWxDaGFyXCIsW11dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTU3NSwxNTc5XX0sXCJcXFwiXCJdXV0sXCJ0ZXJtaW5hbENoYXJcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNTgzLDE2NjBdfSxudWxsLFtdLFtcImFsdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE2MDIsMTY2MF19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE2MDIsMTYxMl19LFwiZXNjYXBlQ2hhclwiLFtdXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNjIxLDE2NjBdfSxbXCJub3RcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNjIxLDE2MjZdfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE2MjIsMTYyNl19LFwiXFxcXFwiXV0sW1wibm90XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTYyNywxNjMyXX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNjI4LDE2MzJdfSxcIlxcXCJcIl1dLFtcIm5vdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE2MzMsMTYzOF19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTYzNCwxNjM4XX0sXCJcXG5cIl1dLFtcInJhbmdlXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTYzOSwxNjYwXX0sXCJcXHUwMDAwXCIsXCL0j7+/XCJdXV1dLFwiZXNjYXBlQ2hhcl9iYWNrc2xhc2hcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNzAzLDE3NThdfSxudWxsLFtdLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTcwMywxNzA5XX0sXCJcXFxcXFxcXFwiXV0sXCJlc2NhcGVDaGFyX2RvdWJsZVF1b3RlXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTc2NSwxODIyXX0sbnVsbCxbXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE3NjUsMTc3MV19LFwiXFxcXFxcXCJcIl1dLFwiZXNjYXBlQ2hhcl9zaW5nbGVRdW90ZVwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzE4MjksMTg4Nl19LG51bGwsW10sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxODI5LDE4MzVdfSxcIlxcXFwnXCJdXSxcImVzY2FwZUNoYXJfYmFja3NwYWNlXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTg5MywxOTQ4XX0sbnVsbCxbXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE4OTMsMTg5OF19LFwiXFxcXGJcIl1dLFwiZXNjYXBlQ2hhcl9saW5lRmVlZFwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzE5NTUsMjAwOV19LG51bGwsW10sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxOTU1LDE5NjBdfSxcIlxcXFxuXCJdXSxcImVzY2FwZUNoYXJfY2FycmlhZ2VSZXR1cm5cIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMDE2LDIwNzZdfSxudWxsLFtdLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjAxNiwyMDIxXX0sXCJcXFxcclwiXV0sXCJlc2NhcGVDaGFyX3RhYlwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzIwODMsMjEzMl19LG51bGwsW10sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMDgzLDIwODhdfSxcIlxcXFx0XCJdXSxcImVzY2FwZUNoYXJfdW5pY29kZUNvZGVQb2ludFwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzIxMzksMjI0M119LG51bGwsW10sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjEzOSwyMjIxXX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMTM5LDIxNDVdfSxcIlxcXFx1e1wiXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMTQ2LDIxNTRdfSxcImhleERpZ2l0XCIsW11dLFtcIm9wdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIxNTUsMjE2NF19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIxNTUsMjE2M119LFwiaGV4RGlnaXRcIixbXV1dLFtcIm9wdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIxNjUsMjE3NF19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIxNjUsMjE3M119LFwiaGV4RGlnaXRcIixbXV1dLFtcIm9wdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIxODgsMjE5N119LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIxODgsMjE5Nl19LFwiaGV4RGlnaXRcIixbXV1dLFtcIm9wdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIxOTgsMjIwN119LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIxOTgsMjIwNl19LFwiaGV4RGlnaXRcIixbXV1dLFtcIm9wdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIyMDgsMjIxN119LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIyMDgsMjIxNl19LFwiaGV4RGlnaXRcIixbXV1dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjIxOCwyMjIxXX0sXCJ9XCJdXV0sXCJlc2NhcGVDaGFyX3VuaWNvZGVFc2NhcGVcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMjUwLDIzMDldfSxudWxsLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzIyNTAsMjI5MV19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjI1MCwyMjU1XX0sXCJcXFxcdVwiXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMjU2LDIyNjRdfSxcImhleERpZ2l0XCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIyNjUsMjI3M119LFwiaGV4RGlnaXRcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjI3NCwyMjgyXX0sXCJoZXhEaWdpdFwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMjgzLDIyOTFdfSxcImhleERpZ2l0XCIsW11dXV0sXCJlc2NhcGVDaGFyX2hleEVzY2FwZVwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzIzMTYsMjM3MV19LG51bGwsW10sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjMxNiwyMzM5XX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMzE2LDIzMjFdfSxcIlxcXFx4XCJdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIzMjIsMjMzMF19LFwiaGV4RGlnaXRcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjMzMSwyMzM5XX0sXCJoZXhEaWdpdFwiLFtdXV1dLFwiZXNjYXBlQ2hhclwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzE2NjQsMjM3MV19LFwiYW4gZXNjYXBlIHNlcXVlbmNlXCIsW10sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTcwMywyMzcxXX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTcwMywxNzA5XX0sXCJlc2NhcGVDaGFyX2JhY2tzbGFzaFwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNzY1LDE3NzFdfSxcImVzY2FwZUNoYXJfZG91YmxlUXVvdGVcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTgyOSwxODM1XX0sXCJlc2NhcGVDaGFyX3NpbmdsZVF1b3RlXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE4OTMsMTg5OF19LFwiZXNjYXBlQ2hhcl9iYWNrc3BhY2VcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTk1NSwxOTYwXX0sXCJlc2NhcGVDaGFyX2xpbmVGZWVkXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIwMTYsMjAyMV19LFwiZXNjYXBlQ2hhcl9jYXJyaWFnZVJldHVyblwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMDgzLDIwODhdfSxcImVzY2FwZUNoYXJfdGFiXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIxMzksMjIyMV19LFwiZXNjYXBlQ2hhcl91bmljb2RlQ29kZVBvaW50XCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIyNTAsMjI5MV19LFwiZXNjYXBlQ2hhcl91bmljb2RlRXNjYXBlXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIzMTYsMjMzOV19LFwiZXNjYXBlQ2hhcl9oZXhFc2NhcGVcIixbXV1dXSxcInNwYWNlXCI6W1wiZXh0ZW5kXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjM3NSwyMzk0XX0sbnVsbCxbXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMzg3LDIzOTRdfSxcImNvbW1lbnRcIixbXV1dLFwiY29tbWVudF9zaW5nbGVMaW5lXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjQxMiwyNDU4XX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDEyLDI0NDNdfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0MTIsMjQxNl19LFwiLy9cIl0sW1wic3RhclwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0MTcsMjQyOV19LFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0MTgsMjQyN119LFtcIm5vdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0MTgsMjQyM119LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjQxOSwyNDIzXX0sXCJcXG5cIl1dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0MjQsMjQyN119LFwiYW55XCIsW11dXV0sW1wibG9va2FoZWFkXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjQzMCwyNDQzXX0sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjQzMiwyNDQyXX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDMyLDI0MzZdfSxcIlxcblwiXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDM5LDI0NDJdfSxcImVuZFwiLFtdXV1dXV0sXCJjb21tZW50X211bHRpTGluZVwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0NjUsMjUwMV19LG51bGwsW10sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjQ2NSwyNDg3XX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDY1LDI0NjldfSxcIi8qXCJdLFtcInN0YXJcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDcwLDI0ODJdfSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDcxLDI0ODBdfSxbXCJub3RcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDcxLDI0NzZdfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0NzIsMjQ3Nl19LFwiKi9cIl1dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0NzcsMjQ4MF19LFwiYW55XCIsW11dXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDgzLDI0ODddfSxcIiovXCJdXV0sXCJjb21tZW50XCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjM5OCwyNTAxXX0sbnVsbCxbXSxbXCJhbHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDEyLDI1MDFdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDEyLDI0NDNdfSxcImNvbW1lbnRfc2luZ2xlTGluZVwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDY1LDI0ODddfSxcImNvbW1lbnRfbXVsdGlMaW5lXCIsW11dXV0sXCJ0b2tlbnNcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNTA1LDI1MjBdfSxudWxsLFtdLFtcInN0YXJcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNTE0LDI1MjBdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNTE0LDI1MTldfSxcInRva2VuXCIsW11dXV0sXCJ0b2tlblwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzI1MjQsMjYwMF19LG51bGwsW10sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjUzMiwyNjAwXX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjUzMiwyNTQwXX0sXCJjYXNlTmFtZVwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNTQzLDI1NTBdfSxcImNvbW1lbnRcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjU1MywyNTU4XX0sXCJpZGVudFwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNTYxLDI1NjldfSxcIm9wZXJhdG9yXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI1NzIsMjU4M119LFwicHVuY3R1YXRpb25cIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjU4NiwyNTk0XX0sXCJ0ZXJtaW5hbFwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNTk3LDI2MDBdfSxcImFueVwiLFtdXV1dLFwib3BlcmF0b3JcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNjA0LDI2NjldfSxudWxsLFtdLFtcImFsdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI2MTUsMjY2OV19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjYxNSwyNjE5XX0sXCI8OlwiXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI2MjIsMjYyNV19LFwiPVwiXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI2MjgsMjYzMl19LFwiOj1cIl0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNjM1LDI2MzldfSxcIis9XCJdLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjY0MiwyNjQ1XX0sXCIqXCJdLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjY0OCwyNjUxXX0sXCIrXCJdLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjY1NCwyNjU3XX0sXCI/XCJdLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjY2MCwyNjYzXX0sXCJ+XCJdLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjY2NiwyNjY5XX0sXCImXCJdXV0sXCJwdW5jdHVhdGlvblwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzI2NzMsMjcwOV19LG51bGwsW10sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjY4NywyNzA5XX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNjg3LDI2OTBdfSxcIjxcIl0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNjkzLDI2OTZdfSxcIj5cIl0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNjk5LDI3MDJdfSxcIixcIl0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNzA1LDI3MDldfSxcIi0tXCJdXV19XSk7XG4iLCJpbXBvcnQgb2htR3JhbW1hciBmcm9tICcuLi9kaXN0L29obS1ncmFtbWFyLmpzJztcbmltcG9ydCB7QnVpbGRlcn0gZnJvbSAnLi9CdWlsZGVyLmpzJztcbmltcG9ydCAqIGFzIGNvbW1vbiBmcm9tICcuL2NvbW1vbi5qcyc7XG5pbXBvcnQgKiBhcyBlcnJvcnMgZnJvbSAnLi9lcnJvcnMuanMnO1xuaW1wb3J0IHtHcmFtbWFyfSBmcm9tICcuL0dyYW1tYXIuanMnO1xuaW1wb3J0ICogYXMgcGV4cHJzIGZyb20gJy4vcGV4cHJzLmpzJztcblxuY29uc3Qgc3VwZXJTcGxpY2VQbGFjZWhvbGRlciA9IE9iamVjdC5jcmVhdGUocGV4cHJzLlBFeHByLnByb3RvdHlwZSk7XG5cbmZ1bmN0aW9uIG5hbWVzcGFjZUhhcyhucywgbmFtZSkge1xuICAvLyBMb29rIGZvciBhbiBlbnVtZXJhYmxlIHByb3BlcnR5LCBhbnl3aGVyZSBpbiB0aGUgcHJvdG90eXBlIGNoYWluLlxuICBmb3IgKGNvbnN0IHByb3AgaW4gbnMpIHtcbiAgICBpZiAocHJvcCA9PT0gbmFtZSkgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBSZXR1cm5zIGEgR3JhbW1hciBpbnN0YW5jZSAoaS5lLiwgYW4gb2JqZWN0IHdpdGggYSBgbWF0Y2hgIG1ldGhvZCkgZm9yXG4vLyBgdHJlZWAsIHdoaWNoIGlzIHRoZSBjb25jcmV0ZSBzeW50YXggdHJlZSBvZiBhIHVzZXItd3JpdHRlbiBncmFtbWFyLlxuLy8gVGhlIGdyYW1tYXIgd2lsbCBiZSBhc3NpZ25lZCBpbnRvIGBuYW1lc3BhY2VgIHVuZGVyIHRoZSBuYW1lIG9mIHRoZSBncmFtbWFyXG4vLyBhcyBzcGVjaWZpZWQgaW4gdGhlIHNvdXJjZS5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEdyYW1tYXIobWF0Y2gsIG5hbWVzcGFjZSwgb3B0T2htR3JhbW1hckZvclRlc3RpbmcpIHtcbiAgY29uc3QgYnVpbGRlciA9IG5ldyBCdWlsZGVyKCk7XG4gIGxldCBkZWNsO1xuICBsZXQgY3VycmVudFJ1bGVOYW1lO1xuICBsZXQgY3VycmVudFJ1bGVGb3JtYWxzO1xuICBsZXQgb3ZlcnJpZGluZyA9IGZhbHNlO1xuICBjb25zdCBtZXRhR3JhbW1hciA9IG9wdE9obUdyYW1tYXJGb3JUZXN0aW5nIHx8IG9obUdyYW1tYXI7XG5cbiAgLy8gQSB2aXNpdG9yIHRoYXQgcHJvZHVjZXMgYSBHcmFtbWFyIGluc3RhbmNlIGZyb20gdGhlIENTVC5cbiAgY29uc3QgaGVscGVycyA9IG1ldGFHcmFtbWFyLmNyZWF0ZVNlbWFudGljcygpLmFkZE9wZXJhdGlvbigndmlzaXQnLCB7XG4gICAgR3JhbW1hcnMoZ3JhbW1hckl0ZXIpIHtcbiAgICAgIHJldHVybiBncmFtbWFySXRlci5jaGlsZHJlbi5tYXAoYyA9PiBjLnZpc2l0KCkpO1xuICAgIH0sXG4gICAgR3JhbW1hcihpZCwgcywgX29wZW4sIHJ1bGVzLCBfY2xvc2UpIHtcbiAgICAgIGNvbnN0IGdyYW1tYXJOYW1lID0gaWQudmlzaXQoKTtcbiAgICAgIGRlY2wgPSBidWlsZGVyLm5ld0dyYW1tYXIoZ3JhbW1hck5hbWUpO1xuICAgICAgcy5jaGlsZCgwKSAmJiBzLmNoaWxkKDApLnZpc2l0KCk7XG4gICAgICBydWxlcy5jaGlsZHJlbi5tYXAoYyA9PiBjLnZpc2l0KCkpO1xuICAgICAgY29uc3QgZyA9IGRlY2wuYnVpbGQoKTtcbiAgICAgIGcuc291cmNlID0gdGhpcy5zb3VyY2UudHJpbW1lZCgpO1xuICAgICAgaWYgKG5hbWVzcGFjZUhhcyhuYW1lc3BhY2UsIGdyYW1tYXJOYW1lKSkge1xuICAgICAgICB0aHJvdyBlcnJvcnMuZHVwbGljYXRlR3JhbW1hckRlY2xhcmF0aW9uKGcsIG5hbWVzcGFjZSk7XG4gICAgICB9XG4gICAgICBuYW1lc3BhY2VbZ3JhbW1hck5hbWVdID0gZztcbiAgICAgIHJldHVybiBnO1xuICAgIH0sXG5cbiAgICBTdXBlckdyYW1tYXIoXywgbikge1xuICAgICAgY29uc3Qgc3VwZXJHcmFtbWFyTmFtZSA9IG4udmlzaXQoKTtcbiAgICAgIGlmIChzdXBlckdyYW1tYXJOYW1lID09PSAnbnVsbCcpIHtcbiAgICAgICAgZGVjbC53aXRoU3VwZXJHcmFtbWFyKG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFuYW1lc3BhY2UgfHwgIW5hbWVzcGFjZUhhcyhuYW1lc3BhY2UsIHN1cGVyR3JhbW1hck5hbWUpKSB7XG4gICAgICAgICAgdGhyb3cgZXJyb3JzLnVuZGVjbGFyZWRHcmFtbWFyKHN1cGVyR3JhbW1hck5hbWUsIG5hbWVzcGFjZSwgbi5zb3VyY2UpO1xuICAgICAgICB9XG4gICAgICAgIGRlY2wud2l0aFN1cGVyR3JhbW1hcihuYW1lc3BhY2Vbc3VwZXJHcmFtbWFyTmFtZV0pO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBSdWxlX2RlZmluZShuLCBmcywgZCwgXywgYikge1xuICAgICAgY3VycmVudFJ1bGVOYW1lID0gbi52aXNpdCgpO1xuICAgICAgY3VycmVudFJ1bGVGb3JtYWxzID0gZnMuY2hpbGRyZW4ubWFwKGMgPT4gYy52aXNpdCgpKVswXSB8fCBbXTtcbiAgICAgIC8vIElmIHRoZXJlIGlzIG5vIGRlZmF1bHQgc3RhcnQgcnVsZSB5ZXQsIHNldCBpdCBub3cuIFRoaXMgbXVzdCBiZSBkb25lIGJlZm9yZSB2aXNpdGluZ1xuICAgICAgLy8gdGhlIGJvZHksIGJlY2F1c2UgaXQgbWlnaHQgY29udGFpbiBhbiBpbmxpbmUgcnVsZSBkZWZpbml0aW9uLlxuICAgICAgaWYgKCFkZWNsLmRlZmF1bHRTdGFydFJ1bGUgJiYgZGVjbC5lbnN1cmVTdXBlckdyYW1tYXIoKSAhPT0gR3JhbW1hci5Qcm90b0J1aWx0SW5SdWxlcykge1xuICAgICAgICBkZWNsLndpdGhEZWZhdWx0U3RhcnRSdWxlKGN1cnJlbnRSdWxlTmFtZSk7XG4gICAgICB9XG4gICAgICBjb25zdCBib2R5ID0gYi52aXNpdCgpO1xuICAgICAgY29uc3QgZGVzY3JpcHRpb24gPSBkLmNoaWxkcmVuLm1hcChjID0+IGMudmlzaXQoKSlbMF07XG4gICAgICBjb25zdCBzb3VyY2UgPSB0aGlzLnNvdXJjZS50cmltbWVkKCk7XG4gICAgICByZXR1cm4gZGVjbC5kZWZpbmUoY3VycmVudFJ1bGVOYW1lLCBjdXJyZW50UnVsZUZvcm1hbHMsIGJvZHksIGRlc2NyaXB0aW9uLCBzb3VyY2UpO1xuICAgIH0sXG4gICAgUnVsZV9vdmVycmlkZShuLCBmcywgXywgYikge1xuICAgICAgY3VycmVudFJ1bGVOYW1lID0gbi52aXNpdCgpO1xuICAgICAgY3VycmVudFJ1bGVGb3JtYWxzID0gZnMuY2hpbGRyZW4ubWFwKGMgPT4gYy52aXNpdCgpKVswXSB8fCBbXTtcblxuICAgICAgY29uc3Qgc291cmNlID0gdGhpcy5zb3VyY2UudHJpbW1lZCgpO1xuICAgICAgZGVjbC5lbnN1cmVTdXBlckdyYW1tYXJSdWxlRm9yT3ZlcnJpZGluZyhjdXJyZW50UnVsZU5hbWUsIHNvdXJjZSk7XG5cbiAgICAgIG92ZXJyaWRpbmcgPSB0cnVlO1xuICAgICAgY29uc3QgYm9keSA9IGIudmlzaXQoKTtcbiAgICAgIG92ZXJyaWRpbmcgPSBmYWxzZTtcbiAgICAgIHJldHVybiBkZWNsLm92ZXJyaWRlKGN1cnJlbnRSdWxlTmFtZSwgY3VycmVudFJ1bGVGb3JtYWxzLCBib2R5LCBudWxsLCBzb3VyY2UpO1xuICAgIH0sXG4gICAgUnVsZV9leHRlbmQobiwgZnMsIF8sIGIpIHtcbiAgICAgIGN1cnJlbnRSdWxlTmFtZSA9IG4udmlzaXQoKTtcbiAgICAgIGN1cnJlbnRSdWxlRm9ybWFscyA9IGZzLmNoaWxkcmVuLm1hcChjID0+IGMudmlzaXQoKSlbMF0gfHwgW107XG4gICAgICBjb25zdCBib2R5ID0gYi52aXNpdCgpO1xuICAgICAgY29uc3Qgc291cmNlID0gdGhpcy5zb3VyY2UudHJpbW1lZCgpO1xuICAgICAgcmV0dXJuIGRlY2wuZXh0ZW5kKGN1cnJlbnRSdWxlTmFtZSwgY3VycmVudFJ1bGVGb3JtYWxzLCBib2R5LCBudWxsLCBzb3VyY2UpO1xuICAgIH0sXG4gICAgUnVsZUJvZHkoXywgdGVybXMpIHtcbiAgICAgIHJldHVybiBidWlsZGVyLmFsdCguLi50ZXJtcy52aXNpdCgpKS53aXRoU291cmNlKHRoaXMuc291cmNlKTtcbiAgICB9LFxuICAgIE92ZXJyaWRlUnVsZUJvZHkoXywgdGVybXMpIHtcbiAgICAgIGNvbnN0IGFyZ3MgPSB0ZXJtcy52aXNpdCgpO1xuXG4gICAgICAvLyBDaGVjayBpZiB0aGUgc3VwZXItc3BsaWNlIG9wZXJhdG9yIChgLi4uYCkgYXBwZWFycyBpbiB0aGUgdGVybXMuXG4gICAgICBjb25zdCBleHBhbnNpb25Qb3MgPSBhcmdzLmluZGV4T2Yoc3VwZXJTcGxpY2VQbGFjZWhvbGRlcik7XG4gICAgICBpZiAoZXhwYW5zaW9uUG9zID49IDApIHtcbiAgICAgICAgY29uc3QgYmVmb3JlVGVybXMgPSBhcmdzLnNsaWNlKDAsIGV4cGFuc2lvblBvcyk7XG4gICAgICAgIGNvbnN0IGFmdGVyVGVybXMgPSBhcmdzLnNsaWNlKGV4cGFuc2lvblBvcyArIDEpO1xuXG4gICAgICAgIC8vIEVuc3VyZSBpdCBhcHBlYXJzIG5vIG1vcmUgdGhhbiBvbmNlLlxuICAgICAgICBhZnRlclRlcm1zLmZvckVhY2godCA9PiB7XG4gICAgICAgICAgaWYgKHQgPT09IHN1cGVyU3BsaWNlUGxhY2Vob2xkZXIpIHRocm93IGVycm9ycy5tdWx0aXBsZVN1cGVyU3BsaWNlcyh0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBwZXhwcnMuU3BsaWNlKFxuICAgICAgICAgICAgZGVjbC5zdXBlckdyYW1tYXIsXG4gICAgICAgICAgICBjdXJyZW50UnVsZU5hbWUsXG4gICAgICAgICAgICBiZWZvcmVUZXJtcyxcbiAgICAgICAgICAgIGFmdGVyVGVybXMsXG4gICAgICAgICkud2l0aFNvdXJjZSh0aGlzLnNvdXJjZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYnVpbGRlci5hbHQoLi4uYXJncykud2l0aFNvdXJjZSh0aGlzLnNvdXJjZSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBGb3JtYWxzKG9wb2ludHksIGZzLCBjcG9pbnR5KSB7XG4gICAgICByZXR1cm4gZnMudmlzaXQoKTtcbiAgICB9LFxuXG4gICAgUGFyYW1zKG9wb2ludHksIHBzLCBjcG9pbnR5KSB7XG4gICAgICByZXR1cm4gcHMudmlzaXQoKTtcbiAgICB9LFxuXG4gICAgQWx0KHNlcXMpIHtcbiAgICAgIHJldHVybiBidWlsZGVyLmFsdCguLi5zZXFzLnZpc2l0KCkpLndpdGhTb3VyY2UodGhpcy5zb3VyY2UpO1xuICAgIH0sXG5cbiAgICBUb3BMZXZlbFRlcm1faW5saW5lKGIsIG4pIHtcbiAgICAgIGNvbnN0IGlubGluZVJ1bGVOYW1lID0gY3VycmVudFJ1bGVOYW1lICsgJ18nICsgbi52aXNpdCgpO1xuICAgICAgY29uc3QgYm9keSA9IGIudmlzaXQoKTtcbiAgICAgIGNvbnN0IHNvdXJjZSA9IHRoaXMuc291cmNlLnRyaW1tZWQoKTtcbiAgICAgIGNvbnN0IGlzTmV3UnVsZURlY2xhcmF0aW9uID0gIShcbiAgICAgICAgZGVjbC5zdXBlckdyYW1tYXIgJiYgZGVjbC5zdXBlckdyYW1tYXIucnVsZXNbaW5saW5lUnVsZU5hbWVdXG4gICAgICApO1xuICAgICAgaWYgKG92ZXJyaWRpbmcgJiYgIWlzTmV3UnVsZURlY2xhcmF0aW9uKSB7XG4gICAgICAgIGRlY2wub3ZlcnJpZGUoaW5saW5lUnVsZU5hbWUsIGN1cnJlbnRSdWxlRm9ybWFscywgYm9keSwgbnVsbCwgc291cmNlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlY2wuZGVmaW5lKGlubGluZVJ1bGVOYW1lLCBjdXJyZW50UnVsZUZvcm1hbHMsIGJvZHksIG51bGwsIHNvdXJjZSk7XG4gICAgICB9XG4gICAgICBjb25zdCBwYXJhbXMgPSBjdXJyZW50UnVsZUZvcm1hbHMubWFwKGZvcm1hbCA9PiBidWlsZGVyLmFwcChmb3JtYWwpKTtcbiAgICAgIHJldHVybiBidWlsZGVyLmFwcChpbmxpbmVSdWxlTmFtZSwgcGFyYW1zKS53aXRoU291cmNlKGJvZHkuc291cmNlKTtcbiAgICB9LFxuICAgIE92ZXJyaWRlVG9wTGV2ZWxUZXJtX3N1cGVyU3BsaWNlKF8pIHtcbiAgICAgIHJldHVybiBzdXBlclNwbGljZVBsYWNlaG9sZGVyO1xuICAgIH0sXG5cbiAgICBTZXEoZXhwcikge1xuICAgICAgcmV0dXJuIGJ1aWxkZXIuc2VxKC4uLmV4cHIuY2hpbGRyZW4ubWFwKGMgPT4gYy52aXNpdCgpKSkud2l0aFNvdXJjZSh0aGlzLnNvdXJjZSk7XG4gICAgfSxcblxuICAgIEl0ZXJfc3Rhcih4LCBfKSB7XG4gICAgICByZXR1cm4gYnVpbGRlci5zdGFyKHgudmlzaXQoKSkud2l0aFNvdXJjZSh0aGlzLnNvdXJjZSk7XG4gICAgfSxcbiAgICBJdGVyX3BsdXMoeCwgXykge1xuICAgICAgcmV0dXJuIGJ1aWxkZXIucGx1cyh4LnZpc2l0KCkpLndpdGhTb3VyY2UodGhpcy5zb3VyY2UpO1xuICAgIH0sXG4gICAgSXRlcl9vcHQoeCwgXykge1xuICAgICAgcmV0dXJuIGJ1aWxkZXIub3B0KHgudmlzaXQoKSkud2l0aFNvdXJjZSh0aGlzLnNvdXJjZSk7XG4gICAgfSxcblxuICAgIFByZWRfbm90KF8sIHgpIHtcbiAgICAgIHJldHVybiBidWlsZGVyLm5vdCh4LnZpc2l0KCkpLndpdGhTb3VyY2UodGhpcy5zb3VyY2UpO1xuICAgIH0sXG4gICAgUHJlZF9sb29rYWhlYWQoXywgeCkge1xuICAgICAgcmV0dXJuIGJ1aWxkZXIubG9va2FoZWFkKHgudmlzaXQoKSkud2l0aFNvdXJjZSh0aGlzLnNvdXJjZSk7XG4gICAgfSxcblxuICAgIExleF9sZXgoXywgeCkge1xuICAgICAgcmV0dXJuIGJ1aWxkZXIubGV4KHgudmlzaXQoKSkud2l0aFNvdXJjZSh0aGlzLnNvdXJjZSk7XG4gICAgfSxcblxuICAgIEJhc2VfYXBwbGljYXRpb24ocnVsZSwgcHMpIHtcbiAgICAgIGNvbnN0IHBhcmFtcyA9IHBzLmNoaWxkcmVuLm1hcChjID0+IGMudmlzaXQoKSlbMF0gfHwgW107XG4gICAgICByZXR1cm4gYnVpbGRlci5hcHAocnVsZS52aXNpdCgpLCBwYXJhbXMpLndpdGhTb3VyY2UodGhpcy5zb3VyY2UpO1xuICAgIH0sXG4gICAgQmFzZV9yYW5nZShmcm9tLCBfLCB0bykge1xuICAgICAgcmV0dXJuIGJ1aWxkZXIucmFuZ2UoZnJvbS52aXNpdCgpLCB0by52aXNpdCgpKS53aXRoU291cmNlKHRoaXMuc291cmNlKTtcbiAgICB9LFxuICAgIEJhc2VfdGVybWluYWwoZXhwcikge1xuICAgICAgcmV0dXJuIGJ1aWxkZXIudGVybWluYWwoZXhwci52aXNpdCgpKS53aXRoU291cmNlKHRoaXMuc291cmNlKTtcbiAgICB9LFxuICAgIEJhc2VfcGFyZW4ob3BlbiwgeCwgY2xvc2UpIHtcbiAgICAgIHJldHVybiB4LnZpc2l0KCk7XG4gICAgfSxcblxuICAgIHJ1bGVEZXNjcihvcGVuLCB0LCBjbG9zZSkge1xuICAgICAgcmV0dXJuIHQudmlzaXQoKTtcbiAgICB9LFxuICAgIHJ1bGVEZXNjclRleHQoXykge1xuICAgICAgcmV0dXJuIHRoaXMuc291cmNlU3RyaW5nLnRyaW0oKTtcbiAgICB9LFxuXG4gICAgY2FzZU5hbWUoXywgc3BhY2UxLCBuLCBzcGFjZTIsIGVuZCkge1xuICAgICAgcmV0dXJuIG4udmlzaXQoKTtcbiAgICB9LFxuXG4gICAgbmFtZShmaXJzdCwgcmVzdCkge1xuICAgICAgcmV0dXJuIHRoaXMuc291cmNlU3RyaW5nO1xuICAgIH0sXG4gICAgbmFtZUZpcnN0KGV4cHIpIHt9LFxuICAgIG5hbWVSZXN0KGV4cHIpIHt9LFxuXG4gICAgdGVybWluYWwob3BlbiwgY3MsIGNsb3NlKSB7XG4gICAgICByZXR1cm4gY3MuY2hpbGRyZW4ubWFwKGMgPT4gYy52aXNpdCgpKS5qb2luKCcnKTtcbiAgICB9LFxuXG4gICAgb25lQ2hhclRlcm1pbmFsKG9wZW4sIGMsIGNsb3NlKSB7XG4gICAgICByZXR1cm4gYy52aXNpdCgpO1xuICAgIH0sXG5cbiAgICBlc2NhcGVDaGFyKGMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBjb21tb24udW5lc2NhcGVDb2RlUG9pbnQodGhpcy5zb3VyY2VTdHJpbmcpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBSYW5nZUVycm9yICYmIGVyci5tZXNzYWdlLnN0YXJ0c1dpdGgoJ0ludmFsaWQgY29kZSBwb2ludCAnKSkge1xuICAgICAgICAgIHRocm93IGVycm9ycy5pbnZhbGlkQ29kZVBvaW50KGMpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IGVycjsgLy8gUmV0aHJvd1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBOb25lbXB0eUxpc3RPZih4LCBfLCB4cykge1xuICAgICAgcmV0dXJuIFt4LnZpc2l0KCldLmNvbmNhdCh4cy5jaGlsZHJlbi5tYXAoYyA9PiBjLnZpc2l0KCkpKTtcbiAgICB9LFxuICAgIEVtcHR5TGlzdE9mKCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH0sXG5cbiAgICBfdGVybWluYWwoKSB7XG4gICAgICByZXR1cm4gdGhpcy5zb3VyY2VTdHJpbmc7XG4gICAgfSxcbiAgfSk7XG4gIHJldHVybiBoZWxwZXJzKG1hdGNoKS52aXNpdCgpO1xufVxuIiwiaW1wb3J0IHttYWtlUmVjaXBlfSBmcm9tICcuLi9zcmMvbWFpbi1rZXJuZWwuanMnO1xuZXhwb3J0IGRlZmF1bHQgbWFrZVJlY2lwZShbXCJncmFtbWFyXCIse1wic291cmNlXCI6XCJPcGVyYXRpb25zQW5kQXR0cmlidXRlcyB7XFxuXFxuICBBdHRyaWJ1dGVTaWduYXR1cmUgPVxcbiAgICBuYW1lXFxuXFxuICBPcGVyYXRpb25TaWduYXR1cmUgPVxcbiAgICBuYW1lIEZvcm1hbHM/XFxuXFxuICBGb3JtYWxzXFxuICAgID0gXFxcIihcXFwiIExpc3RPZjxuYW1lLCBcXFwiLFxcXCI+IFxcXCIpXFxcIlxcblxcbiAgbmFtZSAgKGEgbmFtZSlcXG4gICAgPSBuYW1lRmlyc3QgbmFtZVJlc3QqXFxuXFxuICBuYW1lRmlyc3RcXG4gICAgPSBcXFwiX1xcXCJcXG4gICAgfCBsZXR0ZXJcXG5cXG4gIG5hbWVSZXN0XFxuICAgID0gXFxcIl9cXFwiXFxuICAgIHwgYWxudW1cXG5cXG59XCJ9LFwiT3BlcmF0aW9uc0FuZEF0dHJpYnV0ZXNcIixudWxsLFwiQXR0cmlidXRlU2lnbmF0dXJlXCIse1wiQXR0cmlidXRlU2lnbmF0dXJlXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjksNThdfSxudWxsLFtdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzU0LDU4XX0sXCJuYW1lXCIsW11dXSxcIk9wZXJhdGlvblNpZ25hdHVyZVwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzYyLDEwMF19LG51bGwsW10sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbODcsMTAwXX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbODcsOTFdfSxcIm5hbWVcIixbXV0sW1wib3B0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbOTIsMTAwXX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbOTIsOTldfSxcIkZvcm1hbHNcIixbXV1dXV0sXCJGb3JtYWxzXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTA0LDE0M119LG51bGwsW10sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTE4LDE0M119LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTE4LDEyMV19LFwiKFwiXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMjIsMTM5XX0sXCJMaXN0T2ZcIixbW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTI5LDEzM119LFwibmFtZVwiLFtdXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzNSwxMzhdfSxcIixcIl1dXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE0MCwxNDNdfSxcIilcIl1dXSxcIm5hbWVcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNDcsMTg3XX0sXCJhIG5hbWVcIixbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNjgsMTg3XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTY4LDE3N119LFwibmFtZUZpcnN0XCIsW11dLFtcInN0YXJcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNzgsMTg3XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTc4LDE4Nl19LFwibmFtZVJlc3RcIixbXV1dXV0sXCJuYW1lRmlyc3RcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxOTEsMjIzXX0sbnVsbCxbXSxbXCJhbHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMDcsMjIzXX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMDcsMjEwXX0sXCJfXCJdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIxNywyMjNdfSxcImxldHRlclwiLFtdXV1dLFwibmFtZVJlc3RcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMjcsMjU3XX0sbnVsbCxbXSxbXCJhbHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDIsMjU3XX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDIsMjQ1XX0sXCJfXCJdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI1MiwyNTddfSxcImFsbnVtXCIsW11dXV19XSk7XG4iLCJpbXBvcnQgb3BlcmF0aW9uc0FuZEF0dHJpYnV0ZXNHcmFtbWFyIGZyb20gJy4uL2Rpc3Qvb3BlcmF0aW9ucy1hbmQtYXR0cmlidXRlcy5qcyc7XG5pbXBvcnQge0dyYW1tYXJ9IGZyb20gJy4vR3JhbW1hci5qcyc7XG5pbXBvcnQge1NlbWFudGljc30gZnJvbSAnLi9TZW1hbnRpY3MuanMnO1xuXG5pbml0QnVpbHRJblNlbWFudGljcyhHcmFtbWFyLkJ1aWx0SW5SdWxlcyk7XG5pbml0UHJvdG90eXBlUGFyc2VyKG9wZXJhdGlvbnNBbmRBdHRyaWJ1dGVzR3JhbW1hcik7IC8vIHJlcXVpcmVzIEJ1aWx0SW5TZW1hbnRpY3NcblxuZnVuY3Rpb24gaW5pdEJ1aWx0SW5TZW1hbnRpY3MoYnVpbHRJblJ1bGVzKSB7XG4gIGNvbnN0IGFjdGlvbnMgPSB7XG4gICAgZW1wdHkoKSB7XG4gICAgICByZXR1cm4gdGhpcy5pdGVyYXRpb24oKTtcbiAgICB9LFxuICAgIG5vbkVtcHR5KGZpcnN0LCBfLCByZXN0KSB7XG4gICAgICByZXR1cm4gdGhpcy5pdGVyYXRpb24oW2ZpcnN0XS5jb25jYXQocmVzdC5jaGlsZHJlbikpO1xuICAgIH0sXG4gIH07XG5cbiAgU2VtYW50aWNzLkJ1aWx0SW5TZW1hbnRpY3MgPSBTZW1hbnRpY3MuY3JlYXRlU2VtYW50aWNzKGJ1aWx0SW5SdWxlcywgbnVsbCkuYWRkT3BlcmF0aW9uKFxuICAgICAgJ2FzSXRlcmF0aW9uJyxcbiAgICAgIHtcbiAgICAgICAgZW1wdHlMaXN0T2Y6IGFjdGlvbnMuZW1wdHksXG4gICAgICAgIG5vbmVtcHR5TGlzdE9mOiBhY3Rpb25zLm5vbkVtcHR5LFxuICAgICAgICBFbXB0eUxpc3RPZjogYWN0aW9ucy5lbXB0eSxcbiAgICAgICAgTm9uZW1wdHlMaXN0T2Y6IGFjdGlvbnMubm9uRW1wdHksXG4gICAgICB9LFxuICApO1xufVxuXG5mdW5jdGlvbiBpbml0UHJvdG90eXBlUGFyc2VyKGdyYW1tYXIpIHtcbiAgU2VtYW50aWNzLnByb3RvdHlwZUdyYW1tYXJTZW1hbnRpY3MgPSBncmFtbWFyLmNyZWF0ZVNlbWFudGljcygpLmFkZE9wZXJhdGlvbigncGFyc2UnLCB7XG4gICAgQXR0cmlidXRlU2lnbmF0dXJlKG5hbWUpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IG5hbWUucGFyc2UoKSxcbiAgICAgICAgZm9ybWFsczogW10sXG4gICAgICB9O1xuICAgIH0sXG4gICAgT3BlcmF0aW9uU2lnbmF0dXJlKG5hbWUsIG9wdEZvcm1hbHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IG5hbWUucGFyc2UoKSxcbiAgICAgICAgZm9ybWFsczogb3B0Rm9ybWFscy5jaGlsZHJlbi5tYXAoYyA9PiBjLnBhcnNlKCkpWzBdIHx8IFtdLFxuICAgICAgfTtcbiAgICB9LFxuICAgIEZvcm1hbHMob3BhcmVuLCBmcywgY3BhcmVuKSB7XG4gICAgICByZXR1cm4gZnMuYXNJdGVyYXRpb24oKS5jaGlsZHJlbi5tYXAoYyA9PiBjLnBhcnNlKCkpO1xuICAgIH0sXG4gICAgbmFtZShmaXJzdCwgcmVzdCkge1xuICAgICAgcmV0dXJuIHRoaXMuc291cmNlU3RyaW5nO1xuICAgIH0sXG4gIH0pO1xuICBTZW1hbnRpY3MucHJvdG90eXBlR3JhbW1hciA9IGdyYW1tYXI7XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gZmluZEluZGVudGF0aW9uKGlucHV0KSB7XG4gIGxldCBwb3MgPSAwO1xuICBjb25zdCBzdGFjayA9IFswXTtcbiAgY29uc3QgdG9wT2ZTdGFjayA9ICgpID0+IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdO1xuXG4gIGNvbnN0IHJlc3VsdCA9IHt9O1xuXG4gIGNvbnN0IHJlZ2V4ID0gLyggKikuKig/OiR8XFxyP1xcbnxcXHIpL2c7XG4gIGxldCBtYXRjaDtcbiAgd2hpbGUgKChtYXRjaCA9IHJlZ2V4LmV4ZWMoaW5wdXQpKSAhPSBudWxsKSB7XG4gICAgY29uc3QgW2xpbmUsIGluZGVudF0gPSBtYXRjaDtcblxuICAgIC8vIFRoZSBsYXN0IG1hdGNoIHdpbGwgYWx3YXlzIGhhdmUgbGVuZ3RoIDAuIEluIGV2ZXJ5IG90aGVyIGNhc2UsIHNvbWVcbiAgICAvLyBjaGFyYWN0ZXJzIHdpbGwgYmUgbWF0Y2hlZCAocG9zc2libHkgb25seSB0aGUgZW5kIG9mIGxpbmUgY2hhcnMpLlxuICAgIGlmIChsaW5lLmxlbmd0aCA9PT0gMCkgYnJlYWs7XG5cbiAgICBjb25zdCBpbmRlbnRTaXplID0gaW5kZW50Lmxlbmd0aDtcbiAgICBjb25zdCBwcmV2U2l6ZSA9IHRvcE9mU3RhY2soKTtcblxuICAgIGNvbnN0IGluZGVudFBvcyA9IHBvcyArIGluZGVudFNpemU7XG5cbiAgICBpZiAoaW5kZW50U2l6ZSA+IHByZXZTaXplKSB7XG4gICAgICAvLyBJbmRlbnQgLS0gYWx3YXlzIG9ubHkgMS5cbiAgICAgIHN0YWNrLnB1c2goaW5kZW50U2l6ZSk7XG4gICAgICByZXN1bHRbaW5kZW50UG9zXSA9IDE7XG4gICAgfSBlbHNlIGlmIChpbmRlbnRTaXplIDwgcHJldlNpemUpIHtcbiAgICAgIC8vIERlZGVudCAtLSBjYW4gYmUgbXVsdGlwbGUgbGV2ZWxzLlxuICAgICAgY29uc3QgcHJldkxlbmd0aCA9IHN0YWNrLmxlbmd0aDtcbiAgICAgIHdoaWxlICh0b3BPZlN0YWNrKCkgIT09IGluZGVudFNpemUpIHtcbiAgICAgICAgc3RhY2sucG9wKCk7XG4gICAgICB9XG4gICAgICByZXN1bHRbaW5kZW50UG9zXSA9IC0xICogKHByZXZMZW5ndGggLSBzdGFjay5sZW5ndGgpO1xuICAgIH1cbiAgICBwb3MgKz0gbGluZS5sZW5ndGg7XG4gIH1cbiAgLy8gRW5zdXJlIHRoYXQgdGhlcmUgaXMgYSBtYXRjaGluZyBERURFTlQgZm9yIGV2ZXJ5IHJlbWFpbmluZyBJTkRFTlQuXG4gIGlmIChzdGFjay5sZW5ndGggPiAxKSB7XG4gICAgcmVzdWx0W3Bvc10gPSAxIC0gc3RhY2subGVuZ3RoO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG4iLCJpbXBvcnQgQnVpbHRJblJ1bGVzIGZyb20gJy4uL2Rpc3QvYnVpbHQtaW4tcnVsZXMuanMnO1xuaW1wb3J0IHtCdWlsZGVyfSBmcm9tICcuLi9zcmMvQnVpbGRlci5qcyc7XG5pbXBvcnQge0ZhaWx1cmV9IGZyb20gJy4uL3NyYy9GYWlsdXJlLmpzJztcbmltcG9ydCB7VGVybWluYWxOb2RlfSBmcm9tICcuLi9zcmMvbm9kZXMuanMnO1xuaW1wb3J0ICogYXMgcGV4cHJzIGZyb20gJy4uL3NyYy9wZXhwcnMuanMnO1xuaW1wb3J0IHtmaW5kSW5kZW50YXRpb259IGZyb20gJy4vZmluZEluZGVudGF0aW9uLmpzJztcbmltcG9ydCB7SW5wdXRTdHJlYW19IGZyb20gJy4vSW5wdXRTdHJlYW0uanMnO1xuXG5jb25zdCBJTkRFTlRfREVTQ1JJUFRJT04gPSAnYW4gaW5kZW50ZWQgYmxvY2snO1xuY29uc3QgREVERU5UX0RFU0NSSVBUSU9OID0gJ2EgZGVkZW50JztcblxuLy8gQSBzZW50aW5lbCB2YWx1ZSB0aGF0IGlzIG91dCBvZiByYW5nZSBmb3IgYm90aCBjaGFyQ29kZUF0KCkgYW5kIGNvZGVQb2ludEF0KCkuXG5jb25zdCBJTlZBTElEX0NPREVfUE9JTlQgPSAweDEwZmZmZiArIDE7XG5cbmNsYXNzIElucHV0U3RyZWFtV2l0aEluZGVudGF0aW9uIGV4dGVuZHMgSW5wdXRTdHJlYW0ge1xuICBjb25zdHJ1Y3RvcihzdGF0ZSkge1xuICAgIHN1cGVyKHN0YXRlLmlucHV0KTtcbiAgICB0aGlzLnN0YXRlID0gc3RhdGU7XG4gIH1cblxuICBfaW5kZW50YXRpb25BdChwb3MpIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZS51c2VyRGF0YVtwb3NdIHx8IDA7XG4gIH1cblxuICBhdEVuZCgpIHtcbiAgICByZXR1cm4gc3VwZXIuYXRFbmQoKSAmJiB0aGlzLl9pbmRlbnRhdGlvbkF0KHRoaXMucG9zKSA9PT0gMDtcbiAgfVxuXG4gIG5leHQoKSB7XG4gICAgaWYgKHRoaXMuX2luZGVudGF0aW9uQXQodGhpcy5wb3MpICE9PSAwKSB7XG4gICAgICB0aGlzLmV4YW1pbmVkTGVuZ3RoID0gTWF0aC5tYXgodGhpcy5leGFtaW5lZExlbmd0aCwgdGhpcy5wb3MpO1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIHN1cGVyLm5leHQoKTtcbiAgfVxuXG4gIG5leHRDaGFyQ29kZSgpIHtcbiAgICBpZiAodGhpcy5faW5kZW50YXRpb25BdCh0aGlzLnBvcykgIT09IDApIHtcbiAgICAgIHRoaXMuZXhhbWluZWRMZW5ndGggPSBNYXRoLm1heCh0aGlzLmV4YW1pbmVkTGVuZ3RoLCB0aGlzLnBvcyk7XG4gICAgICByZXR1cm4gSU5WQUxJRF9DT0RFX1BPSU5UO1xuICAgIH1cbiAgICByZXR1cm4gc3VwZXIubmV4dENoYXJDb2RlKCk7XG4gIH1cblxuICBuZXh0Q29kZVBvaW50KCkge1xuICAgIGlmICh0aGlzLl9pbmRlbnRhdGlvbkF0KHRoaXMucG9zKSAhPT0gMCkge1xuICAgICAgdGhpcy5leGFtaW5lZExlbmd0aCA9IE1hdGgubWF4KHRoaXMuZXhhbWluZWRMZW5ndGgsIHRoaXMucG9zKTtcbiAgICAgIHJldHVybiBJTlZBTElEX0NPREVfUE9JTlQ7XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5uZXh0Q29kZVBvaW50KCk7XG4gIH1cbn1cblxuY2xhc3MgSW5kZW50YXRpb24gZXh0ZW5kcyBwZXhwcnMuUEV4cHIge1xuICBjb25zdHJ1Y3Rvcihpc0luZGVudCA9IHRydWUpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMuaXNJbmRlbnQgPSBpc0luZGVudDtcbiAgfVxuXG4gIGFsbG93c1NraXBwaW5nUHJlY2VkaW5nU3BhY2UoKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBldmFsKHN0YXRlKSB7XG4gICAgY29uc3Qge2lucHV0U3RyZWFtfSA9IHN0YXRlO1xuICAgIGNvbnN0IHBzZXVkb1Rva2VucyA9IHN0YXRlLnVzZXJEYXRhO1xuICAgIHN0YXRlLmRvTm90TWVtb2l6ZSA9IHRydWU7XG5cbiAgICBjb25zdCBvcmlnUG9zID0gaW5wdXRTdHJlYW0ucG9zO1xuXG4gICAgY29uc3Qgc2lnbiA9IHRoaXMuaXNJbmRlbnQgPyAxIDogLTE7XG4gICAgY29uc3QgY291bnQgPSAocHNldWRvVG9rZW5zW29yaWdQb3NdIHx8IDApICogc2lnbjtcbiAgICBpZiAoY291bnQgPiAwKSB7XG4gICAgICAvLyBVcGRhdGUgdGhlIGNvdW50IHRvIGNvbnN1bWUgdGhlIHBzZXVkb3Rva2VuLlxuICAgICAgc3RhdGUudXNlckRhdGEgPSBPYmplY3QuY3JlYXRlKHBzZXVkb1Rva2Vucyk7XG4gICAgICBzdGF0ZS51c2VyRGF0YVtvcmlnUG9zXSAtPSBzaWduO1xuXG4gICAgICBzdGF0ZS5wdXNoQmluZGluZyhuZXcgVGVybWluYWxOb2RlKDApLCBvcmlnUG9zKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGF0ZS5wcm9jZXNzRmFpbHVyZShvcmlnUG9zLCB0aGlzKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBnZXRBcml0eSgpIHtcbiAgICByZXR1cm4gMTtcbiAgfVxuXG4gIF9hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZChydWxlTmFtZSwgZ3JhbW1hcikge31cblxuICBfaXNOdWxsYWJsZShncmFtbWFyLCBtZW1vKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgYXNzZXJ0Q2hvaWNlc0hhdmVVbmlmb3JtQXJpdHkocnVsZU5hbWUpIHt9XG5cbiAgYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlKGdyYW1tYXIpIHt9XG5cbiAgaW50cm9kdWNlUGFyYW1zKGZvcm1hbHMpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHN1YnN0aXR1dGVQYXJhbXMoYWN0dWFscykge1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNJbmRlbnQgPyAnaW5kZW50JyA6ICdkZWRlbnQnO1xuICB9XG5cbiAgdG9EaXNwbGF5U3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCk7XG4gIH1cblxuICB0b0ZhaWx1cmUoZ3JhbW1hcikge1xuICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gdGhpcy5pc0luZGVudCA/IElOREVOVF9ERVNDUklQVElPTiA6IERFREVOVF9ERVNDUklQVElPTjtcbiAgICByZXR1cm4gbmV3IEZhaWx1cmUodGhpcywgZGVzY3JpcHRpb24sICdkZXNjcmlwdGlvbicpO1xuICB9XG59XG5cbi8vIENyZWF0ZSBhIG5ldyBkZWZpbml0aW9uIGZvciBgYW55YCB0aGF0IGNhbiBjb25zdW1lIGluZGVudCAmIGRlZGVudC5cbmNvbnN0IGFwcGx5SW5kZW50ID0gbmV3IHBleHBycy5BcHBseSgnaW5kZW50Jyk7XG5jb25zdCBhcHBseURlZGVudCA9IG5ldyBwZXhwcnMuQXBwbHkoJ2RlZGVudCcpO1xuY29uc3QgbmV3QW55Qm9keSA9IG5ldyBwZXhwcnMuU3BsaWNlKEJ1aWx0SW5SdWxlcywgJ2FueScsIFthcHBseUluZGVudCwgYXBwbHlEZWRlbnRdLCBbXSk7XG5cbmV4cG9ydCBjb25zdCBJbmRlbnRhdGlvblNlbnNpdGl2ZSA9IG5ldyBCdWlsZGVyKClcbiAgICAubmV3R3JhbW1hcignSW5kZW50YXRpb25TZW5zaXRpdmUnKVxuICAgIC53aXRoU3VwZXJHcmFtbWFyKEJ1aWx0SW5SdWxlcylcbiAgICAuZGVmaW5lKCdpbmRlbnQnLCBbXSwgbmV3IEluZGVudGF0aW9uKHRydWUpLCBJTkRFTlRfREVTQ1JJUFRJT04sIHVuZGVmaW5lZCwgdHJ1ZSlcbiAgICAuZGVmaW5lKCdkZWRlbnQnLCBbXSwgbmV3IEluZGVudGF0aW9uKGZhbHNlKSwgREVERU5UX0RFU0NSSVBUSU9OLCB1bmRlZmluZWQsIHRydWUpXG4gICAgLmV4dGVuZCgnYW55JywgW10sIG5ld0FueUJvZHksICdhbnkgY2hhcmFjdGVyJywgdW5kZWZpbmVkKVxuICAgIC5idWlsZCgpO1xuXG5PYmplY3QuYXNzaWduKEluZGVudGF0aW9uU2Vuc2l0aXZlLCB7XG4gIF9tYXRjaFN0YXRlSW5pdGlhbGl6ZXIoc3RhdGUpIHtcbiAgICBzdGF0ZS51c2VyRGF0YSA9IGZpbmRJbmRlbnRhdGlvbihzdGF0ZS5pbnB1dCk7XG4gICAgc3RhdGUuaW5wdXRTdHJlYW0gPSBuZXcgSW5wdXRTdHJlYW1XaXRoSW5kZW50YXRpb24oc3RhdGUpO1xuICB9LFxuICBzdXBwb3J0c0luY3JlbWVudGFsUGFyc2luZzogZmFsc2UsXG59KTtcbiIsIi8vIEdlbmVyYXRlZCBieSBzY3JpcHRzL3ByZWJ1aWxkLmpzXG5leHBvcnQgY29uc3QgdmVyc2lvbiA9ICcxNy4xLjAnO1xuIiwiaW1wb3J0IG9obUdyYW1tYXIgZnJvbSAnLi4vZGlzdC9vaG0tZ3JhbW1hci5qcyc7XG5pbXBvcnQge2J1aWxkR3JhbW1hcn0gZnJvbSAnLi9idWlsZEdyYW1tYXIuanMnO1xuaW1wb3J0ICogYXMgY29tbW9uIGZyb20gJy4vY29tbW9uLmpzJztcbmltcG9ydCAqIGFzIGVycm9ycyBmcm9tICcuL2Vycm9ycy5qcyc7XG5pbXBvcnQge0dyYW1tYXJ9IGZyb20gJy4vR3JhbW1hci5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMuanMnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWwuanMnO1xuXG4vLyBMYXRlIGluaXRpYWxpemF0aW9uIGZvciBzdHVmZiB0aGF0IGlzIGJvb3RzdHJhcHBlZC5cblxuaW1wb3J0ICcuL3NlbWFudGljc0RlZmVycmVkSW5pdC5qcyc7IC8vIFRPRE86IENsZWFuIHRoaXMgdXAuXG5HcmFtbWFyLmluaXRBcHBsaWNhdGlvblBhcnNlcihvaG1HcmFtbWFyLCBidWlsZEdyYW1tYXIpO1xuXG5jb25zdCBpc0J1ZmZlciA9IG9iaiA9PlxuICAhIW9iai5jb25zdHJ1Y3RvciAmJlxuICB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmXG4gIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopO1xuXG5mdW5jdGlvbiBjb21waWxlQW5kTG9hZChzb3VyY2UsIG5hbWVzcGFjZSkge1xuICBjb25zdCBtID0gb2htR3JhbW1hci5tYXRjaChzb3VyY2UsICdHcmFtbWFycycpO1xuICBpZiAobS5mYWlsZWQoKSkge1xuICAgIHRocm93IGVycm9ycy5ncmFtbWFyU3ludGF4RXJyb3IobSk7XG4gIH1cbiAgcmV0dXJuIGJ1aWxkR3JhbW1hcihtLCBuYW1lc3BhY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ3JhbW1hcihzb3VyY2UsIG9wdE5hbWVzcGFjZSkge1xuICBjb25zdCBucyA9IGdyYW1tYXJzKHNvdXJjZSwgb3B0TmFtZXNwYWNlKTtcblxuICAvLyBFbnN1cmUgdGhhdCB0aGUgc291cmNlIGNvbnRhaW5lZCBubyBtb3JlIHRoYW4gb25lIGdyYW1tYXIgZGVmaW5pdGlvbi5cbiAgY29uc3QgZ3JhbW1hck5hbWVzID0gT2JqZWN0LmtleXMobnMpO1xuICBpZiAoZ3JhbW1hck5hbWVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBncmFtbWFyIGRlZmluaXRpb24nKTtcbiAgfSBlbHNlIGlmIChncmFtbWFyTmFtZXMubGVuZ3RoID4gMSkge1xuICAgIGNvbnN0IHNlY29uZEdyYW1tYXIgPSBuc1tncmFtbWFyTmFtZXNbMV1dO1xuICAgIGNvbnN0IGludGVydmFsID0gc2Vjb25kR3JhbW1hci5zb3VyY2U7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICB1dGlsLmdldExpbmVBbmRDb2x1bW5NZXNzYWdlKGludGVydmFsLnNvdXJjZVN0cmluZywgaW50ZXJ2YWwuc3RhcnRJZHgpICtcbiAgICAgICAgJ0ZvdW5kIG1vcmUgdGhhbiBvbmUgZ3JhbW1hciBkZWZpbml0aW9uIC0tIHVzZSBvaG0uZ3JhbW1hcnMoKSBpbnN0ZWFkLicsXG4gICAgKTtcbiAgfVxuICByZXR1cm4gbnNbZ3JhbW1hck5hbWVzWzBdXTsgLy8gUmV0dXJuIHRoZSBvbmUgYW5kIG9ubHkgZ3JhbW1hci5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdyYW1tYXJzKHNvdXJjZSwgb3B0TmFtZXNwYWNlKSB7XG4gIGNvbnN0IG5zID0gT2JqZWN0LmNyZWF0ZShvcHROYW1lc3BhY2UgfHwge30pO1xuICBpZiAodHlwZW9mIHNvdXJjZSAhPT0gJ3N0cmluZycpIHtcbiAgICAvLyBGb3IgY29udmVuaWVuY2UsIGRldGVjdCBOb2RlLmpzIEJ1ZmZlciBvYmplY3RzIGFuZCBhdXRvbWF0aWNhbGx5IGNhbGwgdG9TdHJpbmcoKS5cbiAgICBpZiAoaXNCdWZmZXIoc291cmNlKSkge1xuICAgICAgc291cmNlID0gc291cmNlLnRvU3RyaW5nKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgJ0V4cGVjdGVkIHN0cmluZyBhcyBmaXJzdCBhcmd1bWVudCwgZ290ICcgKyBjb21tb24udW5leHBlY3RlZE9ialRvU3RyaW5nKHNvdXJjZSksXG4gICAgICApO1xuICAgIH1cbiAgfVxuICBjb21waWxlQW5kTG9hZChzb3VyY2UsIG5zKTtcbiAgcmV0dXJuIG5zO1xufVxuXG4vLyBUaGlzIGlzIHVzZWQgYnkgb2htLWVkaXRvciB0byBpbnN0YW50aWF0ZSBncmFtbWFycyBhZnRlciBpbmNyZW1lbnRhbFxuLy8gcGFyc2luZywgd2hpY2ggaXMgbm90IG90aGVyd2lzZSBzdXBwb3J0ZWQgaW4gdGhlIHB1YmxpYyBBUEkuXG5leHBvcnQge2J1aWxkR3JhbW1hciBhcyBfYnVpbGRHcmFtbWFyfTtcblxuZXhwb3J0ICogZnJvbSAnLi9tYWluLWtlcm5lbC5qcyc7XG5leHBvcnQge0luZGVudGF0aW9uU2Vuc2l0aXZlIGFzIEV4cGVyaW1lbnRhbEluZGVudGF0aW9uU2Vuc2l0aXZlfSBmcm9tICcuL0luZGVudGF0aW9uU2Vuc2l0aXZlLmpzJztcbmV4cG9ydCB7b2htR3JhbW1hcn07XG5leHBvcnQge3BleHByc307XG5leHBvcnQge3ZlcnNpb259IGZyb20gJy4vdmVyc2lvbi5qcyc7XG4iXSwibmFtZXMiOlsiY29tbW9uLmlzU3ludGFjdGljIiwicGV4cHJzLkFwcGx5IiwiY29tbW9uLnBhZExlZnQiLCJjb21tb24uU3RyaW5nQnVmZmVyIiwiY29tbW9uLmFzc2VydCIsInV0aWwuZ2V0TGluZUFuZENvbHVtbiIsInV0aWwuZ2V0TGluZUFuZENvbHVtbk1lc3NhZ2UiLCJlcnJvcnMuaW50ZXJ2YWxTb3VyY2VzRG9udE1hdGNoIiwiY29tbW9uLmRlZmluZUxhenlQcm9wZXJ0eSIsImNvbW1vbi5yZXBlYXQiLCJwZXhwcnMuUEV4cHIiLCJwZXhwcnMuYW55IiwicGV4cHJzLmVuZCIsInBleHBycy5UZXJtaW5hbCIsInBleHBycy5SYW5nZSIsInBleHBycy5Vbmljb2RlQ2hhciIsInBleHBycy5BbHQiLCJwZXhwcnMuSXRlciIsInBleHBycy5MZXgiLCJwZXhwcnMuTG9va2FoZWFkIiwicGV4cHJzLk5vdCIsInBleHBycy5QYXJhbSIsInBleHBycy5TZXEiLCJCdWlsdEluUnVsZXMiLCJ1dGlsLmF3YWl0QnVpbHRJblJ1bGVzIiwiZXJyb3JzLnVuZGVjbGFyZWRSdWxlIiwiZXJyb3JzLmFwcGxpY2F0aW9uT2ZTeW50YWN0aWNSdWxlRnJvbUxleGljYWxDb250ZXh0IiwiZXJyb3JzLndyb25nTnVtYmVyT2ZBcmd1bWVudHMiLCJlcnJvcnMuaW5jb3JyZWN0QXJndW1lbnRUeXBlIiwiZXJyb3JzLmFwcGx5U3ludGFjdGljV2l0aExleGljYWxSdWxlQXBwbGljYXRpb24iLCJlcnJvcnMudW5uZWNlc3NhcnlFeHBlcmltZW50YWxBcHBseVN5bnRhY3RpYyIsImVycm9ycy5pbnZhbGlkUGFyYW1ldGVyIiwiZXJyb3JzLmluY29uc2lzdGVudEFyaXR5IiwicGV4cHJzLkV4dGVuZCIsImVycm9ycy5rbGVlbmVFeHBySGFzTnVsbGFibGVPcGVyYW5kIiwicGV4cHJzLk9wdCIsImNvbW1vbi5pc0xleGljYWwiLCJjb21tb24uYWJzdHJhY3QiLCJwZXhwcnMuU3BsaWNlIiwicGV4cHJzLlN0YXIiLCJwZXhwcnMuUGx1cyIsInV0aWwudW5pcXVlSWQiLCJlcnJvcnMubWlzc2luZ1NlbWFudGljQWN0aW9uIiwiY29tbW9uLnVuZXhwZWN0ZWRPYmpUb1N0cmluZyIsIm9obUdyYW1tYXIiLCJidWlsZEdyYW1tYXIiLCJlcnJvcnMud3JvbmdOdW1iZXJPZlBhcmFtZXRlcnMiLCJwZXhwcnMuQ2FzZUluc2Vuc2l0aXZlVGVybWluYWwiLCJlcnJvcnMuY2Fubm90T3ZlcnJpZGVVbmRlY2xhcmVkUnVsZSIsImR1cGxpY2F0ZVBhcmFtZXRlck5hbWVzIiwiZXJyb3JzLmR1cGxpY2F0ZVBhcmFtZXRlck5hbWVzIiwiZXJyb3JzLnRocm93RXJyb3JzIiwiZXJyb3JzLmR1cGxpY2F0ZVJ1bGVEZWNsYXJhdGlvbiIsImVycm9ycy5jYW5ub3RFeHRlbmRVbmRlY2xhcmVkUnVsZSIsImVycm9ycy5kdXBsaWNhdGVHcmFtbWFyRGVjbGFyYXRpb24iLCJlcnJvcnMudW5kZWNsYXJlZEdyYW1tYXIiLCJlcnJvcnMubXVsdGlwbGVTdXBlclNwbGljZXMiLCJjb21tb24udW5lc2NhcGVDb2RlUG9pbnQiLCJlcnJvcnMuaW52YWxpZENvZGVQb2ludCIsImVycm9ycy5ncmFtbWFyU3ludGF4RXJyb3IiXSwibWFwcGluZ3MiOiI7Ozs7OztFQUFBO0FBbUJBO0VBQ0E7RUFDQTtFQUNBO0FBQ0E7RUFDTyxTQUFTLFFBQVEsQ0FBQyxhQUFhLEVBQUU7RUFDeEMsRUFBRSxNQUFNLFVBQVUsR0FBRyxhQUFhLElBQUksRUFBRSxDQUFDO0VBQ3pDLEVBQUUsT0FBTyxXQUFXO0VBQ3BCLElBQUksTUFBTSxJQUFJLEtBQUs7RUFDbkIsUUFBUSxjQUFjO0VBQ3RCLFFBQVEsVUFBVTtFQUNsQixRQUFRLGdCQUFnQjtFQUN4QixRQUFRLHFDQUFxQztFQUM3QyxRQUFRLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSTtFQUM3QixRQUFRLEdBQUc7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LElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7RUNHanpHLE9BQU8sQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO0VBQ3BDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7O0FDSjFDLG1CQUFlLFVBQVUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQywrOUZBQSs5RixDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxrQ0FBa0MsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0VDTS9qbkIsTUFBTSxzQkFBc0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDNUIsS0FBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3JFO0VBQ0EsU0FBUyxZQUFZLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRTtFQUNoQztFQUNB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UyxDQUFDLENBQUMsUUFBUSxDQUFDLHNTQUFzUyxDQUFDLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FB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
