// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const o = { toString() { return "k"; } }; console.log(show("abc".includes(o)) + "|" + show("abc".indexOf(o)));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const o = { toString() { return "k"; } };
console.log(show("abc".includes(o)) + "|" + show("abc".indexOf(o)));
