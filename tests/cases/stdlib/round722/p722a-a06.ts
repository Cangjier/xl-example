// xl:title 不可写之后想改回可写：抛
// xl:round 722
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "length", { writable: false });
run(() => { Object.defineProperty(a, "length", { writable: true }); console.log("ok:" + a.length); });
console.log(show(Object.getOwnPropertyDescriptor(a, "length").writable));
