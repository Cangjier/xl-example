// xl:title 下标上的数据属性：值、长度、JSON、键
// xl:round 721
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { value: 9 });
console.log(show(a[1]) + "," + show(a.length) + "," + show(a.join(",")) + "," + show(Object.keys(a).join(",")));
