// This file must be imported at the very top of your app
// Import all polyfills first
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Buffer polyfill
import { Buffer } from '@craftzdog/react-native-buffer';
global.Buffer = Buffer;

// Process polyfill
import process from 'process/browser';
global.process = process;

// Stream polyfill - make it available globally and as a module
import * as stream from 'stream-browserify';
global.stream = stream;

// Events polyfill
import { EventEmitter } from 'events';
global.EventEmitter = EventEmitter;

// Util polyfill
import util from 'util';
global.util = util;

// Assert polyfill
import assert from 'assert';
global.assert = assert;

// URL polyfill
import { URL, URLSearchParams } from 'url';
global.URL = URL;
global.URLSearchParams = URLSearchParams;

// Querystring polyfill
import * as querystring from 'querystring-es3';
global.querystring = querystring;

// Crypto polyfill
import crypto from 'react-native-get-random-values';
if (typeof global.crypto === 'undefined') {
  global.crypto = crypto;
}

// Create a module cache for Node.js modules
const moduleCache = new Map();

// Make Node.js modules available as CommonJS modules
const originalRequire = global.require || require;
global.require = (id) => {
  // Check cache first
  if (moduleCache.has(id)) {
    return moduleCache.get(id);
  }

  let module;
  switch (id) {
    case 'stream':
      module = stream;
      break;
    case 'events':
      module = require('events');
      break;
    case 'util':
      module = require('util');
      break;
    case 'assert':
      module = require('assert');
      break;
    case 'url':
      module = require('url');
      break;
    case 'querystring':
      module = require('querystring-es3');
      break;
    case 'crypto':
      module = require('react-native-get-random-values');
      break;
    case 'buffer':
      module = { Buffer };
      break;
    case 'process':
      module = process;
      break;
    case 'string_decoder':
      module = require('string_decoder');
      break;
    case 'inherits':
      module = require('inherits');
      break;
    case 'safe-buffer':
      module = { Buffer };
      break;
    default:
      return originalRequire(id);
  }

  // Cache the module
  moduleCache.set(id, module);
  return module;
};

console.log('✅ All Node.js polyfills loaded successfully');
