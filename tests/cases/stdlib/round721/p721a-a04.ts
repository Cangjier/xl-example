// xl:title 下标上的访问器：getOwnPropertyDescriptor 回读 getter 在不在
// xl:round 721
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { get() { return 99; }, enumerable: true, configurable: true });
const d = Object.getOwnPropertyDescriptor(a, "1");
console.log(show(typeof d.get) + "," + show(d.set) + "," + show(d.enumerable) + "," + show(typeof d.value));
