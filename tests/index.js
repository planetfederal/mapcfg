var test = require('tape')
var fs = require('fs');
var mapcfg = require('../');
var ol = require('openlayers');
var proj4 = require('proj4');
window.ol = ol;
window.proj4 = proj4;

test('basic', function(t) {
  var output = mapcfg(require('./basic.json'));
  console.log(output);
  t.doesNotThrow(eval.bind(this, output));
  t.end();
});

test('wms', function(t) {
  var output = mapcfg(require('./wms.json'));
  t.doesNotThrow(eval.bind(this, output));
  t.end();
});

test('projection', function(t) {
  var output = mapcfg(require('./projection.json'));
  console.log(output);
  t.doesNotThrow(eval.bind(this, output));
  t.end();
});

test('error', function(t) {
  var output = mapcfg(require('./error.json'));
  t.throws(eval.bind(this, output));
  t.end();
});

