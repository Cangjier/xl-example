// xl:title 空值合并与 || 的分界
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(0 ?? 1) + "," + show(0 || 1) + "," + show("" ?? "x") + "," + show(null ?? "x"));
