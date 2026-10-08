// xl:title 非法长度值：负数 / 小数 / 越界 / `undefined` 都抛 RangeError
// xl:round 722
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
run(() => { Object.defineProperty(a, "length", { value: -1 }); console.log("neg:" + a.length); });
run(() => { Object.defineProperty(a, "length", { value: 1.5 }); console.log("frac:" + a.length); });
run(() => { Object.defineProperty(a, "length", { value: 4294967296 }); console.log("big:" + a.length); });
run(() => { Object.defineProperty(a, "length", { value: undefined }); console.log("undef:" + a.length); });
console.log(show(a.length));
