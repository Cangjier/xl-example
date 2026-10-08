// xl:title assign 到数组目标（越界下标）
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = Object.assign([], { 2: "c" });
console.log(show(a.length) + "," + show(JSON.stringify(a)) + "," + show(Object.keys(a).join("|")));
