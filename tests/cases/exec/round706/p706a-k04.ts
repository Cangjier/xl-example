// xl:title 符号键不进 keys / JSON
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const s = Symbol("s"); const o = { a: 1, [s]: 2 };
console.log(show(Object.keys(o).length) + "," + show(JSON.stringify(o)) + "," + show(Object.getOwnPropertySymbols(o).length));
