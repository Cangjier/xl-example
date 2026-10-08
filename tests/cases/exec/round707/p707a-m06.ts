// xl:title Set 的 has / delete / clear
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const s = new Set([1, 2]); s.delete(1);
console.log(show(s.has(1)) + "," + show(s.size));
