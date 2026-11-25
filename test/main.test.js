'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../src/main.js'), 'utf8');
function setup(lock = true) {
  const events = {}, handlers = {}, windows = [];
  let displays = [{ id: 1, bounds: { x: 0, y: 0, width: 800, height: 600 } }];
  const app = { requestSingleInstanceLock: () => lock, quit() { this.quitCalled = true; }, on: (name, fn) => { events[name] = fn; }, whenReady: () => Promise.resolve(), getPath: () => '/nonexistent/test' };
  const screen = { getPrimaryDisplay: () => displays[0], getAllDisplays: () => displays, getDisplayMatching: bounds => displays.find(d => d.bounds.x === bounds.x) || displays[0] };
  class BrowserWindow {
    constructor(options) { this.bounds = options; this.full = !!options.fullscreen; this.webContents = { mainFrame: {}, send() {}, setWindowOpenHandler() {}, on() {} }; windows.push(this); }
    static getAllWindows() { return windows; }
    on() {} loadFile() {} isDestroyed() { return false; } getBounds() { return this.bounds; } setBounds(b) { this.bounds = b; } setFullScreen(v) { this.full = v; } isFullScreen() { return this.full; } focus() { this.focused = true; } show() {} isMinimized() { return false; }
  }
  const ipcMain = { handle: (name, fn) => { handlers[name] = fn; } };
  vm.runInNewContext(code, { require: name => name === 'electron' ? { app, screen, BrowserWindow, ipcMain } : name === './state' ? require('../src/state') : require(name), __dirname: path.join(__dirname, '../src') });
  return { app, events, handlers, windows, setDisplays: value => { displays = value; } };
}
test('second instance without lock quits before creating windows', async () => {
  const env = setup(false); await Promise.resolve(); assert.equal(env.app.quitCalled, true); assert.equal(env.windows.length, 0);
});
test('existing display moves to connected second monitor and focuses', async () => {
  const env = setup(); await new Promise(resolve => setImmediate(resolve));
  const control = env.windows[0]; const sender = { sender: control.webContents, senderFrame: control.webContents.mainFrame };
  assert.equal(env.handlers['open-display'](sender).external, false);
  env.setDisplays([{ id: 1, bounds: { x: 0, y: 0, width: 800, height: 600 } }, { id: 2, bounds: { x: 800, y: 0, width: 800, height: 600 } }]);
  assert.equal(env.handlers['open-display'](sender).external, true);
  assert.equal(env.windows[1].bounds.x, 800); assert.equal(env.windows[1].full, true); assert.equal(env.windows[1].focused, true);
  env.events['second-instance'](); assert.equal(control.focused, true);
});
