// xl:title 削短与不可配置的下标格：挡住就抛、数组不动
// xl:round 722
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "2", { value: 3, configurable: false });
run(() => { Object.defineProperty(a, "length", { value: 1 }); console.log("ok:" + a.length); });
console.log(show(a.length) + "," + show(a[2]) + "," + show(a.join(",")));
