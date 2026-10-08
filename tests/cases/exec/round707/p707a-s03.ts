// xl:title String 的 trim 家族
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(JSON.stringify("  a  ".trim())) + "," + show(JSON.stringify("  a  ".trimStart())) + "," + show(JSON.stringify("  a  ".trimEnd())));
