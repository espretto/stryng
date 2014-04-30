Stryng = require( './../src/stryng.js' );
expect = require( 'expect.js' );

///////////////////////////////////////////
// patch missing withArgs in npm version //
///////////////////////////////////////////

// expect.Assertion.prototype.withArgs = function() {
//   expect(this.obj).to.be.a('function');
//   var fn = this.obj;
//   var args = Array.prototype.slice.call(arguments);
//   return expect(function() { fn.apply(null, args); });
// }

describe( 'Stryng()', function() {

  if ( "undefined" != typeof window ) {

    beforeEach( function( done ) {

      setTimeout( function() {
        done()
      }, 15 );
    } );
  }

  // describe.skip('.length', function(){

  // 	it('should reflect `input.length`', function () {
  // 		var primitive = 'test',
  // 			length = primitive.length;

  // 		expect( Stryng(primitive) ).to.have.length(length);
  // 	});

  // 	it('should not be writable if defineProperty is available', function () {
  // 		var primitive = 'test',
  // 			length = primitive.length,
  // 			stryng = Stryng(primitive);

  // 		if(Object.defineProperty)
  // 		{
  // 			stryng.length = 3;
  // 			expect( stryng ).to.have.length(length);
  // 		}
  // 	});
  // });

  describe( '.constructor()', function() {

    it( 'should work without the new operator', function() {
      expect( Stryng( '' ) ).to.be.a( Stryng );
    } );

    it( 'should return the wrapped empty string if passed null', function() {
      expect( Stryng( null ).toString() ).to.equal( '' );
    } );

    it( 'should return the wrapped empty string if passed no arguments or undefined', function() {
      expect( Stryng().toString() ).to.equal( '' );
      expect( Stryng( void 0 ).toString() ).to.equal( '' );
    } );

    it( 'should return the wrapped empty string if passed the empty array', function() {
      expect( Stryng( [] ).toString() ).to.equal( '' );
    } );
  } );

  describe( 'mutability', function() {

    it( 'should not be mutable by default', function() {
      var stryng = Stryng( 'foo' /*, false */ );
      expect( stryng.append( 'bar' ).stripRight( 'bar' ) ).to.not.equal( stryng );
    } );

    it( 'should be mutable if told so', function() {
      var stryng = Stryng( 'foo', true );
      expect( stryng.append( 'bar' ) ).to.equal( stryng );
    } );
  } );

  describe( '.trim()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.trim ).to.throwError();
    } );

    it( 'should return the empty string', function() {
      expect( Stryng.trim( '' ) ).to.equal( '' );
    } );

    it( 'should return the any string unchanged if neither prefixed nor suffixed by whitespace', function() {
      expect( Stryng.trim( 'foo' ) ).to.equal( 'foo' );
    } );

    it( 'should trim leading and trailing whitespace', function() {

      var ws = '\u0009\u000A\u000B\u000C' + '\u00A0\u000D\u0020\u1680' + '\u180E\u2000\u2001\u2002' + '\u2003\u2004\u2005\u2006' + '\u2007\u2008\u2009\u200A' + '\u2028\u2029\u202F\u205F' + '\u3000\uFEFF',
        msg = 'Hello World',
        padded = ws + msg + ws;

      expect( Stryng.trim( padded ) ).to.equal( msg );
    } );
  } );

  describe( '.trimLeft()', function() {

    it( 'should trim leading whitespace only', function() {

      var ws = '\u0009\u000A\u000B\u000C' + '\u00A0\u000D\u0020\u1680' + '\u180E\u2000\u2001\u2002' + '\u2003\u2004\u2005\u2006' + '\u2007\u2008\u2009\u200A' + '\u2028\u2029\u202F\u205F' + '\u3000\uFEFF',
        msg = 'Hello World',
        leftPadded = ws + msg;

      expect( Stryng.trimLeft( leftPadded ) ).to.equal( msg );
    } );
  } );

  describe( '.trimRight()', function() {

    it( 'should trim trailing whitespace only', function() {

      var ws = '\u0009\u000A\u000B\u000C' + '\u00A0\u000D\u0020\u1680' + '\u180E\u2000\u2001\u2002' + '\u2003\u2004\u2005\u2006' + '\u2007\u2008\u2009\u200A' + '\u2028\u2029\u202F\u205F' + '\u3000\uFEFF',
        msg = 'Hello World',
        rightPadded = msg + ws;

      expect( Stryng.trimRight( rightPadded ) ).to.equal( msg );
    } );
  } );

  describe( '.contains()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.contains ).to.throwError();
    } );

    it( 'should return true on "undefined" with no arguments passed', function() {
      expect( Stryng.contains( 'undefined' /*, (undefined).toString() */ ) ).to.be.ok();
    } );

    it( 'should find the empty string in any string', function() {
      expect( Stryng.contains( 'any', '' ) ).to.be.ok();
    } );

    it( 'should return true if search equals `input`', function() {
      expect( Stryng.contains( 'foo', 'foo' ) ).to.be.ok();
    } );

    it( 'should return true if `input` contains substring', function() {
      expect( Stryng.contains( 'the quick brown fox', 'quick' ) ).to.be.ok();
    } );

    it( 'should return false if substring not found', function() {
      expect( Stryng.contains( 'foo', 'bar' ) ).not.to.be.ok();
    } );
  } );

  describe( '.startsWith()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.startsWith ).to.throwError();
    } );

    it( 'should apply "undefined" as default `search` and zero as default position', function() {
      expect( Stryng( 'undefined...' ).startsWith( /* (undefined).toString(), toInteger(undefined) */) ).to.be.ok();
    } );

    it( 'should apply `input.length` as the maximum position (hence only the empty string as `search` results to true', function() {
      expect( Stryng.startsWith( 'foo bar', '', 'foo bar'.length + 1 ) ).to.be.ok();
      expect( Stryng.startsWith( 'foo bar', 'bar', 'foo bar'.length + 1 ) ).to.not.be.ok();
    } );

    it( 'should apply zero as the minimum position', function() {
      expect( Stryng.startsWith( 'foo bar', 'foo', -1 ) ).to.be.ok();
    } );

    it( 'should return false if `search` is longer than `input`', function() {
      expect( Stryng.startsWith( 'foo', 'fooo' ) ).to.not.be.ok();
    } );

    it( 'should return false if `input` doesn\'t start with substring', function() {
      expect( Stryng.startsWith( 'foo bar', 'bar' ) ).to.not.be.ok();
    } );

    it( 'should return true if `search` found at the exact position and fits found with given offset within `input`', function() {
      expect( Stryng.startsWith( 'foo bar', 'bar', 4 ) ).to.be.ok();
    } );

    it( 'should work for regexes, too', function() {
      expect( Stryng.startsWith( 'foo bar', /^foo bar$/ ) ).to.be.ok();
    } );
  } );

  describe( '.endsWith()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.endsWith ).to.throwError();
    } );

    it( 'should apply "undefined" as default `search` and `input.length` as default `end_position`', function() {
      expect( Stryng( '...undefined' ).endsWith( /* (undefined).toString(), `input.length` */) ).to.be.ok();
    } );

    it( 'should apply `input.length` as the maximum `end_position`', function() {
      expect( Stryng.endsWith( 'foo bar', 'bar', 'foo bar'.length + 1 ) ).to.be.ok();
    } );

    it( 'should apply zero as the minimum `end_position` (hence only the empty string as `search` result to true)', function() {
      expect( Stryng.endsWith( 'foo bar', '', -1 ) ).to.be.ok();
    } );

    it( 'should return false if `search` is longer than `input`', function() {
      expect( Stryng.endsWith( 'foo', 'ofoo' ) ).to.not.be.ok();
    } );

    it( 'should return false if `input` doesn\'t end with `search`', function() {
      expect( Stryng.endsWith( 'foo bar', 'foo' ) ).to.not.be.ok();
    } );

    it( 'should return false if `input` ends with `search` but at a different position', function() {
      expect( Stryng.endsWith( 'foo bar', 'bar', 6 ) ).to.not.be.ok();
    } );

    it( 'should return true if `search` fits and ends at the given position', function() {
      expect( Stryng.endsWith( 'foo bar', 'foo', 3 ) ).to.be.ok();
    } );

    it( 'should throw an error if passed a regex not matching the end', function() {
      expect( Stryng.endsWith ).withArgs( 'foo', /bar/ ).to.throwError();
    } );

    it( 'should work for regexes, too', function() {
      expect( Stryng.endsWith( 'foo bar', /foo$/, 3 ) ).to.be.ok();
    } );
  } );

  describe( '.repeat()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.repeat ).to.throwError();
    } );

    it( 'should fail if n is negative', function() {
      expect( Stryng.repeat ).withArgs( '', -1 ).to.throwError();
    } );

    it( 'should fail if n is not finite', function() {
      expect( Stryng.repeat ).withArgs( '', Infinity ).to.throwError();
      expect( Stryng.repeat ).withArgs( '', '-Infinity' ).to.throwError();
    } );

    it( 'should return the empty string if n is zero', function() {
      expect( Stryng.repeat( 'foo', 0 ) ).to.equal( '' );
    } );

    it( 'should repeat the `input` n times', function() {
      expect( Stryng.repeat( 'foo', 3 ) ).to.equal( 'foofoofoo' );
    } );
  } );

  describe( '.substr()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.substr ).to.throwError();
    } );

    it( 'should accept negative indices', function() {
      expect( Stryng.substr( 'foo', -1 ) ).to.equal( 'o' );
    } );

    it( 'should apply zero if abs(index) exceeds `input.length`', function() {
      expect( Stryng.substr( 'foo', -4 ) ).to.equal( 'foo' );
    } );

    it( 'should ceil negative floating point indices', function() {
      expect( Stryng.substr( 'foo', '-0.5', 2 ) ).to.equal( 'fo' );
    } );

    it( 'should return the empty string if length is zero', function() {
      expect( Stryng.substr( 'foo', 'NaN', 0 ) ).to.equal( '' );
    } );
  } );

  describe( '.wrap()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.wrap ).to.throwError();
    } );

    it( 'should fail if n is negative or not finite', function() {
      expect( Stryng.wrap ).withArgs( 'foo', 'outfix', Infinity ).to.throwError();
      expect( Stryng.wrap ).withArgs( 'foo', 'outfix', -1 ).to.throwError();
    } );

    it( 'should apply zero as the default thus return the `input`', function() {
      expect( Stryng.wrap( 'foo', 'outfix' ) ).to.equal( 'foo' );
    } );

    it( 'should wrap three times', function() {
      expect( Stryng.wrap( 'foo', 'x', 3 ) ).to.equal( 'xxxfooxxx' );
    } );
  } );

  describe( '.count()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.count ).to.throwError();
    } );

    it( 'should search for "undefined" by default', function() {
      expect( Stryng( 'undefined' ).count( /* (undefined).toString() */) ).to.equal( 1 );
    } );

    it( 'should return length + 1 when counting the empty string', function() {
      expect( Stryng.count( 'foo', '' ) ).to.equal( 4 );
    } );

    it( 'should return the number of non-overlapping occurences', function() {
      expect( Stryng.count( 'foo foo bar', 'foo' ) ).to.equal( 2 );
    } );
  } );

  describe( '.join()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.join ).to.throwError();
    } );

    it( 'should return the empty string if no arguments passed to join', function() {
      expect( Stryng.join( ',' ) ).to.equal( '' );
    } );

    it( 'should allow an empty delimiter string', function() {
      expect( Stryng.join( '', 1, 2, 3 ) ).to.equal( '123' );
    } );
  } )

  describe( '.reverse()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.reverse ).to.throwError();
    } );

    it( 'should return the empty string unchanged', function() {
      expect( Stryng.reverse( '' ) ).to.equal( '' );
    } );

    it( 'should rerturn a single character unchanged', function() {
      expect( Stryng.reverse( 'a' ) ).to.equal( 'a' );
    } );

    it( 'should reverse a string', function() {
      expect( Stryng.reverse( 'abc' ) ).to.equal( 'cba' );
    } );
  } );

  describe( '.insert()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.insert ).to.throwError();
    } );

    it( 'should prepend "undefined" if neither index nor insertion provided', function() {
      expect( Stryng.insert( 'foo' ) ).to.equal( 'undefinedfoo' );
    } );

    it( 'should append if the index exceed `input.length`', function() {
      expect( Stryng.insert( 'foo', Infinity, 'bar' ) ).to.equal( 'foobar' );
    } );

    it( 'should prepend if the index is negative but its absolute value exceeds `input.length`', function() {
      expect( Stryng.insert( 'foo', -Infinity, 'bar' ) ).to.equal( 'barfoo' );
    } );

    it( 'should insert at the given position counting from the beginning', function() {
      expect( Stryng.insert( 'the fox', 4, 'quick ' ) ).to.equal( 'the quick fox' );
    } );

    it( 'should insert at the given position counting from the end', function() {
      expect( Stryng.insert( 'the fox', -3, 'quick ' ) ).to.equal( 'the quick fox' );
    } );
  } );

  describe( '.splitAt()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.splitAt ).to.throwError();
    } );

    it( 'should split at the given indices', function() {
      expect( Stryng.splitAt( 'gosplitthis', 2, 7 ) ).to.eql( [ 'go', 'split', 'this' ] );
    } );

    it( 'should split at the given negative / backwards indices', function() {
      expect( Stryng.splitAt( 'gosplitthis', -9, -4 ) ).to.eql( [ 'go', 'split', 'this' ] );
    } );

    it( 'should split at 0 and `input.length` - edge case', function() {
      expect( Stryng.splitAt( 'foo', 0, 3 ) ).to.eql( [ '', 'foo', '' ] );
    } );

    it( 'should apply `input.length` as max', function() {
      expect( Stryng.splitAt( 'foo', Infinity ) ).to.eql( [ 'foo', '' ] );
    } );

    it( 'should apply the previous as the min index if substrings overlap', function() {
      expect( Stryng.splitAt( 'foo bar baz', 3, 1, 7 ) ).to.eql( [ 'foo', '', ' bar', ' baz' ] );
    } );
  } );

  describe( '.splitLeft()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.splitLeft ).to.throwError();
    } );

    it( 'should toUint32 negative values', function() {
      expect( Stryng.splitLeft( 'foo', '', -1 ) ).to.eql( [ 'f', 'o', 'o' ] );
    } );

    it( 'should return an empty array if `n` is zero', function() {
      expect( Stryng.splitLeft( 'foo', '', 0 ) ).to.eql( [] );
    } );

    it( 'should treat Infinity equal to zero as `n` - because of toUInt32', function() {
      expect( Stryng.splitLeft( 'foo', '', Infinity ) ).to.eql( [] );
    } );

    it( 'should return an empty array if splitting the empty string by itself', function() {
      expect( Stryng.splitLeft( '', '' ) ).to.eql( [] );
    } );

    it( 'should return an array of two empty strings if splitting by the `input`', function() {
      expect( Stryng.splitLeft( 'foo', 'foo' ) ).to.eql( [ '', '' ] );
    } );

    it( 'should split by all occurences of the delimiter if no `n` passed', function() {
      expect( Stryng.splitLeft( 'sequence', '' ) ).to.eql( [ 's', 'e', 'q', 'u', 'e', 'n', 'c', 'e' ] );
    } );

    it( 'should split `n` times but yet include the rest', function() {
      expect( Stryng.splitLeft( 'sequence', '', 4 ) ).to.eql( [ 's', 'e', 'q', 'u', 'ence' ] );
    } );

    it( 'should work for [grouping] regular expressions - even without the `global` flag', function() {
      expect(
        Stryng.splitLeft( 'head reacting reactors tail', /re(\w+)/i )
      ).to.eql(
        [ 'head ', 'acting', ' ', 'actors', ' tail' ]
      );
    } );
  } );

  describe( '.splitRight()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.splitRight ).to.throwError();
    } );

    it( 'should split `n` times but yet include the rest', function() {
      expect( Stryng.splitRight( 'charactersequence', '', 4 ) ).to.eql( [ 'charactersequ', 'e', 'n', 'c', 'e' ] );
    } );

    it( 'should throw an error if passed a regular expressions', function() {
      expect( Stryng.splitRight ).withArgs( 'dont care', /re/ ).to.throwError();
    } );

    // refer to Stryng.splitLeft for further tests

  } );

  describe( '.splitLines()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.splitLines ).to.throwError();
    } );

    it( 'should split by line terminators', function() {
      expect(
        Stryng.splitLines( 'carriage\r\nreturn\nnewline\u2028separate line\u2029paragraph' )
      ).to.eql(
        [ 'carriage', 'return', 'newline', 'separate line', 'paragraph' ]
      );
    } );
  } );

  describe( '.exchange()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.exchange ).to.throwError();
    } );

    it( 'should leave the `input` as is if replacee and replacement equal', function() {
      expect( Stryng.exchange( 'foo', 'o', 'o' ) ).to.equal( 'foo' );
    } );

    it( 'should replace all occurences of replacee by replacement', function() {
      expect( Stryng.exchange( 'foo', 'o', 'a' ) ).to.equal( 'faa' );
    } );

    it( 'should comma separate the `input` if passed the empty string as replacee and comma as replacement', function() {
      expect( Stryng.exchange( 'sequence', '', ',' ) ).to.equal( 's,e,q,u,e,n,c,e' );
    } );
  } );

  describe( '.exchangeLeft()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.exchangeLeft ).to.throwError();
    } );

    it( 'should replace n left-hand occurences of replacee', function() {
      expect( Stryng.exchangeLeft( 'sequence', '', ',', 3 ) ).to.equal( 's,e,q,uence' );
    } );

    // refer to Stryng.splitLeft for further tests
  } );

  describe( '.exchangeRight()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.exchangeRight ).to.throwError();
    } );

    it( 'should replace n right-hand occurences of replacee', function() {
      expect( Stryng.exchangeRight( 'sequence', '', ',', 3 ) ).to.equal( 'seque,n,c,e' );
    } );

    // refer to Stryng.splitRight for further tests
  } );

  describe( '.justLeft()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.justLeft ).to.throwError();
    } );

    it( 'should fail if `max_len` is negative', function() {
      expect( Stryng.justLeft ).withArgs( 'foo', -1, 'o' ).to.throwError();
    } );

    it( 'should fail if `max_len` is not finite', function() {
      expect( Stryng.justLeft ).withArgs( 'foo', Infinity, 'o' ).to.throwError();
      expect( Stryng.justLeft ).withArgs( 'foo', '-Infinity', 'o' ).to.throwError();
    } );

    it( 'should return the `input` if its length is greater than or equals `max_len`', function() {
      expect( Stryng.justLeft( 'foo', 2, 'o' ) ).to.equal( 'foo' );
      expect( Stryng.justLeft( 'foo', 3, 'o' ) ).to.equal( 'foo' );
    } );

    it( 'should prepend the `fill` to the `input` until its length equals `max_len`', function() {
      expect( Stryng.justLeft( 'foo', 5, 'o' ) ).to.equal( 'oofoo' );
    } );

    it( 'should prepend the `fill` to the `input` until the next iteration would exceed `max_len`', function() {
      expect( Stryng.justLeft( 'dong', 20, 'ding ' ) ).to.equal( 'ding ding ding dong' ); // length 19
    } );
  } );

  describe( '.justRight()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.justRight ).to.throwError();
    } );

    it( 'should append the `fill` to the `input` until its length equals `max_len`', function() {
      expect( Stryng.justRight( 'foo', 5, 'o' ) ).to.equal( 'foooo' );
    } );

    it( 'should append the `fill` to the `input` until the next iteration would exceed `max_len`', function() {
      expect( Stryng.justRight( 'ding', 20, ' dong' ) ).to.equal( 'ding dong dong dong' ); // length 19
    } );

    // refer to Stryng.justLeft for further tests
  } );

  describe( '.just()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.just ).to.throwError();
    } );

    it( 'should append and prepend to the `input` until its length equals `max_len`', function() {
      expect( Stryng.just( 'private', 'private'.length + 4, '_' ) ).to.equal( '__private__' )
    } );
  } );

  describe( '.prepend()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.prepend ).to.throwError();
    } );

    it( 'should prepend the given argument', function() {
      expect( Stryng.prepend( ' World!', 'Hello' ) ).to.equal( 'Hello World!' );
    } );
  } );

  describe( '.stripLeft()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.stripLeft ).to.throwError();
    } );

    it( 'should strip from the beginning', function() {
      expect( Stryng.stripLeft( 'Hello World!', 'Hello' ) ).to.equal( ' World!' )
    } );

    it( 'should strip the prefix as long as it remains one', function() {
      expect( Stryng.stripLeft( 'ding ding ding dong', 'ding ' ) ).to.equal( 'dong' )
    } );

    it( 'should strip the prefix n times', function() {
      expect( Stryng.stripLeft( 'ding ding ding dong', 'ding ', 2 ) ).to.equal( 'ding dong' )
    } );
  } );

  describe( '.stripRight()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.stripRight ).to.throwError();
    } );

    it( 'should strip from the beginning', function() {
      expect( Stryng.stripRight( 'Hello, hello World!', 'World!' ) ).to.equal( 'Hello, hello ' )
    } );

    it( 'should strip the prefix as long as it remains one', function() {
      expect( Stryng.stripRight( 'ding dong dong dong', ' dong' ) ).to.equal( 'ding' )
    } );

    it( 'should strip the prefix n times', function() {
      expect( Stryng.stripRight( 'ding dong dong dong', ' dong', 2 ) ).to.equal( 'ding dong' )
    } );
  } );

  describe( '.strip()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.strip ).to.throwError();
    } );

    it( 'should strip from the beginning and the end', function() {
      expect( Stryng.strip( 'maoam', 'm' ) ).to.equal( 'aoa' );
    } );

    it( 'should strip multiple times', function() {
      expect( Stryng.strip( '"""docstring"""', '"' ) ).to.equal( 'docstring' );
    } );

    it( 'should strip n times', function() {
      expect( Stryng.strip( '"""docstring"""', '"', 2 ) ).to.equal( '"docstring"' );
    } );
  } );

  describe( '.truncate()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.truncate ).to.throwError();
    } );

    it( 'should not truncate the string if no `max_len` passed (Math.pow(2,32)-1 applied)', function() {
      expect( Stryng.truncate( 'Hello World!' ) ).to.equal( 'Hello World!' );
    } );

    it( 'should truncate the string at `max_len` - 3 (length of default ellipsis) and append "..."', function() {
      expect( Stryng.truncate( 'Hello World!', 8 ) ).to.equal( 'Hello...' );
    } );

    it( 'should make the truncated string and the ellipsis fit `max_len` exactly', function() {
      expect( Stryng.truncate( 'Hello World!', 10, '..' ) ).to.equal( 'Hello Wo..' );
    } );

    it( 'should return the ellipsis if `max_len` equals its length', function() {
      expect( Stryng.truncate( 'whatever', 3 ) ).to.equal( '...' );
    } );

    it( 'should return the last `max_len` characters of the ellipsis if `max_len` is lesser than the ellipsis\' length', function() {
      expect( Stryng.truncate( 'whatever', 2, 'abc' ) ).to.equal( 'bc' );
    } );

    it( 'should return the empty string if `max_len` equals zero', function() {
      expect( Stryng.truncate( 'whatever', 0, 'whatever' ) ).to.equal( '' )
    } );
  } );

  describe( '.quote()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.quote ).to.throwError();
    } );

    it( 'should return the `input` wrapped in double quotes', function() {
      expect( Stryng.quote( 'foo' ) ).to.equal( '"foo"' );
    } );

    it( 'should backslash-escape double quotes', function() {
      expect( Stryng.quote( '"' ) ).to.equal( '"\\""' );
    } );

    it( 'should backslash-escape special characters', function() {
      expect( Stryng.quote( '\n\t\r\b\f\\' ) ).to.equal( '"\\n\\t\\r\\b\\f\\\\"' );
    } );

    it( 'should hex/unicode escape non-printable characters', function() {
      // native JSON.stringify forces full unicode notation (at least on node it seems)
      expect( Stryng.quote( '\0\x01\u0002' ) ).to.match( /^"\\(x00|u0000)\\(x01|u0001)\\(x02|u0002)"$/ );
    } );
  } );

  describe.skip( '.unquote()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.unquote ).to.throwError();
    } );

    it( 'unfinished escape issues yet' );
  } );

  describe( '.isEmpty()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.isEmpty ).to.throwError();
    } );

    it( 'should return true for the empty string', function() {
      expect( Stryng().isEmpty() ).to.be.ok();
    } );

    it( 'should return false for anything else (after parsing)', function() {
      expect( Stryng.isEmpty( {} ) ).to.not.be.ok();
    } );
  } );

  describe( '.isBlank()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.isBlank ).to.throwError();
    } );

    it( 'should return true for this empty string', function() {
      expect( Stryng().isBlank() ).to.be.ok();
    } );

    it( 'should return true for whitespace only strings', function() {
      expect( Stryng([
        '\u0009\u000A\u000B\u000C',
        '\u00A0\u000D\u0020\u1680',
        '\u180E\u2000\u2001\u2002',
        '\u2003\u2004\u2005\u2006',
        '\u2007\u2008\u2009\u200A',
        '\u2028\u2029\u202F\u205F',
        '\u3000\uFEFF'].join('')
      ).isBlank() ).to.be.ok();
    } );

    it( 'should return false for anything else', function() {
      expect( Stryng( {} ).isBlank() ).to.not.be.ok();
    } );
  } );

  describe( '.capitalize()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.capitalize ).to.throwError();
    } );

    it( 'should return the empty string', function() {
      expect( Stryng.capitalize( '' ) ).to.equal( '' );
    } );

    it( 'should upper case the first letter', function() {
      expect( Stryng.capitalize( 'foo' ) ).to.equal( 'Foo' );
    } );
  } );

  describe( '.random()', function() {

    it( 'should return the empty string if no length passed', function() {
      expect( Stryng.random().toString() ).to.equal( '' );
    } );

    it( 'should fail if passed a negative length', function() {
      expect( Stryng.random ).withArgs( -1 ).to.throwError();
    } );

    it( 'should fail if passed Infinity', function() {
      expect( Stryng.random ).withArgs( Infinity ).to.throwError();
    } );

    it( 'should produce an ASCII printable string of the given length', function() {
      
      var length = 10,
        result = Stryng.random( length ),
        ASCIIPrintables = '';
      
      for ( var i = 32; i < 127; i++ ) {
        ASCIIPrintables += String.fromCharCode( i );
      }

      expect( ( function() {
        for ( var i = result.length; i--; ) {
          if ( ASCIIPrintables.indexOf( result.charAt( i ) ) === -1 ) {
            return false;
          }
        }
        return true;
      } )() ).to.be.ok();

      expect( result ).to.have.length( length );
    } );
  } );

  describe( '.ord()', function() {

    it( 'should fail if `input` is missing', function() {
      expect( Stryng.ord ).to.throwError();
    } );

    it( 'should return the empty array given the empty string', function() {
      expect( Stryng.ord( '' ) ).to.eql( [] );
    } );

    it( 'should return each character\'s character code', function() {
      expect(
      	Stryng.ord( 'Hello World' )
      ).to.eql(
      	[ 72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100 ]
      );
    } );
  } );

  describe( '.chr()', function() {

    it( 'should return the empty string if no arguments passed', function() {
      expect( Stryng.chr().toString() ).to.equal( '' );
    } );

    it( 'should fail for number greater than Math.pow(2, 16) - 1', function() {
      expect( Stryng.chr ).withArgs( 1 << 16 ).to.throwError();
    } );

    it( 'behave just like native String.fromCharCode', function() {
      expect(
      	Stryng.chr( 72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100 ).toString()
      ).to.equal(
      	'Hello World'
      );
    } );
  } );
} );