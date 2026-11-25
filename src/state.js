'use strict';
const MAX = 999999999;
const FONTS = Object.freeze(['vazirmatn', 'plex']);
const defaults = Object.freeze({ number: 0, repeats: 1, interval: 2, color: '#ffffff', font: 'vazirmatn' });
function integer(value, min, max, label) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new Error(`${label} باید عدد صحیح بین ${min} و ${max} باشد.`);
  return value;
}
function validate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('تنظیمات نامعتبر است.');
  const color = value.color === undefined ? defaults.color : value.color;
  const font = value.font === undefined ? defaults.font : value.font;
  if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) throw new Error('رنگ نامعتبر است.');
  if (!FONTS.includes(font)) throw new Error('فونت نامعتبر است.');
  return { number: integer(value.number, 0, MAX, 'عدد'), repeats: integer(value.repeats, 1, 100, 'تعداد تکرار'), interval: integer(value.interval, 0, 3600, 'فاصله'), color: color.toLowerCase(), font };
}
function increment(state) { return validate({ ...state, number: state.number + 1 }); }
module.exports = { defaults, validate, increment, MAX, FONTS };
