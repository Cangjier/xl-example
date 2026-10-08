// xl:title 数字键的删除再插入落在最后
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { 1: "a", 2: "b" }; delete o[1]; o[1] = "c";
console.log(show(Object.keys(o).join("|")));
