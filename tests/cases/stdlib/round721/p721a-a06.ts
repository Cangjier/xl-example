// xl:title 不可配置下标：delete 给假、还留着
// xl:round 721
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { value: 9, configurable: false, enumerable: true });
console.log(show(delete a[1]) + "," + show(a[1]) + "," + show(a.length) + "," + show(a.hasOwnProperty("1")) + "," + show("1" in a));
