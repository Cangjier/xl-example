// xl:title JSON.stringify 的数组洞与不可枚举
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = [1, , 3];
console.log(JSON.stringify(a));
const o = {}; Object.defineProperty(o, "h", { value: 1, enumerable: false }); o.v = 2;
console.log(JSON.stringify(o));
