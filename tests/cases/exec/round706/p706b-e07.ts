// xl:title 键序：删除后写回的整数键仍在前面
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { 1: "a", 2: "b", z: "z" }; delete o[1]; o[1] = "c";
console.log(show(Object.keys(o).join("|")));
