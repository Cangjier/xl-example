// xl:title `Array.prototype` 那一格自己的 length 描述符（本轮改的那一支的旁证）
// xl:round 722
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
console.log(show(Object.getOwnPropertyDescriptor([], "length").writable)
  + "," + show(Object.getOwnPropertyDescriptor("ab", "length").writable)
  + "," + show(Object.getOwnPropertyDescriptor([], "length").enumerable)
  + "," + show(Object.getOwnPropertyDescriptor([], "length").configurable));
