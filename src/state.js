'use strict';
const MAX = 999999999;
const defaults = Object.freeze({ number: 0, repeats: 1, interval: 2 });
function integer(value, min, max, label) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new Error(`${label} باید عدد صحیح بین ${min} و ${max} باشد.`);
  return value;
}
function validate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('تنظیمات نامعتبر است.');
  return { number: integer(value.number, 0, MAX, 'عدد'), repeats: integer(value.repeats, 1, 100, 'تعداد تکرار'), interval: integer(value.interval, 0, 3600, 'فاصله') };
}
function increment(state) { return validate({ ...state, number: state.number + 1 }); }
module.exports = { defaults, validate, increment, MAX };
