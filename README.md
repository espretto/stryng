
Stryng [![Build Status](https://travis-ci.org/espretto/stryng.svg?branch=master)](https://travis-ci.org/espretto/stryng)
------
for the purpose of manipulating strings in JavaScript, the built-in functions are neither sufficient nor consistent due to the language's minimalistic nature and browser incompatibilities respectively. Stryng to the rescue!

## features

- incorporates the native `String` namespace and prototype
- progressive enhancement to fulfill ECMA-Script 5 & 6 standards
- every function is (un-)curried for use as static or instance method for composure or chaining
- Stryng instances can be either mutable or immutable (default)
- seemless integration by overriding `toString` and `valueOf` on Stryng's prototype
- spec-like failproof type casting mechanisms and default values to prevent unexpected results

## roadmap

- [ ] split up monolith
- [ ] update ci hook
- [ ] find another generator for api documentation

## show cases
produce URL slugs
```js
var slug = Stryng(headline, true) // we're only interested in the end-result
  .clean()     // reduce groups of whitespace to a single space and trim
  .simplify()  // transcribe ligatures and diacritics from the Latin-1 Supplement
  .hyphenize() // apply hyphen as the word separator and lower-case
```
varying naming schemes
```js
var headline = Stryng('The quick brown fox', false) // though immutable by default
var hyphenized = headline.hyphenize()       // 'the-quick-brown-fox'
var camelCased = hyphenized.camelize()      // 'theQuickBrownFox'
var under_scored = camelCased.underscore()  // 'the_quick_brown_fox'
var rotated = under_scored.hyphenize()      // 'the-quick-brown-fox'
var classified = camelCased.capitalize()    // 'TheQuickBrownFox'
```
constructing regular expressions
```js
var rePunct = Stryng('^\'"!@#$%&*-,.', true)
  .escapeRegex()
  .embrace('[]')
  .toRegex('g')

rePunct.source  // > "[\^'"\!@#\$%&\*\-\,\.]"
rePunct.global  // > true
```

## type safety

### arrays
arguments expected to be arrays are always required.

### strings
arguments expected to be strings are cast using `String(arg)`. as a direct consequence `'undefined'` will be applied as the default value. this decision derives from JavaScript's native behaviour:
```js
var str = String(undefined);        // > 'undefined'

str.replace('und' /*, undefined*/)  // > 'undefinedefined'
str.startsWith(/* undefined */)     // > true
str.includes(/* undefined */)       // > true
str.indexOf(/* undefined */)        // > 0
str.search(/* undefined */)         // > 0
...
```
exceptions to this rule are `Stryng`'s constructor and static functions.

### numbers
arguments expected to be numbers are cast dependent on the use case. the spec basically follows two different approaches to parsing arguments to numbers which Stryng both applies reasonably.

1. `toUInt32` where only positive numbers make sense and default to the more or less infinite value `Math.pow(2, 32) - 1`. for example `str.split(',')` applies this value to its 2nd argument as the default maximum number of substrings to return.
2. `toInteger` in every other scenario. this will
   - cast with `Number`
   - return zero for `NaN`
   - return zero and &#xb1;Infinity _as is_
   - round towards zero i.e. ceil negatives and floor positives

Stryng does not cast itself if not necessary to max, min or validate arguments but leaves it up to native implementations instead - if safe - for performance reasons.

## testing
either run standard `npm test` from the commandline or run `npx gulp browserify` to produce a test-bundle to be executed in the browser. Simply serve the project root directory with e.g. `python3 -m http.server` and open `http://localhost:8000/test/`. the tests will run on pageload.
