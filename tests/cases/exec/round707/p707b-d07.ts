// xl:title getter 与 setter 的 name
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { get x() { return 1; }, set x(v) {} };
const d = Object.getOwnPropertyDescriptor(o, "x");
console.log(show(d.get.name) + "," + show(d.set.name));
