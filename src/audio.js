'use strict';
// Replace this adapter when licensed Q-Taraz resources are integrated.
// play(number) resolves after one completed utterance, rejects on failure; stop() cancels.
window.createAudioAdapter = function createAudioAdapter() {
  const synth = window.speechSynthesis;
  let currentReject = null;
  return {
    available() { return Boolean(synth && synth.getVoices().some(v => /^fa(?:[-_]|$)/i.test(v.lang))); },
    play(number) {
      const voice = synth && synth.getVoices().find(v => /^fa(?:[-_]|$)/i.test(v.lang));
      if (!voice) return Promise.reject(new Error('صدای فارسی سیستم پیدا نشد. صدای فارسی نصب کنید یا منابع Q-Taraz را ادغام کنید.'));
      return new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(number));
        utterance.voice = voice; utterance.lang = voice.lang;
        currentReject = reject;
        utterance.onend = () => { currentReject = null; resolve(); };
        utterance.onerror = () => { currentReject = null; reject(new Error('پخش صدای فارسی ناموفق بود.')); };
        synth.speak(utterance);
      });
    },
    stop() { if (synth) synth.cancel(); if (currentReject) { const reject = currentReject; currentReject = null; reject(new Error('خواندن متوقف شد.')); } }
  };
};
