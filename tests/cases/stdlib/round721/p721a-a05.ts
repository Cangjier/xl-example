// xl:title 不可写下标：赋值静默、值不动、length 不动
// xl:round 721
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { value: 9, writable: false });
a[1] = 42;
console.log(show(a[1]) + "," + show(a.length) + "," + show(a.join(",")));
