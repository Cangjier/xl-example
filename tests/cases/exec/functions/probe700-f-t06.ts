// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const f = function () { return f2(); }; function f2() { return "ok"; } console.log(show(f()));
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const f = function () { return f2(); };
function f2() { return "ok"; }
console.log(show(f()));
