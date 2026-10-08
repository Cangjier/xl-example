// xl:title String() 与 toString 的分界
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { toString() { return "T"; } };
console.log(show(String(o)) + "," + show(String(null)) + "," + show(String([1, 2])));
