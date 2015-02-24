/**
 * module for test invokations requiring node flags
 * --trace_opt
 * --trace_deopt 
 * --allow-native-syntax
 * 
 * see [mocha on github](https://github.com/mochajs/mocha/wiki/Using-mocha-programmatically)
 */

var fs = require('fs');
var Mocha = require('mocha');

// read options from fs
// --------------------
var options = {},
    reOption = /--(\w+)\s*(\w+)/;

fs.readFileSync('./test/mocha.opts', 'UTF-8')
  .split('\n')
  .forEach(function (line) {
    var option = line.trim().match(reOption);
    if (option) options[option[1]] = option[2];
  });

// kick off
// --------------------
var mochaInstance = new Mocha(options);

mochaInstance.addFile('./test/stryng.opt.js');

mochaInstance.run(function (failures) {
  process.on('exit', function () {
    process.exit(failures);
  });
});