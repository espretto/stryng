/*!
 * stryngjs released under MIT licence
 * http://mariusrunge.com/mit-licence.html
 */

/**
 * @module  stryng
 */

(function (root) {
  'use strict';

  /* ---------------------------------------------------------------------------
   * constants
   */

  var CONSTANTS = {

    /**
      Stryng's version. __value:__ `0.2.4`
      
      @property VERSION
      @for  Stryng
      @final
      @readOnly
      @type {string}
     */
    VERSION: '0.2.4',

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
    punctuation symbols from the ASCII charset. __value:__
    <code>!"#$%&'()*+,-./:;<=>?@[\\]^`{|}~</code>

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

  /* ---------------------------------------------------------------------------
   * locals
   */
  
  // methods Stryng hopes to adapt
  methods = ('charAt,charCodeAt,codePointAt,concat,contains,' +
    'endsWith,indexOf,lastIndexOf,localeCompare,match,normalize,' +
    'replace,search,slice,split,startsWith,substr,substring,' +
    'toLocaleLowerCase,toLocaleUpperCase,toLowerCase,toUpperCase,' +
    'trim,trimLeft,trimRight').split(','),

  Array = methods[STR_CONSTRUCTOR],
  Object = CONSTANTS[STR_CONSTRUCTOR],
  Number = INFINITY[STR_CONSTRUCTOR],
  String = STR_UNDEFINED[STR_CONSTRUCTOR],
  
  // methods which's native implementations to override if necessary
  overrides = [],

  /* ---------------------------------------------------------------------------
   * instance method shortcuts
   *
   * instance method names start with an underscore followed by their prototype.
   * shims are for internal use only.
   */

  _arrayPush = overrides.push,
  _objectToString = CONSTANTS.toString,
  _functionToString = _objectToString.toString,

  _arrayForEach = returnNativeFunction(overrides.forEach) || function (fn) {
    var array = this,
        len = array.length,
        i = -1;

    while (++i < len) if (fn(array[i], i, array) === false) break;
  },

  _arrayContains = returnNativeFunction(overrides.contains) || function (item) {
    var array = this,
        len = array.length,
        i = -1;

    while (++i < len) if (array[i] === item) return true;
    return false;
  },

  /* ---------------------------------------------------------------------------
   * static function shortcuts
   *
   * static function names start with their parent namespace.
   * shims are for internal use only.
   */

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

  // fully [ES5](http://www.ecma-international.org/ecma-262/5.1/#sec-9.4)
  // compliant implementation of `Number.toInteger`,
  // tested and benchmarked at [jsperf](http://jsperf.com/to-integer/11).
  // 
  numberToInteger = returnNativeFunction(Number.toInteger) || function (n) {
    return (n = +n) ? isFinite(n) ? n - (n%1) : n : 0;
  },

  // ignore the [dont-enum bug][1]. further assume that the `object` has
  // `hasOwnProperty` on its prototype chain.
  // 
  // [1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
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

  /* ---------------------------------------------------------------------------
   * regular expressions
   */

  // prepare `Stryng.isFloat`
  reIsFloat = /^\d+(?:\.\d*)?(?:[eE][\-\+]?\d+)?$/,
  RegExp = reIsFloat[STR_CONSTRUCTOR],

  // prepare `Stryng.escapeRegex`
  reRegex = /([.,*+-?^=!:${}()|\[\]\/\\])/g,
  cbRegex = '\\$1',

  // prepare `Stryng.slugify`
  rePunct = RegExp('[' + PUNCTUATION.replace(reRegex, cbRegex) + ']', 'g'),

  // prepare `Stryng.quote`, `Styrng.unquote`
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
  reCtrl = RegExp('[\b\t\n\f\r\v"\\\\]', 'g'),
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

  // prepare `Stryng.underscore`, `Stryng.camelize`, `Stryng.hyphenize`
  reLowBoundary = /[ _-]([a-z]?)/g,
  cbLowBoundary = function (_, chr) {
    return chr ? chr.toUpperCase() : '';
  },
  reCaseSwitch = /([a-z])([A-Z])/g,
  reSpaceHyphen = /[ -]/g,
  reSpaceUnderscore = /[ _]/g,

  // prepare `Stryng.format`
  typeBaseMap = {
    b: 2,
    o: 8,
    x: 16,
    X: 16
  },

  reThousand = /(\d{3}(?=\d))/g,
  cbThousand = '$1,',

  reFormat = new RegExp('\\{' + [
    '(\\d\\d*|[\\$_a-zA-Z][\\$\\w]*)', // index or key
    ':',                            // seperator
    '(.[<>=^])',                    // fill-char and alignment
    '([\\+\\- ])',                  // sign
    '(#)',                          // prefix
    '(\\d\\d*)',                    // width
    '(\\,)',                        // thousand seperator
    '(?:\\.(\\d\\d*))',             // precision
    '([cjsdboxX])'                  // type
  ].join('?') + '?\\}', 'g'),

  /* ---------------------------------------------------------------------------
   * diacritics & liguatures
   *
   * because character mappings easily grow large we only provide 
   * the [Latin-1 Supplement][1], (letters in range [xC0-xFF]) mapped to their
   * nearest character allowed in URL path segments.
   * 
   * we also rely on native `String#toLowerCase` and `String#toUpperCase`
   * to properly convert characters.
   *
   * [1]: http://unicode-table.com/en/#latin-1-supplement
   */

  latin1Reprs = ('A,A,A,A,Ae,A,AE,C,E,E,E,E,I,I,I,I,D,N,O,O,O,O,Oe,-,Oe,' + 
    'U,U,U,Ue,Y,Th,ss,a,a,a,a,ae,a,ae,c,e,e,e,e,i,i,i,i,d,n,o,o,o,o,oe,-,oe,' +
    'u,u,u,ue,y,th,y').split(','),

  latin1Chars = (function () {
    // avoid polluting the main closure

    var offset = 0xC0,
        limit = 0x100,
        len = limit - offset,
        i = -1,
        charCodes = Array(len);
  
    charCodes[0] = 1; // initialize as numerically typed array
    while (++i < len) charCodes[i] = i + offset;
   
    return stringFromCharCode.apply(null, charCodes);
    
  }()),

  reLatin1 = RegExp('[' + latin1Chars + ']', 'g'),
  cbLatin1 = function (match) {
    return latin1Reprs[latin1Chars.indexOf(match)];
  },

  /* ---------------------------------------------------------------------------
   * the whitespace shim
   *
   * native implementations of `String#trim` might miss out
   * on some of the more exotic characters considered [whitespace][1],
   * [line terminators][2] or the mysterious [Zs][3]. this section detects those
   * flaws and constructs the regular expressions used in the shims.
   * many thanks to the authors of [faster trim][4] and [whitespace deviations][5].
   *   
   * [1]: http://www.ecma-international.org/ecma-262/5.1/#sec-7.2
   * [2]: http://www.ecma-international.org/ecma-262/5.1/#sec-7.3
   * [3]: http://www.fileformat.info/info/unicode/category/
   * [4]: http://blog.stevenlevithan.com/archives/faster-trim-javascript
   * [5]: http://perfectionkills.com/whitespace-deviations/
   */

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

      reWss = RegExp(reWssSource, 'g');
      reNoWs = RegExp('[^' + reWsSource + ']');
      reTrimLeft = RegExp('^' + reWssSource);
      reTrimRight = RegExp('[' + reWsSource + ']+$');
    }

  }());

  /* ---------------------------------------------------------------------------
   * feature detection
   */

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

  /* ---------------------------------------------------------------------------
   * helper methods
   */

  function toString (any) {
    assert(any !== null && any !== void 0, 'input must not be null');
    return String(any);
  }

  function assert (test, message) {
    if (!test) throw Error(message || 'invalid usage of stryng member');
  }

  function isRegExp (any) {
    return _objectToString.call(any) === STR_OBJECT_REGEXP;
  }

  function isFunction (any) {
    // old webkit yields true for regexes. for internal use only.
    return typeof any === STR_FUNCTION;
  }

  function returnNativeFunction (any) {
    // thx: https://gist.github.com/jdalton/5e34d890105aca44399f#comment-1283831
    return isFunction(any) && !(STR_PROTOTYPE in any) && any;
  }

  /* ---------------------------------------------------------------------------
   * Stryng - constructor
   */

  /**
    utility class for manipulating strings in JavaScript. the built-in functions
    are neither sufficient nor consistent due to the language's minimalistic
    nature and browser incompatibilities. `Stryng` extends the set of native
    prototype and static functions. in addition, __each prototype method is
    ported to a static version and vice versa__. whichever paradigm you prefer,
    whether you  hold state in closures or objects, chain methods or compose
    them, `Stryng` has you covered. constraints are highlighted in these docs.
    
        Stryng('cellar').append('door'); // `new` is optional in case you lint
        Stryng.append('cellar', 'door');

    static functions are faster because they are implemented this way (unless
    adapted from native `String.prototype`) and don't need the extra `new`
    operation which allocates memory, sets `this` and chains prototypes
    `(Object > Stryng)`.
    
    migration path
    --------------
    using `Stryng` as a replacement for the native class works. however,
    when using objects instead of primitives beware [JavaScript's type
    casting mechanisms][1].

    always use `.equals(other)` instead of `==` or `===`. relational comparators
    `[<, <=, >=, >]` are safe.

        var fox = Stryng('fox');
        fox.equals('fox');              // > true
        fox.equals(new String('fox'));  // > true
        fox.iequals(new Stryng('FOX')); // > true

    always use `.isEmpty()` instead of `!stryng`.
    
        var empty = Stryng('');
        empty.isEmpty(); // > true
        !empty;          // > false

    type detection:
    
        typeof stryng;              // > 'object'
        ({}).toString.call(stryng); // > '[object Object]'
        stryng instanceof Stryng;   // > true, beware iframes
        Stryng.isStryng(stryng);    // > true, wraps the above

    apart from the above mentioned cases you may use `Stryng` instances as if
    they were primitives. the reason is that JavaScript's inner workings request
    the `Stryng` instance's _DefaultValue_ whenever it is passed to a native
    function or operator. this value is retrieved by calling 
    {{#crossLink "Stryng/toString:method"}}valueOf{{/crossLink}} or
    {{#crossLink "Stryng/toString:method"}}{{/crossLink}} (in that order)
    which both reliably return the instance's wrapped primitive.

        +Stryng('123');                     // > 123
        Stryng('cellar') + 'door';          // > 'cellardoor'
        ({key: 'value'})[Stryng('key')];    // > 'value'
        parseFloat(Stryng('1.2e-3suffix')); // > 0.0012

        var param = Stryng('%C3%A9cole');
        decodeURIComponent(param);     // > 'école'
        console.log(param.simplify()); // > 'ecole'

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
      // pass, see functions `Stryng.prototype.constructor` and `recycle`
    }
  }());

  /* ---------------------------------------------------------------------------
   * publish constants
   *
   * if `Object.defineProperty` is not available we simply set attributes.
   */

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

  /* ---------------------------------------------------------------------------
   * cloning mutables
   */

  /**
    curried version of the {{#crossLink "Stryng"}}`constructor`{{/crossLink}}.
    in case the instance was not constructed to be mutable this is the hook
    to get a copy of it. this method is only available on `Stryng.prototype`.
    
    @method clone
    @chainable
    @param {boolean} [isMutable=false]
    @return {Stryng}
    @example
        var immutable = Stryng(' padded ', false);

        // same as Stryng(immutable.toString(), true);
        var mutable = immutable.clone(true); 

        // .trim() changes the value but returns the same object reference
        mutable.equals(mutable.trim()); // > true

        // .trim() returns a new instance with the changed value
        immutable.equals(immutable.trim()); // > false

   */
  Stryng[STR_PROTOTYPE].clone = function (isMutable) {
    return new Stryng(this.__value__, isMutable);
  };

  /* ---------------------------------------------------------------------------
   * seemlessness
   */

  /**
    getter for this instance' wrapped string primitive.
    this method is only available on `Stryng.prototype`.
    __alias:__ `valueOf`.
    
    @method toString
    @return {string}
    @example
        typeof Stryng('fox').toString(); // > 'string'
   */
  Stryng[STR_PROTOTYPE].valueOf = Stryng[STR_PROTOTYPE].toString = function () {
    return this.__value__; // we can rest assured that this is a primitive
  };

  /**
    returns the string representation of the expression used to construct
    this instance. this method is only available on `Stryng.prototype`.
    
    @method  toSource
    @return {string} eval-string-expression
    @example
        Stryng('fox').toSource(); // > '(new Stryng("fox", false))'

   */
  Stryng[STR_PROTOTYPE].toSource = function () { 
    return '(new Stryng("' + this.__value__ + '", ' + this.isMutable + '))';
  };

  /* ---------------------------------------------------------------------------
   * Stryng - instance methods
   */

  var stryngFunctions = {

    /**
      removes all whitespace, line terminators and Zs from both ends of
      this' string. shim for native {{#es6 "String.prototype.trim"}}{{/es6}}.

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
      removes all whitespace, line terminators and Zs from the beginning of
      this' string. shim for non-standard
      {{#mdn "String.prototype.trimLeft"}}{{/mdn}}.
      
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
      removes all whitespace, line terminators and Zs from the end of
      this' string. shim for non-standard
      {{#mdn "String.prototype.trimRight"}}{{/mdn}}.
      
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
      returns whether or not this' string includes the substring `search`
      starting at `position`. shim for native
      {{#es6 "String.prototype.includes"}}{{/es6}}.
      
      @method  includes
      @param {string} [search="undefined"]
      @param {number} [position=0]
      @return {boolean}
      @example
          Stryng('within').includes('thin');    // > true
          Stryng.includes('within', '', 10);    // > true, always
          Stryng.includes('within', 'thin', 4); // > false, `thin` starts at index 2
          Stryng.includes('undefined');         // > true, applied default
     */
    includes: function (input, search, position) {
      return toString(input).indexOf(search, position) !== -1;
    },

    /**
      returns whether or not this' string at index `position` begins with
      substring `search`. shim for native
      {{#es6 "String.prototype.startsWith"}}{{/es6}}.
      
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
      assert(!isRegExp(search), 'no regex support');

      return input.indexOf(search, position) === mathMin(
        input.length, mathMax(0, numberToInteger(position)));
    },

    /**
      returns whether or not this' string truncated at `position` ends with
      substring `search`. shim for native {{#es6 "String.prototype.endsWith"}}
      {{/es6}}
      
      @method  endsWith
      @param {String} [search="undefined"]
      @param {number} [position=this.length]
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
      assert(!isRegExp(search), 'no regex support');

      var len = input.length,
          idx = input.lastIndexOf(search, position);

      return idx !== -1 && idx+String(search).length === (
        position === void 0 ? len : mathMin(len, mathMax(0, numberToInteger(position)))
      );
    },

    /**
      concatenates this' string `n` times to the empty string.
      shim for native {{#es6 "String.prototype.repeat"}}{{/es6}}.
      
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
      assert(n >= 0 && n*input.length <= MAX_STRING_SIZE && n !== INFINITY);

      var result = '';

      do {
        if (n%2) {
          n--;
          result += input;
        }
        n /= 2;
      } while (n && (input += input));

      return result;
    },

    /**
      returns the this' substring with length `length` starting at
      `position` which may also be negative to index backwards.
      shim for native {{#es6 "String.prototype.substr"}}{{/es6}}
      
      @method  substr
      @chainable
      @param {number} [position=0]
      @param {number} [length=this.length-position]
        this' string's length minus `position`
      @return {Stryng}
     */
    substr: function (input, position, length) {
      input = toString(input);
      position = numberToInteger(position);
      if (position < 0) position = mathMax(0, position + input.length);
      return input.substr(position, length);
    },

    /**
      prepends and appends `outfix` to this' string in one go.
      to do the opposite use {{#crossLink "Stryng/strip:method"}}{{/crossLink}}.
      related to {{#crossLink "Stryng/embrace:method"}}{{/crossLink}}.
      
      @method  wrap
      @chainable
      @param {string} outfix
        prefix and suffix
      @return {Stryng}
      @example
          Stryng('python doc string').wrap('"""'); // > '"""python doc string"""'
          Stryng.wrap('quote', '"');               // > '"quote"'

     */
    wrap: function (input, outfix, n) {
      input = toString(input);
      outfix = Stryng.repeat(outfix, n);
      input += outfix;
      return outfix + input;
    },

    /**
      prepends the 1st and appends the 2nd half of `braces` to this' string.
      if `braces.length` is odd the shorter half is prepended.
      
      @method embrace
      @chainable
      @param  {string} [braces='()']
      @return {Stryng}
      @example
          Stryng('optional').embrace('[]');  // > '[optional]'
          Stryng.embrace('0, 1', '[)');      // > '[0, 1)'
          Stryng.embrace('0, 1', '');        // > '0, 1'
          Stryng.embrace('side note');       // > '(side note)', applies default
          Stryng.embrace('floored split idx', '<em></em>'); // > '<em>floored split idx</em>'
     */
    embrace: function(input, braces){
      braces = braces !== void 0 ? String(braces) : '()';
      return Stryng.insert(braces, mathFloor(braces.length/2), toString(input));
    },

    /**
      returns the no. non-overlapping occurrences of `search` within
      this' string. the empty string is considered a _character boundary_
      thus `this.length + 1` will always be the result for that.
      
      @method  count
      @param {string} [search="undefined"] the substring to search for
      @return {number}
      @example
          var tongueTwister = 'Can you can a can as a canner can can a can?';
          tongueTwister.length;               // > 44
          Stryng(tongueTwister).count('can'); // > 6
          Stryng.count(tongueTwister, 'a');   // > 11
          Stryng.count(tongueTwister, '');    // > 45, length + 1
          Stryng.count(tongueTwister);        // > 0, 'undefined' wasn't found
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
      returns an object with `substrings` as keys. each key is associated with
      its no. non-overlapping occurrences within this' string. the empty string is
      considered a _character boundary_ thus `this.length + 1` will always be
      the result for that.

      __note:__ duplicate entries within `substrings` won't be removed prior to
      counting and thereby impact performance but don't change the result.

      @method  countMultiple
      @param {Array} substrings
        array of substrings to search for
      @return {Object}
      @throws if `substrings` is not an array

      @example
      if multiple keys in `substrings` match this' string at the same index the first
      one encountered in the array will take the credit. for this reason you
      might want to sort your `substrings` by length in descending order
      prior to passing them in.

          var tongueTwister = 'Can you can a can as a canner can can a can?',
              sortedAsc  = ['c', 'can', 'can a'],
              sortedDesc = ['can a', 'can', 'c'];
              
          Stryng(tongueTwister).countMultiple(sortedAsc);  // {"c": 6}
          Stryng.countMultiple(tongueTwister, sortedDesc); // {"can a": 3}

      if you don't want this behavior use {{#crossLink "Stryng/count:method"}}
      {{/crossLink}} for each substring instead.
     */
    countMultiple: function (input, substrings){
      input = toString(input);
      assert(isArray(substrings), 'expected type: array');
      if (!substrings.length) return {};

      var keys = substrings.slice(),
          key,
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

      if (_arrayContains.call(substrings, '')) result[''] = input.length + 1;
      
      return result;
    },

    /**
      delegates to native {{#mdn "Array.prototype.join"}}{{/mdn}}.

      @method  delimit
      @param {Array} joinees
        array of substrings to concatenate
      @return {Stryng}
      @throws if `joinees` is not an array
      @example
          Stryng(',').delimit([1,2,3]); // > '1,2,3'
          Stryng.delimit(',', []);      // > ''
          Stryng.delimit(',');          // throws
     */
    delimit: function (delimiter, joinees) {
      assert(delimiter != null);
      assert(isArray(joinees), 'expected type: array');
      return joinees.join(delimiter); // implies parsing `delimiter`
    },

    /**
      composition of native {{#mdn "String.prototype.split"}}{{/mdn}},
      {{#mdn "Array.prototype.reverse"}}{{/mdn}} and
      {{#mdn "Array.prototype.join"}}{{/mdn}}.
      note that this rather naive implementation may not produce correct results.
      for an alternative that knows how to properly reverse
      diacritics and accented characters use [esrever][1].

      [1]: https://github.com/mathiasbynens/esrever

      @method  reverse
      @chainable
      @return {Stryng}
      @example
          Stryng('mordnilap a ton').reverse(); // > 'not a palindrom'
          Stryng.reverse('mañana');            // > 'anãnam', use esrever
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
      @example
          Stryng('int').insert(2, 'ser');         // > 'insert'
          Stryng.insert('fix', void 0, 'pre');    // > 'prefix', default pos. is zero
          Stryng.insert('fix', -1, 'pre');        // > 'prefix', pos. is min-ed to zero
          Stryng.insert('out of ', 10, 'bounds'); // > 'out of bounds', pos. is max-ed to length
          Stryng.insert('this is ', 10);          // > 'this is undefined'
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
      @throws if `indices` is not an array
     */
    splitAt: function (input, indices) {
      input = toString(input);
      assert(isArray(indices), 'expected type: array');

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
          if (match.length) _arrayPush.apply(result, match); // mutates result
          input = input.substring(lastIndex);
        }
        result.push(input); // push what's left
      } else {
        result = input.split(delimiter); // implies parsing
        difference = result.length - n;
        if (difference > 0) result.push(
          result.splice(n, difference).join(delimiter));
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
      assert(!isRegExp(delimiter), 'no regex support');
      n = (n === void 0 ? -1 : n) >>> 0;
      if (!n) return [];
      delimiter = String(delimiter);

      var result = input.split(delimiter),
          difference = result.length - n;

      if (difference > 0) result.unshift(
        result.splice(0, difference).join(delimiter));
      return result;
    },

    /**
      splits this' string by line terminators as defined in the
      [ES5-spec](http://www.ecma-international.org/ecma-262/5.1/#sec-7.3).
     
      @method  splitLines
      @return {Array} array of substrings
     */
    splitLines: function (input) {
      return toString(input).split(reLineTerminators);
    },

    /**
      substitutes all non-overlapping occurrences of `replacee` with `replacement`.

      @method  exchange
      @chainable
      @param {string} [replacee="undefined"] string to be replaced
      @param {string} [replacement="undefined"]
      @return {Stryng}
     */
    exchange: function (input, replacee, replacement) {
      return Stryng.exchangeLeft(input, replacee, replacement);
    },

    /**
      substitutes the first `n` non-overlapping occurrences of
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
      // let cast with hint string
      return String(replacee) == replacement ? input :
        Stryng.splitLeft(input, replacee, n).join(replacement);
    },

    /**
      substitutes the last `n` non-overlapping occurrences of
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
      // let cast with hint string
      return String(replacee) == replacement ? input :
        Stryng.splitRight(input, replacee, n).join(replacement);
    },

    /**
      both appends and prepends `padding` to this' string as often as needed
      to reach but not exceed a length of `length`. passing a `length`
      lesser than this' string's length has no effect. it is never truncated.

      @method just
      @chainable
      @param {number} [length=0] range constraint:
        `0 <= length <= {{#crossLink "Stryng/MAX_STRING_SIZE:property"}}{{/crossLink}}`
      @param {string} [padding=" "]
      @return {Stryng}
      @throws if `length` is out of range
      @example
          Stryng('HEAD').just(10, '+'); // > '+++HEAD+++'
          Stryng.just('pad');           // > 'pad'
          Styrng.just('pad', 1);        // > 'pad', never truncated
          Styrng.just('pad', 6, '++');  // > 'pad', combined length exceeds 6
          
          var align = Stryng.just('align', 8); // > ' align ', default to space
          align.length;                        // > 7, needs to fit both ends
     */
    just: function (input, length, padding) {
      input = toString(input);
      length = numberToInteger(length);
      assert(0 <= length && length <= MAX_STRING_SIZE);
      padding = padding === void 0 ? ' ' : String(padding);

      var inputLen = input.length,
          paddingLen = padding.length;

      if (length <= inputLen || !paddingLen) return input;
      padding = Stryng.repeat(padding, mathFloor((length-inputLen) / 2 / paddingLen));
      return padding + input + padding;
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
      @example
          Stryng('left').justLeft(8, '+');     // > '++++left'
          Stryng.justLeft('left');             // > 'left'
          Stryng.justLeft('left', 2);          // > 'left', never truncated
          Stryng.justLeft('indent', 8);        // > '  indent', default to space
          Stryng.justLeft('indent', 8, '>>>'); // > 'indent', combined length exceeds 8
     */
    justLeft: function (input, length, padding) {
      input = toString(input);
      length = numberToInteger(length);
      assert(0 <= length && length <= MAX_STRING_SIZE);
      padding = padding === void 0 ? ' ' : String(padding);

      var inputLen = input.length,
          paddingLen = padding.length;

      if (length <= inputLen || !paddingLen) return input;
      return Stryng.repeat(padding, mathFloor((length-inputLen) / paddingLen)) + input;
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
      @example
          Stryng('right').justRight(8, '+');  // > 'right+++'
          Stryng.justRight('right');          // > 'right'
          Stryng.justRight('right', 2);       // > 'right', never truncated
          Stryng.justRight('right', 8);       // > 'right   ', default to space
          Stryng.justRight('right', 6, '++'); // > 'right', combined length exceeds 6
     */
    justRight: function (input, length, padding) {
      input = toString(input);
      length = numberToInteger(length);
      assert(0 <= length && length <= MAX_STRING_SIZE);
      padding = padding === void 0 ? ' ' : String(padding);

      var inputLen = input.length,
          paddingLen = padding.length;

      if (length <= inputLen || !paddingLen) return input;
      return input + Stryng.repeat(padding, mathFloor((length-inputLen) / paddingLen));
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
      @example
          Stryng('__private__').strip('_');  // > 'private'
          Stryng.strip('++ NEWS +', '+', 1); // > '+ NEWS '
          Stryng.strip('  indented', ' ');   // > 'indented'
          Stryng.strip('undefined');         // > '', applies default
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
      @example
          Stryng('  indented').stripLeft(' ');             // > 'indented'
          Stryng.stripLeft('+++ NEWS +++').stripLeft('+'); // > ' NEWS +++'
          Stryng.stripLeft('__private').stripLeft('_', 1); // > '_private'
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
      @example
          Stryng('\n line \n').stripRight('\n');             // > '\n line '
          Stryng.stripRight('+++ NEWS +++').stripRight('+'); // > '+++ NEWS '
          Stryng.stripRight('fee').stripRight('e', 1);       // > 'fe'
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
      while including the complete `ellipsis` at its end. this implementation
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
        assert(0 <= maxLength);
        if (!maxLength) return '';
      }
      if (maxLength >= input.length) return input;
      ellipsis = ellipsis !== void 0 ? String(ellipsis) : '...';

      var ellipsisLen = ellipsis.length;

      if (ellipsisLen >= maxLength) return ellipsis.slice(-maxLength);
      return input.substring(0, maxLength - ellipsisLen) + ellipsis;
    },

    /**
      this can be interpreted as a shallow version of the native
      {{#mdn "JSON.stringify"}}{{/mdn}}.
      shim for non-standard {{#mdn "String.prototype.quote"}}{{/mdn}}.
      
      - backslash-escapes all occurences of `", \, \b, \t, \v, \n, \f, \r`
      - hex-encodes any non-ASCII-printable character
      - wraps the result in (unescaped) double quotes.

      see {{#crossLink "Stryng/unquote:method"}}{{/crossLink}} for the
      inverse operation.

      @method  quote
      @chainable
      @return {Stryng}
      @example
          Stryng("en école\nj'apprends").quote(); // > '"en \xE9cole\\nj'apprends"'
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
          // same goes for all other combinations of String, ==, Stryng and ===

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
          Styrng.isEmpty([]);     // > true, []+'' yields ''
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
      replaces groups of whitespace, line terminators and/or Zs by a single
      space character.

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

      - lower-casing the input
      - removing all occurences of space, underscore and hyphen followed by a
        lower-case letter which is then upper-cased.

      inspired by [emberjs][1]. for a _classified_ output compose this method
      with {{#crossLink "Stryng/capitalize:method"}}{{/crossLink}}.

      [1]: http://emberjs.com/api/classes/Ember.String.html#method_camelize

      @method  camelize
      @chainable
      @return {Stryng}
      @example
          Stryng('ClassName').camelize();     // > 'className'
          Stryng.camelize('hyphen-ized');     // > 'hyphenIzed'
          Stryng.camelize('MiXeD CaSe');      // > 'mixedCase'
          Stryng.camelize('CONST_VALUE');     // > 'constValue'
          Stryng.camelize('This Is A Title'); // > 'thisIsATitle'
     */
    camelize: function (input) {
      return toString(input)
        .toLowerCase()
        .replace(reLowBoundary, cbLowBoundary);
    },

    /**
      transforms this' string into an underscored form by

      - inserting `_` where upper-cased letters follow lower-cased ones
      - replacing space and hyphen by `_`
      - lower-casing the final output

      inspired by [emberjs][1].

      [1]: http://emberjs.com/api/classes/Ember.String.html#method_underscore

      @method  underscore
      @chainable
      @return {Stryng}
      @example
          Stryng('ClassName').underscore();     // > 'class_name'
          Stryng.underscore('hyphen-ized');     // > 'hyphen_ized'
          Stryng.underscore('MiXeD CaSe');      // > 'mi_xe_d_ca_se'
          Stryng.underscore('This Is A Title'); // > 'this_is_a_title'
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
      inspired by [emberjs][1].

      [1]: http://emberjs.com/api/classes/Ember.String.html#method_dasherize

      @method  hyphenize
      @chainable
      @return {Stryng}
      @example
          Stryng('ClassName').hyphenize();     // > 'class-name'
          Stryng.hyphenize('under_scored');    // > 'under-scored'
          Stryng.hyphenize('MiXeD CaSe');      // > 'mi-xe-d-ca-se'
          Stryng.hyphenize('This Is A Title'); // > 'this-is-a-title'
     */
    hyphenize: function (input) {
      return toString(input)
        .replace(reCaseSwitch, '$1-$2')
        .replace(reSpaceUnderscore, '-')
        .toLowerCase();
    },

    /**
      replaces ligatures and diacritics from the [Latin-1 Supplement][1]
      (letters in range `[\xC0, \xFF]`) with their nearest ASCII equivalent.
      compose this method with {{#crossLink "Stryng/hyphenize:method"}}
      {{/crossLink}} to produce URL slugs.

      [1]: http://unicode-table.com/en/#latin-1-supplement

      @method  simplify
      @chainable
      @return {Stryng}
     */
    simplify: function (input) {
      return toString(input).replace(reLatin1, cbLatin1);
    },

    /**
      produces a valid URL slug from this' string by composing
      
      - replacement of 
        {{#crossLink "Stryng/PUNCTUATION:property"}}{{/crossLink}} with spaces
      - {{#crossLink "Stryng/clean:method"}}{{/crossLink}}
      - {{#crossLink "Stryng/simplify:method"}}{{/crossLink}}
      - {{#crossLink "Stryng/hyphenize:method"}}{{/crossLink}}
      
      @method slugify
      @chainable
      @since 0.2.3
      @return {Stryng}
      @example
          Stryng("En école, j'apprends").slugify(); // > 'en-ecole-j-apprends'
          Stryng.slugify('foo? bar: "baz"!');       // > 'foo-bar-baz'
     */
    slugify: function (input) {
      return (
        Stryng.hyphenize(
          Stryng.simplify(
            Stryng.clean(
              toString(input).replace(rePunct, ' ')
            )
          )
        )
      );
    },

    /**
      maps every character of this' string to its decimal representation.

      @method ord
      @return {Array} array of numeric character codes
      @example
          Stryng('*').ord();  // > [42]
          Stryng.ord('\t\v'); // > [9, 11]
     */
    ord: function (input) {
      input = toString(input);

      var i = input.length,
          result = new Array(i);

      while (i--) result[i] = input.charCodeAt(i);
      return result;
    },

    /**
      escapes all special characters that have meaning to JavaScript
      regexp parser. taken from [mdn][1]

      [1]: https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions

      @method escapeRegex
      @chainable
      @return {Stryng}
      @example
          var r = Stryng(Stryng.PUNCTUATION)
            .escapeRegex()
            .embrace('[]')
            .toRegex('g');

          "what's the matter?".split(r); // > ["what", "s the matter", ""]
     */
    escapeRegex: function (input) {
      return toString(input).replace(reRegex, cbRegex);
    },

    /**
      convenience wrapper for native `RegExp` constructor.

      @method  toRegex
      @param  {string} flags
      @return {RegExp}
      @example
          Stryng('\\w').toRegex().test('A');      // > true
          Stryng('[a-z]').toRegex('i').test('B'); // > true
     */
    toRegex: function (input, flags) {
      return new RegExp(toString(input), flags);
    },

    /**
      interpolates this' string replacing placeholders according to python's
      [format minilanguage][1].
     
      [1]: https://docs.python.org/2/library/string.html#formatspec
     
      @method format
      @chainable
      @since 0.2.4
      @param {any} [...insertion] value to format and insert
      @return {Stryng}
     */
    format: function () {

      // arguments will be leaked, to array, please.
      var arguments_ = arguments,
          i = arguments_.length,
          args = new Array(i),

          formatString,
          len,
          kw;
      
      while (i--) args[i] = arguments_[i];
      
      formatString = toString(args.shift());
      len = args.length;
      kw = args[len-1];
      
      return formatString.replace(reFormat, function(_, id, fill_just, sign,
                                                     prefix, width, seperator,
                                                     precision, type){

        var index = id === void 0 ? ++i : +id, // reuse i
            value = index !== index ?
              (assert(kw && id in kw, 'argument "'+id+'" not found'), kw[id]) :
              (assert(index < len, 'argument index out of bounds'), args[index]),
            
            pair = (fill_just || ' >').split(''),
            fill = pair[0],
            just = pair[1],

            isDecimal = type === 'd',
            hasBase2 = typeBaseMap.hasOwnProperty(type),

            result,
            digits,
            padding,
            diff,
            nan;

        if (!type || type === 's'){
          result = String(value);
        } else if (type === 'j') {
          result = jsonStringify(value);
        } else {
          value = +value;
          if (type === 'c') {
            assert(0 <= value && value <= MAX_CHARCODE, 'invalid char-code '+value);
            result = stringFromCharCode(value);
          } else if (isDecimal) {
            result = value.toFixed(precision); // implies exceptions and parsing
          } else /*if (hasBase2)*/ {
            result = value.toString(typeBaseMap[type]);
          }
        }

        if (type === 'X') result = result.toUpperCase();
        if (precision) assert(isDecimal, 'precision requires type [d]');

        if (seperator){
          assert(isDecimal, 'thousand sep. requires type [d]');
          if (value === value && isFinite(value)) {
            digits = result.split('');
            result = Stryng.reverse((value < 0 ? digits.shift() : '') + digits
              .reverse()
              .join('')
              .replace(reThousand, cbThousand)
            );
          }
        }

        if (prefix) {
          assert(hasBase2, 'prefix (#) requires type [boxX]');
          result = '0' + type.toLowerCase() + result;
        }

        if (sign) {
          assert(isDecimal || hasBase2, 'sign requires type [dboxX]');
          if (result.indexOf('-')) result = sign + result;
        }

        diff = (+width) - result.length;
        if (diff > 0){

          padding = Stryng.repeat(fill, diff);
          if (padding) {

            nan = +result.charAt(0);
            result = (
              just === '<' ? result + padding :
              just === '>' ||
              just === '=' && nan === nan ? padding + result :
              just === '^' ? Stryng.embrace(result, padding) :
                             // sign-aware padding
                             Stryng.insert(result, 1, padding)
            );
          }
        }

        return result;
      });
    }
  };

  /* ---------------------------------------------------------------------------
   * Stryng - static functions
   */

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
    generates a string of `length` random characters in char-code
    range `[from, to)`. this range defaults to the ASCII printables.
    to choose randomly from the whole UTF-16 table call
    `Stryng.random(len, 0, Stryng.MAX_CHARCODE)`.
    
    @method random
    @static
    @param {number} [length=0] range constraint:
      `0 <= length <= {{#crossLink "Stryng/MAX_STRING_SIZE:property"}}{{/crossLink}}`
    @param {number} [from=32] range constraint:
      `0 <= from < to`
    @param {number} [to=127] range constraint:
      `from < to <= {{#crossLink "Stryng/MAX_CHARCODE:property"}}{{/crossLink}}`
    @return {Stryng}
    @throws if `length`, `from` or `to` is out of range
    @example
        Stryng.random();           // > '', the only reproducable
        Stryng.random(10);         // > 'e7Yu$^pPg%', ASCII printables only
        Stryng.random(10, 65, 91); // > 'LHBBZDVLAQ', caps only
        Stryng.random(3, 0, Stryng.MAX_CHARCODE).ord(); // > [31947, 46749, 25786]
   */
  Stryng.random = function (length, from, to) {
    length = numberToInteger(length);
    assert(0 <= length && length <= MAX_STRING_SIZE);
    from = from === void 0 ? 32  : (from >>> 0);
    to   = to   === void 0 ? 127 : (to   >>> 0);
    assert(from < to && to <= MAX_CHARCODE);

    var result = '',
        difference = to - from;

    if (difference > 0) {
      while (length--) {
        // we need to convert __random__ numbers to string immediately
        // to sustain optimizability
        result += stringFromCharCode(from + mathFloor(mathRandom()*difference));
      }
    }
    return new Stryng(result);
  };

  /**
    delegates to native {{#mdn "String.fromCharCode"}}{{/mdn}}. returns the
    concatenated string representations of the given `charCode`s from the
    UTF-16 table.
    
    @method chr
    @static
    @param {Array} charCodes
      array of decimal character codes with range constraint:
      `0 <= charCodes[i] <= {{#crossLink "Stryng/MAX_CHARCODE:property"}}{{/crossLink}}`
    @return {string}
    @throws if `charCodes` is not an array or `charCodes[i]` is out of range
   */
  Stryng.chr = function (charCodes) {
    assert(isArray(charCodes), 'expected type: array');
    for (var i = charCodes.length; i--;) assert(charCodes[i] <= MAX_CHARCODE);

    // implies parsing `charCodes`
    return stringFromCharCode.apply(null, charCodes);
  };

  Stryng.fromCharCode = stringFromCharCode;
  Stryng.fromCodePoint = String.fromCodePoint;

  /* ---------------------------------------------------------------------------
   * Stryng - build & transform
   */

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

  _arrayForEach.call(objectKeys(stryngFunctions), function (name) {
    var fn = stryngFunctions[name];

    // publish static functions
    Stryng[name] = fn;

    // transform to instance methods
    Stryng[STR_PROTOTYPE][name] = function (a, b, c) {
      var argc = arguments.length,
          instance = this,
          value = instance.__value__;

      // avoid unoptimizable `.apply(null, arguments)`
      return recycle(instance,
        !argc      ? fn(value) :
        argc === 1 ? fn(value, a) :
        argc === 2 ? fn(value, a, b) :
                     fn(value, a, b, c) // none expects more
      );
    };
  });

  // whether or not to adapt native static functions
  var hasStaticNatives = (function () {
    // wrap try-catch clauses for optimizability of outer scope

    if (returnNativeFunction(String.slice)){
      try { String.slice(/* undefined */); } // expect to throw
      catch (e){ return true; }
    }
    return false;
  }());

  _arrayForEach.call(methods, function (name) {

    var instanceMethod = STR_UNDEFINED[name],
        isNative = !!returnNativeFunction(instanceMethod),
        isOverridden = _arrayContains.call(overrides, name);

    if (isNative && !isOverridden) {

      // adapt if natively available, patch otherwise
      Stryng[name] = (hasStaticNatives && returnNativeFunction(String[name]) ||

        function (input, a, b, c) {
          var value = toString(input),
              argc = arguments.length;

          // avoid unoptimizable `.apply(null, arguments)`
          return (
            !argc      ? value[name]() :
            argc === 1 ? value[name](a) :
            argc === 2 ? value[name](a, b) :
                         value[name](a, b, c) // none expects more
          );
        }
      );

      // intercept native instance method to return a Stryng instance
      Stryng[STR_PROTOTYPE][name] = function (a, b, c) {
        var argc = arguments.length,
            instance = this,
            value = instance.__value__;

        // avoid unoptimizable `.apply(null, arguments)`
        return recycle(instance,
          !argc      ? value[name]() :
          argc === 1 ? value[name](a) :
          argc === 2 ? value[name](a, b) :
                       value[name](a, b, c) // none expects more
        );
      };
    }
  });

  
  /* ---------------------------------------------------------------------------
   * export
   */

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
