// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); function f() { "use strict"; return arguments.length; } console.log(show(f(1, 2)));
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
function f() { "use strict"; return arguments.length; }
console.log(show(f(1, 2)));
