// xl:title 长度值先过 `ToUint32`：`"2"` / `true` / `null` / `2.0`
// xl:round 722
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
run(() => { Object.defineProperty(a, "length", { value: "2" }); console.log("str:" + a.length); });
const b = [1, 2, 3];
run(() => { Object.defineProperty(b, "length", { value: true }); console.log("bool:" + b.length); });
const c = [1, 2, 3];
run(() => { Object.defineProperty(c, "length", { value: null }); console.log("null:" + c.length); });
const d = [1, 2, 3];
run(() => { Object.defineProperty(d, "length", { value: 2.0 }); console.log("float:" + d.length); });
