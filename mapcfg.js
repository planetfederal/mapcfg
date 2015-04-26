(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.mapcfg = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var prettyJs = require('pretty-js');

function identity(x) {
  return x;
}

function map(o, func) {
  return Object.keys(o).map(function (key) {
    return func(o[key], key);
  });
}

function objToString(obj) {
  var valTransform = arguments[1] === undefined ? _.identity : arguments[1];

  var str = map(obj, function (v, k) {
    var val = valTransform(v, k);
    return '' + k + ': ' + val;
  }).join(',');

  return '{' + str + '}';
}

/** Config Parser. Generates object to pass into ol.map */
var parse = {};

parse.createObj = function (type, v) {
  var k = arguments[2] === undefined ? '' : arguments[2];

  var subtype = v.type || k;
  var opts = v.opts || v;

  // if ol present go ahead and do some basic validation
  if (ol && (typeof ol[type] === undefined || subtype && typeof ol[type][subtype] === undefined)) {
    throw new Error('ol.' + type + '' + subtype + ' does not exist');
  }

  if (subtype !== '') {
    subtype = '.' + subtype;
  }

  if (opts) {
    opts = objToString(opts, function (v, k) {
      if (typeof v === 'string' && v.indexOf('new ol.') === 0) {
        return v;
      } else {
        return JSON.stringify(v);
      }
    });
  }
  return 'new ol.' + type + '' + subtype + '(' + opts + ')';
};

parse.array = function (type, v, k) {
  return '[' + map(v, function (v, k) {
    return parse[type](v, k);
  }).join(',') + ']';
};

parse.view = parse.createObj.bind(undefined, 'View');
parse.control = parse.createObj.bind(undefined, 'control');
parse.source = parse.createObj.bind(undefined, 'source');

parse.controls = parse.array.bind(undefined, 'control');
parse.layers = parse.array.bind(undefined, 'layer');

parse.layer = function (v, k) {
  v.opts.source = parse.source(v.opts.source);
  return parse.createObj('layer', v, k);
};

parse.map = function (obj) {
  return objToString(obj, function (v, k) {
    return parse[k] ? parse[k](v) : JSON.stringify(v);
  });
};

module.exports = function (cfg) {
  var str = parse.map(cfg);
  return prettyJs('var map = new ol.Map(' + str + ')', { indent: '  ' });
};

},{"pretty-js":2}],2:[function(require,module,exports){
/**
 * JavaScript beautifier
 *
 * The code will call on Complexion to first tokenize the JavaScript and
 * then run through these rules to insert appropriate whitespace.
 *
 * In procedure will be to run through each token.  Whitespace tokens are
 * removed and others will add whitespace again just after each token.  All
 * whitespace is managed by this beautifier.
 */
/*global exports, module, require*/
// fid-umd {"depends":[{"name":"Complexion","commonjs":"complexion"},{"name":"complexionJs","commonjs":"complexion-js"}],"jslint":1,"name":"prettyJs"}
/*global define, YUI*/
(function (n, r, f) {
    "use strict";
    try { module.exports = f(require("complexion"), require("complexion-js")); return; } catch (ignore) {}
    try { exports[n] = f(require("complexion"), require("complexion-js")); return; } catch (ignore) {}
    try { return define.amd && define(n, ["Complexion", "complexionJs"], f); } catch (ignore) {}
    try { return YUI.add(n, function (Y) { Y[n] = f(Y.Complexion, Y.complexionJs); }, "", { requires: ["Complexion", "complexionJs"] }); } catch (ignore) {}
    try { r[n] = f(r.Complexion, r.complexionJs); return; } catch (ignore) {}
    throw new Error("Unable to export " + n);
}("prettyJs", this, function (Complexion, complexionJs) {
    "use strict";
    // fid-umd end

    var keywordContentProcessors, processors, punctuatorContentProcessors, tokenizer;

    /**
     * Allowed options
     *
     * @typedef {Object} prettyJs~options
     * @property {?boolean} bom Always add, remove, or just preserve BOM
     * @property {string} commentSpace Spaces to the left of single comments
     * @property {?string} convertStrings Set to "double", "single" or falsy
     * @property {boolean} elseNewline When enabled, else and catch on new line
     * @property {string} indent What to use for a single indent level
     * @property {boolean} jslint Use jslint-compatible rules
     * @property {string} newline What string to use for newlines
     * @property {boolean} noSpaceAfterIf Remove space in "if ("
     * @property {boolean} noSpaceAfterFor Remove space in "for ("
     * @property {boolean} noSpaceAfterFunction Remove space in "function ("
     * @property {boolean} noSpaceAfterSwitch Remove space in "switch ("
     * @property {?boolean} quoteProperties Wrap object properties in quotes
     */

    /**
     * @typedef {Object} prettyJs~resultBit
     * @property {string} code
     * @property {string} content
     */

    /**
     * This is where the result of all of the hard work will end up
     *
     * @property {Array.<prettyJs~resultBit>} contexts Context and indentation
     * @property {Array.<prettyJs~resultBit>} fragments Formatted output
     * @property {prettyJs~options} options
     */
    function Result(options) {
        this.contexts = [];
        this.fragments = [];
        this.options = options;
    }

    /**
     * Adds a blank line if the previous non-whitespace token is a } or ;
     */
    Result.prototype.addConditionalNewline = function () {
        var prev;

        prev = this.getPreviousNonWhitespace();

        if (!prev) {
            return;
        }

        if (prev.content === ';' || prev.content === '}') {
            this.removeWhitespace();
            this.addNewline();
            this.addNewline();
        }
    };

    /**
     * Sets a context and adds the indentation to the output
     *
     * @param {(string|prettyJs~resultBit)} code
     * @param {string} [indent] defaults to this.options.indent
     */
    Result.prototype.addContext = function (code, indent) {
        if (typeof code !== 'object') {
            if (indent === undefined) {
                indent = this.options.indent;
            }

            this.contexts.push({
                code: code,
                content: indent
            });
        } else {
            this.contexts.push(code);
        }
    };

    /**
     * Adds a chunk of text to the list
     *
     * @param {string} code
     * @param {string} type
     */
    Result.prototype.addFragment = function (code, content) {
        this.fragments.push({
            code: code,
            content: content
        });
    };

    /**
     * Adds a newline to the list
     *
     * Also can strip spaces and indentation so we don't have extra whitespace
     * at the end of lines.
     */
    Result.prototype.addNewline = function () {
        var type;

        type = this.getType();

        while (type === 'INDENT' || type === 'SPACE') {
            this.removeFragment();
            type = this.getType();
        }

        this.addFragment('NEWLINE', this.options.newline);
        this.addFragment('INDENT', this.getIndentation());
    };

    /**
     * Adds a space to the list
     */
    Result.prototype.addSpace = function () {
        return this.addFragment('SPACE', ' ');
    };

    /**
     * Adds a chunk of text to the list based on a token
     *
     * @param {complexionJs~ComplexionJsToken} token
     */
    Result.prototype.addToken = function (token) {
        this.fragments.push({
            code: token.type,
            content: token.content
        });
    };

    /**
     * Returns true if a blank line should be added at the current position
     * before adding a comment
     *
     * @return {boolean}
     */
    Result.prototype.commentShouldHaveNewline = function () {
        var check, last;

        last = this.getPreviousNonWhitespace();

        // No extra newline at the beginning of a file
        if (!last) {
            return false;
        }

        // No extra newline when following an open symbol
        check = last.content;

        if (check === '{' || check === '(' || check === '[') {
            return false;
        }

        // No extra newline after some token types
        check = last.code;

        if (check === 'LINE_COMMENT' || check === 'BOM') {
            return false;
        }

        return true;
    };

    /**
     * Gets the current context, if there is one
     *
     * @return {?string}
     */
    Result.prototype.getContextCode = function () {
        if (!this.contexts.length) {
            return null;
        }

        return this.contexts[this.contexts.length - 1].code;
    };

    /**
     * Returns the last fragment object
     *
     * @return {?prettyJs~resultBit}
     */
    Result.prototype.getFragment = function () {
        if (!this.fragments.length) {
            return null;
        }

        return this.fragments[this.fragments.length - 1];
    };

    /**
     * Returns the current indentation string
     *
     * @return {string}
     */
    Result.prototype.getIndentation = function () {
        var i, str;

        str = '';

        for (i = 0; i < this.contexts.length; i += 1) {
            str += this.contexts[i].content;
        }

        return str;
    };

    /**
     * Returns the last fragment which is not whitespace.
     *
     * @return {?prettyJs~resultBit}
     */
    Result.prototype.getPreviousNonWhitespace = function () {
        var code, i;

        for (i = this.fragments.length - 1; i >= 0; i -= 1) {
            code = this.fragments[i].code;

            if (code !== 'SPACE' && code !== 'INDENT' && code !== 'NEWLINE') {
                return this.fragments[i];
            }
        }

        return null;
    };

    /**
     * Returns the text from the last fragment added
     *
     * Does not call getFragment for speed (saves a function call)
     *
     * @return {?string}
     */
    Result.prototype.getText = function () {
        if (!this.fragments.length) {
            return null;
        }

        return this.fragments[this.fragments.length - 1].content;
    };

    /**
     * Returns the code from the last fragment added
     *
     * Does not call getFragment for speed (saves a function call)
     *
     * @return {?string}
     */
    Result.prototype.getType = function () {
        if (!this.fragments.length) {
            return null;
        }

        return this.fragments[this.fragments.length - 1].code;
    };

    /**
     * Return true if we could be making an array literal
     *
     * Does not call getFragment for speed (saves a function call)
     *
     * @return {boolean}
     */
    Result.prototype.isArrayLiteral = function () {
        var prev;

        prev = this.getPreviousNonWhitespace();

        if (!prev) {
            return true;
        }

        if (prev.code === 'KEYWORD') {
            // Things that allow properties
            if (prev.content === 'this' || prev.content === 'super') {
                // this['some property']
                return false;
            }

            return true;
        }

        if (prev.code === 'IDENTIFIER_NAME') {
            // thing[1]
            return false;
        }

        if (prev.content === ')' || prev.content === ']') {
            // test()[1]
            // multiArray[0][1]
            return false;
        }

        return true;
    };

    /**
     * Return true if we could be doing type conversion at this point
     *
     * @return {boolean}
     */
    Result.prototype.isTypeConversion = function () {
        var prev;

        if (!this.fragments.length) {
            return true;
        }

        prev = this.getPreviousNonWhitespace();

        if (!prev) {
            return true;
        }

        if (prev.code === 'KEYWORD') {
            return true;
        }

        // Most punctuators imply that the next thing done will likely be
        // a type conversion.  The rest seem to imply math.
        if (prev.code !== 'PUNCTUATOR') {
            return false;
        }

        // These are all flags for math
        if (prev.content === ')' || prev.content === '}' || prev.content === ']') {
            return false;
        }

        return true;
    };

    /**
     * Returns true if the last token was a newline.  Skips spaces and
     * indentation.
     *
     * @return {boolean}
     */
    Result.prototype.lastWasNewline = function () {
        var code, i;

        i = this.fragments.length - 1;

        while (i >= 0) {
            code = this.fragments[i].code;

            if (code === 'NEWLINE') {
                return true;
            }

            if (code !== 'SPACE' && code !== 'INDENT') {
                return false;
            }

            i -= 1;
        }

        // Slightly odd.  No content's the same as a newline.
        return true;
    };

    /**
     * Removes a level from the context
     *
     * @return {?prettyJs~resultBit}
     */
    Result.prototype.removeContext = function () {
        var self;

        self = this;

        if (!self.contexts.length) {
            // Force indents to go up when there were no contexts
            self.fragments.forEach(function (fragment) {
                if (fragment.code === 'INDENT') {
                    fragment.content = self.options.indent + fragment.content;
                }
            });

            return null;
        }

        return self.contexts.pop();
    };


    /**
     * Removes a level from the context when the context should end at
     * the end of a statement.  This method will get called when hitting
     * a semicolon, closing brace, and in other situations that would
     * indicate that a statement is complete.  The contexts associated
     * with statement-level constructs would be removed.
     */
    Result.prototype.removeContextForStatement = function () {
        var context;

        context = this.getContextCode();

        while (context === 'IF' || context === 'ELSE' || context === 'FOR' || context === 'TERNARY' || context === 'VAR') {
            this.removeContext();
            context = this.getContextCode();
        }
    };


    /**
     * Removes a fragment from the stack
     *
     * @return {?prettyJs~resultBit}
     */
    Result.prototype.removeFragment = function () {
        if (!this.fragments.length) {
            return null;
        }

        return this.fragments.pop();
    };

    /**
     * Removes whitespace from the end of the fragments
     */
    Result.prototype.removeWhitespace = function () {
        var type;

        type = this.getType();

        while (type === 'NEWLINE' || type === 'SPACE' || type === 'INDENT') {
            this.removeFragment();
            type = this.getType();
        }
    };

    /**
     * Returns the result as a string
     *
     * @return {string}
     */
    Result.prototype.toString = function () {
        var i, str;

        str = '';

        for (i = 0; i < this.fragments.length; i += 1) {
            str += this.fragments[i].content;
        }

        return str;
    };

    /**
     * Convert a quoted string to a different quoting method
     *
     * @param {prettyJs~Result} result
     * @param {string} content String content WITH QUOTES
     * @return {string} Converted string
     */
    function convertString(result, content) {
        var converted, quote;

        if (!result.options.convertStrings) {
            return content;
        }

        if (result.options.convertStrings === 'single') {
            quote = "'";
        } else {
            quote = '"';
        }

        if (content.charAt(0) === quote) {
            return content;
        }

        // Remove quotes
        converted = content.substr(1, content.length - 2);

        /* Unescape all quotes and be careful with properly escaped
         * backslashes, like "\\'"
         */
        /*jslint regexp:true*/
        converted = converted.replace(/\\./g, function (match) {
            /*jslint regexp:false*/
            var c;

            c = match.charAt(1);

            if (c === '"' || c === "'") {
                return c;
            }

            return match;
        });

        // Escape our quotes again
        converted = converted.replace(new RegExp(quote, 'g'), '\\' + quote);

        return quote + converted + quote;
    }

    /**
     * Initialize options with their default values and guarantee that the
     * options variable is an object.
     *
     * @param {*} options
     * @return {prettyJs~options} options
     */
    function initializeOptions(options) {
        var defaults;

        defaults = {
            bom: false,  // Causes problems and unnecessary with UTF-8
            commentSpace: "  ",  // Looks nice before single line comments
            convertStrings: "double",  // Mimics JSON
            elseNewline: false,  // Matches jslint rules
            indent: '    ',  // The eternal spaces vs. tabs debate
            jslint: false,  // Some jslint-specific rules
            newline: "\n",  // Unix-style newlines
            quoteProperties: false,  // Prefer to unquote properties
            trailingNewline: false  // Prefer to remove trailing newline
        };

        if (!options) {
            options = {};
        }

        Object.keys(defaults).forEach(function (key) {
            if (options[key] === undefined) {
                options[key] = defaults[key];
            }
        });

        if (options.convertStrings !== 'single' && options.convertStrings !== 'double') {
            options.convertStrings = false;
        }

        if (options.jslint) {
            options.quoteProperties = false;
        }

        return options;
    }

    /**
     * Token processing function
     *
     * @typedef {Function} prettyJs~processor
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */

    /**
     * Hand off the token processing to another function based on
     * the token's content.
     *
     * @param {Object} rules Map of exact string to processor
     * @param {prettyJs~processor} defaultProcessor
     * @return {prettyJs~processor}
     */
    function processByContent(rules, defaultProcessor) {
        return function (result, token) {
            var fn;

            if (rules.hasOwnProperty(token.content)) {
                fn = rules[token.content];
            } else {
                fn = defaultProcessor;
            }

            return fn(result, token);
        };
    }


    /**
     * Passes off an individual token to a processing function.
     *
     * @param {prettyJs~result}
     * @param {complexionJs~ComplexionJsToken} token
     * @param {number} index
     * @param {Array.<complexionJs~ComplexionJsToken>} tokenList
     */
    function processToken(result, token, index, tokenList) {
        var fn;

        fn = processors[token.type];

        if (!fn) {
            throw new Error('Unhandled token type ' + token.type + ' at line ' + token.line + ' col ' + token.col + ', offset ' + token.offset);
        }

        fn(result, token, index, tokenList);
    }

    /**
     * Byte order mark
     *
     * If the `bom` option is set to `true` or `false` we always remove it.
     * When it's true, the BOM is added immediately by the prettyJs
     * function itself.
     *
     * @param {prettyJs~Result} result
     */
    function tokenBom(result) {
        if (result.options.bom === null || result.options.bom === undefined) {
            result.addFragment("BOM", "\ufeff");
        }
    }

    /**
     * Copy a token to the result.
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenCopy(result, token) {
        result.addToken(token);
    }

    /**
     * Copy a token to the result and add a newline.
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenCopyAndNewline(result, token) {
        result.addToken(token);
        result.addNewline();
    }

    /**
     * Copy a token to the result and add a space.
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenCopyAndSpace(result, token) {
        result.addToken(token);
        result.addSpace();
    }

    /**
     * Switches may have "case" and "default" outdented.
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenKeywordCase(result, token) {
        var context;

        context = result.getContextCode();

        if (context === 'BRACE') {
            // Treat this as an identifier
            return tokenCopyAndSpace(result, token);
        }

        result.removeWhitespace();

        /* Add a blank line between this keyword and the previous
         * content unless it's the first "case" in a switch or
         * there's multiple "case"/"default" rules together.
         */
        if (result.getText() !== '{' && result.getText() !== ':') {
            result.addNewline();
        }

        if (result.options.jslint) {
            context = result.removeContext();
            result.addNewline();
            result.addContext(context);
        } else {
            if (result.getContextCode() !== 'SWITCH_BLOCK') {
                result.removeContext();
            }

            result.addNewline();
            result.addContext(token.content.toUpperCase());
        }

        tokenCopyAndSpace(result, token);
    }

    /**
     * The start of a control flow block
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenKeywordControlFlow(result, token) {
        result.addConditionalNewline();
        tokenCopyAndSpace(result, token);
        result.addContext(token.content.toUpperCase(), '');
    }

    /**
     * "else" and "catch" should be on the same line as a closing }
     * but "else" should be on a new, unindented line when there was no }
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenKeywordElse(result, token) {
        var prev;

        // Remove newlines and indentation
        result.removeWhitespace();

        if (!result.options.elseNewline) {
            prev = result.getFragment();

            if (prev) {
                if (prev.content === '}') {
                    result.addSpace();
                } else {
                    result.addNewline();
                }
            }
        } else {
            // Reducing to just one newline
            result.addNewline();
        }

        tokenCopyAndSpace(result, token);
        result.addContext(token.content.toUpperCase(), '');
    }

    /**
     * These statements should have a newline in front of them if
     * they are the first content on the line
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenKeywordOffsetLine(result, token) {
        result.addConditionalNewline();
        tokenCopyAndSpace(result, token);
    }

    /**
     * The variables declared in `var` should be indented.
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenKeywordVar(result, token) {
        tokenCopyAndSpace(result, token);
        result.addContext('VAR');
    }

    /**
     * Lots of minor changes:
     * - Standardizes newlines
     * - Removes trailing whitespace
     * - Starts all lines with an aligned "*"
     * - Reindents
     * - 2 blank lines before multi-line comments
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenMultiLineComment(result, token) {
        var addNewline, addSpace, str;

        // Standardize newlines into ones I prefer
        str = token.content.replace(/\r?\n|\r/g, "\n");

        // Removing closing comment tag
        str = str.replace(/\*\/$/, '');

        // Remember if there was a newline right before this tag
        addNewline = false;

        if (str.match(/\n[ \t\f]*$/)) {
            addSpace = false;
            addNewline = true;
            str = str.replace(/\n[ \t\f]*$/, '');
        } else {
            // Remember if there was a space right before the end tag
            /*jslint regexp:true*/
            addSpace = str.match(/[^ \t\f\n]([ \t\f]*)$/);
            /*jslint regexp:false*/

            if (addSpace && addSpace[1]) {
                addSpace = addSpace[1];
                str = str.substr(0, str.length - addSpace.length);
            } else {
                addSpace = false;
            }
        }

        // Remove trailing whitespace and whitespace after newlines
        str = str.replace(/[ \t\f]*\n/g, "\n").replace(/\n[ \t\f]*/g, "\n");

        // Force all lines to start with indentation + space + star + space
        str = str.replace(/\n\*/g, "\n");  // Remove stars
        /*jslint regexp:true*/
        str = str.replace(/\n([^ \n])/g, "\n $1");  // Adds a space
        /*jslint regexp:false*/
        str = str.replace(/\n/g, "\n" + result.getIndentation() + " *");  // Add star

        /*jslint regexp:true*/
        str = str.replace(/([^\* ])(\*\/)$/, '$1 $2');
        /*jslint regexp:false*/

        // Convert newlines into ones you prefer
        if (result.options.newline !== "\n") {
            str = str.replace(/\n/g, result.options.newline);
        }

        // Add closing tag back
        if (addNewline) {
            str += "\n" + result.getIndentation() + ' ';
        } else {
            // Add the spacing back
            if (addSpace) {
                str += addSpace;
            }
        }

        str += '*/';

        if (result.commentShouldHaveNewline()) {
            result.removeWhitespace();
            result.addNewline();
            result.addNewline();
            result.addNewline();
        }

        result.addFragment('BLOCK_COMMENT', str);
        result.addNewline();
    }

    /**
     * Handles what happens with close braces
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenPunctuatorBraceClose(result, token) {
        var context, extraNewline;

        // Terminate a statement if one was started
        result.removeContextForStatement();

        // Decrease indentation
        result.removeContext();
        result.removeWhitespace();
        context = result.getContextCode();
        extraNewline = false;

        if (context === 'SWITCH_BLOCK') {
            // The last context could have been from "case" or "default"
            result.removeContext();
            context = result.getContextCode();
        }

        if (context === 'CATCH' || context === 'ELSE' || context === 'FOR' || context === 'FINALLY' || context === 'FUNCTION' || context === 'IF' || context === 'SWITCH') {
            // Done with the function declaration or block of code
            result.removeContext();

            if (result.getContextCode() === 'ELSE') {
                result.removeContext();
            }

            extraNewline = true;
        }

        // If not empty, add a newline
        if (result.getText() !== '{') {
            result.addNewline();
        }

        // Add content, newline
        result.addFragment('PUNCTUATOR', token.content);
        result.addNewline();

        // If this was a function or similar, add another newline
        if (extraNewline) {
            result.addNewline();
        }
    }

    /**
     * Handles what happens after open braces
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenPunctuatorBraceOpen(result, token) {
        var context;

        context = result.getContextCode();

        // Remember some contexts so we can key off them later
        if (context === 'FOR' || context === 'FUNCTION' || context === 'SWITCH' || context === 'IF' || context === 'ELSE') {
            result.addContext(context + '_BLOCK');
        } else {
            result.addContext('BRACE');
        }

        result.addToken(token);
        result.addNewline();
    }

    /**
     * Handles what happens after closing brackets
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenPunctuatorBracketClose(result, token) {
        var lastText, prevContext;

        // Decrease indentation
        prevContext = result.removeContext();
        result.removeWhitespace();
        lastText = result.getText();

        if (prevContext.code !== 'ARRAY_INDEX' && (lastText !== '(' && lastText !== '{' && lastText !== '[')) {
            result.addNewline();
        }

        return tokenCopyAndSpace(result, token);
    }

    /**
     * Handles what happens after open brackets
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenPunctuatorBracketOpen(result, token) {
        if (result.isArrayLiteral()) {
            result.addContext('BRACKET');
            result.addToken(token);
            result.addNewline();
        } else {
            result.removeWhitespace();
            result.addContext('ARRAY_INDEX');
            result.addToken(token);
        }
    }

    /**
     * Handles colons
     *
     * Switches, ternary, object literals
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenPunctuatorColon(result, token) {
        var context, prev;

        /**
         * Returns true if the string passed in can be an identifier without
         * additional quoting
         *
         * @param {string} content
         * @return {boolean}
         */
        function canBeIdentifier(content) {
            var tokenList;

            // Reuse the tokenizer to see if the content is an identifier
            tokenList = tokenizer.tokenize(content);

            if (tokenList.length !== 1 || tokenList[0].type !== 'IDENTIFIER_NAME') {
                return false;
            }

            if (!result.options.jslint) {
                return true;
            }

            if (content.charAt(0) === '_' || content.charAt(-1) === '_') {
                return false;
            }

            return true;
        }

        context = result.getContextCode();

        if (context === 'CATCH') {
            /* This should be a keyword instead
             *
             * { catch: false }
             *
             * Remove the CATCH context
             */
            result.removeContext();
            context = result.getContextCode();
        }

        if (context === 'SWITCH_BLOCK' || context === 'CASE' || context === 'DEFAULT') {
            result.removeWhitespace();
            result.addToken(token);
            result.addNewline();

            return;
        }

        if (context !== 'TERNARY') {
            // Property name as a string or identifier
            result.removeWhitespace();

            if (result.options.quoteProperties === true) {
                // Force quotes
                if (result.getType() === 'IDENTIFIER_NAME' || result.getType() === 'KEYWORD') {
                    prev = result.removeFragment();
                    result.addFragment('STRING', convertString(result, JSON.stringify(prev.content)));
                }
            } else if (result.options.quoteProperties === false) {
                // Remove quotes when possible
                if (result.getType() === 'STRING') {
                    prev = result.getFragment().content;
                    prev = prev.substr(1, prev.length - 2);

                    if (canBeIdentifier(prev)) {
                        result.removeFragment();
                        result.addFragment('IDENTIFIER_NAME', prev);
                    }
                }
            }
        }

        return tokenCopyAndSpace(result, token);
    }

    /**
     * Pre/Post Increment/Decrement (++ and --)
     *
     * No space between the identifier and the punctuator when the
     * specific option is enabled.
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenPunctuatorIncDec(result, token) {
        function isPre() {
            var prev;

            prev = result.getPreviousNonWhitespace();

            if (!prev || prev.code !== 'IDENTIFIER_NAME') {
                return true;
            }

            return false;
        }

        if (!result.options.noSpaceWithIncDec) {
            return tokenCopyAndSpace(result, token);
        }

        if (isPre()) {
            return tokenCopy(result, token);
        }

        result.removeWhitespace();

        return tokenCopyAndSpace(result, token);
    }

    /**
     * Handles commas
     *
     * jslint only increases indentation when there is a comma
     * inside a function's argument list.
     *     test(function () {
     *         oneLevelIndent();
     *     });
     *     test2(true,
     *         function () {
     *             twoLevelIndent();
     *         });
     *
     * In order to attach to the previous token, no whitespace before this one.
     *
     * Add newline if we are not in a var / function's context.
     *
     *     {
     *         a: a,
     *         b: b
     *     }
     *
     *     return a(),
     *         b;
     *
     * No newline sometimes (var / function call)
     *
     *     var a, b;
     *
     *     a(b, c);
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenPunctuatorComma(result, token) {
        var context;

        result.removeWhitespace();
        context = result.getContextCode();

        if (context === 'TERNARY') {
            result.removeContext();
            context = result.getContextCode();
        }

        result.addToken(token);

        if (context === 'FUNCTION_ARGS') {
            /* This is the first comma seen in a function call.  It sets a
             * new context that can be used for indentation on other things
             * for jslint-compatible formatting.
             */
            result.addContext('FUNCTION_ARGS_COMMA', '');
            result.addSpace();
        } else if (context === 'FUNCTION_ARGS_COMMA' || context === 'VAR' || context === 'FOR_CONDITION') {
            /* Only add a space for "var" and "for"
             *
             * var a, b, c;
             *
             * for (a = 1, b = 2; ...
             *
             * x(1, 2)
             */
            result.addSpace();
        } else if (context === 'BRACE' || context === 'BRACKET') {
            /* Add newlines inside arrays and objects
             *
             * x = [
             *     1,
             *     2
             * ];
             *
             * x = {
             *     a: 1,
             *     b: 2
             * };
             */
            result.addNewline();
        } else {
            /* Merging multiple lines onto one, typically from a minifier
             *
             * return a = f(),
             *     a[1] = 123,
             *     a;
             */
            result.addContext('COMMA_OPERATOR');
            result.addNewline();
            result.removeContext('COMMA_OPERATOR');
        }
    }

    /**
     * Handles what happens after closing parenthesis
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenPunctuatorParenthesisClose(result, token) {
        result.removeContextForStatement();

        if (result.getContextCode() === 'FUNCTION_ARGS_COMMA') {
            result.removeContext();
        }

        result.removeContext();
        result.removeWhitespace();

        return tokenCopyAndSpace(result, token);
    }

    /**
     * Handles what happens after open parenthesis
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenPunctuatorParenthesisOpen(result, token) {
        var context, prev;

        prev = result.getPreviousNonWhitespace();

        if (!prev) {
            result.addContext('PAREN', '');
        } else if (prev.code === 'IDENTIFIER_NAME' || prev.content === '}' || prev.content === ')' || prev.content === ']') {
            // someFunction(
            // function something() {}(
            // (function () {})(
            // methods[x](
            result.removeWhitespace();
            result.addContext('FUNCTION_ARGS', '');
        } else if (prev.content === 'function') {
            // function (
            if (result.options.noSpaceAfterFunction) {
                result.removeWhitespace();
            }

            result.addContext('FUNCTION_ARGS', '');
        } else {
            context = result.getContextCode();

            if (context === 'IF') {
                // if (
                if (result.options.noSpaceAfterIf) {
                    result.removeWhitespace();
                }

                result.addContext('IF_CONDITION');
            } else if (context === 'FOR') {
                // for (
                if (result.options.noSpaceAfterFor) {
                    result.removeWhitespace();
                }

                result.addContext('FOR_CONDITION', '');
            } else {
                // This function can only be called for "function",
                // "for", "if" and "switch".  This needs to be "switch".
                if (result.options.noSpaceAfterSwitch) {
                    result.removeWhitespace();
                }

                result.addContext('PAREN', '');
            }
        }

        // No space after open parenthesis
        result.addToken(token);
    }

    /**
     * Handles periods
     *
     * Attach to the content before and after.
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenPunctuatorPeriod(result, token) {
        result.removeWhitespace();
        result.addToken(token);
    }

    /**
     * Plus and Minus
     *
     * No space following the plus or minus if we are doing type conversion.
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenPunctuatorPlusMinus(result, token) {
        var isTypeConversion;

        // Check if this is type conversion before adding the symbol
        isTypeConversion = result.isTypeConversion();
        result.addToken(token);

        if (!isTypeConversion) {
            result.addSpace();
        }
    }

    /**
     * Handles question marks, a ternary operation
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenPunctuatorQuestion(result, token) {
        result.addContext('TERNARY', '');
        result.addToken(token);
        result.addSpace();
    }

    /**
     * Adds a semicolon and newline
     *
     * Do not use the token content here because it may be an implicit
     * semicolon, which does not have content.
     *
     * Extra newlines after a "var" statement and after a "use strict".
     *
     * @param {prettyJs~Result} result
     */
    function tokenSemicolon(result) {
        var oldContext, previousText;

        function needsTwoNewlines() {
            if (oldContext === 'VAR') {
                // var a, b, c;
                return true;
            }

            if (previousText === '"use strict"' || previousText === "'use strict'") {
                // "use strict";
                // 'use strict';
                return true;
            }

            return false;
        }

        oldContext = result.getContextCode();
        result.removeContextForStatement();
        result.removeWhitespace();
        previousText = result.getText();
        result.addFragment('SEMICOLON', ';');  // Do not use token.content here

        if (result.getContextCode() === 'FOR_CONDITION') {
            // for (a = 1;
            // for (a = 1; a < b;
            result.addSpace();
        } else {
            if (needsTwoNewlines()) {
                result.addNewline();
            }

            result.addNewline();
        }
    }

    /**
     * Skips the addition of a token to the result
     */
    function tokenSkip() {
        return undefined;
    }

    /**
     * If the comment had no prior content on the line, then check if the
     * the comment should have a newline.  If so, wipe out the whitespace
     * and add a couple of newlines.  If there was content already on the
     * line, remove whitespace and add the commentSpace before the comment.
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     * @param {number} index
     * @param {Array.<complexionJs~ComplexionJsToken>} tokenList
     */
    function tokenSingleLineComment(result, token, index, tokenList) {
        var str;

        /**
         * Detect if the comment was originally on the same line as
         * some code.
         *
         * @return {boolean}
         */
        function originallyOnSameLine() {
            var check;

            while (index) {
                index -= 1;
                check = tokenList[index].type;

                if (check === 'LINE_TERMINATOR') {
                    return false;
                }

                if (check !== 'WHITESPACE') {
                    /**
                     * Check the content to see if a newline would make sense
                     * in this situation.
                     */
                    check = tokenList[index].content;

                    if (check === '{' || check === '[') {
                        return false;
                    }

                    return true;
                }
            }
        }

        // Remove trailing whitespace
        str = token.content.replace(/ [\t\f]*\n/g, result.options.newline);

        if (originallyOnSameLine() || !result.lastWasNewline()) {
            result.removeWhitespace();
            result.addFragment('COMMENT_WHITESPACE', result.options.commentSpace);
            result.addFragment('STATEMENT_COMMENT', str);
        } else {
            if (result.commentShouldHaveNewline(index, tokenList)) {
                result.removeWhitespace();
                result.addNewline();
                result.addNewline();
            }

            result.addFragment('LINE_COMMENT', str);
        }

        result.addNewline();
    }

    /**
     * Processes a string and may convert the string to single or double
     * quotes.
     *
     * @param {prettyJs~Result} result
     * @param {complexionJs~ComplexionJsToken} token
     */
    function tokenString(result, token) {
        var str;

        str = convertString(result, token.content);
        result.addFragment('STRING', str);
        result.addSpace();
    }

    // Initialize a new tokenizer with the default options
    tokenizer = new Complexion();
    complexionJs(tokenizer);
    keywordContentProcessors = {
        'case': tokenKeywordCase,
        'catch': tokenKeywordElse,
        'default': tokenKeywordCase,
        'else': tokenKeywordElse,
        'finally': tokenKeywordElse,
        'for': tokenKeywordControlFlow,
        'function': tokenKeywordControlFlow,
        'if': tokenKeywordControlFlow,
        'return': tokenKeywordOffsetLine,
        'switch': tokenKeywordControlFlow,
        'throw': tokenKeywordOffsetLine,
        'try': tokenKeywordOffsetLine,
        'var': tokenKeywordVar,
        'while': tokenKeywordOffsetLine
    };
    punctuatorContentProcessors = {
        '{': tokenPunctuatorBraceOpen,
        '}': tokenPunctuatorBraceClose,
        '[': tokenPunctuatorBracketOpen,
        ']': tokenPunctuatorBracketClose,
        '(': tokenPunctuatorParenthesisOpen,
        ')': tokenPunctuatorParenthesisClose,
        '.': tokenPunctuatorPeriod,
        ';': tokenSemicolon,
        ',': tokenPunctuatorComma,
        ':': tokenPunctuatorColon,
        '+': tokenPunctuatorPlusMinus,
        '-': tokenPunctuatorPlusMinus,
        '++': tokenPunctuatorIncDec,
        '--': tokenPunctuatorIncDec,
        '!': tokenCopy,
        '?': tokenPunctuatorQuestion
    };
    processors = {
        BOM: tokenBom,
        BOOLEAN_LITERAL: tokenCopyAndSpace,
        IDENTIFIER_NAME: tokenCopyAndSpace,
        IMPLICIT_SEMICOLON: tokenSemicolon,
        KEYWORD: processByContent(keywordContentProcessors, tokenCopyAndSpace),
        LINE_TERMINATOR: tokenSkip,  // Other rules manage all spaces
        MULTI_LINE_COMMENT: tokenMultiLineComment,
        NULL_LITERAL: tokenCopyAndSpace,
        NUMERIC_LITERAL: tokenCopyAndSpace,
        PUNCTUATOR: processByContent(punctuatorContentProcessors, tokenCopyAndSpace),
        REGULAR_EXPRESSION_LITERAL: tokenCopyAndSpace,
        SHEBANG: tokenCopyAndNewline,
        SINGLE_LINE_COMMENT: tokenSingleLineComment,
        STRING_LITERAL: tokenString,
        WHITESPACE: tokenSkip  // Other rules manage all whitespace
    };

    return function (str, options) {
        var result, tokenList;

        options = initializeOptions(options);
        tokenList = tokenizer.tokenize(str);
        result = new Result(options);

        if (options.bom === true) {
            // See tokenBom for why this always adds a new token
            result.addFragment("BOM", "\ufeff");
        }

        // Set a placeholder for a zero-length indentation
        result.addFragment('INDENT', result.getIndentation());
        tokenList.forEach(function (token, index) {
            processToken(result, token, index, tokenList);
        });
        result.removeWhitespace();

        if (options.trailingNewline === true) {
            result.addNewline();
        }

        return result.toString();
    };

    // fid-umd post
}));
// fid-umd post-end

},{"complexion":4,"complexion-js":3}],3:[function(require,module,exports){
/**
 * JavaScript matchers for parsing text with Complexion.
 *
 * Usage:
 *
 * var complexion, jsPlugin;
 * complexion = require('complexion');
 * jsPlugin = require('complexion-js');
 * complexion.initialize(jsPlugin());
 */
// fid-umd {"jslint":1,"name":"complexionJs"}
/*global define, exports, module, YUI*/
(function (n, r, f) {
    "use strict";
    try { module.exports = f(); return; } catch (ignore) {}
    try { exports[n] = f(); return; } catch (ignore) {}
    try { return define.amd && define(n, [], f); } catch (ignore) {}
    try { return YUI.add(n, function (Y) { Y[n] = f(); }); } catch (ignore) {}
    try { r[n] = f(); return; } catch (ignore) {}
    throw new Error("Unable to export " + n);
}("complexionJs", this, function () {
    "use strict";
    // fid-umd end

    /**
     * JavaScript token object
     *
     * This intentionally does not include the standard object boilerplate
     * in order to maximize speed.  That means you won't execute this code
     * hundreds of thousands of times:
     *
     *     if (!(this instanceof ComplexionJsToken)) {
     *         return new ComplexionJsToken(token);
     *     }
     *
     * Make sure that you use the 'new' keyword.
     *
     * @class ComplexionJsToken
     * @param {Complexion~token} token
     */
    function ComplexionJsToken(token) {
        this.line = token.line;
        this.col = token.col;
        this.offset = token.offset;
        this.type = token.type;
        this.content = token.content;
    }

    /**
     * Return true if the token's type matches any of the token types passed in.
     *
     * @param {Array.<string>} tokenTypes
     * @return {boolean}
     */
    ComplexionJsToken.prototype.isAnyType = function (tokenTypes) {
        var i, len;

        len = tokenTypes.length;

        for (i = 0; i < len; i += 1) {
            if (this.type === tokenTypes[i]) {
                return true;
            }
        }

        return false;
    };

    /**
     * Returns true if the current token matches the passed in string.
     *
     * @param {string} tokenType
     * @return {boolean}
     */
    ComplexionJsToken.prototype.isType = function (tokenType) {
        return this.type === tokenType;
    };

    /**
     * Returns true if the token should be considered whitespace or any
     * other unimportant token (with regard to parsing and interpretation)
     * by the specification.
     *
     * @return {boolean}
     */
    ComplexionJsToken.prototype.isUnimportant = function () {
        var type;

        type = this.type;

        if (type === 'BOM' || type === 'LINE_TERMINATOR' || type === 'MULTI_LINE_COMMENT' || type === 'SINGLE_LINE_COMMENT' || type === 'WHITESPACE') {
            return true;
        }

        return false;
    };

    /**
     * Returns true if a character is within the range allowed for hexadecimal
     *
     * @param {string} c
     * @return {boolean}
     */
    function isHex(c) {
        return ((c >= '0' && c <= '9') || (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f'));
    }

    /**
     * Matches a single character that can continue an identifier.
     *
     * This has the same deficiencies as identifierStart() plus more.
     * It should also match the Unicode "Non-spacing mark", "Combining
     * spacing mark", "Decimal number" and "Connector punctuation".
     *
     * @param {string} str
     * @param {number} offset
     */
    function identifierChar(str, offset) {
        var c;

        c = str.charAt(offset);

        // Unicode characters are ZWNJ and ZWJ
        if ((c >= '0' && c <= '9') || c === '$' || (c >= 'A' && c <= 'Z') || c === '_' || (c >= 'a' && c <= 'z') || c === '\u200c' || c === '\u200d') {
            return c;
        }

        // Unicode
        if (c === '\\' && str.charAt(offset + 1) === 'u' && isHex(str.charAt(offset + 2)) && isHex(str.charAt(offset + 3)) && isHex(str.charAt(offset + 4)) && isHex(str.charAt(offset + 5))) {
            return str.substr(offset, 6);
        }

        return null;
    }

    /**
     * Matches a single character that can start an identifier.
     *
     * It should also match any character in the Unicode categories
     * "Uppercase letter", "Lowercase letter", "Titlecase letter",
     * "Modifier letter", "Other letter" or "Letter number"
     *
     * @param {string} str
     * @param {number} offset
     */
    function identifierStart(str, offset) {
        var c;

        c = str.charAt(offset);

        if (c === '$' || (c >= 'A' && c <= 'Z') || c === '_' || (c >= 'a' && c <= 'z')) {
            return c;
        }

        // Unicode
        if (c === '\\' && str.charAt(offset + 1) === 'u' && isHex(str.charAt(offset + 2)) && isHex(str.charAt(offset + 3)) && isHex(str.charAt(offset + 4)) && isHex(str.charAt(offset + 5))) {
            return str.substr(offset, 6);
        }

        return null;
    }

    /**
     * Returns true if a character is a line terminator.
     *
     * Matches LF, CR, LS, PS.
     *
     * @param {string} c
     * @return {boolean}
     */
    function isLineTerminator(c) {
        return c === '\n' || c === '\r' || c === '\u2028' || c === '\u2029';
    }

    /**
     * Returns the last token which is not whitespace
     *
     * @param {Array.<ComplexionJsToken>}
     * @return {ComplexionJsToken|null}
     */
    function lastTokenNonWhitespace(tokenList) {
        var index;

        index = tokenList.length - 1;

        while (index >= 0) {
            if (!tokenList[index].isUnimportant()) {
                return tokenList[index];
            }

            index -= 1;
        }

        return null;
    }

    /**
     * Return true if a regular expression is allowed at this point.
     * At some points the / should be a divide and at others it should
     * be a regular expression.
     *
     * @param {Array.<Object>} tokenList
     * @return {boolean}
     */
    function isRegexpAllowed(tokenList) {
        var token;

        /**
         * Return true if a regular expression is allowed after a
         * particular punctuator.
         *
         * @param {string} content Punctuator's content
         * @return {boolean}
         */
        function isAllowedPunctuator(content) {
            return content === '(' // x(/regexp/)
                || content === '{' // function () {/regexp/.test()}
                || content === '[' // [/regexp/]
                || content === ',' // x(1,/regexp/)
                || content === '+' // RegExp(/x/.source+/y/)
                || content === '?' // x?/regexp/:/regexp/
                || content === ':' // {x:/regexp/}
                || content === ';' // x();/regexp/.test()
                || content === '=' // x=/regexp/
                || content === '==' // x==/regexp/
                || content === '===' // x===/regexp/
                || content === '!' // !/regexp/.match(x)
                || content === '!=' // x!=/regexp/
                || content === '!==' // x!==/regexp/
                || content === '&&' // x&&/regexp/.match(y)
                || content === '||'; // x||/regexp/.match(y)
        }

        token = lastTokenNonWhitespace(tokenList);

        if (token) {
            if (token.isAnyType([
                    'IDENTIFIER_NAME',
                    'NUMERIC_LITERAL'
                ])) {
                return false;
            }

            if (token.isType('KEYWORD')) {
                if (token.content === 'return') {
                    return true;
                }

                return false;
            }

            if (token.isType('PUNCTUATOR')) {
                return isAllowedPunctuator(token.content);
            }
        }

        return true;
    }

    /**
     * Matches the byte order mark
     *
     * Only matches this if it is at the beginning of a file.
     *
     * @param {Complexion} complexion
     * @return {Complexion~matcher}
     */
    function matchBom(complexion) {
        return complexion.matchString("\ufeff", function (str, offset) {
            /*jslint unparam: true*/

            if (offset) {
                return null;
            }

            return "\ufeff";
        });
    }

    /**
     * Matches just "true" or "false"
     *
     * @param {Complexion} complexion
     * @param {Object} state
     * @return {Complexion~matcher}
     */
    function matchBooleanLiteral(complexion, state) {
        /*jslint unparam:true*/
        return function () {
            var content;

            content = state.keywordFromIdentifierName;

            if (content === 'true' || content === 'false') {
                state.keywordFromIdentifierName = null;
                return content;
            }

            return null;
        };
    }

    /**
     * Matches an identifier name
     *
     * The trickier part is that this could match keywords, so we use the
     * state object to be able to pass information to a mostly dummy matcher
     * for keywords.
     *
     * @param {Complexion} complexion
     * @param {Object} state
     * @return {Complexion~matcher}
     */
    function matchIdentifierName(complexion, state) {
        /*jslint unparam:true*/
        var keywordsToAvoid;

        keywordsToAvoid = {
            "break": true,
            "case": true,
            "catch": true,
            "continue": true,
            "debugger": true,
            "default": true,
            "delete": true,
            "do": true,
            "else": true,
            "false": true,  // Boolean literal
            "finally": true,
            "for": true,
            "function": true,
            "if": true,
            "in": true,
            "instanceof": true,
            "new": true,
            "null": true,  // Null literal
            "return": true,
            "switch": true,
            "this": true,
            "throw": true,
            "true": true,  // Boolean literal
            "try": true,
            "typeof": true,
            "var": true,
            "void": true,
            "while": true,
            "with": true,

            // Future reserved words (non-strict mode)
            "class": true,
            "const": true,
            "enum": true,
            "export": true,
            "extends": true,
            "import": true,
            "super": true,

            // Future reserved words (strict mode)
            "implements": true,
            "interface": true,
            "let": true,
            "package": true,
            "private": true,
            "protected": true,
            "public": true,
            "static": true,
            "yield": true
        };

        return function (str, offset) {
            var match, more;

            match = identifierStart(str, offset);

            if (!match) {
                return null;
            }

            more = identifierChar(str, offset + match.length);

            while (more) {
                match += more;
                more = identifierChar(str, offset + match.length);
            }

            if (keywordsToAvoid.hasOwnProperty(match)) {
                state.keywordFromIdentifierName = match;
                return null;
            }

            return match;
        };
    }

    /**
     * Adds an implicit semicolon to the list of tokens.
     *
     * It has no content but indicates that there should be a semicolon here.
     *
     * @param {Complexion} complexion
     * @param {Object} state
     * @return {Complexion~matcher}
     */
    function matchImplicitSemicolon(complexion, state) {
        /*jslint unparam:true*/
        return function () {
            if (state.implicitSemicolonFlag) {
                state.implicitSemicolonFlag = false;
                return '';
            }

            return null;
        };
    }

    /**
     * Matches keywords
     *
     * Detection is done by matchIdentifierName.  This only uses the state
     * information to place a keyword token on the stack.
     *
     * @param {Complexion} complexion
     * @param {Object} state
     * @return {Complexion~matcher}
     */
    function matchKeyword(complexion, state) {
        /*jslint unparam:true*/
        return function () {
            var content;

            content = state.keywordFromIdentifierName;

            if (content && content !== 'true' && content !== 'false' && content !== 'null') {
                state.keywordFromIdentifierName = null;
                return content;
            }

            return null;
        };
    }

    /**
     * Matches a line terminator
     *
     * Instead of matching just a line terminator, we need to peek backwards
     * and check if the line needs an implicit semicolon.  When it does,
     * insert the implicit semicolon instead of the newline at this time.
     *
     * @param {Complexion} complexion
     * @param {Object} state
     * @return {Complexion~matcher}
     */
    function matchLineTerminator(complexion, state) {
        /*jslint unparam:true*/

        /**
         * Returns a line terminator from str.  This could be a \n,
         * \r, or \r\n.
         *
         * @param {string} str
         * @param {number} offset
         * @return {Complexion~matcher}
         */
        function lineTerminator(str, offset) {
            var c;

            c = str.charAt(offset);

            if (c === "\n" || c === "\u2028" || c === "\u2029") {
                return c;
            }

            if (c === "\r") {
                if (str.charAt(offset + 1) === "\n") {
                    return "\r\n";
                }

                return c;
            }

            return null;
        }

        return function (str, offset, tokenList) {
            var content, newline, previousToken;

            newline = lineTerminator(str, offset);

            if (!newline) {
                return null;
            }

            previousToken = lastTokenNonWhitespace(tokenList);

            if (previousToken && previousToken.isType('KEYWORD')) {
                content = previousToken.content;

                if (content === 'break' || content === 'continue' || content === 'return' || content === 'throw') {
                    state.implicitSemicolonFlag = true;
                    return null;
                }
            }

            return newline;
        };
    }

    /**
     * Matches a multi-line comment
     *
     * @return {Complexion~matcher}
     */
    function matchMultiLineComment(complexion) {
        return complexion.matchString('/*', function (str, offset) {
            var c, len;

            len = 2;
            c = str.charAt(offset + len);

            while (c) {
                while (c && c !== '*') {
                    len += 1;
                    c = str.charAt(offset + len);
                }

                if (c === '*') {
                    len += 1;
                    c = str.charAt(offset + len);

                    if (c === '/') {
                        return str.substr(offset, len + 1);
                    }
                }
            }

            return null;
        });
    }

    /**
     * Matches just "null"
     *
     * @param {Complexion} complexion
     * @param {Object} state
     * @return {Complexion~matcher}
     */
    function matchNullLiteral(complexion, state) {
        /*jslint unparam:true*/
        return function () {
            var content;

            content = state.keywordFromIdentifierName;

            if (content === 'null') {
                state.keywordFromIdentifierName = null;
                return content;
            }

            return null;
        };
    }

    /**
     * Matches numeric literals
     *
     * This matches hex and decimal.  Octal is matched because decimal is
     * matched.  It is the responsibility of the consumer to determine if
     * a number is octal.
     *
     * @param {Complexion} complexion Unused
     * @param {Object} state Unused
     * @return {Complexion~matcher}
     */
    function matchNumericLiteral(complexion, state) {
        /*jslint unparam:true*/

        /**
         * Matches a decimal
         *
         * @param {string} str
         * @param {number} offset
         * @return {Complexion~matcher}
         */
        function decimal(str, offset) {
            var c, efound, elen, len, minLen;

            len = 0;
            c = str.charAt(offset);
            minLen = 1;

            while (c >= '0' && c <= '9') {
                len += 1;
                c = str.charAt(offset + len);
            }

            if (c === '.') {
                minLen += 1;
                len += 1;
                c = str.charAt(offset + len);

                while (c >= '0' && c <= '9') {
                    len += 1;
                    c = str.charAt(offset + len);
                }
            }

            if (len < minLen) {
                return null;
            }

            if (c === 'E' || c === 'e') {
                elen = 1;
                efound = false;
                c = str.charAt(offset + len + elen);

                if (c === '+' || c === '-') {
                    elen += 1;
                    c = str.charAt(offset + len + elen);
                }

                while (c >= '0' && c <= '9') {
                    elen += 1;
                    efound = true;
                    c = str.charAt(offset + len + elen);
                }

                if (efound) {
                    return str.substr(offset, len + elen);
                }
            }

            return str.substr(offset, len);
        }

        /**
         * The first character has already been tested and is a zero.
         *
         * @param {string} str
         * @param {number} offset Still pointing at the '0'
         * @return {Complexion~matcher}
         */
        function hex(str, offset) {
            var c, len;

            c = str.charAt(offset + 1);

            if (c !== 'x' && c !== 'X') {
                return null;
            }

            len = 2;
            c = str.charAt(offset + len);

            while (isHex(c)) {
                len += 1;
                c = str.charAt(offset + len);
            }

            if (len >= 3) {
                return str.substr(offset, len);
            }

            return null;
        }

        return function (str, offset) {
            if (str.charAt(offset) === '0') {
                // Hex must start with zero
                return hex(str, offset) || decimal(str, offset);
            }

            return decimal(str, offset);
        };
    }

    /**
     * Matches a punctuator
     *
     * @param {Complexion} complexion
     * @param {Object} state
     * @return {Complexion~matcher}
     */
    function matchPunctuator(complexion, state) {
        /*jslint unparam:true*/

        var hash;

        /**
         * Returns true if the first token encountered before a given index
         * (excluding whitespace) is NOT a semicolon.
         *
         * @param {Array.<Object>} tokenList
         * @param {number} index
         * @return {boolean}
         */
        function isMissingSemicolon(tokenList, index) {
            var token;

            while (index > 0) {
                index -= 1;
                token = tokenList[index];

                if (token.content === ';') {
                    return false;
                }

                if (!token.isUnimportant()) {
                    return true;
                }
            }

            return true;
        }

        /**
         * Returns true if the statement before the punctuator requires an
         * implicit semicolon.
         *
         * @param {Array.<Object>} tokenList
         * @return {boolean}
         */
        function needsImplicitSemicolon(tokenList) {
            var index, token;

            index = tokenList.length - 1;

            while (index >= 0) {
                token = tokenList[index];

                if (token.isType('LINE_TERMINATOR')) {
                    return isMissingSemicolon(tokenList, index);
                }

                if (!token.isUnimportant()) {
                    return false;
                }

                index -= 1;
            }

            return false;
        }

        hash = {
            '^': '^',
            '^=': '^=',
            '~': '~',
            '<<': '<<',
            '<<=': '<<=',
            '<': '<',
            '<=': '<=',
            '=': '=',
            '==': '==',
            '===': '===',
            '>': '>',
            '>=': '>=',
            '>>': '>>',
            '>>=': '>>=',
            '>>>': '>>>',
            '>>>=': '>>>=',
            '|': '|',
            '|=': '|=',
            '||': '||',
            '-': '-',
            '-=': '-=',
            '--': '--',
            '---': '---',
            ',': ',',
            ';': ';',
            ':': ':',
            '!': '!',
            '!=': '!=',
            '!==': '!==',
            '?': '?',
            '/': '/',
            '/=': '/=',
            '.': '.',
            '(': '(',
            ')': ')',
            '[': '[',
            ']': ']',
            '{': '{',
            '}': '}',
            '*': '*',
            '*=': '*=',
            '&': '&',
            '&=': '&=',
            '&&': '&&',
            '%': '%',
            '%=': '%=',
            '+': '+',
            '+=': '+=',
            '++': '++'
        };

        return function (str, offset, tokenList) {
            var c, match, nextChar;

            c = str.charAt(offset);

            // All multi-character punctuators start with a character that
            // can be a punctuator by itself
            if (!hash[c]) {
                return null;
            }

            match = hash[str.substr(offset, 4)] || hash[str.substr(offset, 3)] || hash[str.substr(offset, 2)] || c;

            if (match === '++' || match === '--') {
                // When starting a line, these should act as preincrement
                if (needsImplicitSemicolon(tokenList)) {
                    state.implicitSemicolonFlag = true;

                    return null;
                }
            } else if (match === '/') {
                nextChar = str.charAt(offset + 1);

                // These should be comments
                if (nextChar === '/' || nextChar === '*') {
                    return null;
                }

                // These should be regular expressions
                if (isRegexpAllowed(tokenList)) {
                    return null;
                }
            } else if (match === '/=') {
                if (isRegexpAllowed(tokenList)) {
                    return null;
                }
            }

            return match;
        };
    }

    /**
     * Matches a regular expression.
     *
     * @return {Complexion~matcher}
     */
    function matchRegularExpressionLiteral() {
        /**
         * Matches a non-terminator character or nothing.  Does not match
         * escape sequences.
         *
         * @param {string} str
         * @param {number} offset
         * @return {Complexion~matcher}
         */
        function matchNonTerminator(str, offset) {
            var c;

            c = str.charAt(offset);

            if (c && !isLineTerminator(c)) {
                return c;
            }

            return null;
        }

        /**
         * When encountering a backslash, returns the number of characters in
         * the backslash sequence.  Should almost always return 2, but will
         * not if either the first character is not a backslash nor if there
         * is no second character.
         *
         * @param {string} str
         * @param {number} offset
         * @return {number}
         */
        function matchBackslashSequenceLen(str, offset) {
            var c;

            c = str.charAt(offset);

            if (c !== '\\') {
                return 0;
            }

            c = matchNonTerminator(str, offset + 1);

            if (c) {
                return 2;
            }

            return 0;
        }

        /**
         * Matches a regular expression class expression.  It starts with
         * [ and ends when a matching ] is found.  Handles backslash sequences.
         *
         * @param {string} str
         * @param {number} offset
         * @return {number}
         */
        function matchClassLen(str, offset) {
            var c, len;

            function getChar() {
                var next;

                next = matchNonTerminator(str, offset + len);

                if (next === '\\') {
                    return matchBackslashSequenceLen(str, offset + len);
                }

                if (!next || next === ']') {
                    return 0;
                }

                return 1;
            }

            c = str.charAt(offset);

            if (c !== '[') {
                return 0;
            }

            len = 1;
            c = getChar();

            while (c) {
                len += c;
                c = getChar();
            }

            if (str.charAt(offset + len) !== ']') {
                return 0;
            }

            return len;
        }

        /**
         * Matches just the first character in a regular expression.
         * Identical to matchCharLen() except '*' is also not allowed.
         *
         * @param {string} str
         * @param {number} offset
         * @return {number}
         */
        function matchStartLen(str, offset) {
            var c;

            c = matchNonTerminator(str, offset);

            if (!c) {
                return 0;
            }

            if (c !== '*' && c !== '\\' && c !== '/' && c !== '[') {
                return c.length;
            }

            return matchBackslashSequenceLen(str, offset) || matchClassLen(str, offset);
        }

        /**
         * Matches a single character or a sequence of characters in a
         * regular expression.
         *
         * @param {string} str
         * @param {number} offset
         * @return {number}
         */
        function matchCharLen(str, offset) {
            var c;

            c = matchNonTerminator(str, offset);

            if (!c) {
                return 0;
            }

            if (c !== '\\' && c !== '/' && c !== '[') {
                return c.length;
            }

            return matchBackslashSequenceLen(str, offset) || matchClassLen(str, offset);
        }

        /**
         * Matches the length of the body of the regular expression
         *
         * /body/flags
         *  ^^^^
         *  Just four characters in the above regexp.
         *
         * @param {string} str
         * @param {number} offset
         * @return {number}
         */
        function matchBodyLen(str, offset) {
            var len, more;

            len = matchStartLen(str, offset);

            if (!len) {
                return 0;
            }

            more = matchCharLen(str, offset + len);

            while (more) {
                len += more;
                more = matchCharLen(str, offset + len);
            }

            return len;
        }

        return function (str, offset) {
            var bodyLen, len, identifier;

            if (str.charAt(offset) !== '/') {
                return null;
            }

            bodyLen = matchBodyLen(str, offset + 1);

            if (!bodyLen) {
                return null;
            }

            len = bodyLen + 1;  // +1 for the slash at the beginning

            if (str.charAt(offset + len) !== '/') {
                return null;
            }

            len += 1;
            identifier = identifierChar(str, offset + len);

            while (identifier) {
                len += identifier.length;
                identifier = identifierChar(str, offset + len);
            }

            return str.substr(offset, len);
        };
    }

    /**
     * Matches a shebang (eg. "#!/usr/bin/env node") at the start of a file
     *
     * Not part of JavaScript but interpreters sometimes allow it for
     * shell scripts.
     *
     * @param {Complexion} complexion
     * @return {Complexion~matcher}
     */
    function matchShebang(complexion) {
        return complexion.matchString("#!", function (str, offset, tokenList) {
            var c, s;

            if (offset !== 0 && (tokenList.length !== 1 && !tokenList[0].isType('BOM'))) {
                // Not at the beginning of the file
                return null;
            }

            s = str.substr(offset, 2);
            c = str.charAt(offset + s.length);

            while (c !== "\r" && c !== "\n") {
                s += c;
                c = str.charAt(offset + s.length);
            }

            return s;
        });
    }

    /**
     * Matches a single-line comment
     *
     * @return {Complexion~matcher}
     */
    function matchSingleLineComment(complexion) {
        return complexion.matchString('//', function (str, offset) {
            var c, len;

            len = 2;
            c = str.charAt(offset + len);

            while (c && !isLineTerminator(c)) {
                len += 1;
                c = str.charAt(offset + len);
            }

            return str.substr(offset, len);
        });
    }

    /**
     * Matches a string literal
     *
     * @return {Complexion~matcher}
     */
    function matchStringLiteral() {
        function movePastEscape(str, offset) {
            var c;

            c = str.charAt(offset);

            // You can't escape a line terminator
            if (isLineTerminator(c)) {
                return 0;
            }

            if (c >= '4' && c <= '7') {
                // Octal numbers that can only be two digits
                c = str.charAt(offset + 1);

                if (c >= '0' && c <= '7') {
                    return 2;
                }
            } else if (c >= '0' && c <= '3') {
                // Octal numbers that can be three digits
                c = str.charAt(offset + 1);

                if (c >= '0' && c <= '7') {
                    c = str.charAt(offset + 2);

                    if (c >= '0' && c <= '7') {
                        return 3;
                    }

                    return 2;
                }
            } else if (c === 'x') {
                // Hex
                if (isHex(str.charAt(offset + 1)) && isHex(str.charAt(offset + 2))) {
                    return 3;
                }
            } else if (c === 'u') {
                // Unicode
                if (isHex(str.charAt(offset + 1)) && isHex(str.charAt(offset + 2)) && isHex(str.charAt(offset + 3)) && isHex(str.charAt(offset + 4))) {
                    return 5;
                }
            }

            // We are just escaping a single character
            return 1;
        }

        return function (str, offset) {
            var c, len, quote;

            quote = str.charAt(offset);

            // It must start with single or double quotes
            if (quote !== '"' && quote !== "'") {
                return null;
            }

            len = 1;
            c = str.charAt(offset + len);

            // Strings must not contain CR, LF, LS, nor PS
            while (c && c !== quote && !isLineTerminator(c)) {
                len += 1;

                if (c === "\\") {
                    len += movePastEscape(str, offset + len);
                }

                c = str.charAt(offset + len);
            }

            if (c !== quote) {
                return null;
            }

            return str.substr(offset, len + 1);
        };
    }


    /**
     * Matches any character
     *
     * @param {Complexion} complexion
     * @return {Complexion~matcher}
     */
    function matchUnknown(complexion) {
        return complexion.matchAny();
    }

    /**
     * Matches whitespace
     *
     * Does not match "category Zs" from the spec, which are other Unicode
     * space separators.  They don't happen often, so let me know if this
     * affects you at all.
     *
     * Whitespace typically contains BOM as well, but that only should match
     * at the beginning of the file and has been split into a separate
     * token type.  Same thing for line breaks because there is special
     * rules regarding implicit semicolons and line breaks.
     *
     * @return {Complexion~matcher}
     */
    function matchWhitespace() {
        var formFeed, nonBreakingSpace, space, tab, verticalTab;

        tab = "\t";
        verticalTab = String.fromCharCode(0x0b);
        formFeed = String.fromCharCode(0x0c);
        space = " ";
        nonBreakingSpace = String.fromCharCode(0xa0);

        return function (str, offset) {
            var c, len;

            c = str.charAt(offset);
            len = 0;

            while (c === tab || c === verticalTab || c === formFeed || c === space || c === nonBreakingSpace) {
                len += 1;
                c = str.charAt(offset + len);
            }

            if (len) {
                return str.substr(offset, len);
            }

            return null;
        };
    }

    /**
     * Keywords should be identifiers when immediately after a period
     * punctuator.  Eg:
     *
     * this.default = {  // Identifier
     *     return: function () {}  // Still keyword but used as a property name
     * };
     *
     * @param {Array.<Object>} tokenList List of tokens
     */
    function turnKeywordsIntoIdentifiers(tokenList) {
        var i, maxI;

        function getImportant(increment) {
            var j, type;

            j = i + increment;

            while (tokenList[j]) {
                type = tokenList[j].type;

                if (type !== 'WHITESPACE' && type !== 'LINE_TERMINATOR' && type !== 'SINGLE_LINE_COMMENT' && type !== 'MULTI_LINE_COMMENT') {
                    return tokenList[j];
                }

                j += increment;
            }

            return null;
        }

        function checkAndConvertToIdentifier(token) {
            var previous;

            previous = getImportant(-1);

            if (previous && previous.content === '.') {
                token.type = 'IDENTIFIER_NAME';
            }
        }

        for (i = 0, maxI = tokenList.length; i < maxI; i += 1) {
            if (tokenList[i].type === 'KEYWORD') {
                checkAndConvertToIdentifier(tokenList[i]);
            }
        }

        return tokenList;  // Delete this line
    }

    /**
     * Callback for configuring a Complexion instance
     *
     * @param {Complexion} complexion
     * @param {Object} config
     */
    return function (complexion, config) {
        var state;

        function add(tokenName, matchGenerator) {
            complexion.defineToken(tokenName, matchGenerator(complexion, state));
        }

        function initialize() {
            /* This information is available for matching function so they
             * can gather information for each other.
             */
            state = {
                keywordFromIdentifierName: null,
                implicitSemicolonFlag: false
            };
        }

        // Ensure 'config' is always an object
        config = config || {};

        // Always reinitialize the state before we start tokenizing
        complexion.setTokenFactory(function (tokenData) {
            return new ComplexionJsToken(tokenData);
        });
        complexion.on('start', initialize);
        complexion.on('end', function (data) {
            turnKeywordsIntoIdentifiers(data.tokenList);
        });
        initialize();

        // Order matters for defining tokens
        add('NUMERIC_LITERAL', matchNumericLiteral);  // Before punctuator
        add('PUNCTUATOR', matchPunctuator);  // Before regexp
        add('IDENTIFIER_NAME', matchIdentifierName);  // Can set keywordFromIdentifierName
        add('WHITESPACE', matchWhitespace);
        add('LINE_TERMINATOR', matchLineTerminator);  // Can set implicitSemicolonFlag
        add('KEYWORD', matchKeyword);  // Uses keywordFromIdentifierName
        add('STRING_LITERAL', matchStringLiteral);
        add('SINGLE_LINE_COMMENT', matchSingleLineComment);
        add('BOOLEAN_LITERAL', matchBooleanLiteral);  // Uses keywordFromIdentifierName
        add('NULL_LITERAL', matchNullLiteral);  // Uses keywordFromIdentifierName
        add('REGULAR_EXPRESSION_LITERAL', matchRegularExpressionLiteral);
        add('MULTI_LINE_COMMENT', matchMultiLineComment);

        add('IMPLICIT_SEMICOLON', matchImplicitSemicolon);  // Uses implicitSemicolonFlag

        if (config.shebang === undefined || config.shebang) {
            add('SHEBANG', matchShebang);
        }

        if (config.bom === undefined || config.bom) {
            add('BOM', matchBom);
        }

        add('UNKNOWN', matchUnknown);
    };

    // fid-umd post
}));
// fid-umd post-end

},{}],4:[function(require,module,exports){
/**
 * Scan through a string and turn it into tokens.
 *
 * Returns a list of tokens (an array).  Tokens are plain JavaScript objects
 * unless the library is asked to return something different.  If there is
 * input that can not be turned into a token properly, this throws an Error.
 *
 * When using this library, you can define your own class that should be used
 * for tokens.
 *
 *     // Set up my special token object
 *     function MySpecialToken(plainObject) {
 *         this.data = plainObject;
 *     }
 *
 *     // Make the factory
 *     function factory(data) {
 *         return new MySpecialToken(data);
 *     }
 *
 *     // Create a new tokenizer that will return arrays of your token
 *     tokenizer = new Complexion();
 *     tokenizer.setTokenFactory(factory);
 *
 * This library is optimized for speed.  It needs to be as fast as possible
 * so users do not wait while their megabytes of JavaScript (or whatever type
 * of file) is parsed.
 */
/*global exports, module*/
// fid-umd {"jslint":1,"name":"Complexion"}
/*global define, YUI*/
(function (n, r, f) {
    "use strict";
    try { module.exports = f(); return; } catch (ignore) {}
    try { exports[n] = f(); return; } catch (ignore) {}
    try { return define.amd && define(n, [], f); } catch (ignore) {}
    try { return YUI.add(n, function (Y) { Y[n] = f(); }); } catch (ignore) {}
    try { r[n] = f(); return; } catch (ignore) {}
    throw new Error("Unable to export " + n);
}("Complexion", this, function () {
    "use strict";
    // fid-umd end


    /**
     * The tokenizer object.
     */
    function Complexion() {
        if (!(this instanceof Complexion)) {
            return new Complexion();
        }

        this.eventListeners = {
            end: [],
            start: []
        };
        this.tokenFactory = null;
        this.tokenMatchers = [];
        this.tokenTypes = [];
    }

    /**
     * The tokenizer deals with functions that match a set of characters.
     * They all have the same signature and return the same result.
     *
     * @callback Complexion~matcher
     * @param {string} str String being parsed
     * @param {number} offset Byte offset into the string
     * @param {Array.<Object>} tokenList List of matched tokens
     * @return {(null|string)} matched characters
     */


    /**
     * Define a token and add it to the list of possibilities.
     *
     * Order matters when tokens are defined.  When scanning text, the tokens
     * are all tried in order from the first one that's defined through to the
     * last one which was defined.
     *
     * Do not define new tokens while tokenizing!
     *
     * @param {string} type
     * @param {Complexion~matcher} matcher
     */
    Complexion.prototype.defineToken = function (type, matcher) {
        if (typeof matcher !== 'function') {
            throw new Error('Matcher must be a function');
        }

        this.tokenMatchers.push(matcher);
        this.tokenTypes.push(type);
    };


    /**
     * Run an event
     *
     * @param {string} name
     */
    Complexion.prototype.emit = function (name, data) {
        var i;

        if (this.eventListeners[name]) {
            for (i = 0; i < this.eventListeners[name].length; i += 1) {
                this.eventListeners[name][i].call(null, data);
            }
        }
    };


    /**
     * Create a matcher which will match any single character
     *
     * Speeds tests currently show that using String.prototype.charAt is the
     * fastest method of getting a specific character from a string.
     *
     * @return {Complexion~matcher}
     */
    Complexion.prototype.matchAny = function () {
        return function (str, offset) {
            return str.charAt(offset) || null;
        };
    };


    /**
     * Create a matching function which targets a string.
     *
     * If `nextMatcher` is truthy, then call the next matcher to determine
     * what really matches.  This can be used to quickly tell if the first
     * character is something you'd like to investigate with a much more
     * thorough or slow process.
     *
     * Matching a single character is faster than matching a whole string.
     * When matching a single character, use String.prototype.charAt.
     * To compare longer strings, === is faster or is almost the same speed
     * as first testing the first letter and then checking if the two strings
     * are equal.  I prefer shorter code and opt to skip the first letter
     * checking optimization.
     *
     * No context is set when calling the next matcher, as direct calls to
     * functions are faster than using Function.prototype.call().
     *
     * @param {string} strToMatch What to match
     * @param {Complexion~matcher} nextMatcher
     * @return {Complexion~matcher}
     */
    Complexion.prototype.matchString = function (strToMatch, nextMatcher) {
        var matchLength;

        matchLength = strToMatch.length;

        if (matchLength === 1) {
            // Build a single-character matcher
            if (!nextMatcher) {
                // Single character with no following matcher
                return function (str, offset) {
                    /*jslint unparam:true*/
                    if (str.charAt(offset) !== strToMatch) {
                        return null;
                    }

                    return strToMatch;
                };
            }

            // Single character that uses a following matcher
            return function (str, offset, tokenList) {
                if (str.charAt(offset) !== strToMatch) {
                    return null;
                }

                return nextMatcher(str, offset, tokenList);
            };
        }

        if (!nextMatcher) {
            // Multi-character string with no next matcher
            return function (str, offset) {
                var foundString;

                foundString = str.substr(offset, matchLength);

                if (foundString !== strToMatch) {
                    return null;
                }

                return foundString;
            };
        }

        // Multi-character string with another matcher
        return function (str, offset, tokenList) {
            var foundString;

            foundString = str.substr(offset, matchLength);

            if (foundString !== strToMatch) {
                return null;
            }

            return nextMatcher(str, offset, tokenList);
        };
    };


    /**
     * Create a matching function which targets a string case insensitively.
     *
     * For more detail, see `matchString()`.
     *
     * @see Complexion.prototype.matchString
     * @param {string} strToMatch What to match
     * @param {Complexion~matcher} nextMatcher
     * @return {Complexion~matcher}
     */
    Complexion.prototype.matchStringInsensitive = function (strToMatch, nextMatcher) {
        var lower, matchLength, upper;

        matchLength = strToMatch.length;

        if (matchLength === 1) {
            lower = strToMatch.toLowerCase();
            upper = strToMatch.toUpperCase();

            if (!nextMatcher) {
                // Single character, no next matcher
                return function (str, offset) {
                    /*jslint unparam:true*/
                    var c;

                    c = str.charAt(offset);

                    if (c !== lower && c !== upper) {
                        return null;
                    }

                    return c;
                };
            }

            // Single character with a next matcher
            return function (str, offset, tokenList) {
                var c;

                c = str.charAt(offset);

                if (c !== lower && c !== upper) {
                    return null;
                }

                return nextMatcher(str, offset, tokenList);
            };
        }

        lower = strToMatch.toLowerCase();

        if (!nextMatcher) {
            // Multi-character string with no next matcher
            return function (str, offset) {
                var foundString;

                foundString = str.substr(offset, matchLength);

                if (foundString.toLowerCase() !== lower) {
                    return null;
                }

                return foundString;
            };
        }

        // Multi-character string with a next matcher
        return function (str, offset, tokenList) {
            var foundString;

            foundString = str.substr(offset, matchLength);

            if (foundString.toLowerCase() !== lower) {
                return null;
            }

            return nextMatcher(str, offset, tokenList);
        };
    };


    /**
     * Register an event listener
     *
     * @param {string} name
     * @param {Function} callback
     */
    Complexion.prototype.off = function (name, callback) {
        var self;

        self = this;

        if (self.eventListeners[name]) {
            self.eventListeners[name] = self.eventListeners[name].filter(function (val) {
                return val !== callback;
            });
        }
    };

    /**
     * Register an event listener
     *
     * @param {string} name
     * @param {Function} callback
     * @return {Fucntion} Removal function
     */
    Complexion.prototype.on = function (name, callback) {
        var self;

        self = this;

        if (self.eventListeners[name]) {
            self.eventListeners[name].push(callback);
        }

        return function () {
            self.off(name, callback);
        };
    };

    /**
     * A plain JavaScript object representation of a token.
     *
     * The line number increments and the column number resets with every
     * newline DOS, Unix, or old style Macintosh.  Technically, it resets
     * when it encounters CR+LF (together = 1 newline), CR by itself or LF
     * by itself.
     *
     * @typedef {Object} Complexion~token
     * @property {number} line Line number, starts at 1
     * @property {number} col Column number, starts at 1
     * @property {number} offset Number of bytes before this token
     * @property {string} type The registered token type
     * @property {string} content The token's content
     */

    /**
     * Converts a plain JavaScript object version of a token into another
     * object.  Whatever the factory returns is added to the array of token.
     *
     * @callback Complexion~tokenFactory
     * @param {Complexion~token} token
     * @return {*}
     */

    /**
     * Set the token factory function
     *
     * If you want custom token objects returned, you need to pass in the
     * factory here as `tokenFactory`.  See this file's doc block for
     * further information.
     *
     * @param {Complexion~tokenFactory} [tokenFactory] Factory that makes custom token objects
     */
    Complexion.prototype.setTokenFactory = function (tokenFactory) {
        this.tokenFactory = tokenFactory;
    };


    /**
     * Tokenize a string.
     *
     * This is where the real "meat" of the program lives.  There's a lot more
     * code in here than what's normally desirable, but this function is huge
     * only because the program runs faster when there are fewer functions
     * to call and fewer variables to pass around.
     *
     * @param {string} parseStr
     * @return {Array.<Object>} List of tokens
     * @throws Error in case untokenizable data was found
     */
    Complexion.prototype.tokenize = function (parseStr) {
        var i, c, col, cr, lf, line, matchedContent, matchedContentLen, matchers, matchersLen, offset, parseLen, token, tokenFactory, tokenList, types;

        /**
         * Run through the different matchers and stop when the first one
         * matches.  Set `token` to be the new token object that should be
         * added to the list.
         *
         * Does not get any variables passed nor returns any variables in
         * order to save a miniscule amount during execution.
         */
        function getToken() {
            for (i = 0; i < matchersLen; i += 1) {
                matchedContent = matchers[i](parseStr, offset, tokenList);

                if (matchedContent !== null) {
                    // We matched something.  Build a better token object.
                    token = {
                        line: line,
                        col: col,
                        offset: offset,
                        type: types[i],
                        content: matchedContent
                    };

                    if (tokenFactory) {
                        token = tokenFactory(token);
                    }

                    return;
                }
            }

            token = null;
        }

        // Position tracking
        offset = 0;  // Byte offset
        line = 1;  // Line number in file (any CR+LF, CR, LF counts)
        col = 1;  // Column number in file (tabs = 1 character)

        // Shortcuts for faster loops
        parseLen = parseStr.length;
        matchers = this.tokenMatchers;
        matchersLen = matchers.length;
        types = this.tokenTypes;
        tokenFactory = this.tokenFactory;
        cr = String.fromCharCode(0x0d);
        lf = String.fromCharCode(0x0a);

        // The destination list and the current token
        tokenList = [];
        token = null;

        // All set up
        this.emit('start', {});

        while (offset < parseLen) {
            // Get a token
            getToken();

            // If none are found, we throw an Error
            if (token === null) {
                throw new Error('Unable to match, starting at offset ' + offset + ' (line ' + line + ', col ' + col + ')');
            }

            // Add it to the list, save some properties for faster loops
            tokenList.push(token);
            matchedContentLen = matchedContent.length;
            offset += matchedContentLen;

            // Update the current position (line and column)
            for (i = 0; i < matchedContentLen; i += 1) {
                c = matchedContent[i];

                if (c === cr) {
                    // DOS or Unix style
                    if (matchedContent.charAt(i + 1) === lf) {
                        // DOS
                        i += 1;
                    }

                    line += 1;
                    col = 1;
                } else if (c === lf) {
                    // Old Mac
                    line += 1;
                    col = 1;
                } else {
                    // Non-newline character
                    col += 1;
                }
            }
        }

        this.emit('end', {
            tokenList: tokenList
        });

        return tokenList;
    };


    return Complexion;

    // fid-umd post
}));
// fid-umd post-end

},{}]},{},[1])(1)
});