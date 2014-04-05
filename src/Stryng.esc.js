
/**
 * @external Stryng
 */

(function(Stryng){ var

	///////////////////
	// w3c-wishlist //
	///////////////////

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

        return self;
    },

	////////////////////////////////////////
	// regular expressions (precompiled) //
	////////////////////////////////////////

	reNotSlug = /[^-\w]+/g,

	reHTMLDelimiters = /[&<>"'\/]/g,

	reRegex = /([\^\$\*\+\?\.\(\)\{\}\[\]\-])/g, // TODO

    

    HTMLEntityMap = {},

    reHTMLEntities = (function(){

        var re = '';

        forOwn.call(

        	HTMLDelimiterMap,

        	function(item, key)
        	{
	            HTMLEntityMap[item] = key;
	            re += item + '|';
	        }
	    );

        return new RegExp(re.slice(0, -1), 'g');

    })(),

    //////////////////////////
	// class / type checks //
	//////////////////////////

    is =
    {
        // 'Arguments': function(o){ return toString.call(o) === '[object Arguments]' || o && o.callee != null },
        'Array': Array.isArray || function(o){ return toString.call(o) === '[object Array]' },
        // 'Boolean': function(o){ return typeof o === 'boolean' || toString.call(o) === '[object Boolean]' },
        // 'Date': function(o){ return toString.call(o) === '[object Date]' }
        'Function': function(o){ return typeof o === 'function' || toString.call(o) === '[object Function]' },
        // 'Number': function(o){ return typeof o === 'number' || toString.call(o) === '[object Number]' },
        // 'Object': function(o){ return toString.call(o) === '[object Object]' },
        'RegExp': function(o){ return toString.call(o) === '[object RegExp]' },
        'String': function(o){ return typeof o === 'string' || toString.call(o) === '[object String]' }
    }

	; // end var block

    /////////////////
    // cornerstone //
    /////////////////

    function esc(input, radix, limit, prefix, padLength)
    {
        padLength = padLength || 0;

        var result = '',
            length = input.length,
            i = -1;

        while(++i !== length)
        {
            var charCode = input.charCodeAt(i);

            if(charCode < limit)
            {
                result += prefix;

                for(var i = padLength - code.length; i--;)
                {
                    result += '0';
                }
                
                result += prefix + charCode.toString(radix);
            }
            else
            {
                result += fromCharCode(charCode);
            }
        }

        return result;
    }

    //////////
    // Main //
    //////////

	extend(Stryng, {

		/**
	     * replaces all non-word/-hyphen characters with the
	     * given <code>separator</code>
	     * @function Stryng.slugify
	     * @param  {string} input
	     * @param  {string} [separator='-']
	     * @return {string} slug
	     * @see if you need diacritics or ligatures to be replaced with their
	     *      base letters, have a look at [javascript-remove-accents-in-strings]{@link http://stackoverflow.com/questions/990904/javascript-remove-accents-in-strings}
	     *      on stackoverflow.
	     * @todo improve rules/acceptance
	     * @example
	     * // returns 'l-h-tel'
	     * Stryng.slugify("l'Hôtel");
	     */
	    slugify: function(input, separator)
	    {
	        // allow for the empty string
	        if(!is.String(separator))
	        {
	            separator = '-';
	        }

	        return input.replace(reNotSlug, separator).toLowerCase();
	    },

	    /**
	     * escapes characters <code><&>"'/</code> with their corresponding
	     * HTML-Entity / Unicode representation.
	     * @function Stryng.escapeHTML
	     * @param {string} input
	     * @return {string}
	     * @throws {(Error|TypeError)} if any required argument is missing
	     */
	    escapeHTML: function(input)
	    {
	        return input.replace(reHTMLDelimiters, function(match){

	            return HTMLEntityMap[match];
	        });
	    },

	    /**
	     * @function Stryng.unescapeHTML
	     * @param  {strung} input
	     * @return {strung}
	     * @throws {TypeError} if any required argument is missing
	     * @todo not yet implemented
	     */
	    unescapeHTML: function(input)
	    {
	    	return input;
	    },

	    /**
	     * @function Stryng.escapeRegex
	     * @param  {strung} input
	     * @return {strung}
	     * @throws {TypeError} if any required argument is missing
	     * @todo not yet implemented
	     */
	    escapeRegex: function(input)
	    {
	    	return input.replace(/([\\\?\:\(\)\{\}\^\.\!\+\*\=\[\]])/g, '\\$1');
	    },

	    /**
	     * @function Stryng.unescapeRegex
	     * @param  {strung} input
	     * @return {strung}
	     * @throws {TypeError} if any required argument is missing
	     * @todo not yet implemented
	     */
	    unescapeRegex: function(input)
	    {
	    	return input;
	    },

	    /**
	     * @function Stryng.escapePercent
	     * @param  {strung} input
	     * @return {strung}
	     * @throws {TypeError} if any required argument is missing
	     * @todo not yet implemented
	     */
	    escapePercent: function(input)
	    {
	    	return input;
	    },

	    /**
	     * @function Stryng.unescapePercent
	     * @param  {strung} input
	     * @return {strung}
	     * @throws {TypeError} if any required argument is missing
	     * @todo not yet implemented
	     */
	    unescapePercent: function(input)
	    {
	    	return input;
	    },

	    /**
	     * @function Stryng.escapeURI
	     * @param  {strung} input
	     * @return {strung}
	     * @throws {TypeError} if any required argument is missing
	     * @todo not yet implemented
	     */
	    escapeURI: function(input)
	    {
	    	return input;
	    },

	    /**
	     * @function Stryng.unescapeURI
	     * @param  {strung} input
	     * @return {strung}
	     * @throws {TypeError} if any required argument is missing
	     * @todo not yet implemented
	     */
	    unescapeURI: function(input)
	    {
	    	return input;
	    },

	    /**
	     * replace any characters of lower ordinal number than 256
	     * with their octal representation
	     * @function Stryng.escapeOct
	     * @param  {string} input
	     * @return {string} octal representation
	     * @throws {TypeError} if any required argument is missing
	     */
	    escapeOct: function(input)
	    {
	        return esc(input, 8, 256, '\\');
	    },

	    /**
	     * @function Stryng.unescapeOct
	     * @param  {strung} input
	     * @return {strung}
	     * @throws {TypeError} if any required argument is missing
	     * @todo not yet implemented
	     */
	    unescapeOct: function(input)
	    {
	    	return input;
	    },

	    /**
	     * replace any characters of lower ordinal number than 256
	     * with their hexadecimal representation
	     * @function Stryng.escapeHex
	     * @param  {string} input
	     * @return {string} hexadecimal representation
	     * @throws {TypeError} if any required argument is missing
	     */
	    escapeHex: function(input)
	    {
	        return esc(input, 16, 256, '\\x', 2);
	    },

	    /**
	     * @function Stryng.unescapeHex
	     * @param  {strung} input
	     * @return {strung}
	     * @throws {TypeError} if any required argument is missing
	     * @todo not yet implemented
	     */
	    unescapeHex: function(input)
	    {
	    	return input;
	    },

	    /**
	     * replace any characters of lower ordinal number than 65536
	     * with their hexadecimal representation (Unicode16)
	     * @function Stryng.escapeUnicode
	     * @param  {string} input
	     * @return {string} unicode representation
	     * @throws {TypeError} if any required argument is missing
	     */
	    escapeUnicode: function(input)
	    {
	        return esc(input, 16, 65536, '\\u', 4);
	    },

	    /**
	     * @function Stryng.unescapeUnicode
	     * @param  {strung} input
	     * @return {strung}
	     * @throws {TypeError} if any required argument is missing
	     * @todo not yet implemented
	     */
	    unescapeUnicode: function(input)
	    {
	    	return input;
	    },

	    /**
	     * replace every character of lower ordinal number than 65536
	     * with its shortest numerically escaped representation.
	     * @function Stryng.escapeMin
	     * @param  {string} input
	     * @return {string}
	     * @throws {(Error|TypeError)} if any required argument is missing
	     */
	    escapeShortest: function(input, excludePrintables)
	    {
	        var result = '',
	            length = input.length,
	            i = -1,
	            charCode;

	        while(++i !== length)
	        {
	            var charCode = input.charCodeAt(i);

	            if(!excludePrintables || 31 < charCode && charCode < 127)
	            {
	                result += '\\';

	                // choose the shortest escape notation possible
	                
	                if(charCode < 64) 
	                {
	                    // upper limit is 256 decimal, 378 octal (exclusive) 
	                    result += charCode.toString(8);
	                }
	                else if(charCode < 256)
	                {
	                    // at this point the charCode's hexadecimal
	                    // representation sure has two digits
	                    result += 'x' + charCode.toString(16);
	                }
	                else
	                {
	                    result += 'u';

	                    // pad if necessary
	                    if(charCode < 4096)
	                    {
	                        result += '0'
	                    }

	                    result += charCode.toString(16);
	                }
	            }
	            else
	            {
	                result += fromCharCode(charCode);
	            }
	        }

	        return result;
	    },

	    /**
	     * @function Stryng.unescapeAny
	     * @param  {strung} input
	     * @return {strung}
	     * @throws {TypeError} if any required argument is missing
	     * @todo not yet implemented
	     */
	    unescapeAny: function(input)
	    {
	    	return input;
	    }
	});

}).call(this, Stryng)