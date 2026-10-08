// xl:title Math 的取整四档
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(Math.floor(-1.5)) + "," + show(Math.ceil(-1.5)) + "," + show(Math.trunc(-1.5)) + "," + show(Math.round(-1.5)));
