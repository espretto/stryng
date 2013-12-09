
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


	// blow away the stack trace here
	// ```
	// beforeEach(function(done){
	// 	setTimeout(done, 0);
	// });
	// ```
	// would break FF 3.0
	beforeEach(function(done){
		setTimeout(function(){ done() }, 0);
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
			    padded = ws + msg;

		    expect( Stryng.trimLeft(padded) ).to.equal(msg);
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
			    padded = msg + ws;

		    expect( Stryng.trimRight(padded) ).to.equal(msg);
		});
	});

	describe('.contains', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.contains ).to.throwError();
		});

		it('should return true with args ["undefined"]', function (){
			expect( Stryng('undefined').contains(/* (undefined).toString() */) ).to.be.ok();
		});

		it('should find the empty string in any string', function (){
			expect( Stryng.contains('any', '') ).to.be.ok();
		});

		it('should return true if substring found', function (){
			expect( Stryng.contains('foo', 'foo') ).to.be.ok();
		});

		it('should return false if substring not found', function (){
			expect( Stryng.contains('foo', 'bar') ).not.to.be.ok();
		});
	});

	describe('.startsWith', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.startsWith ).to.throwError();
		});

		it('should return true with args ["undefined"]', function (){
			expect( Stryng('undefined').startsWith(/* (undefined).toString() */) ).to.be.ok();
		});

		it('should return true searching the empty string', function (){
			expect( Stryng.startsWith('', '') ).to.be.ok();
		});

		it('should return true searching the empty string with offset Infinity', function (){
			expect( Stryng.startsWith('any string', '', 1/0) ).to.be.ok();
		});

		it('should return true if input starts with substring', function (){
			expect( Stryng.startsWith('foo bar', 'foo') ).to.be.ok();
		});

		it('should return false if input doesn\'t start with substring', function (){
			expect( Stryng.startsWith('foo bar', 'bar') ).not.to.be.ok();
		});

		it('should return true if substring found with given offset within input', function (){
			expect( Stryng.startsWith('foo bar', 'bar', 4) ).to.be.ok();
		});

		it('should act as if no offset was passed if offset is negative', function (){
			expect( Stryng.startsWith('foo bar', 'foo', -1) ).to.be.ok();
		});
	});

	describe('.endsWith', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.endsWith ).to.throwError();
		});

		it('should return true with args ["undefined"]', function (){
			expect( Stryng('undefined').endsWith(/* (undefined).toString() */) ).to.be.ok();
		});

		it('should return true searching the empty string', function (){
			expect( Stryng.endsWith('any', '') ).to.be.ok();
		});

		it('should return true if input ends with substring', function (){
			expect( Stryng.endsWith('foo bar', 'bar') ).to.be.ok();
		});

		it('should return false if input doesn\'t end with substring', function (){
			expect( Stryng.endsWith('foo bar', 'foo') ).not.to.be.ok();
		});
	});

	describe('.repeat', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.repeat ).to.throwError();			
		});

		it('should fail if n is positive Infinity', function (){
			expect( Stryng.repeat ).withArgs('', Infinity).to.throwError();
		});

		it('should fail if n is negative', function (){
			expect( Stryng.repeat ).withArgs('', -1).to.throwError();
		});

		it('should return the empty string if n is zero', function (){
			expect( Stryng.repeat('foo', 0) ).to.equal('');
		});

		it('should repeat the input n times', function (){
			expect( Stryng.repeat('foo', 3) ).to.equal('foofoofoo');
		});
	});

	describe('.count', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.count ).to.throwError();			
		});

		it('should search for "undefined" by default', function () {
			expect( Stryng('undefined').count(/* (undefined).toString() */) ).to.equal(1);
		});

		it('should return length + 1 when counting the empty string', function () {
			expect( Stryng.count('foo', '') ).to.equal(4);
		});

		it('should return the number of non-overlapping occurences', function (){
			expect( Stryng.count('foo foo bar', 'foo') ).to.equal(2);
		});

		it('should parse the substring to search for', function (){
			expect( Stryng.count('123', 2) ).to.equal(1);
		});
	});

	describe('.join', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.join ).to.throwError();
		});

		it('should fail if strings to join are missing', function (){
			expect( Stryng.join ).withArgs(',').to.throwError()
		});

		it('should join with commata by default', function (){
			expect( Stryng.join(null, 1, 2, 3) ).to.equal('1,2,3');
		});

		it('should allow an empty delimiter string', function (){
			expect( Stryng.join('', 1, 2, 3) ).to.equal('123');
		});

		it('should flatten the args to join', function (){
			expect( Stryng.join(' ', [[[1],2],3]) ).to.equal('1 2 3');
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

		it('should insert at the given position counting from the beginning', function () {
			expect( Stryng.insert('the fox', 4, 'quick ') ).to.equal('the quick fox');
		});

		it('should insert at the given position counting from the end', function () {
			expect( Stryng.insert('the fox', -3, 'quick ') ).to.equal('the quick fox');
		});
	});

	describe('.splitAt', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.splitAt ).to.throwError();
		});

		it('should fail if indices overlap / are badly sorted', function (){
			expect( Stryng.splitAt ).withArgs('foo bar baz', 3, 1).to.throwError();
		});

		it('should fail if negative indices overlap', function () {
			expect( Stryng.splitAt ).withArgs('foo bar baz', 3, -10).to.throwError();
		});

		it('should split at the given indices', function () {
			expect( Stryng.splitAt('gosplitthis', 2, 7) ).to.eql(['go', 'split', 'this']);
		});

		it('should split at the given negative / backwards indices', function () {
			expect( Stryng.splitAt('gosplitthis', -9, -4) ).to.eql(['go', 'split', 'this']);
		});
	});

	describe('.lsplit', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.lsplit ).to.throwError();
		});

		it('should split by arbitrary whitespace if no delimiter specified', function () {
			expect( Stryng.lsplit('the\nquick\tbrown\rfox\u000C', null, 4) )
			.to.eql(['the','quick','brown','fox','']);
		});

		it('should split if input ends with delimiter and limit matches #occurences of delimiter', function () {
			expect( Stryng.lsplit('foo bar ', ' ', 2) ).to.eql(['foo', 'bar', '']);
		});

		it('should split if input starts with delimiter and limit matches #occurences of delimiter', function () {
			expect( Stryng.lsplit(' foo bar', ' ', 2) ).to.eql(['', 'foo', 'bar']);
		});

		it('should deal with Infinity', function () {
			expect( Stryng.lsplit('charactersequence', '', Infinity) )
			.to.eql(['c','h','a','r','a','c','t','e','r','s','e','q','u','e','n','c','e']);
		});

		it('should split limit times but yet include the rest', function () {
			expect( Stryng.lsplit('charactersequence', '', 4) ).to.eql(['c','h','a','r','actersequence']);
		});

		it('should ignore negative values for limit and apply the default', function () {
			expect( Stryng.lsplit('foo', '', -1) ).to.eql(['f', 'o', 'o']);
		});

		it('should return the input with the input as its only element if limit is zero', function(){
			expect( Stryng.lsplit('foo', '', 0) ).to.eql(['foo']);
		});

		it('should return an array of two empty strings if splitting by itself', function () {
			expect( Stryng.lsplit('foo', 'foo') ).to.eql(['', '']);
		});

		it('should return an empty array if splitting the empty string by itself', function () {
			expect( Stryng.lsplit('', '') ).to.eql([]);
		});
	});

	describe('.rsplit', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.rsplit ).to.throwError();
		});

		it('should split by arbitrary whitespace if no delimiter specified', function () {
			expect( Stryng.rsplit('the\nquick\tbrown\rfox\u000C', null, 4) )
			.to.eql(['the','quick','brown','fox','']);
		});

		it('should split if input ends with delimiter and limit matches #occurences of delimiter', function () {
			expect( Stryng.rsplit('foo bar ', ' ', 2) ).to.eql(['foo', 'bar', '']);
		});

		it('should split if input starts with delimiter and limit matches #occurences of delimiter', function () {
			expect( Stryng.rsplit(' foo bar', ' ', 2) ).to.eql(['', 'foo', 'bar']);
		});

		it('should deal with Infinity', function () {
			expect( Stryng.rsplit('charactersequence', '', Infinity) )
			.to.eql(['c','h','a','r','a','c','t','e','r','s','e','q','u','e','n','c','e']);
		});

		it('should split limit times but yet include the rest', function () {
			expect( Stryng.rsplit('charactersequence', '', 4) ).to.eql(['charactersequ','e','n','c','e']);
		});

		it('should ignore negative values for limit and apply the default', function () {
			expect( Stryng.rsplit('foo', '', -1) ).to.eql(['f', 'o', 'o']);
		});

		it('should return the input with the input as its only element if limit is zero', function(){
			expect( Stryng.rsplit('foo', '', 0) ).to.eql(['foo']);
		});

		it('should return an array of two empty strings if splitting by itself', function () {
			expect( Stryng.rsplit('foo', 'foo') ).to.eql(['', '']);
		});

		it('should return an empty array if splitting the empty string by itself', function () {
			expect( Stryng.rsplit('', '') ).to.eql([]);
		});
	});
});