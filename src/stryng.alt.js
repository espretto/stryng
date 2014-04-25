
/**
 * @fileOverview 
 * this file contains alternative implementatins of _Stryng_ methods
 * for speed comparisons. it needs be concatenated to first!
 */

var stryng_challengers = {

  // trimRight
  // ---------
  trimRight: [
  
    // reverse loops through `input`, might be faster on large strings
    function( input ){
      input = input != null ? String( input ) : exit();
      // reverse loop analog to trim right
      for( var i = input.length; i-- && !re_no_whitespace.test( input.charAt( i )); );
      return input.substring( 0, i + 1 );
    }
    // your challenger here
  ],

  // count
  // -----
  count: [

    // uses `charAt` for single character `searchString`
    function( input, searchString ) {
      input = input != null ? String( input ) : exit();

      searchString = String( searchString );

      // early exit for the empty searchString
      if ( !searchString ) return input.length + 1;

      var length = searchString.length,
        count = 0,
        i;

      if ( length === 1 ) {
        for ( i = input.length; i--; ) {
          // cast from boolean to number
          count += input.charAt( i ) === searchString;
        }
      } else {
        for ( i = input.indexOf( searchString ); i !== -1; count++ ) {
          i = input.indexOf( searchString, i + length );
        }
      }

      return count;
    }
  ],

  // prepend
  // -------
  prepend: [

    // uses array methods
    function( input /*, prefixes */ ) {
      if ( input == null ) exit();
      return array_slice.call( arguments ).reverse().join( '' );
    }
  ],

  // stripLeft
  // ---------
  stripLeft: [

    // front-cuts `input` every iteration
    function( input, prefix, n ) {
      input = input != null ? String( input ) : exit();

      n = ( n === void 0 ? -1 : n ) >>> 0;
      prefix = String( prefix );

      if ( !n || !prefix ) return input;

      var len = prefix.length;

      while ( n-- && !input.indexOf( prefix ) ) input = input.substring( len );

      return input;
    }
  ],

  // justLeft
  // --------
  justLeft: [

    // computes the number of times to pad and delegates to `Stryng.repeat`
    function( input, maxLength, padding ) {
      if ( input == null || maxLength <= -1 || maxLength == INFINITY ) exit();

      input = String( input );
      padding = String( padding );
      maxLength = toInteger( maxLength );

      var iLength = input.length;

      // early exit for the empty padding
      if ( maxLength <= iLength || !padding ) return input;

      var n = 0 | ( maxLength - iLength ) / padding.length;

      return Stryng.repeat( padding, n ) + input;
    }
  ],

  // reverse
  // -------
  reverse: [

    // loops instead of using array functions
    function( input ) {
      input = input != null ? String( input ) : exit();

      var result = '', 
        i = input.length;

      while( i-- ) result += input.charAt( i );

      return result;
    },

    // loops, too. possible candidate
    function( input ) {
      input = input != null ? String( input ) : exit();

      var length = input.length;

      if ( length < 2 ) return input; // early exit for the empty string and single char

      for ( var i = --length; i--; input += input.charAt( i ) );

      return input.substring( length );
    }
  ]
};