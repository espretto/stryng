
This is a work in process
-------------------------
it's yet on guthub to leverage browserling for cross browser testing.

[![browser support](https://ci.testling.com/espretto/stryng.png)](https://ci.testling.com/espretto/Stryng)

The methods available for string manipulation in javascript are scarce. Stryng inherits from the build-in
javascript `String` object, and extends that existing set of functions with its own utilities.


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

Stryng applies these rules:

1. functions will throw errors if the number of arguments excluding those with default values
   is lower than the required minimum
2. null checks on instances to work on are only performed if the function code does
   not already provide for it by e.g. accessing the `length` property of strings which would throw a `TypeError`.
3. arguments expected to be strings are ensured to be implicitely parsed by native methods
   or explicitely by calling `String(value)`.
4. arguments expected to be numbers are always parsed by [`Stryng.toInt`](http://espretto.github.io/Stryng/#toInt)
   which is total / has an answer to no matter what you throw at it.
5. arguments expected to be positive numbers are always parsed by [`Stryng.toInt`](http://espretto.github.io/Stryng/#toInt)
   as well but default to zero if the result is negative.
6. defaults only apply when the input is missing. for ease of development and
   performance consideration (accessing arguments.length is slow) though values `null` and `undefined` are regarded the same!

polyfills are intended to produce the same results except they only know of one error type to throw.

if you want to satisfy the requirement of the first value to be a string
and not rely on its duck-type you might rather use OOP style like

`Stryng(someValue).someMethod(with, some, args);`

the constructor does parse the input using `String(value)`
and defaults to the empty string.

Documentation
-------------

The docs are generated using [jsdoc3](https://github.com/jsdoc3/jsdoc) and included in this repo.
An ugly yet working version is available at the [project root](http://espretto.github.io/Stryng/) URL.
