// xl:title delete 符号键
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const s = Symbol("s"); const o = { [s]: 1 }; delete o[s];
console.log(show(Object.getOwnPropertySymbols(o).length));
