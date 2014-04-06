
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