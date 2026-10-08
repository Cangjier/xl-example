// xl:title 数组 push 与下标混合
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = []; a[2] = 5;
console.log(show(a.length) + "," + show(JSON.stringify(a)) + "," + show(1 in a));
