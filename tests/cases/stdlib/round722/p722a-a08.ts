// xl:title `enumerable: true` / `configurable: true` 两档都抛
// xl:round 722
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
run(() => { Object.defineProperty(a, "length", { enumerable: true }); console.log("enum-ok"); });
run(() => { Object.defineProperty(a, "length", { configurable: true }); console.log("conf-ok"); });
console.log(show(a.length));
