/*!
 * stryngjs released under MIT licence
 * http://mariusrunge.com/mit-licence.html
 */

/**
 * @module  stryng
 */

(function (root) {
  'use strict';

  // constants
  // ---------
  // except regular expressions

  var
  INFINITY = 1 / 0,
  MAX_CHARCODE = '\uFFFF'.charCodeAt(0),
  STR_FUNCTION = 'function',
  STR_PROTOTYPE = 'prototype',
  STR_UNDEFINED = 'undefined',
  STR_OBJECT_ARRAY = '[object Array]',
  STR_OBJECT_REGEXP = '[object RegExp]',

  /**
    Stryng's version.
    
    @property VERSION
    @for  Stryng
    @final
    @readOnly
    @type {string}
   */
  VERSION = '0.1.10',

  // string inheritance
  // ------------------
  String = VERSION.constructor,

  // native instance methods `Stryng` hopes to adapt. the world isn't
  // ready for `Object.getOwnPropertyNames(String.prototype)` yet.
  // 
  methods = ('charAt,charCodeAt,codePointAt,concat,contains,' +
    'endsWith,indexOf,lastIndexOf,localeCompare,match,normalize,' +
    'replace,search,slice,split,startsWith,substr,substring,' +
    'toLocaleLowerCase,toLocaleUpperCase,toLowerCase,toUpperCase,' +
    'trim,trimLeft,trimRight').split(','),

  // methods which's native implementations to override if necessary
  overrides = [],

  // whether or not to adapt native static functions
  hasStaticNatives = (function () {
    // wrap try-catch clauses for optimizability of outer scope

    if (isFunction(String.slice)) {
      try { String.slice(/* undefined */); } // expect to throw
      catch (e){ return true; }
    }

    return false;

  }()),

  // method shortcuts
  // ----------------
  // static function names start with their parent namespace.
  // instance method names start with an underscore followed by their prototype.
  // shims are for internal use only.

  mathFloor = Math.floor,
  mathRandom = Math.random,
  stringFromCharCode = String.fromCharCode,
  jsonStringify = typeof JSON !== STR_UNDEFINED && JSON.stringify,

  // fully [spec](http://www.ecma-international.org/ecma-262/5.1/#sec-9.4)
  // compliant implementation of `Number.toInteger`,
  // tested and benchmarked at [jsperf](http://jsperf.com/to-integer/11).
  // 
  numberToInteger = Number.toInteger || function (any) {
    var n = +any;
    return n ? isFinite(n) ? n - (n%1) : n : 0;
  },

  objectDefineProperty = (function (objectDefineProperty) {
    // wrap try-catch clauses for optimizability of outer scope

    try {
      objectDefineProperty(Stryng, 'VERSION', {
        writable: false,
        value: VERSION
      });
      objectDefineProperty(Stryng[STR_PROTOTYPE], 'length', {
        get: function () { return this.__value__.length; },
        set: function () {} // provide noop setter for Safari 5/5.1
      });
    } catch (e) {
      Stryng.VERSION = VERSION;
      objectDefineProperty = false;
    }

    return objectDefineProperty;

  }(Object.defineProperty)),

  // ignore the [dont-enum bug](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys).
  // further assume that the `object` has `hasOwnProperty` on its prototype chain.
  // 
  objectKeys = Object.keys || function (object) {
    var keys = [],
        i = 0;

    for (var key in object){ // `key` is required to be purely local
      if (object.hasOwnProperty(key)){
        keys[i++] = key;
      }
    }

    return keys;
  },

  _arrayPush = methods.push,

  _objectToString = ({}).toString,

  _arrayForEach = methods.forEach || function (fn) {
    var array = this,
        len = array.length,
        i = -1;

    while (++i < len) if (fn(array[i], i, array) === false) break;
  },

  _arrayIndexOf = methods.indexOf || function (item) {
    var i = -1;

    _arrayForEach.call(this, function (item_, i_) {
      if (item === item_) return (i = i_), false;
    });

    return i;
  },

  _arrayContains = methods.contains || function (item) {
    return _arrayIndexOf.call(this, item) !== -1;
  },

  // regular expressions
  // -------------------

  // ### quote & unquote
  ctrlMap = {
    '\b': 'b', // backspace
    '\f': 'f', // form feed
    '\n': 'n', // new line
    '\r': 'r', // carriage return
    '\t': 't', // tab
    '\v': 'v'  // vertical tab
  },
  escCtrlMap = {
    'b': '\b',
    'f': '\f',
    'n': '\n',
    'r': '\r',
    't': '\t',
    'v': '\v' 
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
    return stringFromCharCode(parseInt(uxhex, 16));
  },
  reStripQuotes = /^"|"$/g,

  // ### name transforms
  // 
  reLowBoundary = /[ _-]([a-z]?)/g,
  cbLowBoundary = function (_, chr) {
    return chr ? chr.toUpperCase() : '';
  },
  reCaseSwitch = /([a-z])([A-Z])/g,
  reSpaceHyphen = /[ -]/g,
  reSpaceUnderscore = /[ _]/g,

  // ### util
  reRegex = /([.,*+-?^=!:${}()|\[\]\/\\])/g,
  cbRegex = '\\$1',

  reIsFloat = /^\d+(?:\.\d*)?(?:[eE][\-\+]?\d+)?$/,

  // ### diacritics & liguatures
  // 
  // because character mappings easily grow large we only provide
  // the [Latin-1 Supplement](http://unicode-table.com/en/#latin-1-supplement)
  // (letters in range [xC0-xFF]) mapped to their nearest character
  // allowed in URL path segments.
  // 
  // we also rely on native `String#toLowerCase` and `String#toUpperCase`
  // to properly convert characters.

  latin1Reprs = ('A,A,A,A,Ae,A,AE,C,E,E,E,E,I,I,I,I,D,N,O,O,O,O,Oe,-,Oe,' + 
    'U,U,U,Ue,Y,Th,ss,a,a,a,a,ae,a,ae,c,e,e,e,e,i,i,i,i,d,n,o,o,o,o,oe,-,oe,' +
    'u,u,u,ue,y,th,y').split(','),

  latin1Chars = (function () {
    // avoid polluting the main closure

    var offset = 0xC0,
        limit = 0x100,
        len = limit - offset,
        i = -1,
        charCodes = new Array(len);
  
    charCodes[0] = 1; // initialize as numerically typed array
    while (++i < len) charCodes[i] = i + offset;
   
    return stringFromCharCode.apply(null, charCodes);
    
  }()),

  reLatin1 = new RegExp('[' + latin1Chars + ']', 'g'),
  cbLatin1 = function (match) {
    return latin1Reprs[latin1Chars.indexOf(match)];
  },

  // ### the whitespace shim
  // 
  // native implementations of `String#trim` might miss out
  // on some of the more exotic characters considered [whitespace][1],
  // [line terminators][2] or the mysterious [Zs][3]. this section detects those
  // flaws and constructs the regular expressions used in the shims.
  // many thanks to the authors of [faster trim][4] and [whitespace deviations][5].
  //   
  // [1]: http://www.ecma-international.org/ecma-262/5.1/#sec-7.2
  // [2]: http://www.ecma-international.org/ecma-262/5.1/#sec-7.3
  // [3]: http://www.fileformat.info/info/unicode/category/
  // [4]: http://blog.stevenlevithan.com/archives/faster-trim-javascript
  // [5]: http://perfectionkills.com/whitespace-deviations/

  reWss = /\s\s*/g, // used for detecting flaws
  reNoWs = /\S/,
  reTrimLeft = /^\s\s*/,
  reTrimRight = /\s*\s$/,
  reLineTerminators = /\r?\n|\u2028|\u2029/g;

  (function () {
    // avoid polluting the main closure

    var reWsSource = '\\s',
        reWsSourceLen = reWsSource.length,
        reWssSource,
        hexCharCodes = ( // pad to length 4 to avoid `parseInt` inconcistencies
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
          'FEFF'    // byte order mark
        ).split(',');

    // check if the native whitespace character class matches all of the above
    // and patch regexes if it doesn't.
    // 
    _arrayForEach.call(hexCharCodes, function (hex) {
      if (!reWss.test(stringFromCharCode(parseInt(hex, 16)))) {
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

  // feature detection
  // -----------------

  // check if the native implementation of `String#startsWith`
  // already knows how to deal with indices.
  // consider `String#endsWith` to behave the same on that matter.
  // 
  if (!isFunction(VERSION.startsWith) || !'ab'.startsWith('b', 1)) {
    overrides.push('startsWith', 'endsWith');
  }

  // check if the native implementation of `String#substr`
  // correctly deals with negative indices.
  // 
  if ('ab'.substr(-1) !== 'b') {
    overrides.push('substr');
  }

  // helper methods
  // --------------

  function toString (input) {
    if (input === null || input === void 0) exit('input must not be null');
    return String(input);
  }

  function exit (message) {
    throw new Error(message || 'invalid usage of stryng member');
  }

  function isRegExp (any) {
    return _objectToString.call(any) === STR_OBJECT_REGEXP;
  }

  function isFunction (any) {
    // old webkit yields true for regexes. for internal use only.
    return typeof any === STR_FUNCTION;
  }

  function isArray (any) {
    return _objectToString.call(any) == STR_OBJECT_ARRAY;
  }

  // override if natively available
  if (isFunction(Array.isArray)) var isArray = Array.isArray;

  // constructor
  // -----------

  /**
    utility class for manipulating strings in JavaScript. the built-in functions
    are neither sufficient nor consistent due to the language's minimalistic nature
    and browser incompatibilities. 

    - __inherits native String class and namespace__
    - __every [native] instance method has a static version__
      (except: `clone, valueOf, toString, toSource`)
    - static versions are faster
    - working with immutable instances is faster

    @class Stryng
    @extends {string}
    @constructor
    @param {string} string
    @param {boolean} [isMutable=false]
      whether the created instance should be mutable or
      create a new instance from the result of every chainable method call
    @return {Stryng}
    @throws if `value` is either `null` or `undefined`
   */
  function Stryng(value, isMutable) {
    var instance = this;

    // allow omitting the `new` operator
    if (!(instance instanceof Stryng)) return new Stryng(value, isMutable);

    /**
      the wrapped native string primitive
      
      @attribute __value__
      @private
      @type {string}
     */
    instance.__value__ = toString(value);

    /**
      whether the created instance should be mutable or
      create a new instance from the result of every method call.
      
      @attribute isMutable
      @default false
      @type {boolean}
     */
    instance.isMutable = !!isMutable;

    /**
      this' string's length defined via `Object.defineProperty`
      on `Stryng.prototype`. if not available, this is a simple property.
      
      @attribute length
      @readOnly
      @type {number}
      @todo further [reading](http://www.2ality.com/2012/08/property-definition-assignment.html)
     */
    if (!objectDefineProperty) instance.length = instance.__value__.length;
  }

  // cloning mutables
  // ----------------

  /**
    curried version of the {{#crossLink "Stryng"}}`constructor`{{/crossLink}}.
    in case the instance was not constructed to be mutable this is the hook
    to get a copy of it. this method is only available on `Stryng.prototype`.
    
    @method clone
    @chainable
    @param {boolean} [isMutable=false]
    @return {Stryng}
   */
  Stryng[STR_PROTOTYPE].clone = function (isMutable) {
    return new Stryng(this.__value__, isMutable);
  };

  // seemlessness
  // ------------

  /**
    getter for {{#crossLink "Stryng/__value__:attribute"}}{{/crossLink}}.
    this method is only available on `Stryng.prototype`. __alias:__ `valueOf`
    
    @method toString
    @return {string}
   */
  Stryng[STR_PROTOTYPE].valueOf = Stryng[STR_PROTOTYPE].toString = function () {
    return this.__value__; // we can rest assured that this is a primitive
  };

  /**
    returns the string representation of the expression
    used to construct this instance.
    
    @method  toSource
    @return {string} eval-string-expression
   */
  Stryng[STR_PROTOTYPE].toSource = function(){
    return '(new Stryng("' + this.__value__ + ', ' + this.isMutable + '"))';
  };

  // instance methods
  // ----------------

  var stryngFunctions = {

    /**
      removes all whitespace, line terminators and Zs from both ends of this' string.
      shim for native [String#trim](http://www.ecma-international.org/ecma-262/5.1/#sec-15.5.4.20)

      @method  trim
      @chainable
      @return {Stryng}
     */
    trim: function (input) {
      return toString(input).replace(reTrimLeft, '').replace(reTrimRight, '');
    },

    /**
      removes all whitespace, line terminators and Zs from the beginning of this' string.
      shim for non-standard [String#trimLeft](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/TrimLeft)
      
      @method  trimLeft
      @chainable
      @return {Stryng}
     */
    trimLeft: function (input) {
      return toString(input).replace(reTrimLeft, '');
    },

    /**
      removes all whitespace, line terminators and Zs from the end of this' string.
      shim for non-standard [String#trimRight](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/TrimRight)
      
      @method  trimRight
      @chainable
      @return {Stryng}
     */
    trimRight: function (input) {
      return toString(input).replace(reTrimRight, '');
    },

    /**
      returns whether or not this' string contains the substring `search` starting at `position`.
      shim for native [String#contains](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/contains)
      
      @method  contains
      @param {string} [search="undefined"]
      @param {number} [position=0]
      @return {boolean}
     */
    contains: function (input, search, position) {
      return toString(input).indexOf(search, position) !== -1;
    },

    /**
      returns whether or not this' string at index `position` begins with substring `search`.
      shim for native [String#startsWith](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.startswith)
      
      @method  startsWith
      @param {String|RegExp} [search="undefined"]
      @param {number} [position=0]
      @return {boolean}
     */
    startsWith: function (input, search, position) {
      input = toString(input);
      if (isRegExp(search)) return !input.substring(position).search(search);

      var i = input.indexOf(search, position),
        inputLen = input.length;

      return i !== -1 && i === (
        position === void 0 || position < 0 ? 0 :
        position > inputLen ? inputLen :
        mathFloor(position) || 0
      );
    },

    /**
      returns whether or not this' string truncated at `endPosition` ends with substring `search`.
      shim for native [String#endsWith](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.endswith)
      
      @method  endsWith
      @param {String|RegExp} [search="undefined"]
      @param {number} [endPosition=input.length]
      @return {boolean}
      @throws if `search` is a regular expression.
     */
    endsWith: function (input, search, endPosition) {
      input = toString(input);

      var inputLen = input.length, i;

      endPosition = (
        endPosition === void 0 || endPosition > inputLen ? inputLen :
        endPosition < 0 ? 0 :
        mathFloor(endPosition) || 0
      );

      if (isRegExp(search)) exit('no regex support for endsWith');

      search = String(search);
      if (!search) return true;
      i = input.lastIndexOf(search, endPosition);
      return i !== -1 && (i + search.length === endPosition);
    },

    /**
      concatenates this' string `n` times to the empty string.
      shim for native [String#repeat](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.repeat).
      reduction of concat operations inspired by [mout/string/repeat](https://github.com/mout/mout/blob/v0.9.0/src/string/repeat.js)
      
      @method  repeat
      @chainable
      @param {number} [n=0]
      @return {Stryng}
      @throws if `n` is either negative or infinite.
     */
    repeat: function (input, n) {
      n = +n || 0;
      if (input == null || n < 0 || n == INFINITY) exit();
      n = mathFloor(n);

      var result = '';

      while (n >= 1) {
        if (n % 2) result += input;
        n /= 2;
        input += input;
      }
      return result;
    },

    /**
      returns the substring of `input` with length `length` starting at
      `position` which may also be negative to index backwards.
      shim for native [String#substr](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.substr)
      
      @method  substr
      @chainable
      @param {number} [position=0]
      @param {number} [length=`input.length-position`] this' string's length minus `position`
      @return {Stryng}
     */
    substr: function (input, position, length) {
      input = toString(input);

      position = (
        position <= -1 ?
          (position = numberToInteger(position) + input.length) < 0 ? 0 : position
        : position
      );
      return input.substr(position, length);
    },

    /**
      prepends and appends `outfix` to `input` in one go.
      to do the opposite use {{#crossLink "Stryng/strip:method"}}{{/crossLink}}
      
      @method  wrap
      @chainable
      @param {string} outfix
        prefix and suffix
      @param {number} [n=0] no. operations
      @return {Stryng}
     */
    wrap: function (input, outfix, n) {
      input = toString(input);
      outfix = Stryng.repeat(outfix, n); // implies parsing `input`, `outfix` and `n`
      return outfix + input + outfix;
    },

    /**
      prepends the 1st and appends the 2nd character of `braces` to this' string.
      
      @method embrace
      @chainable
      @param  {string} [braces='()']
      @return {Stryng}
      @throws if `braces.length !== 2`
     */
    embrace: function(input, braces){
      input = toString(input);
      braces = braces !== void 0 ? String(braces) : '()';
      if(braces.length !== 2) exit();
      return braces.charAt(0) + input + braces.charAt(1);
    },

    /**
      returns the no. non-overlapping occurrences of `search` within `input`.
      the empty string is considered a _character boundary_
      thus `input.length + 1` will always be the result for that.
      
      @method  count
      @param {string} [search="undefined"] the substring to search for
      @return {number}
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
      returns an object with `searches` as keys. each key is associated with its
      no. non-overlapping occurrences within `input`.
      the empty string is considered a _character boundary_
      thus `input.length + 1` will always be the result for that.

      __note:__ duplicate entries within `searches` won't be removed prior to counting
      and thereby impact performance but don't change the result.

      @method  countMultiple
      @param {Array} [searches=[]] substrings to search for
      @return {Object}

      if multiple keys in `searches` match `input` at the same index the first
      one encountered in the array will take the credit. for this reason you
      might want to sort your `searches` by length in descending order prior to
      passing them in.
      @example
          var text       = Stryng('abc abc abc'),
              searches   = ['a', 'ab', 'abc'];
              sortedDesc = ['abc', 'ab', 'a'];
              
          text.countMultiple(searches);   // {a: 3}
          text.countMultiple(sortedDesc); // {abc: 3}

      if you don't want this behavior use {{#crossLink "Stryng/count:method"}}
      {{/crossLink}} for each search instead.
      @example
          var testToSearch = Stryng(post),
              result = {};
              
          searches.forEach(function(search){
            result[search] = testToSearch.count(search);
          });

          result; // {a: 3, ab: 3, abc: 3}

     */
    countMultiple: function (input, searches){
      input = toString(input);
      if (searches === void 0) return {};
      if (!isArray(searches)) exit('.countMultiple() requires an array as 2nd argument');

      var searchesLen = searches.length, i,
          containsEmptyString = _arrayContains.call(searches, ''),
          indices = new Array(searchesLen),
          result = {},
          offset = 0,
          index,
          minIndex,
          found,
          search;

      while (true){
        minIndex = INFINITY;

        for (i = 0; i < searchesLen; i++){
          index = indices[i];
          search = String(searches[i]); // though parsing is implied..

          if (!search) continue; // skip the empty string

          if (index === void 0 || index !== -1 && index < offset){
            indices[i] = index = input.indexOf(search, offset);
          }

          if (-1 < index && index < minIndex){
            minIndex = index;
            found = search;
          }
        }

        if(minIndex === INFINITY) break;

        result[found] = (result[found]+1) || 1;
        offset = minIndex + found.length; // ..except for .length access
      }

      if (containsEmptyString) result[''] = input.length + 1;

      return result;
    },

    /**
      delegates to native `Arrray#join`. returns the empty string if no arguments passed.

      @method  delimit
      @param {Array} [joinees=[]] substrings to concatenate
      @return {Stryng}
     */
    delimit: function (delimiter, joinees) {
      if (delimiter == null) exit();
      return (
        joinees === void 0 ? '' :
        !isArray(joinees) ? exit('expected type: array') : 
        joinees.join(delimiter) // implies parsing `delimiter`
      );
    },

    /**
      composition of native `String#split`, `Array#reverse` and `Array#join`.
      note that this rather naive implementation may not produce correct results.
      for an alternative that knows how to properly reverse
      diacritics and accented characters use [esrever](https://github.com/mathiasbynens/esrever).

      @method  reverse
      @chainable
      @return {Stryng}
     */
    reverse: function (input) {
      return toString(input).split('').reverse().join('');
    },

    /**
      splits this' string at `position` and joins the resulting parts using 
      `insertion` as the delimiter. `position` may also be negative.

      @method insert
      @chainable
      @param {number} [position=0] index where `insertion` will be found
      @param {string} [insertion="undefined"] string to insert
      @return {Stryng}
     */
    insert: function (input, position, insertion) {
      input = toString(input);

      // help out <tt>String#slice<tt/>'s implicit parsing which will apply different
      // defaults for `undefined` to the first and second argument
      // 
      position = +position || 0;
      return input.slice(0, position) + insertion + input.slice(position); // implies parsing `insertion`
    },

    /**
      splits this' string at the given `indices`. negative indices will be
      added this' string's length, min-ed to `0` and max-ed to this' string's length.
      if the resulting substrings overlap, the first/left one dominates,
      the latter/right is truncated by the overlapping characters.

      @method  splitAt
      @param {Array} [indices=[]]
        numeric indices to split at. negatives allowed.
      @return {Array} array of substrings
     */
    splitAt: function (input, indices) {
      input = toString(input);

      if (indices === void 0) indices = [];
      else if (!isArray(indices)) exit('expected type: array');

      var inputLen = input.length,
          pendingIndex = 0, index = 0,
          result = [], r = 0,
          len = indices.length, i = -1;

      while (++i < len){
        index = numberToInteger(indices[i]);
        if (index < 0) index += inputLen;
        if (index <= pendingIndex) {
          result[r++] = ''; // faster than slicing the empty string first
          index = pendingIndex;
        } else {
          result[r++] = input.substring(pendingIndex, index);
          pendingIndex = index;
        }
      }
      result[r] = input.substring(index);
      return result;
    },

    /**
      splits this' string `n` times by the given `delimiter`. any captured groups
      and the trailing part after the `n`th occurence of `delimiter` are included
      in the returned array.

      @method  splitLeft
      @param {String|RegExp} [delimiter="undefined"]
      @param {number} [n=Math.pow(2,32)-1]
        max. no. split operations.
        default as per [ecma-262/5.1](http://www.ecma-international.org/ecma-262/5.1/#sec-15.5.4.14)
      @return {String[]}
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

      if (isRegExp(delimiter)) {
        while (n-- && (match = input.match(delimiter))) {
          index = match.index;
          result.push(input.substring(0, index));
          lastIndex = index + match.shift().length; // mutates `match`
          if (lastIndex <= index) lastIndex = index + 1; // avoid endless loop
          if (match.length) _arrayPush.apply(result, match); // mutate instead of recreate as concat would
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
      the right-associative version of [Stryng.splitLeft](#splitLeft).
      splits this' string `n` times by the given `delimiter`. the preceding part
      after the `n`th occurence of `delimiter` - counting backwards -
      is included in the returned array. currently has no regex support
     
      @method  splitRight
      @param {string} [delimiter="undefined"]
      @param {number} [n=Math.pow(2,32)-1]
        max. no. split operations.
        default as per [ecma-262/5.1](http://www.ecma-international.org/ecma-262/5.1/#sec-15.5.4.14)
      @return {String[]}
      @throws if `delimiter` is a regular expression
     */
    splitRight: function (input, delimiter, n) {
      input = toString(input);
      if (isRegExp(delimiter)) exit('no regex support for splitRight');
      n = (n === void 0 ? -1 : n) >>> 0;
      if (!n) return [];
      delimiter = String(delimiter);

      var result = input.split(delimiter),
        difference = result.length - n;

      if (difference > 0) result.unshift(result.splice(0, difference).join(delimiter));
      return result;
    },

    /**
      splits this' string by line terminators as defined in the
      [spec](http://www.ecma-international.org/ecma-262/5.1/#sec-7.3).
     
      @method  splitLines
      @return {String[]}
     */
    splitLines: function (input) {
      return toString(input).split(reLineTerminators);
    },

    /**
      substitues all non-overlapping occurrences of `replacee` with `replacement`.

      @method  exchange
      @chainable
      @param {string} [replacee="undefined"] string to be replaced
      @param {string} [replacement="undefined"]
      @return {Stryng}
     */
    exchange: function (input, replacee, replacement) {
      input = toString(input);
      replacee = String(replacee);
      replacement = String(replacement);
      if (replacee === replacement) return input;
      return input.split(replacee).join(replacement); // implies parsing
    },

    /**
      substitues the first `n` non-overlapping occurrences of
      `replacee` with `replacement`.

      @method  exchangeLeft
      @chainable
      @param {string} [replacee="undefined"] string to be replaced
      @param {string} [replacement="undefined"]
      @param {number} [n=Math.pow(2,32)-1] max. no. replacement operations.
      @return {Stryng}
     */
    exchangeLeft: function (input, replacee, replacement, n) {
      input = toString(input);
      n = (n === void 0 ? -1 : n) >>> 0;
      replacee = String(replacee);
      replacement = String(replacement);
      if (replacee === replacement) return input;
      return stryngFunctions.splitLeft(input, replacee, n).join(replacement);
    },

    /**
      substitues the last `n` non-overlapping occurrences of
      `replacee` with `replacement`.

      @method  exchangeRight
      @chainable
      @param {string} [replacee="undefined"] string to be replaced
      @param {string} [replacement="undefined"]
      @param {number} [n=Math.pow(2,32)-1] max. no. replacement operations.
      @return {Stryng}
     */
    exchangeRight: function (input, replacee, replacement, n) {
      input = toString(input);
      n = (n === void 0 ? -1 : n) >>> 0;
      replacee = String(replacee);
      replacement = String(replacement);
      if (replacee === replacement) return input;
      return stryngFunctions.splitRight(input, replacee, n).join(replacement);
    },

    /**
      both appends and prepends `fill` to this' string as often as needed
      to reach but not exceed a length of `maxLen`. passing a `maxLen`
      lesser than this' string's length has no effect. it is never truncated.

      @method just
      @chainable
      @param {number} [maxLen=0]
      @param {string} fill
      @return {Stryng}
     */
    just: function (input, maxLen, fill) {
      input = toString(input);
      maxLen = +maxLen || 0;
      if (maxLen < 0 || maxLen == INFINITY) exit();
      maxLen = mathFloor(maxLen);
      fill = String(fill);

      var inputLen = input.length,
        fillLen = fill.length * 2; // safe, `<< 1` converts to 32-Bit Integer

      if (maxLen <= inputLen) return input;
      while (input.length + fillLen <= maxLen) input = fill + input + fill;
      return input;
    },

    /**
      prepends `fill` to this' string as often as needed
      to reach but not exceed a length of `maxLen`. passing a `maxLen`
      lesser than this' string's length has no effect. it is never truncated.

      @method  justLeft
      @chainable
      @param {number} [maxLen=0]
      @param {string} fill
      @return {Stryng}
     */
    justLeft: function (input, maxLen, fill) {
      input = toString(input);
      maxLen = +maxLen || 0;
      if (maxLen < 0 || maxLen == INFINITY) exit();
      maxLen = mathFloor(maxLen);
      fill = String(fill);

      var inputLen = input.length,
        fillLen = fill.length;

      if (maxLen <= inputLen || !fill) return input;
      while (input.length + fillLen <= maxLen) input = fill + input;
      return input;
    },

    /**
      appends `fill` to this' string as often as needed
      to reach but not exceed a length of `maxLen`. passing a `maxLen`
      lesser than this' string's length has no effect. it is never truncated.

      @method  justRight
      @chainable
      @param {number} [maxLen=0]
      @param {string} fill
      @return {Stryng}
     */
    justRight: function (input, maxLen, fill) {
      input = toString(input);
      maxLen = +maxLen || 0;
      if (maxLen < 0 || maxLen == INFINITY) exit();
      maxLen = mathFloor(maxLen);
      fill = String(fill);

      var inputLen = input.length,
        fillLen = fill.length;

      if (maxLen <= inputLen || !fill) return input;
      while (input.length + fillLen <= maxLen) input += fill;
      return input;
    },

    /**
      the combination of [Stryng.stripLeft](#stripLeft) and [Stryng.stripRight](#stripRight).
      removes `outfix` max. `n` times from the both ends of this' string.

      @method  strip
      @chainable
      @param {string} [outfix="undefined"] string to remove
      @param {number} [n=Math.pow(2,32)-1] max. no. removals
      @return {Stryng} -

     */
    strip: function (input, outfix, n) {
      return stryngFunctions.stripRight(
             stryngFunctions.stripLeft(input, outfix, n), outfix, n);
    },

    /**
      removes `prefix` `n` times from the beginning of this' string.

      @method  stripLeft
      @chainable
      @param {string} [prefix="undefined"] string to remove
      @param {number} [n=Math.pow(2,32)-1] max. no. removals
      @return {Stryng}
     */
    stripLeft: function (input, prefix, n) {
      input = toString(input);
      n = (n === void 0 ? -1 : n) >>> 0;
      prefix = String(prefix);
      if (!n || !prefix) return input;

      var prefixLen = prefix.length,
          pendingIndex = -prefixLen,
          i;

      do {
        pendingIndex += prefixLen;
        i = input.indexOf(prefix, pendingIndex);
      } while (n-- && i === pendingIndex);
      return pendingIndex ? input.substring(pendingIndex) : input;
    },

    /**
      the right-associative version of [Stryng.stripLeft](#stripLeft).
      removes `suffix` `n` times from the end of this' string.

      @method stripRight
      @chainable
      @param {string} [suffix="undefined"] string to remove
      @param {number} [n=Math.pow(2,32)-1] max. no. removals
      @return {Stryng}
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
      slices this' string to exactly fit the given `maxLen`
      while including the `ellipsis` at its end (enforced).

      @method  truncate
      @chainable
      @param {number} [maxLen=Math.pow(2,32)-1] length of the result.
      @param {string} [ellipsis="..."]
      @return {Stryng}
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
      backslash-escapes all occurences of double quote, backslash,
      backspace, tab, vertical tab, newline, form feed and carriage return,
      hex-encodes any non-ASCII-printable character and wraps the result
      in (unescaped) double quotes. this can be interpreted as a
      shallow version of the native `JSON#stringify`. shim for non-standard
      [String#quote](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/quote).

      @method  quote
      @chainable
      @return {Stryng}
     */
    quote: function (input) {
      input = toString(input);
      return (
        jsonStringify ?
        jsonStringify(input) :
        '"' + input
          .replace(reCtrl, cbCtrl)
          .replace(reXhex, cbXhex)
          .replace(reUhex, cbUhex) + '"'
      );
    },

    /**
      mirrors the effect of {{#crossLink "Stryng/quote:method"}}{{/crossLink}}
      without using `eval`. unescapes all occurences of backslash-escaped
      characters (`"\\t\r\n\f\b`), decodes all hex-encoded characters and
      removes surrounding double quotes once.

      @method unquote
      @chainable
      @return {Stryng}
     */
    unquote: function (input) {
      return toString(input)
        .replace(reEscUXhex, cbEscUXhex)
        .replace(reEscCtrl, cbEscCtrl)
        .replace(reStripQuotes, '');
    },

    /**
      appends the given `tail` to this' string.

      @method  append
      @chainable
      @param {string} [tail="undefined"]
      @param {boolean} [once=false] if truthy and this' string already ends
                                    with `tail` the operation has no effect
      @return {Stryng}
     */
    append: function (input, tail, once) {
      input = toString(input);
      if (once && Stryng.endsWith(input, tail)) return input;
      return input + tail;
    },

    /**
      prepends the given `head` to this' string.

      @method  prepend
      @chainable
      @param {string} [head="undefined"]
      @param {boolean} [once=false] if truthy and this' string already starts
                                    with `tail` the operation has no effect
      @return {Stryng}
     */
    prepend: function (input, head, once) {
      input = toString(input);
      if (once && Stryng.startsWith(input, head)) return input;
      return head + input;
    },

    /**
      @method  equals
      @param {string} [comparable="undefined"] string to compare to
      @return {boolean} whether or not this' string strictly equals the
        string representation of `comparable`.
     */
    equals: function (input, comparable) {
      return toString(input) === String(comparable);
    },

    /**
      @method iequals
      @param {string} [comparable="undefined"] string to compare to
      @return {boolean} whether or not this' string strictly equals the
        string representation of `comparable` ignoring case.
     */
    iequals: function (input, comparable) {
      return toString(input).toLowerCase() === String(comparable).toLowerCase();
    },

    /**
      @method isEmpty
      @return {boolean} whether or not this' string has length `0`.
     */
    isEmpty: function (input) {
      return !toString(input);
    },

    /**
      @method isBlank
      @return {boolean} whether or not this' string is empty or consists of
        whitespace, line terminators and/or Zs only.
     */
    isBlank: function (input) {
      input = toString(input);
      return !input || !reNoWs.test(input);
    },

    /**
      @method isFloat
      @return {boolean} whether or not this' string matches the floating point
        number format from the beginning __until the end__ in contrast to
        native _parseFloat_. note that it won't throw if the actual number
        exceeds JavaScript's float range.
     */
    isFloat: function (input) {
      return reIsFloat.test(toString(input));
    },

    /**
      delegates to {{#crossLink "Stryng/trim:method"}}{{/crossLink}} and 
      replaces groups of whitespace, line terminators and/or Zs by a single space character.

      @method  clean
      @chainable
      @return {Stryng}
     */
    clean: function (input) {
      return Stryng.trim(input).replace(reWss, ' ');
    },

    /**
      upper-cases this' string's first character.

      @method capitalize
      @chainable
      @return {Stryng}
     */
    capitalize: function (input) {
      input = toString(input);
      return !input ? input : input.charAt(0).toUpperCase() + input.substring(1);
    },

    /**
      transforms this' string into camel-case by

      - removing all occurences of space, underscore and hyphen
      - upper-casing the first letter directly following the above

      inspired by [emberjs](http://emberjs.com/api/classes/Ember.String.html#method_camelize)
      note that this leaves the very first letter untouched.
      for a _classified_ output compose this method with 
      {{#crossLink "Stryng/capitalize:method"}}{{/crossLink}}.

      @method  camelize
      @chainable
      @return {Stryng}
     */
    camelize: function (input) {
      return toString(input).replace(reLowBoundary, cbLowBoundary);
    },

    /**
      transforms this' string into an underscored form by

      - inserting `_` where upper-cased letters follow lower-cased ones
      - replacing space and hyphen by `_`
      - lower-casing the final output

      inspired by [emberjs](http://emberjs.com/api/classes/Ember.String.html#method_underscore)

      @method  underscore
      @chainable
      @return {Stryng}
     */
    underscore: function (input) {
      return toString(input)
        .replace(reCaseSwitch, '$1_$2')
        .replace(reSpaceHyphen, '_')
        .toLowerCase();
    },

    /**
      transforms this' string into an underscored form by

      - inserting `-` where upper-cased letters follow lower-cased ones
      - replacing space and underscore by `-`
      - lower casing the final output.

      note that this method has nothing to do with _hyphenation_ which would
      be too serious an algorithm to fit into this library.
      inspired by [emberjs](http://emberjs.com/api/classes/Ember.String.html#method_dasherize)

      @method  hyphenize
      @chainable
      @return {Stryng}
     */
    hyphenize: function (input) {
      return toString(input)
        .replace(reCaseSwitch, '$1-$2')
        .replace(reSpaceUnderscore, '-')
        .toLowerCase();
    },

    /**
      replaces ligatures and diacritics from the Latin-1 Supplement
      with their nearest ASCII equivalent.
      compose this method with [Stryng#hyphenize](#hyphenize) to produce URL slugs

      @method  simplify
      @chainable
      @return {Stryng} [description]
      @todo replace symbols otherwise being percent-escaped
     */
    simplify: function (input) {
      return toString(input).replace(reLatin1, cbLatin1);
    },

    /**
      maps every character of this' string to its ordinal representation.

      @method ord
      @return {Array} array of character codes
     */
    ord: function (input) {
      input = toString(input);

      var i = input.length,
        result = new Array(i);

      while (i--) result[i] = input.charCodeAt(i);
      return result;
    },

    /**
      escapes all special characters that have meaning to JavaScript regexp parser.
      taken from [mdn](https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions)

      @method escapeRegex
      @chainable
      @return {Stryng}
     */
    escapeRegex: function (input) {
      return toString(input).replace(reRegex, cbRegex);
    },

    /**
      convenience wrapper for native `RegExp` constructor.

      @method  toRegex
      @param  {string} flags
      @return {RegExp}
     */
    toRegex: function (input, flags) {
      return new RegExp(toString(input), flags);
    }
  };

  // static functions
  // ----------------

  /**
    returns whether or not `value` is an instance of Stryng.
    beware of Stryng classes hosted by other HTML frames inside
    browser windows. this method won't recognize Stryngs
    created with foreign Stryng constructors.
    
    @method isStryng
    @static
    @param {any} value
    @return {boolean}
   */
  Stryng.isStryng = function (value) {
    return (value instanceof Stryng);
  };

  /**
    generates a string of `n` random characters in char-code range `[from, to)`.
    this range defaults to the ASCII printables. to choose randomly from the whole
    UTF-16 table call `Stryng.random(n, 0, 1>>16)`.
    
    @method random
    @static
    @param {number} [n=0]
    @param {number} [from=32] inclusively
    @param {number} [to=127] exclusively
    @return {string}
    @throws if `n` is negative or not finite or `to` exceeds `Math.pow(2, 16)`
   */
  Stryng.random = function (n, from, to) {
    n = +n || 0;
    if (n < 0 || n == INFINITY) exit();
    n = mathFloor(n);
    from = from === void 0 ? 32 : (from >>> 0);
    to = to === void 0 ? 127 : (to >>> 0);
    if (to > MAX_CHARCODE) exit();

    var result = '',
      difference = to - from;

    if (difference > 0) {
      while (n--) {
        result += stringFromCharCode(from + mathFloor(mathRandom() * difference));
      }
    }
    return result;
  };

  /**
    delegates to native `String.fromCharCode`.
    returns the concatenated string representations of the given
    `charCode`s from the UTF-16 table. return the empty string if no arguments passed.
    
    @method chr
    @static
    @param {Array} [charCodes=[]]
    @return {string}
    @throws if any `charCode` exceeds `Math.pow(2, 16) - 1`
   */
  Stryng.chr = function (charCodes_) {
    var charCodes = charCodes_ || [],
        i = charCodes.length;

    while (i--)
      if (charCodes[i] > MAX_CHARCODE)
        exit('charCode ' + charCodes[i] + ' out of range');

    return stringFromCharCode.apply(null, charCodes); // implies parsing `charCodes`
  };

  Stryng.fromCharCode = stringFromCharCode;
  Stryng.fromCodePoint = String.fromCodePoint;

  // building Stryng
  // ===============

  // decides upon the type of `result` and whether the Stryng instance
  // is mutable what to return.
  // - if `result` isn't a string at all, simply return it
  // - if the instance `_isMutable`, assign `result` to `_value` and return `this`
  //   - eventually reset `length` property if `Object.defineProperty` is not available
  // - if not, return a new Stryng instance constructed from `result`
  // 
  function recycle(stryng, result) {
    if (typeof result === 'string') {
      if (stryng.isMutable) {
        stryng.__value__ = result;
        if (!objectDefineProperty) {
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
  //   
  _arrayForEach.call(objectKeys(stryngFunctions), function(fnName){

    var fn = stryngFunctions[fnName];

    Stryng[fnName] = fn;

    Stryng[STR_PROTOTYPE][fnName] = function (a, b, c) {
      var argc = arguments.length,
          instance = this,
          value = instance.__value__;

      // avoid unoptimizable `.apply(null, arguments)`
      return recycle(instance,
        !argc      ? fn(value) :
        argc === 1 ? fn(value, a) :
        argc === 2 ? fn(value, a, b) :
                     fn(value, a, b, c)
      );
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
  // 
  _arrayForEach.call(methods, function (fnName) {

    if (isFunction(VERSION[fnName]) && !_arrayContains.call(overrides, fnName)) {

      Stryng[fnName] = hasStaticNatives && String[fnName] || function (input, a, b, c) {
        var value = toString(input),
            argc = arguments.length;

        console.log('called ', fnName, ' with args ', JSON.stringify([input, a, b, c]));

        // avoid unoptimizable `.apply(null, arguments)`
        return (
          !argc      ? value[fnName]() :
          argc === 1 ? value[fnName](a) :
          argc === 2 ? value[fnName](a, b) :
                       value[fnName](a, b, c)
        );
      };

      Stryng[STR_PROTOTYPE][fnName] = function (a, b, c) {
        var argc = arguments.length,
            instance = this,
            value = instance.__value__;

        // avoid unoptimizable `.apply(null, arguments)`
        return recycle(instance,
          !argc      ? value[fnName]() :
          argc === 1 ? value[fnName](a) :
          argc === 2 ? value[fnName](a, b) :
                       value[fnName](a, b, c)
        );
      };
    }
  });

  // export
  // ------
  // - cjs
  // - amd - anonymous
  // - browser - opt to rename

  if (typeof module !== STR_UNDEFINED && module.exports) {
    module.exports = Stryng;
  } else if (typeof define === STR_FUNCTION && define.amd) {
    /* global define*/
    define(function () {
      return Stryng;
    });
  } else {

    /**
      restores the previous value assigned to `window.Stryng`
      and returns the inner reference Stryng holds to itself.
      
      @method noConflict
      @static
      @return {Stryng} main class, not an instance
     */
    var previousStryng = root.Stryng;
    Stryng.noConflict = function () {
      root.Stryng = previousStryng;
      return Stryng;
    };

    root.Stryng = Stryng;
  }

}(this));
