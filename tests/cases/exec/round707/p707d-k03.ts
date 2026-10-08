// xl:title 键是小数
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { 1.5: "v" };
console.log(show(o[1.5]) + "," + show(Object.hasOwn(o, 1.5)) + "," + show(Object.keys(o).join("|")));
