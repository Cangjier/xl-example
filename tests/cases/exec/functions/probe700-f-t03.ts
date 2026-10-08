// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); let calls = 0; const o = { get v() { calls++; return 1; } }; const { v } = o; console.log(show(v) + "|" + show(calls));
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
let calls = 0;
const o = { get v() { calls++; return 1; } };
const { v } = o;
console.log(show(v) + "|" + show(calls));
