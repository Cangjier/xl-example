// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const m = new Map([["a", 1], ["b", 2]]); const out = []; for (const [k, v] of m) out.push(k + v); console.log(out.join(","));
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const m = new Map([["a", 1], ["b", 2]]);
const out = [];
for (const [k, v] of m) out.push(k + v);
console.log(out.join(","));
