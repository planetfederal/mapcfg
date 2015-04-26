var test = require('tape')
var fs = require('fs');
var mapcfg = require('../');
var ol = require('openlayers');
window.ol = ol;

test('basic', function(t) {
  var output = mapcfg(require('./basic.json'));
  t.doesNotThrow(eval.bind(this, 'var x = ' + output));
  t.end();
});

test('wms', function(t) {
  var output = mapcfg(require('./wms.json'));
  t.doesNotThrow(eval.bind(this, 'var x = ' + output));
  t.end();
});

test('error', function(t) {
  var output = mapcfg(require('./error.json'));
  t.throws(eval.bind(this, 'var x = ' + output));
  t.end();
});

