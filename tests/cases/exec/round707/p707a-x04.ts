// xl:title Math 的符号与零
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(Math.sign(-3)) + "," + show(Math.sign(0)) + "," + show(Math.sign(-0)) + "," + show(1 / Math.sign(-0)));
