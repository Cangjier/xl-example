// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const tag = (s, ...v) => s.raw[0] + "|" + s[0] + "|" + v.length; console.log(show(tag`a\tb${1}c`));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const tag = (s, ...v) => s.raw[0] + "|" + s[0] + "|" + v.length;
console.log(show(tag`a\tb${1}c`));
