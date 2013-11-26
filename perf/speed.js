




Benchmark = require('benchmark');
Stringen = require('./Stringen.js');




// baseline setup
// ==============


// extend `Benchmark.Suite.options`
// --------------------------------

Benchmark.forOwn(
	{
		onStart: function()
		{
			var text = this.name + ':',
				i = text.length;

			text = '\n' + text + '\n';
			
			while(i--)
			{
				text += '-';
			}

			console.log(text);
		},

		onCycle: function(evt)
		{
			console.log(String(evt.target));
		},

		onError: function(evt)
		{
			console.log(evt.target.error);
		},

		onComplete: function()
		{
			console.log('\nSlowest is ' + this.filter('slowest').pluck('name'));
			console.log('Fastest is ' + this.filter('fastest').pluck('name'));

			if(suites.length)
			{
				suites.shift().run();
			}
		}
	}.
	function(fn, fnName){ this[fnName] = fn },
	Benchmark.Suite.options
);



// initial setup for all Benchmarks
// --------------------------------

Benchmark.options.setup = function()
{
	var

	// static strings
	empty = '',
	chr = 'a',
	word = 'foo',
	sentence = 'the quick brown fox jumps over the lazy dog';

};


// globals
// -------

// suite queue
suites = [];

// printable randomized strings
gRandomStrings = (function(lengths){

	var cache = {};

	lengths.forEach(function(length){

		cache[length] = Stringen.random(length);

	});

	return cache;

})( [10, 50, 100, 200, 500, 1000, 2000, 5000] );

// naive polyfill `String.prototype.repeat` as generic
function repeat(value, n)
{
	var result = '';

	while(n--)
	{
		result += value;
	}

	return result;
}

// repeated string
gRandomString = Stringen.random(10);
gRepeatedRadnomString = repeat(gRandomString, 500);

// Stringen.capitalize()
// ---------------------

suites.push(

	Benchmark.Suite({name:'capitalize empty string'})

		.add('Stringen.capitalize()', function() {

			Stringen.capitalize(empty);

		})
		.add('Stringen.capitalize2()', function() {

			Stringen.capitalize2(empty);

		})
);

suites.push(

	Benchmark.Suite({name:'capitalize single character'})

		.add('Stringen.capitalize()', function(){

			Stringen.capitalize(chr);

		})
		.add('Stringen.capitalize2()', function(){

			Stringen.capitalize2(chr);

		})

);

suites.push(

	Benchmark.Suite({name:'capitalize word'})

		.add('Stringen.capitalize()', function(){

			Stringen.capitalize(word);

		})
		.add('Stringen.capitalize2()', function(){

			Stringen.capitalize2(word);

		})

);

// Stringen.count()
// ----------------

suites.push(

	Benchmark.Suite({name:'count single character'})

		.add('Stringen.count()', function(){

			Stringen.count(sentence, 'o');

		})
		.add('Stringen.count2()', function(){

			Stringen.count2(sentence, 'o');

		})

);

suites.push(

	Benchmark.Suite({name:'count regex'})

		.add('Stringen.count()', function(){

			Stringen.count(sentence, /o/g);

		})
		.add('Stringen.count2()', function(){

			Stringen.count2(sentence, /o/g);

		})

);

suites.push(

	Benchmark.Suite({name:'count word'})

		.add('Stringen.count()', function(){

			Stringen.count(sentence, 'the ');

		})
		.add('Stringen.count2()', function(){

			Stringen.count2(sentence, 'the ');

		})

);

// Stringen.isPrintable()
// ----------------------

Benchmark.forOwn(gRandomStrings, function(randomString, length){

	suites.push(

		Benchmark.Suite({name: 'isPrintable check of length ' + length })

			.add('Stringen.isPrintable()', function(){

				Stringen.isPrintable(randomString);

			})

			.add('Stringen.isPrintable2()', function(){

				Stringen.isPrintable2(randomString);

			})

			.add('Stringen.isPrintable3()', function(){

				Stringen.isPrintable3(randomString);

			})

	);

});

// Stringen.lstrip()
// -----------------

[3,4,5,6,7,8].forEach(function(n){

	suites.push(

		Benchmark.Suite({name: 'lstrip operation with `n = ' + n + '`'})

			.add('Stringen.lstrip()', function(){

				Stringen.lstrip(gRepeatedRadnomString, gRandomString, n);

			})

			.add('Stringen.lstrip2()', function(){

				Stringen.lstrip2(gRepeatedRadnomString, gRandomString, n);

			})

			.add('Stringen.lstrip3()', function(){

				Stringen.lstrip3(gRepeatedRadnomString, gRandomString, n);

			})

	);

});

suites = suites.filter(function(suite){

	return !suite.name.indexOf('count')

});

suites.shift().run();