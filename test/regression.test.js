'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = name => fs.readFileSync(path.join(__dirname, '..', 'src', name), 'utf8');

test('late callback from stopped speech cannot cancel newer speech', async () => {
  const utterances = [];
  class Audio { constructor(src) { this.src = src; utterances.push(this); } play() { return Promise.resolve(); } pause() {} }
  const window = {};
  vm.runInNewContext(source('audio.js'), { window, Audio });
  const audio = window.createAudioAdapter();
  const first = audio.play(1); const rejection = assert.rejects(first, /متوقف/);
  audio.stop(); await rejection;
  const second = audio.play(2); const secondRejection = assert.rejects(second, /متوقف/);
  utterances[0].onended(); audio.stop(); await secondRejection;
});

test('read saves visible inputs and failed validation preserves input', async () => {
  const elements = {};
  for (const id of ['number','repeats','interval','number-form','settings-form','increment','display','stop','read','current','status']) elements[id] = { value: '', disabled: false, textContent: '', addEventListener(_, fn) { this.handler = fn; } };
  let saved;
  const window = { createAudioAdapter: () => ({ available: () => true, play: async () => {}, stop() {} }), counter: {
    onState() {}, getState: async () => ({ state: { number: 0, repeats: 1, interval: 0 } }),
    save: async value => { saved = value; if (value.repeats > 100) throw Error('invalid'); return value; }
  } };
  vm.runInNewContext(source('control.js'), { window, document: { getElementById: id => elements[id] }, Intl, setTimeout, clearTimeout });
  await new Promise(resolve => setImmediate(resolve));
  elements.number.value = '۴۲'; elements.repeats.value = '1'; elements.interval.value = '0';
  await elements.read.handler(); assert.deepEqual(JSON.parse(JSON.stringify(saved)), { number: 42, repeats: 1, interval: 0 });
  elements.number.value = '99'; elements.repeats.value = '101'; await elements.read.handler();
  assert.equal(elements.number.value, '99'); assert.equal(elements.repeats.value, '101'); assert.equal(elements.status.textContent, 'invalid');
});
