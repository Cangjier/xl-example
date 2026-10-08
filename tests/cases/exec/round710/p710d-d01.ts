// xl:title arguments 在调用中的形状
// xl:round 710
// xl:judge stdout
// xl:end
function f(this: any, a: any) { return arguments.length + "," + arguments[0]; }
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(f(1))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
