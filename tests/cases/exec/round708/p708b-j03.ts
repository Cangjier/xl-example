// xl:title JSON.stringify 的顶层原始值
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(JSON.stringify(1), JSON.stringify("a"), JSON.stringify(null), JSON.stringify(true));
console.log(show(JSON.stringify(undefined)) + "," + show(JSON.stringify(function () {})));
