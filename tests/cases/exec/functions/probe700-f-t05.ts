// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); function f() { return arguments[1]; } console.log(show(f(1, 2)) + "|" + show(typeof f.arguments));
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
function f() { return arguments[1]; }
console.log(show(f(1, 2)) + "|" + show(typeof f.arguments));
