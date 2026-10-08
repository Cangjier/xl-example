// xl:title Map 的 NaN 与 -0 键
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const m = new Map(); m.set(NaN, "nan"); m.set(0, "zero");
console.log(show(m.get(NaN)) + "," + show(m.get(-0)) + "," + show(m.size));
