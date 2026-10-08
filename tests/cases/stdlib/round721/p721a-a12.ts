// xl:title defineProperties 一次两格（下标 + 名字键）
// xl:round 721
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperties(a, { 0: { value: 8, enumerable: true, configurable: true, writable: true }, extra: { value: 1, enumerable: true, configurable: true, writable: true } });
console.log(show(a[0]) + "," + show(a[1]) + "," + show(a.extra) + "," + show(a.length) + "," + show(Object.keys(a).join(",")));
