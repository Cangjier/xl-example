// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); console.log(show((function () { "use strict"; return typeof this; }).call(1)));
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
console.log(show((function () { "use strict"; return typeof this; }).call(1)));
