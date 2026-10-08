// xl:title Math 的对数族
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(Math.log2(8)) + "," + show(Math.log10(1000)) + "," + show(Math.log1p(0)) + "," + show(Math.expm1(0)));
