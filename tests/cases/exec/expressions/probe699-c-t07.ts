// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const n = new Number(3); console.log(show(n + 1) + "|" + show(n === 3) + "|" + show(n == 3) + "|" + show(typeof n));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const n = new Number(3);
console.log(show(n + 1) + "|" + show(n === 3) + "|" + show(n == 3) + "|" + show(typeof n));
