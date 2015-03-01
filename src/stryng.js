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

  var CONSTANTS = {

    /**
      Stryng's version. __value:__ `0.1.12`
      
      @property VERSION
      @for  Stryng
      @final
      @readOnly
      @type {string}
     */
    VERSION: '0.1.12',

    /**
      max. unsigned 32-bit integer. __value:__
      - `Math.pow(2, 32) - 1`
      - `-1 >>> 0`
      - 4,294,967,295

      @property MAX_UINT
      @for Stryng
      @final
      @readOnly
      @type {number}
     */
    MAX_UINT: -1 >>> 0
  },
    
  /**
    max. string size. __value:__
    - `Math.pow(2, 28) - 1`
    - `-1 >>> 4`
    - 268,435,455
    - 256 MiB - 1 byte

    @property MAX_STRING_SIZE
    @for Stryng
    @final
    @readOnly
    @type {number}
   */
  MAX_STRING_SIZE = CONSTANTS.MAX_STRING_SIZE = -1 >>> 4,
    
  /**
    max. UTF-16 character code. __value:__
    - `Math.pow(2, 16) - 1`
    - `-1 >>> 16`
    - 65,535

    @property MAX_CHARCODE
    @for Stryng
    @final
    @readOnly
    @type {number}
   */
  MAX_CHARCODE = CONSTANTS.MAX_CHARCODE = -1 >>> 16,

  /**
    punctuation symbols from the ASCII charset. __value:__ <code>!"#$%&'()*+,-./:;<=>?@[\\]^`{|}~</code>

    @property PUNCTUATION
    @for Stryng
    @final
    @readOnly
    @type {string}
   */
  PUNCTUATION = CONSTANTS.PUNCTUATION = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',

  INFINITY = 1 / 0,
  STR_FUNCTION = 'function',
  STR_PROTOTYPE = 'prototype',
  STR_UNDEFINED = 'undefined',
  STR_CONSTRUCTOR = 'constructor',
  STR_OBJECT_ARRAY = '[object Array]',
  STR_OBJECT_REGEXP = '[object RegExp]',

  Object = CONSTANTS[STR_CONSTRUCTOR],

  // string inheritance
  // ------------------
  String = STR_UNDEFINED[STR_CONSTRUCTOR],
  
  STR_NATIVE_FN_BODY = String(String).replace(/^[^{]+/, ''),

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

  Array = overrides[STR_CONSTRUCTOR],

  // method shortcuts
  // ----------------
  // instance method names start with an underscore followed by their prototype.
  // static function names start with their parent namespace.
  // shims are for internal use only.

  _arrayPush = methods.push,
  _objectToString = CONSTANTS.toString,
  _functionToString = _objectToString.toString,

  _arrayForEach = returnNativeFunction(methods.forEach) || function (fn) {
    var array = this,
        len = array.length,
        i = -1;

    while (++i < len) if (fn(array[i], i, array) === false) break;
  },

  _arrayIndexOf = returnNativeFunction(methods.indexOf) || function (item) {
    var i = -1;

    _arrayForEach.call(this, function (item_, i_) {
      if (item === item_) return (i = i_), false;
    });

    return i;
  },

  _arrayContains = returnNativeFunction(methods.contains) || function (item) {
    return _arrayIndexOf.call(this, item) !== -1;
  },

  Math_ = Math,
  mathMax = Math_.max,
  mathMin = Math_.min,
  mathFloor = Math_.floor,
  mathRandom = Math_.random,

  stringFromCharCode = String.fromCharCode,

  jsonStringify = (
    typeof JSON !== STR_UNDEFINED &&
    returnNativeFunction(JSON.stringify)
  ),

  isArray = returnNativeFunction(Array.isArray) || function (any) {
    return _objectToString.call(any) == STR_OBJECT_ARRAY;
  },

  // fully [spec](http://www.ecma-international.org/ecma-262/5.1/#sec-9.4)
  // compliant implementation of `Number.toInteger`,
  // tested and benchmarked at [jsperf](http://jsperf.com/to-integer/11).
  // 
  numberToInteger = returnNativeFunction(Number.toInteger) || function (n) {
    return (n = +n) ? isFinite(n) ? n - (n%1) : n : 0;
  },

  // ignore the [dont-enum bug](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys).
  // further assume that the `object` has `hasOwnProperty` on its prototype chain.
  // 
  objectKeys = returnNativeFunction(Object.keys) || function (object) {
    var keys = [],
        i = 0;

    for (var key in object) { // `key` is required to be purely local
      if (object.hasOwnProperty(key)){
        keys[i++] = key;
      }
    }

    return keys;
  },

  objectDefineProperty = returnNativeFunction(Object.defineProperty),

  // regular expressions
  // -------------------

  // ### util
  reRegex = /([.,*+-?^=!:${}()|\[\]\/\\])/g,
  cbRegex = '\\$1',

  reIsFloat = /^\d+(?:\.\d*)?(?:[eE][\-\+]?\d+)?$/,

  RegExp = reIsFloat[STR_CONSTRUCTOR],

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
        hexCharCodes = (
          '0009,' + // tab
          '000A,' + // line feed
          '000B,' + // vertical tab
          '000C,' + // form feed
          '000D,' + // carriage return
          '0020,' + // space
          '1680,180E,2000,2001,2002,' +
          '2003,2004,2005,2006,2007,' +
          '2008,2009,200A,202F,205F,' +
          '3000,' + // Zs
          '00A0,' + // nbsp
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

      reWss = new RegExp(reWssSource, 'g');
      reNoWs = new RegExp('[^' + reWsSource + ']');
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
  if (!returnNativeFunction(STR_UNDEFINED.startsWith) ||
      !STR_UNDEFINED.startsWith('n', 1)) {
    overrides.push('startsWith', 'endsWith');
  }

  // check if the native implementation of `String#substr`
  // correctly deals with negative indices.
  // 
  if (STR_UNDEFINED.substr(-1) !== 'd') {
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

  function returnNativeFunction (fn) {
    if (!fn) return false;
    
    // cannot assign native endsWith's integrity yet
    var str = _functionToString.call(fn),
        li = str.lastIndexOf(STR_NATIVE_FN_BODY),
        endsWith = li === str.length - STR_NATIVE_FN_BODY.length;

    return isFunction(fn) && endsWith && fn;
  }

  // constructor
  // -----------

  /**
    utility class for manipulating strings in JavaScript. the built-in functions
    are neither sufficient nor consistent due to the language's minimalistic nature
    and browser incompatibilities. `Stryng` extends the set of native prototype
    and static functions. in addition, __each prototype method is ported to a
    static version and vice versa__. whichever paradigm you prefer, whether you
    hold state in closures or objects, chain methods or compose them,
    `Stryng` has you covered. constraints are highlighted in these docs.
    ```javascript
    Stryng('cellar').append('door'); // `new` is optional in case you lint
    Stryng.append('cellar', 'door');
    ```
    static functions are faster because they are implemented this way (unless
    adapted from native `String.prototype`) and don't need the extra `new`
    operation which allocates memory, sets `this` and chains prototypes `(Object > Stryng)`.
    
    migration path
    --------------
    using `Stryng` as a replacement for the native class works. however,
    when using objects instead of primitives beware [JavaScript's type
    casting mechanisms][1].

    always use `.equals(other)` instead of `==` or `===`. `[<, <=, >=, >]` are safe.
    ```javascript
    var fox = Stryng('fox');
    fox.equals('fox');              // > true
    fox.equals(new String('fox'));  // > true
    fox.iequals(new Stryng('FOX')); // > true
    ```

    always use `.isEmpty()` instead of `!stryng`.
    ```javascript
    var empty = Stryng('');
    empty.isEmpty(); // > true
    !empty;          // > false
    ```

    type detection:
    ```javascript
    typeof stryng;              // > 'object'
    ({}).toString.call(stryng); // > '[object Object]'
    stryng instanceof Stryng;   // > true, beware iframes
    Stryng.isStryng(stryng);    // > true, wraps the above,
    ```

    apart from the above mentioned cases you may use `Stryng` instances as if they
    were primitives. the reason is that JavaScript's inner workings request
    the `Stryng` instance's _DefaultValue_ whenever it is passed to a native
    function or operator. this value is retrieved by calling `Stryng.prototype.valueOf`
    or `Stryng.prototype.toString` (in that order) which both reliably return the
    instance's wrapped primitive.
    ```javascript
    +Stryng('123');                     // > 123
    Stryng('cellar') + 'door';          // > 'cellardoor'
    ({'key': 'value'})[Stryng('key')];  // > 'value'
    parseFloat(Stryng('1.2e-3suffix')); // > 0.0012

    var param = Stryng('%C3%A9cole');
    decodeURIComponent(param);     // > 'école'
    console.log(param.simplify()); // > 'ecole'
    ```
    [1]: http://www.ecma-international.org/ecma-262/5.1/#sec-8.12.8

    @class Stryng
    @constructor
    @param {string} string
    @param {boolean} [isMutable=false]
      whether the created instance should be mutable or
      create a new instance from the result of every chainable method call
    @return {Stryng}
    @throws if `string` is either `null` or `undefined`
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

  (function () {
    // wrap try-catch clauses for optimizability of outer scope

    try {
      objectDefineProperty(Stryng[STR_PROTOTYPE], 'length', {
        get: function () { return this.__value__.length; },
        set: function () {} // provide noop setter for Safari 5/5.1
      });
    } catch (e) {
      // pass, see functions `Stryng.prototype.const` and `recycle`
    }
  }());

  // constants
  // ---------
  // if `Object.defineProperty` is not available we simply set attributes.

  _arrayForEach.call(objectKeys(CONSTANTS), function (key) {
    try {
      objectDefineProperty(Stryng, key, {
        writable: false,
        value: CONSTANTS[key]
      });
    } catch (e) {
      Stryng[key] = CONSTANTS[key];
    }
  });

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
    @example
        var mutable = Stryng(' padded ', true);

        // same as Stryng(mutable.toString(), false)
        var immutable  = stryng.clone(false); 

        // .trim() changes the value but returns the same reference
        mutable.equals(mutable.trim()); // > true

        // .trim() returns new instance with the changed value
        immutable.equals(immutable.trim()); // > false

   */
  Stryng[STR_PROTOTYPE].clone = function (isMutable) {
    return new Stryng(this.__value__, isMutable);
  };

  // seemlessness
  // ------------

  /**
    getter for this instance' wrapped string primitive.
    this method is only available on `Stryng.prototype`.
    __alias:__ `valueOf`.
    
    @method toString
    @return {string}
    @example
        var fox = Stryng('fox').toString(); // same as .valueOf()
        typeof fox; // > 'string'
   */
  Stryng[STR_PROTOTYPE].valueOf = Stryng[STR_PROTOTYPE].toString = function () {
    return this.__value__; // we can rest assured that this is a primitive
  };

  /**
    returns the string representation of the expression
    used to construct this instance. this method is only available on `Stryng.prototype`.
    
    @method  toSource
    @return {string} eval-string-expression
    @example
        Stryng('fox').toSource(); // > '(new Stryng("fox", false))'

   */
  Stryng[STR_PROTOTYPE].toSource = function () { 
    return '(new Stryng("' + this.__value__ + '", ' + this.isMutable + '))';
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
      @example
          Stryng(' padded ').trim();          // > 'padded'
          Stryng.trim('\tindented line\r\n'); // > 'indented line'
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
      @example
          Stryng(' padded ').trimLeft(); // > 'padded '
          Stryng.trimLeft('\tindent');   // > 'indent'
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
      @example
          Stryng(' padded ').trimRight(); // > ' padded'
          Stryng.trimRight('line\r\n');   // > 'line'
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
      @example
          Stryng('within').contains('thin');    // > true
          Stryng.contains('within', '', 10);    // > true, always
          Stryng.contains('within', 'thin', 4); // > false, `thin` starts at index 2
          Stryng.contains('undefined');         // > true, applied default
     */
    contains: function (input, search, position) {
      return toString(input).indexOf(search, position) !== -1;
    },

    /**
      returns whether or not this' string at index `position` begins with substring `search`.
      shim for native [String#startsWith](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.startswith)
      
      @method  startsWith
      @param {String} [search="undefined"]
      @param {number} [position=0]
      @return {boolean}
      @example
          Stryng('within').startsWith('with');     // > true
          Stryng.startsWith('within', 'thin', 2);  // > true
          Stryng.startsWith('within', 'with', -1); // > true, min-ed to zero
          Stryng.startsWith('within', ''    , 10); // > true, max-ed to length
          Stryng.startsWith('undefined value');    // > true, apply default
     */
    startsWith: function (input, search, position) {
      input = toString(input);
      if (isRegExp(search)) exit('no regex support for startsWith');
      return input.indexOf(search, position) === mathMin(
        input.length, mathMax(0, numberToInteger(position)));
    },

    /**
      returns whether or not this' string truncated at `endPosition` ends with substring `search`.
      shim for native [String#endsWith](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.endswith)
      
      @method  endsWith
      @param {String} [search="undefined"]
      @param {number} [position=input.length]
      @return {boolean}
      @throws if `search` is a regular expression.
      @example
          Stryng('within').endsWith('thin');     // > true
          Stryng.endsWith('within', 'with', 4);  // > true
          Stryng.endsWith('within', 'thin', 10); // > true, max-ed to length
          Stryng.endsWith('this is undefined');  // > true, apply default

          // if truncated at [0] only the empty string yields true
          Stryng.endsWith('within', '', -1);     // > true, min-ed to zero
     */
    endsWith: function (input, search, position) {
      input = toString(input);
      if (isRegExp(search)) exit('no regex support for endsWith');
      var len = input.length,
          idx = input.lastIndexOf(search, position);

      return idx !== -1 && idx+String(search).length === (
        position === void 0 ? len : mathMin(len, mathMax(0, numberToInteger(position)))
      );
    },

    /**
      concatenates this' string `n` times to the empty string.
      shim for native [String#repeat](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.repeat).
      reduction of concat operations inspired by [mout/string/repeat](https://github.com/mout/mout/blob/v0.9.0/src/string/repeat.js)
      
      @method  repeat
      @chainable
      @param {number} [n=0] range constraint:
        `0 <= (n * this.length) <= {{#crossLink "Stryng/MAX_STRING_SIZE:property"}}{{/crossLink}}`
      @return {Stryng}
      @throws if `n` is out of range
      @example
          Stryng('-').repeat(5);        // > '-----'
          Stryng.repeat('' , 5);        // > ''
          Stryng.repeat('-', -1);       // throws, out of range
          Stryng.repeat('-', Infinity); // throws

          // don't try to allocate 256 MiB
          Stryng.repeat('-' , Math.pow(2, 28)-1); // works, don't try this
          Stryng.repeat('1' , Math.pow(2, 28)  ); // throws, out of range
          Stryng.repeat('22', Math.pow(2, 27)  ); // throws, too

     */
    repeat: function (input, n) {
      input = toString(input);
      n = numberToInteger(n);

      if (0 > n || n*input.length > MAX_STRING_SIZE || n == INFINITY) exit();

      var result = '';
      if (!input) return result;

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
      @param {number} [length=this.length-position] this' string's length minus `position`
      @return {Stryng}
     */
    substr: function (input, position, length) {
      input = toString(input);
      position = numberToInteger(position);
      if (position < 0) position += input.length;
      return input.substr(position, length);
    },

    /**
      prepends and appends `outfix` to `input` in one go.
      to do the opposite use {{#crossLink "Stryng/strip:method"}}{{/crossLink}}
      
      @method  wrap
      @chainable
      @param {string} outfix
        prefix and suffix
      @param {number} [n=0] no. operations. range constraint:
        `0 <= n <= {{#crossLink "Stryng/MAX_STRING_SIZE:property"}}{{/crossLink}}`
      @return {Stryng}
      @throws if `n` is out of range
      @example
          Stryng('python doc string').wrap('"', 3); // > '"""python doc string"""'
     */
    wrap: function (input, outfix, n) {
      input = toString(input);
      outfix = Stryng.repeat(outfix, n);
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
      if (braces.length !== 2) exit();
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

      __note:__ duplicate entries within `searches` won't be removed prior to
      counting and thereby impact performance but don't change the result.

      @method  countMultiple
      @param {Array} searches
        array of substrings to search for
      @return {Object}

      @example
      if multiple keys in `searches` match `input` at the same index the first
      one encountered in the array will take the credit. for this reason you
      might want to sort your `searches` by length in descending order prior to
      passing them in.
          var text       = Stryng('abc abc abc'),
              searches   = ['a', 'ab', 'abc'];
              sortedDesc = ['abc', 'ab', 'a'];
              
          text.countMultiple(searches);   // {a: 3}
          text.countMultiple(sortedDesc); // {abc: 3}

      @example
      if you don't want this behavior use {{#crossLink "Stryng/count:method"}}
      {{/crossLink}} for each search instead.
          var result = {};
          searches.forEach(function (search) {
            result[search] = text.count(search);
          });
          result; // {a: 3, ab: 3, abc: 3}

     */
    countMultiple: function (input, keys_){
      input = toString(input);
      if (!isArray(keys_)) exit('expected type: array');
      if (!keys_.length) return {};

      var keys = keys_.slice(),
          key,
          hasEmpty = _arrayContains.call(keys, ''),
          len = keys.length,
          i = -1,
          indices = new Array(len),
          offset = 0,
          index,
          minIndex,
          result = {};
      
      while (++i < len) result[keys[i]] = 0;
        
      while (len) {
        for (i = 0; i < len;){
          if (indices[i] >= offset){ i++; continue; }
          key = keys[i];
          index = input.indexOf(key, offset);
          
          if (!key || index === -1){
            keys.splice(i, 1);
            indices.splice(i, 1);
            len--;
          } else {
            indices[i++] = index;
          }
        }
        
        minIndex = mathMin.apply(null, indices);
        if (minIndex !== INFINITY){ 
          key = keys[indices.indexOf(minIndex)];
          result[key]++;
          offset = minIndex + key.length;
        }
      }

      if (hasEmpty) result[''] = input.length + 1;
      
      return result;
    },

    /**
      delegates to native `Arrray#join`. returns the empty string if no arguments passed.

      @method  delimit
      @param {Array} joinees
        array of substrings to concatenate
      @return {Stryng}
     */
    delimit: function (delimiter, joinees) {
      if (delimiter == null) exit();
      if (!isArray(joinees)) exit('expected type: array');
      return joinees.join(delimiter); // implies parsing `delimiter`
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
      position = numberToInteger(position);
      // slice applies different defaults for its 1st and 2nd argument.
      return input.slice(0, position) + insertion + input.slice(position);
    },

    /**
      splits this' string at the given `indices`. if the resulting substrings
      overlap, the first/left one encountered dominates, the latter/right is
      truncated by the overlapping characters.

      @method  splitAt
      @param {Array} indices
        indices to split at. negatives allowed.
      @return {Array} array of substrings
     */
    splitAt: function (input, indices) {
      input = toString(input);
      if (!isArray(indices)) exit('expected type: array');

      var inputLen = input.length,
          pendingIndex = 0, index = 0,
          result = [], r = 0,
          len = indices.length, i = -1;

      while (++i < len) {
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
      @param {string|RegExp} [delimiter="undefined"]
      @param {number} [n=MAX_UINT] max. no. split operations.
      @return {Array} array of substrings
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
        result = input.split(delimiter); // implies parsing
        difference = result.length - n;
        if (difference > 0) result.push(result.splice(n, difference).join(delimiter));
      }
      return result;
    },

    /**
      the right-associative version of {{#crossLink "Stryng/splitLeft:method"}}
      {{/crossLink}}. splits this' string `n` times by the given `delimiter`.
      the preceding part after the `n`th occurence of `delimiter` -
      counting backwards - is included in the returned array.
     
      @method  splitRight
      @param {string} [delimiter="undefined"]
      @param {number} [n=MAX_UINT] max. no. split operations.
      @return {Array} array of substrings
      @throws if `delimiter` is a regular expression
     */
    splitRight: function (input, delimiter, n) {
      input = toString(input);
      if (isRegExp(delimiter)) exit('no regex support');
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
      @return {Array} array of substrings
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
      return Stryng.exchangeRight(input, replacee, replacement);
    },

    /**
      substitues the first `n` non-overlapping occurrences of
      `replacee` with `replacement`.

      @method  exchangeLeft
      @chainable
      @param {string} [replacee="undefined"] string to be replaced
      @param {string} [replacement="undefined"]
      @param {number} [n=MAX_UINT] max. no. replacement operations.
      @return {Stryng}
     */
    exchangeLeft: function (input, replacee, replacement, n) {
      input = toString(input);
      return String(replacee) == replacement ? input :
        Stryng.splitLeft(input, replacee, n).join(replacement);
    },

    /**
      substitues the last `n` non-overlapping occurrences of
      `replacee` with `replacement`.

      @method  exchangeRight
      @chainable
      @param {string} [replacee="undefined"] string to be replaced
      @param {string} [replacement="undefined"]
      @param {number} [n=MAX_UINT] max. no. replacement operations.
      @return {Stryng}
     */
    exchangeRight: function (input, replacee, replacement, n) {
      input = toString(input);
      return String(replacee) == replacement ? input :
        Stryng.splitRight(input, replacee, n).join(replacement);
    },

    /**
      both appends and prepends `padding` to this' string as often as needed
      to reach but not exceed a length of `maxLength`. passing a `maxLength`
      lesser than this' string's length has no effect. it is never truncated.

      @method just
      @chainable
      @param {number} [maxLength=0] range constraint:
        `0 <= maxLength <= {{#crossLink "Stryng/MAX_STRING_SIZE:property"}}{{/crossLink}}`
      @param {string} [padding=" "]
      @return {Stryng}
      @throws if `maxLength` is out of range
     */
    just: function (input, maxLength, padding) {
      input = toString(input);
      maxLength = numberToInteger(maxLength);
      if (0 > maxLength || maxLength > MAX_STRING_SIZE) exit();
      padding = padding === void 0 ? ' ' : String(padding);

      var inputLen = input.length,
          paddingLen = padding.length * 2; // safe, `<< 1` converts to 32-Bit Integer

      if (maxLength <= inputLen) return input;
      while (input.length + paddingLen <= maxLength) input = padding + input + padding;
      return input;
    },

    /**
      prepends `padding` to this' string as often as needed to reach but not
      exceed `length`. passing a `length` lesser than this' string's length
      has no effect. it is never truncated.

      @method  justLeft
      @chainable
      @param {number} [length=0] range constraint:
        `0 <= length <= {{#crossLink "Stryng/MAX_STRING_SIZE:property"}}{{/crossLink}}`
      @param {string} [padding=" "]
      @return {Stryng}
      @throws if `length` is out of range
     */
    justLeft: function (input, length, padding) {
      input = toString(input);
      length = numberToInteger(length);
      if (0 > length || length > MAX_STRING_SIZE) exit();
      padding = padding === void 0 ? ' ' : String(padding);

      var inputLen = input.length,
          paddingLen = padding.length;

      if (length <= inputLen || !padding) return input;
      while (input.length + paddingLen <= length) input = padding + input;
      return input;
    },

    /**
      appends `padding` to this' string as often as needed to reach but not
      exceed `length`. passing a `length` lesser than this' string's length
      has no effect. it is never truncated.

      @method  justRight
      @chainable
      @param {number} [length=0] range constraint:
        `0 <= length <= {{#crossLink "Stryng/MAX_STRING_SIZE:property"}}{{/crossLink}}`
      @param {string} [padding=" "]
      @return {Stryng}
      @throws if `length` is out of range
     */
    justRight: function (input, length, padding) {
      input = toString(input);
      length = numberToInteger(length);
      if (0 > length || length > MAX_STRING_SIZE) exit();
      padding = padding === void 0 ? ' ' : String(padding);

      var inputLen = input.length,
          paddingLen = padding.length;

      if (length <= inputLen || !padding) return input;
      while (input.length + paddingLen <= length) input += padding;
      return input;
    },

    /**
      the composition of {{#crossLink "Stryng/stripLeft:method"}}{{/crossLink}}
      and {{#crossLink "Stryng/stripRight:method"}}{{/crossLink}}.
      removes `outfix` max. `n` times from the both ends of this' string.
      note that the actual removal counts may differ.

      @method  strip
      @chainable
      @param {string} [outfix="undefined"] string to remove
      @param {number} [n=MAX_UINT] max. no. removals
      @return {Stryng}

     */
    strip: function (input, outfix, n) {
      return Stryng.stripRight(
             Stryng.stripLeft(input, outfix, n), outfix, n);
    },

    /**
      removes `prefix` `n` times from the beginning of this' string.

      @method  stripLeft
      @chainable
      @param {string} [prefix="undefined"] string to remove
      @param {number} [n=MAX_UINT] max. no. removals
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
      the right-associative version of {{#crossLink "Stryng/stripLeft:method"}}
      {{/crossLink}}. removes `suffix` `n` times from the end of this' string.

      @method stripRight
      @chainable
      @param {string} [suffix="undefined"] string to remove
      @param {number} [n=MAX_UINT] max. no. removals
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
      slices this' string to exactly fit the given `maxLength`
      while including the `ellipsis` at its end (enforced). this implementation
      has no knowledge of word boundaries. TODO: search word boundary and trimRight

      @method  truncate
      @chainable
      @param {number} [maxLength=42] length of the result. range constraint:
        `0 <= maxLength`
      @param {string} [ellipsis="..."]
      @return {Stryng}
      @throws if `maxLength` is out of range
     */
    truncate: function (input, maxLength, ellipsis) {
      input = toString(input);
      if (maxLength === void 0) maxLength = 42;
      else {
        maxLength = numberToInteger(maxLength);
        if (0 > maxLength) exit();
        if (!maxLength) return '';
      }
      if (maxLength >= input.length) return input;
      ellipsis = ellipsis !== void 0 ? String(ellipsis) : '...';

      var ellipsisLen = ellipsis.length;

      if (ellipsisLen >= maxLength) return ellipsis.slice(-maxLength);
      return input.substring(0, maxLength - ellipsisLen) + ellipsis;
    },

    /**
      this can be interpreted as a shallow version of the native `JSON#stringify`.
      shim for non-standard [String#quote](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/quote).
      backslash-escapes all occurences of `", \, \b, \t, \v, \n, \f, \r`,
      hex-encodes any non-ASCII-printable character and wraps the result
      in (unescaped) double quotes. see {{#crossLink "Stryng/unquote:method"}}
      {{/crossLink}} for the inverse operation.

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
      unescapes all occurences of backslash-escaped
      characters `", \, \b, \t, \v, \n, \f, \r`, decodes all hex-encoded 
      characters and removes surrounding double quotes once without using `eval`.
      see {{#crossLink "Stryng/quote:method"}}{{/crossLink}} for the inverse
      operation.

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
      @example
          Stryng('cellar').append('door');       // > 'cellardoor'
          Stryng.append('within', 'thin');       // > 'withinthin', duplicate suffix
          Stryng.append('within', 'thin', true); // > 'within', pre-checks if endsWith
          Stryng.append('this is ');             // > 'this is undefined', applied default
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
      @example
          Stryng('door').prepend('cellar');       // > 'cellardoor'
          Stryng.prepend('within', 'with');       // > 'withwithin', duplicate prefix
          Stryng.prepend('within', 'thin', true); // > 'within', pre-checks if startsWith
          Stryng.prepend('efinitely');            // > 'undefinedefinitely', applied default
     */
    prepend: function (input, head, once) {
      input = toString(input);
      if (once && Stryng.startsWith(input, head)) return input;
      return head + input;
    },

    /**
      always use this method instead of the double- or triple-equality-operator
      if you want to compare the contents, not the heap address (of objects in
      general that implement the method).
      @method  equals
      @param {string} [comparable="undefined"] string to compare to
      @return {boolean} whether or not this' string strictly equals the
        string representation of `comparable`.
      @example
          Stryng('fox').equals('fox');             // > true
          Stryng.equals('fox', 'fox');             // > true
          Stryng.equals('fox', new String('fox')); // > true
          Stryng.equals('fox', new Stryng('fox')); // > true
          Stryng.equals('fox', 'FOX');             // > false, case-sensitive
          Stryng.equals('undefined');              // > true, applies default
          
          'fox' == new String('fox');              // > true, type casting has hint string
          'fox' == new Stryng('fox');              // > true

          'fox' === new String('fox');             // > false, no casting applied
          'fox' === new Stryng('fox');             // > false
          
          new String('fox') == new Stryng('fox');  // > false, no hint for casting
          new String('fox') === new Stryng('fox'); // > false, different instances
          // same goes for all other combinations of String and Stryng

     */
    equals: function (input, comparable) {
      return toString(input) === String(comparable);
    },

    /**
      the case-insensitive version of {{#crossLink "Stryng/equals:method"}}
      {{/crossLink}}

      @method iequals
      @param {string} [comparable="undefined"] string to compare to
      @return {boolean} whether or not this' string strictly equals the
        string representation of `comparable` ignoring case.
      @example
          Stryng('fox').iequals('fox'); // > true
          Stryng.iequals('fox', 'FOX'); // > true
          Stryng.iequals('Undefined');  // > true, applies default
     */
    iequals: function (input, comparable) {
      return toString(input).toLowerCase() === String(comparable).toLowerCase();
    },

    /**
      @method isEmpty
      @return {boolean} whether or not this' string has length `0`.
      @example
          Stryng('').isEmpty();   // > true
          Stryng.isEmpty('\r\n'); // > false
          Styrng.isEmpty([]);     // > true, []+'' yiels ''
     */
    isEmpty: function (input) {
      return !toString(input);
    },

    /**
      @method isBlank
      @return {boolean} whether or not this' string is empty or consists of
        whitespace, line terminators and/or Zs only.
      @example
          Stryng('').isBlank();   // > true
          Stryng.isBlank(' ');    // > true
          Stryng.isBlank('\r\n'); // > true
          Stryng.isBlank('fox');  // > false
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
      @example
          Stryng('1').isFloat();      // > true
          Stryng.isFLoat('1.0');      // > true
          Stryng.isFLoat('1e3');      // > true
          Stryng.isFLoat('1e-2.3');   // > true

          Stryng.isFLoat('1e3-text'); // > false, although
          parseFloat('1e3-text');     // > 1000

          Stryng.isFloat('2e+309');   // > true, however
          Number.MAX_VALUE;           // > 1.7976931348623157e+308
          parseFloat('2e+309');       // > Infinity
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
      @example
          Stryng(' padded ').clean();    // > 'padded'
          Stryng.clean('-\t-\n-');       // > '- - -'
          Stryng.clean('line\r\nbreak'); // > 'line break'
     */
    clean: function (input) {
      return Stryng.trim(input).replace(reWss, ' ');
    },

    /**
      upper-cases this' string's first character.

      @method capitalize
      @chainable
      @return {Stryng}
      @example
          Stryng('fox').capitalize(); // > 'Fox'
          Stryng.capitalize('');      // > ''
          Stryng.capitalize('ä');     // > 'Ä', relies on toUpperCase
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
      transforms this' string into a hyphenized form by

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
      with their nearest ASCII equivalent. compose this method with
      {{#crossLink "Stryng/hyphenize:method"}}{{/crossLink}} to produce URL slugs.

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
      @return {Array} array of numeric character codes
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
    returns whether or not `value` is an instance of Stryng. note that this
    method won't recognize `Stryng` instances created with foreign `Stryng`
    constructors hosted by other HTML frames.
    
    @method isStryng
    @static
    @param {any} value
    @return {boolean}
    @example
        Stryng.isStryng(Stryng('fox'));     // > true
        Stryng.isStryng(new String('fox')); // > false
        Stryng.isStryng('fox');             // > false

        function yours(){}
        yours.prototype = new Stryng('');
        yours.prototype.constructor = yours;
        Stryng.isStryng(new yours());       // > true

        // by-passes constructor call - won't work
        var brokenInstance = Object.create(Stryng.prototype);
        Stryng.isStryng(brokenInstance);    // > true

        // assuming the iframe adheres to the same-domain-policy
        var foreinInstance = iframeElement.contentWindow.Stryng('fox');
        Stryng.isStryng(foreignInstance);   // > false
   */
  Stryng.isStryng = function (value) {
    return (value instanceof Stryng);
  };

  /**
    generates a string of `n` random characters in char-code range `[from, to)`.
    this range defaults to the ASCII printables. to choose randomly from the whole
    UTF-16 table call `Stryng.random(n, 0, -1 >>> 16)`.
    
    @method random
    @static
    @param {number} [n=0] range constraint:
      `0 <= n <= {{#crossLink "Stryng/MAX_STRING_SIZE:property"}}{{/crossLink}}`
    @param {number} [from=32] range constraint:
      `0 <= from <= {{#crossLink "Stryng/MAX_CHARCODE:property"}}{{/crossLink}}`
    @param {number} [to=127] range constraint:
      `from < to <= {{#crossLink "Stryng/MAX_CHARCODE:property"}}{{/crossLink}}`
    @return {string}
    @throws if `n`, `from` or `to` is out of range
   */
  Stryng.random = function (n, from, to) {
    n = numberToInteger(n);
    if (0 > n || n > MAX_STRING_SIZE) exit();
    from = from === void 0 ? 32  : (from >>> 0);
    to   = to   === void 0 ? 127 : (to   >>> 0);
    if (from >= to || to > MAX_CHARCODE) exit();

    var result = '',
        difference = to - from;

    if (difference > 0) {
      while (n--) result += stringFromCharCode(from + mathFloor(mathRandom() * difference));
    }
    return result;
  };

  /**
    delegates to native `String.fromCharCode`.
    returns the concatenated string representations of the given
    `charCode`s from the UTF-16 table. returns the empty string if no arguments passed.
    
    @method chr
    @static
    @param {Array} charCodes
      array of character codes in range
      `0 <= cc <= {{#crossLink "Stryng/MAX_CHARCODE:property"}}{{/crossLink}}`
    @return {string}
    @throws if `charCodes[i]` is out of range
   */
  Stryng.chr = function (charCodes) {
    if (!isArray(charCodes)) exit('expected type: array');
    for (var i = charCodes.length; i--;) {
      if (charCodes[i] > MAX_CHARCODE) {
        exit('charCode ' + charCodes[i] + ' out of range');
      }
    }

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
  _arrayForEach.call(objectKeys(stryngFunctions), function (fnName) {

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
  
  // whether or not to adapt native static functions
  var hasStaticNatives = (function () {
    // wrap try-catch clauses for optimizability of outer scope

    if (returnNativeFunction(String.slice)){
      try { String.slice(/* undefined */); } // expect to throw
      catch (e){ return true; }
    }
    return false;
  }());

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

    if (returnNativeFunction(STR_UNDEFINED[fnName]) &&
        !_arrayContains.call(overrides, fnName)) {

      Stryng[fnName] = (
        hasStaticNatives &&
        returnNativeFunction(String[fnName]) ||

        function (input, a, b, c) {
          var value = toString(input),
              argc = arguments.length;

          // avoid unoptimizable `.apply(null, arguments)`
          return (
            !argc      ? value[fnName]() :
            argc === 1 ? value[fnName](a) :
            argc === 2 ? value[fnName](a, b) :
                         value[fnName](a, b, c)
          );
        }
      );

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
