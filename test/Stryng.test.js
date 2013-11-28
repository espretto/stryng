
Stryng = require('./../Stryng.js');
expect = require('chai').expect;

describe('Stryng', function(){


	// blow away the stack trace here
	beforeEach(function(done){
		setTimeout(done, 0);
	});

	// ## setup
	// ---

	// ### readonly test variables
	var

	// test string
	pangram = 'the quick brown fox jumps over the lazy dog',

	// ASCII characters 32 to 126 both inclusive
	printables = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~',

	// method names to exclude from the following throw tests
	except = [

		'random', 'join',
		'prepend', 'prepend2', 'append',
		'toInt', 'toNat', 'toFloat',
		'parseQueryString', 'formatQueryParams', 
		'parseQueryValue', 'formatQueryValue', 
		'chr','fromCharCode'
	],

	// behave-like tests
	falsies = ['', 0, false, NaN, undefined, null];

	// ## at least one argument
	// ---

	describe('every method except - ' + except + ' - must fail if no arguments passed', function(){

		for(var methodName in Stryng)
		{
			if(
				Stryng.hasOwnProperty(methodName) &&
				except.indexOf(methodName) === -1
			){
				(function(methodName){

					it('.' + methodName + '() should throw an error if no input is passed', function(){

						expect(Stryng[methodName]).to.throw();

					});

				})(methodName)
				
			}
		}
	});

	describe('String.prototype.indexOf with inverted signature', function(){

		it('should just work like the original', function () {
			
			var actual = Stryng.indexOf(pangram, 'fox'),
				expected = pangram.indexOf('fox');

			expect(actual).to.equal(expected);

		});
	});

	// // ## inidividual tests
	// // ---

	// describe('.capitalize()', function(){

	// 	it('should return it if passed the empty string', function(){

	// 		var actual = Stryng.capitalize('');

	// 		expect(actual).to.be.a.String.and.be.empty;
	// 	});

	// 	it('should return the string with its first letter upper-cased', function(){

	// 		var actual = Stryng.capitalize('blub'),
	// 			expected = 'Blub';

	// 		expect(actual).to.equal(expected);
	// 	});

	// });

	// describe('.count()', function(){

	// 	it('should throw an error if no `search` passed', function(){

	// 		expect(function(){

	// 			Stryng.count(pangram);

	// 		}).to.throw()
	// 	});

	// 	it('should throw an error if no `search` is empty', function(){

	// 		expect(function(){

	// 			Stryng.count(pangram, '');

	// 		}).to.throw()
	// 	});

	// 	it('should return #non-overlapping occurences of the passed character', function(){

	// 		var actual = Stryng.count(pangram, 'o'),
	// 			expected = 4;

	// 		expect(actual).to.equal(expected);
	// 	});

	// 	it('should return #non-overlapping occurences of the passed string', function(){

	// 		var actual = Stryng.count(pangram, 'the '),
	// 			expected = 2;

	// 		expect(actual).to.equal(expected);
	// 	});

	// 	it('should return #matches found by the the passed regexp', function(){

	// 		var actual = Stryng.count(pangram, /[\s\S]/g),
	// 			expected = pangram.length;

	// 		expect(actual).to.equal(expected);
	// 	});

	// });

	// describe('Stryng.join()', function () {
		
	// 	it('should behave like `Array.prototype.join`', function () {
			
	// 		var words = pangram.split(' ');

	// 		falsies.forEach(function(item){

	// 			expect(Stryng.join(item, words)).to.eql(words.join(item));
	// 		});

	// 	});
	// });

	// describe('Stryng.reverse()', function () {
		
	// 	it('should return it if passed the empty string', function () {
			
	// 		expect(Stryng.reverse('')).to.be.a.String.and.be.empty;

	// 	});

	// 	it('should return the reversed string', function () {
			
	// 		expect(Stryng.reverse('abc')).to.equal('cba');
	// 		expect(Stryng.reverse2('abc')).to.equal('cba');

	// 	});

	// });

	// describe('Stryng.exchange()', function () {
		
	// 	it('should throw if misses the `newString` arg', function () {
			
	// 		expect(function(){

	// 			Stryng.exchange(pangram)

	// 		}).to.throw()

	// 	});

	// 	it('should throw if misses the `oldString` arg', function () {
			
	// 		expect(function(){

	// 			Stryng.exchange(pangram, 'the')

	// 		}).to.throw()

	// 	});

	// 	it('should replace all occurences of `oldString` with `newString`', function () {
			
	// 		var str = 'the quick brown fox jumps over the lazy dog',
	// 			actual = Stryng.exchange(str, 'the', 'a'),
	// 			expected = 'a quick brown fox jumps over a lazy dog';

	// 		expect(actual).to.equal(expected);

	// 	});

	// 	it('should replace `n` occurences of `oldString` with `newString` starting from the beginning', function () {

	// 		var str = 'the quick brown fox jumps over the lazy dog',
	// 			actual = Stryng.exchange(str, 'the', 'a', 1),
	// 			expected = 'a quick brown fox jumps over the lazy dog';

	// 		expect(actual).to.equal(expected);

	// 	});

	// 	it('should replace `n` occurences of `oldString` with `newString` starting from the end', function () {
	// 		var str = 'the quick brown fox jumps over the lazy dog',
	// 			actual = Stryng.exchange(str, 'the', 'a', -1),
	// 			expected = 'the quick brown fox jumps over a lazy dog';

	// 		expect(actual).to.equal(expected);

	// 	});

	// });

	// describe('Stryng.prepend()', function () {
		
	// 	it('should prepend all given arguments to the first', function () {
			
	// 		var args = 'the quick brown fox jumps over the lazy dog'.split(' '),
	// 			expected = 'doglazytheoverjumpsfoxbrownquickthe';

	// 		expect(Stryng.prepend.apply(null, args)).to.eql(expected);
	// 		expect(Stryng.prepend2.apply(null, args)).to.eql(expected);

	// 	});
	// });

	// describe('Stryng.isPrintable()', function () {

	// 	it('should return true for the empty string', function () {
			
	// 		expect(Stryng.isPrintable('')).to.be.true;

	// 	});

	// 	it('should return true for printable characters', function () {
			
	// 		expect(Stryng.isPrintable(' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~')).to.be.true;

	// 	});

	// 	it('should return true for numerals', function () {
			
	// 		expect(Stryng.isPrintable('0123456789')).to.be.true;

	// 	});
		
	// 	it('should return true for literals', function () {
			
	// 		var letters = 'abcdefghijklmnopqrstuvwxyz';

	// 		expect(Stryng.isPrintable(letters.toUpperCase())).to.be.true;
	// 		expect(Stryng.isPrintable(letters.toLowerCase())).to.be.true;

	// 	});

	// 	it('should return true escaped non-word characters', function () {
			
	// 		var letters = '%10\\12\\x0A\\u000A';

	// 		expect(Stryng.isPrintable(letters.toUpperCase())).to.be.true;
	// 		expect(Stryng.isPrintable(letters.toLowerCase())).to.be.true;

	// 	});

	// });

	// describe('.lstrip()', function () {

	// 	it('should do nothing if `n` is zero', function () {
			
	// 		var actual = Stryng.lstrip(pangram, 'whatever', 0),
	// 			expected = pangram;

	// 		expect(actual).to.equal(expected);

	// 	});

	// 	it('should left-strip the prefix once by default', function () {
			
	// 		var actual = Stryng.lstrip('hahahaHau', 'ha'),
	// 			expected = 'hahaHau';

	// 		expect(actual).to.equal(expected);

	// 	});

	// 	it('should left-strip the prefix once', function () {
			
	// 		var actual = Stryng.lstrip('hahahaHau', 'ha', 1),
	// 			expected = 'hahaHau';

	// 		expect(actual).to.equal(expected);

	// 	});

	// 	it('should left-strip the prefix twice', function () {
			
	// 		var actual = Stryng.lstrip('hahahaHau', 'ha', 2),
	// 			expected = 'haHau';

	// 		expect(actual).to.equal(expected);

	// 	});

	// 	it('should left-strip the prefix (if remains) repeatedly', function () {
			
	// 		var actual = Stryng.lstrip('hahahaHau', 'ha', -1),
	// 			expected = 'Hau';

	// 		expect(actual).to.equal(expected);

	// 	});

	// });

	// describe('.rstrip()', function () {
		
	// 	it('should do nothing if `n` is zero', function () {
			
	// 		var actual = Stryng.rstrip(pangram, 'whatever', 0),
	// 			expected = pangram;

	// 		expect(actual).to.equal(pangram);

	// 	});

	// 	it('should right-strip the suffix once by default', function () {
			
	// 		var actual = Stryng.rstrip('Whoahahaha', 'ha'),
	// 			expected = 'Whoahaha';

	// 		expect(actual).to.equal(expected);

	// 	});

	// 	it('should right-strip the suffix once', function () {
			
	// 		var actual = Stryng.rstrip('Whoahahaha', 'ha', 1),
	// 			expected = 'Whoahaha';

	// 		expect(actual).to.equal(expected);

	// 	});

	// 	it('should right-strip the suffix twice', function () {
			
	// 		var actual = Stryng.rstrip('Whoahahaha', 'ha', 2),
	// 			expected = 'Whoaha';

	// 		expect(actual).to.equal(expected);

	// 	});

	// 	it('should right-strip the suffix (if remains) repeatedly', function () {
			
	// 		var actual = Stryng.rstrip('Whoahahaha', 'ha', -1),
	// 			expected = 'Whoa';

	// 		expect(actual).to.equal(expected);

	// 	});

	// });

	// describe('.strip()', function () {
		
	// 	it('should return the string itself if times is zero', function () {
			
	// 		var actual = Stryng.strip(pangram, 'whatever', 0),
	// 			expected = pangram;

	// 		expect(actual).to.equal(pangram);

	// 	});

	// 	it('should work correctly if `lstrip` and `rstrip` do', function(){});

	// });

	// describe('.lsplit()', function () {

	// 	it('should split by arbitrary subsequent whitespace characters if `delimiter` is not specified', function () {
					
	// 		var actual = Stryng.nsplit(pangram),
	// 			expected = pangram.split(/\s+/);

	// 		expect(actual).to.eql(expected);

	// 	});

	// 	var ns = [0, NaN, Infinity, -Infinity, [], {}, /./g]

	// 	ns.forEach(function(item){

	// 		it('should behave like native split for `n == ' + item + '`', function () {
			
	// 			expect(Stryng.nsplit(pangram, ' ', item)).to.eql(pangram.split(' ', item));

	// 		});
			
	// 	});		
		
	// 	it('should split the string `n` times by `delimiter` from the start', function () {
			
	// 		var actual = Stryng.nsplit(pangram, ' ', 3),

	// 			t = pangram.split(' '),
	// 			expected = [t[0], t[1], t[2], t.slice(3).join(' ')];

	// 		expect(actual).to.eql(expected);

	// 	});
		
	// 	it('should split the string `n` times by `delimiter` from the end', function () {
			
	// 		var actual = Stryng.nsplit(pangram, ' ', -3),

	// 			t = pangram.split(' '),
	// 			expected = [t.slice(0, -3).join(' '), t[6], t[7], t[8]];

	// 		expect(actual).to.eql(expected);

	// 	});

	// });
	
	// describe('.slugify()', function () {
		
	// 	it('should return it if passed the empty string', function () {
			
	// 		var actual = Stryng.slugify('');

	// 		expect(actual).to.be.a.String.and.be.empty;

	// 	});

	// 	it('should lower the input', function () {
			
	// 		var actual = Stryng.slugify('CAPS'),
	// 			expected = 'caps';

	// 		expect(actual).to.equal(expected);

	// 	});

	// });

	// describe('.legify()', function () {
		
	// 	it('should return the properly formatted number', function () {
			
	// 		var actual = Stryng.legify(12345, ','),
	// 			expected = '12,345.00';

	// 		expect(actual).to.equal(expected);

	// 	});

	// 	it('should return the properly formatted number', function () {
			
	// 		var actual = Stryng.legify(1234567, '.'),
	// 			expected = '1.234.567,00';

	// 		expect(actual).to.equal(expected);

	// 	});

	// 	it('should return the properly formatted number', function () {
			
	// 		var actual = Stryng.legify(1234567, ',', ''),
	// 			expected = '1,234,567';

	// 		expect(actual).to.equal(expected);

	// 	});

	// 	it('should return the properly formatted number', function () {
			
	// 		var actual = Stryng.legify(1234567, '.', '-'),
	// 			expected = '1.234.567,-';

	// 		expect(actual).to.equal(expected);

	// 	});

	// 	it('should return the properly formatted number', function () {
			
	// 		var actual = Stryng.legify(-1234567, ',', ' '),
	// 			expected = '-1,234,567. ';

	// 		expect(actual).to.equal(expected);

	// 	});

	// });

	// describe('.isEqual()', function () {
		
	// 	it('should throw an error if a compare value is missing', function () {
			
	// 		expect(function(){

	// 			Stryng.isEqual(pangram);

	// 		}).to.throw()

	// 	});

	// 	it('should return whether the two strings equal', function () {
			
	// 		expect(Stryng.isEqual(pangram, pangram)).to.be.true;

	// 	});
	// });

	// describe('.isEquali()', function () {
		
	// 	it('should return whether the two strings equal case-insensitively', function () {
			
	// 		expect(Stryng.isEquali('foo', 'Foo')).to.be.true;

	// 	});

	// });

	// describe('.length()', function () {
		
	// 	it('should return zero for the empty string', function () {
			
	// 		expect(Stryng.length('')).to.equal(0);

	// 	});

	// 	it('should return zero for the empty string', function () {
			
	// 		expect(Stryng.length(pangram)).to.equal(pangram.length);

	// 	});

	// });

	// describe('.isNumeric()', function () {

	// 	it('should return whether the string represents an integer', function () {
			
	// 		expect(Stryng.isNumeric('123')).to.be.true;

	// 	});
		
	// });

	// describe('.isEmpty()', function () {
		
	// 	it('should return whether the string has length zero', function () {
			
	// 		expect(Stryng.isEmpty('')).to.be.true;
	// 	});

	// 	it('should return whether the string has length zero', function () {
			
	// 		expect(Stryng.isEmpty(pangram)).to.be.false;
	// 	});

	// });

	// describe('.wrap()', function () {
		
	// 	it('should throw an error if second argument is missing', function () {
			
	// 		expect(function(){

	// 			Stryng.wrap(pangram)

	// 		}).to.throw();
			
	// 	});

	// 	it('should return the string with the argument pre- and appended', function () {
			
	// 		var actual = Stryng.wrap('quote', '"'),
	// 			expected = '"quote"';

	// 		expect(actual).to.equal(expected);
	// 	});

	// });

	// describe('.quote()', function(){

	// 	it('should return two double quotation marks if passed the empty string', function(){

	// 		var actual = Stryng.quote(''),
	// 			expected = '""';

	// 		expect(actual).to.equal(expected);
	// 	});

	// 	it('should return the string wrapped in double quotation marks', function(){

	// 		var actual = Stryng.quote('test'),
	// 			expected = '"test"';

	// 		expect(actual).to.equal(expected);
	// 	});

	// });

	// describe('.unquote()', function () {

	// 	it('should do nothing if passed the empty string', function () {
		 	
	// 		expect(Stryng.unquote('')).to.be.a.String.and.be.empty;

	// 	});

	// 	it('should trim arbitrary leading and trailing quotation marks, both single and double ones', function () {
			
	// 		var actual = Stryng.unquote('\'"\'Hello World!\"\'"'),
	// 			expected = 'Hello World!';

	// 		expect(actual).to.equal(expected);

	// 	});

	// });

	// describe('.truncateChars()', function () {

	// 	it('should return it the empty string if `n` is not specified', function () {

	// 		expect(Stryng.truncateChars(pangram)).to.be.a.String.and.be.empty;
			
	// 	});

	// 	it('should return it if `n` is greater than the given string\'s length', function () {

	// 		var actual = Stryng.truncateChars(pangram, Infinity),
	// 			expected = pangram;

	// 		expect(actual).to.equal(expected);
			
	// 	});

	// 	it('should return it if `n` equals the given string\'s length', function () {

	// 		var actual = Stryng.truncateChars(pangram, pangram.length),
	// 			expected = pangram;

	// 		expect(actual).to.equal(expected);
			
	// 	});

	// 	it('should truncate it to the passed length', function () {
			
	// 		var actual = Stryng.truncateChars(pangram, 10),
	// 			expected = 'the quick ';

	// 		expect(actual).to.equal(expected);

	// 	});

	// 	it('should truncate it to the passed length', function () {
			
	// 		var actual = Stryng.truncateChars('the quick brown fox jumps over the lazy dog', -10),
	// 			expected = 'the quick brown fox jumps over th';

	// 		expect(actual).to.equal(expected);

	// 	});

	// 	it('should truncate it to the passed length', function () {
			
	// 		var actual = Stryng.truncateChars('the quick brown fox jumps over the lazy dog', -10, '...'),
	// 			expected = 'the quick brown fox jumps over...';

	// 		expect(actual).to.equal(expected);

	// 	});

	// });

	// describe('.truncate()', function () {

	// 	it('should truncate it by the passed negative index', function () {
			
	// 		var actual = Stryng.truncate(pangram, -10),
	// 			expected = 'the quick brown fox jumps over';

	// 		expect(actual).to.equal(expected);

	// 	});

	// 	it('should truncateWords it at the word boundary nearest to `n` minus the given ellipsis\'s length', function () {
			
	// 		var actual = Stryng.truncate(pangram, 10, '...'),
	// 			expected = 'the...';

	// 		expect(actual).to.equal(expected);

	// 	});

	// 	it('should truncateWords it at the word boundary nearest to `n` minus the given ellipsis\'s length', function () {
			
	// 		var actual = Stryng.truncate(pangram, -12, '...'),
	// 			expected = 'the quick brown fox jumps...';

	// 		expect(actual).to.equal(expected);

	// 	});

	// 	it('should truncateWords it at the word boundary nearest to `n` minus the given ellipsis\'s length', function () {
			
	// 		var actual = Stryng.truncate(pangram, -12, '...'),
	// 			expected = 'the quick brown fox jumps...';

	// 		expect(actual).to.equal(expected);

	// 	});

	// });

	// describe('.random()', function () {
		
	// 	it('should return the empty string if passed zero', function () {
			
	// 		expect(Stryng.random(0)).to.be.a.String.and.be.empty;

	// 	});

	// 	it('should return a random string of the passed length', function () {
			
	// 		var length = 10,
	// 			actual = Stryng.random(length);

	// 		expect(actual).to.be.a.String.and.have.length(length);
	// 	});

	// 	it('should return a random string of the passed length consisting of the given charset', function () {
			
	// 		var length = 10,
	// 			actual = Stryng.random(length, 'abcdefghijklmnopqrstuvwxyz');

	// 		expect(actual).to.be.a.String.and.have.length(length);
	// 	});

	// 	// thousand and one test
	// 	for(var i = 0; i < 10; i++)
	// 	{
	// 		(function () {

	// 			var j = Math.random() * 1000 | 0;

	// 			it('should return a printable (default) random string of length ' + j, function(){
					
	// 				var actual = Stryng.random(j);

	// 				expect(actual).to.be.a.String.and.have.length(j);

	// 				expect(Stryng.isPrintable(actual)).to.be.true;
					
	// 			});

	// 		})();
	// 	}
	// });

	// describe('.parseQueryString()', function () {
		
	// 	it('should return an object holding the query arguments', function () {
			
	// 		var queryString = '?key=value&valueless',
	// 			actual = Stryng.parseQueryString(queryString),
	// 			expected = {
	// 				key: 'value',
	// 				valueless: void 0
	// 			};

	// 		expect(actual).to.eql(expected);
	// 		expect(actual).to.have.ownProperty('key');
	// 		expect(actual).to.include({ key: 'value'});
	// 		expect(actual).to.have.keys('key', 'valueless');

	// 	});
	// });
});
