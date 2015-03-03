

Benchmark = require('benchmark');
Stryng = require('./../src/stryng.js');

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

function toString (value) {
	return String(value);
}

function exchangeLeft (input, replacee, replacement, n) {
  input = toString(input);
  n = (n === void 0 ? -1 : n) >>> 0;
  replacee = String(replacee);
  replacement = String(replacement);
  if (replacee === replacement) return input;

  var result = input.split(replacee),
      difference = result.length - n;

  if (difference > 0) result.push(result.splice(n, difference).join(replacee));
  return result.join(replacement);
}

function exchangeLeft2 (input, replacee, replacement, n) {
	input = toString(input);
  n = (n === void 0 ? -1 >>> 0 : (n >>> 0) + 1);
  replacee = String(replacee);
  replacement = String(replacement);
  if (replacee === replacement) return input;

  var result = input.split(replacee, n),
      len = result.length,
      i = -1,
      sum = (len-1) * replacee.length;

  while (++i < len) sum += result[i].length;
  return result.join(replacement) + input.substring(sum);
}


var input = new Array(1e6).join('^-^');

// suite queue
suites = [];

suites.push(

	Benchmark.Suite({name: 'exchangeLeft'})

		.add('push spliced', function () {
			Stryng.exchangeLeft(input, '^^', '||', 3);
			
		})

		.add('limited split', function () {
			Stryng.exchangeLeft(input, '^^', '||', 3);
		})
);

// suites = suites.filter(function(suite){
// 	return !suite.name.indexOf('func')
// });

suites.shift().run();
