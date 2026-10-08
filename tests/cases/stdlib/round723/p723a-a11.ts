// xl:title 冻结之后 `defineProperty` 改 `length`：抛
// xl:round 723
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.freeze(a);
run(() => { Object.defineProperty(a, "length", { value: 1 }); console.log("ok:" + a.length); });
run(() => { Object.defineProperty(a, "length", { writable: true }); console.log("rw:" + a.length); });
console.log(show(a.length) + "," + show(a.join(",")));
