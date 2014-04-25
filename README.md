
Stryng
------
The methods available for string manipulation in javascript are scarce. Stryng manually inherits from the built-in `String` object, detects and fixes native non-spec compliant implementations, provides polyfills fulfilling ECMA 5 and 6 standards and lastly mixes in its own set of utility functions.

[![browser support](https://ci.testling.com/espretto/stryng.png)](https://ci.testling.com/espretto/Stryng)

Let me introduce
----------------

```
String.prototype.toStryng = function() {
  return new Stryng( this );
};

'The quick brown fox'.toStryng()
// now we are ready you may use
.stripRight( 'fox' )
// which leaves us with 'The quick brown ' - chaining on
.truncate( 15 )
// yields 'The quick...'
.split(' ')[1]
.capitalize()
// you knew "Quick..." was coming
.count('.')
// 3 dots 
```

wherever you forget to pass an argument expected to be a string `'undefined'` - as the result of calling `String( undefined )` - will be applied as the default. this derives from javascript's native behaviour.
```
'undefined'.contains();   // true
'undefined'.startsWith(); // true
'undefined'.endsWith();   // true
'undefined'.indexOf();    // 0
'undefined'.lastIndexOf();// same as the above
'undefined'.search();     // same as the above again

'this is yours'.replace('yours'); // 'this is undefined'

new RegExp().test('undefined'); // true
```
but there are of course exceptions to this
```
String(); // the empty string instead of 'undefined'
new String(); // luckily just the same as above
'this is '.concat(); // nothing changes, expected 'this is undefined'
```
the last example of the above probably derives from _String#concat_ being the gerenic _Array#concat_.

Documentation
-------------
please refer to either the [api documentation](http://espretto.github.io/Stryng), [grock's annotated source](http://espretto.github.io/Stryng/grock) or [docker's annotated source](http://espretto.github.io/Stryng/docker/README.md.html).

### notes on doc notation

- explain code _sections_ - preferrably with step-by-step lists - instead of annotating every single snippet
- use underscored variable names for privates, camel-case for the api.
- "this' string" always refers to the string wrapped by Stryng
- "returns", "results to", "evaluates to" or "yields" - do what you like
- unfortunately _docker_'s markdown parser doesn't support lists nested deeper than 2 levels
- read the annotated source and try to stick to its flavour

Credits
-------
Many thanks to the authors of

- [jsdoc template](https://github.com/davidshimjs/jaguarjs-jsdoc)
- [grock](https://github.com/killercup/grock)
- [docker](https://github.com/jbt/docker)

Roadmap
-------

- refactor tests
- integrate them into docs
- renew testling setup
- extend with plugin `Stryng.esc` for encoding conversions related to url parsing and slugifying

About toInteger
---------------

from the [spec](http://www.ecma-international.org/ecma-262/5.1/#sec-9.4):

1. let number be the result of calling `toNumber` on the input argument.
2. if number is `NaN`, return `+0`.
3. if number is `+0`, `−0`, `+Infinity`, or `−Infinity`, return number i.e. leave zeros and infinites untouched
4. Rireturn the result of computing `sign(number) × floor(abs(number))` i.e. ceil negatives, floor positives

in the following scenarios calling `Number.toInteger` can be replaced with faster inline comparisons:
### isNegative
```
var x = -0.5;
x < 0; // yields true
Number_toInteger( x ) < 0; // yields false because it ceils negative values and hence compares 0 < 0
```
the faster equivalent of the above `Number_toInteger` call and comparison is
```
x <= -1;
```
### isNotFinite
```
Number_toInteger( 'Infinity' ) == Infinity; // true
Number_toInteger( Infinity ) == Infinity; // true
Number_toInteger( 1/0 ) == Infinity; // true
```
the above expressions are the only ones evaluated to `Infinity`.
However, since `Number_toInteger` uses `toNumber` internally and simply return
results `+0`, `−0`, `+Infinity` and `−Infinity` of `toNumber` you may equally use
```
'Infinity' == Infinity; // true
Infinity == Infinity; // true
1/0 == Infinity; // true
```
to spare another function call. same goes for `-Infinity`.

### apply zero as minimum
instead of
```
x = Number_toInteger( x );
x = Math.max( 0, x );
```
you may equally do
```
x = x < 0 ? 0 : Math.floor( x ) || 0;
```
where the last bit zeros `NaN`.

worth a zealot's blog post..

