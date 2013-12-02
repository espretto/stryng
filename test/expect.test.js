
expect = require('expect.js');

// checkout sinonjs.org

describe('function', function(){

	it('should be callable', function (done) {
		
		var fn = function(){ done() };

		expect(fn).not.to.throwError();

	});

})