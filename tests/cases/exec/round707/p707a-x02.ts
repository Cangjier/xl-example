// xl:title Math 的 min / max 与 NaN
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(Math.max()) + "," + show(Math.min()) + "," + show(Math.max(1, NaN)) + "," + show(Math.min(1, "2")));
