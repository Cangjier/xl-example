// xl:title 空数组上装下标访问器：length 该跟着长
// xl:round 721
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [];
Object.defineProperty(a, "1", { get() { return 5; }, enumerable: true, configurable: true });
console.log(show(a.length) + "," + show(a[1]) + "," + show(JSON.stringify(a)));
