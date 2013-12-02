
Stryng = require('./../Stryng.js');
expect = require('expect.js');

// checkout sinonjs.org

describe('Stryng', function(){


	// blow away the stack trace here
	// breaks FF3.0
	beforeEach(function(done){

		setTimeout(function(){done()}, 0);
	});

	describe('.capitalize', function(){

		it('should return the empty string', function(){

			expect( Stryng.capitalize('') ).to.equal('');
		});

		it('should upper case the first letter', function(){

			expect( Stryng.capitalize('foo') ).to.equal('Foo');
		});
	});

	describe('.trimRight', function(){

		it('should return the empty string', function(){
			
			expect( Stryng.trimRight2('') ).to.equal('');
		});

		it('should trim trailing whitespace', function () {
			
			var

			ws = '\u0009\u000A\u000B\u000C'
		       + '\u00A0\u000D\u0020\u1680'
		       + '\u180E\u2000\u2001\u2002'
		       + '\u2003\u2004\u2005\u2006'
		       + '\u2007\u2008\u2009\u200A'
		       + '\u2028\u2029\u202F\u205F'
		       + '\u3000\uFEFF',

		    msg = 'Hello World',

		    padded = msg + ws;

		    expect( Stryng.trimRight2(padded) ).to.equal(msg);

		});
	});
});