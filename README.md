
Stryng
------
for the purpose of manipulating strings in JavaScript, the built-in functions are neither sufficient nor consistent due to the language's minimalistic nature and browser incompatibilities respectively. Stryng to the rescue!

### compat

[![browser support](https://ci.testling.com/espretto/stryng.png)](https://ci.testling.com/espretto/Stryng)

### features

- manually inherits the native `String` namespace and prototype
- progressive enhancement to fulfill ECMA-Script 5 & 6 standards
- every function is available as both
  - static function for functional programming
  - instance method for object oriented programming
- opt for (im-)mutability
- seemless integration by overriding `toString` and `valueOf` on Stryng's prototype
- spec-like failproof type casting mechanisms and default values to prevent unexpected results

show cases
----------
basic construction
```
var stryng = new Stryng(''),   // `new` is optional
  s = Stryng.noConflict(),     // create shortcut
  str = s('fox' /*, false */), // immutable by default
  cpy = str.clone(true);       // curried constructor, make mutable for faster chained operations

s(null) || s(undefined);       // both throw an error
```
produce URL slugs
```
var slug = Stryng(headline, true) // we're only interested in the end-result
  .clean()     // reduce groups of whitespace to a single space and trim
  .simplify()  // transcribe ligatures and diacritics from the Latin-1 Supplement
  .hyphenize() // apply hyphen as the word separator and lower-case
```
varying naming schemes
```
var headline = Stryng('the quick brown fox', false), // though immutable by default
  hyphenized = headline.hyphenize(),      // 'the-quick-brown-fox'
  camelCased = hyphenized.camelize(),     // 'theQuickBrownFox'
  under_scored = camelCased.underscore(), // 'the_quick_brown_fox'
  rotated = under_scored.hyphenize(),     // 'the-quick-brown-fox'
  classified = camelCased.capitalize();   // 'TheQuickBrownFox'
```
constructing regular expressions
```
var rePunct = Stryng('^\'"!@#$%&*-,.', true)
  .escapeRegex()
  .embrace('[]')
  .toRegex('g');

rePunct.source; // > "[\^'"\!@#\$%&\*\-\,\.]"
rePunct.global; // > true
```

### type safety

#### strings
arguments expected to be strings are cast using `String(arg)`. as a direct consequence `'undefined'` will be applied as the default value. this decision derives from JavaScript's native behaviour:
```
'this is yours'.replace('yours'); // > 'this is undefined'

var str = String(undefined); // > 'undefined'
str.contains();   // > true
str.endsWith();   // > true
str.startsWith(); // > true
str.search();     // > 0
str.indexOf();    // > 0
```
Stryng's constructor and every static function however will throw an error if passed `null` or `undefined` as the 1st argument.

#### numbers
arguments expected to be numbers are cast dependent on the use case. the spec basically follows two different approaches to parsing arguments to numbers which Stryng both applies reasonably.

1. _toUInt32_ where only positive numbers make sense and default to the more or less infinite value `Math.pow(2, 32) - 1`. for example `str.split(',')` applies this value to its 2nd argument as the default number of substrings to return.
2. _toInteger_ in every other scenario. this will cast with `Number`, apply zero for `NaN`, leave zero and infinites untouched or otherwise round towards zero i.e. ceil negatives and floor positives

Stryng does not cast itself if not necessary to max, min or validate arguments but leaves it up to native implementations instead - if safe - for performance reasons.

documentation
-------------
please refer to the [api documentation](http://espretto.github.io/Stryng).

Licence
-------
released under the [MIT licence](http://mariusrunge.com/mit-licence.html)
