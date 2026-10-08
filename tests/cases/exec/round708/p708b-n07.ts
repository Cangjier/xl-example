// xl:title toFixed 的取舍与范围
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show((1.25).toFixed(1)) + "," + show((2.5).toFixed(0)) + "," + show((0).toFixed(2)));
run(() => { (1).toFixed(200); });
