// xl:title sort 的缺省比较
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(JSON.stringify([10, 2, 1].sort())) + "," + show(JSON.stringify([10, 2, 1].sort((a, b) => a - b))));
