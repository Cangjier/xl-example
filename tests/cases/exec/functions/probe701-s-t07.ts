// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); console.log(show((function () { "use strict"; return (function () { return this === undefined ? "u" : typeof this; })(); })()));
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
console.log(show((function () { "use strict"; return (function () { return this === undefined ? "u" : typeof this; })(); })()));
