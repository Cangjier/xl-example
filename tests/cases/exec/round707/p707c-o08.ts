// xl:title getOwnPropertyDescriptor 数字键（字符串）
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(Object.getOwnPropertyDescriptor("ab", 1) !== undefined) + "," + show(Object.getOwnPropertyDescriptor("ab", 1) && Object.getOwnPropertyDescriptor("ab", 1).value));
