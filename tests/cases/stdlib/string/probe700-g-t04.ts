// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const sym = Symbol("k"); const o = { [sym]: "S" }; console.log(show(String(o)) + "|" + show(o[sym]));
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const sym = Symbol("k");
const o = { [sym]: "S" };
console.log(show(String(o)) + "|" + show(o[sym]));
