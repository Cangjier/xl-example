// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const p = { [Symbol.toPrimitive]: (hint) => "P" }; console.log(show(p + 1) + "|" + show(`${p}`));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const p = { [Symbol.toPrimitive]: (hint) => "P" };
console.log(show(p + 1) + "|" + show(`${p}`));
