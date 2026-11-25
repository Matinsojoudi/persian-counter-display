'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { defaults, validate, increment, MAX } = require('../src/state');
test('valid state is copied and incremented', () => { assert.deepEqual(validate(defaults), defaults); assert.notEqual(validate(defaults), defaults); assert.equal(increment(defaults).number, 1); });
test('valid limits accepted', () => assert.deepEqual(validate({ number: MAX, repeats: 100, interval: 3600 }), { number: MAX, repeats: 100, interval: 3600 }));
test('invalid values rejected', () => { for (const patch of [{ number: -1 }, { number: MAX + 1 }, { number: 1.5 }, { number: '1' }, { repeats: 0 }, { repeats: 101 }, { interval: -1 }, { interval: 3601 }, { interval: NaN }]) assert.throws(() => validate({ ...defaults, ...patch })); assert.throws(() => validate(null)); assert.throws(() => increment({ ...defaults, number: MAX })); });
