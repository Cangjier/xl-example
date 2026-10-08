// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const [a, b] = new Set([1, 2]); console.log(show(a) + "|" + show(b));
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const [a, b] = new Set([1, 2]);
console.log(show(a) + "|" + show(b));
