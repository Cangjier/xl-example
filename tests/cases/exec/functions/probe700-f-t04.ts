// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const obj = {}; (function () { return this; }).call(obj); console.log(show(obj === undefined) + "|" + show(Object.keys(obj).leng
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const obj = {};
(function () { return this; }).call(obj);
console.log(show(obj === undefined) + "|" + show(Object.keys(obj).length));
