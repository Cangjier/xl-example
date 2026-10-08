// xl:title `length` 装访问器：抛
// xl:round 722
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
run(() => { Object.defineProperty(a, "length", { get() { return 9; } }); console.log("get-ok:" + a.length); });
run(() => { Object.defineProperty(a, "length", { set(v) { } }); console.log("set-ok"); });
console.log(show(a.length) + "," + show(a.join(",")));
