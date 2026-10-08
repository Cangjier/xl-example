// xl:title getter 的 length 与调用
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = {}; Object.defineProperty(o, "x", { get() { return 1; }, configurable: true });
const g = Object.getOwnPropertyDescriptor(o, "x").get;
console.log(show(g.length) + "," + show(g.call(o)));
