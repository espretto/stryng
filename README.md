
This is a work in process
-------------------------
it's yet on github to leverage browserling for cross browser testing.

[![browser support](https://ci.testling.com/espretto/stryng.png)](https://ci.testling.com/espretto/Stryng)

The methods available for string manipulation in javascript are scarce. Stryng manually inherits from the build-in javascript `String` object, and extends that existing set of functions with its own utilities.


How it works
------------
Since it's not possible to inherit from String by
prototype assignment, Stryng statically detects the existence of all methods available by ECMAScript 6 (Harmony).


Inverted signatures are not really intuitive but shine when it comes to
functional programming.

Error Reports
-------------

The API is designed to throw Errors where arguments passed would produce unexpected results.
However, the degree of code integrity is not meant to exceed javascript's for reasons - naturally - of my own picking:

1. calling `Object.prototype.toString` on every argument of every function is costly
2. trying to introduce strict typing into a loosely typed language
   rather denies the benefits of implicit overloading than providing comfort

In the end the API comsumer needs to know how values get parsed and the simpler
*or* - in case of javascript - notorious the rules are, the faster he understands the inner workings.
It then relies on the programmer's experience and discipline to adhere a *good* code style.

polyfills are intended to produce the same results except they only know of one error type to throw.

Documentation
-------------

The docs are generated using [jsdoc3](https://github.com/jsdoc3/jsdoc) and are included in this repo.
An ugly yet working version is available at the [project root](http://espretto.github.io/Stryng/) URL.

Compat
------
Cross-browser: works on IE6+, Firefox, Safari, Chrome, Opera.
Standalone. Single global with no prototype extensions or shims.

Usage
-----

wherever a string is expected, "undefined" will be the default as the result of `String(undefined)`

As the astute reader may have noticed:
1. defaults apply if no value, null or undefined is passed
2. arguments expected to be strings are converted to strings first - hence the default string is "undefined"
3. arguments expected to be numbers are either converted by spec compliant toInteger or toUint32 - hence the default number is zero (or the reasonable maximum in some cases)