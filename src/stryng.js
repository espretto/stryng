
// if the necessity of manipulating strings correctly in JavaScript arises
// you will find yourself dealing with weird native behaviors,
// constructing even weirder workarounds to tweak them into being consistent
// and easy to handle. _Stryng_ provides these utility functions.
// [article on generics](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String#String_generic_methods)
// lybrary, functyon, obyect, stryng, nymber, javascrypt, array, boolyan

// TODO performance check
// function call with passing a reference to a Stryng object or a string primitive

// leverage uglifyjs' ability to declare global variables
if (typeof DEBUG === 'undefined') DEBUG = true;

// baseline setup
// ==============

var // one to var them all

// used to access native instance methods
array, object, string, regex, func,

// current version
VERSION = string = '0.0.1',

// used for input validation
INFINITY = 1 / 0,

// used to limit _String.fromCharCode_
MAX_CHARCODE = 65535, // Math.pow(2, 16) - 1

// used to convert to string
String = func = string.constructor,

// methods _Stryng_ hopes to adopt
methods = array = (
+ 'charAt,'
+ 'charCodeAt,'
+ 'codePointAt,'
+ 'concat,'
+ 'contains,'
+ 'endsWith'
+ 'indexOf,'
+ 'lastIndexOf,'
+ 'localeCompare,'
+ 'match,'
+ 'normalize,'
+ 'replace,'
+ 'search,'
+ 'slice,'
+ 'split,'
+ 'startsWith,'
+ 'substr,'
+ 'substring,'
+ 'toLocaleLowerCase,'
+ 'toLocaleUpperCase,'
+ 'toLowerCase,'
+ 'toUpperCase,'
+ 'trim,'
+ 'trimLeft,'
+ 'trimRight'
).split( ',' ),

// methods which's native implementations to override if necessary
shim_methods = [],

// inner module to hold type/class check functions.
is = object = {},

// method shortcuts
// ================
// create quick access variables for both native static functions
// and instance methods. polyfills are reduced in functionality and byte-size.
// they are thus __for internal use only__ and neither populated onto
// native prototypes nor intended to be spec-compliant.

// static methods
// --------------

JSON_stringify       = typeof JSON !== 'undefined' && JSON.stringify,
Math_floor           = Math.floor,
Math_random          = Math.random,
String_fromCharCode  = String.fromCharCode,
String_fromCodePoint = String.fromCodePoint,

Object_defineProperty = ( function( defineProperty ) {

  // - try to define a dummy property on an object literal which fails
  //   - either in case `defineProperty` isn't available
  //   - or only DOM objects are allowed as first argument
  // - if successful, return the reference to that function
  // - implicitely return `undefined` otherwise
  try {
    defineProperty( {}, string, { value: 1 } );
    return defineProperty;
  } catch ( e ) {}

} )( Object.defineProperty ),

// instance methods
// ----------------

array_forEach = array.forEach || function( iterator ) {
 
  var array = this, i = array.length;

  while( i-- ) iterator( array[ i ] );
},

// - fast forwardly iterate over this.
//   do not cache `this.length` since it may change.
// - let `item` be this's element at index `i`
// - if `item` is iterable
//   - unshift the index `i` and `1`
//     to comply with the signature of _Array#splice_
//   - replace the iterable item with its contents ( in situ )
//   - do not increment the index in order to process the first
//     element of `item`'s contents in the next iteration
// - go for the next item otherwise
// - return `this` -- mutated
array_flatten = array.flatten || function(){
  
  var array = this, i = 0, item;

  while ( i !== array.length ) {
    item = array[ i ];
    if ( is.Array( item ) ) {
      item.unshift( i, 1 );
      array_splice.apply( array, item );
    } else {
      i++;
    }
  }
  return array;
}

array_push      = array.push, // faster than `array = array.concat( items )`
array_slice     = array.slice,
array_splice    = array.splice,
array_unshift   = array.unshift,
function_call   = func.call,
object_toString = object.toString,

// make this one pretty for the w3c wishlist.
// used in favor of the composition of _Array#forEach_ and _Object.keys_.
object_forOwn = function( iterator, context ) {
  
  var object = this, key, return_value;

  if( object == null ){
    throw new TypeError('can\'t convert ' + object + ' to object');
  }

  object = Object( object );

  for ( key in object ) {
    if ( object.hasOwnProperty( key ) ) {
      return_value = iterator.call( context, object[ key ], key, object );
      if( return_value === false ){
        break;
      }
    }
  }
},

// regular expressions
// ===================

// used by [Stryng#endsWith](#endsWith)
re_source_matches_end = regex = /[^\\]\$$/,

// the whitespace shim
// -------------------
// native implementations of _String#trim_ might miss out
// on some of the more exotic characters considered [whitespace][1],
// [line terminators][2] or the mysterious ["Zs"](http://www.fileformat.info/info/unicode/category/Zs/list.html).
// this section detects those flaws and constructs the regular expressions used
// in the polyfills and others - [Stryng#splitLines](#splitLines) in particular.
// Many thanks to the authors of [faster trim][4] and [whitespace deviations][5].
// 
// - let `re_whitespace` be the native white space matcher.
// - iterate over our white space characters
// - add all whitespace characters not recognized
//   as such to the matcher's source.
// - if the native implementation is not `is_spec_compliant`,
//   reconstruct the above regular expressions and mark
//   their associated methods as _to be shimmed_
//   
// [1]: http://www.ecma-international.org/ecma-262/5.1/#sec-7.2
// [2]: http://www.ecma-international.org/ecma-262/5.1/#sec-7.3
// [4]: http://blog.stevenlevithan.com/archives/faster-trim-javascript
// [5]: http://perfectionkills.com/whitespace-deviations/

re_no_whitespace = /\S/,
re_trim_left     = /^\s\s*/,
re_trim_right    = /\s*\s$/,
re_linebreaks    = /\n|\r(?!\n)|\u2028|\u2029|\r\n/g;

(function(){

  var

  is_spec_compliant = true,
  re_whitespace = /\s/,
  re_whitespace_source = re_whitespace.source,

  whitespace = (''
  + '\t'  // '\u0009' tab
  + '\n'  // '\u000A' line feed
  + '\13' // '\u000B' vertical tab
  + '\f'  // '\u000C' form feed
  + '\r'  // '\u000D' carriage return
  + ' '   // '\u0020' space

  + '\xA0' // NBSP
  + '\u1680\u180E\u2000\u2001'
  + '\u2002\u2003\u2004\u2005'
  + '\u2006\u2007\u2008\u2009'
  + '\u200A\u202F\u205F\u3000'

  + '\u2028' // line separator
  + '\u2029' // paragraph separator
  + '\uFEFF' // BOM - byte order mark
  );

  array_forEach.call( whitespace, function( chr ) { // Array#forEach is generic

    if ( !re_whitespace.test( chr ) ){
      re_whitespace_source += chr;
      is_spec_compliant = false;
    }

  } );

  if ( !is_spec_compliant ) {

    shim_methods.push( 'trim', 'trimRight', 'trimLeft' );

    re_no_whitespace = new RegExp( '[^' + re_whitespace_source + ']' );
    re_trim_left     = new RegExp( '^[' + re_whitespace_source + '][' + re_whitespace_source + ']*' );
    re_trim_right    = new RegExp( '[' + re_whitespace_source + ']*[' + re_whitespace_source + ']$' );
  }

}());

// the `substr` check
// ------------------
// check to see if the native implementation
// correctly deals with negative indices.
// mark as _to be shimmed_ if it doesn't.

if ( 'xy'.substr( -1 ) !== 'y' ) shim_methods.push( 'substr' );

// type safety
// ===========
// the inner module `is` holds type checks. this is an excerpt from
// my [gist](https://gist.github.com/esnippo/9960508) inspired by the
// [jQuery](http://jquery.com) and [underscore](http://underscorejs.org) libraries.
// 
// - provide quick access to precomputed `repr` within _Array#forEach_ closure
// - early exit on "falsies"
// - apply native implementations where available
// - fix old webkit's bug where `typeof regex` yields `'function'` 

array_forEach.call( [ 'Array', 'Function', 'RegExp' ], function( klass ) {

  var repr = '[object ' + klass + ']';
  is[ klass ] = function( any ) {
    return any && object_toString.call( any ) === repr;
  };

} );

is.Array = Array.isArray || is.Array;

if ( typeof regex === 'object' ) {
  is.Function = function( any ) {
    return any && typeof any === 'function';
  };
}

// utility functions
// =================
// 
// toInteger
// ---------
// fully [spec](http://www.ecma-international.org/ecma-262/5.1/#sec-9.4) compliant
// implementation of `toInteger`, tested and benchmarked at [jsperf](http://jsperf.com/to-integer/11).
// 
// 1. let number be the result of calling `toNumber` on the input argument.
// 2. if number is `NaN`, return `+0`.
// 3. if number is `+0`, `−0`, `+Infinity`, or `−Infinity`, return number i.e. leave zeros and infinites untouched
// 4. Rireturn the result of computing `sign(number) × floor(abs(number))` i.e. ceil negatives, floor positives
// 
// in the following scenarios calling `toInteger` can be replaced with faster inline comparisons:
// ### isNegative
// ```
// var x = -0.5;
// x < 0; // yields true
// toInteger( x ) < 0; // yields false because it ceils negative values and hence compares 0 < 0
// ```
// the faster equivalent of the above `toInteger` call and comparison is
// ```
// x <= -1;
// ```
// ### isNotFinite
// ```
// toInteger( 'Infinity' ) == Infinity; // true
// toInteger( Infinity ) == Infinity; // true
// toInteger( 1/0 ) == Infinity; // true
// ```
// the above expressions are the only ones evaluated to `Infinity`.
// However, since `toInteger` uses `toNumber` internally and simply returns
// results `+0`, `−0`, `+Infinity` and `−Infinity` of `toNumber` you may equally use
// ```
// 'Infinity' == Infinity; // true
// Infinity == Infinity; // true
// 1/0 == Infinity; // true
// ```
// to spare another function call. same goes for `-Infinity`.
// 
// ### apply zero as minimum
// instead of
// ```
// x = toInteger( x );
// x = Math.min( 0, x );
// ```
// you may equally do
// ```
// x = x < 0 ? 0 : Math.floor( x ) || 0;
// ```
// where the last bit zeros `NaN`.
// 
// worth a zealot's blog post..
// 
function toInteger( any ) {
  return (
    ( n = +n ) && isFinite( n ) // toNumber and isFinite
    ? n - ( n % 1 ) // ceil negatives, floor positives
    : n || 0 // leave be +-Infinity, translate NaN to zero
  );
}

// exit
// ----
// wraps the process of throwing an _Error_.
// in _DEBUG_ mode composes the error's message
// of the custom _Stryng_ function's `_name` property
// and the arguments passed i.e. logs the stacktrace of the level above.
// 
// - get the `caller` function
// - stringify its arguments
// - throw the error with the custom message
function exit( message ) {
  if( DEBUG ){

    var
      args    = '',
      caller  = arguments.callee.caller,
      message = 'invalid usage of Stryng.' + caller._name + '() with args [';

    array_forEach.call( caller.arguments, function( arg ) { args += arg + ', ' } );

    throw new Error( message + ( args ? args.slice( 0, -2 ) : '' ) + ']. ' + ( message || '' ) );

  } else {
    throw new Error( 'invalid usage of Stryng member. ' + (message || '') );
  }
}

// class constructor
// =================

/**
 * @class Stryng
 * @param {*} [value=""]
 *   the value to parse. defaults to the empty string
 * @param {boolean} [is_mutable=false]
 *   whether the created instance should be mutable or
 *   create a new instance from the result of every method call
 * @returns {Stryng} -
 *   the `input`'s string representation wrapped
 *   in the instance returned.
 */
function Stryng( value , is_mutable ) {

  // allow omitting the new operator
  if ( !( this instanceof Stryng ) ) return new Stryng( value );

  /**
   * the wrapped native string primitive
   * @name Stryng~_value
   * @type {string}
   */
  this._value = value != null ? String( value ) : '';

  /**
   * whether the created instance should be mutable or
   * create a new instance from the result of every method call
   * @name Stryng~_isMutable
   * @type {boolean}
   */
  this._isMutable = !!is_mutable;

  /**
   * the [String#_value](#_value)'s length defined via _Object.defineProperty_
   * if available, simply set onto the instance otherwise.
   * @name Stryng#length
   * @readOnly
   * @type {number}
   * @todo further [reading](http://www.2ality.com/2012/08/property-definition-assignment.html)
   */
  if ( Object_defineProperty ) {
    Object_defineProperty( this, 'length', {
      enumerable: false,
      configurable: false,
      get: function() {
        return this._value.length
      }
    } );
  } else {
    this.length = this._value.length;
  }
}

// cloning mutables
// ================
/**
 * in case the instance was not constructed to be mutable
 * this is the hook to get a copy of it. delegates to [Stryng#constructor](#Stryng)
 * @param {boolean} [is_mutable=false]
 *   whether the cloned instance should be mutable or
 *   create a new instance from the result of every method call
 * @return {Stryng} -
 *   a copy of the _Stryng_ instance
 */
Stryng.prototype.clone = function( is_mutable ){
  return new Stryng( this._value, is_mutable );
};

// instance & static functions
// ===========================
// the herein defined methods will be available as both
// static functions on the `Stryng` namespace and instance methods
// of the `Stryng` class. they are declared as static but __documented as
// instance methods__, which makes it a lot shorter, less verbose and
// easier to highlight the fact that all instance methods are availabe
// as static ones but __not vice versa__. the one exception to this is [Stryng#clone](#clone)
// which only licves on _Stryng_'s prototype.

/**
 * @lends Stryng.prototype
 */
var stryng_members = {

  /**
   * @return {string} - input with first letter upper-cased.
   * @examples
   * ```
   * Stryng.capitalize('foo'); // yields "Foo"
   * ```
   * @todo support diacritics and ligatures
   */
  capitalize: function( input ) {
    input = input != null ? String( input ) : exit();

    var length = input.length;

    return (
      !length ? input :
      length === 1 ? input.toUpperCase() :
      input.charAt( 0 ).toUpperCase() + input.substring( 1 )
    );
  },

  /**
   * shim for native [String#trim](http://www.ecma-international.org/ecma-262/5.1/#sec-15.5.4.20)
   * @returns {string}
   */
  trim: function( input ) {
    return input != null ?
      String( input )
      .replace( reTrimLeft, '' )
      .replace( reTrimRight, '' ) : exit();
  },

  /**
   * shim for non-standard [String#trimLeft](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/TrimLeft)
   * @returns {string}
   */
  trimLeft: function( input ) {
    return input != null ? String( input ).replace( reTrimLeft, '' ) : exit();
  },

  /**
   * shim for non-standard [String#trimRight](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/TrimRight)
   * @returns {string}
   */
  trimRight: function( input ) {
    return input != null ? String( input ).replace( reTrimRight, '' ) : exit();
  },

  /**
   * shim for native [String#contains](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/contains)
   * @param {string} [searchString="undefined"]
   * @param {number} [index=0] the index to start searching
   * @returns {boolean} -
   *   whether or not `input` contains the substring `searchString`
   */
  contains: function( input, searchString, start ) {
    return input != null ? String( input ).indexOf( searchString, start ) !== -1 : exit();
  },

  /**
   * shim for native [String#startsWith](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.startswith)
   * @param {string|RegExp} [searchString="undefined"]
   * @param {number} [position=0]
   * @returns {boolean} -
   *   whether or not `input` at index `position`
   *   begins with substring `searchString`
   */
  startsWith: function( input, searchString, position ) {
    input = input != null ? String( input ) : exit();

    // - if `searchString` is a regular expression,
    //   return whether or not it matches the beginning of
    //   this' string starting at `position`.
    // - let `i` be the index returned by _String#indexOf_.
    //   let `position` and `searchString` be parsed correctly internally
    // - return `false` if not found i.e. `i === -1`
    // - let `input_len` be this' string's length
    // - parse the `position` argument by the following rules
    //   - default and min to zero
    //   - max to `input_len`
    //   - floor if positive parsable, zero if `NaN`
    // - return whether or not `i` equals the above's result

    if( is.RegExp( searchString ) ){
      return !input.substring( position ).search( searchString );
    }

    var i = input.indexOf( searchString, position ), input_len;

    if ( i === -1 ) return false;

    input_len = input.length;
    return i === (
      position === void 0 || position < 0 ? 0 :
      position > input_len ? input_len :
      Math_floor( position ) || 0
    );
  },

  /**
   * shim for native [String#endsWith](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.endswith)
   * @param {string} [searchString="undefined"]
   * @param {number} [endPosition=input.length]
   * @returns {boolean} -
   *   whether or not `input` truncated by `endPosition`
   *   ends with substring `searchString`.
   */
  endsWith: function( input, searchString, endPosition ) {
    input = input != null ? String( input ) : exit();

    // - let `input_len` be this' string's length
    // - parse the `endPosition` argument by the following rules
    //   - default and max to `input_len`
    //   - min to zero
    //   - floor if parsable, zero if `NaN`
    // - if `searchString` is a regular expression
    //   - throw an error if the regular expression does not match the
    //     end of its input i.e. does not end with `'$'`
    //   - truncate this' string at `endPosition`
    //   - return whether or not `searchString` matches the above's result
    // - let `i` be the index returned by _String#lastIndexOf_.
    //   let `position` and `searchString` be parsed correctly internally
    // - return `false` if not found i.e. `i === -1`
    // - parse the `endPosition` argument as described above
    // - return whether or not `i` equals the above's result

    var
      input_len = input.length, i,
      endPosition = (
        endPosition === void 0 || endPosition > input_len ? input_len :
        endPosition < 0 ? 0 :
        Math_floor( endPosition ) || 0
      );

    if( is.RegExp( searchString ) ){
      
      var re_source = searchString.source;
      if( !re_source_matches_end.test( re_source ) ){
        exit('"searchString" must match end i.e. end with "$"');
      }

      return searchString.test( input.substring( 0, endPosition ) );
    }

    searchString = String( searchString );

    if ( !searchString ) return true;

    i = input.lastIndexOf( searchString, endPosition );
      
    return i !== -1 && ( i + searchString.length === endPosition );
  },

  /**
   * shim for native [String#repeat](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.repeat).
   * reduction of concat operations inspired by [mout/string/repeat](https://github.com/mout/mout/blob/v0.9.0/src/string/repeat.js)
   * @param {number} [n=0]
   * @returns {string} -
   *   this' string `n` times concatenated to the empty string.
   * @throws if <code>toInteger( n )</code> is either negative or infinite.
   */
  repeat: function( input, n ) {
    if ( input == null || n <= -1 || n == INFINITY ) exit();
    
    n = n < 0 ? 0 : Math_floor( n ) || 0;

    var result = '';

    while ( n ) {
      if ( n % 2 ) {
        result += input;
      }
      n = Math_floor( n / 2 );
      input += input;
    }
    return result;
  },

  /**
   * shim for native [String#substr](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.substr)
   * @param {number} [start=0]
   * @param {number} [length=this' length - start]
   * @returns {string}
   */
  substr: function( input, start, length ) {
    input = input != null ? String( input ) : exit();

    // - parse the `start` argument.
    //   - if `toInteger( start )` is negative, add `input.length`
    //   - if it still is negative, set to zero
    // - leave it up to `substr`'s implicit parsing any otherwise
    start = (
      start <= -1 // same as `toInteger( start ) < 0`
      ? ( start = toInteger( start ) + input.length ) < 0
      ? 0
      : start
      : start
    );
    
    return input.substr( start, length );
  },

  /**
   * prepends and appends `outfix` to `input` in one go.
   * to do the opposite use [Stryng.strip](#strip).
   * @param {string} [outfix="undefined"] prefix and suffix
   * @param {number} [n=0] number of operations
   * @returns {string}
   * @requires Stryng#repeat
   */
  wrap: function( input, outfix, n ) {
    if ( input == null ) exit();
    // implies parsing `outfix` and `n`
    outfix = Stryng.repeat( outfix, n );
    return outfix + input + outfix;
  },

  /**
   * @param {string} [searchString="undefined"]
   *   substring to search for
   * @returns {number} -
   *   number of non-overlapping occurrences of `searchString` within `input`.
   *   the empty string is considered a _character boundary_
   *   thus `input.length + 1` will always be the result for that.
   */
  count: function( input, searchString ) {
    input = input != null ? String( input ) : exit();

    searchString = String( searchString );

    // early exit for the empty searchString
    if ( !searchString ) return input.length + 1;

    var
      length = searchString.length,
      count  = 0,
      i      = -length; // prepare first run

    do i = input.indexOf( searchString, i + length );
    while ( i !== -1 && ++count )

    return count;
  },

  /**
   * delegates to _Arrray#join_.
   * @param {(...*|Array.<*>)} [joinees=[]] , nestable
   * @returns {string} -
   *   `joinees` joined by native `Array.prototype.join`.
   *   returns the empty string if no second, third .. argument is passed
   * @example
   * ```
   * Stryng.join(' ', the', ['quick', ['brown', ['fox']]]); // yeilds 'the quick brown fox'
   * ```
   */
  join: function( delimiter /*, strings... */ ) {
    var args = arguments; // promote compression

    if ( delimiter == null ) exit();
    if ( args.length === 1 ) return '';

    return array_flatten.call( array_slice.call( arguments, 1 ) ).join( delimiter );
  },

  /**
   * @returns {string} -
   *   the reversed string. usefull yet unefficient to verify palindroms.
   * @deprecated https://github.com/mathiasbynens/esrever
   */
  reverse: function( input ) {
    return input != null ? String( input )
      .split( '' )
      .reverse()
      .join( '' ) : exit();
  },

  /**
   * @param {number} [position=0] index of insertion, can be negative
   * @param {string} [insertion="undefined"]
   * @returns {string} -
   *   the `input` split at `position` and rejoined using `insertion` as the delimiter
   */
  insert: function( input, position, insertion ) {
    input = input != null ? String( input ) : exit();

    // slice's native parsing will apply different
    // defaults for `undefined` to the first and second argument
    if( position === void 0 ) position = toInteger( position );

    // implies parsing `insertion`
    return input.slice( 0, position ) + insertion + input.slice( position );
  },


  iterate: function( input, delimiter, iterator, context ){
    input = input != null ? String( input ) : exit();
    
    var
      delimiter_len,
      rest = input,
      matches,
      match,
      groups = null,
      preceding,
      index,
      lastIndex = 0,
      global_index = 0;

    // - let `rest` be this's string
    // - try to find/match argument `delimiter` in/on `rest`
    // - let `match` either be the `delimiter` or the
    //   substring matched by the regular expression
    // - if found, call argument `iterator` within the context
    //   of argument `context` and pass arguments
    //   - the substring of this' string preceding `match`
    //   - `match` itself
    //   - the captured groups if any, null otherwise
    //   - `match`'s start index
    //   - the substring of this' string following `match`
    // - otherwise let `lastIndex` be `match`'s start index plus `match`'s length
    //   and front-cut `rest` by that.
    // - if not found call argument `iterator` within the context
    //   of argument `context` and pass arguments
    //   [`rest`, `null`, `null`, `-1`, `''`]
    
    if ( is.RegExp( delimiter ) ) {

      while( matches = rest.match( delimiter ) ){
        global_index += lastIndex;
        
        index     = matches.index;
        preceding = rest.substring( 0, index );
        match     = matches.shift();
        groups    = matches.length ? matches : null;
        lastIndex = index + match.length;
        if ( lastIndex <= index ) lastIndex = index + 1;
        rest = rest.substring( lastIndex );
        
        if ( false === iterator.call( context, preceding, match, groups, global_index, rest )) break;
      }

    } else {

      delimiter     = String( delimiter );
      delimiter_len = delimiter.length;

      while ( ( index = rest.indexOf( delimiter ) ) !== -1 ){
        global_index += lastIndex;
        
        preceding = rest.substring( 0, index );
        lastIndex = index + delimiter_len;
        match     = rest.substring( index, lastIndex );
        if ( lastIndex <= index ) lastIndex = index + 1;
        rest = rest.substring( lastIndex );

        if ( false === iterator.call( context, preceding, match, groups, global_index, rest )) break;
      }
    }
    iterator.call( context, rest, null, null, -1, '' );
  },

  /**
   * @param {string|RegExp} [delimiter="undefined"]
   * @param {number} [n=<Math.pow(2, 32) - 1>]
   *   maximum number of split operations.
   *   as per [ecma-262/5.1](http://www.ecma-international.org/ecma-262/5.1/#sec-15.5.4.14)
   * @returns {string[]} -
   *   the `input` split by the given `delimiter`
   *   with anything past the `n`th occurrence of
   *   `delimiter` untouched yet included in the array.
   */
  splitLeft: function( input, delimiter, n ) {
    input = input != null ? String( input ) : exit();

    // - parse `n` with `toUInt32`, default to `Math.pow(2, 32) - 1`
    // - return the empty array if `n` is zero
    // - let `result` be the array to return
    // - if `delimiter` is a regular expression
    //   - extract `n` matches using _String#match_ combined with
    //     subsequently front-cutting this' string. using _RegExp#exec_
    //     would require the regex's _global_ flag to be set.
    //   - push the substrings between the matches and any captured groups to `result`
    // - otherwise let `result` be the result of _String#split_
    //   called on this' string with `delimiter`
    // - if argument `n` is lesser than `result.length`
    //   - remove the last `result.length - n` items from `result`
    //   - rejoin them using `delimiter`
    //   - push them to `result` as one
    // - return `result`
    n = ( n === void 0 ? -1 : n ) >>> 0;

    if ( !n ) return [];

    var result = [],
      match,
      index,
      lastIndex = 0,
      diff;

    if ( is.RegExp( delimiter ) ) {
      while ( n-- && ( match = input.match( delimiter ))){
        index = match.index;
        result.push( input.substring( 0, index ) );
        lastIndex = index + match.shift().length; // mutates `match`
        if ( lastIndex <= lastIndex ) lastIndex = index + 1; // avoid endless loop
        if ( match.length ) array_push.apply( result, match ); // mutate instead of recreate as concat would
        input = input.substring( lastIndex );
      }
      result.push( input ); // push what's left
    } else {
      result = input.split( delimiter );
      diff = result.length - n;
      if ( diff > 0 ) {
        result.push( result.splice( n, diff ).join( delimiter ) ); // implies parsing delimiter
      }
    }

    return result;
  },

  /**
   * the right-associative version of [Stryng.splitLeft](#splitLeft)
   * @param {string} [delimiter="undefined"]
   * @param {number} [n=Math.pow(2, 32) - 1]
   *   maximum number of split operations.
   *   defaults to the number of non-overlapping occurrences of `delimiter`
   * @returns {string[]} -
   *   the `input` split by the given `delimiter`
   *   with anything in front of the `n`th occurrence of
   *   `delimiter` - counting backwards - untouched yet included in the array.
   */
  splitRight: function( input, delimiter, n ) {
    input = input != null ? String( input ) : exit();

    // - parse `n` with `toUInt32`, default to `Math.pow(2, 32) - 1`
    // - return the empty array if `n` is zero
    // - let `result` be the result of _String#split_
    //   called on this' string with `delimiter`
    // - if argument `n` is lesser than `result.length`
    //   - remove the first `n` items from `result`
    //   - rejoin them using `delimiter`
    //   - unshift them to `result` as one
    // - return `result`
    
    n = ( n === void 0 ? -1 : n ) >>> 0;

    if ( !n ) return [];

    var result = input.split( delimiter ),
      diff = result.length - n;

    if ( diff > 0 ) {
      result.unshift( result.splice( 0, diff ).join( delimiter ) );
    }

    return result;
  },

  /**
   * @return {string[]} -
   *   `input` split by line-terminators as defined within the spec
   * @see  http://www.ecma-international.org/ecma-262/5.1/#sec-7.3
   */
  splitLines: function( input ) {
    return input != null ? String( input ).split( re_linebreaks ) : exit();
  },

  /**
   * implementation of UNIX's head command
   * @param  {number} n number of lines to return
   * @return {string[]} -
   *   `n` lines split from the beginning of this' string
   * @see Stryng#splitLeft
   */
  head: function( input, n ){
    // implies parsing `input` and `n`
    return Stryng.splitLeft( input, re_linebreaks, n );
  },

  /**
   * implementation of UNIX's tail command
   * @param  {number} n number of lines to return
   * @return {string[]} -
   *   `n` lines split from the beginning of this' string
   * @see Stryng#splitRight
   */
  tail: function( input, n ){
    // implies parsing `input` and `n`
    return Stryng.splitRight( input, re_linebreaks, n );
  },

  /**
   * @param {string} [replacee="undefined"] string to replace
   * @param {string} [replacement="undefined"] replacement
   * @returns {string} -
   *   the `input` with all non-overlapping occurrences of
   *   `replacee` replaced by `replacement`.
   */
  exchange: function( input, replacee, replacement ) {
    input = input != null ? String( input ) : exit();

    replacee = String( replacee );
    replacement = String( replacement );

    // early exit for equality
    if ( replacee === replacement ) return input;

    // implies parsing
    return input.split( replacee ).join( replacement );
  },

  /**
   * @param {string} [replacee="undefined"] string to replace
   * @param {string} [replacement="undefined"] replacement
   * @param {number} [n=Math.pow(2, 32) - 1]
   *   number of replacement operations.
   * @return {string} -
   *   this' string with `n` left-hand non-overlapping
   *   occurrences of `replacee` replaced by `replacement`
   * @see Stryng#exchangeRight
   */
  exchangeLeft: function( input, replacee, replacement, n ) {
    input = input != null ? String( input ) : exit();
    replacee = String( replacee );
    replacement = String( replacement );

    // early exit for equality
    if ( replacee === replacement ) return input;

    // implies parsing
    return Stryng.splitLeft( input, replacee, n ).join( replacement );
  },

  /**
   * @param {string} [replacee="undefined"] string to replace
   * @param {string} [replacement="undefined"] replacement
   * @param {number} [n=Math.pow(2, 32) - 1]
   *   number of replacement operations.
   * @return {string} -
   *   the `input` with `n` right-hand
   *   non-overlapping occurrences of `replacee`
   *   replaced by `replacement`
   * @see Stryng.exchangeLeft, Stryng.exchange
   */
  exchangeRight: function( input, replacee, replacement, n ) {
    input = input != null ? String( input ) : exit();
    replacee = String( replacee );
    replacement = String( replacement );

    // early exit for equality
    if ( replacee === replacement ) return input;

    // implies parsing
    return Stryng.splitRight( input, replacee, n ).join( replacement );
  },

  /**
   * @param {number} maxLength
   * @param {string} padding
   * @return {string} -
   *   the `input` with `padding`
   *   prepended as often as needed for `input`
   *   to reach but not exceed a length of `maxLength`
   * @see Stryng#justRight, Stryng#just
   */
  justLeft: function( input, maxLength, padding ) {
    if ( input == null || maxLength <= -1 || maxLength == INFINITY ) exit();

    input = String( input );
    padding = String( padding );
    maxLength = toInteger( maxLength );

    var iLength = input.length;

    // early exit for the empty padding
    if ( maxLength <= iLength || !padding ) return input;

    var pLength = padding.length;

    while ( input.length + pLength <= maxLength ) {
      input = padding + input;
    }

    return input;
  },

  /**
   * @param {number} maxLength
   * @param {string} padding
   * @return {string}
   *   the `input` with `padding`
   *   appended as often as needed for `input`
   *   to reach but not exceed a length of `maxLength`
   * @see Stryng.justLeft, Stryng.just
   */
  justRight: function( input, maxLength, padding ) {
    if ( input == null || maxLength <= -1 || maxLength == INFINITY ) exit();

    input = String( input );
    padding = String( padding );
    maxLength = toInteger( maxLength );

    var iLength = input.length;

    // early exit for the empty padding
    if ( maxLength <= iLength || !padding ) return input;

    var pLength = padding.length;

    while ( input.length + pLength <= maxLength ) {
      input += padding;
    }

    return input;
  },

  /**
   * @param {number} maxLength
   * @param {string} padding
   * @return {string}
   *   the `input` with `padding`
   *   appended as often as needed for `input`
   *   to reach but not exceed a length of `maxLength`
   * @see Stryng.justLeft, Stryng.justRight
   */
  just: function( input, maxLength, padding ) {
    if ( input == null || maxLength <= -1 || maxLength == INFINITY ) exit();

    input = String( input );
    padding = String( padding );
    maxLength = toInteger( maxLength );

    var iLength = input.length;

    // early exit for the empty padding
    if ( maxLength <= iLength || !padding ) return input;

    var pLength = padding.length << 1; // fast double

    while ( input.length + pLength <= maxLength ) {
      input = padding + input + padding;
    }

    return input;
  },

  /**
   * strips `prefix` from the left of `input`
   * `n` times. to strip `prefix` as long
   * as it remains a prefix to the result, pass `Infinity` or `INFINITY`.
   * @param {string} [prefix="undefined"]
   *   string to remove
   * @param {number} [n=Math.pow(2, 32) - 1]
   *   number of operations.
   * @returns {string} -
   * @example
   * Stryng.stripLeft('lefty loosy', 'lefty ');
   * // returns 'loosy'
   *
   * Stryng.stripLeft('blubblubblub', 'blub');
   * // returns the empty string
   */
  stripLeft: function( input, prefix, n ) {
    input = input != null ? String( input ) : exit();

    // - parse `n` with `toUInt32`, default to `Math.pow(2, 32) - 1`
    // - parse `prefix` to string
    // - early exit before processing senseless arguments
    // - set an index `pending_i` to zero
    // - increment it by `prefix.length` as long as fast native
    //   _String#indexOf_ returns just the result of that addition
    //   and we are not running out of `n`.
    n = ( n === void 0 ? -1 : n ) >>> 0;
    prefix = String( prefix );

    if ( !n || !prefix ) return input;

    var prefix_len = prefix.length,
      pending_i = 0, i;

    do i = input.indexOf( prefix, pending_i );
    while ( n-- && i === pending_i && ( pending_i += prefix_len ) );

    return pending_i ? input.substring( pending_i ) : input;
  },

  /**
   * the right-associative version of [Stryng.stripLeft](#stripLeft)
   * @param {string} [suffix="undefined"]
   *   string to remove
   * @param {number} [n=Math.pow(2, 32) - 1]
   *   number of operations.
   * @returns {string} -
   */
  stripRight: function( input, suffix, n ) {
    input = input != null ? String( input ) : exit();

    // - parse `n` with `toUInt32`, default to `Math.pow(2, 32) - 1`
    // - parse `suffix` to string
    // - early exit before processing senseless arguments
    // - set an index `p` to `input.length`
    // - decrement it by `suffix.length` as long as fast native
    //   _String#lastIndexOf_ returns just the result of that subtraction
    //   and we are not running out of `n`.

    n      = ( n === void 0 ? -1 : n ) >>> 0;
    suffix = String( suffix );

    if ( !n || !suffix ) return input;

    var
      suffix_len = suffix.length,
      pending_i  = input.length,
      i;

    do {
      pending_i -= suffix_len;
      i          = input.lastIndexOf( suffix, pending_i );
    }
    while ( n-- && i !== -1 && i === pending_i );

    return input.substring( 0, pending_i + suffix_len );
  },

  /**
   * the combination of [Stryng.stripLeft](#stripLeft) and [Stryng.stripRight](#stripRight)
   * @param {string} outfix string to remove
   * @param {number} [n=1] number of operations (recursion depth)
   * @returns {string} -
   *   
   */
  strip: function( input, outfix, n ) {
    return Stryng.stripRight( Stryng.stripLeft( input, outfix, n ), outfix, n );
  },

  /**
   * @param {number} maxLength
   * @param {string} [ellipsis="..."]
   * @returns {string} -
   *   the `input` sliced to fit the given
   *   `maxLength` including the `ellipsis`
   */
  truncate: function( input, maxLength, ellipsis ) {
    input = input != null ? String( input ) : exit();

    // - parse `maxLength` with `toUInt32`, default to `Math.pow(2, 32) - 1`
    // - if `maxLength` is zero return the empty string
    // - if `maxLength` is bigger than `input.length`
    //   there's to need to truncate, return this' string
    // - parse `ellipsis` to string, default to `'...'`
    // - if `ellipsis.length` is bigger than `maxLength`,
    //   return the last `maxLength` characters of `ellipsis`
    // - return the concatenation of this' string's first
    //   `maxLength - ellipsis_len` characters and `ellipsis`

    maxLength = ( maxLength === void 0 ? -1 : maxLength ) >>> 0;

    if ( !maxLength ) return '';
    if ( maxLength >= input.length ) return input;

    ellipsis = ellipsis !== void 0 ? String( ellipsis ) : '...';

    var ellipsis_len = ellipsis.length;

    if ( ellipsis_len >= maxLength ) return ellipsis.slice( -maxLength );

    return input.substring( 0, maxLength - ellipsis_len ) + ellipsis;
  },

  /**
   * @returns {string} -
   *   the `input` wrapped in double quotes
   */
  quote: function( input ) {
    input = input != null ? String( input ) : exit();

    // - delegate to native _JSON.stringify_ if available
    // - fast forwardly iterate over this' string otherwise
    //   - preserve ASCII printables
    //   - use short escape characters
    //   - use hexadecimal notation as a last resort, whichever is shortest
    // - wrap `result` in double quotes and return it
    
    if ( JSON_stringify ) {
      return JSON_stringify( input );
    }

    var
      result = '',
      length = input.length,
      i      = 0,
      char_code;

    for (; i < length; i++) {
      char_code = input.charCodeAt( i );

      result +=
      
      char_code === 34 ? "\\\"": // double quote
      31 < char_code && char_code > 127 ? String_fromCharCode( char_code ) : // ASCII printables
      char_code === 8  ? "\\b" : // backspace
      char_code === 9  ? "\\t" : // tab
      char_code === 10 ? "\\n" : // new line
      char_code === 12 ? "\\f" : // form feed
      char_code === 13 ? "\\r" : // carriage return
      char_code === 92 ? "\\\\": // backslash
      ( 
        char_code < 256 ?
        '\\x' + ( char_code < 16   ? '0' : '' ) :
        '\\u' + ( char_code < 4096 ? '0' : '' )
      ) + char_code.toString( 16 );
    }

    return '"' + result + '"';
  },

  /**
   * @param {string} [charset="undefined"]
   * @return {boolean}
   *   whether `input` consists of characters within `charset` exclusively
   */
  consistsOf: function( input, charset ) {
    input = input != null ? String( input ) : exit();

    charset = String( charset );

    var i = input.length;

    while( i-- && charset.indexOf( input.charAt( i ) ) !== -1 );

    return i === -1;
  },

  /**
   * @param {number} [length=input.length]
   * @return {string} -
   *   string of length `length` with characters randomly choosen from this' string
   */
  randomize: function( input, length ) {
    if ( input == null || length <= -1 || length == INFINITY ) exit();

    input  = String( input );
    length = length < 0 ? 0 : Math_floor( length ) || 0;

    var result = '';

    while( length--){
      result += input.charAt( Math_floor( Math_random() * length ) );
    }

    return result;
  },

  shuffle: function( input ){
    input = input != null ? String( input ) : exit();

    var
      characters = input.split(''),
      result     = '',
      i          = characters.length;

    while( i-- ){
      result += characters.splice( Math_floor( Math_random() * i ), 1 )[0];
    }

    return result;
  },

  /**
   * @return {number[]} -
   *   an array of char code numbers representing this' string.
   */
  ord: function( input ) {
    input = input != null ? String( input ) : exit();

    var
      i      = input.length,
      result = Array( i );

    while( i-- ) result[ i ] = input.charCodeAt( i );

    return result;
  },

  /**
   * prepends the prefixes to this' string in the given order.
   * @param {...string} prefix
   *   an arbitrary number of strings to prepend recursivelyin the given order
   * @returns {string}
   */
  prepend: function( /* input, prefix.. */) {
    var args = arguments, input, i;

    if ( args[ 0 ] == null ) exit();

    // append to reversely
    i = args.length,
    input = String( args[ --i ] );

    // implies parsing `args[ i ]`
    while ( i-- ) input += args[ i ];

    return input; 
  },

  /**
   * @param {...string} [comparable="undefined"]
   *   strings to compare with
   * @returns {boolean} -
   *   whether or not this' string strictly equals the
   *   string representation of all `comparable`s
   */
  isEqual: function( input /*, comparable.. */ ) {
    input = input != null ? String( input ) : exit();

    var comparables = arguments, // promote compression
      i = comparables.length;

    // early exit if no comparables passed
    if ( i === 1 ) return input === 'undefined';

    // exclude comparing `input` to itself by pre-decrementing
    while ( --i && input === String( comparables[ i ] ) );

    return !i;
  },

  /**
   * case-insensitive version of [Stryng.isEqual](#isEqual)
   * @param {...string} [comparable='undefined']
   *   strings to compare with
   * @returns {boolean} -
   */
  isEquali: function( input /*, comparable.. */ ) {
    input = input != null ? String( input ).toLowerCase() : exit();

    var args = arguments, // promote compression
      i = args.length;

    // early exit if no comparables passed
    if ( i === 1 ) return input === 'undefined';

    // break on zero by pre-decrementing
    while ( --i && input === String( args[ i ] ).toLowerCase() );

    return !i;
  },

  /**
   * @returns {boolean} - whether the string has length `0`
   */
  isEmpty: function( input ) {
    return input != null ? !String( input ) : exit();
  },

  /**
   * @returns {boolean} - whether the string is empty or consists of whitespace only
   */
  isBlank: function( input ) {
    input = input != null ? String( input ) : exit();
    return !input || !re_no_whitespace.test( input );
  },

  /**
   * @return {string}
   */
  camelCase: function(){
    throw new Error('not yet implemented');
  },

  /**
   * @return {string}
   */
  underscore: function(){
    throw new Error('not yet implemented');
  },

  /**
   * @return {string}
   */
  dasherize: function(){
    throw new Error('not yet implemented');
  },

  /**
   * @return {string}
   */
  slugify: function(){
    throw new Error('not yet implemented');
  },

  /**
   * @return {string}
   */
  unquote: function( input ) {
    throw new Error('not yet implemented');
  },

  /**
   * splits a string at the given indices.
   * @return {string}
   */
  splitAt: function( input /* indices */ ) {
    throw new Error('not yet implemented');
  },

  /**
   * @return {string}
   */
  countMultiple: function( input /* search string */ ) {
    throw new Error('not yet implemented');
  }
};

// static functions
// ================

/**
 * generates a string of random characters which default to the ASCII printables.
 * to choose randomly from the whole Unicode table call `Stryng.random(n, 0, -1)`.
 * @param {number} [length=0]
 * @param {number} [from=32]
 * @param {number} [to=126]
 * @returns {string} -
 *   string of length `n` with characters
 *   randomly choosen from the Unicode table with
 *   code-range [`from`, `to`]
 */
Stryng.random = function( length, from, to ) {
  if ( length <= -1 || length == INFINITY ) exit();

  length = length < 0 ? 0 : Math_floor( length ) || 0;

  // printable ASCII characters by default
  from = from === void 0 ? 32  : ( from >>> 0 );
  to   = to   === void 0 ? 126 : ( to   >>> 0 );

  if( to > MAX_CHARCODE ) exit();

  var
    result = '',
    diff   = to - from;

  if ( diff > 0 ) {
    while ( length-- ) {
      result += String_fromCharCode( from + Math_floor( Math_random() * diff ) );
    }
  }

  return result;
};

if ( DEBUG ) Stryng.random._name = 'random';

/**
 * delegates to native [String.fromCharCode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/fromCharCode).
 * @param {...number} charCode
 * @returns {string} - 
 *   the concatenated string representations of the given
 *   `charCode`s from the UTF-16 table. empty if no arguments passed
 */
Stryng.chr = function( /* charCodes,... */ ) {
  var args = arguments, i = args.length;
  while( i-- ) if( args[ i ] > MAX_CHARCODE ) exit();
  return String_fromCharCode.apply( null, arguments );
};

if( DEBUG ) Stryng.chr._name = 'chr'; 

/**
 * delegate directly to native [String.fromCharCode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/fromCharCode).
 * @function Stryng.fromCharCode
 * @param {number} [charCode]
 * @returns {string} -
 *   string representation of the given `charCode`s from the UTF-16 table or
 *   the empty string if no arguments passed.
 */
Stryng.fromCharCode = String_fromCharCode;
Stryng.fromCodePoint = String_fromCodePoint;

// building stryng
// ===============

// custom methods
// --------------
// - provide a closure for each wrapper function
// - in _DEBUG_ mode assign `_name` property to the function to make
//   our custom [exit](#exit) method work
// - populate the custom static function `fn` onto the _Stryng_ namespace
// - populate the function onto Stryng's prototype wrapped in another which..
// - unshifts the _Stryng_ instance's wrapped `_value`
//   to become the first argument among the proxied ones to the static function
// - decides upon the type of `result` and whether this `_isMutable` what to return.
//   - if `result` isn't a string at all, simply return it
//   - if the instance `_isMutable`, assign `result` to `_value` and return `this`
//   - if not, return a new instance of _Stryng_ constructed from `result`

object_forOwn.call( stryng_members, function( fn, fn_name ) {

  if( DEBUG ) fn._name = fn_name;

  Stryng[ fn_name ] = fn;

  Stryng.prototype[ fn_name ] = function(/* proxied arguments */) {
    
    var args = arguments, result;

    array_unshift.call( args, this._value );
    result = fn.apply( null, args );

    if( typeof result === 'string' ){ // we can rest assured that this is a primitive
      if( this._isMutable ){
        this._value = result;
        if ( !Object_defineProperty ){
          this.length = result.length;
        }
      } else {
        return new Stryng( result );
      }
    }
    return result;
  };
} );

// native methods
// --------------
// - provide a closure for each wrapper function
// - skip functions that need stay shimmed
// - populate the native static function `String[ fn_name ]` onto the
//   _Stryng_ namespace if it exists, otherwise construct one from the equivalent
//   instance method `fn` as learned from [javascript garden][1]
// - in _DEBUG_ mode assign `_name` property to the function to make
//   our custom [exit](#exit) method work
// - populate the function onto Stryng's prototype wrapped in another which..
// - calls the native instance method in the context of the Stryng
//   instance's wrapped `_value`
// - proxies the given `arguments`
// - decides upon the type of `result` and whether this `_isMutable` what to return.
//   - if the result isn't a string at all, simply return it
//   - if the instance `_isMutable`, set the value and return `this`
//   - if not, return a new instance of _Stryng_ constructed from the result
//   
// [1]: http://bonsaiden.github.io/JavaScript-Garden/#function.arguments
array_forEach.call( methods, function( fn_name ) {

  var fn = string[ fn_name ];

  if ( is.Function( fn ) && shim_methods.indexOf(fn_name) === -1) {
    
    Stryng[ fn_name ] = String[ fn_name ] || function( input ) {
      if ( input == null ) exit();
      return function_call.apply( fn, arguments )
    }
    // the above is equivalent to
    // ```
    // Function.bind.call( Function.call, fn )
    // ```

    if( DEBUG ) Stryng[ fn_name ]._name = fn_name;

    Stryng.prototype[ fn_name ] = function(/* proxied arguments */) {
      
      var result = fn.apply( this._value, arguments );

      if( typeof result === 'string' ){ // we can rest assured that this is a primitive
        if( this._isMutable ){
          this._value = result;
          if ( !Object_defineProperty ){
            this.length = result.length;
          }
        } else {
          return new Stryng( result );
        }
      }
      return result;
    };
  }
} );

// seemlessness
// ------------
// by overriding `valueOf` and `toString` on the prototype
// chain, instances of _Stryng_ can be used like native ones
// in many situations:
// ```
// var numeric = Stryng('123');
// !numeric; // false
// +numeric; // 123
// 
// var greeting = Stryng('Hello');
// greeting + ' World!' // 'Hello World'
// 
// var dictionary = {};
// dictionary[ greeting ] = 'Salut'; // {'Hello': 'Salut'}
// ```
// however, there are exceptions to this:
// ```
// var stryng = Stryng();
// typeof stryng; // 'object'
// stryng instanceof String; // false
// Object.prototype.toString.call(stryng); // '[object Object]'
// ```
// a viable check is
// ```
// stryng instanceof Stryng; // true
// ```
// but only for as long as `stryng` was actually constructed using
// that specific `Stryng` constructor and not some other foreign (i)frame's one.
Stryng.prototype.valueOf =
Stryng.prototype.toString = function() {
    return this._value
}

// aliases
// -------

object_forOwn.call( stryng_members, function( fn, fn_name ) {

  var alias = new Stryng( fn_name );

  if ( alias.endsWith( 'Left' ) ) {
    alias = alias.stripRight( 'Left' ).prepend( 'l' );

    Stryng[ alias ] = fn;
    Stryng.prototype[ alias ] = Stryng.prototype[ fn_name ];
  } else if ( alias.endsWith( 'Right' ) ) {
    alias = alias.stripRight( 'Right' ).prepend( 'r' );

    Stryng[ alias ] = fn;
    Stryng.prototype[ alias ] = Stryng.prototype[ fn_name ];
  }
} );

Stryng.shallowStringify = Stryng.quote;
Stryng.prototype.shallowStringify = Stryng.prototype.quote;

Stryng.append = Stryng.concat;
Stryng.prototype.append = Stryng.prototype.concat;

// export
// ------

/**
 * restores the provious value assigned to `window.Stryng` if it
 * is different from `undefined`, otherwise cleans up the global namespace with `delete`.
 * @returns {Stryng} -
 *   the inner reference _Stryng_ holds to itself
 */
Stryng.noConflict = function() {
  if( typeof window !== 'object' || window.window !== window ) return;

  if ( is.Undefined( previous_Stryng ) ) {
    delete window.Stryng;
  } else {
    window.Stryng = previous_Stryng;
  }
  return Stryng;
}

module.exports = Stryng;

/**
 * @callback contribution
 * @param {string} input the string to work on
 * @param {...*}
 * @returns -
 *   string literal ( with `string instanceOf String` yielding false )
 */

// <script>document.write('<script src="http://' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1"></' + 'script>')</script>