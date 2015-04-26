const prettyJs = require('pretty-js');

function identity(x) { return x; }

function map(o, func) {
  return Object.keys(o).map(key => func(o[key], key));
}

function objToString(obj, valTransform = _.identity) {

  let str = map(obj, function(v, k) {
    let val = valTransform(v, k);
    return `${k}: ${val}`;
  }).join(',');

  return `{${str}}`;
}

/** Config Parser. Generates object to pass into ol.map */
let parse = {};

parse.createObj = function(type, v, k = '') {
  let subtype = v.type || k;
  let opts = v.opts || v;

  // if ol present go ahead and do some basic validation
  if (ol && (typeof ol[type] === undefined ||
      (subtype && typeof ol[type][subtype] === undefined))) {
    throw new Error(`ol.${type}${subtype} does not exist`);
  }

  if (subtype !== '') {
    subtype = '.' + subtype;
  }

  if (opts) {
    opts = objToString(opts, (v, k) => {
      if (typeof v === 'string' && v.indexOf('new ol.') === 0) {
        return v;
      } else {
        return JSON.stringify(v);
      }
    });
  }
  return `new ol.${type}${subtype}(${opts})`
}

parse.array = function(type, v, k) {
  return '[' + map(v, (v, k) => parse[type](v,k)).join(',') + ']'
};

parse.view = parse.createObj.bind(this, 'View');
parse.control = parse.createObj.bind(this, 'control');
parse.source = parse.createObj.bind(this, 'source')

parse.controls = parse.array.bind(this, 'control');
parse.layers = parse.array.bind(this, 'layer');


parse.layer = function(v, k) {
 v.opts.source = parse.source(v.opts.source);
 return parse.createObj('layer', v, k);
};

parse.map = function(obj) {
  return objToString(obj, (v, k) => parse[k] ? parse[k](v) : JSON.stringify(v));
};

module.exports = function(cfg) {
  let str = parse.map(cfg);
  return prettyJs('var map = new ol.Map({' + str + '})', {indent: '  ',});
};