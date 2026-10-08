// xl:title defineProperty 的访问器描述符
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = {}; Object.defineProperty(o, "x", { get() { return 3; }, configurable: true });
console.log(show(o.x) + "," + show(Object.getOwnPropertyDescriptor(o, "x").set));
