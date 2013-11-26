/**
 * @file 
 * @see [article on generics]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String#String_generic_methods} at MDN.
 * @version 0.0.1
 * @author Marius Runge <espretto@gmail.com>
 */

// https://github.com/umdjs/umd/blob/master/returnExports.js
(function (root, factory){

    if (typeof define === 'function' && define.amd)
    {
        // AMD. Register as an anonymous module.
        define(factory);

    }
    else if(typeof exports === 'object' && module.exports)
    {
        // Node. Does not work with strict CommonJS,
        // but only CommonJS-like enviroments
        // that support module.exports, like Node.
        module.exports = factory();
    }
    else
    {
        // Browser globals (root is window)
        var Stryng = factory(),
            _Stryng = root.Stryng;

        /**
         * availabel in browsers only.
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

}(this, function(){ var

    ////////////////////////////////////////////
    // String instance methods which's        //
    // generic versions Stryng hopes to adopt //
    ////////////////////////////////////////////

    methods = [

        'charAt', 'charCodeAt', 'codePointAt', 'contains',
        'endsWith', 'fromCodePoint', 'indexOf', 'lastIndexOf',
        'localeCompare', 'match', 'normalize', 'replace', 'search',
        'slice', 'split', 'startsWith', 'substr', 'substring',
        'toLocaleLowerCase', 'toLocaleUpperCase', 'toLowerCase',
        'toUpperCase', 'trim', 'trimLeft', 'trimRight'
    ],

    ////////////////////////////////
    // quick access variables     //
    // to native instance methods //
    ////////////////////////////////

    slice = methods.slice,

    splice = methods.splice,

    unshift = methods.unshift,

    toString = Object.prototype.toString,

    forEach = methods.forEach || function(iterator, context)
    {
        // no spec-compliant polyfill intended - for internal use only

        // faster, higher, better .. ill-egible
        for(var
            self = this,
            length = self.length,
            i = -1;
            ++i !== length;
        ){
            if(i in self)
            {
                iterator.call(context, self[i], i, self);
            }
        }
    },

    // for the w3c-wishlist
    forOwn = function(iterator, context)
    {
        var self = this, key;

        for(key in self)
        {
            if(self.hasOwnProperty(key))
            {
                iterator.call(context, self[key], key, self);
            }
        }
    },

    //////////////////////////////
    // quick access variables   //
    // to native static methods //
    //////////////////////////////

    abs = Math.abs,

    random = Math.random,

    fromCharCode = String.fromCharCode,

    isFinite = isFinite,

    encodeURIComponent = encodeURIComponent,

    decodeURIComponent = decodeURIComponent,

    ///////////////////////////////////////
    // regular expressions (precompiled) //
    ///////////////////////////////////////

    reFloat = /^\d+\.?\d*e?[\+-]?\d*$/,

    reWord = /\w/,

    reWhitespace = /\s+/,

    reNotWhitespace = /\S/,

    reQuote = /^['|"]+|["|']+$/g,

    reNotPrintable = (function(begin, end, i, max){

        while(++i !== max)
        {
            // escape them all
            begin += '\\' + fromCharCode(i);
        }

        return new RegExp(begin + end);

    })('[^', ']', 31, 127),

    /////////////////////////
    // class / type checks //
    /////////////////////////
    
    is =
    {
        // 'Arguments': function(o){ return toString.call(o) === is.ObjectArguments || o && o.callee != null },
        'Array': Array.isArray || function(o){ toString.call(o) === is.ObjectArray },
        // 'Boolean': function(o){ return typeof o === is.TypeBoolean || toString.call(o) === is.ObjectBoolean },
        // 'Date': function(o){ return toString.call(o) === is.ObjectDate }
        'Function': function(o){ typeof o === is.TypeFunction || toString.call(o) === is.ObjectFunction },
        // 'Number': function(o){ return typeof o === is.TypeNumber || toString.call(o) === is.ObjectNumber},
        // 'Object': function(o){ return toString.call(o) === is.ObjectObject},
        'RegExp': function(o){ toString.call(o) === is.ObjectRegExp },
        'String': function(o){ typeof o === is.TypeString || toString.call(o) === is.ObjectString }
    }

    ; // end var block

    forOwn.call(is, function(fn, type){

        this['Type' + type] = type.toLowerCase();
        this['Object' + type] = '[object ' + type + ']';
    });

    ///////////////////////
    // utility functions //
    ///////////////////////

    function exit(path, args)
    {
        throw new Error('invalid usage of ' + fnName + ' with given args [' + slice.call(args) + ']');
    }

    // works on the array - does not copy
    function flatten(array) 
    {
        // length changes by splicing
        for(var i = 0; i !== array.length;)
        {
            var item = array[i];

            if(is.Array(item))
            {
                item.unshift(i, 0);
                splice.apply(array, item);
            }
            else
            {
                i++;
            }
        }
        return array;
    }

    /**
     * composes <code>Math.abs</code> and {@linkcode Stryng.toInt}
     * @function Stryng.toNat
     * @param {*} n   - value to be parsed
     * @param {*} [m] - default value to be parsed
     * @return {number} natural <code>n</code>
     */
    function toNat(n, m)
    {
        return abs(toInt(n, m));
    }

    /**
     * parses <code>n</code> following these rules:
     * <ul>
     *     <li><code>null</code>, <code>undefined</code> and <code>NaN</code>
     *     (after parsing with <code>+</code>) are mapped to <code>0</code></li>
     *     <li>if <code>m</code> is specified though, <code>toInt(m)</code>
     *     will be returned</li>
     * </ul>
     * note that <code>toInt</code> uses the <code>+</code> operator instead of
     * <code>parseFloat</code> because the latter omits trailing non-number characters
     * <em>and succeeds</em>.
     * see [parseFloat]{@linkcode http://www.w3schools.com/jsref/jsref_parsefloat.asp}
     * for the details.
     * @function Stryng.toInt
     * @param {*} n     - to be parsed
     * @param {*} [m=0] - default value to be parsed. <strong>not</strong> the radix
     * @return {number} parsed and floored <code>n</code>
     * @example
     * toInt('1,000')      // returns 0
     * parseFloat('1,000') // returns 1
     *
     * toInt('5.99$', 1)   // returns 1
     * parseFloat('5.99$') // returns 5.99
     */
    function toInt(n, m)
    {
        if (n == null || (n = +n) !== n)
        {
            if(m == null)
            {
                return 0;
            }

            return toInt(m);
        }
        
        if(isFinite(n))
        {
            n |= 0; // Math.floor
        }

        return n;
    }

    /**
     * delegates to native <code>parseFloat</code>
     * but resorts to the given default value
     * if <code>n</code> is of type string but does not
     * <em>completely</em> match the number or scientific format.
     * @param  {*} n     - to be parsed
     * @param  {*} [m=0] - default value to be parsed.
     * @return {number}
     * @example
     * Stryng.toFloat('1e3SciFi'); // returns 0
     * parseFloat('1e3SciFi')      // returns 1000          
     */
    function toFloat(n, m)
    {
        if(n == null || is.String(n) && !reFloat.test(n))
        {
            if(m == null)
            {
                return 0;
            }
            
            return toFloat(m);
        }

        return parseFloat(n);
    }

    //////////
    // Main //
    //////////
    
    /**
     * generic utility functions to ease working with Strings.
     * native instance of <code>String</code> get mixed in with inverted signatures.
     * @global
     * @class  Stryng
     */
    function Stryng(obj)
    {
        if(!(this instanceof Stryng)) return new Stryng(obj);
        this.value = obj == null ? '' : String(obj);
    }

    var StryngGenerics = {

        // have been kept private for faster access and less typing
        toNat: toNat,
        toInt: toInt,
        toFloat: toFloat,

        /**
         * upper-cases the first letter. ignores the empty string.
         * @function Stryng.capitalize
         * @param  {string} input
         * @return {string}
         * @throws {TypeError}  if any required argument is missing
         */
        capitalize: function(input)
        {
            var length = input.length;
            return (
                length === 0 ? input :
                length === 1 ? input.toUpperCase() :
                input.charAt(0).toUpperCase() + input.substring(1)
            );
        },

        /**
         * counts the number of non-overlapping occurences
         * of <code>search</code>. returns <code>input.length - 1</code>
         * if <code>search</code> is the empty string,
         * having <code>'foo'.split('').length - 1</code> in mind.
         * @function Stryng.count
         * @param    {string}                   input
         * @param    {(string|RegExp)} search - the character, string or regular expression
         *                                      (<code>g</code>-flag has to be set) to search for.
         * @return   {number}                
         * @throws   {Error}                    if any required argument is missing
         */
        count: function(input, search)
        {
            var count = 0,
                i = search.length

            if (is.RegExp(search))
            {
                while(search.exec(input))
                {
                    count++;
                }
            }
            // prevent unexpected behaviors like
            // 
            //     // evaluates to true
            //     '[object Object]'.indexOf({}) == 0
            //     
            else if(i === 0)
            {
                count = input.length - 1;
            }
            else
            {
                for(var index = input.indexOf(search); index !== -1;)
                {
                    count++;
                    index = input.indexOf(search, index + i);
                }
            }

            return count;
        },

        /**
         * @function Stryng.count2
         * @deprecated slower - use {@link Stryng.count} instead
         * @todo test and benchmark across browsers
         */
        count2: function(input, search)
        {
            var count = 0;
                i = search.length;

            if (is.RegExp(search))
            {
                count = input.split(search).length - 1;
            }
            else if(i === 0)
            {
                count = input.length - 1;
            }
            else if(i === 1)
            {
                for(var j = input.length; j--;)
                {
                    // cast from boolean to number
                    count += input.charAt(j) === search;
                }
            }
            else
            {
                for(var index = input.indexOf(search); index !== -1;)
                {
                    count++;
                    index = input.indexOf(search, index + i);
                }
            }

            return count;
        },

        /**
         * delegates to <code>Array.prototype.join</code>.
         * passed arguments (or array items) should be strings
         * to avoid unexpected behavior. takes at least two arguments.
         * @function Stryng.join
         * @param  {string}               delimiter - separator
         * @param  {...(string|string[])} strings   - strings or (nested) array(s) of strings. arguments will be flattened.
         * @return {string}
         * @throws {(Error|TypeError)} if any required argument is missing
         * @example
         * // returns 'the quick brown fox jumps over the lazy dog'
         * Stryng.join(' ', the', ['quick', ['brown', ['fox', ['jumps', ['over', ['the', ['lazy', ['dog']]]]]]]])
         */
        join: function(input /* strings */)
        {
            if(arguments.length < 2)
            {
                exit('Stryng.join()', arguments);
            }

            return flatten(slice.call(arguments, 1)).join(input);
        },

        /**
         * reverses the given string.
         * @function Stryng.reverse
         * @param  {string} input
         * @return {string}
         * @throws {(Error|TypeError)} if any required argument is missing
         */
        reverse: function(input)
        {
            var result = '', i;
            
            for(i = input.length; i--;)
            {
                result += input.charAt(i);
            }

            return result;
        },

        /**
         * @function Stryng.reverse2
         * @deprecated slower - use {@link Stryng.reverse} instead
         * @todo test and benchmark across browsers
         */
        reverse2: function(input)
        {
            return input.split('').reverse().join('');
        },

        /**
         * replaces the given <code>oldString</code> with the given <code>newString</code>.
         * if <code>n</code> is negative, last occurrences of <code>oldString</code>
         * will be replaced first.
         * @function Stryng.exchange
         * @param  {string} input
         * @param  {string} oldString    - string to replace
         * @param  {string} newString    - replacement
         * @param  {number} [n=Infinity] - parsed by {@link Stryng.toInt}.
         *                                 number of replacements
         * @return {string}
         * @throws {(Error|TypeError)} if any required argument is missing
         */
        exchange: function(input, oldString, newString, n)
        {
            if(newString == null || oldString == null) exit('Stryng.exchange()', arguments);
            n = toInt(n);
            if(n == null || !isFinite(n)) return input.split(oldString).join(newString);
            else if(n === 0) return input;
            else if(n > 0) return Stryng.lsplit(input, oldString, n);
            else /* if(n < 0) */ return Stryng.rsplit(input, oldString, n);
        },

        /**
         * concatenates the given string with the <code>padding</code>
         * until <code>input</code> reaches length <code>n</code> times.
         * if <code>n</code> is negative, the <code>padding</code>
         * will be prepended - appended otherwise. to prepend and append
         * in one go, use {@link Stryng.wrap}.
         * @function Stryng.pad
         * @param  {string} input
         * @param  {number} n
         *   parsed by {@link Stryng.toInt}. the length up to which
         *   to pre-/append <code>padding</code> to <code>input</code>.
         * @param  {string} [padding=' ']
         *   string to concatenate <code>input</code> with.
         *   the default is preferred over the empty string.
         * @return {string}
         * @throws {(Error|TypeError)}
         *   if any required argument is missing
         * @throws {(Error|TypeError)}
         *   if <code>n</code> results to <code>0</code> or is infinite
         * @throws {(Error|TypeError)}
         *   if <code>padding</code>'s length is bigger than 1
         * @example
         * // returns ['00', '01', '10', '11']
         * [0,1,2,3].map(function(item){
         * 
         *     return Stryng.pad(item.toString(2), '0', 2);
         * });
         */
        pad: function(input, maxLength, padding, exact)
        {
            padding = padding || ' ';

            maxLength = toInt(maxLength);

            if(maxLength === 0 || !isFinite(maxLength)) exit('Stryng.pad()', arguments);
            
            var pLength = padding.length;

            if(maxLength > 0)
            {
                for(; input.length < maxLength; maxLength -= pLength)
                {
                    input += padding;
                }

                if(exact)
                {
                    input += padding.substring(0, maxLength - input.length);
                }
            }
            else if(maxLength < 0)
            {
                maxLength = abs(maxLength);

                // introduced 'temp' because appending is faster than prepending
                for(var temp = ''; input.length < maxLength; maxLength -= pLength)
                {
                    temp += padding;
                }

                if(exact)
                {
                    input = temp.substring(temp.length - maxLength);
                }
                else
                {
                    input = temp.substring(pLength) + input;
                }
            }

            return input;
        },

        /**
         * prepends the prefix to the given string. works similar
         * to native <code>String.prototype.concat</code>.
         * @function Stryng.prepend
         * @param {string} input
         * @param {...string} prefix - an arbitrary number of strings to prepend in the given order
         * @return {string}
         * @example
         * // returns 'Hello World!'
         * Stryng.prepend('!', 'World', ' ', 'Hello');
         *
         * // which equals the more intuitive
         * ['!', 'World', ' ', 'Hello'].reverse().join('');
         */
        prepend: function(/* input, prefixes */)
        {
            var args = arguments, // promote compression
                i = args.length - 1,
                result = args[i];

            while(i--)
            {
                result += args[i];
            }

            return result;
        },

        /**
         * @function Stryng.prepend2
         * @deprecated slower - use {@link Stryng.prepend} instead
         * @todo test and benchmark across browsers
         */
        prepend2: function(/* input, prep1, ..., prepN */)
        {
            return slice.call(arguments).reverse().join('');
        },

        /**
         * strips <code>prefix</code> from the left of <code>input</code>
         * <code>n</code> times. to strip <code>prefix</code> as long
         * as it remains a prefix to the result, pass <code>Infinity</code> or <code>1/0</code>.
         * @function Stryng.lstrip
         * @param  {string} input
         * @param  {string} prefix - string to remove
         * @param  {number} [n=1]  - parsed by {@link Stryng.toNat}.
         *                           number of operations (recursion depth)
         * @return {string}
         * @throws {(Error|TypeError)} if any required argument is missing
         * @example
         * // returns 'loosy'
         * Stryng.lstrip('lefty loosy', 'lefty ');
         *
         * // returns the empty string
         * Stryng.lstrip('blubblubblub', 'blub');
         */
        lstrip: function(input, prefix, n)
        {
            n = toNat(n, 1)

            var pLength = prefix.length,
                index = input.indexOf(prefix),
                i = 0; // pending index

            while( // startsWith(prefix, i) where i is the offset
                n-- &&
                index === i
            ){
                i += pLength;
                index = input.indexOf(prefix, i);
            }

            return i ? input.substring(i) : input;
        },

        /**
         * @function Stryng.lstrip2
         * @deprecated use {@link Stryng.lstrip} instead
         * @todo merge into {@link Stryng.lstrip} for inputs of <code>n > 5</code> - faster
         * @todo test and benchmark across browsers
         */
        lstrip2: function(input, prefix, n)
        {
            n = toNat(n, 1)

            var pLength = prefix.length;

            while(
                n-- &&
                input.indexOf(prefix) === 0
            ){
                input = input.substring(pLength);
            }

            return input;
        },

        /**
         * @function Stryng.lstrip3
         * @deprecated slowest - use {@link Stryng.lstrip} instead
         * @todo test and benchmark across browsers
         */
        lstrip3: function(input, prefix, n)
        {
            n = toNat(n, 1);

            var vLength = input.length,
                pLength = prefix.length,
                pLastIndex = pLength - 1,
                i = -1, j, k = 0;
                
            while(++i !== vLength)
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
         * the right-associative version of {@link Stryng.lstrip}
         * @function Stryng.rstrip
         * @param  {string} input
         * @param  {string} suffix - string to remove
         * @param  {number} [n=1]  - parsed by {@link Stryng.toNat}.
         *                           number of operations (recursion depth)
         * @return {string}
         * @throws {(Error|TypeError)} if any required argument is missing
         */
        rstrip: function(input, suffix, n)
        {
            n = toNat(n, 1);

            var sLength = suffix.length,
                iLength = input.length,
                i = input.lastIndexOf(suffix),
                j = iLength; // pending index

            while( // endsWith
                n-- &&
                i !== -1 &&
                i === iLength - sLength
            ){
                j = i;
                iLength -= sLength; 
                i = input.lastIndexOf(suffix, i - 1);
            }

            return input.substring(0, j);
        },

        /**
         * the combination of {@link Stryng.lstrip} and {@link Stryng.rstrip}
         * @function Stryng.strip
         * @param  {string} input
         * @param  {string} outfix - string to remove
         * @param  {number} [n=1]  - parsed by {@link Stryng.toInt}.
         *                           number of operations (recursion depth)
         * @return {string}
         * @throws {(Error|TypeError)} if any required argument is missing
         */
        strip: function(input, outfix, n)
        {
            return Stryng.rstrip(Stryng.lstrip(input, outfix, n), outfix, n);
        },

        /**
         * securely removes all HTML tags by preserving any quoted contents 
         * @function Stryng.stripHTMLTags
         * @param  {string} input - HTML
         * @return {string}       - <code>input</code> with HTML-tags removed
         * @throws {(Error|TypeError)} if any required argument is missing
         * @todo fasten
         */
        stripHTMLTags: function(input)
        {
            var mem = [],
                i = 0;

            return input

                .replace(/("|')(?:\\\1|[^(?:\1)])*\1/g, function(match){

                    mem[i];
                    return '_' + (i++) + '_';
                })

                .replace(/<[^>]*>/g, '')

                .replace(/_(\d+)_/, function(match, i){

                    return mem[i];
                });
        },

        /**
         * @function Stryng.splitAt
         * @param  {string} input
         * @param {...number} index
         *   indices to split at. negative values
         *   allowed. uses native <code>String.prototype.slice</code>
         *   internally.
         * @return {string[]}
         */
        splitAt: function(input /* indices */)
        {
            var args   = arguments,       // promote compression
                i      = args.length - 1, // exclude 'input'
                k, j   = 0,               // pending indices
                result = [];

            while(i--)
            {
                k = toInt(args[i]);
                result.push(input.slice(j,k));
                j = k;
            }

            result.push(input.slice(k));
            return result;
        },

        /**
         * splits <code>input</code> by <code>delimiter</code> <code>n</code> times
         * searching forwards. the left eventually untouched string will be the first argument
         * hence the maximum length of the returned array is <code>n + 1</code>.
         * passing <code>0</code> or <code>Infinity</code> will return an empty
         * array to conform with the native <code>String#split</code>'s behavior.
         * do not confuse this with the indicated default input for <code>n</code>.
         * @function Stryng.lsplit
         * @param  {string} input
         * @param  {string} [delimiter=/\s+/] - defaults to a grouped arbitrary number of whitespace
         * @param  {number} [n=Infinity]      - parsed by {@link Stryng.toNat}.
         *                                      maximum number of split operations.
         * @return {string[]}
         * @throws {(Error|TypeError)} if any required argument is missing
         * @example
         * // returns ['the','quick','brown','fox jumps over the lazy dog']
         * Stryng.lsplit('the quick brown fox jumps over the lazy dog', null, 3);
         *
         * // returns the same as native split
         * Stryng.lsplit('the quick brown fox jumps over the lazy dog');
         */
        lsplit: function(input, delimiter, n)
        {
            if(delimiter == null)
            {
                return input.split(reWhitespace);
            }
            else if(n == null)
            {
                return input.split(delimiter);
            }
            else if((n = toNat(n)) === 0 || !isFinite(n))
            {  
                return []; // conform with native split
            }
            else
            {
                var // map to native split
                    result = input.split(delimiter, n),
                
                    // sum up delimiter lengths
                    i = result.length,
                    index = i * delimiter.length;

                while(i--)
                {
                    // sum up splitted items' lengths
                    index += result[i].length; 
                }

                // restore the remainder
                result.push(input.substring(index));

                return result;
            }
        },

        /**
         * the right-associative version of {@link Stryng.lsplit}
         * splits <code>input</code> by <code>delimiter</code> <code>n</code> times
         * searching backwards.
         * @function Stryng.rsplit
         * @param  {string} input
         * @param  {string} [delimiter=/\s+/] - defaults to a grouped arbitrary number of whitespace
         * @param  {number} [n=Infinity]      - parsed by {@link Stryng.toNat}.
         *                                      maximum number of split operations.
         * @return {string[]}
         * @throws {(Error|TypeError)} if any required argument is missing
         */
        rsplit: function(input, delimiter, n)
        {
            if (delimiter == null)
            {
                return input.split(reWhitespace);
            }

            if(n == null)
            {
                return input.split(delimiter);
            }

            n = toNat(n);

            if(n === 0 || !isFinite(n))
            {  
                return []; // conform with native split
            }
            
            // **TODO** think of a faster implementation
            var every = input.split(delimiter),
                lasts = every.slice(n),
                first = every.slice(0, n).join(delimiter);

            lasts.unshift(first);

            return lasts;
        },

        /**
         * prepends and appends <code>outfix</code> to <code>input</code>.
         * to do the opppsite use {@link Stryng.strip}.
         * @function Stryng.wrap
         * @param  {string} input
         * @param  {string} outifx - prefix and suffix
         * @param  {number} [n=1]  - parsed by {@link Stryng.toNat}
         *                           number of operations (recursion depth)
         * @return {string}
         * @throws {(Error|TypeError)} if any required argument is missing
         */
        wrap: function(input, outifx, n)
        {
            if(input == null || outifx == null)
            {
                exit('Stryng.wrap()', arguments);
            }

            for(n = toNat(n, 1); n--;)
            {
                input = outifx + (input += outifx);
            }

            return input;
        },

        /**
         * @function Stryng.quote
         * @param  {string} input
         * @return {string} <code>input</code> wrapped in double quotes
         * @throws {(Error|TypeError)} from within/like {@link Stryng.wrap}
         */
        quote: function(input)
        {
            if(input == null)
            {
                exit('Stryng.quote()', arguments);
            }

            return '"' + input + '"';
        },

        /**
         * trims an arbitrary number of single and double quotes from both ends of <code>input</code>.
         * @function Stryng.unquote
         * @param {string} input
         * @return {string}
         * @throws {(Error|TypeError)} if any required argument is missing
         */
        unquote: function(input)
        {
            return input.replace(reQuote, '');
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
         * @return {string}
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
        },

        /**
         * strictly type checks the equality of at least two strings.
         * @function Stryng.isEqual
         * @param  {string}    input
         * @param  {...string} comp  - strings to compare with
         * @return {boolean}
         * @throws {Error} if not at least two arguments are passed
         */
        isEqual: function(input /* comparables */)
        {
            var args = arguments, // promote compression
                i = args.length;

            if(i < 2)
            {
                exit('Stryng.isEqual()', args);
            }
            
            while(args[i--] === input);
            
            return i === -1;
        },

        /**
         * case-insensitive version of {@link Stryng.isEqual}
         * @function Stryng.isEquali
         * @param {string} input
         * @param {...string} comp
         *   strings to compare with
         * @return {boolean}
         * @throws {(Error|TypeError)}
         *   if not at least two arguments are passed
         */
        isEquali: function(input /*comparables */)
        {
            var args = arguments, // promote compression
                i = args.length;

            if(i < 2)
            {
                exit('Stryng.isEqual()', args);
            }

            input = input.toLowerCase();
            
            while(args[i--].toLowerCase === input);
            
            return i === -1;
        },

        /**
         * wraps access to <code>input.length</code>.
         * @function Stryng.length
         * @param {string} input
         * @returns {number} <code>input.length</code>
         * @throws {TypeError} if any required argument is missing
         * @example usage:
         * var pangram = ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog'];
         *  
         * // returns true - given the pluck is implemented somewhere
         * pangram.map(Stryng.length) == pluck(pangram, 'length')
         */
        length: function(input)
        {
            return input.length;
        },

        /**
         * @function Stryng.isEmpty
         * @param  {string}  input
         * @return {boolean} whether the string has length <code>0</code>
         * @throws {TypeError} if any required argument is missing
         */
        isEmpty: function(input)
        {
            return input.length === 0;
        },

        /**
         * @function Stryng.isBlank
         * @param  {string}  input
         * @return {boolean}
         *   whether the string is empty
         *   or consists only of whitespace characters
         * @throws {TypeError}
         *   if any required argument is missing
         */
        isBlank: function(input)
        {
            return input.length === 0 || reNotWhitespace.test(input);
        },

        /**
         * @function Stryng.isNumeric
         * @param  {string}  input
         * @return {boolean} whether the string is numeric
         * @throws {(Error|TypeError)} if any required argument is missing
         * @example
         * // returns false
         * Stryng.isNumeric('123,00')
         *
         * // returns true
         * Stryng.isNumeric('123.00')
         */
        isNumeric: function(input)
        {
            if(input == null)
            {
                exit('Stryng.isNumeric()', arguments);
            }

            input = +input;

            return input === input; // true if not NaN
        },

        /**
         * @function Stryng.isPrintable
         * @param  {String}  input
         * @return {Boolean}
         *   whether the input holds any non
         *   ASCII printable characters (32 to 126 both inclusive);
         * @throws {Error} if any required argument is missing
         */
        isPrintable: function(input)
        {
            if(input == null)
            {
                exit('Stryng.isPrintable()', arguments)
            }

            return !reNotPrintable.test(input);
        },
        
        /**
         * @function Stryng.isPrintable2
         * @deprecated slower - use {@link Stryng.isPrintable}
         * @todo merge into isPrintable for inputs shorter than 30
         */
        isPrintable2: function(input)
        {
            for(var i = input.length; i--;)
            {
                var charCode = input.charCodeAt(i);

                if(32 > charCode || charCode > 126)
                {
                    return false;
                }
            }

            return true;
        },
        
        /**
         * truncates the <code>input</code> to fit the given
         * <code>maxLength</code> including the <code>ellipsis</code>
         * @param  {string} input
         * @param  {number} maxLength
         *   parsed by {@link Stryng.toNat}
         * @param  {string} [ellipsis='...']
         * @param  {boolean} [byChars=false]
         *   whether to search for the nearest word boundary
         *   or cut off at the exact index
         * @return {string}
         * @todo how to handle situations where ellipsis is longer than input?
         * @todo <code>exact</code> not yet implemented
         */
        truncate: function(input, maxLength, ellipsis, byChars)
        {
            ellipsis = ellipsis == null ? '...' : ellipsis;
            maxLength = toNat(maxLength) - ellipsis.length;

            if(byChars)
            {
                return input.substring(0, maxLength) + ellipsis;
            }

            while(
                maxLength >= 0 &&
                reWord.test(input.charAt(maxLength))
            ){
                maxLength--;
            }

            return input.substring(0, maxLength) + ellipsis;
        },
        
        /**
         * generates a string of random characters
         * which default to the ASCII printables.
         * @param  {number} n
         *   length. parsed by {@link Stryng.toNat}
         * @param  {(number|string)} [from=32]
         *   min char code (inclusive) or character
         *   sequence to choose from. in case of the latter
         *   parameter <code>to</code> will be ignored.
         *   in case of the former <code>from</code> will be
         *   parsed by {@link Stryng.toNat}
         * @param  {number} [to=126]
         *   max char code (inclusive).
         *   parsed by {@link Stryng.toNat}
         * @return {string}
         */
        random: function(n, from, to)
        {
            n = toNat(n);
            var result = '';

            // interpret 'from' as the charset
            // to choose from and ignore 'to'
            if(is.String(from))
            {
                for(var c = from.length; n--;)
                {
                    result += from.charAt(random() * c | 0);
                }

                return result;
            }
            
            // printable ASCII characters by default
            from = toNat(from, 32);
            to = toNat(from, 126);

            if(to < from) return result;

            for(var diff = to - from; n--;)
            {
                result += fromCharCode(from + random() * diff | 0);
            }

            return result;
        },

        /**
         * @callback queryValueParser
         * @default Stryng.parseQueryValue
         * @param {string} value - HTTP query value
         * @param {string} key   - HTTP query key
         * @param {string} query - HTTP query string
         * @this {object} object being returned
         * @returns {*} decoded and parsed <code>value</code>
         * @example
         * decodeURIComponent
         */
        
        /**
         * parses an HTTP query value following these rules:
         * <ul>
         *     <li><code>null</code> or <code>undefined</code> are returned directly</li>
         *     <li>decode the input by <code>decodeURIComponent</code></li>
         *     <li>"true" and "false" are mapped to their
         *     corresponding boolean values case-insensitively</li>
         *     <li>numbers are parsed via the <code>+</code> operator
         *     but only returned if the result is not <code>NaN</code></li>
         *     <li><code>parseFloat</code> is used if the input <em>completely</em>
         *     matches the number or scientific format</li>
         * </ul>
         * if none of the above apply, the input is returned as is
         * @param  {string} input - HTTP query value
         * @return {*}
         */
        parseQueryValue: function(input)
        {
            if(input == null) return input;

            input = decodeURIComponent(input);

            var numValue = +value,
                lowValue = value.toLowerCase();

            if(numValue === numValue) value = numValue;
            else if(lowValue === 'true') value = true;
            else if(lowValue === 'false') value = false;
            else if(reFloat.test(value)) value = parseFloat(value);
            return value;
        },

        formatQueryValue: decodeURIComponent,
        
        /**
         * parses an HTTP query-string to an object
         * holding the corresponding key-value pairs.
         * keys and values are URI decoded via <code>decodeURIComponent</code>.
         * valueless keys are mapped to <code>undefined</code>.
         * values given under the same name as allowed by the spec.
         * @param {string} input - HTTP query-string
         * @param {string} [arraySuffix=''] -
         *   suffix of query keys to help identify them
         *   as items of an array. defaults to the empty string
         *   thus even without being specified, duplicate query keys'
         *   values will be grouped.
         * @param {queryValueParser} [parser={@link Stryng.parseQueryValue}] -
         *   
         * @return {Object}
         * @todo this is a naive implementation
         * of parsing an HTTP query string. consider multiple
         */
        parseQueryString: function(input, arraySuffix, parser)
        {
            arraySuffix = arraySuffix || '[]';
            parser = parser || Stryng.parseQueryValue;

            var input = Stryng.lstrip(input, '?'),
                pairs = input.split('&'),
                params = {};

            while (pairs.length)
            {
                var pair = Stryng.lsplit(pairs.pop(), '=', 1),

                    key = decodeURIComponent(pair[0]),
                    value = pair[1]; // decoding is the parser's job

                value = parser.call(params, value, key, input);
                key = Stryng.rstrip(key, arraySuffix);

                if(params.hasOwnProperty(key))
                {
                    if(is.Array(params[key]))
                    {
                        params[key].push(value);
                    }
                    else
                    {
                        params[key] = [value];
                    }
                }
                else
                {
                    params[key] = value;
                }
            }

            return params;
        }
    };

    /////////////
    // foreign //
    /////////////

    forOwn.call(StryngGenerics, function(fn, fnName){

        // static methods
        Stryng[fnName] = StryngGenerics[fnName];

        // instance methods
        Stryng.prototype[fnName] = function()
        {
            // prepend the context
            unshift.call(arguments, this.value);

            var result = fn.apply(null, arguments);

            // enhance method chaining by returning
            // the wrapped object if the result is a string
            if(is.String(result))
            {
                this.value = result;
                return this;
            }

            return result;
        }
    });

    ////////////
    // native //
    ////////////
    
    forEach.call(methods, function(fnName){

        var fn = ''[fnName];

        if(is.Function(fn))
        {
            // static methods
            Stryng[fnName] = function()
            {
                // throw an error if no context is provided
                // which would be cast to the global object
                // and then again to a string '[object global]' on node
                if(arguments[0] == null)
                {
                    throw new TypeError('Cannot call ' + fnName + ' of undefined');
                }

                return Function.call.apply(fn, arguments);
            };

            // instance methods
            Stryng.prototype[fnName] = function()
            {
                var result = fn.apply(this.value, arguments);

                if(is.String(result))
                {
                    this.value = result;
                    return this;
                }
                return result;
            }
        }
    });

    // convenience getter identity
    Stryng.prototype.value = function(){ return this.value }

    /////////////////////////////
    // purely static functions //
    /////////////////////////////
    
    /**
     * counterpart of {@link Stryng.parseQueryString}
     * @function Stryng.fromQueryParams
     * @param {Object} key-value pairs
     * @returns {string} the URI encoded query string with leading '?'
     */
    Stryng.formatQueryParams = function(object, arraySuffix, formatter)
    {
        arraySuffix = arraySuffix || encodeURIComponent('[]');
        formatter = formatter || Stryng.formatQueryValue;

        var result = '?';

        forOwn.call(object, function(value, key){

            key = encodeURIComponent(key);

            if(is.Array(value))
            {
                for(var i = value.length; i--;)
                {
                    var val = value[i];

                    result += key + arraySuffix;

                    if(val != null)
                    {
                        result += '=' + formatter(val);
                    }

                    result += '&';
                }
            }
            else
            {
                result += key;

                if(value != null)
                {
                    result += '=' + formatter(value);
                }

                result += '&';
            }
        });

        // strip last '&' or initial '?'
        return result.slice(0 -1);
    }

    /**
     * delegates to native <code>String.fromCharCode</code>.
     * will, as a static method, not be available for OOP.
     * <em>alias:</em> <code>Stryng.fromCharCode</code>
     * @function Stying.chr
     */
    Stryng.fromCharCode = Stryng.chr = fromCharCode;
    
    /////////////
    // aliases //
    /////////////

    /**
     * delegates to native <code>String.prototype.charCodeAt</code>
     * by inverting the signature.
     * @function Stryng.ord
     */
    Stryng.ord = Stryng.charCodeAt;
    Stryng.prototype.ord = Stryng.prototype.charCodeAt;

    /**
     * delegates to native <code>String.prototype.concat</code>
     * @function Stying.append
     * @param {...string} input - strings to be concatenated
     */
    Stryng.append = Stryng.concat;
    Stryng.prototype.append = Stryng.prototype.concat;

    //////////////////////////
    // expose Stryng object //
    //////////////////////////

    return Stryng;

}));