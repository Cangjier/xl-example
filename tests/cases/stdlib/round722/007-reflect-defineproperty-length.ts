// xl:title `Reflect.defineProperty` 的两档：成功给真、非法长度抛
// xl:round 722
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
console.log(show(Reflect.defineProperty(a, "length", { value: 2 })) + "," + show(a.length));
const b = [1, 2, 3];
run(() => { console.log(show(Reflect.defineProperty(b, "length", { value: -1 }))); });
console.log(show(Reflect.defineProperty(b, "length", { writable: false })) + "," + show(Object.getOwnPropertyDescriptor(b, "length").writable));
