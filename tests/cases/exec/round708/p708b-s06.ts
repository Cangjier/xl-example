// xl:title 字符串的 repeat 与 pad 的边界
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show("ab".repeat(0)) + "," + show("ab".repeat(2)) + "," + show("ab".padStart(1)));
run(() => { "ab".repeat(-1); });
