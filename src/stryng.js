
// leverage uglifyjs' ability to declare global variables
if ( typeof DEBUG === 'undefined' ) DEBUG = true;

// baseline setup
// ==============

( function() {

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
    methods = array = ( 'charAt,' // charAt
      + 'charCodeAt,' // charCodeAt
      + 'codePointAt,' // codePointAt
      + 'concat,' // concat
      + 'contains,' // contains
      + 'endsWith' // endsWit
      + 'indexOf,' // indexOf
      + 'lastIndexOf,' // lastIndexOf
      + 'localeCompare,' // localeCompare
      + 'match,' // match
      + 'normalize,' // normalize
      + 'replace,' // replace
      + 'search,' // search
      + 'slice,' // slice
      + 'split,' // split
      + 'startsWith,' // startsWith
      + 'substr,' // substr
      + 'substring,' // substring
      + 'toLocaleLowerCase,' // toLocaleLowerCase
      + 'toLocaleUpperCase,' // toLocaleUpperCase
      + 'toLowerCase,' // toLowerCase
      + 'toUpperCase,' // toUpperCase
      + 'trim,' // trim
      + 'trimLeft,' // trimLeft
      + 'trimRight' // trimRight
    ).split( ',' ),

    // methods which's native implementations to override if necessary
    shim_methods = [],

    // inner module to hold type/class check functions.
    is = object = {},

    // method shortcuts
    // ----------------
    // create quick access variables for both native static functions
    // and instance methods. polyfills are reduced in functionality and byte-size.
    // they are thus __for internal use only__ and neither populated onto
    // native prototypes nor intended to be spec-compliant.

    // ### static methods

    JSON_stringify = typeof JSON !== 'undefined' && JSON.stringify,
    Math_floor = Math.floor,
    Math_random = Math.random,
    String_fromCharCode = String.fromCharCode,
    String_fromCodePoint = String.fromCodePoint,

    // fully [spec](http://www.ecma-international.org/ecma-262/5.1/#sec-9.4) compliant
    // implementation of `Number.toInteger`, tested and benchmarked at [jsperf](http://jsperf.com/to-integer/11).
    Number_toInteger = Number.toInteger || function( any ) {
      return (
        ( n = +n ) && isFinite( n ) // toNumber and isFinite
        ? n - ( n % 1 ) // ceil negatives, floor positives
        : n || 0 // leave be +-Infinity, translate NaN to zero
      );
    },

    // - try to define a dummy property on an object literal which fails
    //   - either in case `defineProperty` isn't available
    //   - or only DOM objects are allowed as first argument
    // - if successful, return the reference to that function
    // - implicitely return `undefined` otherwise
    Object_defineProperty = ( function( defineProperty ) {
      try {
        defineProperty( {}, string, {
          value: 1
        } );
        return defineProperty;
      } catch ( e ) {}

    } )( Object.defineProperty ),

    // ### instance methods

    array_push = array.push,
    array_slice = array.slice,
    array_unshift = array.unshift,
    function_call = func.call,
    object_toString = object.toString,

    array_forEach = array.forEach || function( iterator ) {

      var array = this,
        i = array.length;

      while ( i-- ) iterator( array[ i ] );
    },

    // make this one pretty for the w3c wishlist.
    // used in favor of the composition of _Array#forEach_ and _Object.keys_.
    object_forOwn = function( iterator, context ) {

      var object = this,
        key, return_value;

      if ( object == null ) {
        throw new TypeError( 'can\'t convert ' + object + ' to object' );
      }

      object = Object( object );

      for ( key in object ) {
        if ( object.hasOwnProperty( key ) ) {
          return_value = iterator.call( context, object[ key ], key, object );
          if ( return_value === false ) {
            break;
          }
        }
      }
    },

    // regular expressions
    // -------------------

    // used to check whether a regular expression's `source`
    // is suitable for reverse search. see _Stryng#endsWith_ or _Stryng#splitRight_.
    re_source_matches_end = regex = /[^\\]\$$/,

    // ### diacritics & liguatures
    // because character mappings easily grow large we only provide
    // the [Latin-1 Supplement](http://unicode-table.com/en/#latin-1-supplement)
    // ( letters in range [u00C0-u00FF] ) mapped to their nearest character
    // allowed in URL path segments. this _should_ cover
    // 
    // - english (of course)
    // - german
    // - french
    // - spanish
    // - portuguese
    // - italian
    // - romanian
    // 
    // we also rely on native _String#toLowerCase_ and _String#toUpperCase_
    // to properly convert characters - <a href="javascript:alert('give me the link!')">which they don't</a>
    latin_1_supplement = {
      'A': '\\xC0-\\xC5',
      'a': '\\xE0-\\xE5',
      'AE':'\\xC6',
      'ae':'\\xE6',
      'C': '\\xC7',
      'c': '\\xE7',
      'E': '\\xC8-\\xCB',
      'e': '\\xE8-\\xEB',
      'I': '\\xCC-\\xCF',
      'i': '\\xEC-\\xEF',
      'D': '\\xD0',
      'd': '\\xF0',
      'N': '\\xD1',
      'n': '\\xF1',
      'O': '\\xD2-\\xD6\\xD8',
      'o': '\\xF2-\\xF6\\xF8',
      'U': '\\xD9-\\xDC',
      'u': '\\xF9-\\xFC',
      'Y': '\\xDD',
      'y': '\\xFD\\xFF',
      'sz': '\\xDF'
    };

  // compile the character ranges to regular expressions
  object_forOwn.call( latin_1_supplement, function( chars, nearest_char ) {
    latin_1_supplement[ nearest_char ] = new RegExp( '[' + chars + ']', 'g' );
  } );

  // ### the whitespace shim
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

  var re_no_whitespace = /\S/,
    re_whitespaces = /\s\s*/g,
    re_trim_left = /^\s\s*/,
    re_trim_right = /\s*\s$/,
    re_linebreaks = /\r?\n|\u2028|\u2029/g;

  ( function() {

    var is_spec_compliant = true,
      re_whitespace = /\s/,
      re_whitespace_source = re_whitespace.source,

      whitespace = ( '' + '\t' // '\u0009' tab
        + '\n' // '\u000A' line feed
        + '\13' // '\u000B' vertical tab
        + '\f' // '\u000C' form feed
        + '\r' // '\u000D' carriage return
        + ' ' // '\u0020' space

        + '\xA0' // NBSP
        + '\u1680\u180E\u2000\u2001' // prevent
        + '\u2002\u2003\u2004\u2005' // formatter
        + '\u2006\u2007\u2008\u2009' // from
        + '\u200A\u202F\u205F\u3000' // mangling

        + '\u2028' // line separator
        + '\u2029' // paragraph separator
        + '\uFEFF' // BOM - byte order mark
      );

    array_forEach.call( whitespace, function( chr ) { // Array#forEach is generic

      if ( !re_whitespace.test( chr ) ) {
        re_whitespace_source += chr;
        is_spec_compliant = false;
      }

    } );

    if ( !is_spec_compliant ) {

      shim_methods.push( 'trim', 'trimRight', 'trimLeft' );

      var re_whitespaces_source = '[' + re_whitespace_source + '][' + re_whitespace_source + ']*';

      re_no_whitespace = new RegExp( '[^' + re_whitespace_source + ']' );
      re_whitespaces = new RegExp( re_whitespaces_source, 'g' );
      re_trim_left = new RegExp( '^' + re_whitespaces_source );
      re_trim_right = new RegExp( '[' + re_whitespace_source + ']+$' );
    }

  }() );

  // the `substr` check
  // ------------------
  // check to see if the native implementation
  // correctly deals with negative indices.
  // mark as _to be shimmed_ if it doesn't.

  if ( 'xy'.substr( -1 ) !== 'y' ) shim_methods.push( 'substr' );

  // custom exit
  // -----------
  // wraps the process of throwing an _Error_.
  // in _DEBUG_ mode composes the error's message
  // of the custom _Stryng_ function's `_name` property
  // and the arguments passed i.e. logs the stacktrace of the level above.
  // 
  // - get the `caller` function
  // - stringify its arguments
  // - throw the error with the custom message
  function exit( message ) {
    if ( DEBUG ) {

      var args = '',
        caller = arguments.callee.caller,
        caller_args = caller.arguments,
        caller_args_len = caller_args.length,
        i = 0,
        message = 'invalid usage of Stryng.' + caller._name + '() with args [';

      for(; i < caller_args_len; i++ ){
        args += caller_args[i] + ',';
      }

      throw new Error( message + ( args ? args.slice( 0, -2 ) : '' ) + ']. ' + ( message || '' ) );

    } else {
      throw new Error( 'invalid usage of Stryng member. ' + ( message || '' ) );
    }
  }

  // type safety
  // -----------
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

  // defining Stryng
  // ===============

  // constructor
  // -----------

  /**
   * @class Stryng
   * @param {*} [value=""]
   *   the value to parse. defaults to the empty string
   * @param {boolean} [is_mutable=false]
   *   whether the created instance should be mutable or
   *   create a new instance from the result of every method call
   * @return {Stryng} -
   *   the `input`'s string representation wrapped
   *   in the instance returned.
   */
  function Stryng( value, is_mutable ) {

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
     * @name Stryng~_is_mutable
     * @type {boolean}
     */
    this._is_mutable = !! is_mutable;

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
  // ----------------
  /**
   * in case the instance was not constructed to be mutable
   * this is the hook to get a copy of it. delegates to [Stryng#constructor](#Stryng)
   * @param {boolean} [is_mutable=false]
   *   whether the cloned instance should be mutable or
   *   create a new instance from the internal result of every method call
   * @return {Stryng} -
   *   a copy of the _Stryng_ instance
   */
  Stryng.prototype.clone = function( is_mutable ) {
    return new Stryng( this._value, is_mutable );
  };

  // instance methods & static functions
  // -----------------------------------
  // the herein defined methods will be available as both
  // static functions on the `Stryng` namespace and instance methods
  // of the `Stryng` class. they are declared as static but __documented as
  // instance methods__, which makes it a lot shorter, less verbose and
  // easier to highlight the fact that all instance methods are availabe
  // as static ones but __not vice versa__. the one exception to this is [Stryng#clone](#clone)
  // which only lives on _Stryng_'s prototype.

  /**
   * @lends Stryng.prototype
   */
  var stryng_members = {

    /**
     * shim for native [String#trim](http://www.ecma-international.org/ecma-262/5.1/#sec-15.5.4.20)
     * @return {string}
     */
    trim: function( input ) {
      return input != null ?
        String( input )
        .replace( re_trim_left, '' )
        .replace( re_trim_right, '' ) : exit();
    },

    /**
     * shim for non-standard [String#trimLeft](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/TrimLeft)
     * @return {string}
     */
    trimLeft: function( input ) {
      return input != null ? String( input ).replace( re_trim_left, '' ) : exit();
    },

    /**
     * shim for non-standard [String#trimRight](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/TrimRight)
     * @return {string}
     */
    trimRight: function( input ) {
      return input != null ? String( input ).replace( re_trim_right, '' ) : exit();
    },

    /**
     * shim for native [String#contains](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/contains)
     * @param {string} [search="undefined"]
     * @param {number} [index=0] the index to start searching
     * @return {boolean} -
     *   whether or not `input` contains the substring `search`
     */
    contains: function( input, search, start ) {
      return input != null ? String( input ).indexOf( search, start ) !== -1 : exit();
    },

    /**
     * shim for native [String#startsWith](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.startswith)
     * @param {string|RegExp} [search="undefined"]
     * @param {number} [position=0]
     * @return {boolean} -
     *   whether or not `input` at index `position`
     *   begins with substring `search`
     */
    startsWith: function( input, search, position ) {
      input = input != null ? String( input ) : exit();

      // - if `search` is a regular expression,
      //   return whether or not it matches the beginning of
      //   this' string starting at `position`.
      // - otherwise let `i` be the index returned by _String#indexOf_.
      //   let `position` and `search` be parsed correctly internally
      // - return `false` if not found i.e. `i === -1`
      // - let `input_len` be this' string's length
      // - parse the `position` argument by the following rules
      //   - default and min to zero
      //   - max to `input_len`
      //   - floor if positive parsable, zero if `NaN`
      // - return whether or not `i` equals the above's result

      if ( is.RegExp( search ) ) {
        return !input.substring( position ).search( search );
      }

      var i = input.indexOf( search, position ),
        input_len;

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
     * @param {string} [search="undefined"]
     * @param {number} [end_position=input.length]
     * @return {boolean} -
     *   whether or not `input` truncated by `end_position`
     *   ends with substring `search`.
     */
    endsWith: function( input, search, end_position ) {
      input = input != null ? String( input ) : exit();

      // - let `input_len` be this' string's length
      // - parse the `end_position` argument by the following rules
      //   - default and max to `input_len`
      //   - min to zero
      //   - floor if parsable, zero if `NaN`
      // - if `search` is a regular expression
      //   - throw an error if the regular expression does not match the
      //     end of its input i.e. does not end with `'$'`
      //   - truncate this' string at `end_position`
      //   - return whether or not `search` matches the above's result
      // - otherwise let `i` be the index returned by _String#lastIndexOf_.
      //   let `position` and `search` be parsed correctly internally
      // - return `false` if not found i.e. `i === -1`
      // - return whether or not `i` equals the above's result

      var input_len = input.length,
        i,
        end_position = (
          end_position === void 0 || end_position > input_len ? input_len :
          end_position < 0 ? 0 :
          Math_floor( end_position ) || 0
        );

      if ( is.RegExp( search ) ) {

        if ( !re_source_matches_end.test( search.source ) ) {
          exit( '"search" must match end i.e. end with "$"' );
        }

        return search.test( input.substring( 0, end_position ) );
      }

      search = String( search );

      if ( !search ) return true;

      i = input.lastIndexOf( search, end_position );

      return i !== -1 && ( i + search.length === end_position );
    },

    /**
     * shim for native [String#repeat](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.repeat).
     * reduction of concat operations inspired by [mout/string/repeat](https://github.com/mout/mout/blob/v0.9.0/src/string/repeat.js)
     * @param {number} [n=0]
     * @return {string} -
     *   this' string `n` times concatenated to the empty string.
     * @throws if <code>Number_toInteger( n )</code> is either negative or infinite.
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
     * @param {number} [position=0]
     * @param {number} [length=length-position] this' string's length minus `position`
     * @return {string}
     */
    substr: function( input, position, length ) {
      input = input != null ? String( input ) : exit();

      // - parse the `position` argument.
      //   - if `Number_toInteger( position )` is negative, add `input.length`
      //   - if it still is negative, set it to zero
      // - leave it up to `substr`'s implicit parsing any otherwise
      position = position <= -1 ? ( position = Number_toInteger( position ) + input.length ) < 0 ? 0 : position : position;

      return input.substr( position, length );
    },

    /**
     * prepends and appends `outfix` to `input` in one go.
     * to do the opposite use [Stryng.strip](#strip).
     * @param {string} [outfix="undefined"] prefix and suffix
     * @param {number} [n=0] number of operations
     * @return {string}
     * @requires Stryng#repeat
     */
    wrap: function( input, outfix, n ) {
      if ( input == null ) exit();
      // implies parsing `outfix` and `n`
      outfix = Stryng.repeat( outfix, n );
      return outfix + input + outfix;
    },

    /**
     * @param {string} [search="undefined"]
     *   substring to search for
     * @return {number} -
     *   number of non-overlapping occurrences of `search` within `input`.
     *   the empty string is considered a _character boundary_
     *   thus `input.length + 1` will always be the result for that.
     */
    count: function( input, search ) {
      input = input != null ? String( input ) : exit();

      search = String( search );

      // early exit for the empty search
      if ( !search ) return input.length + 1;

      var length = search.length,
        count = 0,
        i = -length; // prepare first run

      do i = input.indexOf( search, i + length );
      while ( i !== -1 && ++count )

      return count;
    },

    /**
     * delegates to _Arrray#join_.
     * @param {...string} [joinees=[]]
     * @return {string} -
     *   `joinees` joined by native `Array.prototype.join`.
     *   return the empty string if no second, third .. argument is passed
     * @example
     * ```
     * Stryng.join(' ', the', ['quick', ['brown', ['fox']]]); // yeilds 'the quick brown fox'
     * ```
     */
    join: function( delimiter /*, string... */ ) {
      var args = arguments; // promote compression

      if ( delimiter == null ) exit();
      if ( args.length === 1 ) return '';

      return array_slice.call( args, 1 ).join( delimiter );
    },

    /**
     * this is a naive implementation of reversing a string.
     * for an alternative that know how to properly reverse
     * diacritics and accented character use [esrever](https://github.com/mathiasbynens/esrever).
     * @return {string} -
     *   the reversed string. usefull yet unefficient to verify palindroms.
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
     * @return {string} -
     *   the `input` split at `position` and rejoined using `insertion` as the delimiter
     */
    insert: function( input, position, insertion ) {
      input = input != null ? String( input ) : exit();

      // slice's native parsing will apply different
      // defaults for `undefined` to the first and second argument
      if ( position === void 0 ) position = Number_toInteger( position );

      // implies parsing `insertion`
      return input.slice( 0, position ) + insertion + input.slice( position );
    },

    /**
     * @param {string|RegExp} [delimiter="undefined"]
     * @param {number} [n=Math.pow(2,32)-1]
     *   maximum number of split operations.
     *   as per [ecma-262/5.1](http://www.ecma-international.org/ecma-262/5.1/#sec-15.5.4.14)
     * @return {string[]} -
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
        while ( n-- && ( match = input.match( delimiter ) ) ) {
          index = match.index;
          result.push( input.substring( 0, index ) );
          lastIndex = index + match.shift().length; // mutates `match`
          if ( lastIndex <= index ) lastIndex = index + 1; // avoid endless loop
          if ( match.length ) array_push.apply( result, match ); // mutate instead of recreate as concat would
          input = input.substring( lastIndex );
        }
        result.push( input ); // push what's left
      } else {
        delimiter = String( delimiter );
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
     * @param {number} [n=Math.pow(2,32)-1]
     *   maximum number of split operations.
     *   defaults to the number of non-overlapping occurrences of `delimiter`
     * @return {string[]} -
     *   the `input` split by the given `delimiter`
     *   with anything in front of the `n`th occurrence of
     *   `delimiter` - counting backwards - untouched yet included in the array.
     */
    splitRight: function( input, delimiter, n ) {
      input = input != null ? String( input ) : exit();

      // - parse `n` with `toUInt32`, default to `Math.pow(2, 32) - 1`
      // - return the empty array if `n` is zero
      // - if `delimiter` is a regular expression
      //   - check its source if it matches a string's end by `$`
      //   - extract `n` matches using _String#match_ combined with
      //     subsequently truncating this' string.
      //   - unshift the substrings between the matches and any captured groups to `result`
      // - otherwise let `result` be the result of _String#split_
      //   called on this' string with `delimiter`
      // - if argument `n` is lesser than `result.length`
      //   - remove the first `n` items from `result`
      //   - rejoin them using `delimiter`
      //   - unshift them to `result` as one
      // - return `result`

      n = ( n === void 0 ? -1 : n ) >>> 0;

      if ( !n ) return [];

      var result,
        index,
        lastIndex,
        match,
        diff;

      if ( is.RegExp( delimiter ) ) {

        if ( !re_source_matches_end.test( delimiter.source ) ) {
          exit( '"delimiter" must match end i.e. end with "$"' );
        }

        while ( n-- && ( match = input.match( delimiter ) ) ) {
          index = match.index;
          lastIndex = index + match.shift().length; // mutates `match`
          result.unshift( input.substring( lastIndex ) );
          if ( index >= lastIndex ) index = lastIndex - 1; // avoid endless loop
          if ( match.length ) array_unshift.apply( result, match ); // mutate instead of recreate as concat would
          input = input.substring( 0, index );
        }
        result.unshift( input ); // unshift what's right
      } else {

        delimiter = String( delimiter );
        result = input.split( delimiter ),
        diff = result.length - n;

        if ( diff > 0 ) {
          result.unshift( result.splice( 0, diff ).join( delimiter ) );
        }
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
     * splits a string at the given indices. negative indices are allowed.
     * if the resulting substrings overlap, the first one dominates, the latter is front-cut.
     * @param {...number} index indices to split at. negatives allowed
     * @return {string[]} -
     *   the resulting array of substrings.
     */
    splitAt: function( input /*, index... */ ) {
      input = intput != null ? String( input ) : exit();

      // - for each index
      //   - if it is negative, add this' string's length
      //   - apply `pending_index` of the previous iteration ( initially zero ) as `index`'s minimum
      //   - let native _String#slice_ apply the maximum
      //   - push what's within input between `pending_index` and `index` to `result`
      //   - update `pending_index` for the next iteration
      // - push what's left to the result and return it.

      var input_len = input.length,
        args = arguments,
        args_len = args.length,
        i = 1, // skip `input`
        index = 0,
        pending_index = 0,
        result = [];

      for ( ; i < args_len; i++ ) {
        index = Number_toInteger( args[ i ] );
        if ( index < 0 ) {
          index += input_len;
        }
        if ( index <= pending_index ) {
          result.push( '' ); // faster than slicing the empty string first
          index = pending_index;
        } else {
          result.push( input.slice( pending_index, index ) );
          pending_index = index;
        }
      }
      result.push( input.substring( index ) );
      return result;
    },

    /**
     * @param {string} [replacee="undefined"] string to replace
     * @param {string} [replacement="undefined"] replacement
     * @return {string} -
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
     * @param {number} max_len
     * @param {string} fill
     * @return {string}
     *   the `input` with `fill` appended as often as needed for `input`
     *   to reach but not exceed a length of `max_len`. this' string is never truncated.
     * @see Stryng.justLeft, Stryng.justRight
     */
    just: function( input, max_len, fill ) {
      if ( input == null || max_len <= -1 || max_len == INFINITY ) exit();

      input = String( input );
      fill = String( fill );
      max_len = max_len < 0 ? 0 : Math_floor( max_len ) || 0;

      var input_len = input.length,
        fill_len = fill.length * 2; // safe, `<< 1` isn't

      // early exit for the empty fill
      if ( max_len <= input_len || !fill ) return input;

      while ( input.length + fill_len <= max_len ) {
        input = fill + input + fill;
      }

      return input;
    },

    /**
     * @param {number} max_len
     * @param {string} fill
     * @return {string} -
     *   the `input` with `fill` prepended as often as needed for `input`
     *   to reach but not exceed a length of `max_len`. this' string is never truncated.
     * @see Stryng#justRight, Stryng#just
     */
    justLeft: function( input, max_len, fill ) {
      if ( input == null || max_len <= -1 || max_len == INFINITY ) exit();

      input = String( input );
      fill = String( fill );
      max_len = max_len < 0 ? 0 : Math_floor( max_len ) || 0;

      var input_len = input.length;

      // early exit for the empty fill
      if ( max_len <= input_len || !fill ) return input;

      var fill_len = fill.length;

      while ( input.length + fill_len <= max_len ) {
        input = fill + input;
      }

      return input;
    },

    /**
     * @param {number} max_len
     * @param {string} fill
     * @return {string}
     *   the `input` with `fill` appended as often as needed for `input`
     *   to reach but not exceed a length of `max_len`. this' string is never truncated.
     * @see Stryng.justLeft, Stryng.just
     */
    justRight: function( input, max_len, fill ) {
      if ( input == null || max_len <= -1 || max_len == INFINITY ) exit();

      input = String( input );
      fill = String( fill );
      max_len = max_len < 0 ? 0 : Math_floor( max_len ) || 0;

      var input_len = input.length
      fill_len = fill.length;

      if ( max_len <= input_len || !fill ) return input;

      while ( input.length + fill_len <= max_len ) {
        input += fill;
      }

      return input;
    },

    /**
     * strips `prefix` from the left of `input` `n` times.
     * @param {string} [prefix="undefined"]
     *   string to remove
     * @param {number} [n=Math.pow(2, 32) - 1]
     *   number of operations.
     * @return {string} -
     * @example
     * Stryng.stripLeft('lefty loosy', 'lefty ');
     * // return 'loosy'
     *
     * Stryng.stripLeft('blubblubblub', 'blub');
     * // return the empty string
     */
    stripLeft: function( input, prefix, n ) {
      input = input != null ? String( input ) : exit();

      // - parse `n` with `toUInt32`, default to `Math.pow(2, 32) - 1`
      // - parse `prefix` to string
      // - early exit before processing senseless arguments
      // - set an index `pending_i` to zero
      // - increment it by `prefix.length` as long as fast native
      //   _String#indexOf_ return just the result of that addition
      //   and we are not running out of `n`.
      n = ( n === void 0 ? -1 : n ) >>> 0;
      prefix = String( prefix );

      if ( !n || !prefix ) return input;

      var
      prefix_len = prefix.length,
        pending_i = 0,
        i;

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
     * @return {string} -
     */
    stripRight: function( input, suffix, n ) {
      input = input != null ? String( input ) : exit();

      // - parse `n` with `toUInt32`, default to `Math.pow(2, 32) - 1`
      // - parse `suffix` to string
      // - early exit before processing senseless arguments
      // - set an index `p` to `input.length`
      // - decrement it by `suffix.length` as long as fast native
      //   _String#lastIndexOf_ return just the result of that subtraction
      //   and we are not running out of `n`.

      n = ( n === void 0 ? -1 : n ) >>> 0;
      suffix = String( suffix );

      if ( !n || !suffix ) return input;

      var
      suffix_len = suffix.length,
        pending_i = input.length,
        i;

      do {
        pending_i -= suffix_len;
        i = input.lastIndexOf( suffix, pending_i );
      }
      while ( n-- && i !== -1 && i === pending_i );

      return input.substring( 0, pending_i + suffix_len );
    },

    /**
     * the combination of [Stryng.stripLeft](#stripLeft) and [Stryng.stripRight](#stripRight)
     * @param {string} outfix string to remove
     * @param {number} [n=1] number of operations (recursion depth)
     * @return {string} -
     *
     */
    strip: function( input, outfix, n ) {
      return Stryng.stripRight( Stryng.stripLeft( input, outfix, n ), outfix, n );
    },

    /**
     * @param {number} max_len length of the result.
     * @param {string} [ellipsis="..."]
     * @return {string} -
     *   the `input` sliced to fit the given
     *   `max_len` including the `ellipsis`
     */
    truncate: function( input, max_len, ellipsis ) {
      input = input != null ? String( input ) : exit();

      // - parse `max_len` with `toUInt32`, default to `Math.pow(2, 32) - 1`
      // - if `max_len` is zero return the empty string
      // - if `max_len` is bigger than `input.length`
      //   there's to need to truncate, return this' string
      // - parse `ellipsis` to string, default to `'...'`
      // - if `ellipsis.length` is bigger than `max_len`,
      //   return the last `max_len` characters of `ellipsis`
      // - return the concatenation of this' string's first
      //   `max_len - ellipsis_len` characters and `ellipsis`

      max_len = ( max_len === void 0 ? -1 : max_len ) >>> 0;

      if ( !max_len ) return '';
      if ( max_len >= input.length ) return input;

      ellipsis = ellipsis !== void 0 ? String( ellipsis ) : '...';

      var ellipsis_len = ellipsis.length;

      if ( ellipsis_len >= max_len ) return ellipsis.slice( -max_len );

      return input.substring( 0, max_len - ellipsis_len ) + ellipsis;
    },

    /**
     * @return {string}
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

      var i = 0,
        result = '',
        input_len = input.length,
        char_code;

      for ( ; i < input_len; i++ ) {
        char_code = input.charCodeAt( i );

        result +=
          char_code === 34 ? '\\"' : // double quote
        char_code === 92 ? '\\\\' : // backslash
        31 < char_code && char_code < 127 ? String_fromCharCode( char_code ) : // ASCII printables
        char_code === 8 ? '\\b' : // backspace
        char_code === 9 ? '\\t' : // tab
        char_code === 10 ? '\\n' : // new line
        char_code === 12 ? '\\f' : // form feed
        char_code === 13 ? '\\r' : // carriage return
        (
          char_code < 256 ? '\\x' + ( char_code < 16 ? '0' : '' ) : '\\u' + ( char_code < 4096 ? '0' : '' )
        ) + char_code.toString( 16 );
      }

      return '"' + result + '"';
    },

    /**
     * @return {string}
     */
    unquote: function( input ) {
      return input != null ?
        String( input ).replace( /\\([btnfr"\\])/g, function( _, esc ) {
          return (
            esc === 'b' ? '\b' : // backspace
            esc === 't' ? '\t' : // tab
            esc === 'n' ? '\n' : // new line
            esc === 'f' ? '\f' : // form feed
            esc === 'r' ? '\r' : // carriage return
            esc // backslash and double quote
          )
        } ).replace( /[xu]([0-9A-F]{2})([0-9A-F]{2})?/gi, function( _, x, u ) {
          return String_fromCharCode( parseInt( x + ( u || '' ), 16 ) );
        } ).slice( 1, -1 ) : exit();
    },

    /**
     * @return {number[]} -
     *   an array of char code numbers representing this' string.
     */
    ord: function( input ) {
      input = input != null ? String( input ) : exit();

      var
      i = input.length,
        result = Array( i );

      while ( i-- ) result[ i ] = input.charCodeAt( i );

      return result;
    },

    /**
     * prepends the prefixes to this' string in the given order.
     * @param {string} prefix
     *   an arbitrary number of strings to prepend recursivelyin the given order
     * @return {string}
     */
    prepend: function( input, prefix ) {
      input = input != null ? String( input ) : exit();
      return prefix + input;
    },

    /**
     * @param {string} [comparable="undefined"]
     *   strings to compare with
     * @return {boolean} -
     *   whether or not this' string strictly equals the
     *   string representation of all `comparable`s
     */
    isEqual: function( input, comparable ) {
      input = input != null ? String( input ) : exit();
      return String( comparable ) === input;
    },

    /**
     * @return {boolean} - whether the string has length `0`
     */
    isEmpty: function( input ) {
      return input != null ? !String( input ) : exit();
    },

    /**
     * @return {boolean} - whether the string is empty or consists of whitespace only
     */
    isBlank: function( input ) {
      input = input != null ? String( input ) : exit();
      return !input || !re_no_whitespace.test( input );
    },

    collapseWhitespace: function( input ) {
      return input != null ? String( input ).replace( re_whitespaces, ' ' ) : exit();
    },

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

      var input_len = input.length;

      return ( !input_len ? input :
        input_len === 1 ? input.toUpperCase() :
        input.charAt( 0 ).toUpperCase() + input.substring( 1 )
      );
    },

    /**
     * inspired by [emberjs](http://emberjs.com/api/classes/Ember.String.html#method_camelize)
     * note that this leaves the very first letter untouched.
     * for a classified output compose this method with _Stryng#capitalize_.
     * @return {string} -
     *   this' string transformed into camel case by
     *   removing all occurences of space, underscore and hyphen
     *   and upper casing the first lower cased letter following those.
     */
    camelize: function( input ) {
      return input != null ?
        String( input )
        .replace( /[ _-]([a-z]?)/g, function( _, character ) {
          return character ? character.toUpperCase() : '';
        } ) : exit();
    },

    /**
     * inspired by [emberjs](http://emberjs.com/api/classes/Ember.String.html#method_underscore)
     * @return {string} -
     *   this' string transformed into an underscored form by
     *   inserting `_` where upper cased letters follow lower ones,
     *   replacing space and hyphen by `_` and finally lower casing the output.
     */
    underscore: function() {
      return input != null ?
        String( input )
        .replace( /([a-z])([A-Z])/g, '$1_$2' )
        .replace( /[ -]/g, '_' )
        .toLowerCase() : exit();
    },

    /**
     * inspired by [emberjs](http://emberjs.com/api/classes/Ember.String.html#method_dasherize)
     * @return {string} -
     *   this' string transformed into an underscored form by
     *   inserting `-` where upper cased letters follow lower ones,
     *   replacing space and underscore by `-` and finally lower casing the output.
     */
    dasherize: function() {
      return input != null ?
        String( input )
        .replace( /([a-z])([A-Z])/g, '$1-$2' )
        .replace( /[ _]/g, '-' )
        .toLowerCase() : exit();
    },

    /**
     * replaces ligatures and diacritics from the Latin-1 Supplement
     * with their nearest plain letter, replaces symbols otherwise being percentescaped.
     * compose this method with _Stryng#dasherize_ to produce URL slugs
     * @return {string} [description]
     */
    slugify: function( input ) {
      input = input != null ? String( input ) : exit();
      object_forOwn.call( latin_1_supplement, function( re, nearest_char ) {
        input = input.replace( re, nearest_char );
      } );
      return Stryng.dasherize( input );
    }
  };

  // static functions
  // ----------------

  /**
   * generates a string of random characters which default to the ASCII printables.
   * to choose randomly from the whole Unicode table call `Stryng.random(n, 0, -1)`.
   * @param {number} [n=0]
   * @param {number} [from=32] inclusively
   * @param {number} [to=127] exclusively assuming _Math.random_ never yields `1`
   * @return {string} -
   *   string of length `n` with characters (ASCII by default)
   *   randomly choosen from the Unicode table with
   *   code-range [`from`, `to`]
   */
  Stryng.random = function( n, from, to ) {
    if ( n <= -1 || n == INFINITY ) exit();

    n = n < 0 ? 0 : Math_floor( n ) || 0;
    from = from === void 0 ? 32 : ( from >>> 0 );
    to = to === void 0 ? 127 : ( to >>> 0 );

    if ( to > MAX_CHARCODE ) exit();

    var result = '',
      diff = to - from;

    if ( diff > 0 ) {
      while ( n-- ) {
        result += String_fromCharCode( from + Math_floor( Math_random() * diff ) );
      }
    }

    return result;
  };

  if ( DEBUG ) Stryng.random._name = 'random';

  /**
   * delegates to native [String.fromCharCode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/fromCharCode).
   * @param {...number} charCode
   * @return {string} -
   *   the concatenated string representations of the given
   *   `charCode`s from the UTF-16 table. empty if no arguments passed
   */
  Stryng.chr = function( /* charCodes,... */) {
    var args = arguments,
      i = args.length;
    while ( i-- )
      if ( args[ i ] > MAX_CHARCODE ) exit('char code ' + args[ i ] + ' is out of range.');
    return String_fromCharCode.apply( null, arguments );
  };

  if ( DEBUG ) Stryng.chr._name = 'chr';

  /**
   * restores the previous value assigned to `window.Stryng`.
   * @return {Stryng} -
   *   the inner reference _Stryng_ holds to itself
   */
  Stryng.noConflict = function() {
    window.Stryng = previous_Stryng;
    return Stryng;
  }

  /**
   * delegate directly to native [String.fromCharCode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/fromCharCode).
   * @function Stryng.fromCharCode
   * @param {number} [charCode]
   * @return {string} -
   *   string representation of the given `charCode`s from the UTF-16 table or
   *   the empty string if no arguments passed.
   */
  Stryng.fromCharCode = String_fromCharCode;
  Stryng.fromCodePoint = String_fromCodePoint;

  // building Stryng
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
  // - decides upon the type of `result` and whether this `_is_mutable` what to return.
  //   - if `result` isn't a string at all, simply return it
  //   - if the instance `_is_mutable`, assign `result` to `_value` and return `this`
  //   - if not, return a new instance of _Stryng_ constructed from `result`

  object_forOwn.call( stryng_members, function( fn, fn_name ) {

    if ( DEBUG ) fn._name = fn_name;

    Stryng[ fn_name ] = fn;

    Stryng.prototype[ fn_name ] = function( /* proxied arguments */) {

      var args = arguments,
        result;

      array_unshift.call( args, this._value );
      result = fn.apply( null, args );

      if ( typeof result === 'string' ) { // we can rest assured that this is a primitive
        if ( this._is_mutable ) {
          this._value = result;
          if ( !Object_defineProperty ) {
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
  // - decides upon the type of `result` and whether this `_is_mutable` what to return.
  //   - if the result isn't a string at all, simply return it
  //   - if the instance `_is_mutable`, set the value and return `this`
  //   - if not, return a new instance of _Stryng_ constructed from the result
  //   
  // [1]: http://bonsaiden.github.io/JavaScript-Garden/#function.arguments
  array_forEach.call( methods, function( fn_name ) {

    var fn = string[ fn_name ];

    if ( is.Function( fn ) && shim_methods.indexOf( fn_name ) === -1 ) {

      Stryng[ fn_name ] = String[ fn_name ] || function( input ) {
        if ( input == null ) exit();
        return function_call.apply( fn, arguments )
      }

      if ( DEBUG ) Stryng[ fn_name ]._name = fn_name;

      Stryng.prototype[ fn_name ] = function( /* proxied arguments */) {

        var result = fn.apply( this._value, arguments );

        if ( typeof result === 'string' ) { // we can rest assured that this is a primitive
          if ( this._is_mutable ) {
            this._value = result;
            if ( !Object_defineProperty ) {
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
      return this._value; // we can rest assured that this is a primitive
  }

  // aliases
  // -------
  // every function that ends with either `Left` or `Right` is
  // available with prefix `l` or `r` respectively instead.

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

}() );

/**
 * @callback contribution
 * @param {string} input the string to work on
 * @param {...*}
 * @return -
 *   string literal ( with `string instanceOf String` yielding false )
 */

// <script>document.write('<script src="http://' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1"></' + 'script>')</script>