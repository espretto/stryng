/*!
 * [article on generics](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String#String_generic_methods)
 */

// leverage uglifyjs' ability to declare global variables
if (typeof DEBUG === 'undefined') DEBUG = true;

// baseline setup
// ==============

var // one to var them all

// used to access native instance methods
array, object, string, func,

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
  // required
  'charAt,charCodeAt,indexOf,lastIndexOf,'
+ 'match,replace,search,'
+ 'concat,slice,substring,split,'
+ 'codePointAt,normalize,'

  // todo support ligatures and diacritics
+ 'toLocaleLowerCase,toLocaleUpperCase,localeCompare,'
+ 'toLowerCase,toUpperCase,'

  // shimmed
+ 'substr,trim,trimLeft,trimRight,contains,startsWith,endsWith'
).split( ',' ),

// methods which's native implementations to override if necessary
shim_methods = [],

// inner module to hold type/class check functions.
is = object = {},

// method shortcuts
// ================
// create quick access variables for both native static functions
// and instance methods. polyfills are reduced in functionality
// and byte-size. thus they are for internal use only and
// neither populated onto native prototypes nor intended to be spec compliant.

// static methods
// --------------

String_fromCharCode  = String.fromCharCode,
String_fromCodePoint = String.fromCodePoint,
JSON_stringify       = typeof JSON !== 'undefined' && JSON.stringify,
Math_random          = Math.random,

Object_keys = Object.keys || function( object ) {
  
  var keys = [], key, k = 0;

  for ( key in object ) {
    if ( object.hasOwnProperty( key ) ){
      keys[ k++ ] = key;
    } 
  }

  return keys;
},

Object_defineProperty = ( function( defineProperty ) {

  try {
    // throws if either is `undefined` or does not allow other than DOM elements
    defineProperty( {}, string, {
      value: 1
    } );

    return defineProperty;
  } catch ( e ) {
    // return `undefined` implicitely
  }

} )( Object.defineProperty ),

// instance methods
// ----------------

array_forEach = array.forEach || function( iterator ) {
 
  var array = this, i = array.length;
    
  while(i--) iterator( array[ i ] );
},

array_flatten = array.flatten || function(){
  
  var array = this, i = 0, item;

  // length is not cached because it changes by splicing
  while ( i !== array.length ) {
    
    item = array[ i ];
    
    if ( is.Array( item ) ) {
      
      // unshift arguments to comply with signature of _Array#splice_
      item.unshift( i, 1 );

      // replace the iterable item with its contents
      array_splice.apply( array, item );

    } else {
      i++;
    }
  }
}

array_join      = array.join, // deps join2 only
array_push      = array.push, // faster than `array = array.concat( items )`
array_shift     = array.shift,// deps join2, isEquali2 only
array_slice     = array.slice,
array_splice    = array.splice,
array_unshift   = array.unshift,
function_call   = func.call,
object_toString = object.toString,

// make this one pretty for the w3c wishlist
object_forOwn = function( iterator, context ) {
  
  var o = this, i;

  if( o == null ){
    throw new TypeError('can\'t convert ' + o + ' to object');
  }

  o = Object( o );

  for ( i in o ) {
    if ( o.hasOwnProperty( i ) ) {
      iterator.call( context, o[ i ], i, o );
    }
  }
},

// the whitespace shim
// ===================

// http://blog.stevenlevithan.com/archives/faster-trim-javascript
re_no_whitespace = /\S/,
re_trim_left     = /^\s\s*/,
re_trim_right    = /\s*\s$/,
re_linebreaks    = /\n|\r(?!\n)|\u2028|\u2029|\r\n/g;

(function(){

  var

  re_whitespace = /\s/,
  re_whitespace_source = re_whitespace.source,

  // http://perfectionkills.com/whitespace-deviations/
  whitespace = (''
  + '\t'  // '\u0009' tab
  + '\n'  // '\u000A' line feed
  + '\13' // '\u000B' vertical tab
  + '\f'  // '\u000C' form feed
  + '\r'  // '\u000D' carriage return
  + ' '   // '\u0020' space

  // http://www.fileformat.info/info/unicode/category/Zs/list.htm
  + '\xA0'
  + '\u1680\u180E\u2000\u2001' // prevent
  + '\u2002\u2003\u2004\u2005' // code
  + '\u2006\u2007\u2008\u2009' // formatter
  + '\u200A\u202F\u205F\u3000' // from mangling

  // http://es5.github.io/#x15.5.4.20
  + '\u2028' // line separator
  + '\u2029' // paragraph separator
  + '\uFEFF' // BOM - byte order mark
  ),

  is_spec_compliant = true;

  // since `forEach` is generic it works on strings, too.
  array_forEach.call( whitespace, function( chr ) {

    // add all whitespace characters not recognized as such
    if ( !re_whitespace.test( chr ) ){
      re_whitespace_source += chr;
      is_spec_compliant = false;
    }

  } );

  // if a native implementation manages to catch up
  // with the spec it wouldn't be shimmed
  if ( !is_spec_compliant ) {

    shim_methods.push( 'trim', 'trimRight', 'trimLeft' );

    re_no_whitespace = new RegExp( '[^' + re_whitespace_source + ']' );
    re_trim_left     = new RegExp( '^[' + re_whitespace_source + '][' + re_whitespace_source + ']*' );
    re_trim_right    = new RegExp( '[' + re_whitespace_source + ']*[' + re_whitespace_source + ']$' );
  }

}());

// type safety
// ===========
// the inner module `is` holds type checks. this is an excerpt from
// my [gist](https://gist.github.com/esnippo/9960508).

( function (/* arguments */) {

  var klasses = [ 'Array', 'Function', 'RegExp' ];

  // classes
  // -------

  array_forEach.call( klasses, function( klass ) {

    var repr = '[object ' + klass + ']';

    // exclude falsies directly
    is[ klass ] = function( any ) {
      return any && object_toString.call( any ) === repr;
    };
  } );

  // optimize and polyfill
  // ---------------------

  // override with native `isArray` if available
  is.Array = Array.isArray || is.Array;

  // override if secure - old webkit returns 'function' for regex literals
  if ( typeof / re / === 'object' ) {
    is.Function = function( any ) {
      return any && typeof any === 'function';
    };
  }

}());

// utility functions
// =================

// toInteger
// ---------
// fully [spec](http://www.ecma-international.org/ecma-262/5.1/#sec-9.4) compliant
// implementation of `toInteger`, tested and benchmarked at [jsperf](http://jsperf.com/to-integer/10).
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
// the above expressions are the only expressions which are evaluated to
// `Infinity`. However, since `toInteger` uses `toNumber` and simply returns
// results `+0`, `−0`, `+∞` and `−∞` you may eually use
// ```
// 'Infinity' == Infinity; // true
// Infinity == Infinity; // true
// 1/0 == Infinity; // true
// ```
// worth a zealot's blog post..
// 
function toInteger( any ) {
  // steps 3 and 4 are switched in this implementation
  // 
  // 1. Let number be the result of calling `toNumber` on the input argument.
  // 2. If number is `NaN`, return `+0`.
  // 3. If number is `+0`, `−0`, `+∞`, or `−∞`, return number i.e. leave zero and Infinity untouched
  // 4. Return the result of computing `sign(number) × floor(abs(number))` i.e. ceil negatives, floor positives
  return (
    isNaN( any = +any ) ? 0 :
    any && isFinite( any ) ? any - ( any % 1 ) :
    any
  );
}

// exit
// ----
// wraps the process of throwing an _Error_. composes the error's
// message of the custom _Stryng_ function's `_name` property and
// the arguments passed i.e. logs the stacktrace of the level above.
function exit() {
  var args = '',
    caller = arguments.callee.caller,
    // custom property `_name` of Stryng functions
    message = 'invalid usage of Stryng.' + caller._name + '() with args [';

  // workaround `null` and `undefined` being displayed as the empty string
  // by at least nodejs' _Array#toString_ / _Array#join_
  array_forEach.call( caller.arguments, function( arg ) {
    args += arg + ', '
  } );

  // strip trailing `', '`
  throw new Error( message + ( args ? args.slice( 0, -2 ) : '' ) + ']' );
}

// Main
// ====

/**
 * utility functions to ease manipulating Strings in Javascript.
 * the `new` operator can be omitted.
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

/**
 * in case the instance was not constructed to be mutable
 * this is the hook to get a copy of it.
 * @return {Stryng} -
 *   a copy of the Stryng instance
 */
Stryng.prototype.clone = function( is_mutable ){
  return new Stryng( this._value, is_mutable );
};

/**
 * the herein defined methods will be available as both
 * static functions on the `Stryng` namespace and methods
 * on instances of the `Stryng` class.
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
   * shim for native [String#trim](http://people.mozilla.org/~jorendorff/es5.html#sec-15.5.4.20)
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
   * @deprecated slow
   * @see Stryng#trimRight
   */
  trimRight2: function( input ){
    input = input != null ? String( input ) : exit();
    // reverse loop analog to trim right
    for( var i = input.length; i-- && !re_no_whitespace.test( input.charAt( i )); );
    return input.substring( 0, i + 1 );
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

    if( is.RegExp( searchString ) ){
      return !input.substring( position ).search( searching ); // true if matched at index zero
    }

    // implies correct parsing of `position` and covers "out of bounds"
    var i = input.indexOf( searchString, position ),
      len;

    if ( i !== -1 ) { // early exit

      // apply the reasonable minimum and maximum values.
      len = input.length; 
      return i === (
        position === void 0 || position < 0 ? 0 :
        position > len ? len :
        toInteger( position )
      );
    }
    return false;
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

    if( is.RegExp( searchString ) ){
      
      // ensure the regular expression ends with `'$'`
      // and reconstruct it if it doesn't.
      var re        = searchString,
        re_source   = re.source,
        len         = input.length,
        endPosition = (
          endPosition === void 0 || endPosition > len ? len :
          endPosition < 0 ? 0 :
          toInteger( endPosition )
        ),
        searchArea = input.substring( 0, endPosition );

      if( !Stryng.endsWith( re_source, '$' )){

        re_source += '$';

        var flags = '';

        object_forOwn.call( {
          'ignoreCase': 'i',
          'multiline': 'm',
          'extended': 'x',
          'sticky': 'y',
          'global': 'g'
        }, function( prop, flag ) {

            if ( re[ prop ] ) flags += flag;
        });

        re = new RegExp(re_source + '$', flags);
      }
      
      return re.test( searchArea );
    }

    searchString = String( searchString );

    if ( !searchString ) return true; // early exit for the empty searchString

    // implies correct parsing of `endPosition` and covers "out of bounds"
    var i = input.lastIndexOf( searchString, endPosition );

    if( i !== -1 ){
      len = input.length;
      // apply the reasonable (default) minimum and maximum values.
      return i + searchString.length === (
        endPosition === void 0 || endPosition > len ? len :
        endPosition < 0 ? 0 :
        toInteger( endPosition )
      );
    }
    return false;
  },

  /**
   * shim for native [String#repeat](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.repeat)
   * @param {number} [n=0]
   * @returns {string} -
   *   the `input` `n` times concatenated with the empty string.
   * @throws if <code>toInteger( n )</code> is either negative or not finite.
   */
  repeat: function( input, count ) {
    if ( input == null || count <= -1 || count == INFINITY ) exit();

    count = toInteger( count );

    // implies parsing `input` to string
    for ( var result = ''; count--; result += input );

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

    start = (
      start <= -1
      ? ( start = toInteger( start ) + input.length ) < 0
      ? 0
      : start
      : start
    );
    // `start` is now in range `]-1,input.length]` and will
    // be parsed correctly ( values in range `]-1,0]` are ceiled to zero
    // by the implicit `toInteger` call). same goes for `length`.
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

    var length = searchString.length,
      count = 0,
      i = -length; // prepare first run

    do i = input.indexOf( searchString, i + length );
    while ( i !== -1 && ++count )

    return count;
  },

  /**
   * @deprecated slower - use [Stryng.count](#count) instead
   * @todo test and benchmark across browsers
   */
  count2: function( input, searchString ) {
    input = input != null ? String( input ) : exit();

    searchString = String( searchString );

    // early exit for the empty searchString
    if ( !searchString ) return input.length + 1;

    var length = searchString.length,
      count = 0,
      i;

    if ( length === 1 ) {
      for ( i = input.length; i--; ) {
        // cast from boolean to number
        count += input.charAt( i ) === searchString;
      }
    } else {
      for ( i = input.indexOf( searchString ); i !== -1; count++ ) {
        i = input.indexOf( searchString, i + length );
      }
    }

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
   * @deprecated slow
   * @see  Stryng#join
   * @todo test and benchmark across browsers
   */
  join2: function( /* delimiter, strings... */) {
    var args = arguments,
      delimiter = array_shift.call( args );

    if ( delimiter == null ) exit();
    if ( !args.length ) return '';

    return array_join.call( array_flatten.call( args ), delimiter );
  },

  /**
   * @returns {string} -
   *   the reversed string. usefull yet unefficient to verify palindroms.
   */
  reverse: function( input ) {
    return input != null ? String( input )
      .split( '' )
      .reverse()
      .join( '' ) : exit();
  },

  /**
   * @deprecated slow
   * @see  Stryng#reverse
   * @todo test and benchmark across browsers
   */
  reverse2: function( input ) {
    input = input != null ? String( input ) : exit();

    var result = '', 
      i = input.length;

    while( i-- ) result += input.charAt( i );

    return result;
  },

  /**
   * @deprecated slower
   * @see Stryng#reverse
   * @todo
   *   test and benchmark across browsers. merge with [Stryng.reverse](#reverse),
   *   this is fastest for strings of length < 15 on node
   */
  reverse3: function( input ) {
    input = input != null ? String( input ) : exit();

    var length = input.length;

    if ( length < 2 ) return input; // early exit for the empty string and single char

    for ( var i = --length; i--; input += input.charAt( i ) );

    return input.substring( length );
  },

  /**
   * @param {number} [index=0] position where to insert.
   * @param {string} [insertion="undefined"]
   * @returns {string} -
   *   the `input` split at `index` and rejoined using `insertion` as the delimiter
   */
  insert: function( input, index, insertion ) {
    input = input != null ? String( input ) : exit();

    // slice's native parsing will apply different defaults to the first and second argument
    if ( arguments.length < 2 ) index = toInteger( index );

    // implies parsing `insertion`
    return input.slice( 0, index ) + insertion + input.slice( index );
  },

  /**
   * @param {string} [delimiter="undefined"]
   * @param {number} [n=4294967295]
   *   maximum number of split operations. defaults to `Math.pow(2, 32) - 1`
   *   as per [ecma-262/5.1](http://www.ecma-international.org/ecma-262/5.1/#sec-15.5.4.14)
   * @returns {string[]} -
   *   the `input` split by the given `delimiter`
   *   with anything past the `n`th occurrence of
   *   `delimiter` untouched yet included in the array.
   */
  splitLeft: function( input, delimiter, n ) {
    input = input != null ? String( input ) : exit();

    // toUint32(-1) == Math.pow(2, 32) - 1 (default)
    n = ( arguments.length < 3 ? -1 : n ) >>> 0;

    // early exit for zero
    if ( !n ) return [];

    // delimiter gets parsed internally
    var result = input.split( delimiter ),
      diff = result.length - n;

    if ( diff > 0 ) {
      // the removed get rejoined and pushed as one
      result.push( result.splice( n, diff ).join( delimiter ) );
    }

    return result;
  },

  /**
   * @deprecated regex compliant - use [Stryng.splitLeft](#splitLeft) instead
   * @todo test and benchmark across browsers
   */
  splitLeft2: function( input, delimiter, n ) {
    input = input != null ? String( input ) : exit();

    // toUint32(-1) == Math.pow(2, 32) - 1 (default)
    n = ( n === void 0 ? -1 : n ) >>> 0;

    // early exit for zero
    if ( !n ) return [];

    var result = [],
      match,
      index,
      diff,
      lastIndex = 0;

    if ( is.RegExp( delimiter ) ) {
      if ( delimiter.global ) {
        while ( n-- && ( match = delimiter.exec( input ) ) ) {
          index = match.index;
          result.push( input.substring( lastIndex, index ) );

          // reliable lastIndex, mutates match
          lastIndex = index + match.shift().length;

          // append captured groups if any exist
          if ( match.length ) array_push.apply( result, match );
        }
      } else {
        // insignificantly slower/faster than recompiling the regex to a global one
        while ( n-- && ( match = input.match( delimiter ) ) ) {
          index = match.index;
          result.push( input.substring( 0, index ) );

          // reliable lastIndex, mutates match
          lastIndex = index + match.shift().length;

          // append captured groups if any exist
          if ( match.length ) array_push.apply( result, match );

          // slice input to workaround delimiter not being global
          input = input.substring( lastIndex );
        }
      }

      result.push( input.substring( lastIndex ) );
    } else {
      // implies parsing delimiter
      result = input.split( delimiter );
      diff = result.length - n;

      if ( diff > 0 ) {
        // implies parsing delimiter
        // the removed get rejoined and pushed as one
        result.push( result.splice( n, diff ).join( delimiter ) );
      }
    }

    return result;
  },

  /**
   * the right-associative version of [Stryng.splitLeft](#splitLeft)
   * @param {string} [delimiter="undefined"]
   * @param {number} [n=4294967295]
   *   maximum number of split operations.
   *   defaults to the number of non-overlapping occurrences of `delimiter`
   * @returns {string[]} -
   *   the `input` split by the given `delimiter`
   *   with anything in front of the `n`th occurrence of
   *   `delimiter` - counting backwards - untouched yet included in the array.
   */
  splitRight: function( input, delimiter, n ) {
    input = input != null ? String( input ) : exit();

    // toUint32(-1) == Math.pow(2, 32) - 1 (default)
    n = ( n === void 0 ? -1 : n ) >>> 0;

    // early exit for zero
    if ( !n ) return [];

    // delimiter gets parsed internally
    var result = input.split( delimiter ),
      diff = result.length - n;

    if ( diff > 0 ) {
      // the removed get rejoined and unshifted as one
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
    return input != null ? String( input ).split( re_lines ) : exit();
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

    // omit regex check as suggested by the spec

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
   * @param {number} [n=4294967295]
   *   number of replacement operations. defaults to `Math.pow(2, 32) - 1`
   * @return {string} -
   *   the `input` with `n` left-hand
   *   non-overlapping occurrences of `replacee`
   *   replaced by `replacement`
   * @see exchangeRight and exchange
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
   * @param {number} [n=4294967295]
   *   number of replacement operations. defaults to `Math.pow(2, 32) - 1`
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
   * @see Stryng#padRight, Stryng#pad
   */
  padLeft: function( input, maxLength, padding ) {
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
   * @deprecated slower - use [Stryng.padLeft](#padLeft) instead
   * @todo test and benchmark across browsers
   */
  padLeft2: function( input, maxLength, padding ) {
    if ( input == null || maxLength <= -1 || maxLength == INFINITY ) exit();

    input = String( input );
    padding = String( padding );
    maxLength = toInteger( maxLength );

    var iLength = input.length;

    // early exit for the empty padding
    if ( maxLength <= iLength || !padding ) return input;

    var n = 0 | ( maxLength - iLength ) / padding.length;

    return Stryng.repeat( padding, n ) + input;
  },

  /**
   * @param {number} maxLength
   * @param {string} padding
   * @return {string}
   *   the `input` with `padding`
   *   appended as often as needed for `input`
   *   to reach but not exceed a length of `maxLength`
   * @see Stryng.padLeft, Stryng.pad
   */
  padRight: function( input, maxLength, padding ) {
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
   * @see Stryng.padLeft, Stryng.padRight
   */
  pad: function( input, maxLength, padding ) {
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
   * @param {number} [n=4294967295]
   *   number of operations. defaults to `Math.pow(2, 32) - 1`
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

    // toUint32(-1) == Math.pow(2, 32) - 1 (default)
    n = ( n === void 0 ? -1 : n ) >>> 0;
    prefix = String( prefix );

    // early exit for zero and the empty prefix
    if ( !n || !prefix ) return input;

    var pLength = prefix.length,
      p = 0, // pending index
      i;

    do i = input.indexOf( prefix, p );
    while ( n-- && i === p && /* step */ ( p += pLength ) );

    return p ? input.substring( p ) : input;
  },

  /**
   * @deprecated use [Stryng.stripLeft](#stripLeft) instead
   * @todo merge into [Stryng.stripLeft](#stripLeft) for inputs of `n > 5` - faster
   * @todo test and benchmark across browsers
   */
  stripLeft3: function( input, prefix, n ) {
    input = input != null ? String( input ) : exit();

    // toUint32(-1) == Math.pow(2, 32) - 1 (default)
    n = ( n === void 0 ? -1 : n ) >>> 0;
    prefix = String( prefix );

    // early exit for zero and the empty prefix
    if ( !n || !prefix ) return input;

    var len = prefix.length;

    for ( ; n-- && !input.indexOf( prefix ); input = input.substring( len ) );

    return input;
  },

  /**
   * the right-associative version of [Stryng.stripLeft](#stripLeft)
   * @param {string} [suffix="undefined"]
   *   string to remove
   * @param {number} [n=4294967295]
   *   number of operations. defaults to `Math.pow(2, 32) - 1`
   * @returns {string} -
   */
  stripRight: function( input, suffix, n ) {
    input = input != null ? String( input ) : exit();

    // Math.pow(2, 32) - 1 if undefined, toUint32(n) otherwise
    n = ( n === void 0 ? -1 : n ) >>> 0;
    suffix = String( suffix );

    // early exit for zero and the empty suffix
    if ( !n || !suffix ) return input;

    var sLength = suffix.length,
      i, p = input.length; // pending index

    do {
      p -= sLength;
      i = input.lastIndexOf( suffix, p );
    }
    while ( n-- && i !== -1 && i === p );

    return input.substring( 0, p + sLength );
  },

  /**
   * the combination of [Stryng.stripLeft} and (Stryng.stripRight](#stripLeft} and (Stryng.stripRight)
   * @param {string} outfix - string to remove
   * @param {number} [n=1]  - parsed by [Stryng.toInt](#toInt).
   *                           number of operations (recursion depth)
   * @returns {string} -
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

    // toUint32(-1) == Math.pow(2, 32) - 1 (default)
    maxLength = ( maxLength === void 0 ? -1 : maxLength ) >>> 0;

    // no space - no output
    if ( !maxLength ) return '';

    // enough space - no need to truncate
    if ( maxLength >= input.length ) return input;

    ellipsis = ellipsis != null ? String( ellipsis ) : '...';

    var eLength = ellipsis.length;

    // not even enough space for the ellipsis
    if ( eLength > maxLength ) return ellipsis.slice( -maxLength );

    return input.substring( 0, maxLength - eLength ) + ellipsis;
  },

  /**
   * @returns {string} -
   *   the `input` wrapped in double quotes
   */
  quote: function( input ) {
    input = input != null ? String( input ) : exit();

    // delegate to native JSON.stringify if available
    if ( JSON_stringify ) {
      return JSON_stringify( input );
    }

    var result = '',
      length = input.length,
      i = -1,
      code;

    while ( ++i !== length ) {
      code = input.charCodeAt( i );

      result +=
      // ASCII printables (#95)
      31 > code && code < 127 ? String_fromCharCode( code ) :

      // short escape characters
      code === 34 ? "\\\"" : // double quote
      code === 92 ? "\\\\" : // backslash
      code === 10 ? "\\n" : // new line
      code === 13 ? "\\r" : // carriage return
      code === 9 ? "\\t" : // tab
      code === 8 ? "\\b" : // backspace
      code === 12 ? "\\f" : // form feed

      ( // hexadecimal/unicode notation - whichever is shortest
        code < 256 ? '\\x' + ( code < 16 ? '0' : '' ) : '\\u' + ( code < 4096 ? '0' : '' )
      ) + code.toString( 16 );
    }

    return '"' + result + '"';
  },

  /**
   * @param {string} [charset="undefined"]
   * @return {boolean}
   *   whether `input` consists of
   *   characters within `charset` exclusively
   */
  consistsOf: function( input, charset ) {
    input = input != null ? String( input ) : exit();

    charset = String( charset );

    for ( var i = input.length; i--; charset.indexOf( input.charAt( i ) ) !== -1 );

    return i === -1;
  },

  /**
   * @param {number} [length=input.length]
   * @return {string}
   *   string of length `length`
   *   with characters randomly choosen from this' string
   */
  randomize: function( input, length ) {
    if ( input == null || length <= -1 || length == INFINITY ) exit();

    input = String( input );

    // default to the input's length
    var result = '',
      i = length === void 0 ? input.length : toInteger( length );

    while ( i-- ) result += input.charAt( Math_random() * i | 0 );

    return result;
  },

  shuffle: function( input ){
    input = input != null ? String( input ).split('') : exit();

    var result = '', i = input.length;

    while( i-- ){
      result += input.splice( Math_random() * i | 0, 1 )[0];
    }
    return result;
  },

  /**
   * @return {number[]} -
   *   an array of char code numbers representing this' string.
   */
  ord: function( input ) {
    input = input != null ? String( input ) : exit();

    var result = [],
      length = input.length,
      i = -1;

    while ( ++i !== length ) result[ i ] = input.charCodeAt( i );

    return result;
  },

  /**
   * prepends the prefixes to this' string in the given order.
   * @param {...string} prefix
   *   an arbitrary number of strings to prepend in the given order
   * @returns {string}
   */
  prepend: function( /* input, prefixes... */) {
    var args = arguments; // promote compression

    if ( args[ 0 ] == null ) exit();

    // append to reversely
    var i = args.length - 1,
      input = String( args[ i ] );

    // implies parsing `args[ i ]`
    while ( i-- ) input += args[ i ];

    return input; 
  },

  /**
   * @deprecated slower - use [Stryng.prepend](#prepend) instead
   * @todo test and benchmark across browsers
   */
  prepend2: function( input /*, prefixes... */ ) {
    if ( input == null ) exit();
    return array_slice.call( arguments ).reverse().join( '' );
  },

  /**
   * @param {...string} [comparable="undefined"]
   *   strings to compare with
   * @returns {boolean} -
   *   whether or not this' string strictly equals the
   *   string representation of all `comparable`s
   */
  isEqual: function( input /*, comparables */ ) {
    input = input != null ? String( input ) : exit();

    var args = arguments, // promote compression
      i = args.length;

    // early exit if no comparables passed
    if ( i === 1 ) return input === 'undefined';

    // break on zero by pre-decrementing
    while ( --i && input === String( args[ i ] ) );

    return !i;
  },

  /**
   * @deprecated slow
   * @see isEqual
   * @todo test and benchmark across browsers
   */
  isEqual2: function( /* comparables */) {
    var args = arguments, // promote compression
      input = array_shift.call( args ), // mutates arguments - slow
      i = args.length;

    input = input != null ? String( input ) : exit();

    // early exit if no comparables passed
    if ( !i ) return input === 'undefined';

    // skips first argument
    while ( i-- && input === String( args[ i ] ) );

    return i === -1;
  }, 

  /**
   * case-insensitive version of [Stryng.isEqual](#isEqual)
   * @param {...string} [comparable='undefined']
   *   strings to compare with
   * @returns {boolean} -
   */
  isEquali: function( input /*comparables */ ) {
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
   * @deprecated slower
   * @see isEquali
   */
  isEquali2: function( /* input, comparables */) {
    // workaround an _Array#map_ polyfill
    var args = arguments,
      i = args.length;

    while ( i-- ) args[ i ] = String( args[ i ] ).toLowerCase();

    return Stryng.isEqual.apply( null, args );
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
    return !input || !reNoWS.test( input );
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

// building Stryng
// ===============

// the `substr` check
// ------------------

if ( 'xy'.substr( -1 ) !== 'y' ) shim_methods.push( 'substr' );

// custom methods
// --------------

object_forOwn.call( stryng_members, function( fn, fnName ) {

  // make custom `exit` work
  fn._name = fnName;

  // static methods
  Stryng[ fnName ] = fn;

  // instance methods
  Stryng.prototype[ fnName ] = function() {
    
    // prepend the context
    array_unshift.call( arguments, this._value );

    var result = fn.apply( null, arguments );

    // if the instance is configured to be mutable
    // set the value and return `this`. if it isn't
    // return a new instance of Stryng constructed
    // from the result. if the result isn't a string
    // at all, simply return it.
    return (
      typeof result === 'string'
      ? this._isMutable
      ? ( this._value = result, this )
      : new Stryng( result )
      : result
    );
  };
} );

// native methods
// --------------

array_forEach.call( methods, function( fnName ) {

  var fn = string[ fnName ];

  // do not override our implementations
  // if the native ones are broken
  if ( is.Function( fn ) && shim_methods.indexOf(fnName) === -1) {
    
    // static methods - prefer native generics over constructing one.
    // errors caused by wrong usage of native generic function however
    // won't be thrown by Stryng's custom exit method.
    Stryng[ fnName ] = String[ fnName ] || function( input ) {
      if ( input == null ) exit();
      return function_call.apply( fn, arguments )
    }

    // make custom exit work
    Stryng[ fnName ]._name = fnName;

    // instance methods
    Stryng.prototype[ fnName ] = function( /* arguments */) {
      
      var result = fn.apply( this._value, arguments );

      return (
        typeof result === 'string'
        ? this._isMutable
        ? ( this._value = result, this )
        : new Stryng( result )
        : result
      );
    };
  }
} );

// seemlessness
// ------------
// by overriding `valueOf` and `toString` on the prototype
// chain, instances of Stryng can be used like native ones
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

  length = toInteger( length );

  // printable ASCII characters by default
  from = from === void 0 ? 32 : ( from >>> 0 );
  to = to === void 0 ? 126 : ( to >>> 0 );

  var result = '',
    diff = to - from;

  if ( diff > 0 ) {
    while ( length-- ) {
      result += String_fromCharCode( from + Math_random() * diff | 0 );
    }
  }

  return result;
};

Stryng.random._name = 'random';

/**
 * delegates to native [String.fromCharCode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/fromCharCode).
 * @param {...number} charCode
 * @returns {string} - 
 *   the concatenated string representations of the given
 *   `charCode`s from the UTF-16 table. empty if no arguments passed
 */
Stryng.chr = function( /* charCodes,... */ ) {
  return String_fromCharCode.apply( null, arguments );
};

Stryng.chr._name = 'chr'; 

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

// aliases
// -------

array_forEach.call( Object_keys( stryng_members ), function( fnName ) {

  var alias = new Stryng( fnName );

  if ( alias.endsWith( 'Left' ) ) {
    alias = alias.stripRight( 'Left' ).prepend( 'l' );

    Stryng[ alias ] = Stryng[ fnName ];
    Stryng.prototype[ alias ] = Stryng.prototype[ fnName ];
  } else if ( alias.endsWith( 'Right' ) ) {
    alias = alias.stripRight( 'Right' ).prepend( 'r' );

    Stryng[ alias ] = Stryng[ fnName ];
    Stryng.prototype[ alias ] = Stryng.prototype[ fnName ];
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
 * @returns {Stryng} - the inner reference _Stryng_ holds to itself
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