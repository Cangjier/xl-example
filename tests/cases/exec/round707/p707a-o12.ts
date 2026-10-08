// xl:title Object.setPrototypeOf 与 getPrototypeOf
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const p = { g() { return 1; } }; const o = {};
Object.setPrototypeOf(o, p);
console.log(show(o.g()) + "," + show(Object.getPrototypeOf(o) === p));
