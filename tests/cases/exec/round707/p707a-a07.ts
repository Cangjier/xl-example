// xl:title fill 与负起点
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = [1, 2, 3, 4];
console.log(show(JSON.stringify(a.fill(9, -2))) + "," + show(JSON.stringify([1, 2, 3].fill(0, 1, 2))));
