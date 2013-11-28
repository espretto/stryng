
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

None of the functions fail silently if invalidly used. Most error messages
will report the function name and arguments of the invocation. See the docs for
the signatures of the added functions and browse the web on how to use the natives.

Documentation
-------------

The docs are generated using [jsdoc3](https://github.com/jsdoc3/jsdoc) and included in this repo.
An ugly yet working version is available at the [project root](http://espretto.github.io/Stryng/) URL.
