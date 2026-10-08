// xl:title delete 数字键之后再写回是同一个键
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { 1: "a" }; delete o[1]; o[1] = "b";
console.log(show(o[1]) + "," + show(Object.keys(o).length));
