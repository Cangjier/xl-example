// xl:title 取值器写成访问器之后 Object.keys
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = {}; Object.defineProperty(o, "g", { get() { return 1; }, enumerable: true });
console.log(show(o.g) + "," + show(Object.keys(o).join("|")));
