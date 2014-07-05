
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
- opt for (im-)mutable Stryng instances
- seemless integration by overriding `toString` and `valueOf` on Stryng's prototype
- spec-like failproof type casting mechanisms and default values to prevent unexpected results

design considerations
---------------------

### constructing stryngs

Stryng instances wrap string primitives
```
var stryng = new Stryng(''); // wrapped empty string, `new` operator is optional
stryng.isEmpty();            // > true
```
by default Stryng instances are immutable just like native strings.
```
var immutable = stryng.append(''); // reassign it, just like we would with natives
immutable === stryng;              // > false, objects differ
immutable.equals(stryng)           // > true, contents equal
```
you can create mutable instances by either passing `true` to the Stryng constructor as the 2nd argument or call its curried variation on an existing instance.
```
var mutable = stryng.clone(true);    // equal to `Stryng(stryng, true)`
var referer = mutable.append('fox'); // 'fox'
referer === mutable;                 // > true, both refer to the same object
mutable.equals(referer);             // > true, contents could never differ
```
to retrieve the wrapped value, take actions that imply a call to Stryng's `toString` or `valueOf` methods or call them directly.
```
stryng.toString(); // > 'fox', as primitve, same as `stryng.valueOf()`
stryng + 'tail';   // > 'foxtail', as primitive
```
infact Stryng integration is rather seemless
```
var object = {};
var key = Stryng('num'); // 'num'
var n = Stryng(123);     // '123'
object[key] = +n;        // parse '123' to number and assign to `object['num']`
JSON.stringify(object);  // > '{"num":123}'
```
type checking however cannot be tricked into recognizing Stryngs as natives
```
typeof stryng;               // > 'object'
stryng instanceof String;    // > false, not even if it actually did occur along the prototype chain
object.toString.call(stryng) // > '[object Object]', reliable as always

// for as long as Stryng is not another (iframe's) `window`'s property
stryng instanceof Stryng; // > true
Stryng.isStryng(stryng);  // > true, wraps the above for convenience
```

### type safety

#### strings
arguments expected to be strings are cast using `String(arg)`. as a direct consequence `'undefined'` will be applied as the default value. this decision derives from JavaScript's native behaviour:
```
var str = String(undefined); // primitive 'undefined'

str.contains();   // > true
str.endsWith();   // > true
str.startsWith(); // > true
str.search();     // > 0
str.indexOf();    // > 0

'this is yours'.replace('yours'); // > 'this is undefined'
```
Stryng's constructor is an exception to this rule. passing in `null` or `undefined` will throw an error.

#### numbers
arguments expected to be numbers are cast dependent on the use case. the spec basically follows two different approaches to parsing arguments to numbers which Stryng both applies reasonably.

1. _toUInt32_ where only positive numbers make sense and default to the more or less infinite value `Math.pow(2, 32) - 1`. `str.split(',')` for example applies this value to its 2nd argument as the default number of substrings to return.
2. _toInteger_ in every other scenario. this will cast with `Number`, apply zero for `NaN`, leave zero and infinites untouched or otherwise round towards zero i.e. ceil negatives and floor positives

Stryng does not cast itself if not necessary to max, min or validate arguments but leaves it up to native implementations instead - if safe - for performance reasons.

show cases
----------
produce URL slugs
```
Stryng(headline, true) // we are only interested in the last function's output
  .clean()     // reduce groups of whitespace to a single space and trim
  .simplify()  // replace ligatures and diacritics from the Latin-1 Supplement with ASCII printables
  .hyphenize() // apply hyphen as the word separator and lower-case
```
varying the format
```
var headline     = Stryng('the quick brown fox', false), // though immutable by default
    hyphenized   = headline.hyphenize(),     // 'the-quick-brown-fox'
    camelCased   = hyphenized.camelize(),    // 'theQuickBrownFox'
    under_scored = camelCased.underscore(),  // 'the_quick_brown_fox'
    rotated      = under_scored.hyphenize(), // 'the-quick-brown-fox'

    classified   = camelCased.capitalize();  // 'TheQuickBrownFox'
```

please refer to the tests for more examples.

documentation
-------------
please refer to either the [api documentation](http://espretto.github.io/Stryng) or read Stryng's story - the [annotated source](http://espretto.github.io/Stryng/docker/README.md.html).

### notes on doc notation

- explain code _sections_ - preferrably with step-by-step lists - instead of annotating every single snippet
- use underscored variable names for privates, camel-case for the api.
- unfortunately _docker_'s markdown parser doesn't support lists nested deeper than 2 levels
- read the annotated source and try to stick to its flavour

Licence
-------
released under the [MIT licence](http://mariusrunge.com/mit-licence.html);
