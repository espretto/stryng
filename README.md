
Stryng
------
The methods available for string manipulation in javascript are scarce. Stryng manually inherits from the build-in `String` object, fixes non-spec compliant implemenations, provides polyfills fulfilling ECMA 6 Standard and lastly mixes in its own set of utility functions.

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