// xl:title 下标上的数据属性：getOwnPropertyDescriptor 回读
// xl:round 721
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { value: 9, enumerable: false, writable: false, configurable: false });
const d = Object.getOwnPropertyDescriptor(a, "1");
console.log(show(d.value) + "," + show(d.writable) + "," + show(d.enumerable) + "," + show(d.configurable) + "," + show(a[1]));
