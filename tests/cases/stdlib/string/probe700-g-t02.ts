// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const o = { toString() { return "b"; } }; console.log(show("abc".replace(o, "X")) + "|" + show("abc".indexOf(o)));
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const o = { toString() { return "b"; } };
console.log(show("abc".replace(o, "X")) + "|" + show("abc".indexOf(o)));
