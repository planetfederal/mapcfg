var test = require('tape')
var fs = require('fs');
var mapcfg = require('../');

test('basic', function(t) {
  var output = mapcfg(require('./basic.json'));
  t.ok(true);
  t.end();
});

test('wms', function(t) {
  var output = mapcfg(require('./wms.json'));
  t.ok(true);
  t.end();
});
