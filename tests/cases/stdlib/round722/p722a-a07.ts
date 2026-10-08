// xl:title 不可写之后同值可以、改值抛
// xl:round 722
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "length", { writable: false });
run(() => { Object.defineProperty(a, "length", { value: 3 }); console.log("same:" + a.length); });
run(() => { Object.defineProperty(a, "length", { value: 1 }); console.log("short:" + a.length); });
console.log(show(a.length) + "," + show(a.join(",")));
