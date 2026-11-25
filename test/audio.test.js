'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/audio.js'), 'utf8');
function setup(Audio = class {}) { const window = {}; vm.runInNewContext(source, { window, Audio }); return window; }

test('Q-Taraz sequences use connecting hundreds and tens', () => {
  const sequence = setup().numberAudioSequence;
  for (const [number, expected] of [[1,['Num.wav','1.wav']],[10,['Num.wav','10.wav']],[20,['Num.wav','20.wav']],[21,['Num.wav','_20.wav','1.wav']],[100,['Num.wav','100.wav']],[101,['Num.wav','_100.wav','1.wav']],[120,['Num.wav','_100.wav','20.wav']],[999,['Num.wav','_900.wav','_90.wav','9.wav']]]) assert.deepEqual(Array.from(sequence(number)), expected);
  assert.throws(() => sequence(0), /صفر/);
  assert.throws(() => sequence(1000), /هزار/);
  assert.throws(() => sequence(1000000), /میلیون/);
  assert.throws(() => sequence(-1), /نامعتبر/);
});

test('all supported sequences reference included wave files', () => {
  const sequence = setup().numberAudioSequence;
  for (let number = 1; number <= 999; number++) for (const file of sequence(number)) assert.equal(fs.existsSync(path.join(__dirname, '../src/assets/numbers', file)), true, `${number}: ${file}`);
});

test('playback runs files in order and surfaces media failure', async () => {
  const clips = [];
  class Audio { constructor(src) { this.src = src; clips.push(this); } play() { return Promise.resolve(); } pause() {} }
  const audio = setup(Audio).createAudioAdapter();
  const playing = audio.play(21);
  assert.equal(clips[0].src, 'assets/numbers/Num.wav'); clips[0].onended(); await Promise.resolve();
  assert.equal(clips[1].src, 'assets/numbers/_20.wav'); clips[1].onended(); await Promise.resolve();
  assert.equal(clips[2].src, 'assets/numbers/1.wav'); clips[2].onended(); await playing;
  const broken = audio.play(1); clips[3].onerror(); await assert.rejects(broken, /ناموفق/);
});

test('stop between clips prevents next clip', async () => {
  const clips = [];
  class Audio { constructor(src) { clips.push(this); } play() { return Promise.resolve(); } pause() {} }
  const audio = setup(Audio).createAudioAdapter();
  const playing = audio.play(21); const rejected = assert.rejects(playing, /متوقف/);
  clips[0].onended(); audio.stop(); await rejected;
  assert.equal(clips.length, 1);
});
