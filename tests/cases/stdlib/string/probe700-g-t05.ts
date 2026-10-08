// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const o = { toString: null, valueOf: () => 7 }; console.log(show("abc".includes(o)) + "|" + show(String(o)));
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const o = { toString: null, valueOf: () => 7 };
console.log(show("abc".includes(o)) + "|" + show(String(o)));
