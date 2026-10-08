// xl:title at 的负下标
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show([1, 2, 3].at(-1)) + "," + show([1, 2, 3].at(0)) + "," + show([1, 2, 3].at(3)));
