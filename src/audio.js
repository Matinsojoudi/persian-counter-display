'use strict';
// Q-Taraz NumberSpeakerService uses standalone and connecting variants of hundreds/tens.
// There is no recording for zero, thousand or million; never announce a truncated number.
window.numberAudioSequence = function numberAudioSequence(number) {
  if (!Number.isInteger(number) || number < 0) throw new Error('عدد نامعتبر است.');
  if (number === 0) throw new Error('فایل صوتی صفر در مجموعه Q-Taraz موجود نیست.');
  if (number > 999) throw new Error('فایل صوتی هزار و میلیون در مجموعه Q-Taraz موجود نیست؛ خواندن فقط از ۱ تا ۹۹۹ پشتیبانی می‌شود.');
  const result = ['Num.wav'];
  const hundreds = Math.floor(number / 100) * 100;
  const remainder = number % 100;
  if (hundreds) result.push(`${remainder ? '_' : ''}${hundreds}.wav`);
  if (remainder && remainder <= 19) result.push(`${remainder}.wav`);
  else if (remainder) {
    const tens = Math.floor(remainder / 10) * 10;
    const ones = remainder % 10;
    result.push(`${ones ? '_' : ''}${tens}.wav`);
    if (ones) result.push(`${ones}.wav`);
  }
  return result;
};

window.createAudioAdapter = function createAudioAdapter() {
  let active = null;
  let generation = 0;
  function stop() {
    generation++;
    const current = active;
    active = null;
    if (current) { current.audio.pause(); current.reject(new Error('خواندن متوقف شد.')); }
  }
  return {
    available() { return typeof Audio !== 'undefined'; },
    async play(number) {
      const files = window.numberAudioSequence(number);
      stop();
      const token = generation;
      for (const file of files) {
        if (token !== generation) throw new Error('خواندن متوقف شد.');
        await new Promise((resolve, reject) => {
          const audio = new Audio(`assets/numbers/${file}`);
          const current = { audio, reject };
          active = current;
          audio.onended = () => { if (active !== current) return; active = null; resolve(); };
          audio.onerror = () => { if (active !== current) return; active = null; reject(new Error(`پخش فایل صوتی ${file} ناموفق بود.`)); };
          try {
            const playback = audio.play();
            if (playback && typeof playback.catch === 'function') playback.catch(() => { if (active === current) { active = null; reject(new Error(`پخش فایل صوتی ${file} ناموفق بود.`)); } });
          } catch (_) { if (active === current) active = null; reject(new Error(`پخش فایل صوتی ${file} ناموفق بود.`)); }
        });
      }
    },
    stop
  };
};
