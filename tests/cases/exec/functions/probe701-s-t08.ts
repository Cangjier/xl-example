// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const o = { m() { function f() { return this === undefined ? "u" : typeof this; } return f(); } }; console.log(show(o.m()));
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const o = { m() { function f() { return this === undefined ? "u" : typeof this; } return f(); } };
console.log(show(o.m()));
