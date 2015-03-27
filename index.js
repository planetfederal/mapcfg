var prettyJs = require('pretty-js');

function identity(x) { return x; }

function map(o, func) {
  return Object.keys(o).map(key => func(o[key], key));
}

function objToString(obj, valTransform = _.identity) {

  var str = map(obj, function(v, k) {
    let val = valTransform(v, k);
    return `${k}: ${val}`;
  }).join(',');

  return `{${str}}`;
}

let parse = {};

parse.createObj = function(type, v, k = '') {
  var subtype = v.type || k;
  var opts = v.opts || v;

  if (subtype !== '') {
    subtype = '.' + subtype;
  }

  if (opts) {
    opts = objToString(opts, (v, k) => {
      if (typeof v === 'string' && v.indexOf('new ol.') === 0) {
        console.log()
        return v;
      } else {
        return JSON.stringify(v);
      }
    });
  }
  return `new ol.${type}${subtype}(${opts})`
}

parse.view = parse.createObj.bind(this, 'View');
parse.control = parse.createObj.bind(this, 'control');
parse.source = parse.createObj.bind(this, 'source')

parse.controls = function(v, k) {
  return '[' + map(v, (v, k) => parse.control(v, k)).join(',') + ']';
};

parse.layer = function(v, k) {
 v.opts.source = parse.source(v.opts.source);
 return parse.createObj('layer', v, k);
};

parse.layers = function(v, k) {
 return '[' + map(v, (v, k) => parse.layer(v)).join(',') + ']';
};

parse.map = function(obj) {
  return objToString(obj, (v, k) => parse[k] ? parse[k](v) : JSON.stringify(v));
};


module.exports = function(cfg) {
  var str = parse.map(cfg);
  return prettyJs(str, {indent: '  ',});
};