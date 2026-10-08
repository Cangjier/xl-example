// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); function f(...xs) { return xs.length; } console.log(show(f(...[1, 2, 3])) + "|" + show(f(...new Set([1, 2]))));
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
function f(...xs) { return xs.length; }
console.log(show(f(...[1, 2, 3])) + "|" + show(f(...new Set([1, 2]))));
