// xl:title propertyIsEnumerable 数字键
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { 1: "v" };
console.log(show(o.propertyIsEnumerable(1)) + "," + show(o.propertyIsEnumerable("1")));
