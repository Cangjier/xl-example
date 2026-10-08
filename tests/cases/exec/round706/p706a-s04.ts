// xl:title 符号键属性参与 getOwnPropertySymbols
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = {}; const s = Symbol("s"); o[s] = 1;
console.log(show(o[s]) + "," + show(Object.getOwnPropertySymbols(o)[0] === s) + "," + show(Object.keys(o).length));
