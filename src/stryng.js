( function( root ) {
  'use strict';

  // baseline setup
  // ==============
  
  /**
   * Stryng's version.
   * @name Stryng.VERSION
   * @readOnly
   * @type {String}
   */
  var VERSION = '0.9.0',
    string = VERSION,

    // used for input validation
    INFINITY = 1 / 0,

    // used to limit _String.fromCharCode_
    MAX_CHARCODE = 65535, // Math.pow(2, 16) - 1

    // used to convert to string
    String = string.constructor,
    func = String,

    // methods _Stryng_ hopes to adopt
    methods = 'charAt,charCodeAt,codePointAt,concat,contains,endsWith,indexOf,lastIndexOf,localeCompare,match,normalize,replace,search,slice,split,startsWith,substr,substring,toLocaleLowerCase,toLocaleUpperCase,toLowerCase,toUpperCase,trim,trimLeft,trimRight'.split( ',' ),
    array = methods,

    // methods which's native implementations to override if necessary
    shim_methods = [],

    // whether or not to adopt native static functions
    adopt_native_statics,

    // inner module to hold type/class check functions
    is = {},
    object = is,

    // method shortcuts
    // ----------------
    // create quick access variables for both native static functions
    // and instance methods. polyfills are reduced in functionality and byte-size.
    // they are thus __for internal use only__ and neither populated onto
    // native prototypes nor intended to be spec-compliant.

    // ### native static methods

    core_stringify = typeof JSON !== 'undefined' && JSON.stringify,
    core_floor = Math.floor,
    core_random = Math.random,
    core_fromCharCode = String.fromCharCode,

    // fully [spec](http://www.ecma-international.org/ecma-262/5.1/#sec-9.4) compliant
    // implementation of `Number.toInteger`, tested and benchmarked at [jsperf](http://jsperf.com/to-integer/11).
    core_toInteger = Number.toInteger || function( n ) {
      return (
        ( n = +n ) && isFinite( n ) ? // toNumber and isFinite
        n - ( n % 1 ) : // ceil negatives, floor positives
        n || 0 // leave be +-Infinity, translate NaN to zero
      );
    },

    // feature detect native _Object.defineProperty_
    // and set _Stryng_'s version simultaneously.
    // 
    // - try/catch when
    //   - not available at all
    //   - or only supports DOM objects, IE8
    // - if successful, return the reference to that function
    // - implicitely return `undefined` otherwise
    core_defineProperty = ( function( defineProperty ) {
      try {
        defineProperty( Stryng, 'VERSION', {
          writable: false,
          value: VERSION
        } );
        return defineProperty;
      } catch ( e ) {
        Stryng.VERSION = VERSION;
      }
    } )( Object.defineProperty ),

    // ignore the [dont-enum bug](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys)
    core_keys = Object.keys || function( object ) {
      var keys = [], key, i = 0;

      for ( key in object ) {
        if ( object.hasOwnProperty( key ) ) {
          keys[ i++ ] = key;
        }
      }
      return keys;
    },

    // ### native instance methods

    core_push = array.push,
    core_slice = array.slice,
    core_unshift = array.unshift,
    core_call = func.call,
    core_toString = object.toString,

    core_forEach = array.forEach || function( iterator ) {
      for ( var array = this, i = array.length; i-- ; iterator( array[ i ] ));
    },

    core_contains = array.contains || function( item ) {
      for ( var array = this, i = array.length; i-- && array[ i ] !== item; );
      return i !== -1;
    },

    // for the w3c-wishlist: composition of _Array#forEach_ and _Object.keys_.
    core_forOwn = function( iterator, context ) {
      var object = this;
      core_forEach.call( core_keys( object ), function( key ) {
        return iterator.call( context, object[ key ], key );
      } );
    },

    // regular expressions
    // -------------------

    re_escaped_hex          = /\\[xu]([0-9a-fA-F]{2})([0-9a-fA-F]{2})?/g, // callback replace with char
    re_escaped_whitespace   = /\\([btnfr"\\])/g, // callback replace with char
    re_is_float             = /^\d+(?:\.\d*)?(?:[eE][\-\+]?\d+)?$/, // test only
    re_lower_boundary       = /[ _-]([a-z]?)/g, // callback toUpperCase 1st group
    re_lower_upper_boundary = /([a-z])([A-Z])/g, // callback '$1-$2' or '$1_$2'
    re_regexp_chars         = /([.*+?^=!:${}()|\[\]\/\\])/g, // callback '\\$1'
    re_source_matches_end   = /[^\\]\$$/, // test only
    re_space_hyphen         = /[ -]/g, // callback '_'
    re_space_underscore     = /[ _]/g, // callback '-'

    regex = re_escaped_hex,

    // ### diacritics & liguatures
    // because character mappings easily grow large we only provide
    // the [Latin-1 Supplement](http://unicode-table.com/en/#latin-1-supplement)
    // ( letters in range [xC0-xFF] ) mapped to their nearest character
    // allowed in URL path segments.
    // 
    // we also rely on native _String#toLowerCase_ and _String#toUpperCase_
    // to properly convert characters - <a href="javascript:alert('give me the link!')">which they don't</a>
    latin_1_supplement = {
      'A': '\\xC0-\\xC3\\xC5',
      'Ae': '\\xC4',
      'a': '\\xE0-\\xE3\\xE5',
      'AE': '\\xC6',
      'ae': '\\xE6\\xE4',
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
      'O': '\\xD2-\\xD5\\xD8',
      'Oe': '\\xD6',
      'o': '\\xF2-\\xF5\\xF8',
      'oe': '\\xF6',
      'U': '\\xD9-\\xDB',
      'Ue': '\\xDC',
      'u': '\\xF9-\\xFB',
      'ue': '\\xFC',
      'Y': '\\xDD',
      'y': '\\xFD\\xFF',
      'ss': '\\xDF'
    };

  // compile the character ranges to regular expressions to match and replace later
  core_forOwn.call( latin_1_supplement, function( chars, nearest_char ) {
    latin_1_supplement[ nearest_char ] = new RegExp( '[' + chars + ']', 'g' );
  } );

  // ### the whitespace shim
  // native implementations of _String#trim_ might miss out
  // on some of the more exotic characters considered [whitespace][1],
  // [line terminators][2] or the mysterious [Zs][3].
  // this section detects those flaws and constructs the regular expressions used
  // in the polyfills. Many thanks to the authors of [faster trim][4] and [whitespace deviations][5].
  // 
  // - let `re_whitespace` be the native white space matcher.
  // - iterate over our white space characters
  // - add all whitespace characters not recognized
  //   as such to the matcher's source.
  // - if the native implementation is not `is_spec_compliant`,
  //   reconstruct the regular expressions and mark
  //   their associated methods as _to be shimmed_
  //   
  // [1]: http://www.ecma-international.org/ecma-262/5.1/#sec-7.2
  // [2]: http://www.ecma-international.org/ecma-262/5.1/#sec-7.3
  // [3]: http://www.fileformat.info/info/unicode/category/
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
      re_whitespaces_source,

      hex_char_codes = (
        '0009,' + // tab
        '000A,' + // line feed
        '000B,' + // vertical tab
        '000C,' + // form feed
        '000D,' + // carriage return
        '0020,' + // space
        '00A0,' + // nbsp
        '1680,180E,2000,2001,' + // prevent
        '2002,2003,2004,2005,' + // formatter
        '2006,2007,2008,2009,' + // from
        '200A,202F,205F,3000,' + // inlining
        '2028,' +  // line separator
        '2029,' +  // paragraph separator
        'FEFF'     // byte order mark
      ).split( ',' ),
      chr;

    core_forEach.call( hex_char_codes, function( hex_char_code ) {

      chr = core_fromCharCode( parseInt( hex_char_code, 16 ) );

      if ( !re_whitespace.test( chr ) ) {
        re_whitespace_source += '\\u' + hex_char_code;
        is_spec_compliant = false;
      }

    } );

    if ( !is_spec_compliant ) {

      shim_methods.push( 'trim', 'trimRight', 'trimLeft' );

      re_whitespaces_source = '[' + re_whitespace_source + '][' + re_whitespace_source + ']*';

      re_no_whitespace = new RegExp( '[^' + re_whitespace_source + ']' );
      re_whitespaces = new RegExp( re_whitespaces_source, 'g' );
      re_trim_left = new RegExp( '^' + re_whitespaces_source );
      re_trim_right = new RegExp( '[' + re_whitespace_source + ']+$' );
    }

  }() );

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

  core_forEach.call( [ 'Array', 'Function', 'RegExp' ], function( klass ) {

    var repr = '[object ' + klass + ']';
    is[ klass ] = function( any ) {
      return any && core_toString.call( any ) === repr;
    };

  } );

  is.Array = Array.isArray || is.Array;

  if ( typeof regex === 'object' ) {
    is.Function = function( any ) {
      return any && typeof any === 'function';
    };
  }

  // feature detection
  // -----------------

  // check whether or not native static functions exist on the global
  // _core_ namespace __and__ do throw an error if no arguments passed
  // as required for static functions on _Stryng_.
  if ( is.Function( String.slice ) ) {
    try {
      String.slice();
    } catch ( e ) {
      adopt_native_statics = true;
    }
  }

  // check if the native implementation of _String#startsWith_
  // already knows how to deal with regular expressions or indices.
  // consider _String#endsWith_ to behave the same on that matter.
  if ( is.Function( string.startsWith ) ) {
    try {
      if ( !'ab'.startsWith( 'b', 1 ) || !'1'.startsWith( /\d/ ) ) {
        throw string;
      }
    } catch ( e ) {
      shim_methods.push( 'startsWith', 'endsWith' );
    }
  }

  // check if the native implementation of _String#substr_
  // correctly deals with negative indices.
  if ( 'ab'.substr( -1 ) !== 'b' ) {
    shim_methods.push( 'substr' );
  }

  // custom exit
  // -----------
  // wraps the process of throwing an _Error_.
  function exit( message ) {
    throw new Error( 'invalid usage of stryng member. ' + ( message || '' ) );
  }

  // defining Stryng
  // ===============

  // constructor
  // -----------

  /**
   * Stryng's constructor behaves just like the native one does.
   * static functions are only available on the Stryng namespace while
   * instance methods are also available as static functions with inversed signatures
   * i.e. they take the otherwise wrapped string as their first argument.
   * @class Stryng
   * @param {String} [value=""]
   *   the value to parse. defaults to the empty string
   * @param {Boolean} [is_mutable=false]
   *   whether the created instance should be mutable or
   *   create a new instance from the result of every method call
   * @return {Stryng} -
   *   the `input`'s string representation wrapped
   *   in the instance returned.
   */
  function Stryng( value, is_mutable ) {
    var that = this,
      args_len = arguments.length;

    // allow omitting the `new` operator
    // while preserving the exact behaviour
    // the native _core_ constructor has.
    if ( !( that instanceof Stryng ) ){
      return (
        args_len ?
        new Stryng( value, is_mutable ) :
        new Stryng()
      );
    }

    /**
     * the wrapped native string primitive
     * @name Stryng~_value
     * @type {String}
     */
    that._value = args_len ? String( value ) : '';

    /**
     * whether the created instance should be mutable or
     * create a new instance from the result of every method call
     * @name Stryng~_is_mutable
     * @type {Boolean}
     */
    that._is_mutable = !! is_mutable;

    /**
     * this' string's length defined via _Object.defineProperty_
     * if available, simply set onto the instance otherwise.
     * @name Stryng#length
     * @readOnly
     * @type {Number}
     * @todo further [reading](http://www.2ality.com/2012/08/property-definition-assignment.html)
     */

    // provide noop setter for Safari 5/5.1
    // which otherwise assigns to simple `length` porperty
    if ( core_defineProperty ) {
      core_defineProperty( that, 'length', {
        get: function() {
          return that._value.length;
        },
        set: function() {}
      } );
    } else {
      that.length = that._value.length;
    }
  }

  // cloning mutables
  // ----------------

  /**
   * curried version of [Stryng#constructor](#Stryng).
   * in case the instance was not constructed to be mutable
   * this is the hook to get a copy of it. only available on the prototype.
   * @function Stryng#clone
   * @param {Boolean} [is_mutable=false]
   * @return {Stryng}
   */
  Stryng.prototype.clone = function( is_mutable ) {
    return new Stryng( this._value, is_mutable );
  };

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
  
  /**
   * returns the this' string primitive. only available on the prototype.
   * @function Stryng#toString
   * @return {String}
   */
  Stryng.prototype.valueOf =
    Stryng.prototype.toString = function() {
      return this._value; // we can rest assured that this is a primitive
  };

  // instance methods
  // ----------------
  // __important note__: Stryng members are declared as static but __documented as
  // instance methods__, which makes it a lot shorter, less verbose and
  // easier to highlight the fact that every instance method is available
  // as a static function on the Stryng namespace but __not vice versa__.
  // exceptions to this rule are
  // 
  // - _Stryng#clone_
  // - _Stryng#tocore_
  // - _Stryng#valueOf_

  /**
   * @lends Stryng.prototype
   */
  var stryng_members = {

    /**
     * removes all whitespace, line terminators and Zs from both ends of this' string.
     * shim for native [String#trim](http://www.ecma-international.org/ecma-262/5.1/#sec-15.5.4.20)
     * @return {String}
     */
    trim: function( input ) {
      return input != null ?
        String( input )
        .replace( re_trim_left, '' )
        .replace( re_trim_right, '' ) : exit();
    },

    /**
     * removes all whitespace, line terminators and Zs from the beginning of this' string.
     * shim for non-standard [String#trimLeft](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/TrimLeft)
     * @return {String}
     */
    trimLeft: function( input ) {
      return input != null ? String( input ).replace( re_trim_left, '' ) : exit();
    },

    /**
     * removes all whitespace, line terminators and Zs from the end of this' string.
     * shim for non-standard [String#trimRight](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/TrimRight)
     * @return {String}
     */
    trimRight: function( input ) {
      return input != null ? String( input ).replace( re_trim_right, '' ) : exit();
    },

    /**
     * returns whether or not this' string contains the substring `search` starting at `position`.
     * shim for native [String#contains](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/contains)
     * @param {String} [search="undefined"]
     * @param {Number} [position=0]
     * @return {Boolean}
     */
    contains: function( input, search, position ) {
      return input != null ? String( input ).indexOf( search, position ) !== -1 : exit();
    },

    /**
     * returns whether or not this' string at index `position` begins with substring `search`.
     * shim for native [String#startsWith](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.startswith)
     * @param {String|RegExp} [search="undefined"]
     * @param {Number} [position=0]
     * @return {Boolean}
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
        input_len = input.length;

      return i !== -1 && i === (
        position === void 0 || position < 0 ? 0 :
        position > input_len ? input_len :
        core_floor( position ) || 0
      );
    },

    /**
     * returns whether or not this' string truncated at `end_position` ends with substring `search`.
     * `search` may also be a regular expression but must be of the form `/...$/`.
     * shim for native [String#endsWith](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.endswith)
     * @param {String|RegExp} [search="undefined"]
     * @param {Number} [end_position=input.length]
     * @return {Boolean}
     * @throws if `search` is a regular expression but does not match its input's end.
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

      var input_len = input.length, i;
      
      end_position = (
        end_position === void 0 || end_position > input_len ? input_len :
        end_position < 0 ? 0 :
        core_floor( end_position ) || 0
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
     * concatenates this' string `n` times to the empty string.
     * shim for native [String#repeat](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.repeat).
     * reduction of concat operations inspired by [mout/string/repeat](https://github.com/mout/mout/blob/v0.9.0/src/string/repeat.js)
     * @param {Number} [n=0]
     * @return {String}
     * @throws if `n` is either negative or infinite.
     */
    repeat: function( input, n ) {
      n = +n || 0;
      if ( input == null || n < 0 || n == INFINITY ) exit();
      n = core_floor( n );

      var result = '';

      while ( n ) {
        if ( n % 2 ) {
          result += input;
        }
        n = core_floor( n / 2 );
        input += input;
      }
      return result;
    },

    /**
     * returns the substring of `input` with length `length` starting at
     * `position` which may also be negative to index backwards.
     * shim for native [String#substr](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.substr)
     * @param {Number} [position=0]
     * @param {Number} [length=length-position] this' string's length minus `position`
     * @return {String}
     */
    substr: function( input, position, length ) {
      input = input != null ? String( input ) : exit();

      // parse the `position` argument.
      // 
      // - if the would-be result of `Number.toInteger( position )` is negative, add `input.length`
      // - if it still is negative, apply zero
      // - leave it up to `substr`'s implicit parsing any otherwise
      position = position <= -1 ? ( position = core_toInteger( position ) + input.length ) < 0 ? 0 : position : position;

      return input.substr( position, length );
    },

    /**
     * prepends and appends `outfix` to `input` in one go.
     * to do the opposite use [Stryng.strip](#strip).
     * @param {String} [outfix="undefined"] prefix and suffix
     * @param {Number} [n=0] number of operations
     * @return {String}
     */
    wrap: function( input, outfix, n ) {
      if ( input == null ) exit();
      // implies parsing `outfix` and `n`
      outfix = Stryng.repeat( outfix, n );
      return outfix + input + outfix;
    },

    /**
     * returns the number of non-overlapping occurrences of `search` within `input`.
     * the empty string is considered a _character boundary_
     * thus `input.length + 1` will always be the result for that.
     * @param {String} [search="undefined"] the substring to search for
     * @return {Number}
     */
    count: function( input, search ) {
      input = input != null ? String( input ) : exit();

      search = String( search );

      // early exit for the empty search
      if ( !search ) return input.length + 1;

      var search_len = search.length,
        count = 0,
        i = -search_len; // prepare first run

      do i = input.indexOf( search, i + search_len );
      while ( i !== -1 && ++count );

      return count;
    },

    /**
     * delegates to native _Arrray#join_. returns the empty string if no arguments passed.
     * @param {...String} [joinees=[]]
     * @return {String}
     */
    join: function( delimiter /*, string... */ ) {
      var args = arguments; // promote compression

      if ( delimiter == null ) exit();
      if ( args.length === 1 ) return '';

      return core_slice.call( args, 1 ).join( delimiter );
    },

    /**
     * composition of native _String#split_, _Array#reverse_ and _Array#join_.
     * note that this rather naive implementation may not produce correct results.
     * for an alternative that knows how to properly reverse
     * diacritics and accented characters use [esrever](https://github.com/mathiasbynens/esrever).
     * @return {String}
     */
    reverse: function( input ) {
      return input != null ? String( input )
        .split( '' )
        .reverse()
        .join( '' ) : exit();
    },

    /**
     * splits this' string at `position` and rejoins the resulting parts using `insertion`.
     * `position` may also be negative to index backwards.
     * @param {Number} [position=0]
     * @param {String} [insertion="undefined"]
     * @return {String}
     */
    insert: function( input, position, insertion ) {
      input = input != null ? String( input ) : exit();

      // help out _String#slice_'s implicit parsing which will apply different
      // defaults for `undefined` to the first and second argument
      position = +position || 0;

      // implies parsing `insertion`
      return input.slice( 0, position ) + insertion + input.slice( position );
    },

    /**
     * splits this' string at the given indices. negative indices are allowed.
     * if the resulting substrings overlap, the first one dominates, the latter is front-cut.
     * @param {...Number} index indices to split at. negatives allowed
     * @return {String[]}
     */
    splitAt: function( input /*, index... */ ) {
      input = input != null ? String( input ) : exit();

      // - for each index
      //   - if it is negative, add this' string's length
      //   - apply `pending_index` of the previous iteration ( initially zero ) as `index`'s minimum
      //   - let native _String#subcore_ apply the maximum
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
        index = core_toInteger( args[ i ] );
        if ( index < 0 ) {
          index += input_len;
        }
        if ( index <= pending_index ) {
          result.push( '' ); // faster than slicing the empty string first
          index = pending_index;
        } else {
          result.push( input.substring( pending_index, index ) );
          pending_index = index;
        }
      }
      result.push( input.substring( index ) );
      return result;
    },

    /**
     * splits this' string `n` times by the given `delimiter`. any captured groups
     * and the trailing part after the `n`th occurence of `delimiter` are included
     * in the returned array.
     * @param {String|RegExp} [delimiter="undefined"]
     * @param {Number} [n=Math.pow(2,32)-1]
     *   maximum number of split operations.
     *   default as per [ecma-262/5.1](http://www.ecma-international.org/ecma-262/5.1/#sec-15.5.4.14)
     * @return {String[]}
     */
    splitLeft: function( input, delimiter, n ) {
      input = input != null ? String( input ) : exit();

      // - parse `n` with `toUInt32`, default to `Math.pow(2, 32) - 1`
      // - return the empty array if `n` is zero
      // - let `result` be the array to return
      // - if `delimiter` is a regular expression
      //   - extract `n` matches using _String#match_ combined with
      //     subsequently front-cutting this' string.
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
        last_index = 0,
        difference;

      if ( is.RegExp( delimiter ) ) {
        while ( n-- && ( match = input.match( delimiter ) ) ) {
          index = match.index;
          result.push( input.substring( 0, index ) );
          last_index = index + match.shift().length; // mutates `match`
          if ( last_index <= index ) last_index = index + 1; // avoid endless loop
          if ( match.length ) core_push.apply( result, match ); // mutate instead of recreate as concat would
          input = input.substring( last_index );
        }
        result.push( input ); // push what's left
      } else {
        delimiter = String( delimiter );
        result = input.split( delimiter );
        difference = result.length - n;
        if ( difference > 0 ) {
          result.push( result.splice( n, difference ).join( delimiter ) ); // implies parsing delimiter
        }
      }

      return result;
    },

    /**
     * the right-associative version of [Stryng.splitLeft](#splitLeft).
     * splits this' string `n` times by the given `delimiter`. the preceding part
     * after the `n`th occurence of `delimiter` - counting backwards -
     * is included in the returned array. currently has no regex support
     * @param {String} [delimiter="undefined"]
     * @param {Number} [n=Math.pow(2,32)-1]
     *   maximum number of split operations.
     *   default as per [ecma-262/5.1](http://www.ecma-international.org/ecma-262/5.1/#sec-15.5.4.14)
     * @return {String[]}
     * @throws if `delimiter` is a regular expression
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

      if ( is.RegExp( delimiter ) ) {
        exit( 'no regex support for splitRight' );
      }

      n = ( n === void 0 ? -1 : n ) >>> 0;

      if ( !n ) return [];

      delimiter = String( delimiter );

      var result = input.split( delimiter ),
        difference = result.length - n;

      if ( difference > 0 ) {
        result.unshift( result.splice( 0, difference ).join( delimiter ) );
      }
      return result;
    },

    /**
     * splits this' string by line terminators as defined in the
     * [spec](http://www.ecma-international.org/ecma-262/5.1/#sec-7.3).
     * @return {String[]}
     */
    splitLines: function( input ) {
      return input != null ? String( input ).split( re_linebreaks ) : exit();
    },

    /**
     * substitues all non-overlapping occurrences of
     * `replacee` with `replacement`.
     * @param {String} [replacee="undefined"] string to replace
     * @param {String} [replacement="undefined"] replacement
     * @return {String}
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
     * substitues the first `n` non-overlapping occurrences of
     * `replacee` with `replacement`.
     * @param {String} [replacee="undefined"] string to replace
     * @param {String} [replacement="undefined"] replacement
     * @param {Number} [n=Math.pow(2,32)-1]
     *   number of replacement operations.
     * @return {String}
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
     * substitues the last `n` non-overlapping occurrences of
     * `replacee` with `replacement`.
     * @param {String} [replacee="undefined"] string to replace
     * @param {String} [replacement="undefined"] replacement
     * @param {Number} [n=Math.pow(2,32)-1]
     *   number of replacement operations.
     * @return {String}
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
     * both appends and prepends `fill` to this' string as often as needed
     * to reach but not exceed a length of `max_len`. passing a `max_len`
     * lesser than this' string's length has no effect. it is never truncated.
     * @param {Number} [max_len=0]
     * @param {String} [fill="undefined"]
     * @return {String}
     */
    just: function( input, max_len, fill ) {
      max_len = +max_len || 0;
      if ( input == null || max_len < 0 || max_len == INFINITY ) exit();
      max_len = core_floor( max_len );

      input = String( input );
      fill = String( fill );

      var input_len = input.length,
        fill_len = fill.length * 2; // safe, `<< 1` converts to 32-Bit Integer

      if ( max_len <= input_len || !fill ) return input;

      while ( input.length + fill_len <= max_len ) {
        input = fill + input + fill;
      }

      return input;
    },

    /**
     * prepends `fill` to this' string as often as needed
     * to reach but not exceed a length of `max_len`. passing a `max_len`
     * lesser than this' string's length has no effect. it is never truncated.
     * @param {Number} [max_len=0]
     * @param {String} [fill="undefined"]
     * @return {String}
     */
    justLeft: function( input, max_len, fill ) {
      max_len = +max_len || 0;
      if ( input == null || max_len < 0 || max_len == INFINITY ) exit();
      max_len = core_floor( max_len );

      input = String( input );
      fill = String( fill );

      var input_len = input.length,
        fill_len = fill.length;

      if ( max_len <= input_len || !fill ) return input;

      while ( input.length + fill_len <= max_len ) {
        input = fill + input;
      }

      return input;
    },

    /**
     * appends `fill` to this' string as often as needed
     * to reach but not exceed a length of `max_len`. passing a `max_len`
     * lesser than this' string's length has no effect. it is never truncated.
     * @param {Number} [max_len=0]
     * @param {String} [fill="undefined"]
     * @return {String}
     */
    justRight: function( input, max_len, fill ) {
      max_len = +max_len || 0;
      if ( input == null || max_len < 0 || max_len == INFINITY ) exit();
      max_len = core_floor( max_len );

      input = String( input );
      fill = String( fill );

      var input_len = input.length,
        fill_len = fill.length;

      if ( max_len <= input_len || !fill ) return input;

      while ( input.length + fill_len <= max_len ) {
        input += fill;
      }

      return input;
    },

    /**
     * the combination of [Stryng.stripLeft](#stripLeft) and [Stryng.stripRight](#stripRight).
     * removes `outfix` `n` times from the both ends of this' string.
     * @param {String} [outfix="undefined"] string to remove
     * @param {Number} [n=1] number of removals
     * @return {String} -
     *
     */
    strip: function( input, outfix, n ) {
      return Stryng.stripRight( Stryng.stripLeft( input, outfix, n ), outfix, n );
    },

    /**
     * removes `prefix` `n` times from the beginning of this' string.
     * @param {String} [prefix="undefined"] string to remove
     * @param {Number} [n=Math.pow(2,32)-1] number of removals.
     * @return {String}
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

      var prefix_len = prefix.length,
        pending_i = 0,
        i;

      do i = input.indexOf( prefix, pending_i );
      while ( n-- && i === pending_i && ( pending_i += prefix_len ) );

      return pending_i ? input.substring( pending_i ) : input;
    },

    /**
     * the right-associative version of [Stryng.stripLeft](#stripLeft).
     * removes `prefix` `n` times from the end of this' string.
     * @param {String} [suffix="undefined"] string to remove
     * @param {Number} [n=Math.pow(2,32)-1] number of removals.
     * @return {String}
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

      var suffix_len = suffix.length,
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
     * slices this' string to exactly fit the given `max_len`
     * while including the `ellipsis` at its end ( enforced ).
     * @param {Number} [max_len=Math.pow(2,32)-1] length of the result.
     * @param {String} [ellipsis="..."]
     * @return {String}
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
     * backslash-escapes all occurences of double quote, backslash,
     * backspace, tab, newline, form feed and carriage return,
     * hex-encodes any non-ASCII-printable character and wraps the result
     * in ( unescaped ) double quotes. this can be interpreted as a
     * shallow version of the native _JSON#stringify_. shim for non-standard
     * [String#quote](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/quote).
     * @return {String}
     */
    quote: function( input ) {
      input = input != null ? String( input ) : exit();

      // - delegate to native _JSON.stringify_ if available
      // - otherwise iterate over this' string's characters
      //   - preserve ASCII printables
      //   - use short escape characters
      //   - use hexadecimal notation as a last resort, whichever is shortest
      // - wrap `result` in double quotes and return it

      if ( core_stringify ) {
        return core_stringify( input );
      }

      var i = 0,
        result = '',
        input_len = input.length,
        char_code;

      for ( ; i < input_len; i++ ) {
        char_code = input.charCodeAt( i );

        result += (
          char_code === 34 ? '\\"' : // double quote
          char_code === 92 ? '\\\\' : // backslash
          31 < char_code && char_code < 127 ? core_fromCharCode( char_code ) : // ASCII printables
          char_code === 8 ? '\\b' : // backspace
          char_code === 9 ? '\\t' : // tab
          char_code === 10 ? '\\n' : // new line
          char_code === 12 ? '\\f' : // form feed
          char_code === 13 ? '\\r' : // carriage return
          (
            char_code < 256 ?
            '\\x' + ( char_code < 16 ? '0' : '' ) :
            '\\u' + ( char_code < 4096 ? '0' : '' )
          ) + char_code.toString( 16 )
        );
      }

      return '"' + result + '"';
    },

    /**
     * mirrors the effect of [Stryng#quote](#quote) without using `eval`.
     * unescapes all occurences of backslash-escaped
     * characters ( `"\\t\r\n\f\b` ), decodes all hex-encoded
     * characters and removes surrounding double quotes once.
     * @return {String}
     */
    unquote: function( input ) {
      input = input != null ? String( input ) : exit();

      input = input
        .replace( re_escaped_hex, function( _, he, xa ) {
          return core_fromCharCode( parseInt( he + ( xa || '' ), 16 ) );
        })
        .replace( re_escaped_whitespace, function( _, esc ) {
          return (
            esc === 'b' ? '\b' : // backspace
            esc === 't' ? '\t' : // tab
            esc === 'n' ? '\n' : // new line
            esc === 'f' ? '\f' : // form feed
            esc === 'r' ? '\r' : // carriage return
            esc // backslash, double quote and any other
          );
        });
      return Stryng.strip( input  , '"', 1 );
    },

    /**
     * appends the given `appendix` to this' string. unlike native _String#concat_
     * this method applies `'undefined'` as the default `appendix`.
     * @param {String} [appendix="undefined"]
     * @return {String}
     */
    append: function( input, appendix ) {
      return input != null ? String( input ) + appendix : exit();
    },

    /**
     * prepends the given `intro` to this' string.
     * @param {String} [intro="undefined"]
     * @return {String}
     */
    prepend: function( input, intro ) {
      return input != null ? intro + String( input ) : exit();
    },

    /**
     * returns whether or not this' string strictly equals the
     * string representation of `comparable`
     * @param {String} [comparable="undefined"] string to compare to
     * @return {Boolean}
     */
    equals: function( input, comparable ) {
      return input != null ? String( input ) === String( comparable ) : exit();
    },

    /**
     * lower-cases both this' string and `comparable` prior to
     * returning whether or not their are strictly equal.
     * @param {String} [comparable="undefined"] string to compare to
     * @return {Boolean}
     */
    iequals: function( input, comparable ) {
      return input != null ? String( input ).toLowerCase() === String( comparable ).toLowerCase() : exit();
    },

    /**
     * returns whether or not this' string has length `0`
     * @return {Boolean}
     */
    isEmpty: function( input ) {
      return input != null ? !String( input ) : exit();
    },

    /**
     * returns whether or not this' string is empty or consists of
     * whitespace, line terminators and/or Zs only.
     * @return {Boolean}
     */
    isBlank: function( input ) {
      return input != null ? !String( input ) || !re_no_whitespace.test( input ) : exit();
    },

    /**
     * return whether or not this' string matches the
     * floating point number format from the beginning
     * __until the end__ in contrast to native _parseFloat_.
     * note that it won't throw if the actual number exceeds
     * JavaScript's float range.
     * @return {Boolean}
     */
    isFloat: function( input ) {
      return input != null ? re_is_float.test( input ) : exit();
    },

    /**
     * delegates to [Stryng#trim](#trim) and replaces groups of
     * whitespace, line terminators and/or Zs by a single space character.
     * @return {String}
     */
    clean: function( input ) {
      return Stryng.trim( input ).replace( re_whitespaces, ' ' );
    },

    /**
     * upper-cases this' string's first character.
     * @return {String}
     */
    capitalize: function( input ) {
      input = input != null ? String( input ) : exit();
      return !input ? input : input.charAt().toUpperCase() + input.substring( 1 );
    },

    /**
     * transforms this' string into camel-case by
     *
     * - removing all occurences of space, underscore and hyphen
     * - upper-casing the first letter directly following those.
     *
     * inspired by [emberjs](http://emberjs.com/api/classes/Ember.String.html#method_camelize)
     * note that this leaves the very first letter untouched.
     * for a _classified_ output compose this method with [Stryng#capitalize](#capitalize).
     * @return {String}
     */
    camelize: function( input ) {
      return input != null ?
        String( input )
        .replace( re_lower_boundary, function( _, character ) {
          return character ? character.toUpperCase() : '';
        } ) : exit();
    },

    /**
     * transforms this' string into an underscored form by
     *
     * - inserting `_` where upper-cased letters follow lower-cased ones
     * - replacing space and hyphen by `_`
     * - lower-casing the final output
     *
     * inspired by [emberjs](http://emberjs.com/api/classes/Ember.String.html#method_underscore)
     * @return {String}
     */
    underscore: function( input ) {
      return input != null ?
        String( input )
        .replace( re_lower_upper_boundary, '$1_$2' )
        .replace( re_space_hyphen, '_' )
        .toLowerCase() : exit();
    },

    /**
     * transforms this' string into an underscored form by
     *
     * - inserting `-` where upper-cased letters follow lower-cased ones
     * - replacing space and underscore by `-`
     * - lower casing the final output.
     *
     * note that this method has nothing to do with _hyphenation_ which would
     * be too serious an algorithm to fit into this library.
     * inspired by [emberjs](http://emberjs.com/api/classes/Ember.String.html#method_dasherize)
     * @return {String}
     */
    hyphenize: function( input ) {
      return input != null ?
        String( input )
        .replace( re_lower_upper_boundary, '$1-$2' )
        .replace( re_space_underscore, '-' )
        .toLowerCase() : exit();
    },

    /**
     * replaces ligatures and diacritics from the Latin-1 Supplement
     * with their nearest ASCII equivalent.
     * compose this method with [Stryng#hyphenize](#hyphenize) to produce URL slugs
     * @return {String} [description]
     * @todo replace symbols otherwise being percent-escaped
     */
    simplify: function( input ) {
      input = input != null ? String( input ) : exit();
      core_forOwn.call( latin_1_supplement, function( re, nearest_char ) {
        input = input.replace( re, nearest_char );
      } );
      return input;
    },

    /**
     * maps every character of this' string to its ordinal representation.
     * @return {Number[]}
     */
    ord: function( input ) {
      input = input != null ? String( input ) : exit();

      var i = input.length,
        result = new Array( i );

      while ( i-- ) result[ i ] = input.charCodeAt( i );

      return result;
    },

    /**
     * escapes all special characters that have meaning to
     * JavaScript regexp parser. taken from [mdn](https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions)
     * @return {String}
     */
    escapeRegExp: function( input ) {
      return input != null ? String( input ).replace( re_regexp_chars, '\\$1' ) : exit();
    },

    /**
     * convenience wrapper for native _RegExp_ constructor.
     * @param  {String} flags
     * @return {RegExp}
     */
    toRegExp: function( input, flags ) {
      return input != null ? new RegExp( input, flags ) : exit();
    }
  };

  // static functions
  // ----------------

  /**
   * returns whether or not `any` is an instance of Stryng.
   * beware of Stryng classes hosted by other HTML frames inside
   * browser windows. this method won't recognize Stryngs
   * created with foreign Stryng constructors.
   * @function Stryng.isStryng
   * @param {*} any
   * @return {Boolean}
   */
  Stryng.isStryng = function( any ) {
    return ( any instanceof Stryng );
  };

  /**
   * generates a string of `n` random characters in char-code range [`from`, `to`[.
   * this range defaults to the ASCII printables. to choose randomly from the whole
   * UTF-16 table call `Stryng.random(n, 0, 1>>16)`.
   * @function Stryng.random
   * @param {Number} [n=0]
   * @param {Number} [from=32] inclusively
   * @param {Number} [to=127] exclusively assuming _Math.random_ never yields `1`
   * @return {String}
   * @throws if `n` is negative or not finite or `to` exceeds `Math.pow( 2, 16 )`
   */
  Stryng.random = function( n, from, to ) {
    n = +n || 0;
    if ( n < 0 || n == INFINITY ) exit();
    n = core_floor( n );

    from = from === void 0 ? 32 : ( from >>> 0 );
    to = to === void 0 ? 127 : ( to >>> 0 );

    if ( to > MAX_CHARCODE ) exit();

    var result = '',
      difference = to - from;

    if ( difference > 0 ) {
      while ( n-- ) {
        result += core_fromCharCode( from + core_floor( core_random() * difference ) );
      }
    }

    return result;
  };

  /**
   * delegates to native _String#fromCharCode_.
   * returns the concatenated string representations of the given
   * `charCode`s from the UTF-16 table. return the empty string if no arguments passed.
   * @Stryng.chr
   * @param {...Number} charCode
   * @return {String}
   * @throws if one of the `charCode`s exceeds `Math.pow( 2, 16 ) - 1`
   */
  Stryng.chr = function( /* char_codes,... */) {
    var char_codes = arguments,
      i = char_codes.length;
    while ( i-- ) {
      if ( char_codes[ i ] > MAX_CHARCODE ) {
        exit();
      }
    }
    return core_fromCharCode.apply( null, char_codes );
  };

  Stryng.fromCharCode = core_fromCharCode;
  Stryng.fromCodePoint = String.fromCodePoint;

  // building Stryng
  // ===============

  // custom methods
  // --------------
  // - provide a closure for each wrapper function
  // - populate the custom static function `fn` onto the _Stryng_ namespace
  // - populate the function onto Stryng's prototype wrapped in another which..
  // - unshifts the _Stryng_ instance's wrapped `_value`
  //   to become the first argument among the proxied ones to the static function
  // - decides upon the type of `result` and whether this `_is_mutable` what to return.
  //   - if `result` isn't a string at all, simply return it
  //   - if the instance `_is_mutable`, assign `result` to `_value` and return `this`
  //   - if not, return a new instance of _Stryng_ constructed from `result`

  core_forOwn.call( stryng_members, function( fn, fn_name ) {

    Stryng[ fn_name ] = fn;

    Stryng.prototype[ fn_name ] = function( /* proxied arguments */) {

      var that = this,
        args = arguments,
        result;

      core_unshift.call( args, that._value );
      result = fn.apply( null, args );

      if ( typeof result === 'string' ) {
        if ( that._is_mutable ) {
          that._value = result;
          if ( !core_defineProperty ) {
            that.length = result.length;
          }
          return that;
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
  //   _Stryng_ namespace if present, otherwise construct one from the equivalent
  //   instance method `fn` as learned from [javascript garden][1]
  // - populate the function onto Stryng's prototype wrapped in another which..
  // - ..calls the native instance method on Stryng instance's wrapped `_value`
  // - ..proxies the given `arguments`
  // - ..decides upon the type of `result` and whether or not this `_is_mutable` what to return.
  //   - if `result` isn't a string at all, simply return it
  //   - if the instance `_is_mutable`, set result as the new `_value` and return `this`
  //   - if not, return a new instance of _Stryng_ wrapping `result`
  // 
  // [1]: http://bonsaiden.github.io/JavaScript-Garden/#function.arguments
  core_forEach.call( methods, function( fn_name ) {

    var fn = string[ fn_name ];

    if ( is.Function( fn ) && !core_contains.call( shim_methods, fn_name ) ) {

      Stryng[ fn_name ] = adopt_native_statics && String[ fn_name ] || function( input /*, proxied argments */ ) {
        if ( input == null ) exit();
        return core_call.apply( fn, arguments );
      };

      Stryng.prototype[ fn_name ] = function( /* proxied arguments */) {

        var that = this, // promote compression
          result = fn.apply( that._value, arguments );

        if ( typeof result === 'string' ) {
          if ( that._is_mutable ) {
            that._value = result;
            if ( !core_defineProperty ) {
              that.length = result.length;
            }
            return that;
          } else {
            return new Stryng( result );
          }
        }
        return result;
      };
    }
  } );

  // export
  // ------
  // - cjs
  // - amd - anonymous
  // - browser - opt to rename

  if ( 'undefined' !== typeof module && module.exports ) {
    module.exports = Stryng;
  } else if ( 'function' === typeof define && define.amd ) {
    define( function() {
      return Stryng;
    } );
  } else {

    /**
     * restores the previous value assigned to `window.Stryng`
     * and returns the inner reference Stryng holds to itself.
     * @function Stryng.noConflict
     * @return {Stryng}
     */
    var previous_Stryng = root.Stryng;
    Stryng.noConflict = function() {
      root.Stryng = previous_Stryng;
      return Stryng;
    };

    root.Stryng = Stryng;
  }

}( this ) );

// <script>document.write('<script src="http://' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1"></' + 'script>')</script>