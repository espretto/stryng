
Stryng = require('./../Stryng.js');
expect = require('expect.js');

// checkout sinonjs.org

describe('Stryng', function(){


	// blow away the stack trace here
	// breaks FF3.0
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
			expect( Stryng.contains('undefined') ).to.be.ok();
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
			expect( Stryng.startsWith('undefined') ).to.be.ok();
		});

		it('should return true searching the empty string', function (){
			expect( Stryng.startsWith('', '') ).to.be.ok();
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
			expect( Stryng.endsWith('undefined') ).to.be.ok();
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
			expect( function(){
				Stryng.repeat('', Infinity)
			}).to.throwError();
		});

		it('should fail if n is negative', function (){
			expect( function(){
				Stryng.repeat('', -1);
			}).to.throwError();
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

		it('should fail if trying to count occurences of the empty string', function (){
			expect( function(){
				Stryng.count('foo', '');
			}).to.throwError()
		});

		it('should fail if input is not of duck-type String', function (){
			expect(function(){
				Stryng.count({}, 'hello');
			}).to.throwError()
		});

		it('should fail for input of type other than String work for arrays of strings, too', function (){
			expect( function(){
				Stryng.count(['foo', 'foo', 'bar'], 'foo');
			}).to.throwError();
		});

		it('should return the number of non-overlapping occurences', function (){
			expect( Stryng.count('foo foo bar', 'foo') ).to.be(2);
		});

		it('should parse the substring to search for', function (){
			expect( Stryng.count('123', 2) ).to.be(1);
		});
	});

	describe('.join', function(){

		it('should fail if input\'s missing', function (){
			expect( Stryng.join ).to.throwError();
		});

		it('should fail if strings to join are missing', function (){
			expect(function(){
				Stryng.join(',');
			}).to.throwError()
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
			expect( Stryng.reverse ).to.throwError()
		});

		it('should return the empty string unchanged', function (){
			expect( Stryng.reverse('') ).to.equal('')
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

		it('should insert "undefined" if neither index nor insertion provided', function (){
			expect( Stryng.insert('foo') ).to.equal('undefinedfoo');
		});

		it('should lower limit the index to zero', function (){
			expect( Stryng.insert('foo', -1, 'bar') ).to.equal('barfoo');
		});

		it('should upper limit the index to the input\'s length i.e. append', function (){
			expect( Stryng.insert('foo', Infinity, 'bar') ).to.equal('foobar');
		});
	});
});