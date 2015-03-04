/**
 * benchmarks
 */

var Benchmark = require('benchmark');

var Stryng = require('./../src/stryng.js');

/* -----------------------------------------------------------------------------
 * extend Benchmark
 */

Benchmark.extend = function (target, source) {
	Benchmark.forOwn(source, function (value, key) {
		target[key] = value;
	});
};

/* -----------------------------------------------------------------------------
 * set `Benchmark.Suite.options`
 */ 

Benchmark.extend(Benchmark.Suite.options, {
	onStart: function () {
		var text = this.name + ':',
				i = text.length;

		text = '\n' + text + '\n';
		while(i--) text += '-';
		console.log(text);
	},

	onCycle: function (evt) {
		console.log(String(evt.target));
	},

	onError: function (evt) {
		console.log(evt.target.error);
	},

	onComplete: function () {
		console.log('\nSlowest is ' + this.filter('slowest').pluck('name'));
		console.log('Fastest is ' + this.filter('fastest').pluck('name'));

		if (suites.length) {
			suites.shift().run();
		}
	}
});

Benchmark.extend(Benchmark.options, {
	setup: function () {
		// locals
	},

	// minSamples: 200
});

/* -----------------------------------------------------------------------------
 * globals
 */


/* -----------------------------------------------------------------------------
 * define inidividual suits
 */
var suites = [];

suites.push( Benchmark.Suite({name: 'exchangeLeft'})
	.add('push spliced', function () {
		Stryng.exchangeLeft(input, '^^', '||', 3);
	})
	.add('limited split', function () {
		Stryng.exchangeLeft(input, '^^', '||', 3);
	})
);

// kick off - onComplete will resume 
suites.shift().run();
