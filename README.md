
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

wherever you forget to pass an argument expected to be a string `'undefined'` as the result of calling `String( undefined )` will be applied as the default. this derives from javascript's native behaviour.
```
'undefined'.contains(); // true
'undefined'.startsWith(); // true
'undefined'.endsWith(); // true
'undefined'.indexOf(); // 0 ( instead of ? )
'undefined'.lastIndexOf(); // same as the above
'undefined'.search(); // same as the above again
'this is yours'.replace('yours'); // 'this is undefined'
new RegExp().test('undefined'); // true
```
but there are of course exceptions to this
```
'this is '.concat(); // 'this is ' instead of 'this is undefined'
'start_undefined_end'.split(); // ['start_undefined_end'] instead of ['start_', '_end']
```

Documentation
-------------
please refer to either the [api documentation](http://espretto.github.io/Stryng/index.html) or the [annotated source](http://espretto.github.io/Stryng/grock).

Credits
-------
Many thanks to the authors of
- [jsdoc template](https://github.com/davidshimjs/jaguarjs-jsdoc)
- [grock](https://github.com/killercup/grock)

Roadmap
-------

- refactor tests
- integrate them into docs
- renew testling setup
- extend with plugin `Stryng.esc` for encoding conversions related to url parsing and slugifying