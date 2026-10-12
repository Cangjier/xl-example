// xl:title 除零与负零
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(1 / 0) + "," + show(-1 / 0) + "," + show(0 / 0) + "," + show(1 / -0) + "," + show(Object.is(-0, 0 - 0)));
