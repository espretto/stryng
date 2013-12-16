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
        /*
        if(this == null) throw new TypeError('can\'t convert '+this+' to object');
        
        for(var o = Object(this), i = o.length >>> 0; i--;)
        {
            if(i in o)
            {
                if(o[i] === search) return true;
            }
        }

        return false;
        */
       
        // no spec compliance intended - for internal use only
        var arr = this,
            i = arr.length;

        while(i-- && arr[i] !== search);

        return i !== -1;
    },

    array_forEach = methods.forEach || function(iterator, context)
    {
        /*
        if(this == null) throw new TypeError('can\'t convert '+this+' to object');
        
        for(var o = Object(this), length = o.length >>> 0, i = 0; length !== i++;)
        {
            if(i in o)
            {
                iterator.call(context, o[i], i, o);
            }
        }
        */

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
        quote: /*JSON && JSON.stringify &&
        function(input){ return input != null ? '"' + JSON.stringify(input) + '"' : exit(arguments) } ||
        */function(input){

            input = input != null ? String(input) : exit(arguments);

            var specialEscapeMap =
            {
                "\'" : "\\'",  // single quote
                "\"" : "\\\"", // double quote
                "\\" : "\\\\", // backslash
                "\n" : "\\n",  // new line
                "\r" : "\\r",  // carriage return
                "\t" : "\\t",  // tab
                "\b" : "\\b",  // backspace
                "\f" : "\\f"   // form feed
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
         * @param  {number} n
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

            var length = charset.length;

            while(n--)
            {
                result += charset[random() * length | 0];
            }

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

    // override Object#toString
    Stryng.prototype.value =
    Stryng.prototype.toString = function(){ return this._value }

    /////////////////////////////
    // purely static functions //
    /////////////////////////////

    /**
     * alias to native [String.fromCharCode]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/fromCharCode}
     * will, as a static method, not be available for OOP.
     * <em>alias:</em> <code>Stryng.fromCharCode</code>
     * @function Stying.chr
     * @example
     * Stryng.chr.apply(null, 72, 101, 108, 2, 111, 32, 87, 111, 114, 108, 100);
     * // returns "Hello World"
     */
    Stryng.fromCharCode = Stryng.chr = string_fromCharCode;
    
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
     * delegates to native <code>String.prototype.charCodeAt</code>
     * @function Stying.ord
     * @param {string} input
     * @param {number} index
     * @returns {number}
     *   the numeric representation of <code>input</code> at <code>index</code>
     *   according to the Unicode table
     */
    Stryng.ord = Stryng.charCodeAt;
    Stryng.prototype.ord = Stryng.prototype.charCodeAt;

    /**
     * delegates to native <code>String.prototype.concat</code>
     * @function Stying.append
     * @param {...string} input
     * @returns {string}
     *   the given argumentsstrings to be concatenated
     */
    Stryng.append = Stryng.concat;
    Stryng.prototype.append = Stryng.prototype.concat;

    //////////////////////////
    // expose Stryng object //
    //////////////////////////

    return Stryng;

});