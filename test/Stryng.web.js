;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @file 
 * @see [article on generics]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String#String_generic_methods} at MDN.
 * @version 0.0.1
 * @author <espretto@gmail.com>
 */

/**
 * @todo better design patterns
 * do not pass boolean flags
 * do not expect null
 * provide a context to exceptions
 * defensive programming
 */

// https://github.com/umdjs/umd/blob/master/returnExports.js
(function (root, factory){

    if (typeof define === 'function' && define.amd)
    {
        // AMD. Register as an anonymous module.
        define(factory);
    }
    else if(typeof module === 'object' && module.exports)
    {
        // strict CommonJS
        module.exports = factory();
    }
    else if(typeof exports === 'object')
    {
        // NodeJS
        exports = factory();
    }
    else
    {
        var _Stryng = root.Stryng,
            Stryng = factory();

        /**
         * available in browsers only.
         * restores whatever was assigned to <code>Stryng</code> before
         * @function Stryng.noConflict
         * @returns Stryng
         */
        Stryng.noConflict = function()
        {
            root.Stryng = _Stryng;
            return Stryng;
        }

        root.Stryng = Stryng;
    }

})(this, function(){

    var // one to var them all

    // used to access native instance methods
    VERSION = '0.0.1',

    // promote compression
    String = VERSION.constructor,

    // methods Stryng hopes to adopt - getOwnPropertyNames() method is non-shimable
    methods = (
          'charAt,charCodeAt,codePointAt,concat,contains'
        + ',endsWith,fromCodePoint,indexOf,lastIndexOf'
        + ',localeCompare,match,normalize,replace,search'
        + ',slice,split,startsWith,substr,substring'
        + ',toLocaleLowerCase,toLocaleUpperCase,toLowerCase'
        + ',toUpperCase,trim,trimLeft,trimRight'
    ).split(','),

    // methods which's native implementations to override if necessary
    shimMethods = [],

    // inner module to hold type/class check functions
    is = {},

    ////////////////////////////////
    // quick access variables     //
    // to native instance methods //
    ////////////////////////////////

    array_slice = methods.slice,

    array_splice = methods.splice,

    array_pop = methods.pop,

    array_shift = methods.shift,

    array_unshift = methods.unshift, // no need for fixing IE lte 8 returning undefined

    array_join = methods.join,

    array_contains = methods.contains || function(search)
    {
        
        // if(this == null) throw new TypeError('can\'t convert '+this+' to object');
        
        // for(var o = Object(this), i = o.length >>> 0; i--;)
        // {
        //     if(i in o)
        //     {
        //         if(o[i] === search) return true;
        //     }
        // }

        // return false;
        
       
        // no spec compliance intended - for internal use only
        var arr = this,
            i = arr.length;

        while(i-- && arr[i] !== search);

        return i !== -1;
    },

    array_forEach = methods.forEach || function(iterator, context)
    {
        
        // if(this == null) throw new TypeError('can\'t convert '+this+' to object');
        
        // for(var o = Object(this), length = o.length >>> 0, i = 0; length !== i++;)
        // {
        //     if(i in o)
        //     {
        //         iterator.call(context, o[i], i, o);
        //     }
        // }

        // no spec compliance intended - for internal use only
        var arr = this,
            i = arr.length;

        while(i--) iterator.call(context, arr[i], i, arr);
    },

    object_toString = is.toString,

    string_concat = VERSION.concat,

    function_call = Function.call,

    //////////////////////////////
    // quick access variables   //
    // to native static methods //
    //////////////////////////////

    object_keys = Object.keys || function(object)
    {
        // no spec compliance intended - for internal use only
        var keys = [], key;

        for(key in object)
        {
            if(object.hasOwnProperty(key)) keys.push(key);
        }

        return keys;
    },

    math_random = Math.random,

    string_fromCharCode = String.fromCharCode,

    ///////////////////////////////////////
    // regular expressions (precompiled) //
    ///////////////////////////////////////

    reWord = /\w/,

    reFloat = /^\d*\.(?=\d+)[eE](?=[\+-]?\d+)$/,

    /////////////////////////////////
    // shim whitespace recognition //
    /////////////////////////////////

    reWS = /\s/, // TODO deprecated
    reWSs = /\s+/g,
    reNoWS = /\S/,

    // http://blog.stevenlevithan.com/archives/faster-trim-javascript
    reTrimLeft = /^\s\s*/,
    reTrimRight = /\s*\s$/,

    // http://www.ecma-international.org/ecma-262/5.1/#sec-7.3
    reLines = /\n|\r(?!\n)|\u2028|\u2029|\r\n/g, // LineTerminatorSequence
    
    // http://perfectionkills.com/whitespace-deviations/
    ws = (
          '\t' // '\11' // '\u0009' // tab
        + '\n' // '\12' // '\u000A' // line feed
        + '\13'         // '\u000B' // vertical tab
        + '\f' // '\14' // '\u000C' // form feed
        + '\r' // '\15' // '\u000D' // carriage return
        + ' '  // '\40' // '\u0020' // space
        
        // http://www.fileformat.info/info/unicode/category/Zs/list.htm
        + '\xA0'
        + '\u1680\u180E\u2000\u2001'
        + '\u2002\u2003\u2004\u2005'
        + '\u2006\u2007\u2008\u2009'
        + '\u200A\u202F\u205F\u3000'

        // http://es5.github.io/#x15.5.4.20
        + '\u2028' // line separator
        + '\u2029' // paragraph separator
        + '\uFEFF' // BOM - byte order mark

    ).split(''),

    strWS  = '\\s'

    ; // ends var block

    array_forEach.call(ws, function(chr){

        if(!reWS.test(chr)) strWS += chr;
    });

    // if a native implementation manages to
    // catch up with the spec it wouldn't be replaced
    if(strWS.length > 2)
    {
        shimMethods.push('trim', 'trimRight', 'trimLeft');

        reNoWS      = new RegExp('[^' + strWS + ']');
        strWS       = '[' + strWS + ']';
        reWS        = new RegExp(strWS); // deprecated
        reWSs       = new RegExp(strWS + strWS + '*', 'g');
        reTrimLeft  = new RegExp('^' + strWS + strWS + '*');
        reTrimRight = new RegExp(strWS + '*' + strWS + '$');
    }

    /////////////////////////
    // class / type checks //
    /////////////////////////

    array_forEach.call(['Array'/*, 'Date'*/, 'Function'/*, 'Object'*/, 'RegExp'], function(clazz){

        var repr = '[object ' + clazz + ']';
        
        // early exit falsies
        is[clazz] = function(o){ return o && object_toString.call(o) === repr };
    });

    array_forEach.call([/*'Boolean', 'Number',*/ 'String'], function(clazz){

        var repr = '[object ' + clazz + ']',
            type = clazz.toLowerCase();

        // early exit null, undefined, primitves
        is[clazz] = function(o){ return o != null && (typeof o === type || object_toString.call(o) === repr) };
    });

    // adopt native if available
    is.Array = Array.isArray || is.Array;

    // override if not returning 'function' (webkit)
    if(typeof reFloat === 'object') 
    {
        is.Function = function(o){ return o && typeof o === 'function' };
    }

    // duck type arguments as fallback
    is.Arguments = function(o){ return o && ( object_toString.call(o) === '[object Arguments]' || o.callee ) };
    
    // is.Undefined = function(o){ return o === void 0 }; // 'undefined' might be overridable

    // is.Null = function(o){ return o === null };
    
    // is.None = function(o){ return o == null };

    ///////////////////////
    // utility functions //
    ///////////////////////

    // http://www.ecma-international.org/ecma-262/5.1/#sec-9.4
    function toInteger(n)
    {
        // note:
        // the isNegative check can be performed without parsing through x <= -1 since all results of toNumber(x) in range ]-1,0[ get ceiled to zero
        // the isPositiveInfinity check can be performed without parsing through x == 1/0 since only 'Infinity' == Infinity ( == 1/0 )
        return (
            // toNumber and isNaN
            (n = +n) !== n ? 0 :
            // ceiles negatives, floors positives just like
            // sign(n) * Math.floor(Math.abs(n))
            n && isFinite(n) ? n|0 :
            // sign, zero and Infinity untouched
            n 
        );
    }

    // does not copy
    function flatten(iterable) 
    {
        // length changes by splicing
        for(var i = 0; i !== iterable.length;)
        {
            var item = iterable[i];

            if(is.Array(item) || is.Arguments(item))
            {
                array_unshift.call(item, i, 1);
                array_splice.apply(iterable, item);
            }
            else
            {
                ++i;
            }
        }
        return iterable;
    }

    function exit(args)
    {
        // relies on custom property 'Function._name'
        throw new Error('invalid usage of "' + args.callee._name + '" with args [' + array_slice.call(args) + ']');
    }

    function toFloat(n)
    {
        if(n == null || is.String(n) && !reFloat.test(n))
        {
            return 0.0;
        }
        return parseFloat(n);
    }

    //////////
    // Main //
    //////////
    
    /**
     * generic utility functions to ease working with Strings.
     * native instance of <code>String</code> get mixed.
     * @global
     * @constructor Stryng
     * @param {*} [input=""]
     *   the value to parse. defaults to the empty string
     * @returns {Stryng}
     */
    function Stryng(input)
    {
        // allow omitting the new operator
        if(!(this instanceof Stryng)) return new Stryng(input);

        /**
         * the wrapped native string primitive
         * @name Stryng~_value
         * @type {string}
         */
        this._value = input == null ? '' : String(input);
    }

    var StryngGenerics = {

        /**
         * @function Stryng.capitalize
         * @param  {string} input
         * @returns {string}
         *   <code>input</code> with first letter upper-cased.
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         * @todo in order to support diacritics and ligatures import the Stryng.esc plugin
         */
        capitalize: function(input)
        {
            input = input != null ? String(input) : exit(arguments);
            
            var length = input.length;

            return (
                !length ? input :
                length === 1 ? input.toUpperCase() :
                input.charAt(0).toUpperCase() + input.substring(1)
            );
        },

        /**
         * shim for non-standard [String#trimLeft]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/TrimLeft}
         * @function Stryng.trimLeft
         * @param  {string} input
         * @returns {string}
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        trimLeft: function(input)
        {
            return input != null ? String(input).replace(reTrimLeft, '') : exit(arguments);
        },

        
        /**
         * shim for non-standard [String#trimRight]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/TrimRight}
         * @function Stryng.trimRight
         * @param  {string} input
         * @returns {string}
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        trimRight: function(input)
        {
            return input != null ? String(input).replace(reTrimRight, '') : exit(arguments);
        },

        /**
         * uses a reverse charAt loop and regex tests then slice
         * @function Stryng.trimRight2
         * @deprecated slower - use {@link Stryng.trimRight} instead
         * @todo test and benchmark across browsers
         */
        trimRight2: function(input)
        {
            input = input != null ? String(input) : exit(arguments);

            for(var i = input.length; i-- && reWS.test(input.charAt(i));); // TODO side effectively remove "reWS"

            return i > 0 ? input.slice(0, ++i) : '';
        },

        /**
         * uses a reverse charAt loop and regex tests
         * @function Stryng.trimRight3
         * @deprecated slower - use {@link Stryng.trimRight} instead
         * @todo test and benchmark across browsers
         */
        trimRight3: function(input)
        {
            input = input != null ? String(input) : exit(arguments);

            for(var i = input.length; i-- && array_contains.call(ws, input.charAt(i)););
            
            return i > 0 ? input.slice(0, ++i) : '';
        },

        /**
         * shim for native [String#trim]{@link http://people.mozilla.org/~jorendorff/es5.html#sec-15.5.4.20}
         * @function Stryng.trim
         * @param  {string} input
         * @returns {string}
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        trim: function(input)
        {
            return input != null ?
                String(input)
                    .replace(reTrimLeft, '')
                    .replace(reTrimRight, '')
                : exit(arguments);
        },

        /**
         * shim for native String#contains
         * @function Stryng.contains
         * @param  {string} input
         * @param  {string} [searchString="undefined"]
         * @returns {boolean}
         *   whether or not <code>input</code>
         *   contains the substring <code>searchString</code>
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        contains: function(input, searchString)
        {
            return input != null ? String(input).indexOf(searchString) !== -1 : exit(arguments);
        },

        /**
         * shim for native [String#startsWith]{@link https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.startswith}
         * @function Stryng.startsWith
         * @param  {string} input
         * @param  {string} [searchString="undefined"]
         * @param  {number} [position=0]
         * @returns {boolean}
         *   whether or not <code>input</code> at index <code>position</code>
         *   begins with substring <code>searchString</code>
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        startsWith: function(input, searchString, position)
        {
            input = input != null ? String(input) : exit(arguments);

            // omit regex check

            // implies most steps to be taken
            // also covers "out of bounds"
            var i = input.indexOf(searchString, position);

            // early exit
            if(i !== -1)
            {
                var len = input.length;
                
                return i === (
                    // default for negatives (get ceiled)
                    position <= -1 ? 0 :
                    // maximum
                    position > len ? len :
                    // last resort
                    toInteger(position)
                );
            }
            return false;
        },

        /**
         * shim for native [String#endsWith]{@link https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.endswith}
         * @function Stryng.endsWith
         * @param {string} input
         * @param {string} [searchString="undefined"]
         * @param {number} [endPosition=input.length]
         * @returns {boolean}
         *   whether or not <code>input</code> truncated by <code>endPosition</code>
         *   ends with substring <code>searchString</code>
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        endsWith: function(input, searchString, endPosition)
        {
            input = input != null ? String(input) : exit(arguments);
            
            searchString = String(searchString);

            // early exit for the empty searchString
            if(!searchString) return true;

            var len = input.length;
            
            endPosition = (
                // default for undefined and values greater than len
                endPosition === void 0 || endPosition > len ? len :
                // default for negatives (get ceiled)
                endPosition <= -1 ? 0 :
                // last resort
                toInteger(endPosition)
            );

            return input.substring(endPosition - searchString.length, endPosition) === searchString;
        },

        /**
         * shim for native [String#repeat]{@link https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.repeat}
         * @function Stryng.repeat
         * @param  {string} input
         * @param  {number} [n=0]
         * @returns {string}
         *   the <code>input</code> <code>n</code> times
         *   concatenated to the empty string 
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        repeat: function(input, count)
        {
            if(input == null || count <= -1 || count == 1/0) exit(arguments);
            
            count = toInteger(count);

            // implies parsing
            for(var result = ''; count--; result += input);

            return result;
        },

        /**
         * shim for native [String#substr]{@link https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype.substr}
         * @param {string} input
         * @param {number} [start=0]
         * @param {number} [length=<from start to end>]
         * @return {string}
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        substr: function(input, start, length)
        {
            input = input != null ? String(input) : exit(arguments);
            
            // add length if negative, set zero if still negative
            start = start <= -1 ? (start = toInteger(start) + input.length) < 0 ? 0 : start : start;

            // implies parsing length
            return input.substr(start, length);
        },

        /**
         * prepends and appends <code>outfix</code> to <code>input</code>.
         * to do the opppsite use {@link Stryng.strip}.
         * @function Stryng.wrap
         * @param {string} input
         * @param {string} [outfix="undefined"]
         *   prefix and suffix
         * @param {number} [n=0]
         *   number of operations
         * @returns {string}
         * @requires {@link Stryng.repeat}
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        wrap: function(input, outfix, n)
        {
            if(input == null) exit(arguments);
            // implies parsing
            outfix = Stryng.repeat(outfix, n);
            return outfix + input + outfix;
        },

        /**
         * @function Stryng.count
         * @param {string} input
         * @param {string} [searchString="undefined"]
         *   substring to search for
         * @returns {number}
         *   number of non-overlapping occurrences of
         *   <code>searchString</code> within <code>input</code>.
         *   the empty string is considered a <em>character boundary</em>
         *   thus <code>input.length + 1</code> will always be the result for that.
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        count: function(input, searchString)
        {
            input = input != null ? String(input) : exit(arguments);

            searchString = String(searchString);

            // early exit for the empty searchString
            if(!searchString) return input.length + 1;

            var length = searchString.length,
                count = 0,
                i = -length; // fix first run

            do i = input.indexOf(searchString, i + length);
            while(i !== -1 && /* step */ ++count)

            return count;
        },

        /**
         * @function Stryng.count2
         * @deprecated slower - use {@link Stryng.count} instead
         * @todo test and benchmark across browsers
         */
        count2: function(input, searchString)
        {
            input = input != null ? String(input) : exit(arguments);

            searchString = String(searchString);

            // early exit for the empty searchString
            if(!searchString) return input.length + 1;

            var length = searchString.length,
                count = 0;

            if(length === 1)
            {
                for(var i = input.length; i--;)
                {
                    // cast from boolean to number
                    count += input.charAt(i) === searchString;
                }
            }
            else
            {
                for(var i = input.indexOf(searchString); i !== -1; count++)
                {
                    i = input.indexOf(searchString, i + length);
                }
            }

            return count;
        },

        /**
         * delegates to <code>Array.prototype.join</code>.
         * @function Stryng.join
         * @param {string} delimiter
         *   separator
         * @param {(...*|Array.<*>|Arguments.<*>)} [joinees=[]]
         *   <em>nestable</em>
         * @returns {string}
         *   <code>joinees</code> join by native <code>Array.prototype.join</code>.
         *   returns the empty string if no second, third .. argument is passed
         * @throws {Error}
         *   if <code>delimiter</code> is either <code>null</code> or <code>undefined</code>
         * @example
         * Stryng.join(' ', the', ['quick', ['brown', ['fox', ['jumps', ['over', ['the', ['lazy', ['dog']]]]]]]])
         * // returns 'the quick brown fox jumps over the lazy dog'
         */
        join: function(/* delimiter, strings... */)
        {
            var args = arguments, // promote compression
                delimiter = array_shift.call(args);

            if(delimiter == null) exit(args);
            if(!args.length) return '';

            return array_join.call( flatten(args), delimiter );
        },

        /**
         * @function Stryng.reverse
         * @param  {string} input
         * @returns {string}
         *   the reversed string. useful yet unefficient to verify palindroms.
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        reverse: function(input)
        {
            return input != null ?
                String(input)
                    .split('')
                    .reverse()
                    .join('')
                : exit(arguments);
        },

        /**
         * @function Stryng.reverse2
         * @deprecated slower - use {@link Stryng.reverse} instead
         * @todo test and benchmark across browsers
         */
        reverse2: function(input)
        {
            input = input != null ? String(input) : exit(arguments);

            for(var result = '', i = input.length; i--; result += input.charAt(i));

            return result;
        },

        /**
         * @function Stryng.reverse3
         * @deprecated slower - use {@link Stryng.reverse} instead
         * @todo
         *   test and benchmark across browsers. merge with {@link Stryng.reverse},
         *   this is fastest for strings of length < 15 on node
         */
        reverse3: function(input)
        {
            input = input != null ? String(input) : exit(arguments);

            var length = input.length;

            if(length < 2) return input;
            
            for(var i = --length; i--; input += input.charAt(i));

            return input.substring(length);
        },

        /**
         * @function Stryng.insert
         * @param {string} input
         * @param {number} [index=0] position where to insert.
         * @param {string} [insertion="undefined"]
         * @returns {string}
         *   <code>input</code> split at <code>index</code>
         *   and rejoined using <code>insertion</code> as the delimiter
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        insert: function(input, index, insertion)
        {
            input = input != null ? String(input) : exit(arguments);

            // slice's native parsing will apply different defaults to the first and second argument
            if(index === void 0) index = toInteger(index);

            // implies parsing insertion
            return input.slice(0, index) + insertion + input.slice(index);
        },

        /**
         * splits a string at the given indices.
         * @function Stryng.splitAt
         * @param {string} input
         * @param {...number} index
         *   indices to split at. negative indices allowed. have to be sorted
         *   (which can become cumbersome when dealing with negative indices).
         *   indices <acronym title="greater than or equal to">gte</acronym>
         *   <code>input.length</code> are ignored i.e. the argument list gets truncated
         * @returns {string[]}
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        splitAt: function(input /* indices */)
        {
            var args = arguments; // promote compression

            input = input != null ? String(input) : exit(args);

            var len = args.length,
                i = 1, // skip first argument
                p/* = 0 */, // slice's default already // pending index
                result  = [];

            do
            {
                // becomes undefined meaning input.length to slice in last run
                var q = args[i];

                // implies parsing
                result.push( input.slice(p, q) );

                // update pending index
                p = q;   

            } while(len > i++); // !== would do as well

            return result;
        },

        /**
         * @function Stryng.splitLeft
         * @param  {string} input
         * @param  {string} [delimiter="undefined"]
         * @param  {number} [n=4294967295]
         *   maximum number of split operations. defaults to <code>Math.pow(2, 32) - 1</code>
         *   as per [ecma-262/5.1]{@link http://www.ecma-international.org/ecma-262/5.1/#sec-15.5.4.14}
         * @returns {string[]}
         *   the <code>input</code> split by the given <code>delimiter</code>
         *   with anything past the <code>n</code>th occurrence of
         *   <code>delimiter</code> untouched yet included in the array.
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         * @example
         * Stryng.splitLeft('the quick brown fox jumps over the lazy dog', null, 3);
         * // returns ['the','quick','brown','fox jumps over the lazy dog']
         *
         * Stryng.splitLeft('the quick brown fox jumps over the lazy dog');
         * // returns the same as native split with space passed as the delimiter
         */
        splitLeft: function(input, delimiter, n)
        {
            input = input != null ? String(input) : exit(arguments);

            // Math.pow(2, 32) - 1 if undefined, toUint32(n) otherwise
            n = (n === void 0 ? -1 : n) >>> 0;

            // early exit for zero
            if(!n) return [];

            // delimiter gets parsed internally
            var result = input.split(delimiter),
                diff = result.length - n;

            if(diff > 0)
            {
                // the removed get rejoined and pushed as one
                result.push( result.splice(n, diff).join(delimiter) );    
            }

            return result;
        },

        /**
         * the right-associative version of {@link Stryng.splitLeft}
         * @function Stryng.splitRight
         * @param  {string} input
         * @param  {string} [delimiter="undefined"]
         * @param  {number} [n=4294967295]
         *   maximum number of split operations. negative values are regarded zero.
         *   defaults to the number of occurrences of <code>delimiter</code>
         * @returns {string[]}
         *   the <code>input</code> split by the given <code>delimiter</code>
         *   with anything in front of the <code>n</code>th occurrence of
         *   <code>delimiter</code> - counting backwards - untouched yet included in the array.
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        splitRight: function(input, delimiter, n)
        {
            input = input != null ? String(input) : exit(arguments);

            // Math.pow(2, 32) - 1 if undefined, toUint32(n) otherwise
            n = (n === void 0 ? -1 : n) >>> 0;

            // early exit for zero
            if(!n) return [];

            // delimiter gets parsed internally
            var result = input.split(delimiter),
                diff = result.length - n;

            if(diff > 0)
            {
                // the removed get rejoined and unshifted as one
                result.unshift( result.splice(0, diff).join(delimiter) );    
            }

            return result;
        },

        /**
         * @function Stryng.exchange
         * @param {string} input
         * @param {string} [replacee="undefined"] string to replace
         * @param {string} [replacement="undefined"] replacement
         * @returns {string}
         *   the <code>input</code> with all non-overlapping occurrences of
         *   <code>replacee</code> replaced by <code>replacement</code>.
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         * @see {@link Stryng.exchangeLeft}, {@link Stryng.exchangeRight}
         */
        exchange: function(input, replacee, replacement)
        {
            input = input != null ? String(input) : exit(arguments);

            // omit regex check
            
            replacee = String(replacee);
            replacement = String(replacement);

            // early exit for equality
            if(replacee === replacement) return input;

            // implies parsing
            return input.split(replacee).join(replacement);
        },

        /**
         * @function Stryng.exchangeLeft
         * @param {string} input
         * @param {string} [replacee="undefined"] string to replace
         * @param {string} [replacement="undefined"] replacement
         * @param {number} [n=4294967295]
         *   number of replacement operations. defaults to <code>Math.pow(2, 32) - 1</code>
         * @return {string}
         *   the <code>input</code> with <code>n</code> left-hand
         *   non-overlapping occurrences of <code>replacee</code>
         *   replaced by <code>replacement</code>
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         * @see {@link Stryng.exchangeRight}, {@link Stryng.exchange}
         */
        exchangeLeft: function(input, replacee, replacement, n)
        {
            input = input != null ? String(input) : exit(arguments);
            replacee = String(replacee);
            replacement = String(replacement);

            // early exit for equality
            if(replacee === replacement) return input;

            // implies parsing
            return Stryng.splitLeft(input, replacee, n).join(replacement);
        },

        /**
         * @function Stryng.exchangeRight
         * @param {string} input
         * @param {string} [replacee="undefined"] string to replace
         * @param {string} [replacement="undefined"] replacement
         * @param {number} [n=4294967295]
         *   number of replacement operations. defaults to <code>Math.pow(2, 32) - 1</code>
         * @return {string}
         *   the <code>input</code> with <code>n</code> right-hand
         *   non-overlapping occurrences of <code>replacee</code>
         *   replaced by <code>replacement</code>
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         * @see {@link Stryng.exchangeLeft}, {@link Stryng.exchange}
         */
        exchangeRight: function(input, replacee, replacement, n)
        {
            input = input != null ? String(input) : exit(arguments);
            replacee = String(replacee);
            replacement = String(replacement);

            // early exit for equality
            if(replacee === replacement) return input;

            // implies parsing
            return Stryng.splitRight(input, replacee, n).join(replacement);
        },

        /**
         * @function Stryng.padLeft
         * @param  {string} input
         * @param  {number} maxLength
         * @param  {string} padding
         * @return {string}
         *   the <code>input</code> with <code>padding</code>
         *   prepended as often as needed for <code>input</code>
         *   to reach but not exceed a length of <code>maxLength</code>
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         * @see {@link Stryng.padRight}, {@link Stryng.pad}
         */
        padLeft: function(input, maxLength, padding)
        {
            if(input == null || maxLength <= -1 || maxLength == 1/0) exit(arguments);

            input = String(input);
            padding = String(padding);
            maxLength = toInteger(maxLength);
            
            var iLength = input.length;

            // early exit for the empty padding
            if(maxLength <= iLength || !padding) return input;

            var pLength = padding.length;

            while(input.length + pLength <= maxLength)
            {
                input = padding + input;
            }

            return input;
        },

        padLeft2: function(input, maxLength, padding)
        {
            if(input == null || maxLength <= -1 || maxLength == 1/0) exit(arguments);

            input = String(input);
            padding = String(padding);
            maxLength = toInteger(maxLength);
            
            var iLength = input.length;

            // early exit for the empty padding
            if(maxLength <= iLength || !padding) return input;

            var pLength = padding.length,
                n = (maxLength - iLength) / pLength | 0;

            return Stryng.repeat(padding, n) + input;
        },

        /**
         * @function Stryng.padRight
         * @param  {string} input
         * @param  {number} maxLength
         * @param  {string} padding
         * @return {string}
         *   the <code>input</code> with <code>padding</code>
         *   appended as often as needed for <code>input</code>
         *   to reach but not exceed a length of <code>maxLength</code>
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         * @see {@link Stryng.padLeft}, {@link Stryng.pad}
         */
        padRight: function(input, maxLength, padding)
        {
            if(input == null || maxLength <= -1 || maxLength == 1/0) exit(arguments);

            input = String(input);
            padding = String(padding);
            maxLength = toInteger(maxLength);
            
            var iLength = input.length;

            // early exit for the empty padding
            if(maxLength <= iLength || !padding) return input;

            var pLength = padding.length;

            while(input.length + pLength <= maxLength)
            {
                input += padding;  
            }

            return input;
        },

        /**
         * @function Stryng.pad
         * @param  {string} input
         * @param  {number} maxLength
         * @param  {string} padding
         * @return {string}
         *   the <code>input</code> with <code>padding</code>
         *   appended as often as needed for <code>input</code>
         *   to reach but not exceed a length of <code>maxLength</code>
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         * @see {@link Stryng.padLeft}, {@link Stryng.padRight}
         */
        pad: function(input, maxLength, padding)
        {
            if(input == null || maxLength <= -1 || maxLength == 1/0) exit(arguments);

            input = String(input);
            padding = String(padding);
            maxLength = toInteger(maxLength);
            
            var iLength = input.length;

            // early exit for the empty padding
            if(maxLength <= iLength || !padding) return input;

            var pLength = padding.length << 1; // fast double

            while(input.length + pLength <= maxLength)
            {
                input = padding + input + padding;
            }

            return input;
        },

        /**
         * prepends the prefixes to the given string in the given order. works similar
         * to native <code>String.prototype.concat</code>.
         * @function Stryng.prepend
         * @param {string} input
         * @param {...string} prefix
         *   an arbitrary number of strings to prepend in the given order
         * @returns {string}
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         * @example
         * Stryng('!').prepend('World', ' ', 'Hello'); // returns 'Hello World!'
         *
         * // which equals the more intuitive (the former is faster)
         * ['!', 'World', ' ', 'Hello'].reverse().join('');
         */
        prepend: function(/* input, prefixes... */)
        {
            var args = arguments; // promote compression

            if(args[0] == null) exit(args);

            // append to reversely
            var i = args.length - 1,
                input = String(args[i]);

            // implies parsing
            while(i--) input += args[i];

            return input;
        },

        /**
         * @function Stryng.prepend2
         * @deprecated slower - use {@link Stryng.prepend} instead
         * @todo test and benchmark across browsers
         */
        prepend2: function(input /*, prefixes... */)
        {
            if(input == null) exit(arguments);
            return array_slice.call(arguments).reverse().join('');
        },

        /**
         * @function Stryng.prepend3
         * @deprecated slower - use {@link Stryng.prepend} instead
         * @todo test and benchmark across browsers
         */
        prepend3: function(input /*, prefixes... */)
        {
            if(input == null) exit(arguments);
            return function_call.apply(string_concat, array_slice.call(arguments).reverse());
        },

        /**
         * strips <code>prefix</code> from the left of <code>input</code>
         * <code>n</code> times. to strip <code>prefix</code> as long
         * as it remains a prefix to the result, pass <code>Infinity</code> or <code>1/0</code>.
         * @function Stryng.stripLeft
         * @param  {string} input
         * @param  {string} [prefix="undefined"]
         *   string to remove
         * @param  {number} [n=4294967295]
         *   number of operations. defaults to <code>Math.pow(2, 32) - 1</code>
         * @returns {string}
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         * @example
         * Stryng.stripLeft('lefty loosy', 'lefty ');
         * // returns 'loosy'
         *
         * Stryng.stripLeft('blubblubblub', 'blub');
         * // returns the empty string
         */
        stripLeft2: function(input, prefix, n)
        {
            input = input != null ? String(input) : exit(arguments);

            // Math.pow(2, 32) - 1 if undefined, toUint32(n) otherwise
            n = (n === void 0 ? -1 : n ) >>> 0;
            prefix = String(prefix);

            // early exit for zero and the empty prefix
            if(!n || !prefix) return input;

            var pLength = prefix.length,
                p = 0, // pending index
                i;
            
            do i = input.indexOf(prefix, p);
            while(n-- && i === p && /* step */(p += pLength));

            return p ? input.substring(p) : input;
        },

        /**
         * @function Stryng.stripLeft2
         * @deprecated use {@link Stryng.stripLeft} instead
         * @todo merge into {@link Stryng.stripLeft} for inputs of <code>n > 5</code> - faster
         * @todo test and benchmark across browsers
         */
        stripLeft3: function(input, prefix, n)
        {
            input = input != null ? String(input) : exit(arguments);

            // Math.pow(2, 32) - 1 if undefined, toUint32(n) otherwise
            n = n === void 0 ? -1 >>> 0 : n >>> 0;
            prefix = String(prefix);

            // early exit for zero and the empty prefix
            if(!n || !prefix) return input;

            var len = prefix.length;

            for(; n-- && !input.indexOf(prefix); input = input.substring(len));

            return input;
        },

        /**
         * @function Stryng.stripLeft3
         * @deprecated slowest - use {@link Stryng.stripLeft} instead
         * @todo test and benchmark across browsers
         */
        stripLeft: function(input, prefix, n)
        {
            input = input != null ? String(input) : exit(arguments);

            // Math.pow(2, 32) - 1 if undefined, toUint32(n) otherwise
            n = n === void 0 ? -1 >>> 0 : n >>> 0;
            prefix = String(prefix);

            // early exit
            if(!n || !prefix) return input;

            var iLength = input.length,
                pLength = prefix.length,
                pLastIndex = pLength - 1,
                i = -1, j, k = 0;
                
            while(++i !== iLength)
            {
                j = i % pLength;

                if(input.charAt(i) === prefix.charAt(j))
                {
                    if(j === pLastIndex)
                    {
                        if(!n--)
                        {
                            break;
                        }

                        k += pLength;
                    }
                    else
                    {
                        // continue
                    }
                }
                else
                {
                    break;
                } 
            }

            return k ? input.substring(k) : input;
        },

        /**
         * the right-associative version of {@link Stryng.stripLeft}
         * @function Stryng.stripRight
         * @param  {string} input
         * @param  {string} [suffix="undefined"]
         *   string to remove
         * @param  {number} [n=4294967295]
         *   number of operations. defaults to <code>Math.pow(2, 32) - 1</code>
         * @returns {string}
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        stripRight: function(input, suffix, n)
        {
            input = input != null ? String(input) : exit(arguments);

            // Math.pow(2, 32) - 1 if undefined, toUint32(n) otherwise
            n = n === void 0 ? -1 >>> 0 : n >>> 0;
            suffix = String(suffix);

            // early exit for zero and the empty suffix
            if(!n || !suffix) return input;

            var sLength = suffix.length,
                i, p = input.length; // pending index
            
            do
            {
                p -= sLength;
                i = input.lastIndexOf(suffix, p);
            }
            while(n-- && i !== -1 && i === p);

            return input.substring(0, p + sLength);
        },

        /**
         * the combination of {@link Stryng.stripLeft} and {@link Stryng.stripRight}
         * @function Stryng.strip
         * @param  {string} input
         * @param  {string} outfix - string to remove
         * @param  {number} [n=1]  - parsed by {@link Stryng.toInt}.
         *                           number of operations (recursion depth)
         * @returns {string}
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        strip: function(input, outfix, n)
        {
            return Stryng.stripRight( Stryng.stripLeft( input, outfix, n ), outfix, n );
        },

        /**
         * securely removes all HTML tags by preserving any quoted contents 
         * @function Stryng.stripHTMLTags
         * @param  {string} input - HTML
         * @returns {string}       - <code>input</code> with HTML-tags removed
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         * @todo fasten
         */
        stripHTMLTags: function(input)
        {
            var mem = [],
                i = 0;

            return input

                .replace(/("|')(?:\\\1|[^(?:\1)])*\1/g, function(match){

                    mem[i] = match;
                    return '_' + (i++) + '_';
                })

                .replace(/<(\w+) [^>]*>([\s\S]*)<\/\1>/g, '')

                .replace(/_(\d+)_/g, function(match, i){

                    return mem[i];
                });
        },

        /**
         * @function Stryng.quote
         * @param {string} input
         * @returns {string}
         *   the <code>input</code> wrapped in double quotes
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        
        // JSON && JSON.stringify && function(input){ return input != null ? '"' + JSON.stringify(input) + '"' : exit(arguments) } ||
        quote: function(input){

            input = input != null ? String(input) : exit(arguments);

            var specialEscapeMap =
            {
                // breaks jsdoc (?)
                // "\'" : "\\'",  // single quote
                // "\"" : "\\\"", // double quote
                // "\\" : "\\\\", // backslash
                // "\n" : "\\n",  // new line
                // "\r" : "\\r",  // carriage return
                // "\t" : "\\t",  // tab
                // "\b" : "\\b",  // backspace
                // "\f" : "\\f"   // form feed
            };

            var result = '',
                length = input.length,
                i = -1;

            while(++i !== length)
            {
                var chr = input.charAt(i);

                if(specialEscapeMap.hasOwnProperty(chr))
                {
                    result += specialEscapeMap[chr];
                }
                else
                {
                    var code = chr.charCodeAt(0);

                    if(32 > code || code > 126)
                    {
                        result += (code < 256
                            ? '\\x' + (code < 16 ? '0' : '')
                            : '\\u' + (code < 4096 ? '0' : '')
                        ) + code.toString(16);
                    }
                    else
                    {
                        result += chr;
                    }
                }
            }

            return '"' + result + '"';
        },

        /**
         * @function Stryng.unquote
         * @param {string} input
         * @returns {string}
         *   the <code>input</code> with all leading and trailing, single and double quotes removed.
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        unquote: function(input)
        {
            return input != null ?
                Stryng(input)
                    .strip('"', 1)
                    .toString()
                    .replace(/\\([\"\'\\nrtbf]|[xu]([0-9a-f]{2,4}))/g, function(match, postSlash, hex){
                        return hex ? string_fromCharCode(parseInt(hex, 16)) : match // TODO mirror specialEscapeMap
                    })
                : exit(arguments);
        },

        /**
         * @function Stryng.isEqual
         * @param  {string} input
         * @param  {...string} [comparable="undefined"]
         *   strings to compare with
         * @returns {boolean}
         *   whether or not <code>input</code> strictly equal the
         *   string representation of all <code>comparable</code>s
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        isEqual: function(input /* comparables */)
        {
            var args = arguments; // promote compression
            input = input != null ? String(input) : exit(args);

            var i = args.length;

            // early exit if no comparables passed
            if(i === 1) return input === "undefined";
            
            // skips first argument
            while( 1 !== i-- && input === String(args[i]));
            
            return !i;
        },

        isEqual2: function(input /* comparables */)
        {
            var args = arguments; // promote compression
            input = input != null ? String(input) : exit(args);
            return Stryng.repeat(input, args.length) === array_join.call(args, '');
        },

        isEqual3: function(/* comparables */)
        {
            var args = arguments, // promote compression
                input = array_shift.call(args);

            input = input != null ? String(input) : exit(args);

            var i = args.length;

            // early exit if no comparables passed
            if(!i) return input === "undefined";
            
            // skips first argument
            while( i-- && input === String(args[i]));
            
            return !i;
        },

        isEqual4: function(input)
        {
            var args = arguments;
            if(input == null) exit(args);
            var i = (args.length + 1) / 2 | 0;
            return array_slice.call(args, 0, i).join('') === array_slice.call(args, i).join('');
        },

        /**
         * case-insensitive version of {@link Stryng.isEqual}
         * @function Stryng.isEquali
         * @param {string} input
         * @param {...string} [comp="undefined"]
         *   strings to compare with. default match is
         * @returns {boolean}
         * @throws {Error}
         *   if <code>input</code> is either <code>null</code> or <code>undefined</code>
         */
        isEquali: function(input /*comparables */)
        {
            var args = arguments; // promote compression
            input = input != null ? String(input).toLowerCase() : exit(args);

            var i = args.length;

            // early exit if no comparables passed
            if(i === 1) return input === "undefined";
            
            // skips first argument
            while( 1 !== i-- && input === String(args[i]).toLowerCase());
            
            return !i;
        },

        isEquali2: function(/* input, comparables */)
        {
            // workaround an Array#map polyfill
            array_forEach.call(arguments, function(arg, i, args){
                args[i] = String(arg).toLowerCase();
            });
            return Stryng.isEqual.apply(null, arguments)
        },

        /**
         * wraps access to <code>input.length</code>.
         * @function Stryng.len
         * @param {string} input
         * @returns {number} <code>input.length</code>
         * @throws {Error} if any required argument is missing
         * @example usage:
         * var pangram = ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog'];
         *  
         * pangram.map(Stryng.len) == pluck(pangram, 'length')
         * // returns true - given the pluck is implemented somewhere
         */
        len: function(input) // "length" is a reserved Function property
        {
            return input != null ? String(input).length : exit(arguments);
        },

        /**
         * @function Stryng.isEmpty
         * @param  {string}  input
         * @returns {boolean} whether the string has length <code>0</code>
         * @throws {Error} if any required argument is missing
         */
        isEmpty: function(input)
        {
            return input != null ? !String(input) : exit(arguments);
        },

        /**
         * @function Stryng.isBlank
         * @param  {string}  input
         * @returns {boolean}
         *   whether the string is empty
         *   or consists only of whitespace characters
         * @throws {Error}
         *   if any required argument is missing
         */
        isBlank: function(input)
        {
            input = input != null ? String(input) : exit(arguments);
            return !input || !reNoWS.test(input);
        },

        /**
         * @function Stryng.isNumeric
         * @param  {string}  input
         * @returns {boolean} whether the string is numeric
         * @throws {Error} if any required argument is missingsssss
         */
        isNumeric: function(input)
        {
            input = input != null ? String(input) : exit(arguments);

            // exclude the empty string
            return input && (input = +input) === input;
        },
        
        /**
         * @function Stryng.truncate
         * @param  {string} input
         * @param  {number} maxLength
         * @param  {string} [ellipsis="..."]
         * @returns {string}
         *   the <code>input</code> sliced to fit the given
         *   <code>maxLength</code> including the <code>ellipsis</code>
         * @todo how to handle situations where ellipsis is longer than input?
         * @todo <code>exact</code> not yet implemented
         */
        truncate: function(input, maxLength, ellipsis)
        {
            if(input == null || maxLength <= -1 || maxLength == 1/0) exit(arguments);

            input = String(input);
            maxLength = toInteger(maxLength);
            
            var iLength = input.length;

            if(maxLength >= iLength) return input;
            
            ellipsis = ellipsis != null ? String(ellipsis) : '...';

            var eLength = ellipsis.length;

            if(eLength > maxLength) return ellipsis.slice(-maxLength);

            return input.substring(0, maxLength - eLength) + ellipsis;
        },
        
        /**
         * generates a string of random characters
         * which default to the ASCII printables. to choose randomly
         * from the whole Unicode table call <code>Stryng.random(n, 0, -1)</code>
         * @function Stryng.random
         * @param {number} n
         * @param {number} [from=32]
         * @param {number} [to=126]
         * @returns {string}
         *   string of length <code>n</code> with characters
         *   randomly choosen from the Unicode table with
         *   code-range [<code>from</code>, <code>to</code>]
         */
        random: function(n, from, to)
        {
            if(n <= -1 || n == 1/0) exit(arguments);

            n = toInteger(n);

            // printable ASCII characters by default
            from = from === void 0 ? 32  : from >>> 0;
            to   = to   === void 0 ? 126 : to   >>> 0;

            var result = '',
                diff = to - from;

            if(diff > 0)
            {
                while(n--)
                {
                    result += string_fromCharCode(from + math_random() * diff | 0);
                }
            }

            return result;
        },

        /**
         * @function Stryng.randomOf
         * @param  {number} [n=0]
         * @param  {string} [charset="undefined"]
         * @return {string}
         *   string of length <code>n</code>
         *   with characters randomly choosen from <code>charset</code>
         */
        randomOf: function(n, charset)
        {
            if(n <= -1 || n == 1/0) exit(arguments);

            n = toInteger(n);
            charset = String(charset).split('');

            var result = '',
                length = charset.length;

            while(n--)
            {
                result += charset[random() * length | 0];
            }

            return result;
        },

        ord: function(input)
        {
            input = input != null ? String(input) : exit(arguments);
            
            var result = [],
                length = input.length,
                i = -1;

            while(++i !== length) result[i] = input.charCodeAt(i);

            return result;
        },

        /**
         * formats the given number to a human readable form.
         * uses <code>Number.prototype.toFixed</code> internally
         * which however does not work correctly in every browser.
         * if yours is such an edge case, please refer to Kris Kowal's
         * [ECMA5]{@link https://github.com/kriskowal/es5-shim/blob/master/es5-shim.js}
         * monkey patch.
         * @param  {(number|*)} n            
         *   to be formatted. parsed by {@link Stryng.toFloat}
         * @param  {number} [f=2]
         *   number of fraction digits to preserve.
         *   parsed by {@link Stryng.toNat}.
         * @param  {string} [digitSeparator=',']
         *   character used to separate
         *   groups of three digits (thousands)
         * @param  {string} [fractionSeparator='.']
         *   character used to separate the
         *   fraction part.
         * @returns {string}
         *   number in legible form
         */
        formatNumber: function(n, f, digitSeparator, fractionSeparator)
        {
            n = toFloat(n);

            if(!isFinite(n))
            {
                return '&#8734;'; // unicode for Infinity
            }

            f = toNat(f, 2);
            digitSeparator = digitSeparator || ',';
            fractionSeparator = fractionSeparator || '.';

            var parts  = n.toFixed(f).split('.'),
                result = parts[0].split(''),
                sign   = n < 0 ? result.shift() : '',
                frac   = parts[1],
                i      = result.length - 3;

            // insert delimiters in steps of three
            for(; i > 0; i -= 3)
            {
                result.splice(i, 0, digitSeparator);
            }

            if(f !== 0)
            {
                result.push(fractionSeparator, frac);
            }

            result.unshift(sign);

            return result.join('');
        }
    };

    /////////////////
    // shim substr //
    /////////////////

    if('ab'.substr(-1) !== 'b') shimMethods.push('substr');

    /////////////
    // foreign //
    /////////////

    array_forEach.call( object_keys(StryngGenerics), function(fnName){
        
        var fn = StryngGenerics[fnName];

        fn._name = fnName;

        // static methods
        Stryng[fnName] = fn;

        // instance methods
        Stryng.prototype[fnName] = function()
        {
            // prepend the context
            array_unshift.call(arguments, this._value);

            var result = fn.apply(null, arguments);

            // enhance method chaining by returning
            // the wrapped object if the result is a string
            // typeof check is sufficient
            if(typeof result === 'string') // is.String(result))
            {
                this._value = result;
                return this;
            }

            return result;
        };
    });

    ////////////
    // native //
    ////////////
    
    array_forEach.call(methods, function(fnName){

        var fn = VERSION[fnName];

        if(is.Function(fn) && !array_contains.call(shimMethods, fnName))
        {
            // static methods
            Stryng[fnName] = function(input /* arguments */)
            {
                if(input == null) exit(arguments);

                // Function#call uses the global object as the default context
                return function_call.apply(fn, arguments);
            };

            // make custom exit work
            Stryng[fnName]._name = fnName;

            // instance methods
            Stryng.prototype[fnName] = function()
            {
                var result = fn.apply(this._value, arguments);

                // enhance method chaining by returning
                // the wrapped object if the result is a string
                // typeof check is sufficient
                if(typeof result === 'string') // is.String(result))
                {
                    this._value = result;
                    return this;
                }
                return result;
            };
        }
    });

    ////////////////////////////
    // shadow Object#toString //
    ////////////////////////////
    
    Stryng.prototype.value =
    Stryng.prototype.toString = function(){ return this._value }

    /////////////////////////////
    // purely static functions //
    /////////////////////////////

    /**
     * delegates to native [String.fromCharCode]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/fromCharCode}.
     * will <strong>not</strong> be available on Stryng instances.
     * @function Stryng.chr
     * @param {...number} charCode
     * @returns {string}
     *   the concatenated <code>Stryng</code> representations of the given
     *   <code>charCode</code>s from the UTF-16 table
     * @example
     * // returns "Hello World"
     * var stryng = Stryng.chr(72, 101, 108, 2, 111, 32, 87, 111, 114, 108, 100);
     * // returns true
     * stryng instanceof Stryng
     * // to not wrap use native
     * var string = Stryng.fromCharCode.apply(null, [72, 101, 108, 2, 111, 32, 87, 111, 114, 108, 100])
     * // returns false
     * string instanceof Stryng
     * // returns "string"
     * typeof string
     */
    Stryng.chr = function(/* charCodes,... */)
    {
        return Stryng( string_fromCharCode.apply(null, arguments) );
    };

    Stryng.fromCharCode = string_fromCharCode;

    /////////////
    // aliases //
    /////////////

    array_forEach.call( object_keys(StryngGenerics), function(fnName){
  
        var alias = Stryng(fnName);

        if(alias.endsWith('Left'))
        {
            alias = alias.stripRight('Left').prepend('l');

            Stryng[alias] = Stryng[fnName];
            Stryng.prototype[alias] = Stryng.prototype[fnName];
        }
        else if(alias.endsWith('Right'))
        {
            alias = alias.stripRight('Right').prepend('r');

            Stryng[alias] = Stryng[fnName];
            Stryng.prototype[alias] = Stryng.prototype[fnName];
        }
    });

    Stryng.echo = Stryng.repeat;
    Stryng.prototype.echo = Stryng.prototype.repeat;

    /**
     * delegates to native <code>String.prototype.concat</code>
     * @function Stying.append
     * @param {...string} input
     * @returns {string}
     */
    Stryng.append = Stryng.concat;
    Stryng.prototype.append = Stryng.prototype.concat;

    //////////////////////////
    // expose Stryng object //
    //////////////////////////

    return Stryng;

});
},{}],2:[function(require,module,exports){
var Buffer=require("__browserify_Buffer").Buffer;
(function (global, module) {

  if ('undefined' == typeof module) {
    var module = { exports: {} }
      , exports = module.exports
  }

  /**
   * Exports.
   */

  module.exports = expect;
  expect.Assertion = Assertion;

  /**
   * Exports version.
   */

  expect.version = '0.1.2';

  /**
   * Possible assertion flags.
   */

  var flags = {
      not: ['to', 'be', 'have', 'include', 'only']
    , to: ['be', 'have', 'include', 'only', 'not']
    , only: ['have']
    , have: ['own']
    , be: ['an']
  };

  function expect (obj) {
    return new Assertion(obj);
  }

  /**
   * Constructor
   *
   * @api private
   */

  function Assertion (obj, flag, parent) {
    this.obj = obj;
    this.flags = {};

    if (undefined != parent) {
      this.flags[flag] = true;

      for (var i in parent.flags) {
        if (parent.flags.hasOwnProperty(i)) {
          this.flags[i] = true;
        }
      }
    }

    var $flags = flag ? flags[flag] : keys(flags)
      , self = this

    if ($flags) {
      for (var i = 0, l = $flags.length; i < l; i++) {
        // avoid recursion
        if (this.flags[$flags[i]]) continue;

        var name = $flags[i]
          , assertion = new Assertion(this.obj, name, this)

        if ('function' == typeof Assertion.prototype[name]) {
          // clone the function, make sure we dont touch the prot reference
          var old = this[name];
          this[name] = function () {
            return old.apply(self, arguments);
          }

          for (var fn in Assertion.prototype) {
            if (Assertion.prototype.hasOwnProperty(fn) && fn != name) {
              this[name][fn] = bind(assertion[fn], assertion);
            }
          }
        } else {
          this[name] = assertion;
        }
      }
    }
  };

  /**
   * Performs an assertion
   *
   * @api private
   */

  Assertion.prototype.assert = function (truth, msg, error) {
    var msg = this.flags.not ? error : msg
      , ok = this.flags.not ? !truth : truth;

    if (!ok) {
      throw new Error(msg.call(this));
    }

    this.and = new Assertion(this.obj);
  };

  /**
   * Check if the value is truthy
   *
   * @api public
   */

  Assertion.prototype.ok = function () {
    this.assert(
        !!this.obj
      , function(){ return 'expected ' + i(this.obj) + ' to be truthy' }
      , function(){ return 'expected ' + i(this.obj) + ' to be falsy' });
  };

  /**
   * Assert that the function throws.
   *
   * @param {Function|RegExp} callback, or regexp to match error string against
   * @api public
   */

  Assertion.prototype.throwError =
  Assertion.prototype.throwException = function (fn) {
    expect(this.obj).to.be.a('function');

    var thrown = false
      , not = this.flags.not

    try {
      this.obj();
    } catch (e) {
      if ('function' == typeof fn) {
        fn(e);
      } else if ('object' == typeof fn) {
        var subject = 'string' == typeof e ? e : e.message;
        if (not) {
          expect(subject).to.not.match(fn);
        } else {
          expect(subject).to.match(fn);
        }
      }
      thrown = true;
    }

    if ('object' == typeof fn && not) {
      // in the presence of a matcher, ensure the `not` only applies to
      // the matching.
      this.flags.not = false;
    }

    var name = this.obj.name || 'fn';
    this.assert(
        thrown
      , function(){ return 'expected ' + name + ' to throw an exception' }
      , function(){ return 'expected ' + name + ' not to throw an exception' });
  };

  /**
   * Checks if the array is empty.
   *
   * @api public
   */

  Assertion.prototype.empty = function () {
    var expectation;

    if ('object' == typeof this.obj && null !== this.obj && !isArray(this.obj)) {
      if ('number' == typeof this.obj.length) {
        expectation = !this.obj.length;
      } else {
        expectation = !keys(this.obj).length;
      }
    } else {
      if ('string' != typeof this.obj) {
        expect(this.obj).to.be.an('object');
      }

      expect(this.obj).to.have.property('length');
      expectation = !this.obj.length;
    }

    this.assert(
        expectation
      , function(){ return 'expected ' + i(this.obj) + ' to be empty' }
      , function(){ return 'expected ' + i(this.obj) + ' to not be empty' });
    return this;
  };

  /**
   * Checks if the obj exactly equals another.
   *
   * @api public
   */

  Assertion.prototype.be =
  Assertion.prototype.equal = function (obj) {
    this.assert(
        obj === this.obj
      , function(){ return 'expected ' + i(this.obj) + ' to equal ' + i(obj) }
      , function(){ return 'expected ' + i(this.obj) + ' to not equal ' + i(obj) });
    return this;
  };

  /**
   * Checks if the obj sortof equals another.
   *
   * @api public
   */

  Assertion.prototype.eql = function (obj) {
    this.assert(
        expect.eql(obj, this.obj)
      , function(){ return 'expected ' + i(this.obj) + ' to sort of equal ' + i(obj) }
      , function(){ return 'expected ' + i(this.obj) + ' to sort of not equal ' + i(obj) });
    return this;
  };

  /**
   * Assert within start to finish (inclusive).
   *
   * @param {Number} start
   * @param {Number} finish
   * @api public
   */

  Assertion.prototype.within = function (start, finish) {
    var range = start + '..' + finish;
    this.assert(
        this.obj >= start && this.obj <= finish
      , function(){ return 'expected ' + i(this.obj) + ' to be within ' + range }
      , function(){ return 'expected ' + i(this.obj) + ' to not be within ' + range });
    return this;
  };

  /**
   * Assert typeof / instance of
   *
   * @api public
   */

  Assertion.prototype.a =
  Assertion.prototype.an = function (type) {
    if ('string' == typeof type) {
      // proper english in error msg
      var n = /^[aeiou]/.test(type) ? 'n' : '';

      // typeof with support for 'array'
      this.assert(
          'array' == type ? isArray(this.obj) :
            'object' == type
              ? 'object' == typeof this.obj && null !== this.obj
              : type == typeof this.obj
        , function(){ return 'expected ' + i(this.obj) + ' to be a' + n + ' ' + type }
        , function(){ return 'expected ' + i(this.obj) + ' not to be a' + n + ' ' + type });
    } else {
      // instanceof
      var name = type.name || 'supplied constructor';
      this.assert(
          this.obj instanceof type
        , function(){ return 'expected ' + i(this.obj) + ' to be an instance of ' + name }
        , function(){ return 'expected ' + i(this.obj) + ' not to be an instance of ' + name });
    }

    return this;
  };

  /**
   * Assert numeric value above _n_.
   *
   * @param {Number} n
   * @api public
   */

  Assertion.prototype.greaterThan =
  Assertion.prototype.above = function (n) {
    this.assert(
        this.obj > n
      , function(){ return 'expected ' + i(this.obj) + ' to be above ' + n }
      , function(){ return 'expected ' + i(this.obj) + ' to be below ' + n });
    return this;
  };

  /**
   * Assert numeric value below _n_.
   *
   * @param {Number} n
   * @api public
   */

  Assertion.prototype.lessThan =
  Assertion.prototype.below = function (n) {
    this.assert(
        this.obj < n
      , function(){ return 'expected ' + i(this.obj) + ' to be below ' + n }
      , function(){ return 'expected ' + i(this.obj) + ' to be above ' + n });
    return this;
  };

  /**
   * Assert string value matches _regexp_.
   *
   * @param {RegExp} regexp
   * @api public
   */

  Assertion.prototype.match = function (regexp) {
    this.assert(
        regexp.exec(this.obj)
      , function(){ return 'expected ' + i(this.obj) + ' to match ' + regexp }
      , function(){ return 'expected ' + i(this.obj) + ' not to match ' + regexp });
    return this;
  };

  /**
   * Assert property "length" exists and has value of _n_.
   *
   * @param {Number} n
   * @api public
   */

  Assertion.prototype.length = function (n) {
    expect(this.obj).to.have.property('length');
    var len = this.obj.length;
    this.assert(
        n == len
      , function(){ return 'expected ' + i(this.obj) + ' to have a length of ' + n + ' but got ' + len }
      , function(){ return 'expected ' + i(this.obj) + ' to not have a length of ' + len });
    return this;
  };

  /**
   * Assert property _name_ exists, with optional _val_.
   *
   * @param {String} name
   * @param {Mixed} val
   * @api public
   */

  Assertion.prototype.property = function (name, val) {
    if (this.flags.own) {
      this.assert(
          Object.prototype.hasOwnProperty.call(this.obj, name)
        , function(){ return 'expected ' + i(this.obj) + ' to have own property ' + i(name) }
        , function(){ return 'expected ' + i(this.obj) + ' to not have own property ' + i(name) });
      return this;
    }

    if (this.flags.not && undefined !== val) {
      if (undefined === this.obj[name]) {
        throw new Error(i(this.obj) + ' has no property ' + i(name));
      }
    } else {
      var hasProp;
      try {
        hasProp = name in this.obj
      } catch (e) {
        hasProp = undefined !== this.obj[name]
      }

      this.assert(
          hasProp
        , function(){ return 'expected ' + i(this.obj) + ' to have a property ' + i(name) }
        , function(){ return 'expected ' + i(this.obj) + ' to not have a property ' + i(name) });
    }

    if (undefined !== val) {
      this.assert(
          val === this.obj[name]
        , function(){ return 'expected ' + i(this.obj) + ' to have a property ' + i(name)
          + ' of ' + i(val) + ', but got ' + i(this.obj[name]) }
        , function(){ return 'expected ' + i(this.obj) + ' to not have a property ' + i(name)
          + ' of ' + i(val) });
    }

    this.obj = this.obj[name];
    return this;
  };

  /**
   * Assert that the array contains _obj_ or string contains _obj_.
   *
   * @param {Mixed} obj|string
   * @api public
   */

  Assertion.prototype.string =
  Assertion.prototype.contain = function (obj) {
    if ('string' == typeof this.obj) {
      this.assert(
          ~this.obj.indexOf(obj)
        , function(){ return 'expected ' + i(this.obj) + ' to contain ' + i(obj) }
        , function(){ return 'expected ' + i(this.obj) + ' to not contain ' + i(obj) });
    } else {
      this.assert(
          ~indexOf(this.obj, obj)
        , function(){ return 'expected ' + i(this.obj) + ' to contain ' + i(obj) }
        , function(){ return 'expected ' + i(this.obj) + ' to not contain ' + i(obj) });
    }
    return this;
  };

  /**
   * Assert exact keys or inclusion of keys by using
   * the `.own` modifier.
   *
   * @param {Array|String ...} keys
   * @api public
   */

  Assertion.prototype.key =
  Assertion.prototype.keys = function ($keys) {
    var str
      , ok = true;

    $keys = isArray($keys)
      ? $keys
      : Array.prototype.slice.call(arguments);

    if (!$keys.length) throw new Error('keys required');

    var actual = keys(this.obj)
      , len = $keys.length;

    // Inclusion
    ok = every($keys, function (key) {
      return ~indexOf(actual, key);
    });

    // Strict
    if (!this.flags.not && this.flags.only) {
      ok = ok && $keys.length == actual.length;
    }

    // Key string
    if (len > 1) {
      $keys = map($keys, function (key) {
        return i(key);
      });
      var last = $keys.pop();
      str = $keys.join(', ') + ', and ' + last;
    } else {
      str = i($keys[0]);
    }

    // Form
    str = (len > 1 ? 'keys ' : 'key ') + str;

    // Have / include
    str = (!this.flags.only ? 'include ' : 'only have ') + str;

    // Assertion
    this.assert(
        ok
      , function(){ return 'expected ' + i(this.obj) + ' to ' + str }
      , function(){ return 'expected ' + i(this.obj) + ' to not ' + str });

    return this;
  };
  /**
   * Assert a failure.
   *
   * @param {String ...} custom message
   * @api public
   */
  Assertion.prototype.fail = function (msg) {
    msg = msg || "explicit failure";
    this.assert(false, msg, msg);
    return this;
  };

  /**
   * Function bind implementation.
   */

  function bind (fn, scope) {
    return function () {
      return fn.apply(scope, arguments);
    }
  }

  /**
   * Array every compatibility
   *
   * @see bit.ly/5Fq1N2
   * @api public
   */

  function every (arr, fn, thisObj) {
    var scope = thisObj || global;
    for (var i = 0, j = arr.length; i < j; ++i) {
      if (!fn.call(scope, arr[i], i, arr)) {
        return false;
      }
    }
    return true;
  };

  /**
   * Array indexOf compatibility.
   *
   * @see bit.ly/a5Dxa2
   * @api public
   */

  function indexOf (arr, o, i) {
    if (Array.prototype.indexOf) {
      return Array.prototype.indexOf.call(arr, o, i);
    }

    if (arr.length === undefined) {
      return -1;
    }

    for (var j = arr.length, i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0
        ; i < j && arr[i] !== o; i++);

    return j <= i ? -1 : i;
  };

  // https://gist.github.com/1044128/
  var getOuterHTML = function(element) {
    if ('outerHTML' in element) return element.outerHTML;
    var ns = "http://www.w3.org/1999/xhtml";
    var container = document.createElementNS(ns, '_');
    var elemProto = (window.HTMLElement || window.Element).prototype;
    var xmlSerializer = new XMLSerializer();
    var html;
    if (document.xmlVersion) {
      return xmlSerializer.serializeToString(element);
    } else {
      container.appendChild(element.cloneNode(false));
      html = container.innerHTML.replace('><', '>' + element.innerHTML + '<');
      container.innerHTML = '';
      return html;
    }
  };

  // Returns true if object is a DOM element.
  var isDOMElement = function (object) {
    if (typeof HTMLElement === 'object') {
      return object instanceof HTMLElement;
    } else {
      return object &&
        typeof object === 'object' &&
        object.nodeType === 1 &&
        typeof object.nodeName === 'string';
    }
  };

  /**
   * Inspects an object.
   *
   * @see taken from node.js `util` module (copyright Joyent, MIT license)
   * @api private
   */

  function i (obj, showHidden, depth) {
    var seen = [];

    function stylize (str) {
      return str;
    };

    function format (value, recurseTimes) {
      // Provide a hook for user-specified inspect functions.
      // Check that value is an object with an inspect function on it
      if (value && typeof value.inspect === 'function' &&
          // Filter out the util module, it's inspect function is special
          value !== exports &&
          // Also filter out any prototype objects using the circular check.
          !(value.constructor && value.constructor.prototype === value)) {
        return value.inspect(recurseTimes);
      }

      // Primitive types cannot have properties
      switch (typeof value) {
        case 'undefined':
          return stylize('undefined', 'undefined');

        case 'string':
          var simple = '\'' + json.stringify(value).replace(/^"|"$/g, '')
                                                   .replace(/'/g, "\\'")
                                                   .replace(/\\"/g, '"') + '\'';
          return stylize(simple, 'string');

        case 'number':
          return stylize('' + value, 'number');

        case 'boolean':
          return stylize('' + value, 'boolean');
      }
      // For some reason typeof null is "object", so special case here.
      if (value === null) {
        return stylize('null', 'null');
      }

      if (isDOMElement(value)) {
        return getOuterHTML(value);
      }

      // Look up the keys of the object.
      var visible_keys = keys(value);
      var $keys = showHidden ? Object.getOwnPropertyNames(value) : visible_keys;

      // Functions without properties can be shortcutted.
      if (typeof value === 'function' && $keys.length === 0) {
        if (isRegExp(value)) {
          return stylize('' + value, 'regexp');
        } else {
          var name = value.name ? ': ' + value.name : '';
          return stylize('[Function' + name + ']', 'special');
        }
      }

      // Dates without properties can be shortcutted
      if (isDate(value) && $keys.length === 0) {
        return stylize(value.toUTCString(), 'date');
      }

      var base, type, braces;
      // Determine the object type
      if (isArray(value)) {
        type = 'Array';
        braces = ['[', ']'];
      } else {
        type = 'Object';
        braces = ['{', '}'];
      }

      // Make functions say that they are functions
      if (typeof value === 'function') {
        var n = value.name ? ': ' + value.name : '';
        base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
      } else {
        base = '';
      }

      // Make dates with properties first say the date
      if (isDate(value)) {
        base = ' ' + value.toUTCString();
      }

      if ($keys.length === 0) {
        return braces[0] + base + braces[1];
      }

      if (recurseTimes < 0) {
        if (isRegExp(value)) {
          return stylize('' + value, 'regexp');
        } else {
          return stylize('[Object]', 'special');
        }
      }

      seen.push(value);

      var output = map($keys, function (key) {
        var name, str;
        if (value.__lookupGetter__) {
          if (value.__lookupGetter__(key)) {
            if (value.__lookupSetter__(key)) {
              str = stylize('[Getter/Setter]', 'special');
            } else {
              str = stylize('[Getter]', 'special');
            }
          } else {
            if (value.__lookupSetter__(key)) {
              str = stylize('[Setter]', 'special');
            }
          }
        }
        if (indexOf(visible_keys, key) < 0) {
          name = '[' + key + ']';
        }
        if (!str) {
          if (indexOf(seen, value[key]) < 0) {
            if (recurseTimes === null) {
              str = format(value[key]);
            } else {
              str = format(value[key], recurseTimes - 1);
            }
            if (str.indexOf('\n') > -1) {
              if (isArray(value)) {
                str = map(str.split('\n'), function (line) {
                  return '  ' + line;
                }).join('\n').substr(2);
              } else {
                str = '\n' + map(str.split('\n'), function (line) {
                  return '   ' + line;
                }).join('\n');
              }
            }
          } else {
            str = stylize('[Circular]', 'special');
          }
        }
        if (typeof name === 'undefined') {
          if (type === 'Array' && key.match(/^\d+$/)) {
            return str;
          }
          name = json.stringify('' + key);
          if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
            name = name.substr(1, name.length - 2);
            name = stylize(name, 'name');
          } else {
            name = name.replace(/'/g, "\\'")
                       .replace(/\\"/g, '"')
                       .replace(/(^"|"$)/g, "'");
            name = stylize(name, 'string');
          }
        }

        return name + ': ' + str;
      });

      seen.pop();

      var numLinesEst = 0;
      var length = reduce(output, function (prev, cur) {
        numLinesEst++;
        if (indexOf(cur, '\n') >= 0) numLinesEst++;
        return prev + cur.length + 1;
      }, 0);

      if (length > 50) {
        output = braces[0] +
                 (base === '' ? '' : base + '\n ') +
                 ' ' +
                 output.join(',\n  ') +
                 ' ' +
                 braces[1];

      } else {
        output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
      }

      return output;
    }
    return format(obj, (typeof depth === 'undefined' ? 2 : depth));
  };

  function isArray (ar) {
    return Object.prototype.toString.call(ar) == '[object Array]';
  };

  function isRegExp(re) {
    var s;
    try {
      s = '' + re;
    } catch (e) {
      return false;
    }

    return re instanceof RegExp || // easy case
           // duck-type for context-switching evalcx case
           typeof(re) === 'function' &&
           re.constructor.name === 'RegExp' &&
           re.compile &&
           re.test &&
           re.exec &&
           s.match(/^\/.*\/[gim]{0,3}$/);
  };

  function isDate(d) {
    if (d instanceof Date) return true;
    return false;
  };

  function keys (obj) {
    if (Object.keys) {
      return Object.keys(obj);
    }

    var keys = [];

    for (var i in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, i)) {
        keys.push(i);
      }
    }

    return keys;
  }

  function map (arr, mapper, that) {
    if (Array.prototype.map) {
      return Array.prototype.map.call(arr, mapper, that);
    }

    var other= new Array(arr.length);

    for (var i= 0, n = arr.length; i<n; i++)
      if (i in arr)
        other[i] = mapper.call(that, arr[i], i, arr);

    return other;
  };

  function reduce (arr, fun) {
    if (Array.prototype.reduce) {
      return Array.prototype.reduce.apply(
          arr
        , Array.prototype.slice.call(arguments, 1)
      );
    }

    var len = +this.length;

    if (typeof fun !== "function")
      throw new TypeError();

    // no value to return if no initial value and an empty array
    if (len === 0 && arguments.length === 1)
      throw new TypeError();

    var i = 0;
    if (arguments.length >= 2) {
      var rv = arguments[1];
    } else {
      do {
        if (i in this) {
          rv = this[i++];
          break;
        }

        // if array contains no values, no initial value to return
        if (++i >= len)
          throw new TypeError();
      } while (true);
    }

    for (; i < len; i++) {
      if (i in this)
        rv = fun.call(null, rv, this[i], i, this);
    }

    return rv;
  };

  /**
   * Asserts deep equality
   *
   * @see taken from node.js `assert` module (copyright Joyent, MIT license)
   * @api private
   */

  expect.eql = function eql (actual, expected) {
    // 7.1. All identical values are equivalent, as determined by ===.
    if (actual === expected) {
      return true;
    } else if ('undefined' != typeof Buffer
        && Buffer.isBuffer(actual) && Buffer.isBuffer(expected)) {
      if (actual.length != expected.length) return false;

      for (var i = 0; i < actual.length; i++) {
        if (actual[i] !== expected[i]) return false;
      }

      return true;

    // 7.2. If the expected value is a Date object, the actual value is
    // equivalent if it is also a Date object that refers to the same time.
    } else if (actual instanceof Date && expected instanceof Date) {
      return actual.getTime() === expected.getTime();

    // 7.3. Other pairs that do not both pass typeof value == "object",
    // equivalence is determined by ==.
    } else if (typeof actual != 'object' && typeof expected != 'object') {
      return actual == expected;

    // 7.4. For all other Object pairs, including Array objects, equivalence is
    // determined by having the same number of owned properties (as verified
    // with Object.prototype.hasOwnProperty.call), the same set of keys
    // (although not necessarily the same order), equivalent values for every
    // corresponding key, and an identical "prototype" property. Note: this
    // accounts for both named and indexed properties on Arrays.
    } else {
      return objEquiv(actual, expected);
    }
  }

  function isUndefinedOrNull (value) {
    return value === null || value === undefined;
  }

  function isArguments (object) {
    return Object.prototype.toString.call(object) == '[object Arguments]';
  }

  function objEquiv (a, b) {
    if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
      return false;
    // an identical "prototype" property.
    if (a.prototype !== b.prototype) return false;
    //~~~I've managed to break Object.keys through screwy arguments passing.
    //   Converting to array solves the problem.
    if (isArguments(a)) {
      if (!isArguments(b)) {
        return false;
      }
      a = pSlice.call(a);
      b = pSlice.call(b);
      return expect.eql(a, b);
    }
    try{
      var ka = keys(a),
        kb = keys(b),
        key, i;
    } catch (e) {//happens when one is a string literal and the other isn't
      return false;
    }
    // having the same number of owned properties (keys incorporates hasOwnProperty)
    if (ka.length != kb.length)
      return false;
    //the same set of keys (although not necessarily the same order),
    ka.sort();
    kb.sort();
    //~~~cheap key test
    for (i = ka.length - 1; i >= 0; i--) {
      if (ka[i] != kb[i])
        return false;
    }
    //equivalent values for every corresponding key, and
    //~~~possibly expensive deep test
    for (i = ka.length - 1; i >= 0; i--) {
      key = ka[i];
      if (!expect.eql(a[key], b[key]))
         return false;
    }
    return true;
  }

  var json = (function () {
    "use strict";

    if ('object' == typeof JSON && JSON.parse && JSON.stringify) {
      return {
          parse: nativeJSON.parse
        , stringify: nativeJSON.stringify
      }
    }

    var JSON = {};

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    function date(d, key) {
      return isFinite(d.valueOf()) ?
          d.getUTCFullYear()     + '-' +
          f(d.getUTCMonth() + 1) + '-' +
          f(d.getUTCDate())      + 'T' +
          f(d.getUTCHours())     + ':' +
          f(d.getUTCMinutes())   + ':' +
          f(d.getUTCSeconds())   + 'Z' : null;
    };

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

  // If the string contains no control characters, no quote characters, and no
  // backslash characters, then we can safely slap some quotes around it.
  // Otherwise we must also replace the offending characters with safe escape
  // sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string' ? c :
                '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {

  // Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

  // If the value has a toJSON method, call it to obtain a replacement value.

        if (value instanceof Date) {
            value = date(key);
        }

  // If we were called with a replacer function, then call the replacer to
  // obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

  // What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

  // JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

  // If the value is a boolean or null, convert it to a string. Note:
  // typeof null does not produce 'null'. The case is included here in
  // the remote chance that this gets fixed someday.

            return String(value);

  // If the type is 'object', we might be dealing with an object or an array or
  // null.

        case 'object':

  // Due to a specification blunder in ECMAScript, typeof null is 'object',
  // so watch out for that case.

            if (!value) {
                return 'null';
            }

  // Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

  // Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

  // The value is an array. Stringify every element. Use null as a placeholder
  // for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

  // Join all of the elements together, separated with commas, and wrap them in
  // brackets.

                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

  // If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

  // Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

  // Join all of the member texts together, separated with commas,
  // and wrap them in braces.

            v = partial.length === 0 ? '{}' : gap ?
                '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
                '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

  // If the JSON object does not yet have a stringify method, give it one.

    JSON.stringify = function (value, replacer, space) {

  // The stringify method takes a value and an optional replacer, and an optional
  // space parameter, and returns a JSON text. The replacer can be a function
  // that can replace values, or an array of strings that will select the keys.
  // A default replacer method can be provided. Use of the space parameter can
  // produce text that is more easily readable.

        var i;
        gap = '';
        indent = '';

  // If the space parameter is a number, make an indent string containing that
  // many spaces.

        if (typeof space === 'number') {
            for (i = 0; i < space; i += 1) {
                indent += ' ';
            }

  // If the space parameter is a string, it will be used as the indent string.

        } else if (typeof space === 'string') {
            indent = space;
        }

  // If there is a replacer, it must be a function or an array.
  // Otherwise, throw an error.

        rep = replacer;
        if (replacer && typeof replacer !== 'function' &&
                (typeof replacer !== 'object' ||
                typeof replacer.length !== 'number')) {
            throw new Error('JSON.stringify');
        }

  // Make a fake root object containing our value under the key of ''.
  // Return the result of stringifying the value.

        return str('', {'': value});
    };

  // If the JSON object does not yet have a parse method, give it one.

    JSON.parse = function (text, reviver) {
    // The parse method takes a text and an optional reviver function, and returns
    // a JavaScript value if the text is a valid JSON text.

        var j;

        function walk(holder, key) {

    // The walk method is used to recursively walk the resulting structure so
    // that modifications can be made.

            var k, v, value = holder[key];
            if (value && typeof value === 'object') {
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = walk(value, k);
                        if (v !== undefined) {
                            value[k] = v;
                        } else {
                            delete value[k];
                        }
                    }
                }
            }
            return reviver.call(holder, key, value);
        }


    // Parsing happens in four stages. In the first stage, we replace certain
    // Unicode characters with escape sequences. JavaScript handles many characters
    // incorrectly, either silently deleting them, or treating them as line endings.

        text = String(text);
        cx.lastIndex = 0;
        if (cx.test(text)) {
            text = text.replace(cx, function (a) {
                return '\\u' +
                    ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            });
        }

    // In the second stage, we run the text against regular expressions that look
    // for non-JSON patterns. We are especially concerned with '()' and 'new'
    // because they can cause invocation, and '=' because it can cause mutation.
    // But just to be safe, we want to reject all unexpected forms.

    // We split the second stage into 4 regexp operations in order to work around
    // crippling inefficiencies in IE's and Safari's regexp engines. First we
    // replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
    // replace all simple value tokens with ']' characters. Third, we delete all
    // open brackets that follow a colon or comma or that begin the text. Finally,
    // we look to see that the remaining characters are only whitespace or ']' or
    // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

        if (/^[\],:{}\s]*$/
                .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                    .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                    .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

    // In the third stage we use the eval function to compile the text into a
    // JavaScript structure. The '{' operator is subject to a syntactic ambiguity
    // in JavaScript: it can begin a block or an object literal. We wrap the text
    // in parens to eliminate the ambiguity.

            j = eval('(' + text + ')');

    // In the optional fourth stage, we recursively walk the new structure, passing
    // each name/value pair to a reviver function for possible transformation.

            return typeof reviver === 'function' ?
                walk({'': j}, '') : j;
        }

    // If the text is not JSON parseable, then a SyntaxError is thrown.

        throw new SyntaxError('JSON.parse');
    };

    return JSON;
  })();

  if ('undefined' != typeof window) {
    window.expect = module.exports;
  }

})(
    this
  , 'undefined' != typeof module ? module : {}
  , 'undefined' != typeof exports ? exports : {}
);

},{"__browserify_Buffer":4}],3:[function(require,module,exports){

Stryng = require('./../Stryng.js');
expect = require('expect.js');

///////////////////////////////////////////
// patch missing withArgs in npm version //
///////////////////////////////////////////

expect.Assertion.prototype.withArgs = function(){

	var fn = this.obj,
		args = arguments;

	expect(fn).to.be.a('function');

	this.obj = function()
	{
		fn.apply(null, args);
	};

	return this;
};

// checkout sinonjs.org

///////////////
// go for it //
///////////////

describe('Stryng', function(){

	beforeEach(function(done){

		setTimeout(function(){ done() }, 15);
	});

	it('should allow reasonable numeric comparisons without parsing', function () {
		
		function toInteger(n)
	    {
	        return (
	            (n = +n) !== n ? 0 : // toNumber and isNaN
	            n && isFinite(n) ? n|0 : // ceiles negatives, floors positives - Math.floor(Math.abs(n))
	            n // sign, zero and Infinity yet untouched
	        );
	    }

	    expect( toInteger(NaN) > 0       ).to.equal( NaN > 0 );
	    expect( toInteger(NaN) < 0       ).to.equal( NaN < 0 );
	    expect( toInteger(1/0) > 0       ).to.equal( 1/0 > 0 );
	    expect( toInteger(1/0) < 0       ).to.equal( 1/0 < 0 );
	    expect( toInteger('Infinity') > 0      ).to.equal( 'Infinity' > 0 );
	    expect( toInteger('Infinity') < 0      ).to.equal( 'Infinity' < 0 );
	    expect( toInteger(-1/0) > 0      ).to.equal( -1/0 > 0 );
	    expect( toInteger(-1/0) < 0      ).to.equal( -1/0 < 0 );
	    expect( toInteger(-'Infinity') > 0      ).to.equal( -'Infinity' > 0 );
	    expect( toInteger(-'Infinity') < 0      ).to.equal( -'Infinity' < 0 );
	    expect( toInteger(undefined) > 0 ).to.equal( undefined > 0 );
	    expect( toInteger(undefined) < 0 ).to.equal( undefined < 0 );
	    expect( toInteger(null) > 0      ).to.equal( null > 0 );
	    expect( toInteger(null) < 0      ).to.equal( null < 0 );
	    expect( toInteger(false) > 0     ).to.equal( false > 0 );
	    expect( toInteger(false) < 0     ).to.equal( false < 0 );
	    expect( toInteger(true) > 0      ).to.equal( true > 0 );
	    expect( toInteger(true) < 0      ).to.equal( true < 0 );
	    expect( toInteger(1) > 0         ).to.equal( 1 > 0 );
	    expect( toInteger(1) < 0         ).to.equal( 1 < 0 );
	    expect( toInteger(-1) > 0        ).to.equal( -1 > 0 );
	    expect( toInteger(-1) < 0        ).to.equal( -1 < 0 );
	    expect( toInteger([]) > 0        ).to.equal( [] > 0 );
	    expect( toInteger([]) < 0        ).to.equal( [] < 0 );
	    expect( toInteger({}) > 0        ).to.equal( {} > 0 );
	    expect( toInteger({}) < 0        ).to.equal( {} < 0 );
	    expect( toInteger(/./) > 0       ).to.equal( /./ > 0 );
	    expect( toInteger(/./) < 0       ).to.equal( /./ < 0 );
	    expect( toInteger('123') > 0     ).to.equal( '123' > 0 );
	    expect( toInteger('123') < 0     ).to.equal( '123' < 0 );
	    expect( toInteger('-123') > 0    ).to.equal( '-123' > 0 );
	    expect( toInteger('-123') < 0    ).to.equal( '-123' < 0 );
	    expect( toInteger('1e1') > 0     ).to.equal( '1e1' > 0 );
	    expect( toInteger('1e1') < 0     ).to.equal( '1e1' < 0 );
	});

	it('should throw primitve', function () {
		expect( function(){ throw "message" } ).to.throwError(/message/);
	});

	it('should handle array methods on arguments', function(){
		expect( function fn(){ return [].slice.call(arguments) } ).withArgs(1,2,3).to.not.throwError();
		expect( function fn(){ return Array.apply(null, arguments) } ).withArgs(1,2,3).to.not.throwError();
	});

	it('should support loop labeling', function () {
		outer : for(var i = 10; i--;)
		{
			inner : while(i--)
			{
				break outer;
			}
		}
		expect(i).to.equal(8);
	});

	describe('.capitalize', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.capitalize ).to.throwError();
		});

		it('should return the empty string', function(){
			expect( Stryng.capitalize('') ).to.equal('');
		});

		it('should upper case the first letter', function(){
			expect( Stryng.capitalize('foo') ).to.equal('Foo');
		});
	});

	describe('.trim', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.trim ).to.throwError();
		});

		it('should return the empty string', function(){
			expect( Stryng.trim('') ).to.equal('');
		});

		it('should return the any string unchanged if neither prefixed nor suffixed by whitespace', function(){
			expect( Stryng.trim('foo') ).to.equal('foo');
		});

		it('should trim leading and trailing whitespace', function (){
			
			var ws = '\u0009\u000A\u000B\u000C'
			       + '\u00A0\u000D\u0020\u1680'
			       + '\u180E\u2000\u2001\u2002'
			       + '\u2003\u2004\u2005\u2006'
			       + '\u2007\u2008\u2009\u200A'
			       + '\u2028\u2029\u202F\u205F'
			       + '\u3000\uFEFF',
			    msg = 'Hello World',
			    padded = ws + msg + ws;

		    expect( Stryng.trim(padded) ).to.equal(msg);
		});
	});

	describe('.trimLeft', function(){

		it('should trim leading whitespace only', function (){
			
			var ws = '\u0009\u000A\u000B\u000C'
			       + '\u00A0\u000D\u0020\u1680'
			       + '\u180E\u2000\u2001\u2002'
			       + '\u2003\u2004\u2005\u2006'
			       + '\u2007\u2008\u2009\u200A'
			       + '\u2028\u2029\u202F\u205F'
			       + '\u3000\uFEFF',
			    msg = 'Hello World',
			    leftPadded = ws + msg;

		    expect( Stryng.trimLeft(leftPadded) ).to.equal(msg);
		});
	});

	describe('.trimRight', function(){

		it('should trim trailing whitespace only', function (){
			
			var ws = '\u0009\u000A\u000B\u000C'
			       + '\u00A0\u000D\u0020\u1680'
			       + '\u180E\u2000\u2001\u2002'
			       + '\u2003\u2004\u2005\u2006'
			       + '\u2007\u2008\u2009\u200A'
			       + '\u2028\u2029\u202F\u205F'
			       + '\u3000\uFEFF',
			    msg = 'Hello World',
			    rightPadded = msg + ws;

		    expect( Stryng.trimRight(rightPadded) ).to.equal(msg);
		});
	});

	describe('.contains', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.contains ).to.throwError();
		});

		it('should return true on "undefined" with no arguments passed', function (){
			expect( Stryng.contains('undefined'/*, (undefined).toString() */) ).to.be.ok();
		});

		it('should find the empty string in any string', function (){
			expect( Stryng.contains('any', '') ).to.be.ok();
		});

		it('should return true if search equals input', function (){
			expect( Stryng.contains('foo', 'foo') ).to.be.ok();
		});

		it('should return true if input contains substring', function (){
			expect( Stryng.contains('the quick brown fox', 'quick') ).to.be.ok();
		});

		it('should return false if substring not found', function (){
			expect( Stryng.contains('foo', 'bar') ).not.to.be.ok();
		});
	});

	describe('.startsWith', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.startsWith ).to.throwError();
		});

		it('should apply "undefined" as default searchString and zero as default position', function (){
			expect( Stryng('undefined...').startsWith(/* (undefined).toString(), toInteger(undefined) */) ).to.be.ok();
		});

		it('should apply the input\'s length as the maximum position (hence only the empty string as searchString results to true)', function () {
			expect( Stryng.startsWith('foo bar', '', 'foo bar'.length + 1) ).to.be.ok();
			expect( Stryng.startsWith('foo bar', 'bar', 'foo bar'.length + 1) ).to.not.be.ok();
		});

		it('should apply zero as the minimum position', function (){
			expect( Stryng.startsWith('foo bar', 'foo', -1) ).to.be.ok();
		});

		it('should return false if searchString is longer than input', function () {
			expect( Stryng.startsWith('foo', 'fooo') ).to.not.be.ok();
		});

		it('should return false if input doesn\'t start with substring', function (){
			expect( Stryng.startsWith('foo bar', 'bar') ).to.not.be.ok();
		});

		it('should return true if searchString found at the exact position and fits found with given offset within input', function (){
			expect( Stryng.startsWith('foo bar', 'bar', 4) ).to.be.ok();
		});
	});

	describe('.endsWith', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.endsWith ).to.throwError();
		});

		it('should apply "undefined" as default searchString and the input\'s length as default endPosition', function (){
			expect( Stryng('...undefined').endsWith(/* (undefined).toString(), input.length */) ).to.be.ok();
		});

		it('should apply the input\'s length as the maximum endPosition', function () {
			expect( Stryng.endsWith('foo bar', 'bar', 'foo bar'.length + 1) ).to.be.ok();
		});

		it('should apply zero as the minimum endPosition (hence only the empty string as searchString result to true)', function (){
			expect( Stryng.endsWith('foo bar', '', -1) ).to.be.ok();
			// expect( Stryng.endsWith('foo bar', 'foo', -1) ).to.not.be.ok();
		});

		it('should return false if searchString is longer than input', function () {
			expect( Stryng.endsWith('foo', 'ofoo') ).to.not.be.ok();
		});

		it('should return false if input doesn\'t end with searchString', function (){
			expect( Stryng.endsWith('foo bar', 'foo') ).to.not.be.ok();
		});

		it('should return false if input ends with searchString but at a different position', function () {
			expect( Stryng.endsWith('foo bar', 'bar', 6) ).to.not.be.ok();
		});

		it('should return true if searchString fits and ends at the given position', function (){
			expect( Stryng.endsWith('foo bar', 'foo', 3) ).to.be.ok();
		});
	});

	describe('.repeat', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.repeat ).to.throwError();			
		});

		it('should fail if n is negative or not finite', function () {
			expect( Stryng.repeat ).withArgs('', -1).to.throwError();
		});

		it('should fail if n is not finite', function () {
			expect( Stryng.repeat ).withArgs('', Infinity).to.throwError();
			expect( Stryng.repeat ).withArgs('', '-Infinity').to.throwError();
		});

		it('should return the empty string if n is zero', function (){
			expect( Stryng.repeat('foo', 0) ).to.equal('');
		});

		it('should repeat the input n times', function (){
			expect( Stryng.repeat('foo', 3) ).to.equal('foofoofoo');
		});
	});

	describe('.substr', function(){

		it('should fail if input\'s missing', function () {
			expect( Stryng.substr ).to.throwError();			
		});

		it('should accept negative indices', function () {
			expect( Stryng.substr('foo', -1) ).to.equal('o');
		});

		it('should apply zero if abs(index) exceeds the input\'s length', function () {
			expect( Stryng.substr('foo', -4) ).to.equal('foo');
		});

		it('should ceil negative floating point indices', function () {
			expect( Stryng.substr('foo', '-0.5', 2) ).to.equal('fo');
		});

		it('should return the empty string if length is zero', function () {
			expect( Stryng.substr('foo', 'NaN', 0) ).to.equal('');
		});
	});

	describe('.wrap', function(){

		it('should fail if input\'s missing', function () {
			expect( Stryng.wrap ).to.throwError();			
		});

		it('should fail if n is negative or not finite', function () {
			expect( Stryng.wrap ).withArgs('foo', 'outfix', Infinity).to.throwError();
			expect( Stryng.wrap ).withArgs('foo', 'outfix', -1).to.throwError();
		});

		it('should apply zero as the deault thus return the input', function () {
			expect( Stryng.wrap('foo', 'outfix') ).to.equal('foo');
		});

		it('should wrap three times', function () {
			expect( Stryng.wrap('foo', 'x', 3) ).to.equal('xxxfooxxx');
		});
	});

	describe('.count', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.count ).to.throwError();			
		});

		it('should search for "undefined" by default', function (){
			expect( Stryng('undefined').count(/* (undefined).toString() */) ).to.equal(1);
		});

		it('should return length + 1 when counting the empty string', function (){
			expect( Stryng.count('foo', '') ).to.equal(4);
		});

		it('should return the number of non-overlapping occurences', function (){
			expect( Stryng.count('foo foo bar', 'foo') ).to.equal(2);
		});
	});

	describe('.join', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.join ).to.throwError();
		});

		it('should return the empty string if no arguments passed to join', function (){
			expect( Stryng.join(',') ).to.equal('');
		});

		it('should allow an empty delimiter string', function (){
			expect( Stryng.join('', 1, 2, 3) ).to.equal('123');
		});

		it('should flatten the args to join', function (){
			expect( Stryng.join(' ', [[[1],2],3]) ).to.equal('1 2 3');
		});

		it('should allow an Arguments object', function () {
			expect( (function(){ return Stryng.join(',', arguments) })(1,2,3) ).to.equal('1,2,3');
		});
	})

	describe('.reverse', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.reverse ).to.throwError();
		});

		it('should return the empty string unchanged', function (){
			expect( Stryng.reverse('') ).to.equal('');
		});

		it('should rerturn a single character unchanged', function (){
			expect( Stryng.reverse('a') ).to.equal('a');
		});

		it('should reverse a string', function (){
			expect( Stryng.reverse('abc') ).to.equal('cba');
		});
	});

	describe('.insert', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.insert ).to.throwError();
		});

		it('should prepend "undefined" if neither index nor insertion provided', function (){
			expect( Stryng.insert('foo') ).to.equal('undefinedfoo');
		});

		it('should append if the index exceed the input\'s length', function (){
			expect( Stryng.insert('foo', Infinity, 'bar') ).to.equal('foobar');
		});

		it('should prepend if the index is negative but its absolute value exceeds the input\'s length', function (){
			expect( Stryng.insert('foo', -Infinity, 'bar') ).to.equal('barfoo');
		});

		it('should insert at the given position counting from the beginning', function (){
			expect( Stryng.insert('the fox', 4, 'quick ') ).to.equal('the quick fox');
		});

		it('should insert at the given position counting from the end', function (){
			expect( Stryng.insert('the fox', -3, 'quick ') ).to.equal('the quick fox');
		});
	});

	describe('.splitAt', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.splitAt ).to.throwError(/splitAt/);
		});

		it('should fail if indices overlap / are badly sorted', function (){
			expect( Stryng.splitAt ).withArgs('foo bar baz', 3, 1).to.throwError();
		});

		it('should fail if negative indices overlap', function (){
			expect( Stryng.splitAt ).withArgs('foo bar baz', 3, -10).to.throwError();
		});

		it('should fail if indices equal', function () {
			expect( Stryng.splitAt ).withArgs('foo bar baz', 3 , 3).to.throwError();
		});

		it('should split at the given indices', function (){
			expect( Stryng.splitAt('gosplitthis', 2, 7) ).to.eql(['go', 'split', 'this']);
		});

		it('should split at the given negative / backwards indices', function (){
			expect( Stryng.splitAt('gosplitthis', -9, -4) ).to.eql(['go', 'split', 'this']);
		});

		it('should split at 0 and input.length - edge case', function () {
			expect( Stryng.splitAt('foo', 0, 3) ).to.eql(['', 'foo', '']);
		});
	});

	describe('.splitLeft', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.splitLeft ).to.throwError(/splitLeft/);
		});

		it('should toUint32 negative values', function (){
			expect( Stryng.splitLeft('foo', '', -1) ).to.eql(['f', 'o', 'o']);
		});

		it('should return an empty array if limit is zero', function(){
			expect( Stryng.splitLeft('foo', '', 0) ).to.eql([]);
		});

		it('should treat Infinity equal to zero as limit', function(){
			expect( Stryng.splitLeft('foo', '', Infinity) ).to.eql([]);
		});

		it('should return an empty array if splitting the empty string by itself', function (){
			expect( Stryng.splitLeft('', '') ).to.eql([]);
		});

		it('should return an array of two empty strings if splitting by the input', function (){
			expect( Stryng.splitLeft('foo', 'foo') ).to.eql(['', '']);
		});

		it('should split by all occurences of the delimiter if no limit passed', function (){
			expect( Stryng.splitLeft('sequence', '') ).to.eql(['s','e','q','u','e','n','c','e']);
		});

		it('should split limit times but yet include the rest', function (){
			expect( Stryng.splitLeft('sequence', '', 4) ).to.eql(['s','e','q','u','ence']);
		});

		it('should work for [grouping] regular expressions, too');
	});

	describe('.splitRight', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.splitRight ).to.throwError(/splitRight/);
		});

		it('should split limit times but yet include the rest', function (){
			expect( Stryng.splitRight('charactersequence', '', 4) ).to.eql(['charactersequ','e','n','c','e']);
		});

		it('should work for [grouping] regular expressions, too');

		// refer to Stryng.splitLeft for further tests

	});

	describe('.exchange', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.exchange ).to.throwError(/exchange/);
		});

		it('should leave the input as is if replacee and replacement equal', function () {
			expect( Stryng.exchange('foo', 'o', 'o') ).to.equal('foo');
		});

		it('should replace all occurences of replacee by replacement', function () {
			expect( Stryng.exchange('foo', 'o', 'a') ).to.equal('faa');
		});

		it('should comma separate the input if passed the empty string as replacee and comma as replacement', function () {
			expect( Stryng.exchange('sequence', '', ',') ).to.equal('s,e,q,u,e,n,c,e');
		});
	});

	describe('.exchangeLeft', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.exchangeLeft ).to.throwError(/exchangeLeft/);
		});

		it('should replace n left-hand occurences of replacee', function () {
			expect( Stryng.exchangeLeft('sequence', '', ',', 3) ).to.equal('s,e,q,uence');
		});

		// refer to Stryng.splitLeft for further tests
	});

	describe('.exchangeRight', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.exchangeRight ).to.throwError(/exchangeRight/);
		});

		it('should replace n right-hand occurences of replacee', function () {
			expect( Stryng.exchangeRight('sequence', '', ',', 3) ).to.equal('seque,n,c,e');
		});

		// refer to Stryng.splitRight for further tests
	});

	describe('.padLeft', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.padLeft ).to.throwError(/padLeft/);
		});

		it('should fail if maxLength is negative', function () {
			expect( Stryng.padLeft ).withArgs('foo', -1, 'o').to.throwError(/padLeft/);
		});

		it('should fail if maxLength is not finite', function () {
			expect( Stryng.padLeft ).withArgs('foo', Infinity, 'o').to.throwError(/padLeft/);
			expect( Stryng.padLeft ).withArgs('foo', '-Infinity', 'o').to.throwError(/padLeft/);
		});

		it('should return the input if its length is greater than or equals maxLength', function () {
			expect( Stryng.padLeft('foo', 2, 'o') ).to.equal('foo');
			expect( Stryng.padLeft('foo', 3, 'o') ).to.equal('foo');
		});

		it('should prepend the padding to the input until its length equals maxLength', function () {
			expect( Stryng.padLeft('foo', 5, 'o') ).to.equal('oofoo');
		});

		it('should prepend the padding to the input until the next iteration would exceed maxLength', function () {
			expect( Stryng.padLeft('dong', 20, 'ding ') ).to.equal('ding ding ding dong'); // length 19
		});
	});

	describe('.padRight', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.padRight ).to.throwError(/padRight/);
		});

		it('should append the padding to the input until its length equals maxLength', function () {
			expect( Stryng.padRight('foo', 5, 'o') ).to.equal('foooo');
		});

		it('should append the padding to the input until the next iteration would exceed maxLength', function () {
			expect( Stryng.padRight('ding', 20, ' dong') ).to.equal('ding dong dong dong'); // length 19
		});

		// refer to Stryng.padLeft for further tests
	});

	describe('.pad', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.pad ).to.throwError(/pad/);
		});

		it('should append and prepend to the input until its length equals maxLength', function () {
			expect( Stryng.pad('private', 'private'.length + 4, '_') ).to.equal('__private__')
		});
	});

	describe('.prepend', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.prepend ).to.throwError(/prepend/);
		});

		it('should prepend the given argument', function () {
			expect( Stryng.prepend(' World!', 'Hello') ).to.equal('Hello World!');
		});

		it('should prepend the given arguments\'s string representations in order', function () {
			expect( Stryng.prepend('!', 'World', 2, 'lo', 'Hel') ).to.equal('Hello2World!');
		});
	});

	describe('.stripLeft', function(){

		it('should fail if input\'s missing', function () {
			expect( Stryng.stripLeft ).to.throwError(/stripLeft/);			
		});

		it('should strip from the beginning', function () {
			expect( Stryng.stripLeft('Hello World!', 'Hello') ).to.equal(' World!')
		});

		it('should strip the prefix as long as it remains one', function () {
			expect( Stryng.stripLeft('ding ding ding dong', 'ding ') ).to.equal('dong')
		});

		it('should strip the prefix n times', function () {
			expect( Stryng.stripLeft('ding ding ding dong', 'ding ', 2) ).to.equal('ding dong')
		});
	});

	describe('.stripRight', function(){

		it('should fail if input\'s missing', function () {
			expect( Stryng.stripRight ).to.throwError(/stripRight/);			
		});

		it('should strip from the beginning', function () {
			expect( Stryng.stripRight('Hello, hello World!', 'World!') ).to.equal('Hello, hello ')
		});

		it('should strip the prefix as long as it remains one', function () {
			expect( Stryng.stripRight('ding dong dong dong', ' dong') ).to.equal('ding')
		});

		it('should strip the prefix n times', function () {
			expect( Stryng.stripRight('ding dong dong dong', ' dong', 2) ).to.equal('ding dong')
		});
	});

	describe('.strip', function(){

		it('should fail if input\'s missing', function () {
			expect( Stryng.strip ).to.throwError(/strip/);			
		});

		it('should strip from the beginning and the end', function () {
			expect( Stryng.strip('maoam', 'm') ).to.equal('aoa');
		});

		it('should strip multiple times', function () {
			expect( Stryng.strip('"""docstring"""', '"') ).to.equal('docstring');
		});

		it('should strip n times', function () {
			expect( Stryng.strip('"""docstring"""', '"', 2) ).to.equal('"docstring"');
		});
	});

	describe('.stripTags', function(){
		it('yet is missing')
	});

	//////////////////////
	// other easy tests //
	//////////////////////

	describe('.quote', function(){

		it('should fail if input\'s missing', function () {
			expect( Stryng.quote ).to.throwError();
		});

		it('unfinished escape issues yet');
	});

	describe('.unquote', function(){

		it('should fail if input\'s missing', function () {
			expect( Stryng.unquote ).to.throwError();
		});

		it('unfinished escape issues yet');
	});

	// continue..
});
},{"./../Stryng.js":1,"expect.js":2}],4:[function(require,module,exports){
require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
exports.readIEEE754 = function(buffer, offset, isBE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isBE ? 0 : (nBytes - 1),
      d = isBE ? 1 : -1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.writeIEEE754 = function(buffer, value, offset, isBE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isBE ? (nBytes - 1) : 0,
      d = isBE ? -1 : 1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],"q9TxCC":[function(require,module,exports){
var assert;
exports.Buffer = Buffer;
exports.SlowBuffer = Buffer;
Buffer.poolSize = 8192;
exports.INSPECT_MAX_BYTES = 50;

function stringtrim(str) {
  if (str.trim) return str.trim();
  return str.replace(/^\s+|\s+$/g, '');
}

function Buffer(subject, encoding, offset) {
  if(!assert) assert= require('assert');
  if (!(this instanceof Buffer)) {
    return new Buffer(subject, encoding, offset);
  }
  this.parent = this;
  this.offset = 0;

  // Work-around: node's base64 implementation
  // allows for non-padded strings while base64-js
  // does not..
  if (encoding == "base64" && typeof subject == "string") {
    subject = stringtrim(subject);
    while (subject.length % 4 != 0) {
      subject = subject + "="; 
    }
  }

  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    this.length = coerce(encoding);
    // slicing works, with limitations (no parent tracking/update)
    // check https://github.com/toots/buffer-browserify/issues/19
    for (var i = 0; i < this.length; i++) {
        this[i] = subject.get(i+offset);
    }
  } else {
    // Find the length
    switch (type = typeof subject) {
      case 'number':
        this.length = coerce(subject);
        break;

      case 'string':
        this.length = Buffer.byteLength(subject, encoding);
        break;

      case 'object': // Assume object is an array
        this.length = coerce(subject.length);
        break;

      default:
        throw new Error('First argument needs to be a number, ' +
                        'array or string.');
    }

    // Treat array-ish objects as a byte array.
    if (isArrayIsh(subject)) {
      for (var i = 0; i < this.length; i++) {
        if (subject instanceof Buffer) {
          this[i] = subject.readUInt8(i);
        }
        else {
          this[i] = subject[i];
        }
      }
    } else if (type == 'string') {
      // We are a string
      this.length = this.write(subject, 0, encoding);
    } else if (type === 'number') {
      for (var i = 0; i < this.length; i++) {
        this[i] = 0;
      }
    }
  }
}

Buffer.prototype.get = function get(i) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this[i];
};

Buffer.prototype.set = function set(i, v) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this[i] = v;
};

Buffer.byteLength = function (str, encoding) {
  switch (encoding || "utf8") {
    case 'hex':
      return str.length / 2;

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).length;

    case 'ascii':
    case 'binary':
      return str.length;

    case 'base64':
      return base64ToBytes(str).length;

    default:
      throw new Error('Unknown encoding');
  }
};

Buffer.prototype.utf8Write = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten =  blitBuffer(utf8ToBytes(string), this, offset, length);
};

Buffer.prototype.asciiWrite = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten =  blitBuffer(asciiToBytes(string), this, offset, length);
};

Buffer.prototype.binaryWrite = Buffer.prototype.asciiWrite;

Buffer.prototype.base64Write = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten = blitBuffer(base64ToBytes(string), this, offset, length);
};

Buffer.prototype.base64Slice = function (start, end) {
  var bytes = Array.prototype.slice.apply(this, arguments)
  return require("base64-js").fromByteArray(bytes);
};

Buffer.prototype.utf8Slice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var res = "";
  var tmp = "";
  var i = 0;
  while (i < bytes.length) {
    if (bytes[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(bytes[i]);
      tmp = "";
    } else
      tmp += "%" + bytes[i].toString(16);

    i++;
  }

  return res + decodeUtf8Char(tmp);
}

Buffer.prototype.asciiSlice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var ret = "";
  for (var i = 0; i < bytes.length; i++)
    ret += String.fromCharCode(bytes[i]);
  return ret;
}

Buffer.prototype.binarySlice = Buffer.prototype.asciiSlice;

Buffer.prototype.inspect = function() {
  var out = [],
      len = this.length;
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }
  return '<Buffer ' + out.join(' ') + '>';
};


Buffer.prototype.hexSlice = function(start, end) {
  var len = this.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; i++) {
    out += toHex(this[i]);
  }
  return out;
};


Buffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();
  start = +start || 0;
  if (typeof end == 'undefined') end = this.length;

  // Fastpath empty strings
  if (+end == start) {
    return '';
  }

  switch (encoding) {
    case 'hex':
      return this.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.utf8Slice(start, end);

    case 'ascii':
      return this.asciiSlice(start, end);

    case 'binary':
      return this.binarySlice(start, end);

    case 'base64':
      return this.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


Buffer.prototype.hexWrite = function(string, offset, length) {
  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2) {
    throw new Error('Invalid hex string');
  }
  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(byte)) throw new Error('Invalid hex string');
    this[offset + i] = byte;
  }
  Buffer._charsWritten = i * 2;
  return i;
};


Buffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  switch (encoding) {
    case 'hex':
      return this.hexWrite(string, offset, length);

    case 'utf8':
    case 'utf-8':
      return this.utf8Write(string, offset, length);

    case 'ascii':
      return this.asciiWrite(string, offset, length);

    case 'binary':
      return this.binaryWrite(string, offset, length);

    case 'base64':
      return this.base64Write(string, offset, length);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Write(string, offset, length);

    default:
      throw new Error('Unknown encoding');
  }
};

// slice(start, end)
function clamp(index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue;
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len;
  if (index >= 0) return index;
  index += len;
  if (index >= 0) return index;
  return 0;
}

Buffer.prototype.slice = function(start, end) {
  var len = this.length;
  start = clamp(start, len, 0);
  end = clamp(end, len, len);
  return new Buffer(this, end - start, +start);
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  if (end === undefined || isNaN(end)) {
    end = this.length;
  }
  target_start || (target_start = 0);

  if (end < start) throw new Error('sourceEnd < sourceStart');

  // Copy 0 bytes; we're done
  if (end === start) return 0;
  if (target.length == 0 || source.length == 0) return 0;

  if (target_start < 0 || target_start >= target.length) {
    throw new Error('targetStart out of bounds');
  }

  if (start < 0 || start >= source.length) {
    throw new Error('sourceStart out of bounds');
  }

  if (end < 0 || end > source.length) {
    throw new Error('sourceEnd out of bounds');
  }

  // Are we oob?
  if (end > this.length) {
    end = this.length;
  }

  if (target.length - target_start < end - start) {
    end = target.length - target_start + start;
  }

  var temp = [];
  for (var i=start; i<end; i++) {
    assert.ok(typeof this[i] !== 'undefined', "copying undefined buffer bytes!");
    temp.push(this[i]);
  }

  for (var i=target_start; i<target_start+temp.length; i++) {
    target[i] = temp[i-target_start];
  }
};

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill(value, start, end) {
  value || (value = 0);
  start || (start = 0);
  end || (end = this.length);

  if (typeof value === 'string') {
    value = value.charCodeAt(0);
  }
  if (!(typeof value === 'number') || isNaN(value)) {
    throw new Error('value is not a number');
  }

  if (end < start) throw new Error('end < start');

  // Fill 0 bytes; we're done
  if (end === start) return 0;
  if (this.length == 0) return 0;

  if (start < 0 || start >= this.length) {
    throw new Error('start out of bounds');
  }

  if (end < 0 || end > this.length) {
    throw new Error('end out of bounds');
  }

  for (var i = start; i < end; i++) {
    this[i] = value;
  }
}

// Static methods
Buffer.isBuffer = function isBuffer(b) {
  return b instanceof Buffer || b instanceof Buffer;
};

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) {
    throw new Error("Usage: Buffer.concat(list, [totalLength])\n \
      list should be an Array.");
  }

  if (list.length === 0) {
    return new Buffer(0);
  } else if (list.length === 1) {
    return list[0];
  }

  if (typeof totalLength !== 'number') {
    totalLength = 0;
    for (var i = 0; i < list.length; i++) {
      var buf = list[i];
      totalLength += buf.length;
    }
  }

  var buffer = new Buffer(totalLength);
  var pos = 0;
  for (var i = 0; i < list.length; i++) {
    var buf = list[i];
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer;
};

Buffer.isEncoding = function(encoding) {
  switch ((encoding + '').toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
    case 'raw':
      return true;

    default:
      return false;
  }
};

// helpers

function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}

function isArray(subject) {
  return (Array.isArray ||
    function(subject){
      return {}.toString.apply(subject) == '[object Array]'
    })
    (subject)
}

function isArrayIsh(subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
         subject && typeof subject === 'object' &&
         typeof subject.length === 'number';
}

function toHex(n) {
  if (n < 16) return '0' + n.toString(16);
  return n.toString(16);
}

function utf8ToBytes(str) {
  var byteArray = [];
  for (var i = 0; i < str.length; i++)
    if (str.charCodeAt(i) <= 0x7F)
      byteArray.push(str.charCodeAt(i));
    else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16));
    }

  return byteArray;
}

function asciiToBytes(str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++ )
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push( str.charCodeAt(i) & 0xFF );

  return byteArray;
}

function base64ToBytes(str) {
  return require("base64-js").toByteArray(str);
}

function blitBuffer(src, dst, offset, length) {
  var pos, i = 0;
  while (i < length) {
    if ((i+offset >= dst.length) || (i >= src.length))
      break;

    dst[i + offset] = src[i];
    i++;
  }
  return i;
}

function decodeUtf8Char(str) {
  try {
    return decodeURIComponent(str);
  } catch (err) {
    return String.fromCharCode(0xFFFD); // UTF 8 invalid char
  }
}

// read/write bit-twiddling

Buffer.prototype.readUInt8 = function(offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  return buffer[offset];
};

function readUInt16(buffer, offset, isBigEndian, noAssert) {
  var val = 0;


  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    val = buffer[offset] << 8;
    if (offset + 1 < buffer.length) {
      val |= buffer[offset + 1];
    }
  } else {
    val = buffer[offset];
    if (offset + 1 < buffer.length) {
      val |= buffer[offset + 1] << 8;
    }
  }

  return val;
}

Buffer.prototype.readUInt16LE = function(offset, noAssert) {
  return readUInt16(this, offset, false, noAssert);
};

Buffer.prototype.readUInt16BE = function(offset, noAssert) {
  return readUInt16(this, offset, true, noAssert);
};

function readUInt32(buffer, offset, isBigEndian, noAssert) {
  var val = 0;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    if (offset + 1 < buffer.length)
      val = buffer[offset + 1] << 16;
    if (offset + 2 < buffer.length)
      val |= buffer[offset + 2] << 8;
    if (offset + 3 < buffer.length)
      val |= buffer[offset + 3];
    val = val + (buffer[offset] << 24 >>> 0);
  } else {
    if (offset + 2 < buffer.length)
      val = buffer[offset + 2] << 16;
    if (offset + 1 < buffer.length)
      val |= buffer[offset + 1] << 8;
    val |= buffer[offset];
    if (offset + 3 < buffer.length)
      val = val + (buffer[offset + 3] << 24 >>> 0);
  }

  return val;
}

Buffer.prototype.readUInt32LE = function(offset, noAssert) {
  return readUInt32(this, offset, false, noAssert);
};

Buffer.prototype.readUInt32BE = function(offset, noAssert) {
  return readUInt32(this, offset, true, noAssert);
};


/*
 * Signed integer types, yay team! A reminder on how two's complement actually
 * works. The first bit is the signed bit, i.e. tells us whether or not the
 * number should be positive or negative. If the two's complement value is
 * positive, then we're done, as it's equivalent to the unsigned representation.
 *
 * Now if the number is positive, you're pretty much done, you can just leverage
 * the unsigned translations and return those. Unfortunately, negative numbers
 * aren't quite that straightforward.
 *
 * At first glance, one might be inclined to use the traditional formula to
 * translate binary numbers between the positive and negative values in two's
 * complement. (Though it doesn't quite work for the most negative value)
 * Mainly:
 *  - invert all the bits
 *  - add one to the result
 *
 * Of course, this doesn't quite work in Javascript. Take for example the value
 * of -128. This could be represented in 16 bits (big-endian) as 0xff80. But of
 * course, Javascript will do the following:
 *
 * > ~0xff80
 * -65409
 *
 * Whoh there, Javascript, that's not quite right. But wait, according to
 * Javascript that's perfectly correct. When Javascript ends up seeing the
 * constant 0xff80, it has no notion that it is actually a signed number. It
 * assumes that we've input the unsigned value 0xff80. Thus, when it does the
 * binary negation, it casts it into a signed value, (positive 0xff80). Then
 * when you perform binary negation on that, it turns it into a negative number.
 *
 * Instead, we're going to have to use the following general formula, that works
 * in a rather Javascript friendly way. I'm glad we don't support this kind of
 * weird numbering scheme in the kernel.
 *
 * (BIT-MAX - (unsigned)val + 1) * -1
 *
 * The astute observer, may think that this doesn't make sense for 8-bit numbers
 * (really it isn't necessary for them). However, when you get 16-bit numbers,
 * you do. Let's go back to our prior example and see how this will look:
 *
 * (0xffff - 0xff80 + 1) * -1
 * (0x007f + 1) * -1
 * (0x0080) * -1
 */
Buffer.prototype.readInt8 = function(offset, noAssert) {
  var buffer = this;
  var neg;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  neg = buffer[offset] & 0x80;
  if (!neg) {
    return (buffer[offset]);
  }

  return ((0xff - buffer[offset] + 1) * -1);
};

function readInt16(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt16(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x8000;
  if (!neg) {
    return val;
  }

  return (0xffff - val + 1) * -1;
}

Buffer.prototype.readInt16LE = function(offset, noAssert) {
  return readInt16(this, offset, false, noAssert);
};

Buffer.prototype.readInt16BE = function(offset, noAssert) {
  return readInt16(this, offset, true, noAssert);
};

function readInt32(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt32(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x80000000;
  if (!neg) {
    return (val);
  }

  return (0xffffffff - val + 1) * -1;
}

Buffer.prototype.readInt32LE = function(offset, noAssert) {
  return readInt32(this, offset, false, noAssert);
};

Buffer.prototype.readInt32BE = function(offset, noAssert) {
  return readInt32(this, offset, true, noAssert);
};

function readFloat(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.readFloatLE = function(offset, noAssert) {
  return readFloat(this, offset, false, noAssert);
};

Buffer.prototype.readFloatBE = function(offset, noAssert) {
  return readFloat(this, offset, true, noAssert);
};

function readDouble(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 7 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.readDoubleLE = function(offset, noAssert) {
  return readDouble(this, offset, false, noAssert);
};

Buffer.prototype.readDoubleBE = function(offset, noAssert) {
  return readDouble(this, offset, true, noAssert);
};


/*
 * We have to make sure that the value is a valid integer. This means that it is
 * non-negative. It has no fractional component and that it does not exceed the
 * maximum allowed value.
 *
 *      value           The number to check for validity
 *
 *      max             The maximum value
 */
function verifuint(value, max) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value >= 0,
      'specified a negative value for writing an unsigned value');

  assert.ok(value <= max, 'value is larger than maximum value for type');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

Buffer.prototype.writeUInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xff);
  }

  if (offset < buffer.length) {
    buffer[offset] = value;
  }
};

function writeUInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 2); i++) {
    buffer[offset + i] =
        (value & (0xff << (8 * (isBigEndian ? 1 - i : i)))) >>>
            (isBigEndian ? 1 - i : i) * 8;
  }

}

Buffer.prototype.writeUInt16LE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt16BE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, true, noAssert);
};

function writeUInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffffffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 4); i++) {
    buffer[offset + i] =
        (value >>> (isBigEndian ? 3 - i : i) * 8) & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt32BE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, true, noAssert);
};


/*
 * We now move onto our friends in the signed number category. Unlike unsigned
 * numbers, we're going to have to worry a bit more about how we put values into
 * arrays. Since we are only worrying about signed 32-bit values, we're in
 * slightly better shape. Unfortunately, we really can't do our favorite binary
 * & in this system. It really seems to do the wrong thing. For example:
 *
 * > -32 & 0xff
 * 224
 *
 * What's happening above is really: 0xe0 & 0xff = 0xe0. However, the results of
 * this aren't treated as a signed number. Ultimately a bad thing.
 *
 * What we're going to want to do is basically create the unsigned equivalent of
 * our representation and pass that off to the wuint* functions. To do that
 * we're going to do the following:
 *
 *  - if the value is positive
 *      we can pass it directly off to the equivalent wuint
 *  - if the value is negative
 *      we do the following computation:
 *         mb + val + 1, where
 *         mb   is the maximum unsigned value in that byte size
 *         val  is the Javascript negative integer
 *
 *
 * As a concrete value, take -128. In signed 16 bits this would be 0xff80. If
 * you do out the computations:
 *
 * 0xffff - 128 + 1
 * 0xffff - 127
 * 0xff80
 *
 * You can then encode this value as the signed version. This is really rather
 * hacky, but it should work and get the job done which is our goal here.
 */

/*
 * A series of checks to make sure we actually have a signed 32-bit number
 */
function verifsint(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

function verifIEEE754(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');
}

Buffer.prototype.writeInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7f, -0x80);
  }

  if (value >= 0) {
    buffer.writeUInt8(value, offset, noAssert);
  } else {
    buffer.writeUInt8(0xff + value + 1, offset, noAssert);
  }
};

function writeInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fff, -0x8000);
  }

  if (value >= 0) {
    writeUInt16(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt16(buffer, 0xffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt16LE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt16BE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, true, noAssert);
};

function writeInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fffffff, -0x80000000);
  }

  if (value >= 0) {
    writeUInt32(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt32(buffer, 0xffffffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt32LE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt32BE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, true, noAssert);
};

function writeFloat(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.writeFloatLE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, false, noAssert);
};

Buffer.prototype.writeFloatBE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, true, noAssert);
};

function writeDouble(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 7 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.writeDoubleLE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, false, noAssert);
};

Buffer.prototype.writeDoubleBE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, true, noAssert);
};

},{"./buffer_ieee754":1,"assert":6,"base64-js":4}],"buffer-browserify":[function(require,module,exports){
module.exports=require('q9TxCC');
},{}],4:[function(require,module,exports){
(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;
	
		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

},{}],5:[function(require,module,exports){


//
// The shims in this file are not fully implemented shims for the ES5
// features, but do work for the particular usecases there is in
// the other modules.
//

var toString = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

// Array.isArray is supported in IE9
function isArray(xs) {
  return toString.call(xs) === '[object Array]';
}
exports.isArray = typeof Array.isArray === 'function' ? Array.isArray : isArray;

// Array.prototype.indexOf is supported in IE9
exports.indexOf = function indexOf(xs, x) {
  if (xs.indexOf) return xs.indexOf(x);
  for (var i = 0; i < xs.length; i++) {
    if (x === xs[i]) return i;
  }
  return -1;
};

// Array.prototype.filter is supported in IE9
exports.filter = function filter(xs, fn) {
  if (xs.filter) return xs.filter(fn);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    if (fn(xs[i], i, xs)) res.push(xs[i]);
  }
  return res;
};

// Array.prototype.forEach is supported in IE9
exports.forEach = function forEach(xs, fn, self) {
  if (xs.forEach) return xs.forEach(fn, self);
  for (var i = 0; i < xs.length; i++) {
    fn.call(self, xs[i], i, xs);
  }
};

// Array.prototype.map is supported in IE9
exports.map = function map(xs, fn) {
  if (xs.map) return xs.map(fn);
  var out = new Array(xs.length);
  for (var i = 0; i < xs.length; i++) {
    out[i] = fn(xs[i], i, xs);
  }
  return out;
};

// Array.prototype.reduce is supported in IE9
exports.reduce = function reduce(array, callback, opt_initialValue) {
  if (array.reduce) return array.reduce(callback, opt_initialValue);
  var value, isValueSet = false;

  if (2 < arguments.length) {
    value = opt_initialValue;
    isValueSet = true;
  }
  for (var i = 0, l = array.length; l > i; ++i) {
    if (array.hasOwnProperty(i)) {
      if (isValueSet) {
        value = callback(value, array[i], i, array);
      }
      else {
        value = array[i];
        isValueSet = true;
      }
    }
  }

  return value;
};

// String.prototype.substr - negative index don't work in IE8
if ('ab'.substr(-1) !== 'b') {
  exports.substr = function (str, start, length) {
    // did we get a negative start, calculate how much it is from the beginning of the string
    if (start < 0) start = str.length + start;

    // call the original function
    return str.substr(start, length);
  };
} else {
  exports.substr = function (str, start, length) {
    return str.substr(start, length);
  };
}

// String.prototype.trim is supported in IE9
exports.trim = function (str) {
  if (str.trim) return str.trim();
  return str.replace(/^\s+|\s+$/g, '');
};

// Function.prototype.bind is supported in IE9
exports.bind = function () {
  var args = Array.prototype.slice.call(arguments);
  var fn = args.shift();
  if (fn.bind) return fn.bind.apply(fn, args);
  var self = args.shift();
  return function () {
    fn.apply(self, args.concat([Array.prototype.slice.call(arguments)]));
  };
};

// Object.create is supported in IE9
function create(prototype, properties) {
  var object;
  if (prototype === null) {
    object = { '__proto__' : null };
  }
  else {
    if (typeof prototype !== 'object') {
      throw new TypeError(
        'typeof prototype[' + (typeof prototype) + '] != \'object\''
      );
    }
    var Type = function () {};
    Type.prototype = prototype;
    object = new Type();
    object.__proto__ = prototype;
  }
  if (typeof properties !== 'undefined' && Object.defineProperties) {
    Object.defineProperties(object, properties);
  }
  return object;
}
exports.create = typeof Object.create === 'function' ? Object.create : create;

// Object.keys and Object.getOwnPropertyNames is supported in IE9 however
// they do show a description and number property on Error objects
function notObject(object) {
  return ((typeof object != "object" && typeof object != "function") || object === null);
}

function keysShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.keys called on a non-object");
  }

  var result = [];
  for (var name in object) {
    if (hasOwnProperty.call(object, name)) {
      result.push(name);
    }
  }
  return result;
}

// getOwnPropertyNames is almost the same as Object.keys one key feature
//  is that it returns hidden properties, since that can't be implemented,
//  this feature gets reduced so it just shows the length property on arrays
function propertyShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.getOwnPropertyNames called on a non-object");
  }

  var result = keysShim(object);
  if (exports.isArray(object) && exports.indexOf(object, 'length') === -1) {
    result.push('length');
  }
  return result;
}

var keys = typeof Object.keys === 'function' ? Object.keys : keysShim;
var getOwnPropertyNames = typeof Object.getOwnPropertyNames === 'function' ?
  Object.getOwnPropertyNames : propertyShim;

if (new Error().hasOwnProperty('description')) {
  var ERROR_PROPERTY_FILTER = function (obj, array) {
    if (toString.call(obj) === '[object Error]') {
      array = exports.filter(array, function (name) {
        return name !== 'description' && name !== 'number' && name !== 'message';
      });
    }
    return array;
  };

  exports.keys = function (object) {
    return ERROR_PROPERTY_FILTER(object, keys(object));
  };
  exports.getOwnPropertyNames = function (object) {
    return ERROR_PROPERTY_FILTER(object, getOwnPropertyNames(object));
  };
} else {
  exports.keys = keys;
  exports.getOwnPropertyNames = getOwnPropertyNames;
}

// Object.getOwnPropertyDescriptor - supported in IE8 but only on dom elements
function valueObject(value, key) {
  return { value: value[key] };
}

if (typeof Object.getOwnPropertyDescriptor === 'function') {
  try {
    Object.getOwnPropertyDescriptor({'a': 1}, 'a');
    exports.getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  } catch (e) {
    // IE8 dom element issue - use a try catch and default to valueObject
    exports.getOwnPropertyDescriptor = function (value, key) {
      try {
        return Object.getOwnPropertyDescriptor(value, key);
      } catch (e) {
        return valueObject(value, key);
      }
    };
  }
} else {
  exports.getOwnPropertyDescriptor = valueObject;
}

},{}],6:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// UTILITY
var util = require('util');
var shims = require('_shims');
var pSlice = Array.prototype.slice;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  this.message = options.message || getMessage(this);
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = shims.keys(a),
        kb = shims.keys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};
},{"_shims":5,"util":7}],7:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var shims = require('_shims');

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  shims.forEach(array, function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = shims.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = shims.getOwnPropertyNames(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }

  shims.forEach(keys, function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = shims.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }

  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (shims.indexOf(ctx.seen, desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = shims.reduce(output, function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return shims.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) && objectToString(e) === '[object Error]';
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return arg instanceof Buffer;
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = shims.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = shims.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

},{"_shims":5}]},{},[])
;;module.exports=require("buffer-browserify")

},{}]},{},[3])
;