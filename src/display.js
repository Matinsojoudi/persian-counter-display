'use strict';
const output = document.getElementById('display-number');
const show = state => { output.textContent = new Intl.NumberFormat('fa-IR').format(state.number); output.style.color = state.color; output.dataset.font = state.font; };
window.counter.onState(show);
window.counter.getState().then(result => show(result.state)).catch(() => { output.textContent = 'خطا در دریافت عدد'; });
