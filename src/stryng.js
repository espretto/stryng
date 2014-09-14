/*!
 * stryngjs released under MIT licence
 * http://mariusrunge.com/mit-licence.html
 */

(function (root) {
  'use strict';

  // baseline setup
  // ==============

  var // one to var them all

  /**
   * Stryng's version.
   * @name Stryng.version
   * @readOnly
   * @type {String}
   */
  VERSION = '0.1.5',

  // used for input validation
  INFINITY = 1 / 0,

  // used to limit _String.fromCharCode_
  MAX_CHARCODE = 65535, // Math.pow(2, 16) - 1

  // promote compression, don't be fooled by override
  String = VERSION.constructor,

  // methods _Stryng_ hopes to adopt
  methods = ('charAt,charCodeAt,codePointAt,concat,contains,' +
    'endsWith,indexOf,lastIndexOf,localeCompare,match,normalize,' +
    'replace,search,slice,split,startsWith,substr,substring,' +
    'toLocaleLowerCase,toLocaleUpperCase,toLowerCase,toUpperCase,' +
    'trim,trimLeft,trimRight').split(','),

  // methods which's native implementations to override if necessary
  overrides = [],

  // whether or not to adopt native static functions
  adoptNativeStatics,

  // inner module to hold type/class check functions
  is = {},

  // promote compression
  noop = function(){},
  typeFunction = 'function',
  typeUndefined = 'undefined',
  strPrototype = 'prototype',

  // method shortcuts
  // ----------------
  // create quick access variables for both native static functions
  // and instance methods. polyfills are reduced in functionality and byte-size.
  // they are thus __for internal use only__ and neither populated onto
  // native prototypes nor intended to be spec-compliant.

  // ### corner stone
  // name this a core method. used for Stryng to work on

  toString = function(input){
    if(input == null) exit('input must not be null');
    return String(input);
  },

  // ### native static methods

  coreFloor = Math.floor,
  coreRandom = Math.random,
  coreFromCharCode = String.fromCharCode,
  coreStringify = typeof JSON !== typeUndefined && JSON.stringify,

  // fully [spec](http://www.ecma-international.org/ecma-262/5.1/#sec-9.4) compliant
  // implementation of `Number.toInteger`, tested and benchmarked at [jsperf](http://jsperf.com/to-integer/11).
  coreToInteger = Number.toInteger || function (n) {
    return (n = +n) && isFinite(n) ? n - (n % 1) : n || 0;
  },

  // feature detect native _Object.defineProperty_
  // and set _Stryng_'s version simultaneously.
  // 
  // - try/catch when
  //   - not available at all
  //   - or only supports DOM objects, IE8
  // - if successful, return the reference to that function
  // - implicitely return `undefined` otherwise
  coreDefineProperty = (function (defineProperty) {
    try {
      defineProperty(Stryng, 'VERSION', {
        writable: false,
        value: VERSION
      });
      return defineProperty;
    } catch (e) {
      Stryng.VERSION = VERSION;
    }
  })(Object.defineProperty),

  // ignore the [dont-enum bug](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys)
  coreKeys = Object.keys || function (object) {
    var keys = [], key, i = 0;
    for (key in object) if (object.hasOwnProperty(key)) keys[i++] = key;
    return keys;
  },

  // ### native instance methods

  corePush = methods.push,
  coreCall = noop.call,
  coreToString = is.toString,

  coreForEach = methods.forEach || function (iterator) {
    for (var array = this, i = array.length; i--;) iterator(array[i], i);
  },

  coreContains = methods.contains || function (item) {
    for (var array = this, i = array.length; i-- && array[i] !== item;);
    return i !== -1;
  },

  // regular expressions
  // -------------------

  // ### quote & unquote
  ctrlMap = {
    '\b': 'b',
    '\t': 't',
    '\n': 'n',
    '\v': 'v',
    '\f': 'f',
    '\r': 'r'
  },
  escCtrlMap = {
    'b': '\b', // backspace
    't': '\t', // tab
    'n': '\n', // new line
    'f': '\f', // form feed
    'r': '\r', // carriage return
    'v': '\v'  // vertical tab
  },
  reCtrl = new RegExp('[\b\t\n\f\r\v"\\\\]', 'g'),
  cbCtrl = function (match) {
    return '\\' + (ctrlMap[match] || match);
  },
  reEscCtrl = /\\([btnfrv"\\])/g,
  cbEscCtrl = function (_, esc) {
    return escCtrlMap[esc] || esc;
  },
  reXhex = /[\x00-\x07\x0E-\x1F\x7F-\xFF]/g,
  cbXhex = function (match) {
    var charCode = match.charCodeAt(0);
    return '\\x' + (charCode < 16 ? '0' : '') + charCode;
  },
  reUhex = /[\u0100-\uFFFF]/g,
  cbUhex = function (match) {
    var charCode = match.charCodeAt(0);
    return '\\u' + (charCode < 4096 ? '0' : '') + charCode;
  },
  reEscUXhex = /\\[xu]([0-9a-fA-F]{2,4})/g,
  cbEscUXhex = function (_, uxhex) {
    return coreFromCharCode(parseInt(uxhex, 16));
  },

  // ### name transforms
  reLowBoundary = /[ _-]([a-z]?)/g,
  cbLowBoundary = function (_, chr) {
    return chr ? chr.toUpperCase() : '';
  },
  reCaseSwitch = /([a-z])([A-Z])/g,
  reSpaceHyphen = /[ -]/g,
  reSpaceUnderscore = /[ _]/g,

  // ### util
  reRegex = /([.,*+-?^=!:${}()|\[\]\/\\])/g,
  reIsFloat = /^\d+(?:\.\d*)?(?:[eE][\-\+]?\d+)?$/,
  reMatchEnd = /[^\\]\$$/,

  // ### diacritics & liguatures
  // because character mappings easily grow large we only provide
  // the [Latin-1 Supplement](http://unicode-table.com/en/#latin-1-supplement)
  // (letters in range [xC0-xFF]) mapped to their nearest character
  // allowed in URL path segments.
  // 
  // we also rely on native _String#toLowerCase_ and _String#toUpperCase_
  // to properly convert characters - <a href="javascript:alert('give me the link!')">which they don't</a>

  latin1Reprs = 'A,A,A,A,Ae,A,AE,C,E,E,E,E,I,I,I,I,D,N,O,O,O,O,Oe,-,Oe,U,U,U,Ue,Y,Th,ss,a,a,a,a,ae,a,ae,c,e,e,e,e,i,i,i,i,d,n,o,o,o,o,oe,-,oe,u,u,u,ue,y,th,y'.split(','),

  latin1Chars = (function () {
    var offset = 0xC0,
      i = 0x100 - offset,
      result = new Array(i);

    while (i--) result[i] = coreFromCharCode(offset + i);
    return result.join('');
  }()),

  reLatin1 = new RegExp('[' + latin1Chars + ']', 'g'),
  cbLatin1 = function (match) {
    return latin1Reprs[latin1Chars.indexOf(match)];
  },

  // ### the whitespace shim
  // native implementations of _String#trim_ might miss out
  // on some of the more exotic characters considered [whitespace][1],
  // [line terminators][2] or the mysterious [Zs][3].
  // this section detects those flaws and constructs the regular expressions used
  // in the polyfills. Many thanks to the authors of [faster trim][4] and [whitespace deviations][5].
  //   
  // [1]: http://www.ecma-international.org/ecma-262/5.1/#sec-7.2
  // [2]: http://www.ecma-international.org/ecma-262/5.1/#sec-7.3
  // [3]: http://www.fileformat.info/info/unicode/category/
  // [4]: http://blog.stevenlevithan.com/archives/faster-trim-javascript
  // [5]: http://perfectionkills.com/whitespace-deviations/

  reWss = /\s\s*/g,
  reNoWs = /\S/,
  reTrimLeft = /^\s\s*/,
  reTrimRight = /\s*\s$/,
  reLineTerminators = /\r?\n|\u2028|\u2029/g;

  (function () {

    var reWsSource = '\\s',
      reWsSourceLen = reWsSource.length,
      reWssSource,

      hexCharCodes = ( // avoid parseInt inconcistencies
        '0009,' + // tab
        '000A,' + // line feed
        '000B,' + // vertical tab
        '000C,' + // form feed
        '000D,' + // carriage return
        '0020,' + // space
        '00A0,' + // nbsp
        '1680,180E,2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,200A,202F,205F,3000,' + // Zs
        '2028,' + // line separator
        '2029,' + // paragraph separator
        'FEFF' // byte order mark
      ).split(',');

    coreForEach.call(hexCharCodes, function (hex) {
      if (!reWss.test(coreFromCharCode(parseInt(hex, 16)))) {
        reWsSource += '\\u' + hex;
      }
    });

    if (reWsSource.length > reWsSourceLen) {
      overrides.push('trim', 'trimRight', 'trimLeft');
      reWssSource = '[' + reWsSource + '][' + reWsSource + ']*';
      reNoWs = new RegExp('[^' + reWsSource + ']');
      reWss = new RegExp(reWssSource, 'g');
      reTrimLeft = new RegExp('^' + reWssSource);
      reTrimRight = new RegExp('[' + reWsSource + ']+$');
    }

  }());

  // type safety
  // -----------
  // the inner module `is` holds type checks. this is an excerpt from
  // my [gist](https://gist.github.com/espretto/c9a8961645e2754155af) inspired by the
  // [jQuery](http://jquery.com) and [underscore](http://underscorejs.org) libraries.
  // 
  // - provide quick access to precomputed `repr` within _Array#forEach_ closure
  // - early exit on "falsies"
  // - apply native implementations where available
  // - fix old webkit's bug where `typeof regex` yields `'function'` 

  coreForEach.call(['Array', 'Function', 'RegExp'], function (className) {
    var repr = '[object ' + className + ']';
    is[className] = function (value) {
      return value && coreToString.call(value) === repr;
    };
  });

  is.Array = Array.isArray || is.Array;

  if (typeof reIsFloat === 'object') {
    is.Function = function (value) {
      return typeof value === typeFunction;
    };
  }

  // feature detection
  // -----------------

  // wrap try-catch clauses for optimizability
  (function(){

    // check whether or not native static functions exist on the global
    // _core_ namespace __and__ do throw an error if no arguments passed
    // as required for static functions on _Stryng_.
    if (is.Function(String.slice)) {
      try {
        String.slice();
      } catch (e) {
        adoptNativeStatics = true;
      }
    }

    // check if the native implementation of _String#startsWith_
    // already knows how to deal with regular expressions or indices.
    // consider _String#endsWith_ to behave the same on that matter.
    if (is.Function(VERSION.startsWith)) {
      try {
        if (!'ab'.startsWith('b', 1) || !'a'.startsWith(reNoWs)) {
          throw VERSION;
        }
      } catch (e) {
        overrides.push('startsWith', 'endsWith');
      }
    }
  }());

  // check if the native implementation of _String#substr_
  // correctly deals with negative indices.
  if ('ab'.substr(-1) !== 'b') {
    overrides.push('substr');
  }

  function exit(message){
    throw new Error(message || 'invalid usage of stryng member');
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
   * @param {String} value
   *   the value to parse.
   * @param {Boolean} [isMutable=false]
   *   whether the created instance should be mutable or
   *   create a new instance from the result of every method call
   * @return {Stryng} -
   *   the `input`'s string representation wrapped
   *   in the instance returned.
   */
  function Stryng(value, isMutable) {
    var that = this;

    // allow omitting the `new` operator
    // while preserving the exact behaviour
    // the native _String_ constructor has.
    if (!(that instanceof Stryng)) return new Stryng(value, isMutable);

    /**
     * the wrapped native string primitive
     * @name Stryng~_value
     * @type {String}
     */
    that._value = toString(value);

    /**
     * whether the created instance should be mutable or
     * create a new instance from the result of every method call
     * @name Stryng~_isMutable
     * @type {Boolean}
     */
    that._isMutable = !! isMutable;

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
    if (coreDefineProperty) {
      coreDefineProperty(that, 'length', {
        get: function () {
          return that._value.length;
        },
        set: noop
      });
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
   * @param {Boolean} [isMutable=false]
   * @return {Stryng}
   */
  Stryng[strPrototype].clone = function (isMutable) {
    return new Stryng(this._value, isMutable);
  };

  // seemlessness
  // ------------

  /**
   * returns this' string primitive. only available on the prototype.
   * @function Stryng#toString
   * @return {String}
   */
  Stryng[strPrototype].valueOf = Stryng[strPrototype].toString = function () {
    return this._value; // we can rest assured that this is a primitive
  };

  /**
   * returns the string representation of the expression
   * used to construct this instance.
   * @return {String} eval-string-expression
   */
  Stryng[strPrototype].toSource = function(){
    return '(new Stryng("' + this._value + ', ' + this._isMutable + '"))';
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
  // - _Stryng#valueOf_
  // - _Stryng#toString_

  /**
   * @lends Stryng.prototype
   */
  var stryngFunctions = {

    /**
     * removes all whitespace, line terminators and Zs from both ends of this' string.
     * shim for native [String#trim](http://www.ecma-international.org/ecma-262/5.1/#sec-15.5.4.20)
     * @return {String}
     */
    trim: function (input) {
      return toString(input).replace(reTrimLeft, '').replace(reTrimRight, '');
    },

    /**
     * removes all whitespace, line terminators and Zs from the beginning of this' string.
     * shim for non-standard [String#trimLeft](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/TrimLeft)
     * @return {String}
     */
    trimLeft: function (input) {
      return toString(input).replace(reTrimLeft, '');
    },

    /**
     * removes all whitespace, line terminators and Zs from the end of this' string.
     * shim for non-standard [String#trimRight](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/TrimRight)
     * @return {String}
     */
    trimRight: function (input) {
      return toString(input).replace(reTrimRight, '');
    },

    /**
     * returns whether or not this' string contains the substring `search` starting at `position`.
     * shim for native [String#contains](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/contains)
     * @param {String} [search="undefined"]
     * @param {Number} [position=0]
     * @return {Boolean}
     */
    contains: function (input, search, position) {
      return toString(input).indexOf(search, position) !== -1;
    },

    /**
     * returns whether or not this' string at index `position` begins with substring `search`.
     * shim for native [String#startsWith](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.startswith)
     * @param {String|RegExp} [search="undefined"]
     * @param {Number} [position=0]
     * @return {Boolean}
     */
    startsWith: function (input, search, position) {
      input = toString(input);
      if (is.RegExp(search)) return !input.substring(position).search(search);

      var i = input.indexOf(search, position),
        inputLen = input.length;

      return i !== -1 && i === (
        position === void 0 || position < 0 ? 0 :
        position > inputLen ? inputLen :
        coreFloor(position) || 0
      );
    },

    /**
     * returns whether or not this' string truncated at `endPosition` ends with substring `search`.
     * `search` may also be a regular expression but must be of the form `/...$/`.
     * shim for native [String#endsWith](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.endswith)
     * @param {String|RegExp} [search="undefined"]
     * @param {Number} [endPosition=input.length]
     * @return {Boolean}
     * @throws if `search` is a regular expression but does not match its input's end.
     */
    endsWith: function (input, search, endPosition) {
      input = toString(input);

      var inputLen = input.length, i;

      endPosition = (
        endPosition === void 0 || endPosition > inputLen ? inputLen :
        endPosition < 0 ? 0 :
        coreFloor(endPosition) || 0
      );

      if (is.RegExp(search)) {
        if (!reMatchEnd.test(search.source)) exit('"search" must match end i.e. end with "$"');
        return search.test(input.substring(0, endPosition));
      }

      search = String(search);
      if (!search) return true;
      i = input.lastIndexOf(search, endPosition);
      return i !== -1 && (i + search.length === endPosition);
    },

    /**
     * concatenates this' string `n` times to the empty string.
     * shim for native [String#repeat](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.repeat).
     * reduction of concat operations inspired by [mout/string/repeat](https://github.com/mout/mout/blob/v0.9.0/src/string/repeat.js)
     * @param {Number} [n=0]
     * @return {String}
     * @throws if `n` is either negative or infinite.
     */
    repeat: function (input, n) {
      n = +n || 0;
      if (input == null || n < 0 || n == INFINITY) exit();
      n = coreFloor(n);

      var result = '';

      while (n) {
        if (n % 2) result += input;
        n = coreFloor(n / 2);
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
    substr: function (input, position, length) {
      input = toString(input);

      position = (
        position <= -1 ?
        (position = coreToInteger(position) + input.length) < 0 ?
        0 :
        position :
        position
      );
      return input.substr(position, length);
    },

    /**
     * prepends and appends `outfix` to `input` in one go.
     * to do the opposite use [Stryng.strip](#strip).
     * @param {String} [outfix] prefix and suffix
     * @param {Number} [n=0] number of operations
     * @return {String}
     */
    wrap: function (input, outfix, n) {
      input = toString(input);
      outfix = Stryng.repeat(outfix, n); // implies parsing `input`, `outfix` and `n`
      return outfix + input + outfix;
    },

    /**
     * prepends the 1st and appends the 2nd character of `braces` to `input`.
     * @param  {String} [braces='()']
     * @throws if `braces.length !== 2`
     * @return {String}
     */
    embrace: function(input, braces){
      input = toString(input);
      braces = braces !== void 0 ? String(braces) : '()';
      if(braces.length !== 2) exit();
      return braces.charAt(0) + input + braces.charAt(1);
    },

    /**
     * returns the number of non-overlapping occurrences of `search` within `input`.
     * the empty string is considered a _character boundary_
     * thus `input.length + 1` will always be the result for that.
     * @param {String} [search="undefined"] the substring to search for
     * @return {Number}
     */
    count: function (input, search) {
      input = toString(input);
      search = String(search);
      if (!search) return input.length + 1;

      var searchLen = search.length,
        count = 0,
        i = -searchLen; // prepare first run

      do i = input.indexOf(search, i + searchLen);
      while (i !== -1 && ++count);

      return count;
    },

    /**
     * delegates to native _Arrray#join_. returns the empty string if no arguments passed.
     * @param {...String} [joinees=[]]
     * @return {String}
     */
    join: function (delimiter /*, string... */) {
      if (delimiter == null) exit();

      // avoid non-optimizable Array#slice on arguments, see
      // [bluebird wiki](https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#3-managing-arguments)
      var i = arguments.length,
        args = new Array(i - 1);

      while (--i) args[i] = arguments[i]; // skip `delimiter`
      return args.join(delimiter); // implies parsing `delimiter`
    },

    /**
     * composition of native _String#split_, _Array#reverse_ and _Array#join_.
     * note that this rather naive implementation may not produce correct results.
     * for an alternative that knows how to properly reverse
     * diacritics and accented characters use [esrever](https://github.com/mathiasbynens/esrever).
     * @return {String}
     */
    reverse: function (input) {
      return toString(input).split('').reverse().join('');
    },

    /**
     * splits this' string at `position` and rejoins the resulting parts using `insertion`.
     * `position` may also be negative to index backwards.
     * @param {Number} [position=0]
     * @param {String} [insertion="undefined"]
     * @return {String}
     */
    insert: function (input, position, insertion) {
      input = toString(input);

      // help out _String#slice_'s implicit parsing which will apply different
      // defaults for `undefined` to the first and second argument
      position = +position || 0;
      return input.slice(0, position) + insertion + input.slice(position); // implies parsing `insertion`
    },

    /**
     * splits this' string at the given indices. negative indices are allowed.
     * if the resulting substrings overlap, the first one dominates, the latter is front-cut.
     * @param {...Number} index indices to split at. negatives allowed
     * @return {String[]}
     */
    splitAt: function (input /*, index... */) {
      input = toString(input);

      var inputLen = input.length,
        args = arguments,
        argsLen = args.length,
        i = 1, // skip `input`
        index = 0,
        pendingIndex = 0,
        result = [];

      for (; i < argsLen; i++) {
        index = coreToInteger(args[i]);
        if (index < 0) index += inputLen;
        if (index <= pendingIndex) {
          result.push(''); // faster than slicing the empty string first
          index = pendingIndex;
        } else {
          result.push(input.substring(pendingIndex, index));
          pendingIndex = index;
        }
      }
      result.push(input.substring(index));
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
    splitLeft: function (input, delimiter, n) {
      input = toString(input);
      n = (n === void 0 ? -1 : n) >>> 0;
      if (!n) return [];

      var result = [],
        match,
        index,
        lastIndex = 0,
        difference;

      if (is.RegExp(delimiter)) {
        while (n-- && (match = input.match(delimiter))) {
          index = match.index;
          result.push(input.substring(0, index));
          lastIndex = index + match.shift().length; // mutates `match`
          if (lastIndex <= index) lastIndex = index + 1; // avoid endless loop
          if (match.length) corePush.apply(result, match); // mutate instead of recreate as concat would
          input = input.substring(lastIndex);
        }
        result.push(input); // push what's left
      } else {
        delimiter = String(delimiter);
        result = input.split(delimiter);
        difference = result.length - n;
        if (difference > 0) result.push(result.splice(n, difference).join(delimiter));
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
    splitRight: function (input, delimiter, n) {
      input = toString(input);
      if (is.RegExp(delimiter)) exit('no regex support for splitRight');
      n = (n === void 0 ? -1 : n) >>> 0;
      if (!n) return [];
      delimiter = String(delimiter);

      var result = input.split(delimiter),
        difference = result.length - n;

      if (difference > 0) result.unshift(result.splice(0, difference).join(delimiter));
      return result;
    },

    /**
     * splits this' string by line terminators as defined in the
     * [spec](http://www.ecma-international.org/ecma-262/5.1/#sec-7.3).
     * @return {String[]}
     */
    splitLines: function (input) {
      return toString(input).split(reLineTerminators);
    },

    /**
     * substitues all non-overlapping occurrences of
     * `replacee` with `replacement`.
     * @param {String} [replacee="undefined"] string to replace
     * @param {String} [replacement="undefined"] replacement
     * @return {String}
     */
    exchange: function (input, replacee, replacement) {
      input = toString(input);
      replacee = String(replacee);
      replacement = String(replacement);
      if (replacee === replacement) return input;
      return input.split(replacee).join(replacement); // implies parsing
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
    exchangeLeft: function (input, replacee, replacement, n) {
      input = toString(input);
      replacee = String(replacee);
      replacement = String(replacement);
      if (replacee === replacement) return input;
      return Stryng.splitLeft(input, replacee, n).join(replacement); // implies parsing
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
    exchangeRight: function (input, replacee, replacement, n) {
      input = toString(input);
      replacee = String(replacee);
      replacement = String(replacement);
      if (replacee === replacement) return input;
      return Stryng.splitRight(input, replacee, n).join(replacement); // implies parsing
    },

    /**
     * both appends and prepends `fill` to this' string as often as needed
     * to reach but not exceed a length of `maxLen`. passing a `maxLen`
     * lesser than this' string's length has no effect. it is never truncated.
     * @param {Number} [maxLen=0]
     * @param {String} [fill="undefined"]
     * @return {String}
     */
    just: function (input, maxLen, fill) {
      input = toString(input);
      maxLen = +maxLen || 0;
      if (maxLen < 0 || maxLen == INFINITY) exit();
      maxLen = coreFloor(maxLen);
      fill = fill !== void 0 ? String(fill) : ' ';

      var inputLen = input.length,
        fillLen = fill.length * 2; // safe, `<< 1` converts to 32-Bit Integer

      if (maxLen <= inputLen) return input;
      while (input.length + fillLen <= maxLen) input = fill + input + fill;
      return input;
    },

    /**
     * prepends `fill` to this' string as often as needed
     * to reach but not exceed a length of `maxLen`. passing a `maxLen`
     * lesser than this' string's length has no effect. it is never truncated.
     * @param {Number} [maxLen=0]
     * @param {String} [fill="undefined"]
     * @return {String}
     */
    justLeft: function (input, maxLen, fill) {
      input = toString(input);
      maxLen = +maxLen || 0;
      if (maxLen < 0 || maxLen == INFINITY) exit();
      maxLen = coreFloor(maxLen);
      fill = fill !== void 0 ? String(fill) : ' ';

      var inputLen = input.length,
        fillLen = fill.length;

      if (maxLen <= inputLen || !fill) return input;
      while (input.length + fillLen <= maxLen) input = fill + input;
      return input;
    },

    /**
     * appends `fill` to this' string as often as needed
     * to reach but not exceed a length of `maxLen`. passing a `maxLen`
     * lesser than this' string's length has no effect. it is never truncated.
     * @param {Number} [maxLen=0]
     * @param {String} [fill="undefined"]
     * @return {String}
     */
    justRight: function (input, maxLen, fill) {
      input = toString(input);
      maxLen = +maxLen || 0;
      if (maxLen < 0 || maxLen == INFINITY) exit();
      maxLen = coreFloor(maxLen);
      fill = fill !== void 0 ? String(fill) : ' ';

      var inputLen = input.length,
        fillLen = fill.length;

      if (maxLen <= inputLen || !fill) return input;
      while (input.length + fillLen <= maxLen) input += fill;
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
    strip: function (input, outfix, n) {
      return Stryng.stripRight(Stryng.stripLeft(input, outfix, n), outfix, n);
    },

    /**
     * removes `prefix` `n` times from the beginning of this' string.
     * @param {String} [prefix="undefined"] string to remove
     * @param {Number} [n=Math.pow(2,32)-1] number of removals.
     * @return {String}
     */
    stripLeft: function (input, prefix, n) {
      input = toString(input);
      n = (n === void 0 ? -1 : n) >>> 0;
      prefix = String(prefix);
      if (!n || !prefix) return input;

      var prefixLen = prefix.length,
        pendingIndex = 0,
        i;

      do i = input.indexOf(prefix, pendingIndex);
      while (n-- && i === pendingIndex && (pendingIndex += prefixLen));
      return pendingIndex ? input.substring(pendingIndex) : input;
    },

    /**
     * the right-associative version of [Stryng.stripLeft](#stripLeft).
     * removes `prefix` `n` times from the end of this' string.
     * @param {String} [suffix="undefined"] string to remove
     * @param {Number} [n=Math.pow(2,32)-1] number of removals.
     * @return {String}
     */
    stripRight: function (input, suffix, n) {
      input = toString(input);
      n = (n === void 0 ? -1 : n) >>> 0;
      suffix = String(suffix);
      if (!n || !suffix) return input;

      var suffixLen = suffix.length,
        pendingIndex = input.length,
        i;

      do {
        pendingIndex -= suffixLen;
        i = input.lastIndexOf(suffix, pendingIndex);
      } while (n-- && i !== -1 && i === pendingIndex);
      return input.substring(0, pendingIndex + suffixLen);
    },

    /**
     * slices this' string to exactly fit the given `maxLen`
     * while including the `ellipsis` at its end (enforced).
     * @param {Number} [maxLen=Math.pow(2,32)-1] length of the result.
     * @param {String} [ellipsis="..."]
     * @return {String}
     */
    truncate: function (input, maxLen, ellipsis) {
      input = toString(input);
      maxLen = (maxLen === void 0 ? -1 : maxLen) >>> 0;
      if (!maxLen) return '';
      if (maxLen >= input.length) return input;
      ellipsis = ellipsis !== void 0 ? String(ellipsis) : '...';

      var ellipsisLen = ellipsis.length;

      if (ellipsisLen >= maxLen) return ellipsis.slice(-maxLen);
      return input.substring(0, maxLen - ellipsisLen) + ellipsis;
    },

    /**
     * backslash-escapes all occurences of double quote, backslash,
     * backspace, tab, vertical tab, newline, form feed and carriage return,
     * hex-encodes any non-ASCII-printable character and wraps the result
     * in (unescaped) double quotes. this can be interpreted as a
     * shallow version of the native _JSON#stringify_. shim for non-standard
     * [String#quote](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/quote).
     * @return {String}
     */
    quote: function (input) {
      input = toString(input);
      return (
        coreStringify ?
        coreStringify(input) :
        '"' + input
          .replace(reCtrl, cbCtrl)
          .replace(reXhex, cbXhex)
          .replace(reUhex, cbUhex) + '"'
      );
    },

    /**
     * mirrors the effect of [Stryng#quote](#quote) without using `eval`.
     * unescapes all occurences of backslash-escaped
     * characters (`"\\t\r\n\f\b`), decodes all hex-encoded
     * characters and removes surrounding double quotes once.
     * @return {String}
     */
    unquote: function (input) {
      return toString(input)
        .replace(reEscUXhex, cbEscUXhex)
        .replace(reEscCtrl, cbEscCtrl)
        .slice(1, -1);
    },

    /**
     * appends the given `tail` to this' string. unlike native _String#concat_
     * this method applies `'undefined'` as the default `tail`. has no effect
     * if `weak` is truthy and this' string already ends with `tail`.
     * @param {String} [tail="undefined"]
     * @return {String}
     */
    append: function (input, tail, weak) {
      input = toString(input);
      if (!!weak && Stryng.endsWith(input, tail)) return input;
      return input + tail;
    },

    /**
     * prepends the given `head` to this' string. has no effect
     * if `weak` is truthy and this' string already starts with `head`.
     * @param {String} [head="undefined"]
     * @param {Boolean} [weak=false]
     * @return {String}
     */
    prepend: function (input, head, weak) {
      input = toString(input);
      if (!!weak && Stryng.startsWith(input, head)) return input;
      return head + input;
    },

    /**
     * returns whether or not this' string strictly equals the
     * string representation of `comparable`
     * @param {String} [comparable="undefined"] string to compare to
     * @return {Boolean}
     */
    equals: function (input, comparable) {
      return toString(input) === String(comparable);
    },

    /**
     * lower-cases both this' string and `comparable` prior to
     * returning whether or not their are strictly equal.
     * @param {String} [comparable="undefined"] string to compare to
     * @return {Boolean}
     */
    iequals: function (input, comparable) {
      return toString(input).toLowerCase() === String(comparable).toLowerCase();
    },

    /**
     * returns whether or not this' string has length `0`
     * @return {Boolean}
     */
    isEmpty: function (input) {
      return !toString(input);
    },

    /**
     * returns whether or not this' string is empty or consists of
     * whitespace, line terminators and/or Zs only.
     * @return {Boolean}
     */
    isBlank: function (input) {
      input = toString(input);
      return !input || !reNoWs.test(input);
    },

    /**
     * return whether or not this' string matches the
     * floating point number format from the beginning
     * __until the end__ in contrast to native _parseFloat_.
     * note that it won't throw if the actual number exceeds
     * JavaScript's float range.
     * @return {Boolean}
     */
    isFloat: function (input) {
      return reIsFloat.test(toString(input));
    },

    /**
     * delegates to [Stryng#trim](#trim) and replaces groups of
     * whitespace, line terminators and/or Zs by a single space character.
     * @return {String}
     */
    clean: function (input) {
      return Stryng.trim(input).replace(reWss, ' ');
    },

    /**
     * upper-cases this' string's first character.
     * @return {String}
     */
    capitalize: function (input) {
      input = toString(input);
      return !input ? input : input.charAt().toUpperCase() + input.substring(1);
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
    camelize: function (input) {
      return toString(input).replace(reLowBoundary, cbLowBoundary);
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
    underscore: function (input) {
      return toString(input)
        .replace(reCaseSwitch, '$1_$2')
        .replace(reSpaceHyphen, '_')
        .toLowerCase();
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
    hyphenize: function (input) {
      return toString(input)
        .replace(reCaseSwitch, '$1-$2')
        .replace(reSpaceUnderscore, '-')
        .toLowerCase();
    },

    /**
     * replaces ligatures and diacritics from the Latin-1 Supplement
     * with their nearest ASCII equivalent.
     * compose this method with [Stryng#hyphenize](#hyphenize) to produce URL slugs
     * @return {String} [description]
     * @todo replace symbols otherwise being percent-escaped
     */
    simplify: function (input) {
      return toString(input).replace(reLatin1, cbLatin1);
    },

    /**
     * maps every character of this' string to its ordinal representation.
     * @return {Number[]}
     */
    ord: function (input) {
      input = toString(input);

      var i = input.length,
        result = new Array(i);

      while (i--) result[i] = input.charCodeAt(i);
      return result;
    },

    /**
     * escapes all special characters that have meaning to
     * JavaScript regexp parser. taken from [mdn](https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions)
     * @return {String}
     */
    escapeRegex: function (input) {
      return toString(input).replace(reRegex, '\\$1');
    },

    /**
     * convenience wrapper for native _RegExp_ constructor.
     * @param  {String} flags
     * @return {RegExp}
     */
    toRegex: function (input, flags) {
      return new RegExp(toString(input), flags);
    }
  };

  // static functions
  // ----------------

  /**
   * returns whether or not `value` is an instance of Stryng.
   * beware of Stryng classes hosted by other HTML frames inside
   * browser windows. this method won't recognize Stryngs
   * created with foreign Stryng constructors.
   * @function Stryng.isStryng
   * @param {*} value
   * @return {Boolean}
   */
  Stryng.isStryng = function (value) {
    return (value instanceof Stryng);
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
   * @throws if `n` is negative or not finite or `to` exceeds `Math.pow(2, 16)`
   */
  Stryng.random = function (n, from, to) {
    n = +n || 0;
    if (n < 0 || n == INFINITY) exit();
    n = coreFloor(n);
    from = from === void 0 ? 32 : (from >>> 0);
    to = to === void 0 ? 127 : (to >>> 0);
    if (to > MAX_CHARCODE) exit();

    var result = '',
      difference = to - from;

    if (difference > 0) {
      while (n--) {
        result += coreFromCharCode(from + coreFloor(coreRandom() * difference));
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
   * @throws if one of the `charCode`s exceeds `Math.pow(2, 16) - 1`
   */
  Stryng.chr = function (/* charCodes,... */) {
    var charCodes = arguments,
      i = charCodes.length;

    while (i--) {
      if (charCodes[i] > MAX_CHARCODE) {
        exit();
      }
    }
    return coreFromCharCode.apply(null, charCodes); // implies parsing `charCodes`
  };

  Stryng.fromCharCode = coreFromCharCode;
  Stryng.fromCodePoint = String.fromCodePoint;

  // building Stryng
  // ===============

  // decides upon the type of `result` and whether the Stryng instance
  // is mutable what to return.
  // - if `result` isn't a string at all, simply return it
  // - if the instance `_isMutable`, assign `result` to `_value` and return `this`
  //   - eventually reset `length` property if Object.defineProperty is not available
  // - if not, return a new Stryng instance constructed from `result`
  function recycle(stryng, result) {
    if (typeof result === 'string') {
      if (stryng._isMutable) {
        stryng._value = result;
        if (!coreDefineProperty) {
          stryng.length = result.length;
        }
        return stryng;
      } else {
        return new Stryng(result);
      }
    }
    return result;
  }

  // custom methods
  // --------------
  // - provide a closure for each wrapper function
  // - populate the custom static function `fn` onto the _Stryng_ namespace
  // - populate the function onto Stryng's prototype wrapped in another which
  //   unshifts the _Stryng_ instance's wrapped `_value`
  //   to become the first argument among the proxied ones to the static function
  coreForEach.call(coreKeys(stryngFunctions), function(fnName){

    var fn = stryngFunctions[fnName];

    Stryng[fnName] = fn;

    Stryng[strPrototype][fnName] = function () {

      // Array#slice arguments makes this function unoptimizable, see
      // [bluebird wiki](https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#3-managing-arguments)
      var i = arguments.length,
        args = new Array(i),
        that = this,
        result;

      while (i--) args[i] = arguments[i];
      args.unshift(that._value);
      result = fn.apply(null, args);
      return recycle(that, result);
    };
  });

  // native methods
  // --------------
  // - provide a closure for each wrapper function
  // - skip functions that need stay shimmed
  // - populate the native static function `String[ fnName ]` onto the
  //   Stryng namespace if present, otherwise construct one from the equivalent
  //   instance method `fn` as learned from [javascript garden][1]
  // - populate the function onto Stryng's prototype wrapped in another which..
  //   - calls the native instance method on Stryng instance's wrapped `_value`
  //   - proxies the given `arguments`
  //   - handles the result accordingly
  // 
  // [1]: http://bonsaiden.github.io/JavaScript-Garden/#function.arguments
  coreForEach.call(methods, function (fnName) {

    var fn = VERSION[fnName];

    if (is.Function(fn) && !coreContains.call(overrides, fnName)) {

      Stryng[fnName] = adoptNativeStatics && String[fnName] || function (input) {
        if (input == null) exit();
        return coreCall.apply(fn, arguments);
      };

      Stryng[strPrototype][fnName] = function () {
        var that = this,
          result = fn.apply(that._value, arguments);

        return recycle(that, result);
      };
    }
  });

  // export
  // ------
  // - cjs
  // - amd - anonymous
  // - browser - opt to rename

  if (typeof module !== typeUndefined && module.exports) {
    module.exports = Stryng;
  } else if (typeof define === typeFunction && define.amd) {
    /* global define*/
    define(function () {
      return Stryng;
    });
  } else {

    /**
     * restores the previous value assigned to `window.Stryng`
     * and returns the inner reference Stryng holds to itself.
     * @function Stryng.noConflict
     * @return {Stryng}
     */
    var previousStryng = root.Stryng;
    Stryng.noConflict = function () {
      root.Stryng = previousStryng;
      return Stryng;
    };

    root.Stryng = Stryng;
  }

}(this));