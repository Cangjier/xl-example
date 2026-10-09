// xl:title 锁长度之后 `getOwnPropertyNames` 不该出现两个 length
// xl:round 722
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2];
Object.defineProperty(a, "length", { writable: false });
console.log(show(Object.getOwnPropertyNames(a).join(",")));
console.log(show(Object.keys(a).join(",")) + "," + show(Object.getOwnPropertyDescriptor(a, "length").writable));
