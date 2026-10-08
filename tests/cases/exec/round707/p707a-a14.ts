// xl:title reduce 的初值
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show([1, 2, 3].reduce((a, b) => a + b)) + "," + show([1, 2, 3].reduce((a, b) => a + b, 10)));
