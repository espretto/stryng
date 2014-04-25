
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