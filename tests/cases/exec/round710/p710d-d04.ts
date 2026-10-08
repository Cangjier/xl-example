// xl:title 严格函数的 arguments 是数组吗
// xl:round 710
// xl:judge stdout
// xl:end
function f(this: any) { "use strict"; return Array.isArray(arguments); }
function g() { return Array.isArray(arguments); }
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(f(1) + "," + g(1))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
