'use strict';
const $ = id => document.getElementById(id);
const fmt = new Intl.NumberFormat('fa-IR');
const audio = window.createAudioAdapter();
let state, run = 0, timer, timerResolve;
function message(text) { $('status').textContent = text; }
function parse(id) {
  const text = $(id).value.trim().replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632));
  if (!/^\d+$/.test(text)) throw new Error('لطفاً فقط عدد صحیح غیرمنفی وارد کنید.');
  return Number(text);
}
function show(next) { state = next; $('current').textContent = fmt.format(next.number); }
function fill(next) { $('number').value = next.number; $('repeats').value = next.repeats; $('interval').value = next.interval; }
function errorText(error) { return error.message.replace(/^Error invoking remote method '[^']+': Error: /, ''); }
function stop() { run++; clearTimeout(timer); if (timerResolve) { timerResolve(); timerResolve = null; } audio.stop(); $('read').disabled = false; $('stop').disabled = true; }
async function saveNumber(event) {
  event.preventDefault();
  try { stop(); const next = await window.counter.save({ ...state, number: parse('number') }); show(next); $('number').value = next.number; message('عدد ذخیره شد.'); }
  catch (error) { message(errorText(error)); }
}
async function saveSettings(event) {
  event.preventDefault();
  try { stop(); const next = await window.counter.save({ ...state, repeats: parse('repeats'), interval: parse('interval') }); show(next); $('repeats').value = next.repeats; $('interval').value = next.interval; message('تنظیمات ذخیره شد.'); }
  catch (error) { message(errorText(error)); }
}
$('number-form').addEventListener('submit', saveNumber);
$('settings-form').addEventListener('submit', saveSettings);
$('increment').addEventListener('click', async () => { try { stop(); const next = await window.counter.increment(); show(next); $('number').value = next.number; message('عدد افزایش یافت.'); } catch (error) { message(errorText(error)); } });
$('display').addEventListener('click', async () => { try { const result = await window.counter.openDisplay(); message(result.external ? 'پنجره نمایش روی نمایشگر دوم باز شد.' : 'نمایشگر دوم پیدا نشد؛ پنجره روی نمایشگر اصلی باز شد.'); } catch (error) { message(errorText(error)); } });
$('stop').addEventListener('click', () => { stop(); message('خواندن متوقف شد.'); });
$('read').addEventListener('click', async () => {
  if (!audio.available()) { message('پخش صوت در این سیستم در دسترس نیست.'); return; }
  const token = ++run; $('read').disabled = true; $('stop').disabled = false;
  try {
    const snapshot = await window.counter.save({ number: parse('number'), repeats: parse('repeats'), interval: parse('interval') });
    if (token !== run) return;
    show(snapshot);
    for (let i = 0; i < snapshot.repeats; i++) {
      if (token !== run) return;
      message(`در حال خواندن ${fmt.format(i + 1)} از ${fmt.format(snapshot.repeats)}.`);
      await audio.play(snapshot.number);
      if (token !== run) return;
      if (i + 1 < snapshot.repeats) await new Promise(resolve => { timerResolve = resolve; timer = setTimeout(() => { timerResolve = null; resolve(); }, snapshot.interval * 1000); });
    }
    if (token === run) message('خواندن پایان یافت.');
  } catch (error) { if (token === run) message(errorText(error)); }
  finally { if (token === run) { $('read').disabled = false; $('stop').disabled = true; } }
});
window.counter.onState(show);
window.counter.getState().then(({ state: initial, warning }) => { show(initial); fill(initial); if (warning) message(warning); }).catch(error => message(errorText(error)));
