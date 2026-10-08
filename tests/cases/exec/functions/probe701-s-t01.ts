// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); (function () { "use strict"; return this === undefined ? "u" : typeof this; })(); console.log(show((function () { "use strict";
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
(function () { "use strict"; return this === undefined ? "u" : typeof this; })();
console.log(show((function () { "use strict"; return this === undefined ? "u" : typeof this; })()));
