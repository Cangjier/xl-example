// xl:title 位运算的 32 位截断
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(2 ** 31 | 0) + "," + show(-1 >>> 0) + "," + show(1 << 31) + "," + show(1.9 | 0));
