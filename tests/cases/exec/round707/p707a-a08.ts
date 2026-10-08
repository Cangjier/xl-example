// xl:title splice 的返回值与剩余
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = [1, 2, 3, 4];
const removed = a.splice(1, 2, "x");
console.log(show(JSON.stringify(removed)) + "," + show(JSON.stringify(a)));
