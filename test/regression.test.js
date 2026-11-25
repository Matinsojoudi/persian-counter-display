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
  for (const id of ['number','repeats','interval','number-form','settings-form','increment','display','stop','read','current','status','color','font']) elements[id] = { value: '', disabled: false, textContent: '', style: {}, dataset: {}, addEventListener(_, fn) { this.handler = fn; } };
  let saved;
  const window = { createAudioAdapter: () => ({ available: () => true, play: async () => {}, stop() {} }), counter: {
    onState() {}, getState: async () => ({ state: { number: 0, repeats: 1, interval: 0, color: '#ffffff', font: 'vazirmatn' } }),
    save: async value => { saved = value; if (value.repeats > 100) throw Error('invalid'); return value; }
  } };
  vm.runInNewContext(source('control.js'), { window, document: { getElementById: id => elements[id] }, Intl, setTimeout, clearTimeout });
  await new Promise(resolve => setImmediate(resolve));
  elements.number.value = '۴۲'; elements.repeats.value = '1'; elements.interval.value = '0';
  await elements.read.handler(); assert.deepEqual(JSON.parse(JSON.stringify(saved)), { number: 42, repeats: 1, interval: 0, color: '#ffffff', font: 'vazirmatn' });
  elements.number.value = '99'; elements.repeats.value = '101'; await elements.read.handler();
  assert.equal(elements.number.value, '99'); assert.equal(elements.repeats.value, '101'); assert.equal(elements.status.textContent, 'invalid');
});


test('increment updates number and announces the incremented value', async () => {
  const elements = {};
  for (const id of ['number','repeats','interval','number-form','settings-form','increment','display','stop','read','current','status','color','font']) elements[id] = { value: '', disabled: false, textContent: '', style: {}, dataset: {}, addEventListener(_, fn) { this.handler = fn; } };
  const initial = { number: 41, repeats: 1, interval: 0, color: '#ffffff', font: 'vazirmatn' }; const played = [];
  const window = { createAudioAdapter: () => ({ available: () => true, play: async n => { played.push(n); }, stop() {} }), counter: { onState() {}, getState: async () => ({ state: initial }), increment: async () => ({ ...initial, number: 42 }) } };
  vm.runInNewContext(source('control.js'), { window, document: { getElementById: id => elements[id] }, Intl, setTimeout, clearTimeout });
  await new Promise(resolve => setImmediate(resolve));
  await elements.increment.handler();
  assert.equal(elements.number.value, 42); assert.deepEqual(played, [42]);
});

test('appearance selection saves and updates preview', async () => {
  const elements = {};
  for (const id of ['number','repeats','interval','number-form','settings-form','increment','display','stop','read','current','status','color','font']) elements[id] = { value: '', disabled: false, textContent: '', style: {}, dataset: {}, addEventListener(_, fn) { this.handler = fn; } };
  let saved; const initial = { number: 12, repeats: 2, interval: 3, color: '#ffffff', font: 'vazirmatn' };
  const window = { createAudioAdapter: () => ({ available: () => true, stop() {} }), counter: { onState() {}, getState: async () => ({ state: initial }), save: async v => { saved = v; return v; } } };
  vm.runInNewContext(source('control.js'), { window, document: { getElementById: id => elements[id] }, Intl, setTimeout, clearTimeout });
  await new Promise(resolve => setImmediate(resolve));
  elements.color.value = '#ff7700'; elements.font.value = 'plex'; await elements.font.handler();
  assert.equal(saved.color, '#ff7700'); assert.equal(saved.font, 'plex'); assert.equal(elements.current.style.color, '#ff7700'); assert.equal(elements.current.dataset.font, 'plex');
});

test('display applies synchronized appearance on initial state and updates', async () => {
  const output = { textContent: '', style: {}, dataset: {} }; let handler;
  const window = { counter: { onState(fn) { handler = fn; }, getState: async () => ({ state: { number: 1, color: '#ffffff', font: 'vazirmatn' } }) } };
  vm.runInNewContext(source('display.js'), { window, document: { getElementById: () => output }, Intl });
  await new Promise(resolve => setImmediate(resolve));
  handler({ number: 123, color: '#ff7700', font: 'plex' });
  assert.equal(output.style.color, '#ff7700'); assert.equal(output.dataset.font, 'plex'); assert.equal(output.textContent, new Intl.NumberFormat('fa-IR').format(123));
});
