
Stryng
------
for the purpose of manipulating strings in JavaScript, the built-in functions are neither sufficient nor consistent due to the language's minimalistic nature and browser incompatibilities respectively ( and yes, this will break your tongue if you read aloud ). Stryng to the rescue!

### compat

[![browser support](https://ci.testling.com/espretto/stryng.png)](https://ci.testling.com/espretto/Stryng)

### features

- manually inherits the native `String` namespace and prototype
- progressive enhancement to fullfill ECMA-Script 5 & 6 standards
- every function is available as both
  - static function for functional programming
  - instance method for object oriented programming
- (im-)mutability of Stryng instances
- seemless integration by overriding `toString` and `valueOf` on Stryng's prototype
- spec-like failproof type casting mechanisms and default values to prevent unexpected results

design considerations
---------------------

### constructing stryngs

Stryng instances wrap string primitives
```
var stryng = new Stryng(); // > '', wrapped, `new` operator is optional
stryng.isEmpty();          // > true
```
by default Stryng instances are immutable just like native strings.
```
stryng = stryng.append('key');  // reassign it, just like we would with natives
var immutable = stryng.clone(); // delegates to the constructor
immutable === stryng;           // > false, objects differ
immutable.equals( stryng )      // > true, contents equal
```
you can create mutable instances by either passing `true` to the Stryng constructor as the 2nd argument or call its curried variation on an existing instance.
```
var mutable = stryng.clone( true );     // equal to `Stryng( stryng, true )`
var referer = mutable.append('stroke'); // wrapped 'keystroke'
referer === mutable;                    // > true, both refer to the same object
mutable.equals( referer )               // > true, contents could never differ
```
to retrieve the wrapped value, take actions that imply a call to Stryng's `toString` or `valueOf` methods or call them directly.
```
stryng.toString(); // > 'key', as primitve, same as `stryng.valueOf()`
stryng + 'stroke'; // > 'keystroke', as primitive
```
infact Stryng integration is rather seemless
```
var object = {};
var n = Stryng( 123 );    // > '123', wrapped
object[ stryng ] = +n;    // parse wrapped '123' to number and assign to `object['key']`
JSON.stringify( object ); // '{"key":123}'
```
type checking however cannot be tricked into recognizing Stryngs as strings
```
typeof stryng;                 // > 'object'
stryng instanceof String;      // not even if it actually did occur along the prototype chain > false
object.toString.call( stryng ) // reliable as always > '[object Object]'

// for as long as Stryng is not another (iframe's) `window`'s property
stryng instanceof Stryng;  // > true
Stryng.isStryng( stryng ); // wraps the above for convenience
```

### type safety

#### strings
arguments expected to be strings are cast using `String( arg )`. as a direct consequence `'undefined'` will be applied as the default value. this decision derives from JavaScript's native behaviour:
```
var str = String( undefined ); // > 'undefined'

str.contains();   // > true
str.endsWith();   // > true
str.startsWith(); // > true
str.search();     // > 0
str.indexOf();    // > 0

'this is yours'.replace('yours'); // > 'this is undefined'
```
the only exception to this rule is Stryng's constructor.

#### numbers
arguments expected to be numbers are cast dependent on the use case. the spec basically follows two different approaches to parsing arguments to numbers which Stryng both applies reasonably.

1. _toUInt32_ where only positive numbers make sense and default to the more or less infinite value `Math.pow(2, 32) - 1`. `str.split(',')` for example applies this value to its 2nd argument as the default number of substrings to return.
2. _toInteger_ in every other scenario. this will cast with `Number`, apply zero for `NaN`, leave zero and infinites untouched or otherwise round towards zero i.e. ceil negatives and floor positives

Stryng does not cast itself if not necessary to max, min or validate arguments but leaves it up to native implementations instead.

Documentation
-------------
please refer to either the [api documentation](http://espretto.github.io/Stryng) or read Stryng's story - the [annotated source](http://espretto.github.io/Stryng/docker/README.md.html).

### notes on doc notation

- explain code _sections_ - preferrably with step-by-step lists - instead of annotating every single snippet
- use underscored variable names for privates, camel-case for the api.
- unfortunately _docker_'s markdown parser doesn't support lists nested deeper than 2 levels
- read the annotated source and try to stick to its flavour

Credits
-------
Many thanks to the authors of

- [jaguarjs-jsdoc](https://github.com/davidshimjs/jaguarjs-jsdoc)
- [docker](https://github.com/jbt/docker)