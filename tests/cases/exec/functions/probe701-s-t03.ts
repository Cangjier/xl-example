// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); function outer() { "use strict"; return (function () { return this === undefined ? "u" : typeof this; })(); } console.log(show(o
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
function outer() { "use strict"; return (function () { return this === undefined ? "u" : typeof this; })(); }
console.log(show(outer()));
