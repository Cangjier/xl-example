// xl:title 冻结的元素上再 `defineProperty`：抛
// xl:round 723
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.freeze(a);
run(() => { Object.defineProperty(a, "1", { value: 9 }); console.log("ok:" + a[1]); });
run(() => { Object.defineProperty(a, "4", { value: 9 }); console.log("new:" + a.length); });
console.log(show(a[1]) + "," + show(a.length));
