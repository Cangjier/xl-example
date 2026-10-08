// xl:title Math.round 的半值方向
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(Math.round(0.5)) + "," + show(Math.round(-0.5)) + "," + show(Math.round(1.5)) + "," + show(Math.round(2.5)));
