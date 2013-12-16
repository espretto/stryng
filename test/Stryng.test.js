
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