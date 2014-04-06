

Benchmark = require('benchmark');
Stryng = require('./../stryng.js');

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
	},
	function(fn, fnName){ this[fnName] = fn },
	Benchmark.Suite.options
);

// Benchmark.options.minSamples = 200;



// initial setup for all Benchmarks
// --------------------------------

Benchmark.options.setup = function()
{
	var

	empty = '',
	chr = 'a',
	word = 'foo',
	sentence = 'the quick brown fox jumps over the lazy dog',
	splitSentence = sentence.split(' '),

	rightPadded = 'text'
		+ '\u0009\u000A\u000B\u000C'
		+ '\u00A0\u000D\u0020\u1680'
		+ '\u180E\u2000\u2001\u2002'
		+ '\u2003\u2004\u2005\u2006'
		+ '\u2007\u2008\u2009\u200A'
		+ '\u2028\u2029\u202F\u205F'
		+ '\u3000\uFEFF',

	html ='<!doctype html>'
		+ '<html>'
		+ '<head>'
		+ '    <title>Example Domain</title>'
		+ ''
		+ '    <meta charset="utf-8" />'
		+ '    <meta http-equiv="Content-type" content="text/html; charset=utf-8" />'
		+ '    <meta name="viewport" content="width=device-width, initial-scale=1" />'
		+ '    <style type="text/css">'
		+ '    </style>    '
		+ '</head>'
		+ ''
		+ '<body>'
		+ '<div>'
		+ '    <h1>Example Domain</h1>'
		+ '    <p>This domain is established to be used for illustrative examples in documents. You may use this'
		+ '    domain in examples without prior coordination or asking for permission.</p>'
		+ '    <p><a href="http://www.iana.org/domains/example">More information...</a></p>'
		+ '</div>'
		+ '</body>'
		+ '</html>';

		array_slice = Array.prototype.slice;

};

// globals
// -------



// suite queue
suites = [];

suites.push(

	Benchmark.Suite({name: 'splitLeft'})

		.add('match substrings', function(){
			
			Stryng.splitLeft(html, /<[^>]*>/);

		})

		.add('exec with globalized', function(){
			
			Stryng.splitLeft2(html, /<[^>]*>/);

		})
);

suites.push(

	Benchmark.Suite({name: 'count'})

		.add('charAt loop', function(){

			Stryng.count2(sentence, ' ');
		})

		.add('repetitive indexOf', function(){

			Stryng.count(sentence, ' ');
		})
);

suites.push(

	Benchmark.Suite({name:'trimRight'})

		.add('reverse charAt loop with regex test', function(){

		    Stryng.trimRight(rightPadded);
		})

		.add('reverse charAt loop with contains check', function(){

		    Stryng.trimRight2(rightPadded);
		})
		
		.add('strip by regex', function(){

		    Stryng.trimRight3(rightPadded);
		})
);

suites.push(

	Benchmark.Suite({name:'reverse'})

		.add('reverse charAt loop appending to new string', function(){

			Stryng.reverse3('0123456789ABCDEF');
		})

		.add('reverse charAt loop appending to input then slicing', function(){

			Stryng.reverse2('0123456789ABCDEF');
		})

		.add('composed split reverse join', function(){

			Stryng.reverse('0123456789ABCDEF');
		})
);

suites.push(

	Benchmark.Suite({name:'join'})

		.add('slice args', function(){

			Stryng['join'](' ', splitSentence);
		})

		.add('shift args', function(){

			Stryng['join2'](' ', splitSentence);
		})
);

suites.push( // http://jsperf.com/mention-arguments/3

	Benchmark.Suite({name:'arguments'})

		.add('1', function(x){
			var y = 1;
			return Math.random() === x + y;
		})

		.add('2', function(x, arguments){
			var y = 1;
			return Math.random() === x + y;
		})

		.add('3', function(x){
			var y = 1, arguments;
			return Math.random() === x + y;
		})

		.add('4', function(x){
			var y = 1;
			return Math.random() === x + y;
			var arguments;
		})

		.add('5', function(x){
			var y = 1;
			return Math.random() === x + y;
			arguments : while(false);
		})

		.add('6', function(x){
			arguments : while(false);
			var y = 1;
			return Math.random() === x + y;
		})
);

suites.push(

	Benchmark.Suite({name:'isEqual'})

		.add('isEqual', function(){

			Stryng.isEqual('hello', 'hello', 'hello', 'hello', 'hello');
		})

		.add('isEqual2', function(){

			Stryng.isEqual2('hello', 'hello', 'hello', 'hello', 'hello');
		})
);

suites.push(

	Benchmark.Suite({name: 'toArray'})

		.add('array slice', function(){
			array_slice.call('0123456789ABCDEF');
		})

		.add('string split', function(){
			'0123456789ABCDEF'.split('')
		})

)

suites = suites.filter(function(suite){

	return !suite.name.indexOf('join')

});

suites.shift().run();
