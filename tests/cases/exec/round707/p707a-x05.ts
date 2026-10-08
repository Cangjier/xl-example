// xl:title Math.hypot / cbrt / imul / clz32
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(Math.hypot(3, 4)) + "," + show(Math.cbrt(27)) + "," + show(Math.imul(3, 4)) + "," + show(Math.clz32(1)));
