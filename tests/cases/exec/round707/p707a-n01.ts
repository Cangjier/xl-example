// xl:title Number 的静态判定四档
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(Number.isInteger(1.0)) + "," + show(Number.isSafeInteger(2 ** 53)) + "," + show(Number.isNaN("x")) + "," + show(Number.isFinite("1")));
