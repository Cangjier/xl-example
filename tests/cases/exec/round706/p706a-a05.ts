// xl:title spec 里 in 与洞
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(0 in [, 1]) + "," + show(1 in [, 1]) + "," + show(2 in [, 1]));
