// xl:title 数组的 length 描述符（没动过）
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = [1];
const d = Object.getOwnPropertyDescriptor(a, "length");
console.log(show(d.enumerable) + "," + show(d.writable) + "," + show(d.value));
