// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const o = { toString: () => "S", valueOf: () => "V" }; console.log(show(o + "") + "|" + show(String(o)) + "|" + show(`${o}`));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const o = { toString: () => "S", valueOf: () => "V" };
console.log(show(o + "") + "|" + show(String(o)) + "|" + show(`${o}`));
