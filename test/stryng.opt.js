// usage: node --trace_opt --trace_deopt --allow-natives-syntax optest.js

var sprintf = require('util').format;
var expect = require('expect.js');
var Stryng = require('./../src/stryng.js');

/* global describe, it*/

expect.Assertion.prototype.withArguments = function (args) {
  this.obj.__args__ = args;
  return this;
};

expect.Assertion.prototype.optimizable = function () {
  var fn = this.obj,
      args = this.obj.__args__,
      isOptimizable,
      status,
      statusText,
      statusTexts = [
        false,
        'optimized',
        'not optimized',
        'always optimized',
        'never optimized',
        false,
        'maybe deoptimized'
      ];

  delete fn.__args__;

  switch(args.length){
    case 0: fn(); break;
    case 1: fn(args[0]); break;
    case 2: fn(args[0], args[1]); break;
    case 3: fn(args[0], args[1], args[2]); break;
    case 4: fn(args[0], args[1], args[2], args[3]); break;
  }

  switch(args.length){
    case 0: fn(); break;
    case 1: fn(args[0]); break;
    case 2: fn(args[0], args[1]); break;
    case 3: fn(args[0], args[1], args[2]); break;
    case 4: fn(args[0], args[1], args[2], args[3]); break;
  }

  %OptimizeFunctionOnNextCall(fn);

  switch(args.length){
    case 0: fn(); break;
    case 1: fn(args[0]); break;
    case 2: fn(args[0], args[1]); break;
    case 3: fn(args[0], args[1], args[2]); break;
    case 4: fn(args[0], args[1], args[2], args[3]); break;
  }

  status = %GetOptimizationStatus(fn);
  statusText = statusTexts[status] || 'unknown optimziation status';
  isOptimizable = status === 1 || status === 3;

  this.assert(
    isOptimizable,
    function () { return sprintf('got unexpected "%s"', statusText); },
    function () { return sprintf('got unexpected "%s"', statusText); }
  );
};

describe('Stryng - ', function () {

  it('constructor should be optimizable', function () {
    expect(Stryng).withArguments(['fox']).to.be.optimizable();
  });

  (function (tuples) {

    tuples.forEach(function (tuple) {
      var fnName = tuple.shift(),
          fn = Stryng[fnName],
          should = sprintf('%s with args %s should be optimizable',
                           fnName, JSON.stringify(tuple));

      it(should, function () {
        expect(fn).withArguments(tuple).to.be.optimizable();
      });
    });

  }([
  // true extensions
  // ---------------
    ['append', 'foo', 'bar', true]
  , ['camelize', 'quick brown fox']
  , ['capitalize', 'foo']
  , ['chr', [65, 66, 67]]
  , ['clean', ' quick  fox ']
  , ['count', 'foo', 'o']
  , ['countMultiple', 'foo', ['o', 'f', 'g']]
  , ['delimit', ',', ['a', 'b', 'c']]
  , ['embrace', 'foo', '()']
  , ['equals', 'foo', 'foo']
  , ['escapeRegex', '.*?']
  , ['exchange', 'foo', 'o', 'u']
  , ['exchangeLeft', 'foo', 'o', 'u', 1]
  , ['exchangeRight', 'foo', 'o', 'u', 1]
  , ['fromCharCode', 65]
  , ['hyphenize', 'quick brown fox']
  , ['iequals', 'foo', 'FOO']
  , ['insert', 'foo', -1, 'o']
  , ['isBlank', '\t']
  , ['isEmpty', '']
  , ['isFloat', '1.0e-3']
  , ['isStryng', Stryng('foo')]
  , ['just', 'foo', 5, ' ']
  , ['justLeft', 'foo', 5, ' ']
  , ['justRight', 'foo', 5, ' ']
  , ['ord', 'foo']
  , ['prepend', 'foo', 'baz', true]
  , ['random', 10]
  , ['reverse', 'foo']
  , ['simplify', 'TODO']
  , ['splitAt', 'foo', [1, 2]]
  , ['splitLeft', 'foo', 'o', 1]
  , ['splitLines', 'foo\r\nbar']
  , ['splitRight', 'foo', 'o', 1]
  , ['strip', ' foo ', ' ']
  , ['stripLeft', 'oofoo', 'o', 2]
  , ['stripRight', 'oofoo', 'o', 2]
  , ['toRegex', 'foo', 'gim']
  , ['truncate', 'foooooooooooo', 10, '...']
  , ['underscore', 'quick brown fox']
  , ['wrap', 'foo', '"']

  // eventually shimmed
  // ------------------
  , ['endsWith', 'foo', 'o']
  , ['includes', 'foo', 'o']
  , ['quote', 'foo']
  , ['repeat', 'foo', 3]
  , ['startsWith', 'foo', 'f']
  , ['substr', 'foo', -1, 1]
  , ['trim', ' foo ']
  , ['trimLeft', ' foo']
  , ['trimRight', 'foo ']
  , ['unquote', '"foo"']

  // adapted natives
  // ---------------
  , ['charAt', 'foo', 0]
  , ['charCodeAt', 'foo', 0]
  , ['concat', 'foo', 'oo']
  //, ['fromCodePoint', ['foo']
  , ['indexOf', 'foo', 'o']
  , ['lastIndexOf', 'foo', 'o']
  , ['localeCompare', 'foo', 'goo']
  , ['match', 'foo', /(o)/g]
  , ['replace', 'foo', /o/g, 'u']
  , ['search', 'foo', 'o']
  , ['slice', 'foo', 1]

  // TODO yet not optimizable for unknown reason
  // , ['split', 'foo', 'o', 1]
  // , ['substring', 'foo', 1, 2]
  // , ['toLocaleLowerCase', 'FOO']
  // , ['toLocaleUpperCase', 'foo']
  // , ['toLowerCase', 'FOO']
  // , ['toUpperCase', 'foo']
  ]));

});