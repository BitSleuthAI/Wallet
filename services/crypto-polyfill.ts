// Import polyfills at the very top of your app
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Buffer polyfill
import { Buffer } from '@craftzdog/react-native-buffer';
global.Buffer = Buffer;

// Stream polyfill for React Native
import { Readable, Transform, Writable } from 'stream-browserify';
global.stream = { Readable, Writable, Transform };

// Events polyfill for React Native
import { EventEmitter } from 'events';
if (typeof global.EventEmitter === 'undefined') {
  global.EventEmitter = EventEmitter;
}

// Additional crypto polyfills if needed
if (typeof global.crypto === 'undefined') {
  const crypto = require('react-native-get-random-values');
  global.crypto = crypto;
}

// Ensure process is available
if (typeof global.process === 'undefined') {
  global.process = require('process');
}

// Additional Node.js polyfills
if (typeof global.util === 'undefined') {
  global.util = require('util');
}

if (typeof global.assert === 'undefined') {
  global.assert = require('assert');
}

if (typeof global.url === 'undefined') {
  global.url = require('url');
}

if (typeof global.querystring === 'undefined') {
  global.querystring = require('querystring-es3');
}