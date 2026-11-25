'use strict';
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { defaults, validate, increment } = require('./state');
let state = { ...defaults }, control, display, warning = '';
const stateFile = () => path.join(app.getPath('userData'), 'state.json');
function load() {
  try { state = validate(JSON.parse(fs.readFileSync(stateFile(), 'utf8'))); }
  catch (error) { if (error.code !== 'ENOENT') warning = 'بازیابی وضعیت ناموفق بود؛ تنظیمات پیش‌فرض بارگذاری شد.'; }
}
function save(next) {
  const file = stateFile(), temp = `${file}.tmp`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(temp, JSON.stringify(next), 'utf8');
  fs.renameSync(temp, file);
  state = next;
  broadcast();
  return state;
}
function broadcast() { for (const win of [control, display]) if (win && !win.isDestroyed()) win.webContents.send('state', state); }
function options() { return { webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } }; }
function secure(win) {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
}
function createControl() {
  control = new BrowserWindow({ width: 1000, height: 760, minWidth: 640, minHeight: 600, backgroundColor: '#f4f1e9', ...options() });
  secure(control); control.loadFile(path.join(__dirname, 'control.html'));
  control.on('closed', () => { if (display && !display.isDestroyed()) display.close(); });
}
function openDisplay() {
  if (display && !display.isDestroyed()) { display.focus(); return { external: screen.getAllDisplays().length > 1 }; }
  const primary = screen.getPrimaryDisplay();
  const external = screen.getAllDisplays().find(d => d.id !== primary.id);
  const target = external || primary;
  display = new BrowserWindow({ ...target.bounds, fullscreen: Boolean(external), backgroundColor: '#111b1c', ...options() });
  secure(display); display.loadFile(path.join(__dirname, 'display.html'));
  return { external: Boolean(external) };
}
function controlOnly(event) { if (!control || event.sender !== control.webContents || event.senderFrame !== control.webContents.mainFrame) throw new Error('درخواست غیرمجاز است.'); }
app.whenReady().then(() => {
  load(); createControl();
  ipcMain.handle('get-state', event => { if (![control, display].some(w => w && !w.isDestroyed() && event.sender === w.webContents && event.senderFrame === w.webContents.mainFrame)) throw new Error('درخواست غیرمجاز است.'); return { state, warning }; });
  ipcMain.handle('save-state', (event, value) => { controlOnly(event); return save(validate(value)); });
  ipcMain.handle('increment', event => { controlOnly(event); return save(increment(state)); });
  ipcMain.handle('open-display', event => { controlOnly(event); return openDisplay(); });
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createControl(); });
});
app.on('window-all-closed', () => app.quit());
