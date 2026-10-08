// xl:title 冻结之后描述符与 `isFrozen` / `isSealed` 两问
// xl:round 723
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2];
Object.freeze(a);
const d = Object.getOwnPropertyDescriptor(a, "0");
console.log(show(d.value) + "," + show(d.writable) + "," + show(d.enumerable) + "," + show(d.configurable));
console.log(show(Object.isFrozen(a)) + "," + show(Object.isSealed(a)) + "," + show(Object.getOwnPropertyNames(a).join(",")));
const b = [1, 2];
Object.seal(b);
const e = Object.getOwnPropertyDescriptor(b, "0");
console.log(show(e.writable) + "," + show(e.configurable) + "," + show(Object.isFrozen(b)) + "," + show(Object.isSealed(b)));
