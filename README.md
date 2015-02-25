
Stryng
------
for the purpose of manipulating strings in JavaScript, the built-in functions are neither sufficient nor consistent due to the language's minimalistic nature and browser incompatibilities respectively. Stryng to the rescue!

### features

- incorporates the native `String` namespace and prototype
- progressive enhancement to fulfill ECMA-Script 5 & 6 standards
- every function is (un-)curried for use as static or instance method for composure or chaining
- Stryng instances can be either mutable or immutable (default)
- seemless integration by overriding `toString` and `valueOf` on Stryng's prototype
- spec-like failproof type casting mechanisms and default values to prevent unexpected results

quick reference
---------------

Stryng adopts native static and instance methods and adds another ~40 methods on top. for the full reference, please refer to the [api documentation](http://espretto.github.io/stryng).

method | static | instance | shim | arguments
:--- | --- | --- | --- | ---
__append__ | x | x | | tail, ignoreIfEndsWith
__camelize__ | x | x | |
__capitalize__ | x | x | |
charAt | x | x | | index
charCodeAt | x | x | | index
__chr__ | x | | |
__clean__ | x | x | |
__clone__ | | x | | isMutable
codePointAt | x | x | | index
concat | x | x | | tail
contains | x | x | x | fromIndex
__count__ | x | x | | search
__countMultiple__ | x | x | | [search, searc, sear, ...]
__embrace__ | x | x | | `'()'`, `'[]'`, `'{}'` etc.
endsWith | x | x | x | fromIndex
__equals__ | x | x | | comparable
__iequals__ | x | x | | comparable (ignore case)
__escapeRegex__ | x | x |
__exchange__ | x | x | | replacee, replacement
__exchangeLeft__ | x | x | | replacee, replacement, times
__exchangeRight__ | x | x | | replacee, replacement, times
fromCharCode | x | | | ordinal
fromCodePoint | x | | | ordinal
__hyphenize__ | x | x | |
indexOf | x | x | | fromIndex
__insert__ | x | x | | insertion, index
__isBlank__ | x | x |
__isEmpty__ | x | x |
__isFloat__ | x | x |
__join__ | x | x | | [str, st, s, ...]
__just__ | x | x | | maxLength, filler
__justLeft__ | x | x | | maxLength, filler
__justRight__ | x | x | | maxLength, filler
lastIndexOf | x | x | | fromIndex
localeCompare | x | x | | comparable
match | x | x | | regex
normalize | x | x |
__ord__ | x | x |
__prepend__ | x | x | | head, ignoreIfStartsWith
quote | x | x | x
__random__ | x | | | length, fromCharCode, toCharCode
repeat | x | x | x | times
replace | x | x | x | regex/string, callback/fstring
__reverse__ | x | x |
search | x | x | | regex/string
__simplify__ | x | x |
slice | x | x | | fromIndex, toIndex
split | x | x | | regex, string
__splitAt__ | x | x | | idx, id, i, ...
__splitLeft__ | x | x | | delimiter, times
__splitLines__ | x | x | |
__splitRight__ | x | x | | delimiter, times
startsWith | x | x | x | head, fromIndex
__strip__ | x | x | | removee, times
__stripLeft__ | x | x | | removee, times
__stripRight__ | x | x | | removee, times
substr | x | x | x | fromIndex, length
substring | x | x | | fromIndex, toIndex
toLocaleLowerCase | x | x | |
toLocaleUpperCase | x | x | |
toLowerCase | x | x | |
__toRegex__ | x | x | | flags g/m/i/s/y
__toString__ | x | x | |
toUpperCase | x | x | |
trim | x | x | x | x |
trimLeft | x | x | x |
trimRight | x | x | x |
__truncate__ | x | x | | maxLength, ellipsis
__underscore__ | x | x | |
unquote | x | x | x |
__valueOf__ | x | x | |
__wrap__ | x | x | | pre-/suffix, times

show cases
----------
basic construction
```js
var stryng = new Stryng('')    // `new` is optional
  s = Stryng.noConflict(),     // create shortcut
  str = s('fox' /*, false */), // immutable by default
  cpy = str.clone(true);       // curried constructor, make mutable for faster chained operations

s(null) || s(undefined);       // both throw an error
```
produce URL slugs
```js
var slug = Stryng(headline, true) // we're only interested in the end-result
  .clean()     // reduce groups of whitespace to a single space and trim
  .simplify()  // transcribe ligatures and diacritics from the Latin-1 Supplement
  .hyphenize() // apply hyphen as the word separator and lower-case
```
varying naming schemes
```js
var headline = Stryng('the quick brown fox', false), // though immutable by default
  hyphenized = headline.hyphenize(),      // 'the-quick-brown-fox'
  camelCased = hyphenized.camelize(),     // 'theQuickBrownFox'
  under_scored = camelCased.underscore(), // 'the_quick_brown_fox'
  rotated = under_scored.hyphenize(),     // 'the-quick-brown-fox'
  classified = camelCased.capitalize();   // 'TheQuickBrownFox'
```
constructing regular expressions
```js
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
```js
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

1. `toUInt32` where only positive numbers make sense and default to the more or less infinite value `Math.pow(2, 32) - 1`. for example `str.split(',')` applies this value to its 2nd argument as the default maximum number of substrings to return.
2. `toInteger` in every other scenario. this will cast with `Number`, apply zero for `NaN`, leave zero and infinites untouched or otherwise round towards zero i.e. ceil negatives and floor positives

Stryng does not cast itself if not necessary to max, min or validate arguments but leaves it up to native implementations instead - if safe - for performance reasons.

Licence
-------
released under the [MIT licence](http://mariusrunge.com/mit-licence.html)
