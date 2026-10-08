// xl:title Date 解析与 getUTCFullYear
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const d = new Date("2020-01-02T03:04:05Z");
console.log(show(d.getUTCFullYear()) + "," + show(d.getUTCMonth()) + "," + show(d.toISOString()));
