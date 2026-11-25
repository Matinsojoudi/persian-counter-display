'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../src/control.js'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
async function setup({ number = 0, repeats = 1, interval = 0, play = async () => {}, increment, stop = () => {}, timers } = {}) {
  const elements = {};
  for (const id of ['number','repeats','interval','number-form','settings-form','increment','display','stop','read','current','status','color','font']) elements[id] = { value:'', disabled:false, textContent:'', style:{}, dataset:{}, addEventListener(_, fn) { this.handler = fn; } };
  let current = { number, repeats, interval, color: '#ffffff', font: 'vazirmatn' };
  const counter = { onState() {}, getState: async () => ({ state: current }), increment: increment || (async () => current = { ...current, number: current.number + 1 }) };
  const window = { createAudioAdapter: () => ({ available: () => true, play, stop }), counter };
  vm.runInNewContext(code, { window, document: { getElementById: id => elements[id] }, Intl, setTimeout: timers?.setTimeout || setTimeout, clearTimeout: timers?.clearTimeout || clearTimeout });
  await tick(); return elements;
}
test('increment announces each repeat after configured interval', async () => {
  const played = [], delays = [], callbacks = [];
  const el = await setup({ number: 5, repeats: 3, interval: 2, play: async n => { played.push(n); }, timers: { setTimeout: (fn, ms) => { callbacks.push(fn); delays.push(ms); return 1; }, clearTimeout() {} } });
  const work = el.increment.handler(); await tick(); assert.deepEqual(played, [6]); callbacks.shift()(); await tick(); assert.deepEqual(played, [6,6]); callbacks.shift()(); await work;
  assert.deepEqual(played, [6,6,6]); assert.deepEqual(delays, [2000,2000]);
});
test('stop cancels waiting repeats without a later announcement', async () => {
  const played = []; const el = await setup({ repeats: 2, interval: 60, play: async n => { played.push(n); } });
  const work = el.increment.handler(); await tick(); el.stop.handler(); await work;
  assert.deepEqual(played, [1]); assert.equal(el.status.textContent, 'خواندن متوقف شد.'); assert.equal(el.stop.disabled, true);
});
test('later increment cancels previous announcement without unlocking a pending increment', async () => {
  const first = deferred(), secondIncrement = deferred(); const played = []; let count = 0;
  const el = await setup({ play: n => { played.push(n); return n === 1 ? first.promise : Promise.resolve(); }, stop: () => first.reject(Error('متوقف')), increment: async () => { count++; return count === 1 ? { number:1,repeats:1,interval:0,color:'#ffffff',font:'vazirmatn' } : secondIncrement.promise; } });
  const a = el.increment.handler(); await tick(); const b = el.increment.handler(); await tick();
  assert.equal(el.increment.disabled, true); await a; assert.equal(el.increment.disabled, true);
  secondIncrement.resolve({ number:2,repeats:1,interval:0,color:'#ffffff',font:'vazirmatn' }); await b;
  assert.deepEqual(played,[1,2]); assert.equal(el.number.value,2); assert.equal(el.increment.disabled,false);
});
test('audio failure leaves new counter value and shows error', async () => {
  const el = await setup({ number:999, play: async () => { throw Error('فایل صوتی هزار موجود نیست'); } });
  await el.increment.handler(); assert.equal(el.number.value,1000); assert.match(el.status.textContent,/فایل صوتی هزار/); assert.equal(el.read.disabled,false); assert.equal(el.stop.disabled,true);
});
